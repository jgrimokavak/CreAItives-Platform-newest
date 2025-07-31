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
import enhancePromptRouter from "./routes/enhancePrompt";
import enhanceEditPromptRouter from "./routes/enhanceEditPrompt";
import promptSuggestionsRouter from "./routes/promptSuggestions";
import videoRoutes from "./routes/video-routes";
import projectRoutes from "./routes/project-routes";
import { compileMjml, testMjmlCompilation } from "./routes/email-routes";
import { listMakes, listModels, listBodyStyles, listTrims, flushCarCache, loadCarData, getLastFetchTime, setupCarDataAutoRefresh } from "./carData";
import axios from "axios";
import Papa from "papaparse";
import cron from "node-cron";
import { jobs as batchJobs, queue, processBatch, cleanupOldZips, type Row as BatchRow } from "./batch";

// Helper function to create a file-safe name from prompt text
export function createFileSafeNameFromPrompt(prompt: string, maxLength: number = 50): string {
  // Remove non-alphanumeric characters and replace spaces with hyphens
  let safeName = prompt
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')    // Remove non-word chars
    .replace(/[\s_-]+/g, '-')    // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '');    // Remove leading/trailing hyphens
  
  // Truncate to maxLength characters
  if (safeName.length > maxLength) {
    safeName = safeName.substring(0, maxLength);
    // Don't cut in the middle of a word if possible
    if (safeName.lastIndexOf('-') > maxLength - 15) {
      safeName = safeName.substring(0, safeName.lastIndexOf('-'));
    }
  }
  
  // Make sure we don't have an empty string (fallback to 'image')
  if (!safeName) {
    safeName = 'image';
  }
  
  // Add a timestamp for uniqueness
  return `${safeName}-${Date.now()}`;
}

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
  // Add JSON parsing middleware
  app.use(express.json());
  
  // Auth middleware - import and setup authentication
  const { setupAuth, isAuthenticated } = await import('./replitAuth');
  await setupAuth(app);
  
  // Initialize Replicate model schemas and versions
  try {
    await initializeModels();
    console.log("Initialized Replicate models");
  } catch (error) {
    console.error("Failed to initialize Replicate models:", error);
  }

  // Set up periodic cleanup for old ZIP files
  cron.schedule("0 * * * *", () => cleanupOldZips());
  
  // Serve the downloads directory
  const downloadsPath = path.join(process.cwd(), "downloads");
  // Ensure downloads directory exists
  if (!fs.existsSync(downloadsPath)) {
    fs.mkdirSync(downloadsPath, { recursive: true });
    console.log(`Created downloads directory at ${downloadsPath}`);
  }
  app.use("/downloads", express.static(downloadsPath, { maxAge: "1d" }));
  console.log(`Serving downloads from ${downloadsPath}`);
  
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Update last login time every time user data is fetched (indicates active session)
      await storage.updateUserLastLogin(userId);
      
      // Get updated user data with new login time
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin middleware - check if user is admin and specifically joaquin.grimoldi@kavak.com
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
      const userEmail = req.user?.claims?.email;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Only allow joaquin.grimoldi@kavak.com to access admin functions
      if (userEmail !== 'joaquin.grimoldi@kavak.com') {
        return res.status(403).json({ message: "Admin access restricted to authorized personnel only" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      next();
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Failed to verify admin status" });
    }
  };

  // User management routes (admin only)
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { search, statusFilter, roleFilter, sortBy, sortOrder } = req.query;
      const users = await storage.getAllUsers({
        search: search as string,
        statusFilter: statusFilter as 'all' | 'active' | 'inactive',
        roleFilter: roleFilter as 'all' | 'user' | 'admin',
        sortBy: sortBy as 'createdAt' | 'lastLoginAt' | 'email' | 'firstName',
        sortOrder: sortOrder as 'asc' | 'desc',
      });
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/users/statistics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getUserStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user statistics:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  app.get('/api/admin/users/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { search, statusFilter, roleFilter, sortBy, sortOrder } = req.query;
      const users = await storage.getAllUsers({
        search: search as string,
        statusFilter: statusFilter as 'all' | 'active' | 'inactive',
        roleFilter: roleFilter as 'all' | 'user' | 'admin',
        sortBy: sortBy as 'createdAt' | 'lastLoginAt' | 'email' | 'firstName',
        sortOrder: sortOrder as 'asc' | 'desc',
      });
      
      // Generate CSV content
      const csvHeader = 'ID,Email,First Name,Last Name,Role,Status,Created At,Last Login At,Updated At\n';
      const csvRows = users.map(user => {
        const formatDate = (date: Date | null) => date ? date.toISOString() : '';
        return [
          user.id,
          user.email || '',
          user.firstName || '',
          user.lastName || '',
          user.role,
          user.isActive ? 'Active' : 'Inactive',
          formatDate(user.createdAt),
          formatDate(user.lastLoginAt),
          formatDate(user.updatedAt)
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="users-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting users:", error);
      res.status(500).json({ message: "Failed to export users" });
    }
  });

  app.patch('/api/admin/users/:userId/status', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;
      
      console.log(`Admin status update request for user ${userId}:`, { isActive, body: req.body });
      
      if (typeof isActive !== 'boolean') {
        console.log(`Invalid isActive value: ${isActive}, type: ${typeof isActive}`);
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
      
      const user = await storage.updateUserStatus(userId, isActive);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`User ${userId} status updated successfully to: ${isActive}`);
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.patch('/api/admin/users/:userId/role', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      console.log(`Admin role update request for user ${userId}:`, { role, body: req.body });
      
      if (role !== 'user' && role !== 'admin') {
        console.log(`Invalid role value: ${role}`);
        return res.status(400).json({ message: "Role must be 'user' or 'admin'" });
      }
      
      // Prevent removing admin access from joaquin.grimoldi@kavak.com
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (targetUser.email === 'joaquin.grimoldi@kavak.com' && role !== 'admin') {
        return res.status(403).json({ message: "Cannot remove admin access from the primary admin account" });
      }
      
      const user = await storage.updateUserRole(userId, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`User ${userId} role updated successfully to: ${role}`);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Helper function to run image generation job
  async function runGenerateJob(jobId: string, data: any) {
    console.log(`Starting job ${jobId} for image generation`);
    const job = jobs.get(jobId);
    if (!job) return;
    
    try {
      job.status = "processing";
      
      const { prompt, modelKey, size, quality, n, style, background, output_format, aspect_ratio, seed, kavakStyle, input_image, images, mask, prompt_upsampling, safety_tolerance } = data;
      
      // Import the KAVAK style prompt if needed
      let finalPrompt = prompt;
      if (kavakStyle) {
        const { KAVAK_STYLE_PROMPT } = await import('../shared/constants/stylePrompts');
        finalPrompt = prompt + " " + KAVAK_STYLE_PROMPT;
        console.log(`Job ${jobId}: Using KAVAK style - original prompt length: ${prompt.length}, final prompt length: ${finalPrompt.length}`);
      }
      
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
          prompt: finalPrompt,
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

          // Create ID based on the prompt for better readability
          const promptBasedId = `img_${createFileSafeNameFromPrompt(prompt)}_${index}`;
          
          const newImage: GeneratedImage = {
            id: promptBasedId,
            url: imageUrl,
            fullUrl: fullUrl,
            thumbUrl: thumbUrl,
            prompt: prompt,
            size: size || '1024x1024',
            model: modelKey,
            createdAt: new Date().toISOString(),
            // Include aspect ratio exactly as selected by the user (for improved display in cards)
            aspectRatio: aspect_ratio || undefined,
            quality: quality || undefined,
          };
          
          // Store the image in our storage
          storage.saveImage(newImage);
          
          return newImage;
        });
      }
      // Handle Replicate models
      else if (modelInfo.provider === 'replicate') {
        // Build inputs object dynamically based on available data
        const inputs: any = {
          prompt: finalPrompt
        };
        
        // Add optional fields if they exist
        if (aspect_ratio !== undefined) inputs.aspect_ratio = aspect_ratio;
        if (seed !== undefined) inputs.seed = seed;
        if (output_format !== undefined) inputs.output_format = output_format;
        if (prompt_upsampling !== undefined) inputs.prompt_upsampling = prompt_upsampling;
        if (safety_tolerance !== undefined) inputs.safety_tolerance = safety_tolerance;
        
        // Add image-related fields for editing models
        if (input_image !== undefined) inputs.input_image = input_image;
        if (images !== undefined && images.length > 0) inputs.images = images;
        if (mask !== undefined) inputs.mask = mask;
        
        console.log(`Job ${jobId}: Sending Replicate generation request with model ${modelKey} and inputs:`, {
          ...inputs,
          input_image: inputs.input_image ? `[base64 string: ${inputs.input_image.length} chars]` : undefined,
          images: inputs.images ? `[${inputs.images.length} images]` : undefined
        });
        
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

  // API endpoint to generate images (async with job queue) - Protected
  app.post("/api/generate", isAuthenticated, async (req, res) => {
    try {
      // Log the incoming request payload
      console.log("🔍 /api/generate received payload:", {
        modelKey: req.body.modelKey,
        hasInputImage: !!req.body.input_image,
        hasImages: !!req.body.images,
        inputImageLength: req.body.input_image?.length,
        imagesCount: req.body.images?.length,
        otherFields: Object.keys(req.body).filter(k => !['input_image', 'images', 'prompt'].includes(k))
      });

      // Validate request body
      const validationResult = generateImageSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error("Validation failed for /api/generate:", JSON.stringify({
          modelKey: req.body.modelKey,
          bodyKeys: Object.keys(req.body),
          errors: validationResult.error.errors
        }, null, 2));
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }
      
      console.log("🔍 Validation passed, validated data:", {
        modelKey: validationResult.data.modelKey,
        hasInputImage: !!validationResult.data.input_image,
        hasImages: !!validationResult.data.images,
        validatedFields: Object.keys(validationResult.data)
      });
      
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
  
  // API endpoint to get all images - Protected
  app.get("/api/images", isAuthenticated, async (req, res) => {
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
      const kavakStyle = req.body.kavakStyle === "true" || req.body.kavakStyle === true;
      
      // Apply KAVAK style if enabled
      let finalPrompt = prompt;
      if (kavakStyle) {
        const { KAVAK_STYLE_PROMPT } = await import('../shared/constants/stylePrompts');
        finalPrompt = prompt + " " + KAVAK_STYLE_PROMPT;
        console.log(`Job ${jobId}: Using KAVAK style for edit - original prompt length: ${prompt.length}, final prompt length: ${finalPrompt.length}`);
      }
      
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
          prompt: finalPrompt,
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
          
          // Create ID based on the prompt for better readability
          const promptBasedId = `img_${createFileSafeNameFromPrompt(prompt)}_${index}`;
          
          const newImage = {
            id: promptBasedId,
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
  
  // Add prompt enhancement routes
  app.use('/api', enhancePromptRouter);
  
  // Add edit prompt enhancement routes
  app.use('/api', enhanceEditPromptRouter);
  
  // Add prompt suggestions routes
  app.use('/api', promptSuggestionsRouter);
  
  // Add video generation routes
  app.use('/api/video-generate', videoRoutes);
  
  // Add project management routes
  app.use('/api/projects', projectRoutes);
  
  // Email Builder routes
  app.post('/api/email/compile-mjml', compileMjml);
  app.get('/api/email/test-mjml', testMjmlCompilation);
  
  // Car generation routes
  app.get("/api/cars/makes", async (_req, res) => res.json(await listMakes()));
  app.get("/api/cars/models", async (req, res) => res.json(await listModels(req.query.make as string)));
  app.get("/api/cars/bodyStyles", async (req, res) => res.json(await listBodyStyles(req.query.make as string, req.query.model as string)));
  app.get("/api/cars/trims", async (req, res) => res.json(await listTrims(req.query.make as string, req.query.model as string, req.query.bodyStyle as string)));
  
  // Endpoint to manually refresh car data
  app.post("/api/cars/refresh", async (_req, res) => { 
    flushCarCache(); 
    
    // Force refresh data from source
    try {
      const rows = await loadCarData(true);
      res.json({
        success: true, 
        message: 'Car data refreshed successfully',
        count: rows.length,
        lastFetch: getLastFetchTime()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error refreshing car data',
        error: String(error)
      });
    }
  });
  
  // Batch car image generation endpoint
  app.post("/api/car-batch", upload.single("file"), async (req, res) => {
    console.log(`Received batch car generation request: ${req.file?.originalname || 'No file'}, size: ${req.file?.size || 0} bytes`);
    
    // Check for required environment variables
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("Batch request error: REPLICATE_API_TOKEN not set");
      return res.status(500).json({ error: "REPLICATE_API_TOKEN not set" });
    }
    
    if (!req.file?.buffer) {
      console.error(`Batch request error: CSV file is required`);
      return res.status(400).json({ error: "CSV file is required" });
    }
    
    // Log buffer details to help with debugging
    console.log("Received CSV, size:", req.file.buffer.length);
    
    const text = req.file.buffer.toString("utf8");
    console.log(`CSV file parsed to text (${text.length} chars), first 100 chars: ${text.substring(0, 100)}...`);
    
    // First parse the CSV to analyze the headers
    const preparse = Papa.parse(text, { header: false, skipEmptyLines: true });
    
    if (preparse.data.length < 2) {
      console.error("CSV must have at least two rows (header + data)");
      return res.status(400).json({ error: "CSV must have at least two rows (header + data)" });
    }
    
    // Get the headers from the first row
    const headers = preparse.data[0] as string[];
    console.log("Original CSV headers:", headers);
    
    // Normalize headers to match expected property names
    const normalizedHeaders = headers.map(header => {
      // Convert to lowercase and remove any spaces
      const normalized = header.toLowerCase().trim().replace(/\s+/g, '_');
      
      // Map common variations to expected property names
      if (normalized === 'aspect' || normalized === 'aspect_ratio' || normalized === 'aspectratio') {
        return 'aspect_ratio';
      }
      if (normalized === 'body' || normalized === 'bodystyle' || normalized === 'body_style') {
        return 'body_style';
      }
      if (normalized === 'bg' || normalized === 'background') {
        return 'background';
      }
      
      // Return the normalized header or the original if no mapping found
      return normalized;
    });
    
    console.log("Normalized CSV headers:", normalizedHeaders);
    
    // Now reparse with the normalized headers
    const parsed = Papa.parse<BatchRow>(text, { 
      header: true, 
      skipEmptyLines: true,
      transformHeader: header => {
        const index = headers.indexOf(header);
        return index >= 0 ? normalizedHeaders[index] : header;
      }
    });
    
    console.log(`CSV parsed with ${parsed.data.length} rows and ${parsed.errors.length} errors`);
    
    // Log the first row of parsed data to verify aspect_ratio is correctly mapped
    if (parsed.data.length > 0) {
      console.log("First row sample:", parsed.data[0]);
    }
    
    if (parsed.errors.length) {
      console.error(`CSV parsing errors:`, parsed.errors);
      return res.status(400).json({ 
        error: "Malformed CSV", 
        details: parsed.errors 
      });
    }
    
    const rows = parsed.data.slice(0, 50);
    console.log(`Using first ${rows.length} rows from CSV for batch processing`);
    
    if (!rows.length) {
      console.error(`Batch request error: No data rows found in CSV`);
      return res.status(400).json({ error: "No data rows found" });
    }
    
    if (parsed.data.length > 50) {
      console.warn(`CSV contains ${parsed.data.length} rows, truncating to 50 rows`);
      return res.status(400).json({ error: "Row limit exceeded (50 max)" });
    }
    
    const jobId = crypto.randomUUID();
    console.log(`Created batch job with ID: ${jobId} for ${rows.length} cars`);
    
    batchJobs.set(jobId, {
      id: jobId,
      total: rows.length,
      done: 0,
      failed: 0,
      status: "pending",
      createdAt: new Date(),
      errors: []
    });
    
    // Sample first row data to verify structure
    if (rows.length > 0) {
      console.log(`Sample first row data:`, rows[0]);
    }
    
    // Queue the batch processing job
    console.log(`Adding job ${jobId} to processing queue...`);
    queue.add(() => processBatch(jobId, rows))
      .then(() => console.log(`Batch job ${jobId} completed processing`))
      .catch(err => console.error(`Batch job ${jobId} failed:`, err));
    
    // Return immediately with job ID
    console.log(`Responding with job ID: ${jobId}`);
    res.status(202).json({ jobId });
  });
  
  // Debug route for batch jobs (must come before the general route)
  app.get("/api/batch/debug/:id", (req, res) => {
    const jobId = req.params.id;
    console.log(`Debug request for batch job ID: ${jobId}`);
    res.json(batchJobs.get(jobId) || { error: "Job not found" });
  });
  
  // Batch job status endpoint
  app.get("/api/batch/:id", (req, res) => {
    const jobId = req.params.id;
    console.log(`Received batch job status request for ID: ${jobId}`);
    
    const job = batchJobs.get(jobId);
    if (!job) {
      console.error(`Batch job with ID ${jobId} not found`);
      return res.status(404).json({ error: "Job not found" });
    }
    
    const response = {
      total: job.total,
      done: job.done,
      failed: job.failed,
      percent: Math.round((job.done + job.failed) / job.total * 100),
      status: job.status,
      zipUrl: job.zipUrl || null
    };
    
    console.log(`Batch job ${jobId} status:`, response);
    res.json(response);
  });
  
  // Endpoint to stop a batch job
  app.post("/api/batch/:id/stop", async (req, res) => {
    const jobId = req.params.id;
    console.log(`Received request to stop batch job ID: ${jobId}`);
    
    const job = batchJobs.get(jobId);
    if (!job) {
      console.error(`Batch job with ID ${jobId} not found`);
      return res.status(404).json({ error: "Job not found" });
    }
    
    // Only allow stopping jobs that are currently processing
    if (job.status !== "processing") {
      const message = `Cannot stop job with status ${job.status}. Job must be in 'processing' status to be stopped.`;
      console.warn(message);
      return res.status(400).json({ error: message });
    }
    
    // Mark the job as stopped
    console.log(`Marking batch job ${jobId} as stopped`);
    job.status = "stopped";
    job.completedAt = new Date();
    
    // Return the current status
    res.json({
      total: job.total,
      done: job.done,
      failed: job.failed,
      percent: Math.round((job.done + job.failed) / job.total * 100),
      status: job.status,
      message: "Job has been marked for stopping. It will finish current image and then create a ZIP with partial results."
    });
  });
  
  // Car generation endpoint
  app.post("/api/car-generate", upload.single("dummy"), async (req, res) => {
    try {
      const { make, model, body_style, trim, year, color, wheel_color, has_adventure_cladding, aspect_ratio="1:1", background="white", car_angle } = req.body;
      
      const TEMPLATES = {
        white: `Isolated render of a {{year}} {{make}} {{model}} {{body_style}} {{trim}} {{color}}, flat-field white (#FFFFFF) environment, reflections off, baked contact shadow 6 %, |CAR_ANGLE|. Post-process: auto-threshold background to #FFFFFF (tolerance 1 RGB), remove artefacts, keep 6 % shadow, run edge cleanup. Export high-resolution 8 k file without drawing any text, watermarks or badges; restrict "KAVAK" to licence plate only.`,
        hub: `A hyper-realistic professional studio photograph of a {{year}} {{make}} {{model}} {{body_style}} {{trim}} in {{color}} paint with subtle micro-reflections with {{wheel_color}} alloy wheels. The vehicle is positioned |CAR_ANGLE|. Premium tinted windows reflect ambient studio lighting. The car sits on low-profile performance tires with detailed alloy wheels showing brake components behind the spokes. Shot on a polished circular dark charcoal gray studio floor that subtly reflects the vehicle's undercarriage and creates natural graduated shadows. Clean matte white seamless backdrop curves smoothly from floor to wall. Professional three-point lighting setup with key light, fill light, and rim lighting creates dimensional depth while preserving paint reflections and surface textures. Black front license plate features the 'kavak' logo in white. Camera positioned at chest height with slight downward angle. Sharp focus throughout with shallow depth of field on background edges. Commercial automotive photography quality with color-accurate rendering and professional retouching standards.`
      } as const;
      
      const template = TEMPLATES[background === "hub" ? "hub" : "white"];
      
      // Convert "None" values to empty strings for prompt generation
      const cleanValue = (val: string) => (!val || val === "None") ? "" : val;
      
      let prompt = template
        .replace("{{year}}", cleanValue(year))
        .replace("{{make}}", cleanValue(make))
        .replace("{{model}}", cleanValue(model))
        .replace("{{body_style}}", cleanValue(body_style))
        .replace("{{trim}}", cleanValue(trim))
        .replace("{{color}}", cleanValue(color))
        .replace("{{wheel_color}}", cleanValue(wheel_color))
        .replace(/\s+/g, " ").trim();
      
      // Replace car angle with appropriate text based on background and selection
      const carAngleDefault = (background === "hub")
        ? "at a precise 35-degree angle showing the front grille, headlights with signature lighting illuminated, and right side profile"
        : "camera 35° front-left, vehicle nose points left";
      
      prompt = prompt.replace("|CAR_ANGLE|", (car_angle && car_angle !== 'default') ? car_angle.trim() : carAngleDefault);
      
      // Inject adventure cladding text if enabled (only for hub background)
      if ((has_adventure_cladding === 'true' || has_adventure_cladding === true) && background === "hub") {
        const adventureCladdingText = " Equipped with an adventure-spec matte-black composite cladding package fully integrated into the front fascia, wheel arches, rocker panels, and lower door sections—including fog-lamp bezels and lower grille inserts in rugged textured finish—creating a sharply segmented two-tone look that visually dominates the vehicle's entire lower body.";
        
        // Inject after wheel color mention
        const cleanWheelColor = cleanValue(wheel_color);
        prompt = prompt.replace(
          `with ${cleanWheelColor} alloy wheels.`,
          `with ${cleanWheelColor} alloy wheels.${adventureCladdingText}`
        );
      }
      
      console.log(`Car generation request with prompt: ${prompt}`);
      
      // Check if REPLICATE_API_TOKEN is set
      if (!process.env.REPLICATE_API_TOKEN) {
        return res.status(500).json({ error: "REPLICATE_API_TOKEN environment variable is not set" });
      }
      
      // Get the Imagen-4 model from the configured models
      const imagenModel = models.find(m => m.key === 'imagen-4');
      if (!imagenModel) {
        return res.status(500).json({ error: "Imagen-4 model not properly initialized" });
      }
      
      console.log(`Using Replicate model: google/imagen-4`);
      
      // Prepare request data for Imagen-4 (note: no negative_prompt support)
      const requestData = {
        version: "google/imagen-4",
        input: {
          prompt,
          aspect_ratio,
          safety_filter_level: "block_medium_and_above"
        }
      };
      
      // Log the exact request being sent
      console.log("DIRECT REPLICATE REQUEST:", JSON.stringify(requestData, null, 2));
      
      // Replicate call with specific version
      const response = await axios.post("https://api.replicate.com/v1/predictions", 
        requestData, 
        {
          headers: { 
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`, 
            "Content-Type": "application/json" 
          }
        });
      
      const pred = response.data;
      
      // Use the existing waitForPrediction function from replicate.ts
      const { waitForPrediction } = await import('./replicate');
      const final = await waitForPrediction(pred.id);
      
      // final.output is a URL; fetch → buffer
      if (!final.output) {
        return res.status(500).json({ error: "No output URL returned from Replicate" });
      }
      
      const outputUrl = final.output as string;
      const imageResponse = await axios.get(outputUrl, { responseType: "arraybuffer" });
      const imgBuf = imageResponse.data;
      const b64 = Buffer.from(imgBuf).toString("base64");
      
      const image = await persistImage(b64, {
        prompt,
        params: { aspect_ratio, background, model: "car-generator" },
        userId: "demo",
        sources: []
      });
      
      res.json({ image });
    } catch (error: any) {
      console.error("Error generating car image:", error);
      res.status(500).json({ error: error.message || "Failed to generate car image" });
    }
  });

  // Page settings routes (admin only)
  app.get('/api/admin/page-settings', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const pageSettings = await storage.getAllPageSettings();
      res.json(pageSettings);
    } catch (error) {
      console.error("Error fetching page settings:", error);
      res.status(500).json({ message: "Failed to fetch page settings" });
    }
  });

  // Public endpoint to get enabled pages for sidebar
  app.get('/api/page-settings/enabled', async (req: any, res) => {
    try {
      const pageSettings = await storage.getAllPageSettings();
      const enabledPages = pageSettings
        .filter(setting => setting.isEnabled)
        .map(setting => setting.pageKey);
      res.json({ enabledPages });
    } catch (error) {
      console.error("Error fetching enabled pages:", error);
      res.status(500).json({ message: "Failed to fetch enabled pages" });
    }
  });

  app.patch('/api/admin/page-settings/:pageKey', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { pageKey } = req.params;
      const { isEnabled } = req.body;
      
      if (typeof isEnabled !== 'boolean') {
        return res.status(400).json({ message: "isEnabled must be a boolean" });
      }
      
      const setting = await storage.updatePageSetting(pageKey, isEnabled);
      if (!setting) {
        return res.status(404).json({ message: "Page setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Error updating page setting:", error);
      res.status(500).json({ message: "Failed to update page setting" });
    }
  });

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
  
  // Initialize car data auto-refresh
  setupCarDataAutoRefresh();
  
  // Initialize page settings
  await storage.initializePageSettings();
  
  return httpServer;
}
