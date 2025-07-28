import { Router } from 'express';
import { models, ModelConfig } from '../config/models';
import { createPrediction, waitForPrediction } from '../replicate';
import { log } from '../logger';
import { GeneratedImage } from '@shared/schema';
import { storage } from '../storage';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import { persistImage } from '../fs-storage';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const router = Router();

// Download image from URL and save it to uploads directory
async function downloadAndSaveImage(url: string, userId: string = "system", prompt: string, modelKey: string, imageId: string): Promise<{
  fullUrl: string;
  thumbUrl: string;
  id: string;
}> {
  try {
    console.log(`Downloading image from Replicate: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
    }
    
    // Convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    // Create metadata with the correct model parameter
    const meta = {
      prompt: prompt,
      params: { 
        url, 
        model: modelKey  // Include the model key
      },
      userId,
      sources: []
    };
    
    // Save image using the existing function, passing our image ID
    const savedImagePaths = await persistImage(base64, meta, imageId);
    
    return {
      id: savedImagePaths.id,
      fullUrl: savedImagePaths.fullUrl,
      thumbUrl: savedImagePaths.thumbUrl
    };
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

// Handle Replicate image generation
export async function generateWithReplicate(modelKey: string, inputs: any): Promise<GeneratedImage[]> {
  const model = models.find(m => m.key === modelKey);
  
  if (!model || model.provider !== 'replicate') {
    throw new Error(`Invalid Replicate model: ${modelKey}`);
  }
  
  // Get the model identifier - use version if available, otherwise use slug
  const modelIdentifier = model.version || model.slug;
  if (!modelIdentifier) {
    throw new Error(`Model ${modelKey} missing version or slug`);
  }
  
  // Combine default inputs with user inputs
  const body = { ...(model.defaults || {}), ...inputs };
  
  console.log("🔍 Replicate API call for", modelKey, "with body:", {
    ...body,
    input_image: body.input_image ? `[base64 string: ${body.input_image.length} chars]` : undefined,
    prompt: body.prompt ? `${body.prompt.substring(0, 50)}...` : undefined
  });
  
  log({
    ts: new Date().toISOString(),
    direction: "request",
    payload: {
      type: "replicate_generate",
      modelKey,
      inputs: { 
        ...body, 
        input_image: body.input_image ? `[base64 present: ${body.input_image.length} chars]` : undefined,
        prompt: body.prompt ? `${body.prompt.substring(0, 50)}...` : undefined 
      }
    }
  });
  
  // Create a prediction
  const prediction = await createPrediction(modelIdentifier, body);
  
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
    const remoteUrl = imageUrls[i];
    
    // Import the createFileSafeNameFromPrompt function from routes.ts
    // Use the imported function to create an ID based on the prompt
    const { createFileSafeNameFromPrompt } = await import('../routes');
    
    // Generate a consistent ID for both file storage and database based on prompt
    const promptText = inputs.prompt || "Generated image";
    const imageId = `img_${createFileSafeNameFromPrompt(promptText)}_${i}`;
    
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
    
    // Download and save the image locally with the correct model information
    // Now passing the model key and image ID to ensure consistency
    const { id, fullUrl, thumbUrl } = await downloadAndSaveImage(
      remoteUrl, 
      "system", 
      inputs.prompt || "Generated image",
      modelKey,
      imageId
    );
    
    // Create the GeneratedImage object using the SAME ID
    // Process aspect ratio
    let aspectRatio = inputs.aspect_ratio;
    
    // If aspect ratio is not explicitly provided, derive it from dimensions
    if (!aspectRatio) {
      const ratioMap: Record<string, string> = {
        "1024x1024": "1:1",
        "1024x1792": "9:16",
        "1792x1024": "16:9",
        "1024x1536": "2:3",
        "1536x1024": "3:2"
      };
      
      aspectRatio = ratioMap[sizeStr] || "1:1";
    }
    
    const image: GeneratedImage = {
      id: id, // Use the same ID that was used in the file system
      url: fullUrl,
      fullUrl: fullUrl,
      thumbUrl: thumbUrl,
      prompt: inputs.prompt,
      size: sizeStr,
      model: modelKey,
      createdAt: new Date().toISOString(),
      width: width.toString(),
      height: height.toString(),
      aspectRatio: aspectRatio,
      quality: inputs.quality || null
    };
    
    // We no longer need to call storage.saveImage here
    // because the image is already saved to database in persistImage
    
    console.log(`Successfully processed Replicate image: ${id} with model: ${modelKey}`);
    images.push(image);
  }
  
  return images;
}

export default router;