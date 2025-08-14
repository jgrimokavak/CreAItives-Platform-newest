// Seed script to generate sample analytics data for testing
import { db } from './db';
import { activityEvents } from '@shared/schema';

const events = [
  'page_view',
  'image_generate_requested',
  'image_generate_succeeded',
  'image_generate_failed',
  'video_generate_requested',
  'video_generate_succeeded',
  'video_generate_failed',
  'project_create',
  'login',
  'logout',
  'session_heartbeat'
];

const features = [
  'image_generation',
  'video_generation',
  'project_management',
  'authentication',
  'navigation',
  'session_management'
];

const models = [
  'gpt-image-1',
  'flux-pro',
  'imagen-3',
  'flux-kontext-max',
  'replicate-video-1'
];

const pages = [
  '/gallery',
  '/create',
  '/video',
  '/car',
  '/admin/overview',
  '/admin/users'
];

async function seedAnalytics() {
  const environment = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
  console.log(`Seeding analytics for ${environment} environment...`);
  
  // Get some real user IDs
  const userIds = [
    '41316054', // Admin user
    '45480824',
    '45530377',
    '45677430'
  ];
  
  const now = new Date();
  const seedEvents = [];
  
  // Generate events for the last 30 days
  for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    
    // Generate 5-20 events per day
    const eventsPerDay = Math.floor(Math.random() * 15) + 5;
    
    for (let i = 0; i < eventsPerDay; i++) {
      const userId = userIds[Math.floor(Math.random() * userIds.length)];
      const eventType = events[Math.floor(Math.random() * events.length)];
      const timestamp = new Date(date);
      timestamp.setHours(Math.floor(Math.random() * 24));
      timestamp.setMinutes(Math.floor(Math.random() * 60));
      
      let feature = features[Math.floor(Math.random() * features.length)];
      let model = null;
      let status = null;
      let duration = null;
      let errorCode = null;
      let metadata: any = {};
      
      // Set appropriate fields based on event type
      if (eventType.includes('image_generate')) {
        feature = 'image_generation';
        model = models[Math.floor(Math.random() * 4)];
        if (eventType.includes('succeeded')) {
          status = 'succeeded';
          duration = Math.floor(Math.random() * 10000) + 2000; // 2-12 seconds
        } else if (eventType.includes('failed')) {
          status = 'failed';
          duration = Math.floor(Math.random() * 5000) + 1000;
          errorCode = ['RATE_LIMIT', 'INVALID_PROMPT', 'MODEL_ERROR'][Math.floor(Math.random() * 3)];
        } else {
          status = 'requested';
        }
      } else if (eventType.includes('video_generate')) {
        feature = 'video_generation';
        model = 'replicate-video-1';
        if (eventType.includes('succeeded')) {
          status = 'succeeded';
          duration = Math.floor(Math.random() * 30000) + 10000; // 10-40 seconds
        } else if (eventType.includes('failed')) {
          status = 'failed';
          duration = Math.floor(Math.random() * 10000) + 5000;
          errorCode = ['TIMEOUT', 'INVALID_FORMAT', 'QUOTA_EXCEEDED'][Math.floor(Math.random() * 3)];
        } else {
          status = 'requested';
        }
      } else if (eventType === 'page_view') {
        feature = 'navigation';
        metadata.page = pages[Math.floor(Math.random() * pages.length)];
      } else if (eventType === 'project_create') {
        feature = 'project_management';
        status = 'succeeded';
      } else if (eventType === 'login' || eventType === 'logout') {
        feature = 'authentication';
        status = 'succeeded';
      } else if (eventType === 'session_heartbeat') {
        feature = 'session_management';
        status = 'active';
      }
      
      seedEvents.push({
        id: `evt_seed_${daysAgo}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        sessionId: `session_${userId}_${date.toISOString().split('T')[0]}`,
        event: eventType,
        feature,
        model,
        status,
        duration,
        errorCode,
        metadata,
        environment,
        createdAt: timestamp
      });
    }
  }
  
  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < seedEvents.length; i += batchSize) {
    const batch = seedEvents.slice(i, i + batchSize);
    await db.insert(activityEvents).values(batch);
    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(seedEvents.length / batchSize)}`);
  }
  
  console.log(`Successfully seeded ${seedEvents.length} analytics events`);
}

// Run if executed directly
seedAnalytics()
  .then(() => {
    console.log('Seeding complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });

export { seedAnalytics };