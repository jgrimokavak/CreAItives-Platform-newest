import fetch from "node-fetch";
import FormData from "form-data";
import OpenAI, { toFile } from "openai";

// Setup fetch and FormData for node environment
(globalThis as any).fetch = fetch;
(globalThis as any).FormData = FormData;

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

// Define custom types for extended image sizes for the edit API (GPT-Image-1 model)
declare module 'openai' {
  interface ImagesEditParams {
    model?: "gpt-image-1";
    image: File | File[];
    mask?: File | null;
    prompt: string;
    n?: number;
    size?: "256x256" | "512x512" | "1024x1024" | "1536x1024" | "1024x1536" | null;
    quality?: "auto" | "high" | "medium" | "low" | null;
  }
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "sk-placeholder",
});

export { toFile };
