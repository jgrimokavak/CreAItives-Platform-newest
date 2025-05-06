import { createWriteStream } from 'fs';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import archiver from 'archiver';
import PQueue from 'p-queue';
import axios from 'axios';
import { models } from './config/models';
import { createPrediction, waitForPrediction } from './replicate';

// Store batch jobs with progress information
export type Row = Partial<Record<"make"|"model"|"body_style"|"trim"|"year"|"color"|"background"|"aspect_ratio", string>>;
export type BatchJob = {
  id: string;
  total: number;
  done: number;
  failed: number;
  zipPath?: string;
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
  const tmpDir = path.join("/tmp", `batch_${id}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const job = jobs.get(id)!;

  // Get Imagen-3 model config
  const imagenModel = models.find(m => m.key === 'imagen-3');
  if (!imagenModel || !imagenModel.version) {
    job.failed = job.total;
    job.errors.push({ row: 0, reason: "Imagen-3 model not properly configured" });
    return;
  }

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      // Build prompt from template
      const prompt = buildPrompt(r);
      console.log(`Processing row ${i+1}/${rows.length}: ${prompt.substring(0, 50)}...`);
      console.log(`Row data:`, JSON.stringify(r));
      
      // Set default aspect ratio if not specified
      const aspect_ratio = r.aspect_ratio || "1:1";
      
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
      console.error(`Failed to process row ${i+1}:`, e);
      job.failed++;
      job.errors.push({ 
        row: i+2, 
        reason: e.message?.slice(0, 200) || 'Unknown error',
        details: JSON.stringify(e)?.slice(0, 500)
      });
    }
  }

  // Create ZIP file with all generated images
  const zipPath = path.join("/tmp", `${id}.zip`);
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    
    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));
    
    archive.pipe(output);
    archive.directory(tmpDir, false);
    
    if (job.errors.length) {
      archive.append(JSON.stringify(job.errors, null, 2), { name: "failed_rows.json" });
    }
    
    archive.finalize();
  });

  job.zipPath = zipPath;
  
  // Clean up temp directory
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log(`Batch job ${id} completed: ${job.done} successful, ${job.failed} failed`);
}

// Cleanup function for old ZIP files (called periodically)
export function cleanupOldZips(maxAgeHours = 6) {
  try {
    fs.readdirSync("/tmp")
      .filter(f => f.endsWith(".zip"))
      .forEach(f => {
        const p = path.join("/tmp", f);
        if (Date.now() - fs.statSync(p).mtimeMs > maxAgeHours * 3600 * 1000) {
          fs.unlinkSync(p);
          console.log(`Cleaned up old ZIP file: ${f}`);
        }
      });
  } catch (error) {
    console.error("Error cleaning up old ZIP files:", error);
  }
}