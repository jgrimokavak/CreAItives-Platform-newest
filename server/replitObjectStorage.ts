/**
 * Direct Replit Object Storage client for admin operations
 * Uses the official @replit/object-storage API
 */

import { Client } from '@replit/object-storage';

export class ReplitObjectStorageAdmin {
  private client: Client;

  constructor() {
    this.client = new Client();
  }

  /**
   * List all objects in the bucket with full metadata and real file sizes
   */
  async listAllObjects(): Promise<{
    objects: Array<{
      name: string;
      size: number;
      lastModified: Date;
      environment: 'dev' | 'prod' | 'unknown';
      type: 'image' | 'thumbnail' | 'other';
    }>;
    totalSize: number;
  }> {
    try {
      const { ok, value, error } = await this.client.list();
      
      if (!ok) {
        console.error('Failed to list objects:', error);
        throw new Error(`Failed to list objects: ${error}`);
      }

      const objectKeys = value || [];
      const objects: Array<{
        name: string;
        size: number;
        lastModified: Date;
        environment: 'dev' | 'prod' | 'unknown';
        type: 'image' | 'thumbnail' | 'other';
      }> = [];

      // Get real file sizes by downloading each object
      for (const obj of objectKeys) {
        const name = (obj as any).name || (obj as any).key || '';
        if (!name) continue;
        
        let size = 0;
        let lastModified = new Date();

        // Get real size by downloading the object
        try {
          const { ok: downloadOk, value: bytes } = await this.client.downloadAsBytes(name);
          if (downloadOk && bytes) {
            size = bytes.length;
          }
        } catch (downloadError) {
          console.warn(`Could not get size for ${name}:`, downloadError);
          // Fallback to metadata size if available
          const objAny = obj as any;
          size = objAny.size || objAny.contentLength || objAny.length || 0;
        }

        // Try to get lastModified from different possible properties
        const objAny = obj as any;
        if (objAny.lastModified) {
          lastModified = new Date(objAny.lastModified);
        } else if (objAny.timeCreated) {
          lastModified = new Date(objAny.timeCreated);
        } else if (objAny.updated) {
          lastModified = new Date(objAny.updated);
        }

        // Determine environment
        let environment: 'dev' | 'prod' | 'unknown' = 'unknown';
        if (name.startsWith('dev/')) {
          environment = 'dev';
        } else if (name.startsWith('prod/')) {
          environment = 'prod';
        }

        // Determine type
        let type: 'image' | 'thumbnail' | 'other' = 'other';
        if (name.includes('/thumb/')) {
          type = 'thumbnail';
        } else if (name.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
          type = 'image';
        }

        objects.push({
          name,
          size,
          lastModified,
          environment,
          type,
        });
      }

      const totalSize = objects.reduce((sum: number, obj) => sum + obj.size, 0);

      console.log(`Listed ${objects.length} objects, total real size: ${totalSize} bytes (${(totalSize / (1024**2)).toFixed(2)} MB)`);
      
      return {
        objects,
        totalSize,
      };

    } catch (error) {
      console.error('Error listing objects:', error);
      throw error;
    }
  }

  /**
   * Get detailed metadata for a specific object
   */
  async getObjectMetadata(objectName: string): Promise<{
    name: string;
    size: number;
    lastModified: Date;
    exists: boolean;
  }> {
    try {
      // Try to download just the metadata by downloading as bytes and checking size
      const { ok, value, error } = await this.client.downloadAsBytes(objectName);
      
      if (!ok) {
        return {
          name: objectName,
          size: 0,
          lastModified: new Date(),
          exists: false,
        };
      }

      const size = value ? value.length : 0;

      return {
        name: objectName,
        size,
        lastModified: new Date(), // We'll get this from list() instead
        exists: true,
      };

    } catch (error) {
      console.error(`Error getting metadata for ${objectName}:`, error);
      return {
        name: objectName,
        size: 0,
        lastModified: new Date(),
        exists: false,
      };
    }
  }

  /**
   * Delete an object from the bucket
   */
  async deleteObject(objectName: string): Promise<boolean> {
    try {
      const { ok, error } = await this.client.delete(objectName);
      
      if (!ok) {
        console.error(`Failed to delete ${objectName}:`, error);
        return false;
      }

      console.log(`Successfully deleted: ${objectName}`);
      return true;

    } catch (error) {
      console.error(`Error deleting ${objectName}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple objects
   */
  async deleteObjects(objectNames: string[]): Promise<{
    deleted: number;
    failed: number;
    errors: string[];
  }> {
    let deleted = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const objectName of objectNames) {
      try {
        const success = await this.deleteObject(objectName);
        if (success) {
          deleted++;
        } else {
          failed++;
          errors.push(`${objectName}: Delete operation failed`);
        }
      } catch (error) {
        failed++;
        errors.push(`${objectName}: ${error}`);
      }
    }

    return { deleted, failed, errors };
  }

  /**
   * Check if an object exists
   */
  async objectExists(objectName: string): Promise<boolean> {
    try {
      const { ok } = await this.client.downloadAsBytes(objectName);
      return ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get bucket statistics
   */
  async getBucketStats(): Promise<{
    totalObjects: number;
    totalSize: number;
    devObjects: number;
    prodObjects: number;
    devSize: number;
    prodSize: number;
    imageObjects: number;
    thumbnailObjects: number;
  }> {
    const { objects, totalSize } = await this.listAllObjects();

    let devObjects = 0, prodObjects = 0;
    let devSize = 0, prodSize = 0;
    let imageObjects = 0, thumbnailObjects = 0;

    objects.forEach(obj => {
      if (obj.environment === 'dev') {
        devObjects++;
        devSize += obj.size;
      } else if (obj.environment === 'prod') {
        prodObjects++;
        prodSize += obj.size;
      }

      if (obj.type === 'image') {
        imageObjects++;
      } else if (obj.type === 'thumbnail') {
        thumbnailObjects++;
      }
    });

    return {
      totalObjects: objects.length,
      totalSize,
      devObjects,
      prodObjects,
      devSize,
      prodSize,
      imageObjects,
      thumbnailObjects,
    };
  }
}

export const replitStorage = new ReplitObjectStorageAdmin();