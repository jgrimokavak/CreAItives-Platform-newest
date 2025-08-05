// Base provider interface for all AI model providers
export interface GenerateOptions {
  prompt: string;
  modelKey: string;
  [key: string]: any; // Allow provider-specific options
}

export interface EditOptions extends GenerateOptions {
  images: string[]; // Base64 encoded images
  mask?: string; // Optional mask for editing
}

export interface ProviderResult {
  images: Array<{
    url: string;
    fullUrl?: string;
    thumbUrl?: string;
  }>;
}

export abstract class BaseProvider {
  abstract name: string;
  
  // Check if this provider supports a given model
  abstract supportsModel(modelKey: string): boolean;
  
  // Generate images from text
  abstract generate(options: GenerateOptions): Promise<ProviderResult>;
  
  // Edit existing images - optional, not all providers support this
  async edit(options: EditOptions): Promise<ProviderResult> {
    throw new Error(`${this.name} provider does not support image editing`);
  }
  
  // Get default parameters for a model
  abstract getDefaults(modelKey: string): Record<string, any>;
}