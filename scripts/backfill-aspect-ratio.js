/**
 * Script to backfill aspect ratio for existing images
 * 
 * This script runs a SQL query to populate the aspect_ratio field
 * for all images that don't have one set, based on their dimensions
 * or size field.
 */
import { db } from '../server/db.ts';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Running aspect ratio backfill script...');
  
  try {
    // Update aspect_ratio based on common size patterns
    const result = await db.execute(sql`
      UPDATE images
      SET aspect_ratio = CASE
        WHEN size = '1024x1024' THEN '1:1'
        WHEN size = '1024x1792' THEN '9:16'
        WHEN size = '1792x1024' THEN '16:9'
        WHEN size = '1024x1536' THEN '2:3'
        WHEN size = '1536x1024' THEN '3:2'
        ELSE '1:1'
      END
      WHERE aspect_ratio IS NULL;
    `);
    
    console.log('Backfill completed successfully.');
    console.log('Updated rows:', result);
  } catch (error) {
    console.error('Error during backfill:', error);
  }
  
  process.exit(0);
}

main();