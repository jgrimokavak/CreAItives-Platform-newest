import { Router } from 'express';
import { storage } from '../storage';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as csv from 'fast-csv';
import * as fs from 'fs';
import { carMakes, carModels, carGenerateSchema } from '@shared/schema';
// @ts-ignore
import Mustache from 'mustache';
import { createPrediction, waitForPrediction } from '../replicate';
import { persistImage } from '../fs-storage';
import { models } from '../config/models';

const router = Router();

// Configure multer for CSV file uploads
const upload = multer({
  dest: 'uploads/csv',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Prompt templates for car image generation
const PROMPTS = {
  white: `A hyper-realistic photo of a modern {{year}} {{make}} {{model}} {{body_style}} with metallic {{color}} paint, parked indoors in a photography studio under cool artificial lighting. The front of the car is positioned at a 35-degree angle from the camera, facing slightly to the left, clearly showing both front headlights and the right side of the vehicle. The headlights are turned on. The side windows are fully tinted with black film. The car is placed on a seamless pure white background that extends infinitely in all directions.`,
  
  hub: `A hyper-realistic photo of a modern {{year}} {{make}} {{model}} {{body_style}} with metallic {{color}} paint, parked indoors in a photography studio under cool artificial lighting. The front of the car is positioned at a 35-degree angle from the camera, facing slightly to the left, clearly showing both front headlights and the right side of the vehicle. The headlights are turned on. The side windows are fully tinted with black film. The floor is matte dark gray, smooth and subtle. The backdrop is a soft gradient from dark gray to black.`
};

// Get all car makes
router.get('/makes', async (req, res) => {
  try {
    const makes = await storage.getAllCarMakes();
    res.json(makes);
  } catch (error) {
    console.error('Error fetching car makes:', error);
    res.status(500).json({ error: 'Failed to fetch car makes' });
  }
});

// Get car models by make ID
router.get('/models', async (req, res) => {
  try {
    const { make } = req.query;
    
    if (!make) {
      return res.status(400).json({ error: 'Make ID is required' });
    }
    
    const models = await storage.getCarModelsByMakeId(make as string);
    res.json(models);
  } catch (error) {
    console.error(`Error fetching car models for make ${req.query.make}:`, error);
    res.status(500).json({ error: 'Failed to fetch car models' });
  }
});

// Admin route for CSV upload
router.post('/admin/car-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }
    
    // Clear existing data before import
    await storage.clearCarData();
    
    // Map to track existing makes to avoid duplicates
    const makeMap = new Map<string, string>(); // name -> id
    
    // Process CSV file
    const results: { make: string; model: string }[] = [];
    
    fs.createReadStream(req.file.path)
      .pipe(csv.parse({ headers: true, trim: true }))
      .on('error', (error) => {
        console.error('Error parsing CSV:', error);
        res.status(500).json({ error: 'Failed to parse CSV file' });
      })
      .on('data', (row) => {
        // Validate row
        if (row.make && row.model) {
          results.push({
            make: row.make.trim(),
            model: row.model.trim()
          });
        }
      })
      .on('end', async () => {
        try {
          // Import data
          const stats = {
            makes: 0,
            models: 0
          };
          
          // Process makes first, then models to handle referential integrity
          for (const { make } of results) {
            if (!makeMap.has(make)) {
              const makeId = uuidv4();
              await storage.createCarMake({
                id: makeId,
                name: make
              });
              makeMap.set(make, makeId);
              stats.makes++;
            }
          }
          
          // Now process all models
          for (const { make, model } of results) {
            const makeId = makeMap.get(make);
            if (makeId) {
              await storage.createCarModel({
                id: uuidv4(),
                name: model,
                makeId
              });
              stats.models++;
            }
          }
          
          // Clean up the temporary file
          fs.unlinkSync(req.file.path);
          
          res.json({
            success: true,
            imported: {
              makes: stats.makes,
              models: stats.models
            }
          });
        } catch (error) {
          console.error('Error importing CSV data:', error);
          res.status(500).json({ error: 'Failed to import CSV data' });
        }
      });
  } catch (error) {
    console.error('Error processing CSV upload:', error);
    res.status(500).json({ error: 'Failed to process CSV upload' });
  }
});

// Car image generation endpoint
router.post('/generate', async (req, res) => {
  try {
    // Validate request body
    const validationResult = carGenerateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid request data", 
        errors: validationResult.error.errors 
      });
    }
    
    const { makeId, modelId, year, color, body_style, aspect_ratio, bg } = validationResult.data;
    
    // Get make and model details
    const make = await storage.getCarMakeById(makeId);
    const model = await storage.getCarModelById(modelId);
    
    if (!make || !model) {
      return res.status(400).json({ 
        message: "Invalid make or model ID"
      });
    }
    
    // Render the prompt template
    const prompt = Mustache.render(PROMPTS[bg], {
      year, 
      make: make.name, 
      model: model.name, 
      body_style, 
      color
    });
    
    // Get the Imagen-3 model info
    const modelInfo = models.find(m => m.slug === "google/imagen-3");
    if (!modelInfo || !modelInfo.version) {
      return res.status(500).json({ 
        message: "Imagen-3 model not available"
      });
    }
    
    // Create a prediction with Replicate
    const prediction = await createPrediction(modelInfo.version, {
      prompt,
      aspect_ratio,
      negative_prompt: "", // none
      safety_filter_level: "block_only_high"
    });
    
    // Wait for prediction to complete
    console.log(`Waiting for car image prediction ${prediction.id}...`);
    const result = await waitForPrediction(prediction.id);
    
    // Check if prediction succeeded
    if (result.status !== 'succeeded' || !result.output) {
      throw new Error(`Car image generation failed: ${result.error || 'Unknown error'}`);
    }
    
    // Get the generated image URL
    const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    
    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    // Persist the image to storage with custom metadata
    const persistedImage = await persistImage(base64Image, {
      prompt,
      params: { 
        aspect_ratio, 
        bg,
        year,
        make: make.name,
        model: model.name,
        body_style,
        color
      },
      model: "imagen-3-car",
      userId: "system",
      sources: []
    });
    
    // Return the generated image
    res.json({ image: persistedImage });
    
  } catch (error: any) {
    console.error('Error generating car image:', error);
    res.status(500).json({ 
      message: error.message || "Failed to generate car image"
    });
  }
});

export default router;