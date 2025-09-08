import { BaseProvider } from './base-provider';
import { OpenAIProvider } from './openai-provider';
import { ReplicateProvider } from './replicate-provider';
import { FalProvider } from './fal-provider';
import { VertexProvider } from './vertex-provider';
import { models } from '../config/models';

export class ProviderRegistry {
  private providers: BaseProvider[] = [];
  
  constructor() {
    // Register all providers
    this.providers.push(new OpenAIProvider());
    this.providers.push(new ReplicateProvider());
    this.providers.push(new FalProvider());
    this.providers.push(new VertexProvider());
  }
  
  // Get the provider for a specific model
  getProviderForModel(modelKey: string): BaseProvider | null {
    for (const provider of this.providers) {
      if (provider.supportsModel(modelKey)) {
        return provider;
      }
    }
    return null;
  }
  
  // Get all available models with their metadata
  getAllModels() {
    return models.filter(model => !model.unavailable).map(model => ({
      key: model.key,
      provider: model.provider,
      description: model.description,
      visible: model.visible,
      defaults: model.defaults || {},
      supportsEdit: this.modelSupportsEdit(model.key)
    }));
  }
  
  // Check if a model supports image editing
  modelSupportsEdit(modelKey: string): boolean {
    // Currently only these models support editing
    const editCapableModels = ['gpt-image-1', 'flux-kontext-max', 'google/nano-banana'];
    return editCapableModels.includes(modelKey);
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();