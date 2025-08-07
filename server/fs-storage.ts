import { v4 as uuid } from 'uuid';
import sharp from 'sharp';
import { push } from './ws';
import { db } from './db';
import { images } from '@shared/schema';
import { objectStorage } from './objectStorage';

export interface ImageMetadata {
  prompt: string;
  params: any;
  userId: string;
  sources: string[];
}

/**
 * Persist image to Object Storage with environment-aware paths
 * Replaces local filesystem storage with cloud storage
 */
export async function persistImage(b64: string, meta: ImageMetadata, customId?: string): Promise<{
  id: string;
  fullUrl: string;
  thumbUrl: string;
}> {
  // Use provided ID or generate a new one
  const id = customId || uuid();
  const imgBuf = Buffer.from(b64, 'base64');

  try {
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

    // Upload both full image and thumbnail to Object Storage
    const { fullUrl, thumbUrl } = await objectStorage.uploadImage(imgBuf, id, 'png');

    // Format params for database storage
    const dimensionsStr = `${width || 1024}x${height || 1024}`;
    const widthStr = width?.toString() || '1024';
    const heightStr = height?.toString() || '1024';
    const starredStr = 'false';

    // Determine aspect ratio
    let aspectRatio = meta.params.aspect_ratio;
    if (!aspectRatio) {
      // Calculate aspect ratio from width and height
      if (width && height) {
        const ratio = width / height;
        if (Math.abs(ratio - 1) < 0.1) {
          aspectRatio = "1:1";
        } else if (Math.abs(ratio - 1.5) < 0.1) {
          aspectRatio = "3:2";
        } else if (Math.abs(ratio - (4/3)) < 0.1) {
          aspectRatio = "4:3";
        } else if (Math.abs(ratio - (16/9)) < 0.1) {
          aspectRatio = "16:9";
        } else if (ratio > 1.5) {
          aspectRatio = "16:9";
        } else if (ratio < 0.7) {
          aspectRatio = "9:16";
        } else {
          aspectRatio = "1:1";
        }
      } else {
        aspectRatio = "1:1";
      }
    }
    
    // Determine quality (if available in params)
    const quality = meta.params.quality || null;
    
    // Store image metadata in database with Object Storage URLs
    try {
      const record = {
        id: id,
        url: fullUrl,
        prompt: meta.prompt,
        dimensions: dimensionsStr,
      size: data.length, // File size in bytes
        model: meta.params.model || 'gpt-image-1',
        width: widthStr,
        height: heightStr,
        thumbUrl: thumbUrl,
        fullUrl: fullUrl,
        starred: starredStr,
        aspectRatio,
        quality
      };
      
      // Insert the record properly
      const [savedImage] = await db.insert(images).values(record).returning();
      console.log(`[TRACE] DB record written:
        - ID: ${savedImage.id}
        - Full URL: ${savedImage.fullUrl}
        - Thumb URL: ${savedImage.thumbUrl}
        - Created At: ${savedImage.createdAt}`);
      
      // ✅ CRITICAL FIX: Send WebSocket notification to refresh frontend gallery
      const wsPayload = {
        image: {
          id: savedImage.id,
          url: savedImage.fullUrl,
          prompt: savedImage.prompt,
          size: savedImage.size,
          model: savedImage.model,
          createdAt: savedImage.createdAt ? new Date(savedImage.createdAt).toISOString() : new Date().toISOString(),
          width: savedImage.width || '1024',
          height: savedImage.height || '1024',
          fullUrl: savedImage.fullUrl,
          thumbUrl: savedImage.thumbUrl,
          starred: savedImage.starred === "true",
          aspectRatio: savedImage.aspectRatio,
          quality: savedImage.quality,
          deletedAt: savedImage.deletedAt ? new Date(savedImage.deletedAt).toISOString() : null
        }
      };
      console.log(`[TRACE] Sending WebSocket imageCreated event:`, JSON.stringify(wsPayload));
      push('imageCreated', wsPayload);
      
    } catch (error) {
      console.error('Error inserting image record:', error);
      // Continue even if database insertion fails - image is still in Object Storage
    }

    return {
      id,
      fullUrl,
      thumbUrl
    };
  } catch (error) {
    console.error('Error persisting image to Object Storage:', error);
    throw error;
  }
}