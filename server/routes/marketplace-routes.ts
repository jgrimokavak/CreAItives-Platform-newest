import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { createPrediction, waitForPrediction } from '../replicate';
import { ObjectStorageService } from '../objectStorage';
import { persistImage } from '../fs-storage';
import { push } from '../ws';
import Papa from 'papaparse';
import axios from 'axios';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const objectStorage = new ObjectStorageService();

// CSV URLs
const GLOBAL_PROMPTS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQb-bDvaNqOTOJXonaHf_VfzGZSW8BraE_tGoFAsJortqGRG6UVyA7MoxdN8Muvap_BrprDBT8n4V2B/pub?gid=1909445017&single=true&output=csv';
const ANGLE_PRESETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQb-bDvaNqOTOJXonaHf_VfzGZSW8BraE_tGoFAsJortqGRG6UVyA7MoxdN8Muvap_BrprDBT8n4V2B/pub?gid=375187395&single=true&output=csv';
const COLOR_PRESETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQb-bDvaNqOTOJXonaHf_VfzGZSW8BraE_tGoFAsJortqGRG6UVyA7MoxdN8Muvap_BrprDBT8n4V2B/pub?gid=41565075&single=true&output=csv';

// Types
interface MarketplaceBatch {
  id: string;
  userId: string;
  sourceImageUrls: string[];
  angles: string[];
  colors: string[];
  autoColorize: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: MarketplaceResult[];
  createdAt: Date;
  completedAt?: Date;
}

interface MarketplaceResult {
  type: 'angle' | 'color';
  angleKey: string;
  colorKey?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  thumbUrl?: string;
  error?: string;
  jobId?: string;
}

interface GlobalPrompt {
  key: string;
  description?: string;
  prompt_template: string;
  variables?: string;
}

interface AnglePreset {
  angle_key: string;
  angle_label: string;
  angle_desc: string;
  order: number;
  enabled: boolean;
}

interface ColorPreset {
  color_key: string;
  color_label: string;
  prompt_value: string;
  enabled: boolean;
}

// In-memory storage for marketplace batches
const marketplaceBatches = new Map<string, MarketplaceBatch>();

// Step 3: URL validation helper
async function headOk(url: string) {
  const r = await fetch(url, { method: "HEAD" });
  console.log("[MP][SERVER] HEAD", { url, ok: r.ok, status: r.status });
  if (!r.ok) throw new Error(`HEAD ${r.status} for ${url}`);
}

// Cache for CSV data
let globalPromptsCache: GlobalPrompt[] | null = null;
let anglePresetsCache: AnglePreset[] | null = null;
let colorPresetsCache: ColorPreset[] | null = null;

// Helper function to fetch and parse CSV
async function fetchCSV<T>(url: string): Promise<T[]> {
  try {
    const response = await axios.get(url, { responseType: 'text' });
    const parseResult = Papa.parse<T>(response.data, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim()
    });
    
    if (parseResult.errors.length > 0) {
      console.warn('CSV parsing errors:', parseResult.errors);
    }
    
    return parseResult.data || [];
  } catch (error) {
    console.error(`Error fetching CSV from ${url}:`, error);
    return [];
  }
}

// Load CSV data functions
async function loadGlobalPrompts(): Promise<GlobalPrompt[]> {
  if (globalPromptsCache) {
    return globalPromptsCache;
  }
  
  globalPromptsCache = await fetchCSV<GlobalPrompt>(GLOBAL_PROMPTS_URL);
  console.log(`Loaded ${globalPromptsCache.length} global prompts`);
  return globalPromptsCache;
}

async function loadAnglePresets(): Promise<AnglePreset[]> {
  if (anglePresetsCache) {
    return anglePresetsCache;
  }
  
  const rawData = await fetchCSV<any>(ANGLE_PRESETS_URL);
  anglePresetsCache = rawData
    .filter((row: any) => row.enabled === 'TRUE' || row.enabled === true)
    .map((row: any) => ({
      angle_key: row.angle_key || '',
      angle_label: row.angle_label || '',
      angle_desc: row.angle_desc || '',
      order: parseInt(row.order) || 0,
      enabled: true
    }))
    .sort((a, b) => a.order - b.order);
  
  console.log(`Loaded ${anglePresetsCache.length} angle presets`);
  return anglePresetsCache;
}

async function loadColorPresets(): Promise<ColorPreset[]> {
  if (colorPresetsCache) {
    return colorPresetsCache;
  }
  
  const rawData = await fetchCSV<any>(COLOR_PRESETS_URL);
  colorPresetsCache = rawData
    .filter((row: any) => row.enabled === 'TRUE' || row.enabled === true)
    .map((row: any) => ({
      color_key: row.color_key || '',
      color_label: row.color_label || '',
      prompt_value: row.prompt_value || '',
      enabled: true
    }));
  
  console.log(`Loaded ${colorPresetsCache.length} color presets`);
  return colorPresetsCache;
}

// Helper to build prompt from template
function buildPrompt(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result.trim();
}

// Process marketplace job
async function processMarketplaceJob(batchId: string, resultIndex: number) {
  const batch = marketplaceBatches.get(batchId);
  if (!batch) {
    console.error(`Marketplace batch ${batchId} not found`);
    return;
  }

  const result = batch.results[resultIndex];
  if (!result) {
    console.error(`Marketplace result ${resultIndex} not found in batch ${batchId}`);
    return;
  }

  try {
    result.status = 'processing';
    
    // Load prompt templates
    const globalPrompts = await loadGlobalPrompts();
    
    let prompt = '';
    let imageInput: string[] = [];
    
    if (result.type === 'angle') {
      // Build angle generation prompt using key-based lookup
      const angleGen = globalPrompts.find(p => p.key === 'angle_generation');
      // Send processing status immediately
    push('marketplaceJobUpdated', {
      batchId,
      result: {
        type: result.type,
        angleKey: result.angleKey,
        colorKey: result.colorKey,
        status: 'processing'
      }
    });
      if (!angleGen) {
        console.log('Available global prompts:', globalPrompts);
        throw new Error('Angle generation prompt not found');
      }
      
      const anglePresets = await loadAnglePresets();
      const angleData = anglePresets.find(a => a.angle_key === result.angleKey);
      if (!angleData) {
        throw new Error(`Angle preset ${result.angleKey} not found`);
      }
      
      prompt = buildPrompt(angleGen.prompt_template, {
        ANGLE_DESC: angleData.angle_desc
      });
      imageInput = batch.sourceImageUrls;
      
    } else if (result.type === 'color') {
      // Send processing status immediately  
      push('marketplaceJobUpdated', {
        batchId,
        result: {
          type: result.type,
          angleKey: result.angleKey,
          colorKey: result.colorKey,
          status: 'processing'
        }
      });
      
      // Build colorization prompt using key-based lookup
      const colorize = globalPrompts.find(p => p.key === 'colorization');
      if (!colorize) {
        console.log('Available global prompts:', globalPrompts);
        throw new Error('[MP][SERVER] Missing global prompts');
      }
      
      const colorPresets = await loadColorPresets();
      const colorData = colorPresets.find(c => c.color_key === result.colorKey);
      if (!colorData) {
        throw new Error(`Color preset ${result.colorKey} not found`);
      }
      
      // Find the base angle result to use as input
      const angleResult = batch.results.find(r => 
        r.type === 'angle' && 
        r.angleKey === result.angleKey && 
        r.status === 'completed' && 
        r.imageUrl
      );
      
      if (!angleResult?.imageUrl) {
        throw new Error(`Base angle result not found for ${result.angleKey}`);
      }
      
      prompt = buildPrompt(colorize.prompt_template, {
        COLOR_NAME: colorData.prompt_value
      });
      imageInput = [angleResult.imageUrl];
    }
    
    // Convert hosted URLs to data URIs (same pattern as Photo-to-Studio)
    const imageDataUris: string[] = [];
    for (const url of imageInput) {
      try {
        let imageBuffer: Buffer;
        
        if (url.startsWith('/api/object-storage/')) {
          // Download from our own object storage
          const objectPath = url.replace('/api/object-storage/image/', '');
          imageBuffer = await objectStorage.downloadImage(objectPath);
        } else {
          // External URL (e.g., angle result from previous job)
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
        }
        
        // Convert to data URI like Photo-to-Studio does
        const base64 = imageBuffer.toString('base64');
        const dataUri = `data:image/png;base64,${base64}`;
        imageDataUris.push(dataUri);
        
      } catch (error) {
        console.error(`Failed to convert ${url} to data URI:`, error);
        throw new Error(`Failed to process image: ${url}`);
      }
    }
    
    console.log(`[MP][SERVER] run`, { 
      type: result.type, 
      angleKey: result.angleKey, 
      colorKey: result.colorKey,
      image_input_len: imageDataUris.length
    });
    
    // Create prediction with google/nano-banana using data URIs (same as Photo-to-Studio)
    const prediction = await createPrediction('google/nano-banana', {
      prompt,
      image_input: imageDataUris,
      output_format: 'png'
    });
    
    result.jobId = prediction.id;
    
    // Wait for prediction to complete
    const completedPrediction = await waitForPrediction(prediction.id);
    
    if (completedPrediction.status === 'succeeded' && completedPrediction.output) {
      // Download and persist the image
      const outputUrl = Array.isArray(completedPrediction.output) 
        ? completedPrediction.output[0] 
        : completedPrediction.output as string;
      
      const response = await axios.get(outputUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(response.data);
      const base64Data = imageBuffer.toString('base64');
      
      // Persist to object storage and database
      const persistResult = await persistImage(base64Data, {
        prompt,
        userId: batch.userId,
        sources: batch.sourceImageUrls,
        params: {
          model: 'google/nano-banana',
          type: result.type,
          angleKey: result.angleKey,
          colorKey: result.colorKey,
          batchId
        }
      });
      
      result.status = 'completed';
      result.imageUrl = persistResult.fullUrl;
      result.thumbUrl = persistResult.thumbUrl;
      
      console.log(`[MP][SERVER] persisted`, { hasImageUrl: !!persistResult.fullUrl, hasThumb: !!persistResult.thumbUrl });
      
      // Send WebSocket update
      push('marketplaceJobUpdated', {
        batchId,
        result: {
          type: result.type,
          angleKey: result.angleKey,
          colorKey: result.colorKey,
          status: result.status,
          imageUrl: result.imageUrl,
          thumbUrl: result.thumbUrl
        }
      });
      
    } else {
      throw new Error(`Prediction failed: ${completedPrediction.error || 'Unknown error'}`);
    }
    
  } catch (error: any) {
    console.error(`[MP][SERVER] job error`, { 
      type: result.type, 
      angleKey: result.angleKey, 
      colorKey: result.colorKey, 
      msg: String(error?.message || error) 
    });
    result.status = 'failed';
    result.error = error.message;
    
    // Send WebSocket update for failed job
    push('marketplaceJobUpdated', {
      batchId,
      result: {
        type: result.type,
        angleKey: result.angleKey,
        colorKey: result.colorKey,
        status: result.status,
        error: result.error
      }
    });
  }
  
  // Check if batch is complete
  const allCompleted = batch.results.every(r => r.status === 'completed' || r.status === 'failed');
  if (allCompleted) {
    batch.status = 'completed';
    batch.completedAt = new Date();
    
    push('marketplaceBatchCompleted', {
      batchId,
      status: batch.status
    });
  }
}

// Routes

// Upload source images for marketplace
router.post('/upload', upload.array('images', 10), async (req: any, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }
    
    const uploadPromises = files.map(async (file) => {
      const imageId = uuidv4();
      const { fullUrl } = await objectStorage.uploadImage(file.buffer, imageId, 'png');
      return fullUrl;
    });
    
    const imageUrls = await Promise.all(uploadPromises);
    
    res.json({ imageUrls });
    
  } catch (error: any) {
    console.error('Error uploading marketplace images:', error);
    res.status(500).json({ error: error.message || 'Failed to upload images' });
  }
});

// Create marketplace batch
router.post('/batch', async (req: any, res) => {
  try {
    const { sourceImageUrls, angles, colors, autoColorize } = req.body;
    console.log('[MP][SERVER] /batch', { 
      imgs: sourceImageUrls?.length || 0, 
      angles: angles?.length || 0, 
      colors: colors?.length || 0, 
      autoColorize 
    });
    
    if (!sourceImageUrls || !Array.isArray(sourceImageUrls) || sourceImageUrls.length === 0) {
      return res.status(400).json({ error: 'Source image URLs are required' });
    }
    
    if (!angles || !Array.isArray(angles) || angles.length === 0) {
      return res.status(400).json({ error: 'At least one angle must be selected' });
    }
    
    const batchId = uuidv4();
    const userId = req.user?.id || 'anonymous';
    
    // Create results array
    const results: MarketplaceResult[] = [];
    
    // Add angle jobs
    for (const angleKey of angles) {
      results.push({
        type: 'angle',
        angleKey,
        status: 'pending'
      });
    }
    
    // Add color jobs if autoColorize is enabled
    if (autoColorize && colors && colors.length > 0) {
      for (const angleKey of angles) {
        for (const colorKey of colors) {
          results.push({
            type: 'color',
            angleKey,
            colorKey,
            status: 'pending'
          });
        }
      }
    }
    
    const batch: MarketplaceBatch = {
      id: batchId,
      userId,
      sourceImageUrls,
      angles,
      colors,
      autoColorize,
      status: 'pending',
      results,
      createdAt: new Date()
    };
    
    marketplaceBatches.set(batchId, batch);
    
    // Send WebSocket notification
    push('marketplaceBatchCreated', {
      batchId,
      totalJobs: results.length,
      angles: angles.length,
      colors: autoColorize ? colors?.length || 0 : 0
    });
    
    // Start processing jobs asynchronously
    batch.status = 'processing';
    
    // Process angle jobs first
    const angleJobs = results.filter(r => r.type === 'angle');
    for (let i = 0; i < angleJobs.length; i++) {
      const resultIndex = results.findIndex(r => r === angleJobs[i]);
      processMarketplaceJobWithColorTrigger(batchId, resultIndex).catch(console.error);
    }
    
    res.json({ batchId });
    
  } catch (error: any) {
    console.error('Error creating marketplace batch:', error);
    res.status(500).json({ error: error.message || 'Failed to create marketplace batch' });
  }
});

// Get batch status
router.get('/batch/:batchId', (req, res) => {
  const { batchId } = req.params;
  const batch = marketplaceBatches.get(batchId);
  
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }
  
  const completedCount = batch.results.filter(r => r.status === 'completed').length;
  const failedCount = batch.results.filter(r => r.status === 'failed').length;
  const totalCount = batch.results.length;
  
  res.json({
    batchId,
    status: batch.status,
    total: totalCount,
    completed: completedCount,
    failed: failedCount,
    results: batch.results
  });
});

// Process color jobs for a completed angle
async function processColorJobsForAngle(batchId: string, angleKey: string) {
  const batch = marketplaceBatches.get(batchId);
  if (!batch || !batch.autoColorize) return;
  
  // Find color jobs for this angle
  const colorJobs = batch.results.filter(r => 
    r.type === 'color' && 
    r.angleKey === angleKey && 
    r.status === 'pending'
  );
  
  // Process each color job
  for (const colorJob of colorJobs) {
    const resultIndex = batch.results.findIndex(r => r === colorJob);
    processMarketplaceJob(batchId, resultIndex).catch(console.error);
  }
}

// Wrapper function to handle angle completions and trigger color jobs
async function processMarketplaceJobWithColorTrigger(batchId: string, resultIndex: number) {
  await processMarketplaceJob(batchId, resultIndex);
  
  const batch = marketplaceBatches.get(batchId);
  if (!batch) return;
  
  const result = batch.results[resultIndex];
  if (result.type === 'angle' && result.status === 'completed') {
    // Trigger color jobs for this angle
    await processColorJobsForAngle(batchId, result.angleKey);
  }
}

export default router;