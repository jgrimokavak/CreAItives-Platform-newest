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
import { GeneratedImage, User } from "@shared/schema";
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


import objectStorageRoutes from "./routes/object-storage-routes";
import galleryObjectStorageRoutes from "./gallery-object-storage";
import { compileMjml, testMjmlCompilation } from "./routes/email-routes";
import { listMakes, listModels, listBodyStyles, listTrims, listColors, flushCarCache, loadCarData, loadColorData, getLastFetchTime, setupCarDataAutoRefresh } from "./carData";
import axios from "axios";
import Papa from "papaparse";
import cron from "node-cron";
import { jobs as batchJobs, queue, processBatch, cleanupOldZips, type Row as BatchRow } from "./batch";
import NodeCache from "node-cache";

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

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// PERFORMANCE OPTIMIZATION: User authentication cache
// Cache user data for 5 minutes to reduce database lookups
const userCache = new NodeCache({ stdTTL: 300 }); // 5 minutes TTL

// Cached user lookup function
async function getCachedUser(userId: string): Promise<User | undefined> {
  const cacheKey = `user_${userId}`;
  let user = userCache.get<User>(cacheKey);
  
  if (!user) {
    // Cache miss - fetch from database
    user = await storage.getUser(userId);
    if (user) {
      userCache.set(cacheKey, user);
    }
  }
  
  return user;
}

// Function to invalidate user cache (call on logout or user updates)
function invalidateUserCache(userId: string) {
  const cacheKey = `user_${userId}`;
  userCache.del(cacheKey);
}

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
      
      // Use cached user lookup to reduce database calls
      const user = await getCachedUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // OPTIMIZATION: Only update last login time every 5 minutes to reduce DB writes
      // Check if last login was more than 5 minutes ago
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      if (!user.lastLoginAt || user.lastLoginAt < fiveMinutesAgo) {
        // Update login time and invalidate cache to get fresh data
        await storage.updateUserLastLogin(userId);
        invalidateUserCache(userId);
        // Get fresh user data with updated login time
        const updatedUser = await getCachedUser(userId);
        res.json(updatedUser);
      } else {
        // Use cached user data without unnecessary DB update
        res.json(user);
      }
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
        console.log(`Unauthorized admin access attempt from IP: ${req.ip}, path: ${req.path}, timestamp: ${new Date().toISOString()}`);
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Only allow joaquin.grimoldi@kavak.com to access admin functions
      if (userEmail !== 'joaquin.grimoldi@kavak.com') {
        console.log(`Admin access denied for user: ${userEmail} from IP: ${req.ip}, path: ${req.path}, timestamp: ${new Date().toISOString()}`);
        return res.status(403).json({ message: "Admin access restricted to authorized personnel only" });
      }
      
      // Use cached user lookup to reduce database calls
      const user = await getCachedUser(userId);
      if (!user || user.role !== 'admin') {
        console.log(`Admin role check failed for user: ${userEmail} from IP: ${req.ip}, path: ${req.path}, timestamp: ${new Date().toISOString()}`);
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
      
      // Remove verbose admin request logging in production
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Admin status update request for user ${userId}:`, { isActive, body: req.body });
      }
      
      if (typeof isActive !== 'boolean') {
        console.log(`Invalid isActive value: ${isActive}, type: ${typeof isActive}`);
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
      
      const user = await storage.updateUserStatus(userId, isActive);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Invalidate cache after user update
      invalidateUserCache(userId);
      
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
      
      // Remove verbose admin request logging in production
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Admin role update request for user ${userId}:`, { role, body: req.body });
      }
      
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
      
      // Invalidate cache after user update
      invalidateUserCache(userId);
      
      console.log(`User ${userId} role updated successfully to: ${role}`);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Storage management routes (admin only)
  
  // Admin self-test endpoint for access control verification
  app.get('/api/admin/storage/self-test', isAuthenticated, isAdmin, async (req: any, res) => {
    console.log(`Admin self-test passed for user: ${req.user?.email} from IP: ${req.ip}`);
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Admin storage verification endpoint
  app.get('/api/admin/storage/verify', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      console.log(`Admin: Storage verification requested by ${req.user?.email} from IP: ${req.ip}`);
      
      const { replitStorage } = await import('./replitObjectStorage');
      const stats = await replitStorage.getBucketStats();
      
      console.log(`Storage verification: ${stats.totalObjects} objects (${stats.devObjects} dev, ${stats.prodObjects} prod), ${(stats.totalSize / (1024**3)).toFixed(3)} GiB`);
      
      res.json({
        verified: true,
        timestamp: new Date().toISOString(),
        live: {
          totalObjects: stats.totalObjects,
          totalSizeBytes: stats.totalSize,
          devObjects: stats.devObjects,
          prodObjects: stats.prodObjects,
          devSizeBytes: stats.devSize,
          prodSizeBytes: stats.prodSize
        }
      });
      
    } catch (error) {
      console.error('Storage verification failed:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  app.get('/api/admin/storage/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      console.log('Admin: Fetching storage statistics...');
      const { environment } = req.query;
      
      // Get metrics from database instead of downloading files
      const { db: database } = await import('./db');
      const { images: imagesTable } = await import('@shared/schema');
      const { sql: sqlFunc, eq, and, isNull } = await import('drizzle-orm');

      // Get counts and sizes by environment from database
      const statsQuery = database
        .select({
          environment: imagesTable.environment,
          count: sqlFunc<number>`COUNT(*)`,
          totalSize: sqlFunc<number>`COALESCE(SUM(${imagesTable.size}), 0)`
        })
        .from(imagesTable)
        .where(isNull(imagesTable.deletedAt)) // Only active images
        .groupBy(imagesTable.environment);

      const dbStats = await statsQuery;

      // Calculate metrics based on database data
      let allDevCount = 0;
      let allProdCount = 0;
      let allDevSizeBytes = 0;
      let allProdSizeBytes = 0;

      dbStats.forEach(stat => {
        const env = stat.environment || 'dev';
        const count = Number(stat.count) || 0;
        const size = Number(stat.totalSize) || 0;
        
        if (env === 'dev') {
          allDevCount = count;
          allDevSizeBytes = size;
        } else if (env === 'prod') {
          allProdCount = count;
          allProdSizeBytes = size;
        }
      });

      // Set display values based on filter
      let displayCount = allDevCount + allProdCount;
      let displaySizeBytes = allDevSizeBytes + allProdSizeBytes;
      let devCount = allDevCount;
      let prodCount = allProdCount;
      let devSizeBytes = allDevSizeBytes;  
      let prodSizeBytes = allProdSizeBytes;

      if (environment === 'dev') {
        displayCount = allDevCount;
        displaySizeBytes = allDevSizeBytes;
        prodCount = 0;
        prodSizeBytes = 0;
      } else if (environment === 'prod') {
        displayCount = allProdCount;
        displaySizeBytes = allProdSizeBytes;
        devCount = 0;
        devSizeBytes = 0;
      }

      const displaySizeGiB = displaySizeBytes / (1024 * 1024 * 1024);
      const estimatedMonthlyCost = displaySizeGiB * 0.03; // $0.03 per GiB/month
      
      // Get upload activity from database
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { gte } = await import('drizzle-orm');
      
      const dailyUploads = await database
        .select({
          date: sqlFunc<string>`DATE(${imagesTable.createdAt})`,
          count: sqlFunc<number>`COUNT(*)`
        })
        .from(imagesTable)
        .where(gte(imagesTable.createdAt, thirtyDaysAgo))
        .groupBy(sqlFunc`DATE(${imagesTable.createdAt})`)
        .orderBy(sqlFunc`DATE(${imagesTable.createdAt})`);

      console.log(`Storage stats from DB: ${displayCount} objects displayed, ${displaySizeGiB.toFixed(3)} GiB (${(displaySizeBytes / (1024**2)).toFixed(2)} MB) [Filter: ${environment || 'all'}]`);
      
      const envPrefix = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
      
      res.json({
        totalObjects: displayCount,
        totalSizeBytes: displaySizeBytes,
        totalSizeGiB: Number(displaySizeGiB.toFixed(3)),
        estimatedMonthlyCost: Number(estimatedMonthlyCost.toFixed(2)),
        environments: {
          dev: devCount,
          prod: prodCount,
          current: envPrefix
        },
        bucketId: 'kavak-gallery',
        dailyUploads: dailyUploads.map(item => ({
          date: item.date,
          count: Number(item.count)
        })),
        // Add debug info for troubleshooting
        debug: {
          environmentFilter: environment,
          dbStats: dbStats,
          devCount: allDevCount,
          prodCount: allProdCount,
          devSize: allDevSizeBytes,
          prodSize: allProdSizeBytes
        }
      });
      
    } catch (error) {
      console.error('Error fetching storage stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/storage/objects', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const {
        page = '1',
        limit = '50',
        environment,
        dateFrom,
        dateTo,
        minSize,
        maxSize
      } = req.query;

      console.log('Admin: Fetching storage objects with filters:', {
        page, limit, environment, dateFrom, dateTo, minSize, maxSize
      });

      // Get object list from database with actual sizes
      const { db: dbConn } = await import('./db');
      const { images: imgTable } = await import('@shared/schema');
      const { isNull: isNullFunc } = await import('drizzle-orm');

      const imageRecords = await dbConn.select().from(imgTable).where(isNullFunc(imgTable.deletedAt));
      
      // Convert database records to object format
      const objects = imageRecords.map((img, index) => ({
        name: `${img.environment || 'dev'}/${img.id}.png`, // Reconstruct object path
        size: img.size || 0,
        lastModified: img.createdAt || new Date(),
        id: `obj_${index}_${img.id}`,
        environment: img.environment || 'dev',
        type: 'image' as const
      }));

      // Apply filters
      let filteredObjects = objects.filter((obj: any) => {
        // Environment filter
        if (environment && environment !== 'all' && obj.environment !== environment) {
          return false;
        }
        
        // Date filters
        if (dateFrom || dateTo) {
          const objDate = new Date(obj.lastModified || obj.timeCreated);
          if (dateFrom && objDate < new Date(dateFrom as string)) return false;
          if (dateTo && objDate > new Date(dateTo as string)) return false;
        }
        
        // Size filters
        const size = obj.size || 0;
        if (minSize && size < parseInt(minSize as string)) return false;
        if (maxSize && size > parseInt(maxSize as string)) return false;
        
        return true;
      });

      // Sort by date (newest first)
      filteredObjects.sort((a: any, b: any) => {
        const dateA = new Date(a.lastModified || a.timeCreated || 0);
        const dateB = new Date(b.lastModified || b.timeCreated || 0);
        return dateB.getTime() - dateA.getTime();
      });

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      const paginatedObjects = filteredObjects.slice(offset, offset + limitNum);

      const formattedObjects = paginatedObjects.map((obj: any) => {
        const name = obj.name || obj.path || '';
        const isThumb = name.includes('/thumb/');
        const env = name.startsWith('dev/') ? 'dev' : 
                    name.startsWith('prod/') ? 'prod' : 'unknown';
        
        return {
          id: obj.id || name,
          name,
          size: obj.size || 0,
          sizeFormatted: formatFileSize(obj.size || 0),
          lastModified: obj.lastModified || obj.timeCreated,
          environment: env,
          type: isThumb ? 'thumbnail' : 'image',
          url: `/api/object-storage/image/${name}`
        };
      });

      res.json({
        objects: formattedObjects,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredObjects.length,
          totalPages: Math.ceil(filteredObjects.length / limitNum)
        }
      });

    } catch (error) {
      console.error('Error fetching storage objects:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/admin/storage/objects/bulk', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { objectNames } = req.body;
      
      if (!objectNames || !Array.isArray(objectNames) || objectNames.length === 0) {
        return res.status(400).json({ error: 'No object names provided' });
      }

      console.log(`Admin: Bulk deleting ${objectNames.length} objects:`, objectNames);

      const { replitStorage } = await import('./replitObjectStorage');
      const result = await replitStorage.deleteObjects(objectNames);

      res.json({
        success: true,
        deleted: result.deleted,
        failed: result.failed,
        errors: result.errors.length > 0 ? result.errors : undefined
      });

    } catch (error) {
      console.error('Error in bulk delete:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Backfill route for existing images with missing size
  app.post('/api/admin/storage/backfill-size', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      console.log('Admin: Starting backfill of missing file sizes...');
      
      const { db: backfillDb } = await import('./db');
      const { images: backfillImages } = await import('@shared/schema');
      const { eq, or, isNull: isNullValue } = await import('drizzle-orm');
      const { objectStorage } = await import('./objectStorage');

      // Get images with missing sizes
      const imagesToBackfill = await backfillDb.select()
        .from(backfillImages)
        .where(or(eq(backfillImages.size, 0), isNullValue(backfillImages.size)));

      let updated = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const image of imagesToBackfill) {
        try {
          const objectPath = `${image.environment || 'dev'}/${image.id}.png`;
          const bytes = await objectStorage.downloadImage(objectPath);
          
          if (bytes) {
            const size = bytes.length;
            await backfillDb.update(backfillImages)
              .set({ size })
              .where(eq(backfillImages.id, image.id));
            
            updated++;
            console.log(`Backfilled size for ${image.id}: ${size} bytes`);
          } else {
            failed++;
            errors.push(`${image.id}: Failed to download`);
          }
        } catch (error) {
          failed++;
          errors.push(`${image.id}: ${error}`);
          console.error(`Error backfilling ${image.id}:`, error);
        }
      }

      console.log(`Backfill completed: ${updated} updated, ${failed} failed`);
      
      res.json({
        success: true,
        total: imagesToBackfill.length,
        updated,
        failed,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit error list
      });
      
    } catch (error) {
      console.error('Error in backfill operation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/admin/storage/objects/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { environment, dateFrom, dateTo } = req.query;
      
      console.log('Admin: Exporting storage objects to CSV');

      const { replitStorage } = await import('./replitObjectStorage');
      const { objects: objectList } = await replitStorage.listAllObjects();
      
      // Get objects from database for CSV export
      const { db: dbInstance } = await import('./db');
      const { images: imgsTable } = await import('@shared/schema');
      const { isNull: isNullCheck } = await import('drizzle-orm');

      const imageRecords = await dbInstance.select().from(imgsTable).where(isNullCheck(imgsTable.deletedAt));
      
      // Convert to objects format for CSV export
      const objects = imageRecords.map((img) => ({
        name: `${img.environment || 'dev'}/${img.id}.png`,
        size: img.size || 0,
        lastModified: img.createdAt || new Date(),
        environment: img.environment || 'dev',
        type: 'image' as const
      }));

      // Apply filters
      let filteredObjects = objects.filter((obj: any) => {
        if (environment && environment !== 'all' && obj.environment !== environment) {
          return false;
        }
        
        if (dateFrom || dateTo) {
          const objDate = new Date(obj.lastModified || obj.timeCreated);
          if (dateFrom && objDate < new Date(dateFrom as string)) return false;
          if (dateTo && objDate > new Date(dateTo as string)) return false;
        }
        
        return true;
      });

      // Helper function to format bytes
      const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      // Generate CSV content
      const csvHeader = 'ID,Name,Size (bytes),Size (formatted),Last Modified,Environment,Type\n';
      const csvRows = filteredObjects.map((obj: any) => {
        const name = obj.name || obj.path || '';
        const size = obj.size || 0;
        const isThumb = name.includes('/thumb/');
        const env = name.startsWith('dev/') ? 'dev' : 
                    name.startsWith('prod/') ? 'prod' : 'unknown';
        
        return [
          obj.id || name,
          `"${name}"`,
          size,
          `"${formatFileSize(size)}"`,
          `"${obj.lastModified || obj.timeCreated || ''}"`,
          env,
          isThumb ? 'thumbnail' : 'image'
        ].join(',');
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      const filename = `storage-export-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);

      console.log(`Exported ${filteredObjects.length} objects to CSV`);

    } catch (error) {
      console.error('Error exporting CSV:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Helper function to run image generation job
  async function runGenerateJob(jobId: string, data: any) {
    // Remove verbose job processing logs in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Starting job ${jobId} for image generation`);
    }
    const job = jobs.get(jobId);
    if (!job) return;
    
    try {
      job.status = "processing";
      
      // Import the unified handler
      const { handleImageGeneration } = await import('./handlers/unified-image-handler');
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Job ${jobId}: Processing image generation with model: ${data.modelKey}`);
      }
      
      // Use the unified handler
      const generatedImages = await handleImageGeneration(data);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Job ${jobId}: Generated ${generatedImages.length} images`);
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
      // PERFORMANCE OPTIMIZATION: Remove verbose logging in production
      if (process.env.NODE_ENV !== 'production') {
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
      }

      // Validate request body
      const validationResult = generateImageSchema.safeParse(req.body);
      if (!validationResult.success) {
        // Keep error logging but remove verbose JSON serialization in production
        if (process.env.NODE_ENV !== 'production') {
          console.error("Validation failed for /api/generate:", JSON.stringify({
            modelKey: req.body.modelKey,
            bodyKeys: Object.keys(req.body),
            errors: validationResult.error.errors
          }, null, 2));
        } else {
          console.error("Validation failed for /api/generate:", validationResult.error.message);
        }
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }
      
      // Remove verbose validation logging in production
      if (process.env.NODE_ENV !== 'production') {
        console.log("🔍 Validation passed, validated data:", {
          modelKey: validationResult.data.modelKey,
          hasInputImage: !!validationResult.data.input_image,
          hasImages: !!validationResult.data.images,
          validatedFields: Object.keys(validationResult.data),
          fullData: validationResult.data
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

  // Note: Object Storage is now used for image storage instead of local uploads directory

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
  

  

  
  // Add Object Storage routes
  app.use('/api', objectStorageRoutes);
  app.use('/api', galleryObjectStorageRoutes);
  
  // Email Builder routes
  app.post('/api/email/compile-mjml', compileMjml);
  app.get('/api/email/test-mjml', testMjmlCompilation);
  
  // REMOVED: Gallery sync API endpoint that was causing images to be incorrectly moved to trash
  
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
      
      // Remove verbose request logging in production
      if (process.env.NODE_ENV !== 'production') {
        console.log("DIRECT REPLICATE REQUEST:", JSON.stringify(requestData, null, 2));
      }
      
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
  
  // REMOVED: Gallery sync that was causing images to be incorrectly moved to trash
  // due to dev/prod environment isolation issues. This system is no longer necessary.
  
  // Initialize car data auto-refresh
  setupCarDataAutoRefresh();
  
  // Initialize page settings
  await storage.initializePageSettings();
  
  return httpServer;
}
