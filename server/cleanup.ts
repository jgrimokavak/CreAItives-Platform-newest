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
      
      // Step 1: Clean up database records older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      try {
        const result = await db.delete(images).where(lt(images.createdAt, thirtyDaysAgo));
        dbRecordsDeleted = result.rowCount || 0;
        console.log(`Deleted ${dbRecordsDeleted} old database records`);
      } catch (dbErr) {
        console.error('Error cleaning database records:', dbErr);
      }
      
      // Step 2: Clean up files in uploads directory, but skip full and thumb directories
      // (Let database-driven cleanup handle image files)
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