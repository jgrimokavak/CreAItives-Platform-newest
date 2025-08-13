import { BaseProvider, GenerateOptions, EditOptions, ProviderResult } from './base-provider';
import { openai, toFile } from '../openai';
import { models } from '../config/models';
import { log } from '../logger';
import { persistImage } from '../fs-storage';
import fs from 'fs';
import path from 'path';

export class OpenAIProvider extends BaseProvider {
  name = 'OpenAI';
  
  private supportedModels = ['gpt-image-1', 'dall-e-2', 'dall-e-3'];
  
  supportsModel(modelKey: string): boolean {
    return this.supportedModels.includes(modelKey);
  }
  
  getDefaults(modelKey: string): Record<string, any> {
    const model = models.find(m => m.key === modelKey);
    return model?.defaults || {};
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
  
  async generate(options: GenerateOptions): Promise<ProviderResult> {
    const { prompt, modelKey, size, quality, n, style, background, output_format } = options;
    
    // Create the base request object
    const requestParams: any = {
      model: modelKey,
      prompt: prompt,
      n: n || 1,
      size: size || '1024x1024',
    };
    
    // DALL-E models support response_format but GPT-Image-1 doesn't
    if (modelKey !== "gpt-image-1") {
      requestParams.response_format = "b64_json";
    }
    
    // Add model-specific parameters
    if (modelKey === 'dall-e-3') {
      requestParams.quality = quality === 'hd' || quality === 'standard' ? quality : 'standard';
      if (style) requestParams.style = style;
      if (output_format) requestParams.response_format = output_format;
    } else if (modelKey === 'gpt-image-1') {
      if (quality === 'high' || quality === 'medium' || quality === 'low' || quality === 'auto') {
        requestParams.quality = quality || 'high';
      } else {
        requestParams.quality = 'high';
      }
      if (background) requestParams.background = background;
    } else {
      // DALL-E 2 specific parameters
      if (output_format) requestParams.response_format = output_format;
    }
    
    log({
      ts: new Date().toISOString(),
      direction: "request",
      payload: {
        type: "openai_generate",
        modelKey,
        params: requestParams
      }
    });
    
    const response = await openai.images.generate(requestParams);
    
    log({
      ts: new Date().toISOString(),
      direction: "response",
      payload: {
        type: "openai_generate",
        modelKey,
        imageCount: response?.data?.length || 0
      }
    });
    
    if (!response?.data || response.data.length === 0) {
      throw new Error("No images were generated");
    }

    // Process and save images based on response format
    const images = await Promise.all(
      response.data.map(async (image, index) => {
        const imageId = `img_${Date.now()}_${index}`;
        
        if (image.url) {
          // GPT-Image-1 returns URLs - download and save
          const savedImage = await this.downloadAndSaveImage(
            image.url,
            "system", // Default user ID
            prompt,
            modelKey,
            imageId
          );
          
          return {
            url: savedImage.fullUrl,
            fullUrl: savedImage.fullUrl,
            thumbUrl: savedImage.thumbUrl
          };
        } else if (image.b64_json) {
          // DALL-E models return base64 - save directly
          const meta = {
            prompt: prompt,
            params: { 
              model: modelKey,
              size,
              quality
            },
            userId: "system",
            sources: []
          };
          
          const savedImage = await persistImage(image.b64_json, meta, imageId);
          
          return {
            url: savedImage.fullUrl,
            fullUrl: savedImage.fullUrl,
            thumbUrl: savedImage.thumbUrl
          };
        } else {
          throw new Error("Image response contains neither URL nor base64 data");
        }
      })
    );
    
    return { images };
  }
  
  async edit(options: EditOptions): Promise<ProviderResult> {
    const { prompt, modelKey, images, mask, size, quality, n } = options;
    
    // Only GPT-Image-1 supports editing currently
    if (modelKey !== 'gpt-image-1') {
      throw new Error(`Model ${modelKey} does not support image editing`);
    }
    
    // Create temp directory for image processing
    const tmpDir = path.join(process.cwd(), 'temp', `edit_${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    
    try {
      // Save base64 images to temp files
      const imagePaths: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const base64Data = images[i].replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(tmpDir, `image_${i}.png`);
        fs.writeFileSync(filePath, buffer);
        imagePaths.push(filePath);
      }
      
      // Save mask if provided
      let maskPath: string | undefined;
      if (mask) {
        const maskData = mask.replace(/^data:image\/\w+;base64,/, '');
        const maskBuffer = Buffer.from(maskData, 'base64');
        maskPath = path.join(tmpDir, 'mask.png');
        fs.writeFileSync(maskPath, maskBuffer);
      }
      
      // Convert to uploadable files
      const uploadables = await Promise.all(
        imagePaths.map(p => toFile(fs.createReadStream(p), path.basename(p), { type: 'image/png' }))
      );
      
      const editParams: any = {
        model: modelKey,
        image: uploadables,
        prompt: prompt,
        n: n || 1,
        size: size === "auto" ? "1024x1024" : size || "1024x1024",
        quality: (quality || "high") as any
      };
      
      if (maskPath) {
        editParams.mask = await toFile(fs.createReadStream(maskPath), 'mask.png', { type: 'image/png' });
      }
      
      log({
        ts: new Date().toISOString(),
        direction: "request",
        payload: {
          type: "openai_edit",
          modelKey,
          imageCount: images.length,
          hasMask: !!mask
        }
      });
      
      // @ts-ignore - The OpenAI SDK types don't include all supported sizes
      const response = await openai.images.edit(editParams);
      
      log({
        ts: new Date().toISOString(),
        direction: "response",
        payload: {
          type: "openai_edit",
          modelKey,
          resultCount: response?.data?.length || 0
        }
      });
      
      if (!response.data || response.data.length === 0) {
        throw new Error("No images were generated from edit");
      }
      
      // Process and save edited images
      const processedImages = await Promise.all(
        response.data.map(async (image, index) => {
          const imageId = `img_edit_${Date.now()}_${index}`;
          
          const meta = {
            prompt: prompt,
            params: { 
              model: modelKey,
              size,
              quality,
              edit: true
            },
            userId: "system",
            sources: []
          };
          
          if (!image.b64_json) {
            throw new Error("Edit response contains no base64 data");
          }
          
          const savedImage = await persistImage(image.b64_json, meta, imageId);
          
          return {
            url: savedImage.fullUrl,
            fullUrl: savedImage.fullUrl,
            thumbUrl: savedImage.thumbUrl
          };
        })
      );
      
      return { images: processedImages };
    } finally {
      // Cleanup temp files
      setTimeout(() => {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch (err) {
          console.error('Failed to cleanup temp directory:', err);
        }
      }, 10 * 60 * 1000); // 10 minutes
    }
  }
}