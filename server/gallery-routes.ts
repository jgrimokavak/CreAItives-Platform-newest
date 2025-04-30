import { Router } from 'express';
import prisma from './prisma';
import { push } from './ws';

const router = Router();

// Get gallery images with pagination
router.get('/gallery', async (req, res) => {
  try {
    const { cursor, limit = 50, starred, trash } = req.query;
    const where: any = { userId: 'demo' }; // Replace with actual user ID when auth is implemented
    
    if (starred === 'true') {
      where.starred = true;
    }
    
    if (trash === 'true') {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }
    
    const items = await prisma.image.findMany({
      where,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      include: {
        sources: true
      }
    });
    
    const mapped = items.map((img: any) => ({
      ...img,
      fullUrl: `/uploads/${img.path}`,
      thumbUrl: `/uploads/${img.thumbPath}`,
      sources: img.sources.map((src: any) => ({
        ...src,
        fullUrl: src.path ? `/uploads/${src.path}` : null,
        thumbUrl: src.thumbPath ? `/uploads/${src.thumbPath}` : null
      }))
    }));
    
    res.json({
      items: mapped,
      nextCursor: items.length > 0 ? items[items.length - 1].id : null
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
    
    const updateData: any = {};
    
    if (starred !== undefined) {
      updateData.starred = starred;
    }
    
    if (deleteToTrash) {
      updateData.deletedAt = new Date();
    }
    
    if (restoreFromTrash) {
      updateData.deletedAt = null;
    }
    
    const updated = await prisma.image.update({
      where: { id },
      data: updateData
    });
    
    // Notify clients of the update
    push('imageUpdated', { id, ...updateData });
    
    res.json({ ok: true, image: updated });
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// Bulk update images
router.patch('/images/bulk', async (req, res) => {
  try {
    const { ids, starred, deleteToTrash, restoreFromTrash } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No image IDs provided' });
    }
    
    const updateData: any = {};
    
    if (starred !== undefined) {
      updateData.starred = starred;
    }
    
    if (deleteToTrash) {
      updateData.deletedAt = new Date();
    }
    
    if (restoreFromTrash) {
      updateData.deletedAt = null;
    }
    
    // Batch update all images
    const updates = ids.map(id => 
      prisma.image.update({
        where: { id },
        data: updateData
      })
    );
    
    await Promise.all(updates);
    
    // Notify clients of the updates
    ids.forEach(id => {
      push('imageUpdated', { id, ...updateData });
    });
    
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
    
    // Get image details before deleting
    const image = await prisma.image.findUnique({
      where: { id },
      include: { sources: true }
    });
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Delete the database record (sources will cascade delete)
    await prisma.image.delete({
      where: { id }
    });
    
    // Notify clients of the deletion
    push('imageDeleted', { id });
    
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