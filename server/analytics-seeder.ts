// Seed script to generate sample analytics data for testing
import { db } from './db';
import { activityEvents } from '@shared/schema';

const events = [
  'page_view',
  'image_generate_requested',
  'image_generate_succeeded',
  'image_generate_failed',
  'image_edit_requested',
  'image_edit_succeeded',
  'image_edit_failed',
  'car_generate_requested',
  'car_generate_succeeded',
  'car_generate_failed',
  'batch_car_generate_requested',
  'batch_car_generate_succeeded',
  'batch_car_generate_failed',
  'upscale_requested',
  'upscale_succeeded',
  'upscale_failed',
  'video_generate_requested',
  'video_generate_succeeded',
  'video_generate_failed',
  'login',
  'logout',
  'session_heartbeat'
];

const features = [
  'image_creation',
  'image_editing', 
  'car_generation',
  'batch_car_generation',
  'upscale',
  'video_generation',
  'authentication',
  'navigation',
  'session_management'
];

// All actual models available in the platform
const imageModels = [
  'gpt-image-1',      // OpenAI
  'dall-e-2',         // OpenAI
  'dall-e-3',         // OpenAI
  'imagen-4',         // Replicate/Google
  'imagen-3',         // Replicate/Google
  'flux-pro',         // Replicate
  'flux-kontext-max', // Replicate (also supports editing)
  'flux-krea-dev',    // Replicate
  'wan-2.2',          // Replicate
  'flux-dev',         // Fal.ai
  'stable-diffusion-xl', // Fal.ai
  'fast-sdxl'         // Fal.ai
];

const videoModels = [
  'hailuo-02',        // Replicate/Minimax
  'veo-3',            // Vertex AI
  'veo-3-fast',       // Vertex AI
  'veo-2'             // Vertex AI
];

const upscaleModel = 'topazlabs/image-upscale'; // Replicate/Topaz Labs
const carModel = 'imagen-4'; // Used for car generation

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
        feature = 'image_creation';
        model = imageModels[Math.floor(Math.random() * imageModels.length)];
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
      } else if (eventType.includes('image_edit')) {
        feature = 'image_editing';
        // Only models that support editing
        model = ['gpt-image-1', 'flux-kontext-max'][Math.floor(Math.random() * 2)];
        if (eventType.includes('succeeded')) {
          status = 'succeeded';
          duration = Math.floor(Math.random() * 15000) + 3000;
        } else if (eventType.includes('failed')) {
          status = 'failed';
          duration = Math.floor(Math.random() * 5000) + 1000;
          errorCode = ['MASK_ERROR', 'INVALID_IMAGE', 'MODEL_ERROR'][Math.floor(Math.random() * 3)];
        } else {
          status = 'requested';
        }
      } else if (eventType.includes('car_generate')) {
        if (eventType.includes('batch')) {
          feature = 'batch_car_generation';
          model = carModel;
          if (eventType.includes('succeeded')) {
            status = 'succeeded';
            duration = Math.floor(Math.random() * 60000) + 20000; // 20-80 seconds for batch
            metadata.batchSize = Math.floor(Math.random() * 10) + 1;
          } else if (eventType.includes('failed')) {
            status = 'failed';
            duration = Math.floor(Math.random() * 20000) + 5000;
            errorCode = ['CSV_ERROR', 'BATCH_LIMIT', 'MODEL_ERROR'][Math.floor(Math.random() * 3)];
          } else {
            status = 'requested';
          }
        } else {
          feature = 'car_generation';
          model = carModel;
          if (eventType.includes('succeeded')) {
            status = 'succeeded';
            duration = Math.floor(Math.random() * 12000) + 3000;
          } else if (eventType.includes('failed')) {
            status = 'failed';
            duration = Math.floor(Math.random() * 5000) + 1000;
            errorCode = ['INVALID_CAR_DATA', 'MODEL_ERROR'][Math.floor(Math.random() * 2)];
          } else {
            status = 'requested';
          }
        }
      } else if (eventType.includes('upscale')) {
        feature = 'upscale';
        model = upscaleModel;
        if (eventType.includes('succeeded')) {
          status = 'succeeded';
          duration = Math.floor(Math.random() * 20000) + 5000; // 5-25 seconds
          metadata.upscaleFactor = ['2x', '4x'][Math.floor(Math.random() * 2)];
        } else if (eventType.includes('failed')) {
          status = 'failed';
          duration = Math.floor(Math.random() * 10000) + 2000;
          errorCode = ['IMAGE_TOO_LARGE', 'INVALID_FORMAT', 'MODEL_ERROR'][Math.floor(Math.random() * 3)];
        } else {
          status = 'requested';
        }
      } else if (eventType.includes('video_generate')) {
        feature = 'video_generation';
        model = videoModels[Math.floor(Math.random() * videoModels.length)];
        if (eventType.includes('succeeded')) {
          status = 'succeeded';
          duration = Math.floor(Math.random() * 30000) + 10000; // 10-40 seconds
          metadata.duration = [6, 10][Math.floor(Math.random() * 2)];
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