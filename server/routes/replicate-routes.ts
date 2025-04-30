import { Router } from 'express';
import { models, ModelConfig } from '../config/models';
import { createPrediction, waitForPrediction } from '../replicate';
import { log } from '../logger';
import { GeneratedImage } from '@shared/schema';
import { storage } from '../storage';

const router = Router();

// Handle Replicate image generation
export async function generateWithReplicate(modelKey: string, inputs: any): Promise<GeneratedImage[]> {
  const model = models.find(m => m.key === modelKey);
  
  if (!model || model.provider !== 'replicate' || !model.version) {
    throw new Error(`Invalid Replicate model: ${modelKey}`);
  }
  
  // Combine default inputs with user inputs
  const body = { ...(model.defaults || {}), ...inputs };
  
  log({
    ts: new Date().toISOString(),
    direction: "request",
    payload: {
      type: "replicate_generate",
      modelKey,
      inputs: { ...body, prompt: body.prompt ? `${body.prompt.substring(0, 50)}...` : undefined }
    }
  });
  
  // Create a prediction
  const prediction = await createPrediction(model.version, body);
  
  // Wait for prediction to complete (with polling)
  console.log(`Waiting for Replicate prediction ${prediction.id}...`);
  const result = await waitForPrediction(prediction.id);
  
  log({
    ts: new Date().toISOString(),
    direction: "response",
    payload: {
      type: "replicate_generate",
      modelKey,
      predictionId: prediction.id,
      status: result.status
    }
  });
  
  // Check if prediction succeeded
  if (result.status !== 'succeeded' || !result.output) {
    throw new Error(`Replicate prediction failed: ${result.error || 'Unknown error'}`);
  }
  
  // Process output based on model
  const output = result.output;
  const images: GeneratedImage[] = [];
  
  // For both Imagen-3 and Flux-Pro, outputs are arrays of image URLs or a single URL string
  let imageUrls: string[] = [];
  
  if (typeof output === 'string') {
    imageUrls = [output]; // Single image URL
  } else if (Array.isArray(output)) {
    imageUrls = output; // Array of image URLs
  } else if (typeof output === 'object' && output !== null) {
    // Try to find image URLs in output object (some models have different output structures)
    const possibleImageKeys = ['image', 'images', 'output'];
    for (const key of possibleImageKeys) {
      if (output[key]) {
        if (typeof output[key] === 'string') {
          imageUrls = [output[key]];
          break;
        } else if (Array.isArray(output[key])) {
          imageUrls = output[key];
          break;
        }
      }
    }
  }
  
  if (imageUrls.length === 0) {
    throw new Error('No image URLs found in Replicate output');
  }
  
  // Create GeneratedImage objects from URLs
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    
    // Extract size from aspect_ratio if provided
    let width = 1024;
    let height = 1024;
    
    if (inputs.aspect_ratio) {
      const [w, h] = inputs.aspect_ratio.split(':').map(Number);
      if (w && h) {
        // Normalize to maintain approximately 1MP image size
        const scale = Math.sqrt(1024 * 1024 / (w * h));
        width = Math.round(w * scale);
        height = Math.round(h * scale);
      }
    }
    
    const sizeStr = `${width}x${height}`;
    
    const image: GeneratedImage = {
      id: `img_${Date.now()}_${i}`,
      url: url,
      fullUrl: url, // For Replicate, the URL is already a full URL
      thumbUrl: url, // We'll use the same URL for thumbnail for now
      prompt: inputs.prompt,
      size: sizeStr,
      model: modelKey,
      createdAt: new Date().toISOString(),
      width: width.toString(),
      height: height.toString(),
    };
    
    // Store the image
    await storage.saveImage(image);
    images.push(image);
  }
  
  return images;
}

export default router;