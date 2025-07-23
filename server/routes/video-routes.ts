import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { generateVideoSchema } from '@shared/schema';
import { startVertexVideoJob } from '../vertex';


const router = express.Router();

// POST / - Generate video
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const validatedData = generateVideoSchema.parse(req.body);
    
    console.log(`Video generation request: ${JSON.stringify(validatedData, null, 2)}`);
    
    // Start the Vertex AI job
    const { operationName, gcsPrefix } = await startVertexVideoJob({
      prompt: validatedData.prompt,
      negativePrompt: validatedData.negativePrompt,
      model: validatedData.model,
      aspectRatio: validatedData.aspectRatio,
      resolution: validatedData.resolution,
      duration: validatedData.duration,
      sampleCount: validatedData.sampleCount,
      generateAudio: validatedData.generateAudio,
      seed: validatedData.seed,
      enhancePrompt: validatedData.enhancePrompt,
      personGeneration: validatedData.personGeneration,
    });
    
    // Create video record in database
    const videoId = uuidv4();
    const videoData = {
      id: videoId,
      project_id: validatedData.projectId || null,
      prompt: validatedData.prompt,
      negative_prompt: validatedData.negativePrompt || null,
      model_id: validatedData.model,
      aspect_ratio: validatedData.aspectRatio,
      resolution: validatedData.resolution,
      duration: validatedData.duration.toString(),
      sample_count: validatedData.sampleCount.toString(),
      seed: validatedData.seed?.toString() || null,
      audio: validatedData.generateAudio,
      enhance_prompt: validatedData.enhancePrompt,
      person_generation: validatedData.personGeneration,
      status: 'queued' as const,
      gcs_uri: gcsPrefix,
      vertex_op: operationName,
      video_url: null,
      error_message: null,
      completed_at: null,
    };
    
    // Insert into database
    await storage.createVideo(videoData);
    
    console.log(`Video record created with ID: ${videoId}`);
    
    // Return response
    res.json({
      id: videoId,
      operationName,
    });
    
  } catch (error) {
    console.log(`Error in video generation endpoint: ${error}`);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;