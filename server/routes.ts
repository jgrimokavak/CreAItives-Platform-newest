import express, { type Express, type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openai } from "./openai";
import { toFile } from "openai";
import { z } from "zod";
import { generateImageSchema, editImageSchema } from "@shared/schema";
import { openaiSchema } from "./config/models";
import path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
import sharp from "sharp";
import { log, getLogs } from "./logger";
import multer from "multer";
import crypto from "crypto";
import { GeneratedImage } from "@shared/schema";
import galleryRoutes from "./gallery-routes";
import { attachWS, setPush } from "./ws";
import { setupCleanupJob } from "./cleanup";
import { persistImage } from "./fs-storage";
import { models } from "./config/models";
import modelRoutes, { initializeModels } from "./routes/model-routes";
import upscaleRoutes from "./routes/upscale-routes";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up multer for file uploads
const upload = multer({
  limits: { fileSize: 26 * 1024 * 1024 }, // 26MB limit (25MB + buffer)
  storage: multer.memoryStorage() // Store files in memory
});

// Job queue interface
interface Job {
  id: string;
  status: "pending" | "processing" | "done" | "error";
  result?: GeneratedImage[];
  error?: string;
  createdAt: Date;
}

// In-memory job store
const jobs = new Map<string, Job>();

// Cleanup old jobs periodically (jobs older than 30 minutes)
setInterval(() => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  // Use Array.from to convert the Map entries to an array for compatibility
  Array.from(jobs.entries()).forEach(([id, job]) => {
    if ((job.status === "done" || job.status === "error") && job.createdAt < thirtyMinutesAgo) {
      jobs.delete(id);
      console.log(`Cleaned up job ${id}`);
    }
  });
}, 5 * 60 * 1000); // Run every 5 minutes

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Replicate model schemas and versions
  try {
    await initializeModels();
    console.log("Initialized Replicate models");
  } catch (error) {
    console.error("Failed to initialize Replicate models:", error);
  }
  // Helper function to run image generation job
  async function runGenerateJob(jobId: string, data: any) {
    console.log(`Starting job ${jobId} for image generation`);
    const job = jobs.get(jobId);
    if (!job) return;
    
    try {
      job.status = "processing";
      
      const { prompt, modelKey, size, quality, n, style, background, output_format, aspect_ratio, seed } = data;
      
      console.log(`Job ${jobId}: Processing image generation with model: ${modelKey}`);
      
      // Import the generateWithReplicate function dynamically to avoid circular imports
      const { generateWithReplicate } = await import('./routes/replicate-routes');
      
      // Determine provider based on model key
      const modelInfo = models.find(m => m.key === modelKey);
      if (!modelInfo) {
        throw new Error(`Unknown model: ${modelKey}`);
      }
      
      let generatedImages: GeneratedImage[] = [];
      
      // Handle OpenAI models
      if (modelInfo.provider === 'openai') {
        // Call OpenAI to generate images based on the model
        // For DALL-E 3, only one image can be generated at a time
        const numImages = modelKey === 'dall-e-3' ? 1 : (n || 1);
        
        // Create the base request object
        const requestParams: any = {
          model: modelKey,
          prompt: prompt,
          n: numImages,
          size: size || '1024x1024',
        };
        
        // DALL-E models support response_format but GPT-Image-1 doesn't
        if (modelKey !== "gpt-image-1") {
          requestParams.response_format = "b64_json";
        }
        
        // Add model-specific parameters
        if (modelKey === 'dall-e-3') {
          // DALL-E 3 specific parameters
          requestParams.quality = quality === 'hd' || quality === 'standard' ? quality : 'standard';
          if (style) requestParams.style = style;
          if (output_format) requestParams.response_format = output_format;
        } else if (modelKey === 'gpt-image-1') {
          // GPT-Image-1 specific parameters
          if (quality === 'high' || quality === 'medium' || quality === 'low' || quality === 'auto') {
            requestParams.quality = quality || 'high';
          } else {
            requestParams.quality = 'high'; // Default to high quality
          }
          if (background) requestParams.background = background;
          // GPT-Image-1 doesn't support response_format
        } else {
          // DALL-E 2 specific parameters - No quality parameter, it's not supported
          if (output_format) requestParams.response_format = output_format;
        }
        
        console.log(`Job ${jobId}: Sending OpenAI image generation request with params:`, JSON.stringify(requestParams));
        const response = await openai.images.generate(requestParams);
        console.log(`Job ${jobId}: OpenAI API response:`, JSON.stringify(response, null, 2));
        
        // Check if response has data
        if (!response.data || response.data.length === 0) {
          throw new Error("No images were generated");
        }
        
        // Process and store the response
        generatedImages = response.data.map((image, index) => {
          // Log image data for debugging
          console.log(`Job ${jobId}: Image ${index} response data:`, 
            JSON.stringify({
              url: image.url ? "url exists" : "no url",
              revised_prompt: image.revised_prompt ? "revised_prompt exists" : "no revised_prompt",
              b64_json: image.b64_json ? "b64_json exists" : "no b64_json"
            })
          );
          
          // Check if we have a valid URL or base64 image data
          let imageUrl = "";
          let fullUrl = "";
          let thumbUrl = "";
          
          if (image.url) {
            imageUrl = image.url;
            fullUrl = image.url;
            thumbUrl = image.url;
            console.log(`Job ${jobId}: Using direct URL from OpenAI:`, imageUrl.substring(0, 50) + "...");
          } else if (image.b64_json) {
            imageUrl = `data:image/png;base64,${image.b64_json}`;
            fullUrl = imageUrl;
            thumbUrl = imageUrl; 
            console.log(`Job ${jobId}: Using base64 image data from OpenAI`);
          } else {
            console.warn(`Job ${jobId}: No image URL or base64 data found in OpenAI response`);
          }

          const newImage: GeneratedImage = {
            id: `img_${Date.now()}_${index}`,
            url: imageUrl,
            fullUrl: fullUrl,
            thumbUrl: thumbUrl,
            prompt: prompt,
            size: size || '1024x1024',
            model: modelKey,
            createdAt: new Date().toISOString(),
          };
          
          // Store the image in our storage
          storage.saveImage(newImage);
          
          return newImage;
        });
      }
      // Handle Replicate models
      else if (modelInfo.provider === 'replicate') {
        const inputs = {
          prompt,
          aspect_ratio,
          seed
        };
        
        console.log(`Job ${jobId}: Sending Replicate generation request with model ${modelKey} and inputs:`, JSON.stringify(inputs));
        
        // Call the Replicate generation function
        generatedImages = await generateWithReplicate(modelKey, inputs);
        console.log(`Job ${jobId}: Generated ${generatedImages.length} images with Replicate`);
      }
      
      // Update job with results
      job.status = "done";
      job.result = generatedImages;
      
    } catch (error: any) {
      console.error(`Job ${jobId} error:`, error);
      job.status = "error";
      job.error = error.message || "Failed to generate images";
    }
  }

  // API endpoint to generate images (async with job queue)
  app.post("/api/generate", async (req, res) => {
    try {
      // Validate request body
      const validationResult = generateImageSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Create a new job
      const jobId = crypto.randomUUID();
      jobs.set(jobId, { 
        id: jobId, 
        status: "pending",
        createdAt: new Date() 
      });
      
      console.log(`Created job ${jobId} for image generation`);
      
      // Start the job processing in the background
      process.nextTick(() => runGenerateJob(jobId, validationResult.data));
      
      // Return the job ID immediately
      res.status(202).json({ jobId });
      
    } catch (error: any) {
      console.error("Error scheduling generation job:", error);
      res.status(500).json({ 
        message: error.message || "Failed to schedule generation job" 
      });
    }
  });
  
  // API endpoint to get all images
  app.get("/api/images", async (req, res) => {
    try {
      const images = await storage.getAllImages();
      res.json({ images });
    } catch (error: any) {
      console.error("Error fetching images:", error);
      res.status(500).json({ 
        message: error.message || "Failed to fetch images" 
      });
    }
  });

  // Helper function to process the edit job
  async function runEditJob(jobId: string, req: Request) {
    const job = jobs.get(jobId);
    if (!job) return; // Job was deleted or doesn't exist
    
    job.status = "processing";
    console.log(`Processing job ${jobId}: status=${job.status}`);
    
    try {
      // Access form data fields
      const prompt = req.body.prompt;
      const size = req.body.size || "1024x1024";
      const quality = req.body.quality || "high";
      const n = parseInt(req.body.n || "1");
      
      // Get uploaded files
      const imgFiles = (req.files as any)?.image as Express.Multer.File[] || [];
      const maskFile = (req.files as any)?.mask?.[0] as Express.Multer.File | undefined;
      
      // Check if files were uploaded
      if (imgFiles.length === 0) {
        job.status = "error";
        job.error = "At least one image file is required";
        return;
      }
      
      // Ensure we don't exceed 16 images
      if (imgFiles.length > 16) {
        job.status = "error";
        job.error = "Maximum of 16 images allowed";
        return;
      }
      
      // Track if user provided a mask
      const userProvidedMask = !!maskFile;
      
      // Create temp directory for image processing
      const tmpDir = path.join(__dirname, "../temp");
      fs.mkdirSync(tmpDir, { recursive: true });
      
      try {
        // Process uploaded files
        const imgPaths: string[] = [];
        
        // Save uploaded images to temp directory
        for (let i = 0; i < imgFiles.length; i++) {
          const file = imgFiles[i];
          const filePath = path.join(tmpDir, `img_${Date.now()}_${i}${path.extname(file.originalname)}`);
          fs.writeFileSync(filePath, file.buffer);
          imgPaths.push(filePath);
        }
        
        // Create a 128px thumbnail and save the full source image
        let sourceThumb: string | undefined;
        let sourceImage: string | undefined;
        try {
          if (imgPaths.length > 0) {
            // Create thumbnail for display in card
            const thumbBuf = await sharp(imgPaths[0])
              .resize(128)
              .png()
              .toBuffer();
            sourceThumb = `data:image/png;base64,${thumbBuf.toString("base64")}`;
            
            // Also save the full image as base64 for full-screen view
            const fullImageBuf = await fs.promises.readFile(imgPaths[0]);
            sourceImage = `data:image/png;base64,${fullImageBuf.toString("base64")}`;
            
            console.log("Created source thumbnail and image for edit:", {
              thumbSize: sourceThumb.length,
              fullSize: sourceImage.length,
              sourcePath: imgPaths[0]
            });
          }
        } catch (err) {
          console.warn("Failed to create source thumbnail or image:", err);
        }
        
        // Save mask file if provided
        let maskPath: string | undefined;
        if (userProvidedMask && maskFile) {
          maskPath = path.join(tmpDir, `mask_${Date.now()}${path.extname(maskFile.originalname)}`);
          fs.writeFileSync(maskPath, maskFile.buffer);
        }
        
        // Helper function to create uploadable files with correct MIME type
        const toUploadable = (p: string) => {
          const ext = path.extname(p).toLowerCase();
          const mime = ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : ext === ".webp"
              ? "image/webp"
              : "image/png";
          return toFile(fs.createReadStream(p), path.basename(p), { type: mime });
        };
        
        // Build uploadables with proper MIME types
        const uploadables = await Promise.all(imgPaths.map(toUploadable));
        
        // Log the request to our API logger
        log({
          ts: new Date().toISOString(),
          direction: "request",
          payload: {
            model: "gpt-image-1",
            images: imgPaths.map((p: string) => path.basename(p)),
            usingMask: userProvidedMask,
            prompt,
            n,
            size, 
            quality,
            uploadableInfo: uploadables.map((u: any) => ({
              type: u.type,
              name: u.name,
              size: u.size
            }))
          }
        });
        
        console.log("Sending image edit request with params:", {
          model: "gpt-image-1",
          images: `${imgFiles.length} images`,
          usingMask: userProvidedMask ? "yes" : "no",
          prompt,
          n,
          size,
          quality
        });
        
        // Build the edit params object
        const editParams: any = {
          model: "gpt-image-1",
          image: uploadables,
          prompt,
          n,
          // Convert size to a compatible format for the API
          size: size === "auto" ? "1024x1024" : size,
          quality: (quality || "high") as "auto" | "high" | "medium" | "low"
        };
        
        // Only include mask if user provided one
        if (userProvidedMask && maskPath) {
          const maskUpload = await toUploadable(maskPath);
          editParams.mask = maskUpload;
        }
        
        // OpenAI call
        // @ts-ignore - The OpenAI SDK types don't include all supported sizes
        const response = await openai.images.edit(editParams).catch(err => {
          // Log error to our API logger
          log({
            ts: new Date().toISOString(),
            direction: "error",
            payload: {
              message: err.message,
              code: err.code,
              param: err.param,
              type: err.type,
              status: err.status
            }
          });
          throw err;
        });
        
        // Log the response to our API logger
        log({
          ts: new Date().toISOString(),
          direction: "response",
          payload: {
            status: response ? "ok" : "unknown",
            created: response.created,
            dataCount: response.data?.length || 0,
            dataInfo: response.data?.map(d => ({
              b64_json: d.b64_json ? `${d.b64_json.substring(0, 20)}... (${d.b64_json.length} bytes)` : null,
              url: d.url ? `${d.url.substring(0, 30)}...` : null
            })) || []
          }
        });
        
        console.log("OpenAI image edit API response:", JSON.stringify({
          created: response.created,
          data: response.data?.map((d: any) => ({
            b64_json: d.b64_json ? "data exists" : "no data",
            url: d.url ? "url exists" : "no url"
          })) || []
        }, null, 2));

        // Check if response has data
        if (!response.data || response.data.length === 0) {
          throw new Error("No edited images were generated");
        }
        
        // Process and store the response
        const generatedImages = response.data.map((image: any, index: number) => {
          // Use base64 data from response
          const imageUrl = `data:image/png;base64,${image.b64_json}`;
          
          const newImage = {
            id: `img_${Date.now()}_${index}`,
            url: imageUrl,
            prompt: prompt,
            size: size,
            model: "gpt-image-1",
            createdAt: new Date().toISOString(),
            sourceThumb: sourceThumb,
            sourceImage: sourceImage
          };
          
          // Store the image in our storage
          storage.saveImage(newImage);
          
          return newImage;
        });
        
        // Update job with results
        job.status = "done";
        job.result = generatedImages;
        console.log(`Job ${jobId} completed successfully with ${generatedImages.length} images`);
        
        // Cleanup temp files after a delay (10 minutes)
        setTimeout(() => {
          try {
            for (const p of imgPaths) {
              if (fs.existsSync(p)) {
                fs.unlinkSync(p);
              }
            }
            if (maskPath && fs.existsSync(maskPath)) {
              fs.unlinkSync(maskPath);
            }
            console.log(`Job ${jobId}: Cleaned up temporary files`);
          } catch (cleanupErr) {
            console.error(`Job ${jobId}: Error during file cleanup:`, cleanupErr);
          }
        }, 10 * 60 * 1000); // 10 minutes
        
      } catch (error) {
        // Make sure to clean up temp directory even if there's an error
        if (fs.existsSync(tmpDir)) {
          fs.readdirSync(tmpDir).forEach((file: string) => {
            fs.unlinkSync(path.join(tmpDir, file));
          });
        }
        throw error;
      }
    } catch (error: any) {
      console.error(`Job ${jobId} error:`, error);
      job.status = "error";
      job.error = error.message || "Failed to edit images";
    }
  }

  // API endpoint for async image editing (using job queue)
  app.post("/api/edit-image", 
    upload.fields([
      { name: 'image', maxCount: 16 },
      { name: 'mask', maxCount: 1 }
    ]),
    (req, res) => {
      try {
        // Basic validation
        const prompt = req.body.prompt;
        if (!prompt) {
          return res.status(400).json({ message: "Prompt is required" });
        }
        
        // Get uploaded files
        const imgFiles = (req.files as any)?.image as Express.Multer.File[] || [];
        
        // Check if files were uploaded
        if (imgFiles.length === 0) {
          return res.status(400).json({ message: "At least one image file is required" });
        }
        
        // Ensure we don't exceed 16 images
        if (imgFiles.length > 16) {
          return res.status(400).json({ message: "Maximum of 16 images allowed" });
        }
        
        // Create a new job
        const jobId = crypto.randomUUID();
        jobs.set(jobId, { 
          id: jobId, 
          status: "pending",
          createdAt: new Date() 
        });
        
        console.log(`Created job ${jobId} for edit request with ${imgFiles.length} images`);
        
        // Start the job processing in the background
        process.nextTick(() => runEditJob(jobId, req));
        
        // Return the job ID immediately
        res.status(202).json({ jobId });
        
      } catch (error: any) {
        console.error("Error scheduling edit job:", error);
        res.status(500).json({ message: error.message || "Failed to schedule edit job" });
      }
    });
    
  // API endpoint to check job status
  app.get("/api/job/:id", (req, res) => {
    const jobId = req.params.id;
    const job = jobs.get(jobId);
    
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    res.json(job);
  });

  // API logs endpoint is disabled and returns 404
  app.get("/api/logs", (_req, res) => {
    res.status(404).json({ message: "API logs have been disabled" });
  });

  // Serve static uploads folder
  const uploadsPath = path.join(path.dirname(new URL(import.meta.url).pathname), '../uploads');
  
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    
    // Create subdirectories
    const fullDir = path.join(uploadsPath, 'full');
    const thumbDir = path.join(uploadsPath, 'thumb');
    
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }
    
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }
  }
  
  // Use express.static with cache settings
  app.use('/uploads', express.static(uploadsPath, { maxAge: '7d' }));

  // Add gallery routes
  app.use('/api', galleryRoutes);
  
  // Add model routes (includes /api/models endpoint)
  app.use('/api', modelRoutes);
  
  // Add upscale routes
  app.use('/api', upscaleRoutes);

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set long timeouts to allow for heavy jobs
  httpServer.headersTimeout = 300_000;   // 5 minutes
  httpServer.keepAliveTimeout = 300_000; // 5 minutes
  
  // Attach WebSocket server
  const { push: wsPublish } = attachWS(httpServer);
  setPush(wsPublish); // Set the global push function
  
  // Initialize cleanup job for trashed images
  setupCleanupJob();
  
  return httpServer;
}
