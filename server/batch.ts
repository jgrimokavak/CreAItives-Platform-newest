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
export type BatchJob = {
  id: string;
  total: number;
  done: number;
  failed: number;
  zipPath?: string;
  zipUrl?: string;
  errors: {row: number; reason: string; details?: string}[];
};

export const jobs = new Map<string, BatchJob>();
export const queue = new PQueue({ concurrency: 3, timeout: 300_000, throwOnTimeout: true });

// Prompt templates
const PROMPTS = {
  white: `A hyper-realistic photo of a modern {{year}} {{make}} {{model}} {{body_style}} {{trim}} with metallic {{color}} paint, parked indoors in a photography studio under cool artificial lighting. The front of the car is positioned at a 35-degree angle from the camera, facing slightly to the left, clearly showing both front headlights and the right side of the vehicle. The headlights are turned on. The side windows are fully tinted with black film. The car is placed on a seamless pure white backdrop that extends from the floor to the wall, creating a smooth and continuous surface with no visible edges, textures, or marks. The lighting is soft and even, casting subtle shadows that emphasize the vehicle's contours and details. The image has professional quality but is low resolution, as if it had been compressed—similar to an official dealership promotional photo. ultra-realistic lighting, 8k, no license plate, blank license plate.`,
  hub: `A hyper-realistic photo of a modern {{year}} {{make}} {{model}} {{body_style}} {{trim}} with metallic {{color}} paint, parked indoors in a photography studio under cool artificial lighting. The front of the car is positioned at a 35-degree angle from the camera, facing slightly to the left, clearly showing both front headlights and the right side of the vehicle. The headlights are turned on. The side windows are fully tinted with black film. The floor is matte dark gray, smooth and clean, with no visible marks, and has a circular shape. The background wall is completely white and uniform, with no decorative elements or visible textures, providing a clean and neutral backdrop that highlights the car. The lighting is soft and even, casting subtle shadows on the floor that emphasize the vehicle's contours and details. The image has professional quality similar to an official dealership promotional photo, no license plate, blank license plate.`
};

// Helper to create filename from row data
export function makeFilename(r: Row, idx: number): string {
  const parts = ["make", "model", "year", "body_style", "trim", "background"]
    .map(k => ((r as any)[k] || "").replace(/\s+/g, "_"))
    .filter(Boolean);
  return (parts.join("-") || `car-${idx}`) + ".png";
}

// Helper to build prompt from template
export function buildPrompt(r: Row): string {
  const tpl = (r.background === "hub") ? PROMPTS.hub : PROMPTS.white;
  return tpl.replace(/{{(\w+)}}/g, (_, key) => (r as any)[key] || "").replace(/\s+/g, " ").trim();
}

// Main batch processing function
export async function processBatch(id: string, rows: Row[]) {
  console.log(`Starting batch job ${id} with ${rows.length} rows`);
  
  const tmpDir = path.join("/tmp", `batch_${id}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  console.log(`Created temp directory: ${tmpDir}`);
  
  const job = jobs.get(id)!;

  // Get Imagen-3 model config
  const imagenModel = models.find(m => m.key === 'imagen-3');
  if (!imagenModel || !imagenModel.version) {
    console.error(`Imagen-3 model not properly configured. Model config:`, imagenModel);
    job.failed = job.total;
    job.errors.push({ row: 0, reason: "Imagen-3 model not properly configured" });
    return;
  }
  
  console.log(`Using Imagen-3 model version: ${imagenModel.version}`);
  console.log(`Starting to process ${rows.length} rows for batch job ${id}`);

  for (let i = 0; i < rows.length; i++) {
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
      
      // Validate aspect ratio - expanded list to include more common ratios
      const validAspectRatios = ["1:1", "9:16", "16:9", "3:4", "4:3", "4:5", "5:4", "2:1", "1:2", "2:3", "3:2"];
      
      // Check for common variations that should be normalized
      if (aspect_ratio === "4:3" || aspect_ratio === "4/3" || aspect_ratio === "4-3") {
        aspect_ratio = "4:3";
      } else if (aspect_ratio === "3:4" || aspect_ratio === "3/4" || aspect_ratio === "3-4") {
        aspect_ratio = "3:4";
      } else if (aspect_ratio === "16:9" || aspect_ratio === "16/9" || aspect_ratio === "16-9") {
        aspect_ratio = "16:9";
      } else if (aspect_ratio === "9:16" || aspect_ratio === "9/16" || aspect_ratio === "9-16") {
        aspect_ratio = "9:16";
      } else if (aspect_ratio === "4:5" || aspect_ratio === "4/5" || aspect_ratio === "4-5") {
        aspect_ratio = "4:5";
      } else if (aspect_ratio === "5:4" || aspect_ratio === "5/4" || aspect_ratio === "5-4") {
        aspect_ratio = "5:4";
      } else if (aspect_ratio === "1:1" || aspect_ratio === "1/1" || aspect_ratio === "1-1" || aspect_ratio === "square") {
        aspect_ratio = "1:1";
      } else if (!validAspectRatios.includes(aspect_ratio)) {
        console.warn(`Invalid aspect_ratio "${aspect_ratio}" for row ${i+1}, defaulting to "1:1"`);
        aspect_ratio = "1:1";
      }
      
      console.log(`Using normalized aspect_ratio: ${aspect_ratio} for row ${i+1}`);
      
      // Create prediction with Replicate
      console.log(`Creating prediction with model version: ${imagenModel.version}`);
      
      try {
        const prediction = await createPrediction(imagenModel.version, {
          prompt, 
          aspect_ratio, 
          negative_prompt: "", 
          safety_filter_level: "block_only_high"
        });
        
        console.log(`Prediction created with ID: ${prediction.id}, waiting for result...`);
        
        // Wait for prediction to complete
        const result = await waitForPrediction(prediction.id);
        console.log(`Prediction result status: ${result.status}`);
        
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

  // Create ZIP file with all generated images
  console.log(`Creating ZIP file for job ${id} with ${job.done} successful images and ${job.failed} failed items`);
  
  // Create paths for both temp and downloads directory
  const tmpZipPath = path.join("/tmp", `${id}.zip`);
  const downloadDir = path.join(process.cwd(), "downloads");
  const downloadZipPath = path.join(downloadDir, `${id}.zip`);
  
  // Make sure downloads directory exists
  if (!fs.existsSync(downloadDir)) {
    console.log(`Creating downloads directory: ${downloadDir}`);
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  
  try {
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
      
      // Add all files from the temp directory
      console.log(`Adding files from ${tmpDir} to the ZIP archive`);
      archive.directory(tmpDir, false);
      
      // Add the errors file if there are any errors
      if (job.errors.length) {
        console.log(`Adding failed_rows.json with ${job.errors.length} error entries`);
        archive.append(JSON.stringify(job.errors, null, 2), { name: "failed_rows.json" });
      }
      
      console.log(`Finalizing ZIP archive...`);
      archive.finalize();
    });
    
    // Copy the ZIP file to the downloads directory
    console.log(`Copying ZIP file from ${tmpZipPath} to ${downloadZipPath}`);
    fs.copyFileSync(tmpZipPath, downloadZipPath);
    
    // Update the job with the ZIP path and URL
    job.zipPath = downloadZipPath;
    // Set the publicly accessible URL for the ZIP file
    const filename = path.basename(downloadZipPath);
    job.zipUrl = `/downloads/${filename}`;
    console.log(`Job ${id} updated with zipPath: ${downloadZipPath} and zipUrl: ${job.zipUrl}`);
    
  } catch (zipError) {
    console.error(`Failed to create ZIP file for job ${id}:`, zipError);
    job.errors.push({ 
      row: 0, 
      reason: `Failed to create ZIP file: ${zipError instanceof Error ? zipError.message : String(zipError)}`,
      details: JSON.stringify(zipError)?.slice(0, 500) 
    });
  }
  
  // Clean up temp directory
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log(`Cleaned up temp directory: ${tmpDir}`);
  } catch (cleanupError) {
    console.error(`Error cleaning up temp directory ${tmpDir}:`, cleanupError);
  }
  
  console.log(`Batch job ${id} completed: ${job.done} successful, ${job.failed} failed`);
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