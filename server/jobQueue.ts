import { db } from './db';
import { photoStudioJobs } from '@shared/schema';
import { eq, and, inArray, desc, count } from 'drizzle-orm';
import { push, pushToUser } from './ws';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CreateJobData {
  userId: string;
  mode: 'background-only' | 'studio-enhance';
  modelKey: string;
  brand?: string;
  additionalInstructions?: string;
  imageFiles: Array<{
    name: string;
    size: number;
    type: string;
    base64: string;
  }>;
}

export interface JobProgress {
  jobId: string;
  progress: number;
  status: JobStatus;
  message?: string;
}

// Create a new job and add it to the queue
export async function createJob(data: CreateJobData): Promise<string> {
  const environment = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await db.insert(photoStudioJobs).values({
    id: jobId,
    userId: data.userId,
    status: 'pending',
    mode: data.mode,
    modelKey: data.modelKey,
    brand: data.brand || null,
    additionalInstructions: data.additionalInstructions || null,
    imageFiles: data.imageFiles,
    progress: 0,
    environment,
  });

  console.log(`Created job ${jobId} for user ${data.userId}`);
  
  // Broadcast job creation only to the specific user's clients (prevents duplicates)
  pushToUser(data.userId, 'jobCreated', {
    jobId,
    userId: data.userId,
    status: 'pending',
    mode: data.mode,
    modelKey: data.modelKey,
    progress: 0
  });

  return jobId;
}

// Get active jobs for a user (pending + processing)
export async function getUserActiveJobs(userId: string): Promise<any[]> {
  const environment = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
  
  const jobs = await db.select()
    .from(photoStudioJobs)
    .where(and(
      eq(photoStudioJobs.userId, userId),
      inArray(photoStudioJobs.status, ['pending', 'processing']),
      eq(photoStudioJobs.environment, environment)
    ))
    .orderBy(desc(photoStudioJobs.createdAt));
    
  return jobs;
}

// Get all jobs for a user (for debugging/history)
export async function getUserAllJobs(userId: string, limit: number = 20): Promise<any[]> {
  const environment = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
  
  const jobs = await db.select()
    .from(photoStudioJobs)
    .where(and(
      eq(photoStudioJobs.userId, userId),
      eq(photoStudioJobs.environment, environment)
    ))
    .orderBy(desc(photoStudioJobs.createdAt))
    .limit(limit);
    
  return jobs;
}

// Update job status
export async function updateJobStatus(
  jobId: string, 
  status: JobStatus, 
  updates: {
    progress?: number;
    startedAt?: Date;
    completedAt?: Date;
    errorMessage?: string;
    resultImageUrl?: string;
    resultThumbUrl?: string;
  } = {}
): Promise<void> {
  const updateData: any = { status, ...updates };
  
  await db.update(photoStudioJobs)
    .set(updateData)
    .where(eq(photoStudioJobs.id, jobId));
    
  // Get job details for broadcasting
  const job = await db.select()
    .from(photoStudioJobs)
    .where(eq(photoStudioJobs.id, jobId))
    .limit(1);
    
  if (job.length > 0) {
    const jobData = job[0];
    
    // Broadcast status update to user's clients only (prevents duplicates)
    pushToUser(jobData.userId, 'jobUpdated', {
      jobId,
      userId: jobData.userId,
      status,
      progress: updates.progress || jobData.progress,
      resultImageUrl: updates.resultImageUrl || jobData.resultImageUrl,
      resultThumbUrl: updates.resultThumbUrl || jobData.resultThumbUrl,
      errorMessage: updates.errorMessage || jobData.errorMessage
    });
    
    console.log(`Updated job ${jobId} status to ${status} for user ${jobData.userId}`);
  }
}

// Get next pending job for processing
export async function getNextPendingJob(): Promise<any | null> {
  const environment = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
  
  const jobs = await db.select()
    .from(photoStudioJobs)
    .where(and(
      eq(photoStudioJobs.status, 'pending'),
      eq(photoStudioJobs.environment, environment)
    ))
    .orderBy(photoStudioJobs.createdAt) // FIFO
    .limit(1);
    
  return jobs.length > 0 ? jobs[0] : null;
}

// Count active jobs for a user
export async function countUserActiveJobs(userId: string): Promise<number> {
  const environment = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
  
  const result = await db.select({ count: count() })
    .from(photoStudioJobs)
    .where(and(
      eq(photoStudioJobs.userId, userId),
      inArray(photoStudioJobs.status, ['pending', 'processing']),
      eq(photoStudioJobs.environment, environment)
    ));
    
  return result[0]?.count || 0;
}

// Clean up old completed jobs (optional maintenance function)
export async function cleanupOldJobs(olderThanDays: number = 7): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  // Note: This would need additional implementation for complex date queries
  console.log(`Cleanup function called for jobs older than ${olderThanDays} days`);
}