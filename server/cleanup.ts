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
        const { and, isNotNull, eq } = await import('drizzle-orm');
        
        // Get current environment to ensure we only delete images from our environment
        const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
        
        // First, get the IDs and environments of images to be permanently deleted (for Object Storage cleanup)
        const imagesToDelete = await db.select({ id: images.id, environment: images.environment })
          .from(images)
          .where(and(
            isNotNull(images.deletedAt),
            lt(images.deletedAt, thirtyDaysAgo)
          ));
        
        // Filter to only our environment's images
        const environmentFilteredImages = imagesToDelete.filter(img => 
          (img.environment || 'dev') === currentEnv
        );
        
        // Delete images from Object Storage (only from our environment)
        if (environmentFilteredImages.length > 0) {
          const { objectStorage } = await import('./objectStorage');
          
          for (const image of environmentFilteredImages) {
            try {
              // The deleteImage method expects just the image ID, not the full path
              await objectStorage.deleteImage(image.id, 'png');
              console.log(`Successfully deleted image ${image.id} from Object Storage during cleanup (env: ${image.environment || 'dev'})`);
            } catch (storageErr) {
              console.error(`Failed to delete ${image.id} from Object Storage:`, storageErr);
            }
          }
        }
        
        // Delete records from database (only from our environment)
        const result = await db.delete(images).where(and(
          isNotNull(images.deletedAt),
          lt(images.deletedAt, thirtyDaysAgo),
          eq(images.environment, currentEnv)
        ));
        dbRecordsDeleted = result.rowCount || 0;
        console.log(`Permanently deleted ${dbRecordsDeleted} images from trash (30+ days old) for environment: ${currentEnv}`);
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