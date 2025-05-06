import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import Mustache from 'mustache';
import { createPrediction, waitForPrediction } from '../replicate';
import { persistImage } from '../fs-storage';
import { models } from '../config/models';
import { z } from 'zod';

const router = Router();

/**
 * Generates a car description based on provided parameters
 * Handles cases where some parameters might be empty
 */
function generateCarDescription(params: {
  year?: number;
  make?: string;
  model?: string;
  body_style?: string;
  trim?: string;
  color?: string;
}): string {
  const { year, make, model, body_style, trim, color } = params;
  
  // Build description parts, only including fields that have values
  const parts: string[] = [];
  
  // Add year if provided
  if (year) {
    parts.push(`${year}`);
  }
  
  // Add make if provided
  if (make && make !== "None") {
    parts.push(make);
  }
  
  // Add model if provided
  if (model && model !== "None") {
    parts.push(model);
  }
  
  // Add body style if provided
  if (body_style && body_style !== "None") {
    parts.push(body_style);
  }
  
  // Add trim if provided
  if (trim && trim !== "None") {
    parts.push(trim);
  }
  
  // Final description
  const description = parts.length > 0 ? parts.join(" ") : "modern car";
  
  // Add color description
  const colorDesc = (color && color !== "None") ? `with metallic ${color} paint` : "with metallic paint";
  
  return `${description} ${colorDesc}`;
}

// Prompt templates for car image generation
const PROMPTS = {
  white: (params: any) => {
    const carDescription = generateCarDescription(params);
    return `A hyper-realistic photo of a ${carDescription}, parked indoors in a photography studio under cool artificial lighting. The front of the car is positioned at a 35-degree angle from the camera, facing slightly to the left, clearly showing both front headlights and the right side of the vehicle. The headlights are turned on. The side windows are fully tinted with black film. The car is placed on a seamless pure white background that extends infinitely in all directions.`;
  },
  
  hub: (params: any) => {
    const carDescription = generateCarDescription(params);
    return `A hyper-realistic photo of a ${carDescription}, parked indoors in a photography studio under cool artificial lighting. The front of the car is positioned at a 35-degree angle from the camera, facing slightly to the left, clearly showing both front headlights and the right side of the vehicle. The headlights are turned on. The side windows are fully tinted with black film. The floor is matte dark gray, smooth and subtle. The backdrop is a soft gradient from dark gray to black.`;
  }
};

// Car generation schema
const carGenerateSchema = z.object({
  make: z.string().optional().default(""),
  model: z.string().optional().default(""),
  body_style: z.string().optional().default(""),
  trim: z.string().optional().default(""),
  year: z.number().int().min(1990).max(2025).optional(),
  color: z.string().optional().default(""),
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "3:4", "4:3"]).optional().default("16:9"),
  bg: z.enum(["white", "hub"]).optional().default("white")
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
    
    const { make, model, body_style, trim, year, color, aspect_ratio, bg } = validationResult.data;
    
    // Generate the prompt using our template functions
    const prompt = PROMPTS[bg]({
      year, 
      make, 
      model, 
      body_style, 
      trim, 
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
        make,
        model,
        body_style,
        trim,
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