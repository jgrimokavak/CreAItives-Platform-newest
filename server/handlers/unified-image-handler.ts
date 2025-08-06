import { providerRegistry } from '../providers/provider-registry';
import { GeneratedImage } from '@shared/schema';
import { storage } from '../storage';
import { KAVAK_STYLE_PROMPT } from '@shared/constants/stylePrompts';

interface GenerateRequest {
  prompt: string;
  modelKey: string;
  kavakStyle?: boolean;
  [key: string]: any;
}

interface EditRequest extends GenerateRequest {
  images: string[]; // Base64 encoded images
  mask?: string;
}

// Helper to create a file-safe name from prompt
function createFileSafeNameFromPrompt(prompt: string): string {
  return prompt
    .substring(0, 30)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export async function handleImageGeneration(request: GenerateRequest): Promise<GeneratedImage[]> {
  const { prompt, modelKey, kavakStyle, ...params } = request;
  
  // Get the provider for this model
  const provider = providerRegistry.getProviderForModel(modelKey);
  if (!provider) {
    throw new Error(`No provider found for model: ${modelKey}`);
  }
  
  // Apply KAVAK style if requested
  let finalPrompt = prompt;
  if (kavakStyle) {
    finalPrompt = prompt + " " + KAVAK_STYLE_PROMPT;
    console.log(`Using KAVAK style - original: ${prompt.length} chars, final: ${finalPrompt.length} chars`);
  }
  
  // Generate images
  const result = await provider.generate({
    prompt: finalPrompt,
    modelKey,
    ...params
  });
  
  // Convert to GeneratedImage format and save
  const generatedImages: GeneratedImage[] = result.images.map((image, index) => {
    const timestamp = Date.now();
    const promptBasedId = `img_${timestamp}_${index}`;
    
    const newImage: GeneratedImage = {
      id: promptBasedId,
      url: image.url,
      fullUrl: image.fullUrl || image.url,
      thumbUrl: image.thumbUrl || image.url,
      prompt: prompt,
      size: params.size || '1024x1024',
      model: modelKey,
      createdAt: new Date().toISOString(),
      aspectRatio: params.aspect_ratio || undefined,
      quality: params.quality || undefined,
    };
    
    // Note: Image is already stored by the provider via persistImage()
    // No need to store again to avoid duplicate entries
    
    return newImage;
  });
  
  return generatedImages;
}

export async function handleImageEdit(request: EditRequest): Promise<GeneratedImage[]> {
  const { prompt, modelKey, images, mask, kavakStyle, ...params } = request;
  
  // Check if model supports editing
  if (!providerRegistry.modelSupportsEdit(modelKey)) {
    throw new Error(`Model ${modelKey} does not support image editing`);
  }
  
  // Get the provider for this model
  const provider = providerRegistry.getProviderForModel(modelKey);
  if (!provider) {
    throw new Error(`No provider found for model: ${modelKey}`);
  }
  
  // Apply KAVAK style if requested
  let finalPrompt = prompt;
  if (kavakStyle) {
    finalPrompt = prompt + " " + KAVAK_STYLE_PROMPT;
    console.log(`Using KAVAK style for edit - original: ${prompt.length} chars, final: ${finalPrompt.length} chars`);
  }
  
  // Create thumbnails from source images
  let sourceThumb: string | undefined;
  let sourceImage: string | undefined;
  
  if (images.length > 0) {
    // For display purposes, use the first image as source
    sourceImage = images[0];
    
    // Create a smaller thumbnail (we'll just use the same base64 for now)
    // In production, you might want to actually resize this
    sourceThumb = images[0];
  }
  
  // Edit images
  const result = await provider.edit({
    prompt: finalPrompt,
    modelKey,
    images,
    mask,
    ...params
  });
  
  // Convert to GeneratedImage format and save
  const generatedImages: GeneratedImage[] = result.images.map((image, index) => {
    const timestamp = Date.now();
    const promptBasedId = `edit_${timestamp}_${index}`;
    
    const newImage: GeneratedImage = {
      id: promptBasedId,
      url: image.url,
      fullUrl: image.fullUrl || image.url,
      thumbUrl: image.thumbUrl || image.url,
      prompt: prompt,
      size: params.size || '1024x1024',
      model: modelKey,
      createdAt: new Date().toISOString(),
      aspectRatio: params.aspect_ratio || undefined,
      quality: params.quality || undefined,
      sourceThumb,
      sourceImage
    };
    
    // Note: Image is already stored by the provider via persistImage()
    // No need to store again to avoid duplicate entries
    
    return newImage;
  });
  
  return generatedImages;
}