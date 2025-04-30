import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import sharp from 'sharp';
import prisma from './prisma';
import { push } from './ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create upload directories if they don't exist
const initializeDirs = () => {
  const root = path.join(__dirname, '../uploads');
  ['full', 'thumb'].forEach(d => fs.mkdirSync(path.join(root, d), { recursive: true }));
};

// Initialize directories on import
initializeDirs();

export interface ImageMetadata {
  prompt: string;
  params: any;
  userId: string;
  sources: string[];
}

export async function persistImage(b64: string, meta: ImageMetadata): Promise<{
  id: string;
  fullUrl: string;
  thumbUrl: string;
}> {
  const id = uuid();
  const imgBuf = Buffer.from(b64, 'base64');
  // Use the same root path as in initializeDirs for consistency
  const root = path.join(__dirname, '../uploads');

  // Get image metadata
  const { width, height } = await sharp(imgBuf).metadata();

  // Generate thumbnail
  const thumbBuf = await sharp(imgBuf).resize(256).png().toBuffer();

  // Define paths
  const fullPath = `full/${id}.png`;
  const thumbPath = `thumb/${id}.png`;

  // Write files
  fs.writeFileSync(path.join(root, fullPath), imgBuf);
  fs.writeFileSync(path.join(root, thumbPath), thumbBuf);

  // Create database record
  const image = await prisma.image.create({
    data: {
      id,
      userId: meta.userId,
      prompt: meta.prompt,
      model: meta.params.model || 'gpt-image-1',
      params: meta.params,
      width: width || 1024, // Default if undefined
      height: height || 1024, // Default if undefined
      path: fullPath,
      thumbPath: thumbPath,
      sources: {
        create: meta.sources.map(src => ({
          path: src,
          thumbPath: '' // Fill if you store source thumbs
        }))
      }
    }
  });

  // Create URLs for the image
  const fullUrl = `/uploads/${fullPath}`;
  const thumbUrl = `/uploads/${thumbPath}`;

  // Notify connected clients
  push('imageCreated', {
    image: {
      ...image,
      fullUrl,
      thumbUrl
    }
  });

  return {
    id: image.id,
    fullUrl,
    thumbUrl
  };
}