import { Router } from 'express';
import { objectStorage } from '../objectStorage';
import { db } from '../db';
import { images } from '@shared/schema';
import { desc, gte, lte, and, sql } from 'drizzle-orm';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

const router = Router();

// Admin-only middleware (assumes existing admin auth is already applied)

/**
 * Get comprehensive storage statistics
 */
router.get('/storage/stats', async (req, res) => {
  try {
    console.log('Admin: Fetching storage statistics...');
    
    // Get bucket objects
    const { ok, value: objects, error } = await objectStorage.client.list();
    
    if (!ok) {
      console.error('Error listing bucket objects:', error);
      return res.status(500).json({ error: 'Failed to fetch storage data' });
    }

    const envPrefix = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    
    // Calculate storage metrics
    let totalSizeBytes = 0;
    let devCount = 0;
    let prodCount = 0;
    
    objects.forEach((obj: any) => {
      const size = obj.size || 0;
      totalSizeBytes += size;
      
      if (obj.name?.startsWith('dev/')) {
        devCount++;
      } else if (obj.name?.startsWith('prod/')) {
        prodCount++;
      }
    });

    const totalSizeGiB = totalSizeBytes / (1024 * 1024 * 1024);
    const estimatedMonthlyCost = totalSizeGiB * 0.03; // $0.03 per GiB/month
    
    // Get upload activity for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyUploads = await db
      .select({
        date: sql<string>`DATE(${images.createdAt})`,
        count: sql<number>`COUNT(*)`
      })
      .from(images)
      .where(gte(images.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${images.createdAt})`)
      .orderBy(sql`DATE(${images.createdAt})`);

    console.log(`Storage stats: ${objects.length} objects, ${totalSizeGiB.toFixed(3)} GiB`);
    
    res.json({
      totalObjects: objects.length,
      totalSizeBytes,
      totalSizeGiB: Number(totalSizeGiB.toFixed(3)),
      estimatedMonthlyCost: Number(estimatedMonthlyCost.toFixed(2)),
      environments: {
        dev: devCount,
        prod: prodCount,
        current: envPrefix
      },
      bucketId: process.env.BUCKET_NAME || 'kavak-gallery',
      dailyUploads: dailyUploads.map(item => ({
        date: item.date,
        count: Number(item.count)
      }))
    });
    
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get paginated list of storage objects with filtering
 */
router.get('/storage/objects', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '50',
      environment,
      dateFrom,
      dateTo,
      minSize,
      maxSize
    } = req.query;

    console.log('Admin: Fetching storage objects with filters:', {
      page, limit, environment, dateFrom, dateTo, minSize, maxSize
    });

    const { ok, value: objects, error } = await objectStorage.client.list();
    
    if (!ok) {
      console.error('Error listing objects:', error);
      return res.status(500).json({ error: 'Failed to fetch objects' });
    }

    // Apply filters
    let filteredObjects = objects.filter((obj: any) => {
      // Environment filter
      if (environment && !obj.name?.startsWith(`${environment}/`)) {
        return false;
      }
      
      // Date filters
      if (dateFrom || dateTo) {
        const objDate = new Date(obj.lastModified || obj.timeCreated);
        if (dateFrom && objDate < new Date(dateFrom as string)) return false;
        if (dateTo && objDate > new Date(dateTo as string)) return false;
      }
      
      // Size filters
      const size = obj.size || 0;
      if (minSize && size < parseInt(minSize as string)) return false;
      if (maxSize && size > parseInt(maxSize as string)) return false;
      
      return true;
    });

    // Sort by date (newest first)
    filteredObjects.sort((a: any, b: any) => {
      const dateA = new Date(a.lastModified || a.timeCreated || 0);
      const dateB = new Date(b.lastModified || b.timeCreated || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    const paginatedObjects = filteredObjects.slice(offset, offset + limitNum);

    const formattedObjects = paginatedObjects.map((obj: any) => {
      const name = obj.name || obj.path || '';
      const isThumb = name.includes('/thumb/');
      const env = name.startsWith('dev/') ? 'dev' : 
                  name.startsWith('prod/') ? 'prod' : 'unknown';
      
      return {
        id: obj.id || name,
        name,
        size: obj.size || 0,
        sizeFormatted: formatBytes(obj.size || 0),
        lastModified: obj.lastModified || obj.timeCreated,
        environment: env,
        type: isThumb ? 'thumbnail' : 'image',
        url: `/api/object-storage/image/${name}`
      };
    });

    res.json({
      objects: formattedObjects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredObjects.length,
        totalPages: Math.ceil(filteredObjects.length / limitNum)
      }
    });

  } catch (error) {
    console.error('Error fetching storage objects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Bulk delete storage objects
 */
router.delete('/storage/objects/bulk', async (req, res) => {
  try {
    const { objectNames } = req.body;
    
    if (!objectNames || !Array.isArray(objectNames) || objectNames.length === 0) {
      return res.status(400).json({ error: 'No object names provided' });
    }

    console.log(`Admin: Bulk deleting ${objectNames.length} objects:`, objectNames);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const objectName of objectNames) {
      try {
        const { ok, error } = await objectStorage.client.delete(objectName);
        if (ok) {
          successCount++;
          console.log(`Successfully deleted: ${objectName}`);
        } else {
          errorCount++;
          errors.push(`${objectName}: ${error}`);
          console.error(`Failed to delete ${objectName}:`, error);
        }
      } catch (err) {
        errorCount++;
        errors.push(`${objectName}: ${err}`);
        console.error(`Error deleting ${objectName}:`, err);
      }
    }

    res.json({
      success: true,
      deleted: successCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Download selected objects as ZIP
 */
router.post('/storage/objects/download', async (req, res) => {
  try {
    const { objectNames } = req.body;
    
    if (!objectNames || !Array.isArray(objectNames) || objectNames.length === 0) {
      return res.status(400).json({ error: 'No object names provided' });
    }

    console.log(`Admin: Creating ZIP download for ${objectNames.length} objects`);

    const zipFilename = `storage-export-${Date.now()}.zip`;
    
    // Set response headers for ZIP download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    let addedCount = 0;
    
    for (const objectName of objectNames) {
      try {
        const { ok, value: downloadUrl } = await objectStorage.client.downloadUrl(objectName, 300); // 5min expiry
        
        if (ok && downloadUrl) {
          // Fetch the file content
          const response = await fetch(downloadUrl);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const filename = objectName.split('/').pop() || objectName;
            archive.append(Buffer.from(buffer), { name: filename });
            addedCount++;
          }
        }
      } catch (err) {
        console.error(`Error adding ${objectName} to ZIP:`, err);
      }
    }

    console.log(`Added ${addedCount}/${objectNames.length} files to ZIP`);
    archive.finalize();

  } catch (error) {
    console.error('Error creating ZIP download:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * Export storage objects as CSV
 */
router.get('/storage/objects/export', async (req, res) => {
  try {
    const { environment, dateFrom, dateTo } = req.query;
    
    console.log('Admin: Exporting storage objects to CSV');

    const { ok, value: objects, error } = await objectStorage.client.list();
    
    if (!ok) {
      return res.status(500).json({ error: 'Failed to fetch objects' });
    }

    // Apply filters
    let filteredObjects = objects.filter((obj: any) => {
      if (environment && !obj.name?.startsWith(`${environment}/`)) {
        return false;
      }
      
      if (dateFrom || dateTo) {
        const objDate = new Date(obj.lastModified || obj.timeCreated);
        if (dateFrom && objDate < new Date(dateFrom as string)) return false;
        if (dateTo && objDate > new Date(dateTo as string)) return false;
      }
      
      return true;
    });

    // Generate CSV content
    const csvHeader = 'ID,Name,Size (bytes),Size (formatted),Last Modified,Environment,Type\n';
    const csvRows = filteredObjects.map((obj: any) => {
      const name = obj.name || obj.path || '';
      const size = obj.size || 0;
      const isThumb = name.includes('/thumb/');
      const env = name.startsWith('dev/') ? 'dev' : 
                  name.startsWith('prod/') ? 'prod' : 'unknown';
      
      return [
        obj.id || name,
        `"${name}"`,
        size,
        `"${formatBytes(size)}"`,
        `"${obj.lastModified || obj.timeCreated || ''}"`,
        env,
        isThumb ? 'thumbnail' : 'image'
      ].join(',');
    }).join('\n');

    const csvContent = csvHeader + csvRows;
    const filename = `storage-export-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

    console.log(`Exported ${filteredObjects.length} objects to CSV`);

  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;