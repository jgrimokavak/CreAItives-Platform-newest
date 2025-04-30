import { Router } from 'express';
import { models, openaiSchema } from '../config/models';
import fetch from 'node-fetch';
import { log } from '../logger';

const router = Router();

// Store model schemas and versions
const modelCache = new Map();

// Initialize model schemas from Replicate
export async function initializeModels() {
  for (const model of models) {
    if (model.provider === 'replicate' && model.slug) {
      try {
        log({
          ts: new Date().toISOString(),
          direction: "request",
          payload: {
            type: "replicate_schema_fetch",
            modelKey: model.key,
            slug: model.slug
          }
        });

        const response = await fetch(`https://api.replicate.com/v1/models/${model.slug}`, {
          headers: {
            'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch model schema: ${response.statusText}`);
        }

        const data = await response.json();
        const latestVersion = data.latest_version;
        
        model.version = latestVersion.id;
        model.schema = latestVersion.openapi_schema.components.schemas.Input;
        
        modelCache.set(model.key, {
          version: latestVersion.id,
          schema: latestVersion.openapi_schema.components.schemas.Input
        });

        log({
          ts: new Date().toISOString(),
          direction: "response",
          payload: {
            type: "replicate_schema_fetch",
            modelKey: model.key,
            success: true,
            version: latestVersion.id
          }
        });
      } catch (error) {
        console.error(`Failed to initialize Replicate model ${model.key}:`, error);
        log({
          ts: new Date().toISOString(),
          direction: "error",
          payload: {
            type: "replicate_schema_fetch",
            modelKey: model.key,
            error: error.message
          }
        });
        
        // Mark model as unavailable
        model.unavailable = true;
      }
    }
  }
}

// GET /api/models
router.get('/models', (req, res) => {
  try {
    // Return only available models with their schemas
    const availableModels = models
      .filter(model => !model.unavailable)
      .map(model => {
        let schema;
        
        if (model.provider === 'openai') {
          schema = openaiSchema;
        } else if (model.provider === 'replicate') {
          const cached = modelCache.get(model.key);
          schema = cached?.schema || model.schema;
        }
        
        return {
          key: model.key,
          provider: model.provider,
          schema,
          visible: model.visible || [],
          defaults: model.defaults || {},
          description: model.description || ''
        };
      });
    
    res.json(availableModels);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

export default router;