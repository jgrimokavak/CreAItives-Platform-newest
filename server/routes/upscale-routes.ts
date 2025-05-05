import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import Replicate from 'replicate';

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

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

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
      
      // Prepare the image
      const filePath = req.file.path;
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Get parameters from the request or use defaults
      const enhanceModel = req.body.enhance_model || 'Standard V2';
      const upscaleFactor = req.body.upscale_factor || '4x';
      const faceEnhancement = req.body.face_enhancement === 'true';
      
      console.log(`Upscaling with parameters: enhance_model=${enhanceModel}, upscale_factor=${upscaleFactor}, face_enhancement=${faceEnhancement}`);
      
      // Prepare input for Topaz Labs model
      const input = {
        image: `data:image/jpeg;base64,${base64Image}`,
        enhance_model: enhanceModel,
        upscale_factor: upscaleFactor,
        face_enhancement: faceEnhancement,
        // Hidden parameters with defaults
        output_format: "png",
        subject_detection: "None",
        face_enhancement_creativity: 1,
        face_enhancement_strength: 1
      };
      
      // Run the prediction using the Replicate SDK
      const output = await replicate.run(
        "topazlabs/image-upscale", // Use the correct model name
        { input }
      ) as unknown;
      
      // Delete the temporary file
      fs.unlinkSync(filePath);
      
      // Log output type for debugging
      console.log('Replicate output type:', typeof output);
      console.log('Replicate output value:', JSON.stringify(output).substring(0, 200) + '...');
      
      // Set the result URL
      upscaleJobs[jobId].status = 'done';
      // Handle the output which can be a string URL or an array (where first item is the URL)
      upscaleJobs[jobId].result = typeof output === 'string' 
        ? output 
        : Array.isArray(output) && output.length > 0
          ? output[0]
          : typeof output === 'object' && output !== null && 'url' in output
            ? (output as any).url
            : '';
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