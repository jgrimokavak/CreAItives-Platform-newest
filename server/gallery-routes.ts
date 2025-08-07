import { Router } from 'express';
import { db } from './db';
import { images } from '@shared/schema';
import { eq, isNull, isNotNull, desc } from 'drizzle-orm';
import { push } from './ws';
import { storage } from './storage';
import { objectStorage } from './objectStorage';
import { galleryRateLimit } from './middleware/rateLimiter';

const router = Router();

// Get gallery images with pagination - now using Object Storage
router.get('/gallery', async (req, res) => {
  try {
    const { cursor, limit = 50, starred, trash, q } = req.query;
    
    const searchParams = {
      starred: starred === 'true',
      trash: trash === 'true',
      limit: Number(limit),
      cursor: cursor as string,
      searchQuery: q as string
    };
    
    const { items, nextCursor } = await storage.getAllImages(searchParams);
    
    res.json({
      items,
      nextCursor
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