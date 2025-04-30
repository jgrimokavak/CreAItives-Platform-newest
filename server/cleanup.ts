import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import prisma from './prisma';

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
      console.log('Running cleanup job for trashed images...');
      
      // Find images deleted over 30 days ago
      const old = await prisma.image.findMany({
        where: { 
          deletedAt: { 
            lt: subDays(new Date(), 30) 
          } 
        },
        include: {
          sources: true
        }
      });
      
      console.log(`Found ${old.length} images to clean up`);
      
      for (const img of old) {
        // Delete files
        const root = path.join(__dirname, '../uploads');
        
        try {
          // Delete main image files
          if (fs.existsSync(path.join(root, img.path))) {
            fs.unlinkSync(path.join(root, img.path));
          }
          
          if (fs.existsSync(path.join(root, img.thumbPath))) {
            fs.unlinkSync(path.join(root, img.thumbPath));
          }
          
          // Delete source files if needed
          for (const source of img.sources) {
            if (source.path && fs.existsSync(path.join(root, source.path))) {
              fs.unlinkSync(path.join(root, source.path));
            }
            
            if (source.thumbPath && fs.existsSync(path.join(root, source.thumbPath))) {
              fs.unlinkSync(path.join(root, source.thumbPath));
            }
          }
        } catch (fileErr) {
          console.error(`Error deleting files for image ${img.id}:`, fileErr);
        }
        
        // Delete database record - this will cascade delete sources
        await prisma.image.delete({ where: { id: img.id } });
        
        console.log(`Cleaned up image ${img.id}`);
      }
      
      console.log('Cleanup job completed');
    } catch (err) {
      console.error('Error in cleanup job:', err);
    }
  });
  
  console.log('Scheduled cleanup job for trashed images');
};