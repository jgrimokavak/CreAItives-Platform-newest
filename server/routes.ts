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
import { listMakes, listModels, listBodyStyles, listTrims, listColors, flushCarCache, loadCarData, loadColorData, getLastFetchTime, setupCarDataAutoRefresh } from "./carData";
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
      
      // Import the unified handler
      const { handleImageGeneration } = await import('./handlers/unified-image-handler');
      
      console.log(`Job ${jobId}: Processing image generation with model: ${data.modelKey}`);
      
      // Use the unified handler
      const generatedImages = await handleImageGeneration(data);
      console.log(`Job ${jobId}: Generated ${generatedImages.length} images`);
      
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
        hasImage: !!req.body.Image,
        inputImageLength: req.body.input_image?.length,
        imagesCount: req.body.images?.length,
        ImageLength: req.body.Image?.length,
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
        validatedFields: Object.keys(validationResult.data),
        fullData: validationResult.data
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
      const modelKey = req.body.modelKey || "gpt-image-1"; // Default to gpt-image-1 for backward compatibility
      const size = req.body.size || "1024x1024";
      const quality = req.body.quality || "high";
      const n = parseInt(req.body.n || "1");
      const kavakStyle = req.body.kavakStyle === "true" || req.body.kavakStyle === true;
      
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
      
      // Convert uploaded files to base64
      const images: string[] = [];
      for (const file of imgFiles) {
        const base64 = `data:image/${file.mimetype.split('/')[1]};base64,${file.buffer.toString('base64')}`;
        images.push(base64);
      }
      
      // Convert mask to base64 if provided
      let mask: string | undefined;
      if (maskFile) {
        mask = `data:image/${maskFile.mimetype.split('/')[1]};base64,${maskFile.buffer.toString('base64')}`;
      }
      
      // Import the unified handler
      const { handleImageEdit } = await import('./handlers/unified-image-handler');
      
      console.log(`Job ${jobId}: Processing image edit with model: ${modelKey}`);
      
      // Build request data
      const requestData = {
        prompt,
        modelKey,
        images,
        mask,
        size,
        quality,
        n,
        kavakStyle,
        ...req.body // Include any other model-specific parameters
      };
      
      // Use the unified handler
      const generatedImages = await handleImageEdit(requestData);
      console.log(`Job ${jobId}: Generated ${generatedImages.length} edited images`);
      
      // Update job with results
      job.status = "done";
      job.result = generatedImages;
      
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
  app.get("/api/cars/colors", async (_req, res) => {
    // Disable caching for this endpoint to ensure fresh color data
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    const colors = await listColors();
    res.json(colors);
  });
  
  // Endpoint to manually refresh car data
  app.post("/api/cars/refresh", async (_req, res) => { 
    flushCarCache(); 
    
    // Force refresh data from source
    try {
      const rows = await loadCarData(true);
      const colors = await loadColorData(true);
      res.json({
        success: true, 
        message: 'Car data and colors refreshed successfully',
        carCount: rows.length,
        colorCount: colors.length,
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
