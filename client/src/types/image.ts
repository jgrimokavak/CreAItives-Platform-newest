// Image types for the application

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  size: string;
  model: string;
  createdAt: string;
  sourceThumb?: string | null; // 128px thumbnail of the first reference image
  sourceImage?: string | null; // Full-resolution source image
  width?: string | null;
  height?: string | null;
  thumbUrl?: string | null;
  fullUrl?: string | null;
  starred?: boolean;
  deletedAt?: string | null;
}