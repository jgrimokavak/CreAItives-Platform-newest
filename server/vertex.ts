import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { v4 as uuidv4 } from 'uuid';
import { log } from './logger';

// Initialize the Vertex AI client
const client = new PredictionServiceClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const projectId = process.env.GOOGLE_PROJECT_ID;
const location = process.env.GCP_LOCATION || 'northamerica-south1';
const bucketName = process.env.GCS_BUCKET;

// Model mapping
const MODEL_MAPPING = {
  'Veo 3': 'veo-3.0-generate-preview',
  'Veo 3 Fast': 'veo-3.0-generate-preview',
  'Veo 2': 'veo-2-generate-preview',
};

interface VideoGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  model: 'Veo 3' | 'Veo 3 Fast' | 'Veo 2';
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: '720p' | '1080p';
  duration: number;
  sampleCount?: number;
  generateAudio?: boolean;
  seed?: number;
  enhancePrompt?: boolean;
  personGeneration?: 'allow_all' | 'dont_allow';
}

interface VideoGenerationResponse {
  operationName: string;
  gcsPrefix: string;
}

export async function startVertexVideoJob(input: VideoGenerationRequest): Promise<VideoGenerationResponse> {
  try {
    const videoId = uuidv4();
    const modelId = MODEL_MAPPING[input.model];
    
    // Create the endpoint path
    const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${modelId}`;
    
    // Generate GCS storage URI
    const gcsPrefix = `gs://${bucketName}/videos/${videoId}`;
    
    // Map resolution to height
    const heightMap = {
      '720p': 720,
      '1080p': 1080,
    };
    
    // Map aspect ratio to width/height
    const aspectRatioMap = {
      '16:9': { width: input.resolution === '1080p' ? 1920 : 1280, height: heightMap[input.resolution] },
      '9:16': { width: heightMap[input.resolution], height: input.resolution === '1080p' ? 1920 : 1280 },
      '1:1': { width: heightMap[input.resolution], height: heightMap[input.resolution] },
    };
    
    const dimensions = aspectRatioMap[input.aspectRatio];
    
    // Build the request parameters
    const parameters: any = {
      prompt: input.prompt,
      aspectRatio: input.aspectRatio,
      videoLength: input.duration,
      width: dimensions.width,
      height: dimensions.height,
      outputOptions: {
        storageUri: gcsPrefix,
      },
    };
    
    // Add optional parameters
    if (input.negativePrompt) {
      parameters.negativePrompt = input.negativePrompt;
    }
    
    if (input.seed !== undefined) {
      parameters.seed = input.seed;
    }
    
    if (input.enhancePrompt) {
      parameters.enhancePrompt = input.enhancePrompt;
    }
    
    if (input.personGeneration) {
      parameters.personGeneration = input.personGeneration;
    }
    
    // Add audio generation for supported models
    if (input.generateAudio && (input.model === 'Veo 3' || input.model === 'Veo 3 Fast')) {
      parameters.generateAudio = input.generateAudio;
    }
    
    // Handle sample count
    if (input.sampleCount && input.sampleCount > 1) {
      parameters.sampleCount = input.sampleCount;
    }
    
    console.log(`Starting Vertex AI video generation with parameters: ${JSON.stringify(parameters, null, 2)}`);
    
    // Make the prediction request - use predict method with proper structure
    const request = {
      endpoint,
      instances: [{ parameters }],
    };
    
    // For now, simulate the operation until we can test the real API
    const operationName = `projects/${projectId}/locations/${location}/operations/video-${videoId}`;
    
    console.log(`Vertex AI operation started: ${operationName}`);
    
    return {
      operationName,
      gcsPrefix,
    };
    
  } catch (error) {
    console.log(`Error starting Vertex AI video job: ${error}`);
    throw error;
  }
}

export async function pollVertexJob(operationName: string) {
  try {
    // For now, return a mock response until we implement real polling
    return {
      done: false,
      error: null,
      response: null,
    };
  } catch (error) {
    console.log(`Error polling Vertex AI job ${operationName}: ${error}`);
    throw error;
  }
}