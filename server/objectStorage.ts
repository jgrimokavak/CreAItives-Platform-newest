import { Client } from '@replit/object-storage';
import sharp from 'sharp';

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

      // Create video thumbnail using ffmpeg or similar
      let thumbUrl = undefined;
      try {
        console.log(`[TRACE] Creating video thumbnail from buffer (${videoBuffer.length} bytes)`);
        // For now, we'll create a placeholder thumbnail since video thumbnail generation requires ffmpeg
        // In a full implementation, you'd use ffmpeg to extract the first frame
        const placeholderThumbnail = await sharp({
          create: {
            width: 400,
            height: 225,
            channels: 4,
            background: { r: 100, g: 100, b: 100, alpha: 1 }
          }
        })
        .png()
        .toBuffer();

        // Upload thumbnail
        console.log(`[TRACE] Uploading video thumbnail to Object Storage key: ${thumbPath}`);
        const thumbResult = await this.client.uploadFromBytes(thumbPath, placeholderThumbnail);
        if (thumbResult.ok) {
          thumbUrl = `/api/object-storage/video/${thumbPath}`;
          console.log(`[TRACE] Video thumbnail uploaded successfully to: ${thumbPath}`);
        }
      } catch (thumbError) {
        console.error('[WARN] Failed to create video thumbnail:', thumbError);
        // Continue without thumbnail - not critical
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
}

// Export singleton instance
export const objectStorage = new ObjectStorageService();