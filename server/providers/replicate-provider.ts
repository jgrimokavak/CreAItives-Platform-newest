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
  
  async generateVideo(modelKey: string, inputs: any): Promise<{ jobId: string }> {
    const model = models.find(m => m.key === modelKey);
    if (!model || model.provider !== 'replicate') {
      throw new Error(`Invalid Replicate video model: ${modelKey}`);
    }

    const modelIdentifier = model.version || model.slug;
    if (!modelIdentifier) {
      throw new Error(`Model ${modelKey} missing version or slug`);
    }

    // Prepare the input for the specific model
    let body: Record<string, any> = {
      ...this.getDefaults(modelKey),
      ...inputs
    };

    // Map parameters for hailuo-02 model
    if (modelKey === 'hailuo-02') {
      // Map frontend parameters to model parameters
      if (inputs.promptOptimizer !== undefined) {
        body.prompt_optimizer = inputs.promptOptimizer;
        delete body.promptOptimizer;
      }
      if (inputs.firstFrameImage !== undefined && inputs.firstFrameImage !== '') {
        body.first_frame_image = inputs.firstFrameImage;
        delete body.firstFrameImage;
      } else {
        // Remove the field entirely if empty or undefined
        delete body.firstFrameImage;
      }
      if (inputs.lastFrameImage !== undefined && inputs.lastFrameImage !== '') {
        body.last_frame_image = inputs.lastFrameImage;
        delete body.lastFrameImage;
      } else {
        // Remove the field entirely if empty or undefined
        delete body.lastFrameImage;
      }
    }

    // Map parameters for kling-v2.1 model
    if (modelKey === 'kling-v2.1') {
      // Map frontend parameters to model parameters
      if (inputs.negativePrompt !== undefined && inputs.negativePrompt !== '') {
        body.negative_prompt = inputs.negativePrompt;
        delete body.negativePrompt;
      } else {
        // Remove the field entirely if empty or undefined
        delete body.negativePrompt;
      }
      if (inputs.startImage !== undefined && inputs.startImage !== '') {
        body.start_image = inputs.startImage;
        delete body.startImage;
      } else {
        // Remove the field entirely if empty or undefined
        delete body.startImage;
      }
      if (inputs.aspectRatio !== undefined) {
        body.aspect_ratio = inputs.aspectRatio;
        delete body.aspectRatio;
      }
    }

    log({
      ts: new Date().toISOString(),
      direction: "request",
      payload: {
        type: "replicate_video_generate",
        modelKey,
        inputs: { ...body, prompt: body.prompt?.substring(0, 50) + '...' }
      }
    });

    // Create a prediction for video generation
    const prediction = await createPrediction(modelIdentifier, body);
    
    return { jobId: prediction.id };
  }

  async pollJobStatus(jobId: string): Promise<{ status: string; videoUrl?: string; thumbnailUrl?: string; error?: string }> {
    try {
      const result = await waitForPrediction(jobId);
      
      if (result.status === 'succeeded' && result.output) {
        // Handle different output formats from different video models
        let videoUrl: string | undefined;
        let thumbnailUrl: string | undefined;

        if (typeof result.output === 'string') {
          videoUrl = result.output;
        } else if (result.output && typeof result.output === 'object') {
          // If output is an object with url method (like in the example)
          if ('url' in result.output && typeof result.output.url === 'function') {
            videoUrl = result.output.url();
          } else if ('url' in result.output && typeof result.output.url === 'string') {
            videoUrl = result.output.url;
          }
          
          // Look for thumbnail
          if ('thumbnail' in result.output) {
            thumbnailUrl = result.output.thumbnail;
          }
        }

        return {
          status: 'completed',
          videoUrl: videoUrl,
          thumbnailUrl: thumbnailUrl
        };
      } else if (result.status === 'failed') {
        return {
          status: 'failed',
          error: result.error || 'Video generation failed'
        };
      } else {
        return {
          status: 'processing'
        };
      }
    } catch (error: any) {
      return {
        status: 'failed',
        error: error.message || 'Error polling job status'
      };
    }
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
    let body: Record<string, any> = { 
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
    
    // Handle google/nano-banana specific parameters
    if (modelKey === 'google/nano-banana') {
      // Force PNG output format as specified
      body.output_format = "png";
      
      // If we have images array, convert to image_input
      if (body.images && Array.isArray(body.images)) {
        body.image_input = body.images;
        delete body.images;
      }
      
      // Convert image_input URLs to public URLs (exact same logic as edit tool)
      if (body.image_input && Array.isArray(body.image_input)) {
        const publicUrls: string[] = [];
        
        for (const imageUrl of body.image_input) {
          let publicUrl: string;
          
          if (imageUrl.startsWith('/api/object-storage/image/')) {
            // Convert relative URL to absolute public URL
            let baseUrl: string;
            
            if (process.env.REPLIT_DEPLOYMENT === '1') {
              // Production deployment - use REPLIT_DOMAINS (first domain if multiple)
              const domains = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || '';
              const domain = domains.split(',')[0]; // Use first domain if comma-separated
              baseUrl = `https://${domain}`;
              console.log(`[GENERATE] Production mode - using domain: ${domain}`);
            } else if (process.env.REPLIT_DEV_DOMAIN) {
              // Development on Replit
              baseUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
              console.log(`[GENERATE] Development mode - using domain: ${process.env.REPLIT_DEV_DOMAIN}`);
            } else {
              // Local development fallback
              baseUrl = 'http://localhost:5000';
              console.log(`[GENERATE] Local mode - using localhost`);
            }
            
            publicUrl = `${baseUrl}${imageUrl}`;
            console.log(`[GENERATE] URL conversion: ${imageUrl} → ${publicUrl}`);
          } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            // Already a public URL
            publicUrl = imageUrl;
            console.log(`[GENERATE] Using existing public URL: ${publicUrl}`);
          } else {
            throw new Error(`Invalid URL format: ${imageUrl}`);
          }
          
          publicUrls.push(publicUrl);
        }
        
        body.image_input = publicUrls;
      }
      
      // Filter to only supported parameters - nano banana only accepts these three fields
      const allowedFields = ['prompt', 'image_input', 'output_format'];
      const filteredBody: Record<string, any> = {};
      
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          filteredBody[field] = body[field];
        }
      }
      
      console.log(`[GENERATE] Filtered nano-banana parameters:`, Object.keys(filteredBody));
      body = filteredBody;
    }
    
    // Field mapping for flux-krea-dev
    if (modelKey === 'flux-krea-dev') {
      console.log('🔍 flux-krea-dev input before mapping:', JSON.stringify(body, null, 2));
      // Map "Image" to "image" (frontend uses capital I, backend expects lowercase)
      if (body.Image !== undefined) {
        body.image = body.Image;
        delete body.Image;
      }
      console.log('🔍 flux-krea-dev input after mapping:', JSON.stringify(body, null, 2));
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
    
    // Only flux-kontext-max and google/nano-banana support editing from Replicate models
    if (modelKey !== 'flux-kontext-max' && modelKey !== 'google/nano-banana') {
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
    
    // Prepare the body based on the model
    const body: Record<string, any> = {
      ...this.getDefaults(modelKey),
      ...params,
      prompt
    };

    // Handle model-specific parameters
    if (modelKey === 'flux-kontext-max') {
      // For flux-kontext-max, we need to pass the input_image parameter
      body.input_image = images[0]; // flux-kontext-max only supports single image
      body.mask = mask;
      
      // Type conversion for flux-kontext-max specific parameters
      if (body.prompt_upsampling !== undefined) {
        body.prompt_upsampling = body.prompt_upsampling === 'true' || body.prompt_upsampling === true;
      }
      if (body.safety_tolerance !== undefined) {
        body.safety_tolerance = parseInt(body.safety_tolerance.toString());
      }
    } else if (modelKey === 'google/nano-banana') {
      // For nano-banana, use image_input array (supports multiple images)
      body.image_input = images; // nano-banana supports multiple images (0-10)
      body.output_format = "png"; // Force PNG as specified
      // Note: nano-banana doesn't use mask parameter
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