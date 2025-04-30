import { Router } from 'express';
import { db } from './db';
import { images } from '@shared/schema';
import { eq, isNull, isNotNull, desc } from 'drizzle-orm';
import { push } from './ws';
import { storage } from './storage';

const router = Router();

// Get gallery images with pagination
router.get('/gallery', async (req, res) => {
  try {
    const { cursor, limit = 50, starred, trash, q } = req.query;
    
    console.log(`Gallery request received with params:`, 
      { cursor, limit, starred: starred === 'true', trash: trash === 'true', searchQuery: q });
    
    // Get images from database with filtering for starred/trash and search
    const searchParams = {
      starred: starred === 'true',
      trash: trash === 'true',
      limit: Number(limit),
      cursor: cursor as string,
      searchQuery: q as string
    };
    
    console.log('Calling storage.getAllImages with params:', JSON.stringify(searchParams));
    
    const { items, nextCursor } = await storage.getAllImages(searchParams);
    
    console.log(`Returning ${items.length} images, nextCursor: ${nextCursor}`);
    
    // Log a few sample images for debugging
    if (items.length > 0) {
      console.log(`Sample image data:`, {
        id: items[0].id,
        starred: items[0].starred,
        deletedAt: items[0].deletedAt
      });
    }
    
    res.json({
      items,
      nextCursor
    });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ error: 'Failed to fetch gallery images' });
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