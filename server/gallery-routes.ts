import { Router } from 'express';
import { db } from './db';
import { images } from '@shared/schema';
import { eq, isNull, isNotNull, desc, and, sql } from 'drizzle-orm';
import { push } from './ws';
import { storage } from './storage';
import { objectStorage } from './objectStorage';
import { galleryRateLimit } from './middleware/rateLimiter';
import { z } from 'zod';

// Input validation schemas
const dateStringSchema = z.string().refine((date) => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}, { message: 'Invalid date format' });

const galleryQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  starred: z.string().optional(),
  trash: z.string().optional(),
  q: z.string().optional(),
  models: z.union([z.string(), z.array(z.string())]).optional(),
  aspectRatios: z.union([z.string(), z.array(z.string())]).optional(),
  resolutions: z.union([z.string(), z.array(z.string())]).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional()
});

const router = Router();

// Get gallery images with pagination - now using Object Storage
router.get('/gallery', async (req, res) => {
  try {
    // Validate input parameters
    const validationResult = galleryQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid query parameters',
        details: validationResult.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
      });
    }
    
    const { 
      cursor, 
      limit = 50, 
      starred, 
      trash, 
      q,
      models,
      aspectRatios,
      resolutions,
      dateFrom,
      dateTo
    } = validationResult.data;
    
    // Parse array parameters
    const modelsArray = models ? (typeof models === 'string' ? models.split(',') : Array.isArray(models) ? models.filter(m => typeof m === 'string') as string[] : undefined) : undefined;
    const aspectRatiosArray = aspectRatios ? (typeof aspectRatios === 'string' ? aspectRatios.split(',') : Array.isArray(aspectRatios) ? aspectRatios.filter(a => typeof a === 'string') as string[] : undefined) : undefined;
    const resolutionsArray = resolutions ? (typeof resolutions === 'string' ? resolutions.split(',') : Array.isArray(resolutions) ? resolutions.filter(r => typeof r === 'string') as string[] : undefined) : undefined;
    
    // Parse date range
    const dateRange = (dateFrom || dateTo) ? {
      from: dateFrom ? new Date(dateFrom as string) : undefined,
      to: dateTo ? new Date(dateTo as string) : undefined
    } : undefined;
    
    const searchParams = {
      starred: starred === 'true',
      trash: trash === 'true',
      limit: Number(limit),
      cursor: cursor as string,
      searchQuery: q as string,
      models: modelsArray,
      aspectRatios: aspectRatiosArray,
      resolutions: resolutionsArray,
      dateRange
    };
    
    const [{ items, nextCursor }, totalCount] = await Promise.all([
      storage.getAllImages(searchParams),
      storage.getImageCount({
        starred: searchParams.starred,
        trash: searchParams.trash,
        searchQuery: searchParams.searchQuery,
        models: searchParams.models,
        aspectRatios: searchParams.aspectRatios,
        resolutions: searchParams.resolutions,
        dateRange: searchParams.dateRange
      })
    ]);
    
    res.json({
      items,
      nextCursor,
      totalCount
    });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    
    // Return specific error for rate limiting issues
    if (error instanceof Error && error.message.includes('rate limit')) {
      return res.status(429).json({ 
        error: 'Too many requests. Please wait before retrying.',
        retryAfter: 2
      });
    }
    
    // Return generic 500 error for other issues
    res.status(500).json({ 
      error: 'Failed to fetch gallery images',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
    });
  }
});

// Update image (star/unstar or move to trash)
router.patch('/image/:id', async (req, res) => {
  try {
    const { starred, deleteToTrash, restoreFromTrash } = req.body;
    const id = req.params.id;
    
    const updates: any = {};
    
    if (starred !== undefined) {
      updates.starred = starred;
    }
    
    if (deleteToTrash) {
      updates.deletedAt = new Date().toISOString();
    }
    
    if (restoreFromTrash) {
      updates.deletedAt = null;
    }
    
    const updatedImage = await storage.updateImage(id, updates);
    
    if (!updatedImage) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    res.json({ ok: true, image: updatedImage });
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// Bulk update images
router.patch('/images/bulk', async (req, res) => {
  try {
    const { ids, starred, deleteToTrash, restoreFromTrash, permanentDelete } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No image IDs provided' });
    }
    
    if (permanentDelete) {
      // Handle permanent deletion of multiple images
      for (const id of ids) {
        await storage.deleteImage(id, true);
      }
      
      // Notify clients about bulk permanent deletion
      push('gallery-updated', { deleted: ids, permanent: true });
      
      res.json({ ok: true, count: ids.length, deleted: true });
      return;
    }
    
    const updates: any = {};
    
    if (starred !== undefined) {
      updates.starred = starred;
    }
    
    if (deleteToTrash) {
      updates.deletedAt = new Date().toISOString();
    }
    
    if (restoreFromTrash) {
      updates.deletedAt = null;
    }
    
    await storage.bulkUpdateImages(ids, updates);
    
    // Notify clients about updates
    push('gallery-updated', { count: ids.length });
    
    res.json({ ok: true, count: ids.length });
  } catch (error) {
    console.error('Error bulk updating images:', error);
    res.status(500).json({ error: 'Failed to update images' });
  }
});

// Permanently delete an image
router.delete('/image/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const permanent = req.query.permanent === 'true';
    
    await storage.deleteImage(id, permanent);
    
    // Notify clients about the deletion
    push('gallery-updated', { deleted: id, permanent });
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Get filter metadata for dynamic filter population
router.get('/gallery/filter-options', async (req, res) => {
  try {
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    
    // Get all non-deleted images for current environment with resolution categories
    const allImages = await db
      .select({
        model: images.model,
        aspectRatio: images.aspectRatio,
        dimensions: images.dimensions,
        createdAt: images.createdAt,
        resolutionCategory: sql`
          CASE 
            WHEN ${images.dimensions} IS NULL OR ${images.dimensions} = '' THEN 'standard'
            WHEN (regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int >= 4096 THEN '4k'
            WHEN (regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int >= 2048 THEN 'ultra'
            WHEN (regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int >= 1536 THEN 'high'
            ELSE 'standard'
          END
        `.as('resolutionCategory')
      })
      .from(images)
      .where(
        and(
          eq(images.environment, currentEnv),
          isNull(images.deletedAt)
        )
      );
    
    // Process models with counts
    const modelCounts = new Map<string, number>();
    allImages.forEach(img => {
      const current = modelCounts.get(img.model) || 0;
      modelCounts.set(img.model, current + 1);
    });
    
    const models = Array.from(modelCounts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
    
    // Process aspect ratios with counts - check both aspectRatio field and dimensions-derived ratios
    const aspectRatioCounts = new Map<string, number>();
    
    // Helper function to calculate aspect ratio from dimensions
    const calculateAspectRatio = (dimensions: string | null): string | null => {
      if (!dimensions) return null;
      
      const match = dimensions.match(/^(\d+)x(\d+)$/);
      if (!match) return null;
      
      const width = parseInt(match[1], 10);
      const height = parseInt(match[2], 10);
      
      // Use integer math to avoid floating point issues
      if (width === height) return '1:1';
      if (width * 9 === height * 16) return '16:9';
      if (width * 16 === height * 9) return '9:16';
      if (width * 3 === height * 4) return '4:3';
      if (width * 2 === height * 3) return '3:2';
      if (width * 3 === height * 2) return '2:3';
      if (width * 4 === height * 3) return '3:4';
      
      return null;
    };
    
    allImages.forEach(img => {
      let aspectRatio = null;
      
      // First, try to use the stored aspectRatio if it's a canonical value
      if (img.aspectRatio && ['1:1', '16:9', '9:16', '4:3', '3:2', '2:3', '3:4'].includes(img.aspectRatio)) {
        aspectRatio = img.aspectRatio;
      } else {
        // Calculate from dimensions
        aspectRatio = calculateAspectRatio(img.dimensions);
      }
      
      if (aspectRatio) {
        const current = aspectRatioCounts.get(aspectRatio) || 0;
        aspectRatioCounts.set(aspectRatio, current + 1);
      }
    });
    
    const aspectRatios = Array.from(aspectRatioCounts.entries())
      .map(([key, count]) => ({ 
        key, 
        count,
        label: key === '16:9' ? 'Widescreen' : 
               key === '9:16' ? 'Portrait' :
               key === '1:1' ? 'Square' :
               key === '4:3' ? 'Standard' :
               key === '3:2' ? 'Photo' : key
      }))
      .sort((a, b) => b.count - a.count);
    
    // Process resolutions with counts (using SQL-computed categories)
    const resolutionCounts = new Map<string, number>();
    allImages.forEach(img => {
      const category = String(img.resolutionCategory);
      const current = resolutionCounts.get(category) || 0;
      resolutionCounts.set(category, current + 1);
    });
    
    const resolutions = Array.from(resolutionCounts.entries())
      .map(([key, count]) => ({ 
        key, 
        count,
        label: key === 'standard' ? 'Standard (1K)' :
               key === 'high' ? 'High (1.5K+)' :
               key === 'ultra' ? 'Ultra (2K+)' :
               key === '4k' ? '4K' : key
      }))
      .sort((a, b) => {
        // Custom sort order: standard, high, ultra, 4k
        const order: Record<string, number> = { 'standard': 0, 'high': 1, 'ultra': 2, '4k': 3 };
        return (order[a.key] || 999) - (order[b.key] || 999);
      });
    
    // Get date range
    const dates = allImages
      .map(img => new Date(img.createdAt))
      .sort((a, b) => a.getTime() - b.getTime());
    
    const dateRange = dates.length > 0 ? {
      earliest: dates[0].toISOString(),
      latest: dates[dates.length - 1].toISOString()
    } : null;
    
    res.json({
      models,
      aspectRatios,
      resolutions,
      dateRange,
      totalImages: allImages.length
    });
    
  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ 
      error: 'Failed to fetch filter options',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
    });
  }
});

// Trigger cleanup manually (for testing or when Replit wakes up)
router.post('/cleanup', async (req, res) => {
  try {
    // Import and run cleanup job
    const { setupCleanupJob } = await import('./cleanup');
    setupCleanupJob();
    
    res.json({ ok: true, message: 'Cleanup job scheduled' });
  } catch (error) {
    console.error('Error scheduling cleanup:', error);
    res.status(500).json({ error: 'Failed to schedule cleanup job' });
  }
});

export default router;