import { Client } from '@replit/object-storage';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Environment-aware Object Storage service for kavak-gallery bucket
export class ObjectStorageService {
  private client: Client;

  constructor() {
    // Initialize client - it will automatically use the default bucket
    this.client = new Client();
  }

  /**
   * Get environment-aware path prefix (dev/ or prod/)
   */
  private getEnvironmentPrefix(): string {
    const isDeployed = process.env.REPLIT_DEPLOYMENT === '1';
    return isDeployed ? 'prod' : 'dev';
  }

  /**
   * Upload reference image to Object Storage and return URL
   */
  async uploadReferenceImage(imageBuffer: Buffer, videoId: string): Promise<string> {
    const envPrefix = this.getEnvironmentPrefix();
    const imagePath = `${envPrefix}/video-generations/reference-images/${videoId}.jpg`;

    try {
      console.log(`[TRACE] Uploading reference image to Object Storage key: ${imagePath}`);
      const uploadResult = await this.client.uploadFromBytes(imagePath, imageBuffer);
      if (!uploadResult.ok) {
        throw new Error('Failed to upload reference image');
      }
      console.log(`[TRACE] Reference image uploaded successfully to: ${imagePath}`);
      
      // Return the server-side URL for serving the reference image
      return `/api/object-storage/video/${imagePath}`;
    } catch (error) {
      console.error('Error uploading reference image:', error);
      throw new Error('Failed to upload reference image');
    }
  }

  /**
   * Upload image buffer to Object Storage with environment-aware path
   */
  async uploadVideo(videoBuffer: Buffer, videoId: string, fileExtension: string = 'mp4'): Promise<{
    fullUrl: string;
    thumbUrl?: string;
  }> {
    const envPrefix = this.getEnvironmentPrefix();
    const fullPath = `${envPrefix}/video-generations/${videoId}.${fileExtension}`;
    const thumbPath = `${envPrefix}/video-generations/thumbs/${videoId}.webp`;

    try {
      // Upload video using correct uploadFromBytes method
      console.log(`[TRACE] Uploading video to Object Storage key: ${fullPath}`);
      const uploadResult = await this.client.uploadFromBytes(fullPath, videoBuffer);
      if (!uploadResult.ok) {
        throw new Error('Failed to upload video');
      }
      console.log(`[TRACE] Video uploaded successfully to: ${fullPath}`);

      // Create video thumbnail using ffmpeg
      let thumbUrl = undefined;
      try {
        console.log(`[TRACE] Creating video thumbnail from buffer (${videoBuffer.length} bytes)`);
        const thumbnailBuffer = await this.extractVideoThumbnail(videoBuffer);
        
        // Upload thumbnail
        console.log(`[TRACE] Uploading video thumbnail to Object Storage key: ${thumbPath}`);
        const thumbResult = await this.client.uploadFromBytes(thumbPath, thumbnailBuffer);
        if (thumbResult.ok) {
          thumbUrl = `/api/object-storage/video/${thumbPath}`;
          console.log(`[TRACE] Video thumbnail uploaded successfully to: ${thumbPath}`);
        }
      } catch (thumbError) {
        console.error('[WARN] Failed to create video thumbnail:', thumbError);
        // Create fallback placeholder thumbnail
        try {
          const placeholderThumbnail = await sharp({
            create: {
              width: 400,
              height: 225,
              channels: 4,
              background: { r: 71, g: 85, b: 105, alpha: 1 }
            }
          })
          .png()
          .toBuffer();

          const thumbResult = await this.client.uploadFromBytes(thumbPath, placeholderThumbnail);
          if (thumbResult.ok) {
            thumbUrl = `/api/object-storage/video/${thumbPath}`;
            console.log(`[TRACE] Fallback thumbnail uploaded successfully`);
          }
        } catch (fallbackError) {
          console.error('[WARN] Failed to create fallback thumbnail:', fallbackError);
        }
      }

      const urls = {
        fullUrl: `/api/object-storage/video/${fullPath}`,
        thumbUrl
      };
      
      console.log(`[TRACE] Returning video URLs:`, JSON.stringify(urls));
      return urls;
    } catch (error) {
      console.error(`[ERROR] Failed to upload video ${videoId}:`, error);
      throw error;
    }
  }

  async uploadImage(imageBuffer: Buffer, imageId: string, fileExtension: string = 'png'): Promise<{
    fullUrl: string;
    thumbUrl: string;
  }> {
    const envPrefix = this.getEnvironmentPrefix();
    const fullPath = `${envPrefix}/${imageId}.${fileExtension}`;
    const thumbPath = `${envPrefix}/thumb/${imageId}.webp`;

    try {
      // Upload full image using correct uploadFromBytes method
      console.log(`[TRACE] Uploading to Object Storage key: ${fullPath}`);
      const uploadResult1 = await this.client.uploadFromBytes(fullPath, imageBuffer);
      if (!uploadResult1.ok) {
        throw new Error('Failed to upload full image');
      }
      console.log(`[TRACE] Full image uploaded successfully to: ${fullPath}`);

      // Create WebP thumbnail
      console.log(`[TRACE] Creating thumbnail from image buffer (${imageBuffer.length} bytes)`);
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(400, 400, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .webp({ quality: 80 })
        .toBuffer();
      console.log(`[TRACE] Thumbnail created: ${thumbnailBuffer.length} bytes`);

      // Upload thumbnail
      console.log(`[TRACE] Uploading thumbnail to Object Storage key: ${thumbPath}`);
      const uploadResult2 = await this.client.uploadFromBytes(thumbPath, thumbnailBuffer);  
      if (!uploadResult2.ok) {
        throw new Error('Failed to upload thumbnail');
      }
      console.log(`[TRACE] Thumbnail uploaded successfully to: ${thumbPath}`);

      const urls = {
        fullUrl: `/api/object-storage/image/${fullPath}`,
        thumbUrl: `/api/object-storage/image/${thumbPath}`,
      };
      
      console.log(`[TRACE] Returning URLs:`, JSON.stringify(urls));
      return urls;
    } catch (error) {
      console.error('Error uploading to Object Storage:', error);
      throw new Error(`Failed to upload image: ${error}`);
    }
  }

  /**
   * Download image from Object Storage
   */
  async downloadImage(path: string): Promise<Buffer> {
    try {
      const result = await this.client.downloadAsBytes(path);
      
      if (result && typeof result === 'object' && 'ok' in result) {
        if (result.ok) {
          return result.value[0] as Buffer;
        } else {
          throw new Error('Download failed');
        }
      } else {
        // Direct buffer response
        return result as Buffer;
      }
    } catch (error) {
      console.error(`Error downloading image from path ${path}:`, error);
      throw new Error(`Failed to download image: ${error}`);
    }
  }

  /**
   * Generic method to upload any data buffer to object storage
   */
  async uploadData(dataBuffer: Buffer, path: string): Promise<void> {
    try {
      console.log(`[TRACE] Uploading data to Object Storage key: ${path}`);
      const uploadResult = await this.client.uploadFromBytes(path, dataBuffer);
      if (!uploadResult.ok) {
        throw new Error('Failed to upload data');
      }
      console.log(`[TRACE] Data uploaded successfully to: ${path}`);
    } catch (error) {
      console.error('Error uploading data to Object Storage:', error);
      throw new Error(`Failed to upload data: ${error}`);
    }
  }

  /**
   * Generic method to download any data from object storage
   */
  async downloadData(path: string): Promise<Buffer> {
    try {
      const result = await this.client.downloadAsBytes(path);
      
      if (result && typeof result === 'object' && 'ok' in result) {
        if (result.ok) {
          return result.value[0] as Buffer;
        } else {
          throw new Error('Download failed');
        }
      } else {
        // Direct buffer response
        return result as Buffer;
      }
    } catch (error) {
      console.error(`Error downloading data from path ${path}:`, error);
      throw new Error(`Failed to download data: ${error}`);
    }
  }

  /**
   * Debug method to list all objects in object storage
   */
  async debugListAllObjects(): Promise<Array<{ path: string; size: number; lastModified?: Date }>> {
    try {
      const result = await this.client.list();
      console.log('Debug list result:', { ok: result.ok, valueLength: result.value?.length || 0 });
      
      if (result.ok && Array.isArray(result.value)) {
        return result.value.map((obj: any) => ({
          path: obj.path || obj.name || obj.key || 'unknown',
          size: obj.size || 0,
          lastModified: obj.lastModified ? new Date(obj.lastModified) : undefined,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error listing all objects:', error);
      return [];
    }
  }

  /**
   * List all images in current environment with pagination support
   */
  async listImages(cursor?: string, limit: number = 50): Promise<{
    images: Array<{ path: string; lastModified: Date; size: number }>;
    nextCursor?: string;
  }> {
    const envPrefix = this.getEnvironmentPrefix();
    
    try {
      console.log(`Listing images with prefix: ${envPrefix}/`);
      
      // Use correct API format: { ok: boolean, value: StorageObject[] }
      const result = await this.client.list({ prefix: `${envPrefix}/` });
      console.log('List result:', { ok: result.ok, valueLength: result.value?.length || 0 });
      
      let objectList: any[] = [];
      
      if (result.ok && Array.isArray(result.value)) {
        objectList = result.value;
      } else {
        console.log('No objects found or invalid result format');
        objectList = [];
      }

      console.log(`Found ${objectList.length} objects in Object Storage`);

      // Filter out thumbnails to get only full images
      const images = objectList
        .filter((obj: any) => {
          const path = obj.path || obj.name || '';
          return path.startsWith(`${envPrefix}/`) && !path.includes('/thumb/');
        })
        .slice(0, limit)
        .map((obj: any) => ({
          path: obj.path || obj.name || '',
          lastModified: obj.lastModified ? new Date(obj.lastModified) : new Date(),
          size: obj.size || 0,
        }));

      return {
        images,
        nextCursor: images.length === limit ? 'next' : undefined,
      };
    } catch (error) {
      console.error('Error listing images from Object Storage:', error);
      throw new Error(`Failed to list images: ${error}`);
    }
  }

  /**
   * Delete image from Object Storage
   */
  async deleteImage(imageId: string, fileExtension: string = 'png'): Promise<void> {
    const envPrefix = this.getEnvironmentPrefix();
    const fullPath = `${envPrefix}/${imageId}.${fileExtension}`;
    const thumbPath = `${envPrefix}/thumb/${imageId}.webp`;

    try {
      // Delete both full image and thumbnail
      const [fullResult, thumbResult] = await Promise.all([
        this.client.delete(fullPath),
        this.client.delete(thumbPath),
      ]);

      // Check if deletions were successful
      if (!fullResult.ok) {
        console.warn(`Failed to delete full image ${fullPath}:`, fullResult.error);
      }
      if (!thumbResult.ok) {
        console.warn(`Failed to delete thumbnail ${thumbPath}:`, thumbResult.error);
      }

      console.log(`Deleted image from Object Storage: ${fullPath} and ${thumbPath}`);
    } catch (error) {
      console.error('Error deleting from Object Storage:', error);
      throw new Error(`Failed to delete image: ${error}`);
    }
  }

  /**
   * Check if image exists in Object Storage
   */
  async imageExists(imageId: string, fileExtension: string = 'png'): Promise<boolean> {
    const envPrefix = this.getEnvironmentPrefix();
    const fullPath = `${envPrefix}/${imageId}.${fileExtension}`;

    try {
      const result = await this.client.exists(fullPath);
      return result && typeof result === 'object' && 'ok' in result ? result.ok : !!result;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get image metadata including size
   */
  async getImageMetadata(imagePath: string): Promise<{ size: number } | null> {
    try {
      // For now, return a default size estimate since we can't get actual metadata
      // In a real implementation, we'd query the storage service for file metadata
      return { size: 1024 * 50 }; // Estimate 50KB per image
    } catch (error) {
      console.warn(`Could not get metadata for ${imagePath}:`, error);
      return null;
    }
  }

  /**
   * Get all images for gallery with full pagination support
   */
  async getAllImagesForGallery(options?: {
    cursor?: string;
    limit?: number;
    starred?: boolean;
    trash?: boolean;
    searchQuery?: string;
  }): Promise<{
    images: Array<{
      id: string;
      url: string;
      thumbUrl: string;
      path: string;
      lastModified: Date;
      size: number;
    }>;
    nextCursor?: string;
  }> {
    const { cursor, limit = 50 } = options || {};
    
    const result = await this.listImages(cursor, limit);
    
    const images = result.images.map(img => {
      // Extract image ID from path (e.g., "dev/image123.png" -> "image123")
      const filename = img.path.split('/').pop() || '';
      const id = filename.replace(/\.[^/.]+$/, ''); // Remove file extension
      
      const envPrefix = this.getEnvironmentPrefix();
      
      return {
        id,
        url: `/api/object-storage/image/${img.path}`,
        thumbUrl: `/api/object-storage/image/${envPrefix}/thumb/${id}.webp`,
        path: img.path,
        lastModified: img.lastModified,
        size: img.size,
      };
    });

    return {
      images,
      nextCursor: result.nextCursor,
    };
  }

  /**
   * Wipe all images from Object Storage (dev environment only)
   */
  async wipeAllImages(): Promise<void> {
    const envPrefix = this.getEnvironmentPrefix();
    
    try {
      // List all objects in the bucket
      const listResult = await this.client.list();
      
      if (!listResult || !listResult.ok) {
        console.log('Failed to list objects from Object Storage');
        return;
      }
      
      const objects = listResult.value || [];
      
      if (objects.length > 0) {
        console.log(`Wiping ${objects.length} objects from Object Storage...`);
        
        // Delete all objects
        for (const obj of objects) {
          const objPath = obj.name || (obj as any).path || (obj as any).key;
          if (objPath) {
            try {
              await this.client.delete(objPath);
            } catch (deleteError) {
              console.error(`Failed to delete ${objPath}:`, deleteError);
            }
          }
        }
        
        console.log(`Wiped ${objects.length} objects from Object Storage`);
      } else {
        console.log('No objects found in Object Storage to wipe');
      }
      
    } catch (error) {
      console.error('Error wiping Object Storage:', error);
      throw error;
    }
  }

  /**
   * Upload temporary marketplace reference images
   */
  async uploadTempMarketplaceImages(imageBuffers: Buffer[], batchId: string): Promise<string[]> {
    const envPrefix = this.getEnvironmentPrefix();
    const urls: string[] = [];
    
    for (let i = 0; i < imageBuffers.length; i++) {
      const imageId = `ref-${i + 1}`;
      const imagePath = `${envPrefix}/temp-marketplace/${batchId}/${imageId}.png`;
      
      try {
        console.log(`[MP][TEMP] Uploading reference image ${i + 1}/${imageBuffers.length} to: ${imagePath}`);
        const uploadResult = await this.client.uploadFromBytes(imagePath, imageBuffers[i]);
        if (!uploadResult.ok) {
          throw new Error(`Failed to upload reference image ${i + 1}`);
        }
        
        const publicUrl = `/api/object-storage/image/${imagePath}`;
        urls.push(publicUrl);
        console.log(`[MP][TEMP] Reference image ${i + 1} uploaded: ${publicUrl}`);
      } catch (error) {
        console.error(`Error uploading reference image ${i + 1}:`, error);
        throw new Error(`Failed to upload reference image ${i + 1}: ${error}`);
      }
    }
    
    return urls;
  }

  /**
   * Clean up temporary marketplace images for a batch
   */
  async cleanupTempMarketplaceImages(batchId: string): Promise<void> {
    const envPrefix = this.getEnvironmentPrefix();
    const batchPrefix = `${envPrefix}/temp-marketplace/${batchId}/`;
    
    try {
      console.log(`[MP][CLEANUP] Starting cleanup for batch: ${batchId}`);
      
      // List all objects with the batch prefix
      const listResult = await this.client.list({ prefix: batchPrefix });
      
      if (!listResult.ok || !listResult.value) {
        console.log(`[MP][CLEANUP] No objects found for batch ${batchId}`);
        return;
      }
      
      const objects = listResult.value;
      console.log(`[MP][CLEANUP] Found ${objects.length} temp objects to delete for batch ${batchId}`);
      
      // Delete each object
      for (const obj of objects) {
        const objPath = obj.name || (obj as any).path || (obj as any).key;
        if (objPath) {
          try {
            await this.client.delete(objPath);
            console.log(`[MP][CLEANUP] Deleted: ${objPath}`);
          } catch (deleteError) {
            console.error(`[MP][CLEANUP] Failed to delete ${objPath}:`, deleteError);
          }
        }
      }
      
      console.log(`[MP][CLEANUP] Cleanup completed for batch ${batchId}`);
    } catch (error) {
      console.error(`[MP][CLEANUP] Error during cleanup for batch ${batchId}:`, error);
    }
  }

  /**
   * Clean up old temporary marketplace images (older than specified hours)
   */
  async cleanupOldTempMarketplaceImages(olderThanHours: number = 6): Promise<void> {
    const envPrefix = this.getEnvironmentPrefix();
    const tempPrefix = `${envPrefix}/temp-marketplace/`;
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    try {
      console.log(`[MP][CLEANUP] Starting cleanup of temp images older than ${olderThanHours} hours`);
      
      // List all temp marketplace objects
      const listResult = await this.client.list({ prefix: tempPrefix });
      
      if (!listResult.ok || !listResult.value) {
        console.log(`[MP][CLEANUP] No temp marketplace objects found`);
        return;
      }
      
      const objects = listResult.value;
      let deletedCount = 0;
      
      for (const obj of objects) {
        const objPath = obj.name || (obj as any).path || (obj as any).key;
        const lastModified = (obj as any).lastModified ? new Date((obj as any).lastModified) : new Date(0);
        
        if (objPath && lastModified < cutoffTime) {
          try {
            await this.client.delete(objPath);
            deletedCount++;
            console.log(`[MP][CLEANUP] Deleted old temp file: ${objPath}`);
          } catch (deleteError) {
            console.error(`[MP][CLEANUP] Failed to delete old temp file ${objPath}:`, deleteError);
          }
        }
      }
      
      console.log(`[MP][CLEANUP] Cleanup completed. Deleted ${deletedCount} old temp files.`);
    } catch (error) {
      console.error(`[MP][CLEANUP] Error during old temp files cleanup:`, error);
    }
  }

  /**
   * Extract first frame from video buffer and return as optimized thumbnail
   */
  private async extractVideoThumbnail(videoBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // Create temporary file for video
      const tempDir = '/tmp';
      const videoPath = path.join(tempDir, `video_${Date.now()}.mp4`);
      const thumbPath = path.join(tempDir, `thumb_${Date.now()}.png`);
      
      try {
        // Write video buffer to temporary file
        fs.writeFileSync(videoPath, videoBuffer);
        
        // Extract first frame using ffmpeg
        const ffmpeg = spawn('ffmpeg', [
          '-i', videoPath,           // Input video
          '-ss', '00:00:01',         // Seek to 1 second (skip potential black frames)
          '-vframes', '1',           // Extract 1 frame
          '-f', 'image2',            // Output format
          '-vf', 'scale=400:225',    // Resize to 400x225
          '-q:v', '2',               // High quality
          '-y',                      // Overwrite output
          thumbPath                  // Output path
        ]);

        let stderr = '';
        ffmpeg.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        ffmpeg.on('close', async (code) => {
          try {
            // Clean up input video file
            if (fs.existsSync(videoPath)) {
              fs.unlinkSync(videoPath);
            }
            
            if (code === 0 && fs.existsSync(thumbPath)) {
              // Read and optimize the thumbnail
              const rawThumb = fs.readFileSync(thumbPath);
              const optimizedThumb = await sharp(rawThumb)
                .webp({ quality: 85 })
                .toBuffer();
              
              // Clean up temporary thumbnail
              fs.unlinkSync(thumbPath);
              
              resolve(optimizedThumb);
            } else {
              reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`));
            }
          } catch (error) {
            // Clean up files on error
            [videoPath, thumbPath].forEach(filePath => {
              try {
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                }
              } catch (cleanupError) {
                console.warn(`Failed to clean up ${filePath}:`, cleanupError);
              }
            });
            reject(error);
          }
        });

        ffmpeg.on('error', (error) => {
          // Clean up files on error
          [videoPath, thumbPath].forEach(filePath => {
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
            } catch (cleanupError) {
              console.warn(`Failed to clean up ${filePath}:`, cleanupError);
            }
          });
          reject(error);
        });
      } catch (error) {
        // Clean up files on error
        [videoPath, thumbPath].forEach(filePath => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (cleanupError) {
            console.warn(`Failed to clean up ${filePath}:`, cleanupError);
          }
        });
        reject(error);
      }
    });
  }
}

// Export singleton instance
export const objectStorage = new ObjectStorageService();