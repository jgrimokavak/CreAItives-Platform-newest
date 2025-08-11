import express from 'express';
import { z } from 'zod';
import { generateVideoSchema, insertVideoSchema } from '@shared/schema';
import { storage } from '../storage';
import { ProviderRegistry } from '../providers/provider-registry';
import crypto from 'crypto';
import { ObjectStorageService } from '../objectStorage';

const router = express.Router();
const providerRegistry = new ProviderRegistry();

// Generate video endpoint
router.post('/generate', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
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

    // Create video record in database first to get the videoId
    const videoId = crypto.randomUUID();
    
    // Handle first frame image upload to object storage if provided
    // This image both guides the generation AND gets saved as reference
    let referenceImageUrl: string | null = null;
    if (inputs.firstFrameImage) {
      console.log(`[TRACE] First frame image provided, uploading as reference for video ${videoId}`);
      try {
        // Parse base64 image data
        const base64Data = inputs.firstFrameImage.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        console.log(`[TRACE] Parsed first frame image buffer: ${imageBuffer.length} bytes`);
        
        // Upload to object storage as reference image using the actual video ID
        const objectStorage = new ObjectStorageService();
        referenceImageUrl = await objectStorage.uploadReferenceImage(imageBuffer, videoId);
        console.log(`[TRACE] First frame image uploaded successfully as reference: ${referenceImageUrl}`);
      } catch (uploadError) {
        console.error('Failed to upload first frame image as reference:', uploadError);
        // Continue without reference image - don't fail the entire request
      }
    } else {
      console.log(`[TRACE] No first frame image provided for video ${videoId}`);
    }
    const video = await storage.saveVideo({
      id: videoId,
      prompt: inputs.prompt,
      model: model,
      resolution: inputs.resolution,
      duration: inputs.duration?.toString() || '6', // convert to string, default to 6 seconds
      status: 'pending',
      userId: userId,
      projectId: projectId || null,
      firstFrameImage: inputs.firstFrameImage || null,
      referenceImageUrl: referenceImageUrl, // Store the persistent reference image URL
      promptOptimizer: inputs.promptOptimizer !== false, // default to true
      aspectRatio: '16:9', // Default aspect ratio for hailuo-02
      environment: process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev',
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

// Get video status/details by ID
router.get('/status/:id', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const video = await storage.getVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Ensure user can only access their own videos (or is admin)
    if (video.userId !== userId && user?.claims?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ 
      id: video.id,
      status: video.status,
      url: video.url,
      thumbUrl: video.thumbUrl,
      error: video.error,
      prompt: video.prompt,
      createdAt: video.createdAt,
      completedAt: video.completedAt,
      projectId: video.projectId
    });
  } catch (error: any) {
    console.error('Get video status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get video by ID
router.get('/:id', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const video = await storage.getVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Ensure user can only access their own videos (or is admin)
    if (video.userId !== userId && user?.claims?.role !== 'admin') {
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
    const startTime = Date.now();
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { projectId, status, limit, cursor } = req.query;
    
    console.log(`[VIDEO API] Fetching videos for user ${userId} with params:`, { projectId, status, limit, cursor });
    
    const videos = await storage.getAllVideos({
      userId,
      projectId: projectId as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
      cursor: cursor as string,
    });

    console.log(`[VIDEO API] Retrieved ${videos.items?.length || 0} videos in ${Date.now() - startTime}ms`);

    // Filter out failed videos from the gallery
    const successfulVideos = videos.items?.filter(video => video.status !== 'failed') || [];

    console.log(`[VIDEO API] Returning ${successfulVideos.length} successful videos after filtering`);

    res.json({
      items: successfulVideos
    });
  } catch (error: any) {
    console.error('List videos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete video
router.delete('/:id', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const video = await storage.getVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Ensure user can only delete their own videos (or is admin)
    if (video.userId !== userId && user?.claims?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete from object storage if it exists
    try {
      if (video.url && video.url.includes('/api/object-storage/video/')) {
        // Extract the storage path from the URL
        const pathMatch = video.url.match(/\/api\/object-storage\/video\/(.+)/);
        if (pathMatch) {
          const { Client } = await import('@replit/object-storage');
          const client = new Client();
          const { ok, error } = await client.delete(pathMatch[1]);
          if (ok) {
            console.log(`Deleted video file from storage: ${pathMatch[1]}`);
          } else {
            console.error(`Failed to delete video from storage: ${error}`);
          }
        }
      }
      
      // Also delete thumbnail if it exists in object storage
      if (video.thumbUrl && video.thumbUrl.includes('/api/object-storage/video/')) {
        const thumbMatch = video.thumbUrl.match(/\/api\/object-storage\/video\/(.+)/);
        if (thumbMatch) {
          const { Client } = await import('@replit/object-storage');
          const client = new Client();
          const { ok, error } = await client.delete(thumbMatch[1]);
          if (ok) {
            console.log(`Deleted video thumbnail from storage: ${thumbMatch[1]}`);
          } else {
            console.error(`Failed to delete video thumbnail from storage: ${error}`);
          }
        }
      }
    } catch (storageError) {
      console.error('Error deleting video from storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    await storage.deleteVideo(req.params.id);
    res.json({ success: true, message: 'Video deleted successfully' });

  } catch (error: any) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Move video to project
router.patch('/:id/move', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate request body
    const { projectId } = req.body;
    if (projectId !== null && typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID must be a string or null' });
    }

    const video = await storage.getVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Ensure user can only move their own videos (or is admin)
    if (video.userId !== userId && user?.claims?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If projectId is provided, verify it exists and belongs to the user
    if (projectId) {
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (project.userId !== userId && user?.claims?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied to project' });
      }
    }

    // Update video with new project
    const updatedVideo = await storage.updateVideo(req.params.id, { projectId });
    if (!updatedVideo) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Update video counts for both old and new projects
    if (video.projectId) {
      await storage.updateProjectVideoCount(video.projectId);
    }
    if (projectId) {
      await storage.updateProjectVideoCount(projectId);
    }

    res.json({
      success: true,
      video: updatedVideo,
      message: 'Video moved successfully'
    });

  } catch (error: any) {
    console.error('Move video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk move videos to a project
router.patch('/bulk/move', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate request body
    const { videoIds, targetProjectId } = req.body;
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({ error: 'videoIds must be a non-empty array' });
    }
    if (targetProjectId !== null && typeof targetProjectId !== 'string') {
      return res.status(400).json({ error: 'targetProjectId must be a string or null' });
    }

    // Verify all videos exist and belong to the user
    const videos = await Promise.all(
      videoIds.map(id => storage.getVideoById(id))
    );
    
    for (const video of videos) {
      if (!video) {
        return res.status(404).json({ error: 'One or more videos not found' });
      }
      if (video.userId !== userId && user?.claims?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied to one or more videos' });
      }
    }

    // If targetProjectId is provided, verify it exists and belongs to the user
    if (targetProjectId) {
      const project = await storage.getProjectById(targetProjectId);
      if (!project) {
        return res.status(404).json({ error: 'Target project not found' });
      }
      if (project.userId !== userId && user?.claims?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied to target project' });
      }
    }

    // Perform bulk move
    await storage.bulkMoveVideos(videoIds, targetProjectId);

    // Update video counts for affected projects
    const affectedProjectIds = new Set<string>();
    for (const video of videos) {
      if (video?.projectId) affectedProjectIds.add(video.projectId);
    }
    if (targetProjectId) affectedProjectIds.add(targetProjectId);

    for (const projectId of Array.from(affectedProjectIds)) {
      await storage.updateProjectVideoCount(projectId);
    }

    res.json({
      success: true,
      message: `${videoIds.length} videos moved successfully`,
      movedCount: videoIds.length
    });

  } catch (error: any) {
    console.error('Bulk move videos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unassigned videos (videos without a project)
router.get('/unassigned', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const unassignedVideos = await storage.getUnassignedVideos(userId);
    
    // Filter out failed videos
    const successfulVideos = unassignedVideos.filter(video => video.status !== 'failed');

    res.json({
      videos: successfulVideos,
      count: successfulVideos.length
    });

  } catch (error: any) {
    console.error('Get unassigned videos error:', error);
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
        // Download and save video to object storage
        let finalVideoUrl = jobStatus.videoUrl;
        let finalThumbUrl = jobStatus.thumbnailUrl;

        try {
          if (jobStatus.videoUrl) {
            // Download video from Replicate
            console.log(`Downloading video from Replicate: ${jobStatus.videoUrl}`);
            const videoResponse = await fetch(jobStatus.videoUrl);
            const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
            
            // Upload to object storage using the same pattern as images
            const { ObjectStorageService } = await import('../objectStorage');
            const objectStorage = new ObjectStorageService();
            const uploadResult = await objectStorage.uploadVideo(videoBuffer, videoId, 'mp4');
            
            finalVideoUrl = uploadResult.fullUrl;
            console.log(`Video uploaded to object storage: ${finalVideoUrl}`);
            
            // Use generated thumbnail if available
            if (uploadResult.thumbUrl) {
              finalThumbUrl = uploadResult.thumbUrl;
              console.log(`Video thumbnail created: ${finalThumbUrl}`);
            }
          }

          // Fallback to Replicate thumbnail if no generated thumbnail
          if (!finalThumbUrl && jobStatus.thumbnailUrl) {
            finalThumbUrl = jobStatus.thumbnailUrl;
            console.log(`Using Replicate thumbnail URL: ${finalThumbUrl}`);
          }
        } catch (storageError) {
          console.error('Error saving video to storage:', storageError);
          // Fallback to original Replicate URLs if storage fails
          finalVideoUrl = jobStatus.videoUrl;
          finalThumbUrl = jobStatus.thumbnailUrl;
        }

        // Job completed successfully
        await storage.updateVideo(videoId, {
          status: 'completed',
          url: finalVideoUrl,
          thumbUrl: finalThumbUrl,
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