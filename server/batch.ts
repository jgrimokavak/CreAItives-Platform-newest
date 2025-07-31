import { createWriteStream } from 'fs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import PQueue from 'p-queue';
import axios from 'axios';
import { models } from './config/models';
import { createPrediction, waitForPrediction } from './replicate';

// Early check for required environment variables
if (!process.env.REPLICATE_API_TOKEN) {
  console.error("Missing REPLICATE_API_TOKEN - batch processing will fail!");
}

// Store batch jobs with progress information
export type Row = Partial<Record<"make"|"model"|"body_style"|"trim"|"year"|"color"|"background"|"aspect_ratio", string>>;
export type JobStatus = "pending" | "processing" | "completed" | "stopped" | "failed";

export type BatchJob = {
  id: string;
  total: number;
  done: number;
  failed: number;
  zipPath?: string;
  zipUrl?: string;
  status: JobStatus;
  errors: {row: number; reason: string; details?: string}[];
  createdAt: Date;
  completedAt?: Date;
};

export const jobs = new Map<string, BatchJob>();
export const queue = new PQueue({ concurrency: 3, timeout: 300_000, throwOnTimeout: true });

// Prompt templates
const PROMPTS = {
  white: `Isolated render of a {{year}} {{make}} {{model}} {{body_style}} {{trim}} {{color}}, flat-field white (#FFFFFF) environment, reflections off, baked contact shadow 6 %, camera 35° front-left, vehicle nose points left. Post-process: auto-threshold background to #FFFFFF (tolerance 1 RGB), remove artefacts, keep 6 % shadow, run edge cleanup. Export high-resolution 8 k file without drawing any text, watermarks or badges; restrict "KAVAK" to licence plate only.`,
  hub: `A hyper-realistic professional studio photograph of a {{year}} {{make}} {{model}} {{body_style}} {{trim}} in {{color}} paint with subtle micro-reflections. The vehicle is positioned at a precise 35-degree angle showing the front grille, headlights with signature lighting illuminated, and right side profile. Premium tinted windows reflect ambient studio lighting. The car sits on low-profile performance tires with detailed alloy wheels showing brake components behind the spokes. Shot on a polished circular dark charcoal gray studio floor that subtly reflects the vehicle's undercarriage and creates natural graduated shadows. Clean matte white seamless backdrop curves smoothly from floor to wall. Professional three-point lighting setup with key light, fill light, and rim lighting creates dimensional depth while preserving paint reflections and surface textures. Black front license plate features the 'kavak' logo in white. Camera positioned at chest height with slight downward angle. Sharp focus throughout with shallow depth of field on background edges. Commercial automotive photography quality with color-accurate rendering and professional retouching standards.`
};

// Helper to create filename from row data
export function makeFilename(r: Row, idx: number): string {
  // Get all available parts
  const make = ((r.make || "").trim()).replace(/\s+/g, "_");
  const model = ((r.model || "").trim()).replace(/\s+/g, "_");
  const year = ((r.year || "").trim()).replace(/\s+/g, "_");
  const bodyStyle = ((r.body_style || "").trim()).replace(/\s+/g, "_");
  const trim = ((r.trim || "").trim()).replace(/\s+/g, "_");
  const color = ((r.color || "").trim()).replace(/\s+/g, "_");
  const background = ((r.background || "").trim()).replace(/\s+/g, "_");
  
  // Format: Year_Make_Model_BodyStyle_Color_Background.png
  // Only include parts that are available
  let parts = [];
  
  if (year) parts.push(year);
  if (make) parts.push(make);
  if (model) parts.push(model);
  if (bodyStyle) parts.push(bodyStyle);
  if (trim) parts.push(trim);
  if (color) parts.push(color);
  if (background) parts.push(background);
  
  // If no parts are available, use a fallback name with index
  const filename = parts.length > 0 ? parts.join("-") : `car-${idx}`;
  
  // Add a numerical suffix to avoid filename conflicts
  return `${filename}-${idx+1}.png`;
}

// Helper to build prompt from template
export function buildPrompt(r: Row): string {
  const tpl = (r.background === "hub") ? PROMPTS.hub : PROMPTS.white;
  return tpl.replace(/{{(\w+)}}/g, (_, key) => (r as any)[key] || "").replace(/\s+/g, " ").trim();
}

// Helper function to create the ZIP file
export async function createZipForBatchJob(id: string, job: BatchJob, tmpDir: string): Promise<{success: boolean, zipUrl?: string}> {
  console.log(`Creating ZIP file for job ${id} with ${job.done} successful images and ${job.failed} failed items`);
  
  // Don't create ZIP if no images were generated
  if (job.done === 0 && !fs.existsSync(tmpDir)) {
    console.error(`No images were generated for job ${id}, cannot create ZIP`);
    return { success: false };
  }
  
  // Create a more descriptive filename based on job details
  const timestamp = new Date().toISOString().replace(/[:T.-]/g, "").slice(0, 14); // YYYYMMDDHHMMSS
  const completionStatus = job.status === "stopped" ? "partial" : 
                          job.status === "failed" ? "partial_with_errors" : "complete";
  const countInfo = `${job.done}of${job.total}`;
  
  // Create a descriptive filename: car_batch_YYYYMMDDHHMMSS_status_count.zip
  const zipFilename = `car_batch_${timestamp}_${completionStatus}_${countInfo}.zip`;
  
  // Create paths for both temp and downloads directory
  const tmpZipPath = path.join("/tmp", zipFilename);
  const downloadDir = path.join(process.cwd(), "downloads");
  const downloadZipPath = path.join(downloadDir, zipFilename);
  
  // Store the original ID for reference and debugging
  console.log(`Creating ZIP file ${zipFilename} for job ID: ${id}`);
  
  // Make sure downloads directory exists
  if (!fs.existsSync(downloadDir)) {
    console.log(`Creating downloads directory: ${downloadDir}`);
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  
  try {
    console.log(`Preparing to create ZIP for job ${id}`);
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(tmpZipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });
      
      output.on("close", () => {
        console.log(`ZIP file created: ${tmpZipPath}, size: ${archive.pointer()} bytes`);
        resolve();
      });
      
      archive.on("error", (err) => {
        console.error(`Error creating ZIP file:`, err);
        reject(err);
      });
      
      archive.on("warning", (err) => {
        if (err.code === "ENOENT") {
          console.warn(`ZIP warning:`, err);
        } else {
          console.error(`ZIP warning:`, err);
          reject(err);
        }
      });
      
      archive.pipe(output);
      
      // Add all files from the temp directory if it exists
      if (fs.existsSync(tmpDir)) {
        console.log(`Adding files from ${tmpDir} to the ZIP archive`);
        archive.directory(tmpDir, false);
      } else {
        console.warn(`Temp directory ${tmpDir} does not exist, creating empty ZIP`);
      }
      
      // Add the errors file if there are any errors
      if (job.errors.length) {
        console.log(`Adding failed_rows.json with ${job.errors.length} error entries`);
        archive.append(JSON.stringify(job.errors, null, 2), { name: "failed_rows.json" });
      }
      
      // Add a summary.json file with job details
      const summary = {
        jobId: id,
        total: job.total,
        completed: job.done,
        failed: job.failed,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt || new Date(),
        errors: job.errors.length
      };
      archive.append(JSON.stringify(summary, null, 2), { name: "summary.json" });
      
      console.log(`Finalizing ZIP archive...`);
      archive.finalize();
    });
    
    // Copy the ZIP file to the downloads directory
    console.log(`Copying ZIP file from ${tmpZipPath} to ${downloadZipPath}`);
    fs.copyFileSync(tmpZipPath, downloadZipPath);
    
    // Get the public URL
    const filename = path.basename(downloadZipPath);
    const zipUrl = `/downloads/${filename}`;
    
    // Update the job with the ZIP path and URL
    job.zipPath = downloadZipPath;
    job.zipUrl = zipUrl;
    
    console.log(`Job ${id} updated with zipPath: ${downloadZipPath} and zipUrl: ${job.zipUrl}`);
    return { success: true, zipUrl };
    
  } catch (zipError) {
    console.error(`Failed to create ZIP file for job ${id}:`, zipError);
    job.errors.push({ 
      row: 0, 
      reason: `Failed to create ZIP file: ${zipError instanceof Error ? zipError.message : String(zipError)}`,
      details: JSON.stringify(zipError)?.slice(0, 500) 
    });
    return { success: false };
  }
}

// Main batch processing function
export async function processBatch(id: string, rows: Row[]) {
  console.log(`Starting batch job ${id} with ${rows.length} rows`);
  
  const tmpDir = path.join("/tmp", `batch_${id}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  console.log(`Created temp directory: ${tmpDir}`);
  
  const job = jobs.get(id)!;
  
  // Update job status
  job.status = "processing";

  // Get Imagen-4 model config
  const imagenModel = models.find(m => m.key === 'imagen-4');
  if (!imagenModel) {
    console.error(`Imagen-4 model not properly configured. Model config:`, imagenModel);
    job.failed = job.total;
    job.errors.push({ row: 0, reason: "Imagen-4 model not properly configured" });
    job.status = "failed";
    job.completedAt = new Date();
    
    // Try to create a ZIP file even for failed jobs
    await createZipForBatchJob(id, job, tmpDir);
    return;
  }
  
  console.log(`Using Imagen-4 model`);
  console.log(`Starting to process ${rows.length} rows for batch job ${id}`);

  for (let i = 0; i < rows.length; i++) {
    // Check if job was stopped - if so, create the ZIP with the images we have so far
    if (job.status === "stopped") {
      console.log(`Job ${id} was stopped after processing ${i} of ${rows.length} rows. Creating ZIP with partial results.`);
      break;
    }
    
    const r = rows[i];
    console.log(`Batch ${id}: Processing row ${i+1}/${rows.length}`);
    
    try {
      // Build prompt from template
      const prompt = buildPrompt(r);
      console.log(`Batch ${id}: Row ${i+1}/${rows.length} prompt: ${prompt.substring(0, 50)}...`);
      console.log(`Row data:`, JSON.stringify(r));
      
      // Set default aspect ratio if not specified and validate it
      // Log the raw value for debugging
      console.log(`Row ${i+1} raw aspect_ratio value:`, r.aspect_ratio, typeof r.aspect_ratio);
      
      // Clean up the aspect_ratio value to handle spaces or case differences
      let aspect_ratio = (r.aspect_ratio || "1:1").toString().trim().toLowerCase();
      
      // Validate aspect ratio - must be one of: "1:1", "9:16", "16:9", "3:4", "4:3"
      const validAspectRatios = ["1:1", "9:16", "16:9", "3:4", "4:3"];
      
      // Check for common variations that should be normalized
      if (aspect_ratio === "4:3" || aspect_ratio === "4/3" || aspect_ratio === "4-3") {
        aspect_ratio = "4:3";
      } else if (aspect_ratio === "3:4" || aspect_ratio === "3/4" || aspect_ratio === "3-4") {
        aspect_ratio = "3:4";
      } else if (aspect_ratio === "16:9" || aspect_ratio === "16/9" || aspect_ratio === "16-9") {
        aspect_ratio = "16:9";
      } else if (aspect_ratio === "9:16" || aspect_ratio === "9/16" || aspect_ratio === "9-16") {
        aspect_ratio = "9:16";
      } else if (aspect_ratio === "1:1" || aspect_ratio === "1/1" || aspect_ratio === "1-1" || aspect_ratio === "square") {
        aspect_ratio = "1:1";
      } else if (!validAspectRatios.includes(aspect_ratio)) {
        console.warn(`Invalid aspect_ratio "${aspect_ratio}" for row ${i+1}, defaulting to "1:1"`);
        aspect_ratio = "1:1";
      }
      
      console.log(`Using normalized aspect_ratio: ${aspect_ratio} for row ${i+1}`);
      
      // Create prediction with Replicate using Imagen-4
      console.log(`Creating prediction with model: google/imagen-4`);
      
      try {
        const predInput = {
          prompt, 
          aspect_ratio, 
          safety_filter_level: "block_medium_and_above"
        };
        
        // Log what's being sent to Replicate
        console.log(`BATCH PREDICTION INPUT for row ${i+1}:`, JSON.stringify(predInput, null, 2));
        
        const prediction = await createPrediction("google/imagen-4", predInput);
        
        console.log(`Prediction created with ID: ${prediction.id}, waiting for result...`);
        
        // Wait for prediction to complete
        const result = await waitForPrediction(prediction.id);
        console.log(`Prediction result status: ${result.status}`);
        
        // Check if job was stopped during prediction
        if (job.status === "stopped") {
          console.log(`Job ${id} was stopped while waiting for prediction ${prediction.id}. Skipping download.`);
          break;
        }
        
        if (result.status !== 'succeeded') {
          console.error(`Prediction failed with status: ${result.status}`);
          console.error(`Error details:`, result.error);
          throw new Error(`Prediction failed: ${result.error || 'Unknown error'}`);
        }
        
        if (!result.output) {
          console.error(`No output in prediction result:`, result);
          throw new Error('Prediction result has no output');
        }
        
        // Download the generated image
        const outputUrl = result.output as string;
        console.log(`Downloading image from: ${outputUrl}`);
        const imgResponse = await axios.get(outputUrl, { responseType: "arraybuffer" });
        const imgBuf = imgResponse.data;
        
        // Save image to temp directory
        const filename = makeFilename(r, i);
        fs.writeFileSync(path.join(tmpDir, filename), Buffer.from(imgBuf));
        console.log(`Saved image as: ${filename}`);
        job.done++;
      } catch (predictionError: any) {
        console.error(`Prediction error for row ${i+1}:`, predictionError);
        throw predictionError;
      }
    } catch (e: any) {
      console.error(`Batch ${id}: Row ${i+1} error:`, e);
      job.failed++;
      job.errors.push({ 
        row: i+2, 
        reason: e.message?.slice(0, 200) || 'Unknown error',
        details: JSON.stringify(e)?.slice(0, 500)
      });
    }
  }

  // Set job to completed if not stopped or already failed
  if (job.status === "processing") {
    job.status = "completed";
  }
  
  // Record completion time
  job.completedAt = new Date();
  
  // Create the ZIP file with the generated images
  const zipResult = await createZipForBatchJob(id, job, tmpDir);
  if (!zipResult.success) {
    console.error(`Failed to create ZIP file for job ${id}`);
    // If the job wasn't already marked as failed, mark it now
    if (job.status !== "failed") {
      job.status = "failed";
    }
  }
  
  // Clean up temp directory
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log(`Cleaned up temp directory: ${tmpDir}`);
  } catch (cleanupError) {
    console.error(`Error cleaning up temp directory ${tmpDir}:`, cleanupError);
  }
  
  console.log(`Batch job ${id} completed with status ${job.status}: ${job.done} successful, ${job.failed} failed`);
}

// Cleanup function for old ZIP files (called periodically)
export function cleanupOldZips(maxAgeHours = 6) {
  console.log(`Running ZIP cleanup for files older than ${maxAgeHours} hours`);
  
  // Clean up in /tmp directory
  try {
    const tmpFiles = fs.readdirSync("/tmp").filter(f => f.endsWith(".zip"));
    console.log(`Found ${tmpFiles.length} ZIP files in /tmp directory`);
    
    let tmpCleaned = 0;
    
    tmpFiles.forEach(f => {
      const p = path.join("/tmp", f);
      
      try {
        const stats = fs.statSync(p);
        const ageMs = Date.now() - stats.mtimeMs;
        const ageHours = ageMs / (3600 * 1000);
        
        if (ageHours > maxAgeHours) {
          console.log(`Deleting old ZIP file from /tmp: ${f} (age: ${ageHours.toFixed(2)} hours)`);
          fs.unlinkSync(p);
          tmpCleaned++;
        } else {
          console.log(`Keeping ZIP file in /tmp: ${f} (age: ${ageHours.toFixed(2)} hours)`);
        }
      } catch (statError) {
        console.error(`Error checking file stats for ${p}:`, statError);
      }
    });
    
    console.log(`/tmp ZIP cleanup completed. Deleted ${tmpCleaned} old files.`);
  } catch (error) {
    console.error("Error cleaning up old ZIP files in /tmp:", error);
  }
  
  // Clean up in downloads directory
  try {
    const downloadsDir = path.join(process.cwd(), "downloads");
    if (fs.existsSync(downloadsDir)) {
      const downloadFiles = fs.readdirSync(downloadsDir).filter(f => f.endsWith(".zip"));
      console.log(`Found ${downloadFiles.length} ZIP files in downloads directory`);
      
      let downloadsCleaned = 0;
      
      downloadFiles.forEach(f => {
        const p = path.join(downloadsDir, f);
        
        try {
          const stats = fs.statSync(p);
          const ageMs = Date.now() - stats.mtimeMs;
          const ageHours = ageMs / (3600 * 1000);
          
          if (ageHours > maxAgeHours) {
            console.log(`Deleting old ZIP file from downloads: ${f} (age: ${ageHours.toFixed(2)} hours)`);
            fs.unlinkSync(p);
            downloadsCleaned++;
          } else {
            console.log(`Keeping ZIP file in downloads: ${f} (age: ${ageHours.toFixed(2)} hours)`);
          }
        } catch (statError) {
          console.error(`Error checking file stats for ${p}:`, statError);
        }
      });
      
      console.log(`Downloads ZIP cleanup completed. Deleted ${downloadsCleaned} old files.`);
    }
  } catch (error) {
    console.error("Error cleaning up old ZIP files in downloads:", error);
  }
}