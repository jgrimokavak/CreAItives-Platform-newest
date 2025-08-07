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
   * List all objects in the bucket with basic metadata (without downloading for size)
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
      const objects = objectKeys.map((obj: any) => {
        const name = obj.name || obj.key || '';
        let lastModified = new Date();

        // Try to get lastModified from different possible properties
        if (obj.lastModified) {
          lastModified = new Date(obj.lastModified);
        } else if (obj.timeCreated) {
          lastModified = new Date(obj.timeCreated);
        } else if (obj.updated) {
          lastModified = new Date(obj.updated);
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

        return {
          name,
          size: 0, // Will be populated from database
          lastModified,
          environment,
          type,
        };
      });

      console.log(`Listed ${objects.length} objects from bucket`);
      
      return {
        objects,
        totalSize: 0, // Will be calculated from database
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