export type ModelDef = {
  id: string;           // value sent to backend (e.g., 'hailuo-02')
  name: string;         // "Minimax HaiLuo v2"
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
    summary: 'Video synthesis with advanced physics simulation.',
    details: [
      'Native 1080p generation capability',
      'Advanced physics modeling for realistic motion',
      'Supports both text-to-video and image-to-video',
      'Handles complex scenarios like gymnastics',
      '6-10 second duration support'
    ],
    recommended: false,
    badges: []
  },
  {
    id: 'kling-v2.1',
    name: 'Kling v2.1 Master',
    summary: 'Video generation with superb dynamics and prompt adherence.',
    details: [
      'Generate 1080p videos from text or image',
      'Supports 5-10 second video duration',
      'Excellent prompt adherence and dynamics',
      'Multiple aspect ratio support (16:9, 9:16, 1:1)',
      'Negative prompt support for precise control'
    ],
    recommended: true,
    badges: []
  },
  {
    id: 'seedance-1-pro',
    name: 'ByteDance Seedance Pro',
    summary: 'Multi-shot video generation with creative flexibility and narrative coherence.',
    details: [
      'Text-to-video and image-to-video generation',
      'Multi-shot support with narrative coherence',
      'Variable duration: 3-12 seconds',
      'Multiple resolutions: 480p, 720p, 1080p',
      'Wide aspect ratio support (16:9, 4:3, 1:1, 3:4, 9:16, 21:9, 9:21)',
      'Camera control and seed support for reproducibility'
    ],
    recommended: false,
    badges: []
  }
];