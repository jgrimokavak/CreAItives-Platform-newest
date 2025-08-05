import { BaseProvider, GenerateOptions, EditOptions, ProviderResult } from './base-provider';
import fetch from 'node-fetch';
import { log } from '../logger';

export class FalProvider extends BaseProvider {
  private apiKey: string;
  
  constructor() {
    super();
    this.apiKey = process.env.FAL_API_KEY || '';
  }
  
  name = 'fal';
  
  // Define which models this provider supports
  models = {
    'flux-dev': {
      supportsEdit: false,
      endpoint: 'fal-ai/flux/dev',
      defaults: {
        steps: 25,
        guidance_scale: 7.5,
        safety_tolerance: 2
      }
    },
    'stable-diffusion-xl': {
      supportsEdit: false,
      endpoint: 'fal-ai/stable-diffusion-xl',
      defaults: {
        steps: 30,
        guidance_scale: 7.5,
        safety_tolerance: 2
      }
    },
    'fast-sdxl': {
      supportsEdit: false,
      endpoint: 'fal-ai/fast-sdxl',
      defaults: {
        steps: 8,
        guidance_scale: 2.5,
        safety_tolerance: 2
      }
    }
  };
  
  supportsModel(modelKey: string): boolean {
    return modelKey in this.models;
  }
  
  getDefaults(modelKey: string): Record<string, any> {
    const model = this.models[modelKey as keyof typeof this.models];
    return model?.defaults || {};
  }
  
  async generate(request: GenerateOptions): Promise<ProviderResult> {
    const { prompt, modelKey, ...params } = request;
    
    const modelConfig = this.models[modelKey as keyof typeof this.models];
    if (!modelConfig) {
      throw new Error(`Unknown fal.ai model: ${modelKey}`);
    }
    
    // Log the request
    log({
      ts: new Date().toISOString(),
      direction: "request",
      payload: {
        type: "fal_generate",
        modelKey,
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        params
      }
    });
    
    // Convert parameters to fal.ai format
    const falParams: any = {
      prompt,
      // Map common parameters
      num_inference_steps: params.steps || 25,
      guidance_scale: params.guidance_scale || 7.5,
      num_images: params.n || 1,
      enable_safety_checker: params.safety_tolerance ? params.safety_tolerance <= 2 : true,
      seed: params.seed
    };
    
    // Handle image size/aspect ratio
    if (params.aspect_ratio) {
      const [widthRatio, heightRatio] = params.aspect_ratio.split(':').map(Number);
      // Calculate dimensions based on aspect ratio (default to 1024px on shortest side)
      if (widthRatio > heightRatio) {
        falParams.image_size = {
          width: Math.round(1024 * widthRatio / heightRatio),
          height: 1024
        };
      } else {
        falParams.image_size = {
          width: 1024,
          height: Math.round(1024 * heightRatio / widthRatio)
        };
      }
    } else if (params.size) {
      const [width, height] = params.size.split('x').map(Number);
      falParams.image_size = { width, height };
    }
    
    try {
      // Submit the request to fal.ai
      const submitResponse = await fetch(`https://queue.fal.run/${modelConfig.endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(falParams)
      });
      
      if (!submitResponse.ok) {
        const error = await submitResponse.text();
        throw new Error(`fal.ai API error: ${error}`);
      }
      
      const { request_id } = await submitResponse.json() as { request_id: string };
      
      // Poll for results
      let result: any;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds timeout
      
      while (attempts < maxAttempts) {
        const statusResponse = await fetch(`https://queue.fal.run/${modelConfig.endpoint}/requests/${request_id}/status`, {
          headers: {
            'Authorization': `Key ${this.apiKey}`
          }
        });
        
        const status = await statusResponse.json() as any;
        
        if (status.status === 'COMPLETED') {
          result = status;
          break;
        } else if (status.status === 'FAILED') {
          throw new Error(`fal.ai generation failed: ${status.error || 'Unknown error'}`);
        }
        
        // Wait 1 second before polling again
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (!result) {
        throw new Error('fal.ai generation timed out');
      }
      
      // Log the response
      log({
        ts: new Date().toISOString(),
        direction: "response",
        payload: {
          type: "fal_generate",
          modelKey,
          imageCount: result.images?.length || 0
        }
      });
      
      // Convert fal.ai response to our format
      const images = result.images.map((image: any) => ({
        url: image.url,
        fullUrl: image.url,
        thumbUrl: image.url // fal.ai doesn't provide separate thumbnails
      }));
      
      return { images };
      
    } catch (error: any) {
      log({
        ts: new Date().toISOString(),
        direction: "error",
        payload: {
          type: "fal_generate",
          modelKey,
          error: error.message
        }
      });
      throw error;
    }
  }
  
  async edit(request: EditOptions): Promise<ProviderResult> {
    throw new Error('fal.ai provider does not support image editing');
  }
}