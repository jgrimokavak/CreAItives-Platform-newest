import express from 'express';
import { z } from 'zod';
import { generateVideoSchema, insertVideoSchema } from '@shared/schema';
import { storage } from '../storage';
import { ProviderRegistry } from '../providers/provider-registry';
import crypto from 'crypto';

const router = express.Router();
const providerRegistry = new ProviderRegistry();

// Generate video endpoint
router.post('/generate', async (req, res) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate input
    const validationResult = generateVideoSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validationResult.error.issues 
      });
    }

    const { model, projectId, ...inputs } = validationResult.data;

    // Create video record in database
    const videoId = crypto.randomUUID();
    const video = await storage.saveVideo({
      id: videoId,
      prompt: inputs.prompt,
      model: model,
      aspectRatio: inputs.aspectRatio,
      resolution: inputs.resolution,
      duration: inputs.duration,
      status: 'pending',
      userId: userId,
      projectId: projectId || null,
      referenceImage: inputs.referenceImage || null,
      seed: inputs.seed || null,
      audioEnabled: inputs.audioEnabled || false,
      personGeneration: inputs.personGeneration !== false, // default to true
      environment: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
    });

    // Get the appropriate provider for video generation
    const provider = providerRegistry.getProviderForModel(model);
    if (!provider) {
      await storage.updateVideo(videoId, { 
        status: 'failed', 
        error: `No provider found for model: ${model}` 
      });
      return res.status(400).json({ error: `Unsupported model: ${model}` });
    }

    // Start video generation job
    try {
      const jobResult = await provider.generateVideo(model, inputs);
      
      // Update video record with job information
      const updatedVideo = await storage.updateVideo(videoId, {
        jobId: jobResult.jobId,
        status: 'processing'
      });

      res.json({
        success: true,
        video: updatedVideo,
        jobId: jobResult.jobId,
        message: 'Video generation started successfully'
      });

      // Start background polling for job completion
      pollVideoJob(videoId, jobResult.jobId, provider);

    } catch (providerError: any) {
      console.error('Provider error:', providerError);
      await storage.updateVideo(videoId, { 
        status: 'failed', 
        error: providerError.message || 'Provider error occurred' 
      });
      
      return res.status(500).json({ 
        error: 'Failed to start video generation',
        details: providerError.message
      });
    }

  } catch (error: any) {
    console.error('Video generation error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get video by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const video = await storage.getVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Ensure user can only access their own videos (or is admin)
    const user = (req.session as any)?.user;
    if (video.userId !== userId && user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ video });
  } catch (error: any) {
    console.error('Get video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List user's videos
router.get('/', async (req, res) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { projectId, status, limit, cursor } = req.query;
    
    const videos = await storage.getAllVideos({
      userId,
      projectId: projectId as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      cursor: cursor as string,
    });

    res.json(videos);
  } catch (error: any) {
    console.error('List videos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete video
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req.session as any)?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const video = await storage.getVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Ensure user can only delete their own videos (or is admin)
    const user = (req.session as any)?.user;
    if (video.userId !== userId && user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await storage.deleteVideo(req.params.id);
    res.json({ success: true, message: 'Video deleted successfully' });

  } catch (error: any) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Background job polling function
async function pollVideoJob(videoId: string, jobId: string, provider: any) {
  const maxAttempts = 30; // Maximum polling attempts (5 minutes with 10s intervals)
  let attempts = 0;

  const poll = async () => {
    try {
      attempts++;
      console.log(`Polling video job ${jobId} (attempt ${attempts}/${maxAttempts})`);

      const jobStatus = await provider.pollJobStatus(jobId);
      
      if (jobStatus.status === 'completed') {
        // Job completed successfully
        await storage.updateVideo(videoId, {
          status: 'completed',
          url: jobStatus.videoUrl,
          thumbUrl: jobStatus.thumbnailUrl,
          completedAt: new Date(),
        });
        
        console.log(`Video job ${jobId} completed successfully`);
        return;
      }
      
      if (jobStatus.status === 'failed') {
        // Job failed
        await storage.updateVideo(videoId, {
          status: 'failed',
          error: jobStatus.error || 'Video generation failed',
        });
        
        console.log(`Video job ${jobId} failed:`, jobStatus.error);
        return;
      }
      
      // Job still processing - continue polling if within limits
      if (attempts < maxAttempts) {
        setTimeout(poll, 10000); // Poll every 10 seconds
      } else {
        // Max attempts reached - mark as failed
        await storage.updateVideo(videoId, {
          status: 'failed',
          error: 'Video generation timed out',
        });
        
        console.log(`Video job ${jobId} timed out after ${maxAttempts} attempts`);
      }
      
    } catch (error) {
      console.error(`Error polling video job ${jobId}:`, error);
      
      if (attempts >= maxAttempts) {
        await storage.updateVideo(videoId, {
          status: 'failed',
          error: 'Polling error: ' + (error as any).message,
        });
      } else {
        // Try again
        setTimeout(poll, 10000);
      }
    }
  };

  // Start polling after initial delay
  setTimeout(poll, 5000); // Wait 5 seconds before first poll
}

export default router;