/**
 * Gallery Synchronization Utility
 * 
 * Provides functions to synchronize database records with actual files
 * and clean up orphaned records that point to non-existent files
 */

import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { images } from '@shared/schema';
import { isNull } from 'drizzle-orm';

export interface SyncReport {
  totalRecords: number;
  orphanedRecords: number;
  cleanedRecords: number;
  validRecords: number;
}

/**
 * Get environment-aware upload directory using Replit deployment detection
 */
function getEnvironmentUploadDir(): string {
  const isDeployed = process.env.REPLIT_DEPLOYMENT === '1';
  const envPrefix = isDeployed ? 'prod' : 'dev';
  return path.join(process.cwd(), 'uploads', envPrefix);
}

/**
 * Check if an image file exists on the file system (environment-aware)
 */
async function imageFileExists(imageId: string): Promise<boolean> {
  try {
    // For Object Storage, check if files exist in the Object Storage bucket
    const { ObjectStorageService } = await import('../objectStorage');
    const objectStorage = new ObjectStorageService();
    
    const envPrefix = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    const fullPath = `${envPrefix}/${imageId}.png`;
    const thumbPath = `${envPrefix}/thumb/${imageId}.webp`;
    
    // Check if both full image and thumbnail exist in Object Storage
    try {
      await objectStorage.downloadImage(fullPath);
      await objectStorage.downloadImage(thumbPath);
      return true;
    } catch (error) {
      // If either file doesn't exist, consider the image invalid
      console.log(`Image ${imageId} missing from Object Storage:`, error.message);
      return false;
    }
  } catch (error) {
    console.error(`Error checking Object Storage for image ${imageId}:`, error);
    return false;
  }
}

/**
 * Find orphaned database records (records with no corresponding files)
 */
export async function findOrphanedRecords(): Promise<string[]> {
  try {
    // Get all non-deleted image records
    const allImages = await db.select({ id: images.id }).from(images).where(isNull(images.deletedAt));
    
    const orphanedIds: string[] = [];
    
    for (const image of allImages) {
      const exists = await imageFileExists(image.id);
      if (!exists) {
        orphanedIds.push(image.id);
      }
    }
    
    return orphanedIds;
  } catch (error) {
    console.error('Error finding orphaned records:', error);
    throw error;
  }
}

/**
 * Clean up orphaned database records (soft delete)
 */
export async function cleanupOrphanedRecords(): Promise<SyncReport> {
  try {
    console.log('Starting gallery synchronization...');
    
    // Get total record count
    const totalRecords = await db.select({ count: images.id }).from(images).where(isNull(images.deletedAt));
    const totalCount = totalRecords.length;
    
    // Find orphaned records
    const orphanedIds = await findOrphanedRecords();
    const orphanedCount = orphanedIds.length;
    
    let cleanedCount = 0;
    
    if (orphanedCount > 0) {
      console.log(`Found ${orphanedCount} orphaned records. Soft deleting...`);
      
      // Soft delete orphaned records by setting deletedAt
      const now = new Date();
      for (const orphanedId of orphanedIds) {
        const { eq } = await import('drizzle-orm');
        await db.update(images)
          .set({ deletedAt: now })
          .where(eq(images.id, orphanedId));
        cleanedCount++;
      }
      
      console.log(`Successfully cleaned ${cleanedCount} orphaned records`);
    } else {
      console.log('No orphaned records found');
    }
    
    const validRecords = totalCount - orphanedCount;
    
    const report: SyncReport = {
      totalRecords: totalCount,
      orphanedRecords: orphanedCount,
      cleanedRecords: cleanedCount,
      validRecords: validRecords
    };
    
    console.log('Gallery sync report:', report);
    return report;
    
  } catch (error) {
    console.error('Error during gallery sync:', error);
    throw error;
  }
}

/**
 * Manual gallery sync - can be called via API for immediate cleanup
 */
export async function manualGallerySync(): Promise<SyncReport> {
  console.log('Manual gallery synchronization triggered');
  return await cleanupOrphanedRecords();
}