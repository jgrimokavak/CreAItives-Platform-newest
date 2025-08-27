import { 
  getNextPendingJob, 
  updateJobStatus,
  JobStatus 
} from './jobQueue';
import { persistImage } from './fs-storage';
import { logActivity } from './analytics';
import { getPrompt } from './carData';
import { models } from './config/models';
import { ReplicateProvider } from './providers/replicate-provider';

// Job processing interval in milliseconds
const PROCESSING_INTERVAL = 2000; // Check every 2 seconds
let isProcessing = false;
let processingInterval: NodeJS.Timeout | null = null;

// Initialize the job processor
export function startJobProcessor(): void {
  console.log('🚀 Starting photo-to-studio job processor...');
  
  if (processingInterval) {
    clearInterval(processingInterval);
  }
  
  processingInterval = setInterval(processNextJob, PROCESSING_INTERVAL);
  
  // Process one job immediately on start
  setTimeout(processNextJob, 1000);
}

// Stop the job processor
export function stopJobProcessor(): void {
  console.log('🛑 Stopping photo-to-studio job processor...');
  
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
  }
}

// Process the next pending job
async function processNextJob(): Promise<void> {
  if (isProcessing) {
    return; // Already processing a job
  }
  
  try {
    const job = await getNextPendingJob();
    
    if (!job) {
      return; // No pending jobs
    }
    
    isProcessing = true;
    console.log(`📋 Processing job ${job.id} for user ${job.userId}`);
    
    await processJob(job);
    
  } catch (error) {
    console.error('Error in job processor:', error);
  } finally {
    isProcessing = false;
  }
}

// Process a single job
async function processJob(job: any): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Update job status to processing
    await updateJobStatus(job.id, 'processing', {
      startedAt: new Date(),
      progress: 10
    });
    
    // Get the model configuration
    const selectedModelConfig = models.find(m => m.key === job.modelKey);
    if (!selectedModelConfig) {
      throw new Error(`Model ${job.modelKey} not properly initialized`);
    }
    
    // Get prompt from Google Sheets
    let prompt = await getPrompt(job.mode, job.modelKey);
    
    if (!prompt) {
      // Fallback to hardcoded prompts if Google Sheets fails
      console.warn(`No prompt found in Google Sheets for mode: ${job.mode}, model: ${job.modelKey}. Using fallback.`);
      const FALLBACK_PROMPTS = {
        'background-only': `Replace only the background with a clean, seamless light-gray curved studio wall and matte dark reflective floor. Do not change the car. `,
        'studio-enhance': `This is a {{make}} vehicle. Replace only the background with a clean, professional car studio: seamless curved light-gray wall with a soft lateral gradient, and a dark matte reflective floor. Use cool-toned white lighting from above only. The car must be evenly and brightly illuminated from the top, without any frontal or side lighting. Make the body panels and glass appear clean and naturally shiny and glossy under the studio lights. Do not alter any part of the vehicle. Preserve every original visual detail with zero modification: paint tone and color, grille, headlights, stickers, trim, the antenna, and damage, dents and scratches. Only rotate the vehicle to a 45° front-three-quarter angle if the current yaw deviates more than 20°.`
      };
      prompt = FALLBACK_PROMPTS[job.mode as keyof typeof FALLBACK_PROMPTS] || '';
    }
    
    // Substitute brand if Studio Enhance mode and {{make}} placeholder exists
    if (job.mode === 'studio-enhance' && job.brand && prompt.includes('{{make}}')) {
      prompt = prompt.replace(/\{\{make\}\}/g, job.brand.trim());
    }
    
    // Append additional instructions if provided
    if (job.additionalInstructions && job.additionalInstructions.trim()) {
      prompt += ' ' + job.additionalInstructions.trim();
    }
    
    // Update progress
    await updateJobStatus(job.id, 'processing', { progress: 25 });
    
    // Convert image files to data URIs
    const imageDataUris = job.imageFiles.map((file: any) => {
      return `data:${file.type};base64,${file.base64}`;
    });
    
    // Update progress
    await updateJobStatus(job.id, 'processing', { progress: 40 });
    
    console.log(`Photo-to-Studio generation request for job ${job.id} with mode: ${job.mode}, prompt: ${prompt}`);
    
    // Initialize the provider
    const provider = new ReplicateProvider();
    
    // Generate the image
    await updateJobStatus(job.id, 'processing', { progress: 50 });
    
    // Use the edit method instead of generate for photo-to-studio
    const result = await provider.edit({
      modelKey: job.modelKey,
      prompt,
      images: imageDataUris
    });
    
    await updateJobStatus(job.id, 'processing', { progress: 80 });
    
    // Handle the result
    if (result && result.images && result.images.length > 0) {
      const imageUrl = result.images[0].url;
      
      // Download and persist the image using the ReplicateProvider's method
      console.log(`Processing result image from Replicate: ${imageUrl}`);
      
      // The ReplicateProvider already handles downloading and persisting the image
      // We just need to get the persisted image info
      const image = result.images[0]; // This already contains fullUrl and thumbUrl
      
      await updateJobStatus(job.id, 'processing', { progress: 95 });
      
      // Complete the job
      await updateJobStatus(job.id, 'completed', {
        progress: 100,
        completedAt: new Date(),
        resultImageUrl: image.fullUrl,
        resultThumbUrl: image.thumbUrl
      });
      
      const duration = Date.now() - startTime;
      
      // Track successful generation
      await logActivity({
        userId: job.userId,
        event: 'photo_to_studio_generate',
        feature: 'photo_to_studio',
        model: job.modelKey,
        status: 'succeeded',
        duration,
        metadata: {
          mode: job.mode,
          prompt_length: prompt.length,
          image_count: job.imageFiles.length,
          job_id: job.id
        }
      });
      
      console.log(`✅ Job ${job.id} completed successfully in ${duration}ms`);
      
    } else {
      throw new Error('No output received from the model');
    }
    
  } catch (error: any) {
    console.error(`❌ Job ${job.id} failed:`, error);
    
    const duration = Date.now() - startTime;
    const errorMessage = error.message || 'Unknown error occurred';
    
    // Mark job as failed
    await updateJobStatus(job.id, 'failed', {
      completedAt: new Date(),
      errorMessage: errorMessage.substring(0, 500), // Truncate long error messages
      progress: 0
    });
    
    // Track failed generation
    await logActivity({
      userId: job.userId,
      event: 'photo_to_studio_generate',
      feature: 'photo_to_studio',
      model: job.modelKey,
      status: 'failed',
      duration,
      errorCode: 'processing_error',
      metadata: {
        mode: job.mode,
        error_message: errorMessage,
        job_id: job.id
      }
    });
  }
}