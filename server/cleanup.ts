import fs from 'fs';
import path from 'path';
import cron from 'node-cron';

// Function to subtract days from a date
const subDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

export const setupCleanupJob = () => {
  // Run at 3:00 AM every day
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('Running comprehensive cleanup job for files and database...');
      
      // Import storage and db here to avoid circular dependencies
      const { storage } = await import('./storage');
      const { db } = await import('./db');
      const { images } = await import('@shared/schema');
      const { lt } = await import('drizzle-orm');
      
      let filesDeleted = 0;
      let dbRecordsDeleted = 0;
      
      // Step 1: Permanently delete images that have been in trash for 30+ days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      try {
        const { and, isNotNull } = await import('drizzle-orm');
        
        // First, get the IDs of images to be permanently deleted (for Object Storage cleanup)
        const imagesToDelete = await db.select({ id: images.id })
          .from(images)
          .where(and(
            isNotNull(images.deletedAt),
            lt(images.deletedAt, thirtyDaysAgo)
          ));
        
        // Delete images from Object Storage
        if (imagesToDelete.length > 0) {
          const { ObjectStorageService } = await import('./objectStorage');
          const objectStorage = new ObjectStorageService();
          
          for (const image of imagesToDelete) {
            try {
              const envPrefix = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
              await objectStorage.deleteImage(`${envPrefix}/${image.id}.png`);
              await objectStorage.deleteImage(`${envPrefix}/thumb/${image.id}.webp`);
            } catch (storageErr) {
              console.error(`Failed to delete ${image.id} from Object Storage:`, storageErr);
            }
          }
        }
        
        // Delete records from database
        const result = await db.delete(images).where(and(
          isNotNull(images.deletedAt),
          lt(images.deletedAt, thirtyDaysAgo)
        ));
        dbRecordsDeleted = result.rowCount || 0;
        console.log(`Permanently deleted ${dbRecordsDeleted} images from trash (30+ days old)`);
      } catch (dbErr) {
        console.error('Error cleaning trash records:', dbErr);
      }
      
      // Step 2: Clean up temporary files (downloads, temp files)
      const tempDirs = ['/tmp', path.join(process.cwd(), 'downloads')];
      
      for (const tempDir of tempDirs) {
        if (fs.existsSync(tempDir)) {
          try {
            const files = fs.readdirSync(tempDir).filter(f => 
              f.endsWith('.zip') || f.endsWith('.tmp')
            );
            
            for (const file of files) {
              const filePath = path.join(tempDir, file);
              try {
                const stats = fs.statSync(filePath);
                const ageMs = Date.now() - stats.mtimeMs;
                const ageDays = ageMs / (24 * 60 * 60 * 1000);
                
                if (ageDays > 1) { // Clean temp files after 1 day
                  fs.unlinkSync(filePath);
                  filesDeleted++;
                }
              } catch (fileErr) {
                console.error(`Error processing file ${file}:`, fileErr);
              }
            }
          } catch (dirErr) {
            console.error(`Error processing directory ${tempDir}:`, dirErr);
          }
        }
      }
      
      console.log(`Cleanup completed: ${dbRecordsDeleted} database records removed, ${filesDeleted} temp files deleted`);
      console.log('NOTE: Image files in /uploads are now preserved and only removed when database records are deleted');
      
    } catch (err) {
      console.error('Error in cleanup job:', err);
    }
  });
  
  console.log('Scheduled comprehensive cleanup job for files and database');
};