export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  size: string;
  model: string;
  quality?: string;
  createdAt: string;
  sourceThumb?: string; // 128px thumbnail of the first reference image
  width?: string | number;
  height?: string | number;
  thumbUrl?: string;
  fullUrl?: string;
  starred?: boolean;
  deletedAt?: string | null;
}
