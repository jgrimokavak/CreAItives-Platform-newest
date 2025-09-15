import EventEmitter from 'events';
import { storage } from '../storage';

interface VideoJobData {
  id: string;
  userId: string;
  prompt: string;
  model: string;
  projectId?: string;
  resolution: string;
  duration: string;
  aspectRatio?: string;
  firstFrameImage?: string;
  referenceImageUrl?: string;
  promptOptimizer?: boolean;
  // Additional video generation parameters
  [key: string]: any;
}

interface QueuedJob {
  id: string;
  userId: string;
  data: VideoJobData;
  priority: number;
  queuedAt: Date;
  retries: number;
}

export class VideoJobQueue extends EventEmitter {
  private queue: QueuedJob[] = [];
  private processing = new Map<string, QueuedJob>();
  private userTokens = new Map<string, number>(); // Per-user concurrent processing tokens
  private maxConcurrentPerUser = 2;
  private maxRetries = 3;
  private isProcessing = false;

  constructor() {
    super();
    this.startProcessing();
    
    // Clean up completed processing every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  // Add a video generation job to the queue
  async enqueueJob(jobData: VideoJobData): Promise<{
    queued: boolean;
    position?: number;
    reason?: string;
  }> {
    const userId = jobData.userId;
    
    // Check if user has available processing tokens
    const userProcessingCount = this.getUserProcessingCount(userId);
    
    if (userProcessingCount >= this.maxConcurrentPerUser) {
      // Add to queue
      const queuedJob: QueuedJob = {
        id: jobData.id,
        userId,
        data: jobData,
        priority: 0, // Normal priority
        queuedAt: new Date(),
        retries: 0
      };

      this.queue.push(queuedJob);
      this.sortQueue();

      const position = this.queue.findIndex(job => job.id === jobData.id) + 1;
      
      // Mark video as queued in database
      await storage.queueVideo(jobData.id);
      
      console.log(`Video ${jobData.id} queued for user ${userId} at position ${position}`);
      
      return { queued: true, position };
    } else {
      // Can process immediately
      const queuedJob: QueuedJob = {
        id: jobData.id,
        userId,
        data: jobData,
        priority: 1, // High priority for immediate processing
        queuedAt: new Date(),
        retries: 0
      };

      this.processing.set(jobData.id, queuedJob);
      
      // Start processing immediately
      this.emit('jobReady', queuedJob);
      
      console.log(`Video ${jobData.id} started processing immediately for user ${userId}`);
      
      return { queued: false };
    }
  }

  // Get next job ready for processing
  private getNextJob(): QueuedJob | null {
    if (this.queue.length === 0) return null;

    // Find first job whose user has available processing tokens
    for (let i = 0; i < this.queue.length; i++) {
      const job = this.queue[i];
      const userProcessingCount = this.getUserProcessingCount(job.userId);
      
      if (userProcessingCount < this.maxConcurrentPerUser) {
        // Remove from queue and return
        this.queue.splice(i, 1);
        return job;
      }
    }

    return null; // No jobs can be processed right now
  }

  // Start processing jobs
  private startProcessing(): void {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    const processNext = async () => {
      try {
        const job = this.getNextJob();
        
        if (job) {
          this.processing.set(job.id, job);
          console.log(`Starting video processing for job ${job.id}`);
          
          // Emit event for job processor to handle
          this.emit('jobReady', job);
        }
        
        // Continue processing after a short delay
        setTimeout(processNext, 1000);
      } catch (error) {
        console.error('Error in job processing loop:', error);
        setTimeout(processNext, 5000); // Longer delay on error
      }
    };

    processNext();
  }

  // Mark job as completed and free up user token
  async completeJob(jobId: string, success: boolean, error?: string): Promise<void> {
    const job = this.processing.get(jobId);
    if (!job) {
      console.warn(`Attempted to complete non-existent job ${jobId}`);
      return;
    }

    if (success) {
      console.log(`Video job ${jobId} completed successfully`);
      this.processing.delete(jobId);
    } else if (job.retries < this.maxRetries) {
      // Retry the job
      job.retries++;
      job.priority = 0; // Reset to normal priority
      job.queuedAt = new Date();
      
      this.queue.unshift(job); // Add to front of queue for retry
      this.processing.delete(jobId);
      
      console.log(`Video job ${jobId} failed, retry ${job.retries}/${this.maxRetries}: ${error}`);
    } else {
      // Max retries reached, mark as failed
      console.error(`Video job ${jobId} failed permanently after ${this.maxRetries} retries: ${error}`);
      
      try {
        await storage.failVideoJob(jobId, error || 'Unknown error after max retries');
      } catch (dbError) {
        console.error(`Failed to update video status in database: ${dbError}`);
      }
      
      this.processing.delete(jobId);
    }

    // Try to process next queued job for any user
    this.emit('jobCompleted', { jobId, userId: job.userId, success });
  }

  // Get number of jobs currently processing for a user
  private getUserProcessingCount(userId: string): number {
    let count = 0;
    for (const job of Array.from(this.processing.values())) {
      if (job.userId === userId) {
        count++;
      }
    }
    return count;
  }

  // Sort queue by priority and queue time
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // First by priority (higher first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Then by queue time (earlier first)
      return a.queuedAt.getTime() - b.queuedAt.getTime();
    });
  }

  // Get queue status for monitoring
  getStatus(): {
    queueLength: number;
    processingCount: number;
    userStats: Record<string, { queued: number; processing: number }>;
  } {
    const userStats: Record<string, { queued: number; processing: number }> = {};

    // Count queued jobs per user
    for (const job of this.queue) {
      if (!userStats[job.userId]) {
        userStats[job.userId] = { queued: 0, processing: 0 };
      }
      userStats[job.userId].queued++;
    }

    // Count processing jobs per user
    for (const job of Array.from(this.processing.values())) {
      if (!userStats[job.userId]) {
        userStats[job.userId] = { queued: 0, processing: 0 };
      }
      userStats[job.userId].processing++;
    }

    return {
      queueLength: this.queue.length,
      processingCount: this.processing.size,
      userStats
    };
  }

  // Get queue position for a specific job
  getJobPosition(jobId: string): number {
    const index = this.queue.findIndex(job => job.id === jobId);
    return index === -1 ? 0 : index + 1;
  }

  // Cancel a queued job
  async cancelJob(jobId: string, userId: string): Promise<boolean> {
    // Check if job is in queue
    const queueIndex = this.queue.findIndex(job => job.id === jobId && job.userId === userId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      
      // Mark as failed in database
      try {
        await storage.failVideoJob(jobId, 'Cancelled by user');
      } catch (error) {
        console.error(`Failed to cancel job in database: ${error}`);
      }
      
      console.log(`Cancelled queued video job ${jobId}`);
      return true;
    }

    // Job might be processing, can't cancel
    return false;
  }

  // Clean up old completed processing entries
  private cleanup(): void {
    const now = new Date();
    const cutoff = now.getTime() - (10 * 60 * 1000); // 10 minutes ago
    
    // Clean up any stuck processing jobs (shouldn't happen, but safety measure)
    for (const [jobId, job] of Array.from(this.processing.entries())) {
      if (job.queuedAt.getTime() < cutoff) {
        console.warn(`Cleaning up stuck processing job ${jobId} for user ${job.userId}`);
        this.processing.delete(jobId);
      }
    }
  }

  // Force restart processing (for debugging)
  restartProcessing(): void {
    this.isProcessing = false;
    this.startProcessing();
  }
}

// Global video job queue instance
export const videoJobQueue = new VideoJobQueue();

// Export for use in other modules
export default videoJobQueue;