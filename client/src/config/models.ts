export type ModelDef = {
  id: string;           // value sent to backend (e.g., 'hailuo-02')
  name: string;         // "Minimax HaiLuo-02"
  summary: string;      // short blurb (1 line)
  details?: string[];   // bullet points (max res, typical processing time, strengths)
  recommended?: boolean;
  sampleThumbUrl?: string; // optional small image
  badges?: string[];    // e.g., ['Cinematic', 'Best Quality']
};

export const VIDEO_MODELS: ModelDef[] = [
  {
    id: 'hailuo-02',
    name: 'Minimax HaiLuo',
    summary: 'High-quality video synthesis with advanced physics simulation.',
    details: [
      'Native 1080p generation capability',
      'Advanced physics modeling for realistic motion',
      'Supports both text-to-video and image-to-video',
      'Handles complex scenarios like gymnastics',
      '6-10 second duration support'
    ],
    recommended: false,
    badges: ['High Quality', 'Physics']
  },
  {
    id: 'test-model-1',
    name: 'Test Model 1',
    summary: 'Fast generation optimized for quick turnaround.',
    details: [
      'Optimized for speed over quality',
      'Best for rapid prototyping',
      'Good for simple motion sequences',
      '720p output resolution'
    ],
    recommended: false,
    badges: ['Fast', 'Prototyping']
  },
  {
    id: 'test-model-2',
    name: 'Test Model 2',
    summary: 'Balanced performance for general-purpose content.',
    details: [
      'Good balance of quality and generation time',
      'Supports various aspect ratios',
      'Reliable for everyday video creation',
      'Suitable for social media content'
    ],
    recommended: false,
    badges: ['Balanced', 'Versatile']
  },
  {
    id: 'test-model-3',
    name: 'Test Model 3',
    summary: 'Premium quality with advanced lighting effects.',
    details: [
      'Enhanced lighting and shadow rendering',
      'Best for professional content creation',
      'Advanced scene composition',
      'Higher computational requirements'
    ],
    recommended: false,
    badges: ['Premium', 'Professional']
  },
  {
    id: 'test-model-4',
    name: 'Test Model 4',
    summary: 'Experimental model with cutting-edge AI techniques.',
    details: [
      'Latest AI research implementations',
      'Experimental motion enhancement',
      'Beta testing phase - results may vary',
      'Feedback helps improve the model'
    ],
    recommended: false,
    badges: ['Experimental', 'Beta']
  },
  {
    id: 'test-model-5',
    name: 'Test Model 5',
    summary: 'Specialized for character and portrait videos.',
    details: [
      'Optimized for human subjects',
      'Enhanced facial expression tracking',
      'Natural body movement simulation',
      'Great for character-focused content'
    ],
    recommended: false,
    badges: ['Characters', 'Portraits']
  }
];