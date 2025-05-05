import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import Replicate from 'replicate';

// Set up multer for temporary file storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Verify that we have the API token
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('REPLICATE_API_TOKEN environment variable is not set. Upscale feature will not work.');
}

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Log that we've initialized the client (but don't expose the token)
console.log(`Initialized Replicate client with token: ${process.env.REPLICATE_API_TOKEN ? 'Available (hidden)' : 'MISSING'}`);

// Create router
const router = Router();

// Active upscale jobs registry
const upscaleJobs: Record<string, {
  status: "pending" | "processing" | "done" | "error",
  result?: string,
  error?: string
}> = {};

// Upscale API endpoint
router.post('/upscale', upload.single('image'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Generate job ID for tracking
    const jobId = uuidv4();
    upscaleJobs[jobId] = { status: 'pending' };

    // Return jobId immediately for client to start polling
    res.json({ jobId });
    
    // Process the job asynchronously
    try {
      upscaleJobs[jobId].status = 'processing';
      
      // Prepare the image
      const filePath = req.file.path;
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Get parameters from the request or use defaults
      const enhanceModel = req.body.enhance_model || 'Standard V2';
      const upscaleFactor = req.body.upscale_factor || '4x';
      const faceEnhancement = req.body.face_enhancement === 'true';
      
      console.log(`Upscaling with parameters: enhance_model=${enhanceModel}, upscale_factor=${upscaleFactor}, face_enhancement=${faceEnhancement}`);
      
      // Prepare input for Topaz Labs model
      // Note: adapt parameter names according to the model requirements
      const input = {
        image: `data:image/jpeg;base64,${base64Image}`,
        enhance_model: enhanceModel,
        upscale_factor: upscaleFactor,
        face_enhancement: faceEnhancement,
        // Hidden parameters with defaults
        output_format: "png",
        subject_detection: "None",
        face_enhancement_creativity: 1,
        face_enhancement_strength: 1
      };
      
      console.log('Sending request to Replicate with model: topazlabs/image-upscale');
      
      // For the Replicate API, we'll use the predictions create/get pattern for better control
      // First create the prediction
      console.log('Creating prediction for model: topazlabs/image-upscale');
      const prediction = await replicate.predictions.create({
        model: "topazlabs/image-upscale",
        input: input,
      });
      
      console.log('Prediction created with id:', prediction.id);
      console.log('Prediction initial status:', prediction.status);
      
      // The prediction might not complete immediately, we need to poll for status
      let output;
      let attempts = 0;
      const maxAttempts = 20; // 20 attempts * 3 seconds = up to 60 second wait
      
      while (attempts < maxAttempts) {
        attempts++;
        
        // Get the latest prediction status
        const currentPrediction = await replicate.predictions.get(prediction.id);
        console.log(`Polling attempt ${attempts}/${maxAttempts}, status: ${currentPrediction.status}`);
        
        if (currentPrediction.status === 'succeeded') {
          output = currentPrediction.output;
          console.log('Prediction completed successfully');
          break;
        } else if (currentPrediction.status === 'failed' || currentPrediction.status === 'canceled') {
          throw new Error(`Prediction ${currentPrediction.status}: ${currentPrediction.error || 'Unknown error'}`);
        }
        
        // Wait 3 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      if (!output && attempts >= maxAttempts) {
        throw new Error('Prediction timed out after 60 seconds');
      }
      
      // Delete the temporary file
      fs.unlinkSync(filePath);
      
      // Log output type for debugging
      console.log('Replicate output type:', typeof output);
      console.log('Replicate output full value:', JSON.stringify(output));
      
      // Additional checks for debugging
      if (typeof output === 'object' && output !== null) {
        console.log('Object keys:', Object.keys(output));
        
        // If it's an empty object but the request was successful, the model might still be processing
        if (Object.keys(output).length === 0) {
          console.log('Empty output object received. The image might still be processing.');
          
          // We need to handle this case differently - the job is still processing
          // Instead of marking it as done, we should keep it in processing state
          return;
        }
      }
      
      // Set the result URL
      upscaleJobs[jobId].status = 'done';
      
      // Handle the output which can be a string URL or an array (where first item is the URL)
      let resultUrl = '';
      
      if (typeof output === 'string') {
        resultUrl = output;
        console.log('Output is a direct URL string');
      } else if (Array.isArray(output) && output.length > 0) {
        resultUrl = output[0];
        console.log('Output is an array, using first item');
      } else if (typeof output === 'object' && output !== null) {
        // Try to find a URL property in the object
        const possibleUrlKeys = ['url', 'output', 'result', 'image'];
        for (const key of possibleUrlKeys) {
          if (key in output) {
            const value = (output as any)[key];
            if (typeof value === 'string' && value.startsWith('http')) {
              resultUrl = value;
              console.log(`Found URL in object with key: ${key}`);
              break;
            } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
              resultUrl = value[0];
              console.log(`Found URL in array with key: ${key}`);
              break;
            }
          }
        }
      }
      
      // Only set the result if we found a valid URL
      if (resultUrl) {
        upscaleJobs[jobId].result = resultUrl;
        console.log('Final result URL:', resultUrl);
      } else {
        console.log('No valid URL found in output');
        upscaleJobs[jobId].status = 'error';
        upscaleJobs[jobId].error = 'Invalid response format from image upscaling service';
      }
    } catch (error: any) {
      console.error('Upscale error:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      
      // Create a more user-friendly error message
      let errorMessage = 'Failed to upscale image: ';
      if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred';
      }
      
      // Add troubleshooting info
      errorMessage += '. Please try again with a different image or check your API key.';
      
      upscaleJobs[jobId].status = 'error';
      upscaleJobs[jobId].error = errorMessage;
    }
  } catch (error: any) {
    console.error('Upscale request error:', error);
    res.status(500).json({ message: 'Server error during upscale' });
  }
});

// Job status endpoint
router.get('/upscale/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = upscaleJobs[jobId];
  
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }
  
  if (job.status === 'done') {
    res.json({ status: job.status, url: job.result });
  } else if (job.status === 'error') {
    res.json({ status: job.status, error: job.error });
  } else {
    res.json({ status: job.status });
  }
});

export default router;