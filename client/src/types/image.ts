export interface GeneratedImage {
  id: string;
  url: string;
  base64Data?: string; // Added to match the server-side model
  prompt: string;
  size: string;
  model: string;
  createdAt: string;
}
