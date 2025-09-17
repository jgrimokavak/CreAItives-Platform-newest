import { videoJobQueue } from './videoQueue';
import { ProviderRegistry } from '../providers/provider-registry';
import { storage } from '../storage';

class VideoJobProcessor {
  private providerRegistry: ProviderRegistry;
  private isStarted = false;

  constructor() {
    this.providerRegistry = new ProviderRegistry();
    this.setupJobHandlers();
  }

  start(): void {
    if (this.isStarted) {
      console.warn('Video job processor already started');
      return;
    }
    
    this.isStarted = true;
    console.log('🎥 Video job processor started');
  }

  stop(): void {
    this.isStarted = false;
    console.log('🎥 Video job processor stopped');
  }

  private setupJobHandlers(): void {
    // Handle jobs that are ready to be processed
    videoJobQueue.on('jobReady', async (job) => {
      if (!this.isStarted) return;
      
      console.log(`Processing video job ${job.id} for user ${job.userId}`);
      await this.processJob(job);
    });

    // Handle job completion events
    videoJobQueue.on('jobCompleted', async ({ jobId, userId, success }) => {
      console.log(`Video job ${jobId} completed for user ${userId}: ${success ? 'SUCCESS' : 'FAILED'}`);
    });
  }

  private async processJob(job: any): Promise<void> {
    const { id: videoId, userId, data } = job;
    const { model } = data; // Fix: Extract model from job.data, not job
    const startTime = Date.now();

    try {
      // Update video to processing status
      const nextPollAt = new Date(Date.now() + 30 * 1000); // Poll in 30 seconds
      await storage.startVideoProcessing(videoId, '', nextPollAt);

      // Get the appropriate provider
      const provider = this.providerRegistry.getProviderForModel(model);
      if (!provider) {
        throw new Error(`No provider found for model: ${model}`);
      }

      // Start video generation with the provider
      console.log(`Starting video generation with provider for model ${model}`);
      const jobResult = await provider.generateVideo(model, data);

      // Update video with job information
      await storage.updateVideoJobState(videoId, {
        nextPollAt: new Date(Date.now() + 30 * 1000),
      });

      // Update video record with actual job ID from provider
      await storage.updateVideo(videoId, {
        jobId: jobResult.jobId,
        status: 'processing'
      });

      console.log(`Video job ${videoId} started with provider job ID: ${jobResult.jobId}`);

      // Start background polling for job completion
      // Note: Job remains in processing map until terminal state (completion/failure/timeout)
      this.pollVideoJob(videoId, jobResult.jobId, provider, userId, startTime);

    } catch (error: any) {
      console.error(`Failed to process video job ${videoId}:`, error);

      // Mark job as failed in queue
      await videoJobQueue.completeJob(videoId, false, error.message);

      // Log analytics for failed video generation
      try {
        const { logActivity } = await import('../analytics');
        const duration = Date.now() - startTime;
        await logActivity({
          userId,
          event: 'video_generate_failure',
          feature: 'video_generation',
          model: model || 'unknown',
          status: 'failed',
          duration: Math.round(duration / 1000),
          errorCode: error.code || 'PROCESSOR_ERROR',
          metadata: {
            error: error.message?.substring(0, 200),
            projectId: data.projectId || null,
            model: model || 'unknown'
          }
        });
        console.log(`Analytics tracked: Video generation failure for user ${userId}`);
      } catch (analyticsError) {
        console.error('Failed to log analytics:', analyticsError);
      }
    }
  }

  private async pollVideoJob(
    videoId: string,
    jobId: string,
    provider: any,
    userId: string,
    startTime: number,
    attempt: number = 1
  ): Promise<void> {
    const maxAttempts = 120; // 20 minutes max (120 * 10 seconds)
    
    try {
      console.log(`Polling video job ${videoId} (attempt ${attempt}/${maxAttempts})`);
      
      const jobStatus = await provider.getVideoStatus(jobId);
      
      if (jobStatus.status === 'completed') {
        await this.handleJobCompletion(videoId, jobStatus, userId, startTime);
      } else if (jobStatus.status === 'failed') {
        await this.handleJobFailure(videoId, jobStatus, userId, startTime);
      } else if (jobStatus.status === 'processing') {
        // Continue polling
        if (attempt < maxAttempts) {
          // Update next poll time
          await storage.updateVideoJobState(videoId, {
            nextPollAt: new Date(Date.now() + 10 * 1000),
            attemptCount: attempt
          });
          
          // Schedule next poll in 10 seconds
          setTimeout(() => {
            this.pollVideoJob(videoId, jobId, provider, userId, startTime, attempt + 1);
          }, 10 * 1000);
        } else {
          // Max attempts reached, mark as failed
          await this.handleJobTimeout(videoId, userId, startTime);
        }
      }
    } catch (pollError: any) {
      console.error(`Error polling video job ${videoId}:`, pollError);
      
      if (attempt < maxAttempts) {
        // Retry polling with exponential backoff
        const backoffDelay = Math.min(60000, 5000 * Math.pow(1.5, attempt)); // Max 60 seconds
        
        await storage.updateVideoJobState(videoId, {
          lastError: pollError.message,
          nextPollAt: new Date(Date.now() + backoffDelay),
          attemptCount: attempt
        });
        
        console.log(`Retrying poll for video ${videoId} in ${backoffDelay}ms`);
        setTimeout(() => {
          this.pollVideoJob(videoId, jobId, provider, userId, startTime, attempt + 1);
        }, backoffDelay);
      } else {
        // Max attempts reached, mark as failed
        await this.handleJobTimeout(videoId, userId, startTime, pollError.message);
      }
    }
  }

  private async handleJobCompletion(
    videoId: string,
    jobStatus: any,
    userId: string,
    startTime: number
  ): Promise<void> {
    console.log(`Video job ${videoId} completed successfully`);

    try {
      // Download and save video to object storage
      let finalVideoUrl = jobStatus.videoUrl;
      let finalThumbUrl = jobStatus.thumbnailUrl;

      if (jobStatus.videoUrl) {
        try {
          console.log(`Downloading video from provider: ${jobStatus.videoUrl}`);
          const videoResponse = await fetch(jobStatus.videoUrl);
          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          
          // Upload to object storage
          const { ObjectStorageService } = await import('../objectStorage');
          const objectStorage = new ObjectStorageService();
          const uploadResult = await objectStorage.uploadVideo(videoBuffer, videoId, 'mp4');
          
          finalVideoUrl = uploadResult.fullUrl;
          finalThumbUrl = uploadResult.thumbUrl || finalThumbUrl;
          
          console.log(`Video uploaded to object storage: ${finalVideoUrl}`);
        } catch (storageError) {
          console.error('Error saving video to storage:', storageError);
          // Continue with original URLs if storage fails
        }
      }

      // Complete the job in database
      await storage.completeVideoJob(videoId, {
        url: finalVideoUrl,
        thumbUrl: finalThumbUrl,
        size: jobStatus.fileSize || 0
      });

      // Log successful video generation to analytics
      const { logActivity } = await import('../analytics');
      const duration = Date.now() - startTime;
      await logActivity({
        userId,
        event: 'video_generate_success',
        feature: 'video_generation',
        status: 'completed',
        duration: Math.round(duration / 1000),
        metadata: {
          videoId,
          hasThumb: !!finalThumbUrl
        }
      });
      console.log(`Analytics tracked: Video generation success for user ${userId}`);

      // Mark job as completed in queue (frees concurrency slot)
      videoJobQueue.completeJob(videoId, true);

    } catch (error: any) {
      console.error(`Error completing video job ${videoId}:`, error);
      await storage.failVideoJob(videoId, `Completion error: ${error.message}`);
      
      // Mark job as failed in queue (frees concurrency slot)
      videoJobQueue.completeJob(videoId, false, `Completion error: ${error.message}`);
    }
  }

  private async handleJobFailure(
    videoId: string,
    jobStatus: any,
    userId: string,
    startTime: number
  ): Promise<void> {
    const errorMessage = jobStatus.error || 'Video generation failed';
    console.error(`Video job ${videoId} failed: ${errorMessage}`);

    await storage.failVideoJob(videoId, errorMessage);

    // Log failed video generation to analytics
    try {
      const { logActivity } = await import('../analytics');
      const duration = Date.now() - startTime;
      await logActivity({
        userId,
        event: 'video_generate_failure',
        feature: 'video_generation',
        status: 'failed',
        duration: Math.round(duration / 1000),
        errorCode: jobStatus.errorCode || 'PROVIDER_FAILURE',
        metadata: {
          error: errorMessage.substring(0, 200),
          videoId
        }
      });
      console.log(`Analytics tracked: Video generation failure for user ${userId}`);
    } catch (analyticsError) {
      console.error('Failed to log analytics:', analyticsError);
    }

    // Mark job as failed in queue (frees concurrency slot)
    videoJobQueue.completeJob(videoId, false, errorMessage);
  }

  private async handleJobTimeout(
    videoId: string,
    userId: string,
    startTime: number,
    lastError?: string
  ): Promise<void> {
    const errorMessage = lastError || 'Video generation timed out after maximum polling attempts';
    console.error(`Video job ${videoId} timed out: ${errorMessage}`);

    await storage.failVideoJob(videoId, errorMessage);

    // Log timeout to analytics
    try {
      const { logActivity } = await import('../analytics');
      const duration = Date.now() - startTime;
      await logActivity({
        userId,
        event: 'video_generate_failure',
        feature: 'video_generation',
        status: 'failed',
        duration: Math.round(duration / 1000),
        errorCode: 'TIMEOUT',
        metadata: {
          error: errorMessage.substring(0, 200),
          videoId
        }
      });
      console.log(`Analytics tracked: Video generation timeout for user ${userId}`);
    } catch (analyticsError) {
      console.error('Failed to log analytics:', analyticsError);
    }

    // Mark job as failed in queue (frees concurrency slot)  
    videoJobQueue.completeJob(videoId, false, errorMessage);
  }
}

// Global video job processor instance
export const videoJobProcessor = new VideoJobProcessor();

// Export for use in other modules
export default videoJobProcessor;