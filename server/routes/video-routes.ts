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
    console.log("🎯 Incoming video generate request:", req.body);
    
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
    console.error("❌ Video generation error:", error);
    console.log(`Error in video generation endpoint: ${error}`);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      });
    }
    
    // For authentication errors, create a test video entry
    if (error instanceof Error && error.message.includes('Could not refresh access token')) {
      console.log('🧪 Authentication failed, creating test video entry for development');
      console.error("❌ Authentication error details:", error.message);
      
      try {
        // Create video record in database with test status
        const videoId = uuidv4();
        const testOperationName = `projects/${process.env.GOOGLE_PROJECT_ID}/locations/${process.env.GCP_LOCATION}/operations/test-video-${videoId}`;
        
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
          gcs_uri: `gs://mkt_ai_content_generation/videos/test-${videoId}`,
          vertex_op: testOperationName,
          video_url: null,
          error_message: null,
          completed_at: null,
        };
        
        // Insert into database
        await storage.createVideo(videoData);
        
        console.log(`Test video record created with ID: ${videoId}`);
        
        // Return response
        return res.json({
          id: videoId,
          operationName: testOperationName,
          mode: 'test',
        });
        
      } catch (dbError) {
        console.log(`Error creating test video: ${dbError}`);
      }
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /status/:id - Check video generation status
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Checking status for video ID: ${id}`);
    
    // Get video from database
    const video = await storage.getVideoById(id);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    console.log(`Video found with status: ${video.status}`);
    
    // If already completed or failed, return current status
    if (video.status === 'completed' || video.status === 'failed') {
      return res.json({
        id: video.id,
        status: video.status,
        video_url: video.video_url,
        gcs_uri: video.gcs_uri,
        error_message: video.error_message,
      });
    }
    
    // For pending/processing videos, check with Vertex AI
    if (video.vertex_op && video.status === 'queued') {
      try {
        const { pollVertexJob } = await import('../vertex');
        const jobStatus = await pollVertexJob(video.vertex_op);
        
        console.log(`Vertex AI job status:`, jobStatus);
        
        if (jobStatus.done) {
          if (jobStatus.error) {
            // Job failed
            await storage.updateVideo(id, {
              status: 'failed',
              error_message: jobStatus.error.message || 'Generation failed',
            });
            
            return res.json({
              id: video.id,
              status: 'failed',
              error_message: jobStatus.error.message || 'Generation failed',
            });
          } else if (jobStatus.response) {
            // Job completed successfully
            // Extract video URL from response
            const videoUrl = jobStatus.response.generatedVideo || null;
            
            await storage.updateVideo(id, {
              status: 'completed',
              video_url: videoUrl,
              completed_at: new Date(),
            });
            
            return res.json({
              id: video.id,
              status: 'completed',
              video_url: videoUrl,
              gcs_uri: video.gcs_uri,
            });
          }
        }
        
        // Still processing
        return res.json({
          id: video.id,
          status: 'processing',
        });
        
      } catch (error) {
        console.log(`Error checking Vertex AI status: ${error}`);
        // Don't fail the request, just return current status
      }
    }
    
    // Return current status
    res.json({
      id: video.id,
      status: video.status,
      video_url: video.video_url,
      gcs_uri: video.gcs_uri,
      error_message: video.error_message,
    });
    
  } catch (error) {
    console.log(`Error in status endpoint: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;