import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import FormData from 'form-data';
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
    try {
      upscaleJobs[jobId].status = 'processing';
      
      // Call Replicate API for Real-ESRGAN upscaling
      const filePath = req.file.path;
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Get parameters from the request or use defaults
      const enhanceModel = req.body.enhance_model || 'Standard V2';
      const upscaleFactor = req.body.upscale_factor || '4x';
      const faceEnhancement = req.body.face_enhancement === 'true';
      
      console.log(`Upscaling with parameters: enhance_model=${enhanceModel}, upscale_factor=${upscaleFactor}, face_enhancement=${faceEnhancement}`);
      
      // Topaz Photo Enhance model on Replicate
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Updated to use a valid model version for topazlabs/photo-enhance
          version: "3683731c45a47e1d9cfe6db203160152683ca6cac69fea35d3b935e52f447a91",
          input: { 
            image: `data:image/jpeg;base64,${base64Image}`,
            enhance_model: enhanceModel,
            upscale_factor: upscaleFactor,
            face_enhancement: faceEnhancement,
            // Hidden parameters with defaults
            output_format: "png",
            subject_detection: "None",
            face_enhancement_creativity: 1,
            face_enhancement_strength: 1
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
      console.error('Upscale error:', error);
      upscaleJobs[jobId].status = 'error';
      upscaleJobs[jobId].error = error.message || 'Unknown upscale error';
    }
  } catch (error: any) {
    console.error('Upscale request error:', error);
    res.status(500).json({ message: 'Server error during upscale' });
  }
});

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