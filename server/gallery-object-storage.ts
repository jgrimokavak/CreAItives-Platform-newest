import { Router } from 'express';
import { objectStorage } from './objectStorage';
import { push } from './ws';

const router = Router();

/**
 * Pure Object Storage Gallery API
 * This will eventually replace the hybrid gallery once fully tested
 */

// Get images directly from Object Storage
router.get('/object-storage/gallery', async (req, res) => {
  try {
    const { cursor, limit = 50, starred, trash, searchQuery } = req.query;
    
    console.log('Pure Object Storage gallery request:', { cursor, limit, starred, trash, searchQuery });

    // Get images directly from Object Storage
    const result = await objectStorage.getAllImagesForGallery({
      cursor: cursor as string,
      limit: Number(limit),
      starred: starred === 'true',
      trash: trash === 'true', 
      searchQuery: searchQuery as string,
    });

    console.log(`Object Storage returned ${result.images.length} images`);

    res.json({
      images: result.images,
      nextCursor: result.nextCursor,
      hasMore: !!result.nextCursor
    });
  } catch (error) {
    console.error('Error fetching Object Storage gallery:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

// Test endpoint to verify Object Storage connection
router.get('/object-storage/test', async (req, res) => {
  try {
    // Try to list some files to test connection
    const result = await objectStorage.listImages(undefined, 5);
    
    res.json({
      status: 'Object Storage connected',
      sampleImages: result.images.length,
      environment: process.env.REPLIT_DEPLOYMENT === '1' ? 'production' : 'development'
    });
  } catch (error) {
    console.error('Object Storage test failed:', error);
    res.status(500).json({ 
      status: 'Object Storage connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;