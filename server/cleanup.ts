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
      console.log('Running cleanup job for temporary files...');
      
      // Clean up uploaded files older than 30 days
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        let cleaned = 0;
        
        for (const file of files) {
          const filePath = path.join(uploadsDir, file);
          try {
            const stats = fs.statSync(filePath);
            const ageMs = Date.now() - stats.mtimeMs;
            const ageDays = ageMs / (24 * 60 * 60 * 1000);
            
            if (ageDays > 30) {
              fs.unlinkSync(filePath);
              cleaned++;
            }
          } catch (fileErr) {
            console.error(`Error processing file ${file}:`, fileErr);
          }
        }
        
        console.log(`Cleaned up ${cleaned} old files from uploads`);
      }
      
      console.log('Cleanup job completed');
    } catch (err) {
      console.error('Error in cleanup job:', err);
    }
  });
  
  console.log('Scheduled cleanup job for temporary files');
};