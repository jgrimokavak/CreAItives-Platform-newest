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
    id: 'runway-gen3',
    name: 'Runway Gen-3 Alpha',
    summary: 'Fast video generation with motion control (1–2 min typical).',
    details: [
      'Optimized for quick generation times',
      'Advanced motion and camera controls',
      'Best for dynamic scenes and action',
      'Supports 720p–1080p resolutions'
    ],
    recommended: false,
    badges: ['Fast', 'Motion Control']
  }
];