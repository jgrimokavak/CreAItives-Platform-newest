import { Router, Request, Response } from 'express';
import { objectStorage } from '../objectStorage';

const router = Router();

/**
 * Serve images from Object Storage
 * Route: GET /api/object-storage/image/:path(*)
 */
router.get('/object-storage/image/:path(*)', async (req: Request, res: Response) => {
  try {
    const imagePath = req.params.path;
    
    if (!imagePath) {
      return res.status(400).json({ error: 'Image path is required' });
    }

    // Download image from Object Storage
    const imageBuffer = await objectStorage.downloadImage(imagePath);
    
    // Determine content type based on extension
    const contentType = imagePath.endsWith('.webp') ? 'image/webp' : 
                       imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg') ? 'image/jpeg' :
                       'image/png';
    
    // Set appropriate headers
    res.set({
      'Content-Type': contentType,
      'Content-Length': imageBuffer.length.toString(),
      'Cache-Control': 'public, max-age=86400', // 24 hour cache
    });

    res.send(imageBuffer);
  } catch (error) {
    console.error('Error serving image from Object Storage:', error);
    res.status(404).json({ error: 'Image not found' });
  }
});

/**
 * List images from Object Storage for gallery
 * Route: GET /api/object-storage/gallery
 */
router.get('/object-storage/gallery', async (req: Request, res: Response) => {
  try {
    const { cursor, limit = '50', starred, trash, searchQuery } = req.query;
    
    const result = await objectStorage.getAllImagesForGallery({
      cursor: cursor as string,
      limit: parseInt(limit as string),
      starred: starred === 'true',
      trash: trash === 'true',
      searchQuery: searchQuery as string,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching gallery from Object Storage:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

/**
 * Wipe all images from Object Storage (dev environment only)
 * Route: POST /api/object-storage/wipe-all
 */
router.post('/object-storage/wipe-all', async (req: Request, res: Response) => {
  try {
    const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
    
    if (isProduction) {
      return res.status(403).json({ error: 'Wipe operation not allowed in production' });
    }

    await objectStorage.wipeAllImages();
    res.json({ message: 'All images wiped from Object Storage successfully' });
  } catch (error) {
    console.error('Error wiping Object Storage:', error);
    res.status(500).json({ error: 'Failed to wipe Object Storage' });
  }
});

export default router;