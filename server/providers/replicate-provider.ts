import { BaseProvider, GenerateOptions, EditOptions, ProviderResult } from './base-provider';
import { models } from '../config/models';
import { createPrediction, waitForPrediction } from '../replicate';
import { log } from '../logger';
import fetch from 'node-fetch';
import { persistImage } from '../fs-storage';

export class ReplicateProvider extends BaseProvider {
  name = 'Replicate';
  
  supportsModel(modelKey: string): boolean {
    const model = models.find(m => m.key === modelKey);
    return model?.provider === 'replicate';
  }
  
  getDefaults(modelKey: string): Record<string, any> {
    const model = models.find(m => m.key === modelKey);
    return model?.defaults || {};
  }
  
  async generate(options: GenerateOptions): Promise<ProviderResult> {
    const { prompt, modelKey, ...params } = options;
    
    const model = models.find(m => m.key === modelKey);
    if (!model || model.provider !== 'replicate') {
      throw new Error(`Invalid Replicate model: ${modelKey}`);
    }
    
    // Get the model identifier - use version if available, otherwise use slug
    const modelIdentifier = model.version || model.slug;
    if (!modelIdentifier) {
      throw new Error(`Model ${modelKey} missing version or slug`);
    }
    
    // Combine defaults with user inputs
    const body = { 
      ...this.getDefaults(modelKey),
      ...params,
      prompt 
    };

    // Type conversion for flux-kontext-max specific parameters
    if (modelKey === 'flux-kontext-max') {
      if (body.prompt_upsampling !== undefined) {
        body.prompt_upsampling = body.prompt_upsampling === 'true' || body.prompt_upsampling === true;
      }
      if (body.safety_tolerance !== undefined) {
        body.safety_tolerance = parseInt(body.safety_tolerance.toString());
      }
    }
    
    // Field mapping for flux-krea-dev
    if (modelKey === 'flux-krea-dev') {
      // Map "Image" to "image" (frontend uses capital I, backend expects lowercase)
      if (body.Image !== undefined) {
        body.image = body.Image;
        delete body.Image;
      }
    }
    
    log({
      ts: new Date().toISOString(),
      direction: "request",
      payload: {
        type: "replicate_generate",
        modelKey,
        inputs: { 
          ...body, 
          prompt: prompt.substring(0, 50) + '...'
        }
      }
    });
    
    // Create a prediction
    const prediction = await createPrediction(modelIdentifier, body);
    
    // Wait for prediction to complete
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
    
    if (result.status !== 'succeeded' || !result.output) {
      throw new Error(`Replicate prediction failed: ${result.error || 'Unknown error'}`);
    }
    
    // Process output - Replicate models return URLs
    const output = result.output;
    let imageUrls: string[] = [];
    
    if (Array.isArray(output)) {
      imageUrls = output.filter(item => typeof item === 'string');
    } else if (typeof output === 'string') {
      imageUrls = [output];
    }
    
    if (imageUrls.length === 0) {
      throw new Error('No images were generated');
    }
    
    // Download and save images
    const images = await Promise.all(
      imageUrls.map(async (url, index) => {
        const savedImage = await this.downloadAndSaveImage(
          url, 
          "system", 
          prompt, 
          modelKey, 
          `img_${Date.now()}_${index}`
        );
        
        return {
          url: savedImage.fullUrl,
          fullUrl: savedImage.fullUrl,
          thumbUrl: savedImage.thumbUrl
        };
      })
    );
    
    return { images };
  }
  
  async edit(options: EditOptions): Promise<ProviderResult> {
    const { prompt, modelKey, images, mask, ...params } = options;
    
    // Only flux-kontext-max supports editing from Replicate models
    if (modelKey !== 'flux-kontext-max') {
      throw new Error(`Model ${modelKey} does not support image editing`);
    }
    
    const model = models.find(m => m.key === modelKey);
    if (!model || model.provider !== 'replicate') {
      throw new Error(`Invalid Replicate model: ${modelKey}`);
    }
    
    const modelIdentifier = model.version || model.slug;
    if (!modelIdentifier) {
      throw new Error(`Model ${modelKey} missing version or slug`);
    }
    
    // For flux-kontext-max, we need to pass the input_image parameter
    const body = {
      ...this.getDefaults(modelKey),
      ...params,
      prompt,
      input_image: images[0], // flux-kontext-max only supports single image
      mask: mask
    };

    // Type conversion for flux-kontext-max specific parameters
    if (modelKey === 'flux-kontext-max') {
      if (body.prompt_upsampling !== undefined) {
        body.prompt_upsampling = body.prompt_upsampling === 'true' || body.prompt_upsampling === true;
      }
      if (body.safety_tolerance !== undefined) {
        body.safety_tolerance = parseInt(body.safety_tolerance.toString());
      }
    }
    
    log({
      ts: new Date().toISOString(),
      direction: "request",
      payload: {
        type: "replicate_edit",
        modelKey,
        hasInputImage: !!body.input_image,
        hasMask: !!mask
      }
    });
    
    const prediction = await createPrediction(modelIdentifier, body);
    const result = await waitForPrediction(prediction.id);
    
    log({
      ts: new Date().toISOString(),
      direction: "response",
      payload: {
        type: "replicate_edit",
        modelKey,
        predictionId: prediction.id,
        status: result.status
      }
    });
    
    if (result.status !== 'succeeded' || !result.output) {
      throw new Error(`Replicate prediction failed: ${result.error || 'Unknown error'}`);
    }
    
    // Process output
    const output = result.output;
    let imageUrls: string[] = [];
    
    if (Array.isArray(output)) {
      imageUrls = output.filter(item => typeof item === 'string');
    } else if (typeof output === 'string') {
      imageUrls = [output];
    }
    
    if (imageUrls.length === 0) {
      throw new Error('No images were generated from edit');
    }
    
    // Download and save images
    const processedImages = await Promise.all(
      imageUrls.map(async (url, index) => {
        const savedImage = await this.downloadAndSaveImage(
          url, 
          "system", 
          prompt, 
          modelKey, 
          `edit_${Date.now()}_${index}`
        );
        
        return {
          url: savedImage.fullUrl,
          fullUrl: savedImage.fullUrl,
          thumbUrl: savedImage.thumbUrl
        };
      })
    );
    
    return { images: processedImages };
  }
  
  private async downloadAndSaveImage(
    url: string, 
    userId: string, 
    prompt: string, 
    modelKey: string, 
    imageId: string
  ): Promise<{ fullUrl: string; thumbUrl: string; id: string }> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      
      const meta = {
        prompt: prompt,
        params: { 
          url, 
          model: modelKey
        },
        userId,
        sources: []
      };
      
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
}