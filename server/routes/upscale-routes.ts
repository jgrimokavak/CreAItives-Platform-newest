import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import FormData from 'form-data';
import sharp from 'sharp';
import { waitForPrediction } from '../replicate';

// Set up multer for temporary file storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Create router
const router = Router();

// Active upscale jobs registry
const upscaleJobs: Record<string, {
  status: "pending" | "processing" | "done" | "error",
  result?: string,
  error?: string
}> = {};

// Upscale API endpoint
router.post('/upscale', upload.single('image'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Generate job ID for tracking
    const jobId = uuidv4();
    upscaleJobs[jobId] = { status: 'pending' };

    // Return jobId immediately for client to start polling
    res.json({ jobId });
    
    // Process the job asynchronously
    processUpscaleJob(jobId, req).catch(error => {
      console.error('Unhandled error in upscale job:', error);
      upscaleJobs[jobId].status = 'error';
      upscaleJobs[jobId].error = 'Internal server error during upscale';
    });
  } catch (error: any) {
    console.error('Upscale request error:', error);
    res.status(500).json({ message: 'Server error during upscale request' });
  }
});

// Process upscale job asynchronously
async function processUpscaleJob(jobId: string, req: any) {
  try {
    upscaleJobs[jobId].status = 'processing';
    
    // Get file path
    const filePath = req.file.path;
    const originalImageBuffer = fs.readFileSync(filePath);
    
    // Process image with Sharp - resize if necessary to fit GPU memory constraints
    // The error from Replicate shows max size is 2096704 pixels, so we'll aim for ~1.4M pixels max
    // which is roughly 1200x1200 (actually 1.44M pixels)
    const MAX_DIMENSION = 1200;
    
    // Get image metadata to determine if resizing is needed
    const metadata = await sharp(originalImageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    
    let processedImageBuffer = originalImageBuffer;
    let wasResized = false;
    
    // Check if image is too large (more than MAX_DIMENSION in either dimension)
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      console.log(`Image too large (${width}x${height}), resizing to fit ${MAX_DIMENSION}px max dimension`);
      
      // Preserve aspect ratio
      const resizeOptions = width > height 
        ? { width: MAX_DIMENSION } 
        : { height: MAX_DIMENSION };
        
      processedImageBuffer = await sharp(originalImageBuffer)
        .resize(resizeOptions)
        .jpeg({ quality: 90 })
        .toBuffer();
        
      wasResized = true;
    }
    
    // Convert to base64
    const base64Image = processedImageBuffer.toString('base64');
    
    // Get parameters from the request or use defaults
    const scale = parseInt(req.body.scale || '4', 10);
    const faceEnhance = req.body.face_enhance === 'true';
    
    // Log parameters with resize info
    console.log(`Upscaling with parameters: scale=${scale}, face_enhance=${faceEnhance}${wasResized ? ', image was resized to fit memory constraints' : ''}`);
    
    // Real-ESRGAN model on Replicate
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
        input: { 
          image: `data:image/jpeg;base64,${base64Image}`,
          scale: Math.min(Math.max(scale, 1), 4), // Ensure scale is between 1-4
          face_enhance: faceEnhance
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error from Replicate: ${await response.text()}`);
    }
    
    const prediction = await response.json() as { id: string };
    const final = await waitForPrediction(prediction.id);
    
    // Delete the temporary file
    fs.unlinkSync(filePath);
    
    // Set the result URL (directly from Replicate CDN)
    upscaleJobs[jobId].status = 'done';
    upscaleJobs[jobId].result = final.output;
  } catch (error: any) {
    console.error('Upscale processing error:', error);
    upscaleJobs[jobId].status = 'error';
    upscaleJobs[jobId].error = error.message || 'Unknown upscale error';
  }
}

// Job status endpoint
router.get('/upscale/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = upscaleJobs[jobId];
  
  if (!job) {
    return res.status(404).json({ message: 'Job not found' });
  }
  
  if (job.status === 'done') {
    res.json({ status: job.status, url: job.result });
  } else if (job.status === 'error') {
    res.json({ status: job.status, error: job.error });
  } else {
    res.json({ status: job.status });
  }
});

export default router;