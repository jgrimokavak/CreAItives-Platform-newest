import { sql } from 'drizzle-orm';
import { db } from './db';

export async function runAutoMigration() {
  try {
    console.log('🔄 Running automatic database migration...');

    // Check if environment column exists
    const envColumnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'videos' AND column_name = 'environment'
    `);

    if (envColumnCheck.rows.length === 0) {
      console.log('➕ Adding environment column...');
      await db.execute(sql`
        ALTER TABLE videos 
        ADD COLUMN environment TEXT DEFAULT 'prod'
      `);
    }

    // Check if reference_image_url column exists
    const refImageCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'videos' AND column_name = 'reference_image_url'
    `);

    if (refImageCheck.rows.length === 0) {
      console.log('➕ Adding reference_image_url column...');
      await db.execute(sql`
        ALTER TABLE videos 
        ADD COLUMN reference_image_url TEXT
      `);
    }

    // Check if thumb_url column exists
    const thumbCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'videos' AND column_name = 'thumb_url'
    `);

    if (thumbCheck.rows.length === 0) {
      console.log('➕ Adding thumb_url column...');
      await db.execute(sql`
        ALTER TABLE videos 
        ADD COLUMN thumb_url TEXT
      `);
    }

    // Check if attempt_count column exists
    const attemptCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'videos' AND column_name = 'attempt_count'
    `);

    if (attemptCheck.rows.length === 0) {
      console.log('➕ Adding attempt_count column...');
      await db.execute(sql`
        ALTER TABLE videos 
        ADD COLUMN attempt_count INTEGER DEFAULT 0
      `);
    }

    // Check if next_poll_at column exists
    const pollCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'videos' AND column_name = 'next_poll_at'
    `);

    if (pollCheck.rows.length === 0) {
      console.log('➕ Adding next_poll_at column...');
      await db.execute(sql`
        ALTER TABLE videos 
        ADD COLUMN next_poll_at TIMESTAMP
      `);
    }

    // Check if last_error column exists
    const errorCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'videos' AND column_name = 'last_error'
    `);

    if (errorCheck.rows.length === 0) {
      console.log('➕ Adding last_error column...');
      await db.execute(sql`
        ALTER TABLE videos 
        ADD COLUMN last_error TEXT
      `);
    }

    // Check if queued_at column exists
    const queuedCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'videos' AND column_name = 'queued_at'
    `);

    if (queuedCheck.rows.length === 0) {
      console.log('➕ Adding queued_at column...');
      await db.execute(sql`
        ALTER TABLE videos 
        ADD COLUMN queued_at TIMESTAMP
      `);
    }

    // Create indexes if they don't exist (ignore errors if they already exist)
    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_videos_user_env ON videos(user_id, environment)
      `);
      console.log('✅ Created idx_videos_user_env index');
    } catch (e) {
      console.log('ℹ️ Index idx_videos_user_env already exists');
    }

    try {
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_videos_status_poll ON videos(status, next_poll_at) 
        WHERE status IN ('queued', 'in_progress')
      `);
      console.log('✅ Created idx_videos_status_poll index');
    } catch (e) {
      console.log('ℹ️ Index idx_videos_status_poll already exists');
    }

    console.log('✅ Automatic database migration completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Auto-migration failed:', error);
    return false;
  }
}