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
    name: 'Minimax HaiLuo-02',
    summary: 'High-quality video generation (3–6 min typical).',
    details: [
      'Best for cinematic shots and natural lighting',
      'Good motion consistency for 5–8s clips',
      'Typical ranges: 512p–1080p',
      'Supports reference image input'
    ],
    recommended: true,
    badges: ['Cinematic', 'High Quality']
  },
  {
    id: 'test-model-1',
    name: 'Test Model 1',
    summary: 'Fast video generation with motion control (1–2 min typical).',
    details: [
      'Optimized for quick generation times',
      'Advanced motion and camera controls',
      'Best for dynamic scenes and action',
      'Supports 720p–1080p resolutions'
    ],
    recommended: false,
    badges: ['Fast', 'Motion Control']
  },
  {
    id: 'test-model-2',
    name: 'Test Model 2',
    summary: 'Balanced quality and speed (2–4 min typical).',
    details: [
      'Good balance of quality and generation time',
      'Supports various aspect ratios',
      'Reliable motion tracking',
      'Best for general-purpose content'
    ],
    recommended: false,
    badges: ['Balanced', 'Versatile']
  },
  {
    id: 'test-model-3',
    name: 'Test Model 3',
    summary: 'Ultra-high quality generation (5–10 min typical).',
    details: [
      'Premium quality output',
      'Advanced lighting and shadows',
      'Best for professional content',
      '4K resolution support'
    ],
    recommended: false,
    badges: ['Premium', '4K Ready']
  },
  {
    id: 'test-model-4',
    name: 'Test Model 4',
    summary: 'Experimental features with AI enhancement (3–7 min typical).',
    details: [
      'Cutting-edge AI techniques',
      'Experimental motion effects',
      'Beta testing phase',
      'May have occasional artifacts'
    ],
    recommended: false,
    badges: ['Experimental', 'AI Enhanced']
  },
  {
    id: 'test-model-5',
    name: 'Test Model 5',
    summary: 'Specialized for character animation (4–6 min typical).',
    details: [
      'Optimized for human subjects',
      'Advanced facial expression tracking',
      'Natural body movement',
      'Best for portrait and character work'
    ],
    recommended: false,
    badges: ['Characters', 'Animation']
  }
];