import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import sharp from 'sharp';
import { push } from './ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db } from './db';
import { images } from '@shared/schema';

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

export async function persistImage(b64: string, meta: ImageMetadata, customId?: string): Promise<{
  id: string;
  fullUrl: string;
  thumbUrl: string;
}> {
  // Use provided ID or generate a new one
  const id = customId || uuid();
  const imgBuf = Buffer.from(b64, 'base64');
  // Use the same root path as in initializeDirs for consistency
  const root = path.join(__dirname, '../uploads');

  // Get image metadata
  const { width, height } = await sharp(imgBuf).metadata();

  // Generate optimized WebP thumbnail with proper aspect ratio
  const thumbBuf = await sharp(imgBuf)
    .resize({
      width: 256, // Smaller size for faster loading
      height: 256,
      fit: 'inside', // Maintain aspect ratio
      withoutEnlargement: true, // Don't enlarge small images
    })
    .webp({ quality: 90 }) // WebP format for better compression while preserving quality
    .toBuffer();

  // Define paths - full image as PNG, thumbnail as WebP
  const fullPath = `full/${id}.png`;
  const thumbPath = `thumb/${id}.webp`;

  // Write files
  fs.writeFileSync(path.join(root, fullPath), imgBuf);
  fs.writeFileSync(path.join(root, thumbPath), thumbBuf);

  // Format params for storage - convert to JSON string
  const paramsStr = JSON.stringify(meta.params);
  const sizeStr = `${width || 1024}x${height || 1024}`;
  const widthStr = width?.toString() || '1024';
  const heightStr = height?.toString() || '1024';
  const starredStr = 'false';

  // Use Drizzle ORM instead of Prisma to store image metadata
  try {
    // Determine aspect ratio
    let aspectRatio = meta.params.aspect_ratio;
    
    // Check if we need to calculate the aspect ratio
    if (!aspectRatio) {
      // Try to infer from dimensions
      if (width && height) {
        // Map common dimensions to standard aspect ratios
        const ratioMap: Record<string, string> = {
          "1024x1024": "1:1",
          "1024x1792": "9:16",
          "1792x1024": "16:9",
          "1024x1536": "2:3",
          "1536x1024": "3:2"
        };
        
        aspectRatio = ratioMap[sizeStr] || "1:1";
        
        // For custom sizes not in our map, try to determine common ratios
        if (!ratioMap[sizeStr]) {
          if (width === height) {
            aspectRatio = "1:1";
          } else if (Math.abs(width/height - 16/9) < 0.01) {
            aspectRatio = "16:9";
          } else if (Math.abs(height/width - 16/9) < 0.01) {
            aspectRatio = "9:16";
          }
        }
      } else {
        // Default to 1:1 if we can't determine
        aspectRatio = "1:1";
      }
    }
    
    // Determine quality (if available in params)
    const quality = meta.params.quality || null;
    
    // Create a single object matching the schema
    const record = {
      id: id,
      url: `/uploads/${fullPath}`,
      prompt: meta.prompt,
      size: sizeStr,
      model: meta.params.model || 'gpt-image-1',
      width: widthStr,
      height: heightStr,
      thumbUrl: `/uploads/${thumbPath}`,
      fullUrl: `/uploads/${fullPath}`,
      starred: starredStr,
      aspectRatio,
      quality
    };
    
    // Insert the record properly
    const imageRecords = await db.insert(images).values(record).returning();
    const imageRecord = imageRecords[0];
    console.log(`Successfully inserted image record: ${id}`);
  } catch (error) {
    console.error('Error inserting image record:', error);
    // We'll continue even if database insertion fails
    // The image files are still saved to disk
  }

  // Create URLs for the image
  const fullUrl = `/uploads/${fullPath}`;
  const thumbUrl = `/uploads/${thumbPath}`;

  // We're no longer using WebSocket broadcast here
  // The routes.ts will handle notifying clients about new images when
  // it calls storage.saveImage() after this function returns
  // This prevents duplicate image entries in the gallery

  return {
    id,
    fullUrl,
    thumbUrl
  };
}