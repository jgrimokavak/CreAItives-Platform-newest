import fetch from "node-fetch";
import FormData from "form-data";

// Polyfill global fetch and FormData so OpenAI SDK sets proper image/png headers
;(globalThis as any).fetch = fetch;
;(globalThis as any).FormData = FormData;

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openai } from "./openai";
import type { Uploadable } from "openai/uploads";
import { z } from "zod";
import { generateImageSchema } from "@shared/schema";
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
// Use Node's path module to get the directory name
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// Define the OpenAI API response structure
interface OpenAIImageResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API endpoint to generate images
  app.post("/api/generate", async (req, res) => {
    try {
      // Validate request body
      const validationResult = generateImageSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }

      const { prompt, model, size, quality, count, style, background, output_format } = validationResult.data;

      // Call OpenAI to generate images based on the model
      // For DALL-E 3, only one image can be generated at a time
      const numImages = model === 'dall-e-3' ? 1 : parseInt(count);

      // Create the base request object
      const requestParams: any = {
        model: model,
        prompt: prompt,
        n: numImages,
        size: size,
      };

      // DALL-E models support response_format but GPT-Image-1 doesn't
      if (model !== "gpt-image-1") {
        requestParams.response_format = "b64_json";
      }

      // Add model-specific parameters
      if (model === 'dall-e-3') {
        // DALL-E 3 specific parameters
        requestParams.quality = quality === 'hd' || quality === 'standard' ? quality : 'standard';
        if (style) requestParams.style = style;
        if (output_format) requestParams.response_format = output_format;
      } else if (model === 'gpt-image-1') {
        // GPT-Image-1 specific parameters
        if (quality === 'high' || quality === 'medium' || quality === 'low') {
          requestParams.quality = quality;
        } else {
          requestParams.quality = 'auto';
        }
        if (background) requestParams.background = background;
        // GPT-Image-1 doesn't support response_format
      } else {
        // DALL-E 2 specific parameters - No quality parameter, it's not supported
        if (output_format) requestParams.response_format = output_format;
      }

      console.log("Sending image generation request with params:", JSON.stringify(requestParams));
      const response = await openai.images.generate(requestParams);
      console.log("OpenAI API response:", JSON.stringify(response, null, 2));

      // Check if response has data
      if (!response.data || response.data.length === 0) {
        throw new Error("No images were generated");
      }

      // Process and store the response
      const generatedImages = response.data.map((image, index) => {
        // Log image data for debugging
        console.log(`Image ${index} response data:`, 
          JSON.stringify({
            url: image.url ? "url exists" : "no url",
            revised_prompt: image.revised_prompt ? "revised_prompt exists" : "no revised_prompt",
            b64_json: image.b64_json ? "b64_json exists" : "no b64_json"
          })
        );

        // Check if we have a valid URL or base64 image data
        let imageUrl = "";
        if (image.url) {
          imageUrl = image.url;
          console.log("Using direct URL from OpenAI:", imageUrl.substring(0, 50) + "...");
        } else if (image.b64_json) {
          imageUrl = `data:image/png;base64,${image.b64_json}`;
          console.log("Using base64 image data from OpenAI");
        } else {
          console.warn("No image URL or base64 data found in OpenAI response");
        }

        const newImage = {
          id: `img_${Date.now()}_${index}`,
          url: imageUrl,
          prompt: prompt,
          size: size,
          model: model,
          createdAt: new Date().toISOString(),
        };

        // Store the image in our storage
        storage.saveImage(newImage);

        return newImage;
      });

      res.json({ images: generatedImages });
    } catch (error: any) {
      console.error("Error generating images:", error);
      res.status(500).json({ 
        message: error.message || "Failed to generate images" 
      });
    }
  });

  // API endpoint to get all images
  app.get("/api/images", async (req, res) => {
    try {
      const images = await storage.getAllImages();
      res.json({ images });
    } catch (error: any) {
      console.error("Error fetching images:", error);
      res.status(500).json({ 
        message: error.message || "Failed to fetch images" 
      });
    }
  });

  // API endpoint to handle image edits and variations
  app.post("/api/upload-image", async (req, res) => {
    try {
      console.log('==== UPLOAD IMAGE REQUEST START ====');
      const { images, prompt, model, size, count, quality } = req.body;
      console.log('Request received with params:', {
        imagesCount: images?.length || 0,
        prompt,
        model,
        size,
        count,
        quality
      });

      if (!images || !images.length) {
        console.log('Error: No images provided');
        return res.status(400).json({ message: "No images provided" });
      }

      // Validate we have proper base64 strings
      if (images.some((img: any) => typeof img !== 'string')) {
        console.error('Error: Image data is not in string format');
        return res.status(400).json({ message: "Invalid image format" });
      }
      
      try {
        // Parse and buffer the first base64 image
        const imgBase64 = images[0];
        const imgBuffer = Buffer.from(imgBase64, 'base64');
        
        // Set up temp paths
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const mainImagePath = path.join(tempDir, `main_${Date.now()}.png`);
        const maskPath = path.join(tempDir, `mask_${Date.now()}.png`);
        
        try {
          // Convert to PNG with an alpha channel so the API sees real transparency
          await sharp(imgBuffer)
            .ensureAlpha(0)
            .png()
            .toFile(mainImagePath);
          
          console.log(`Saved main image to temporary PNG file: ${mainImagePath}`);
          
          // Read dimensions and build a fully-transparent mask of the same size
          const metadata = await sharp(imgBuffer).metadata();
          const imgWidth = metadata.width || 1024;
          const imgHeight = metadata.height || 1024;
          
          console.log(`Image dimensions: ${imgWidth}x${imgHeight}`);
          
          // Create a transparent PNG buffer
          const transparentPixels = Buffer.alloc(imgWidth * imgHeight * 4, 0);
          const maskBuffer = await sharp(transparentPixels, {
            raw: {
              width: imgWidth,
              height: imgHeight,
              channels: 4
            }
          })
            .png()
            .toBuffer();
          fs.writeFileSync(maskPath, maskBuffer);
          
          console.log(`Created transparent mask of size ${width}x${height}`);
          
          // Determine if we should do a style transfer or edit
          let response;
          
          if (model === "gpt-image-1") {
            // Call the edit endpoint with both streams (no response_format override)
            console.log("Calling GPT-Image-1 edit endpoint with mask");
            response = await openai.images.edit({
              image: fs.createReadStream(mainImagePath),
              mask: fs.createReadStream(maskPath),
              model: 'gpt-image-1',
              prompt: prompt || "Transform this image",
              n: 1,
              size: size || "1024x1024",
              quality: quality || "auto"
            });
          } else if (model === "dall-e-3") {
            // For DALL-E 3, use generate instead since it doesn't support edits
            console.log("Using DALL-E 3 generate endpoint for style transfer");
            response = await openai.images.generate({
              model: 'dall-e-3',
              prompt: prompt || "Transform this image",
              n: 1,
              size: size || "1024x1024",
              quality: quality || "standard",
              style: "natural"
            });
          } else {
            // For DALL-E 2, use edit with b64_json response format
            console.log("Using DALL-E 2 edit endpoint");
            response = await openai.images.edit({
              image: fs.createReadStream(mainImagePath),
              mask: fs.createReadStream(maskPath),
              model: 'dall-e-2',
              prompt: prompt || "Transform this image",
              n: parseInt(count || "1", 10),
              size: size || "1024x1024",
              response_format: "b64_json"
            });
          }
          
          console.log("API response received:", JSON.stringify(response, null, 2));
          
          // Process and store the response
          if (!response || !response.data || !Array.isArray(response.data) || response.data.length === 0) {
            console.warn("Invalid or empty response from OpenAI");
            return res.status(500).json({ message: "No valid images were generated" });
          }
          
          const generatedImages = response.data.map((image: any, index: number) => {
            const imageUrl = image.url || (image.b64_json ? `data:image/png;base64,${image.b64_json}` : null);
            
            if (!imageUrl) {
              console.warn("No image URL or base64 data found in response");
            }
            
            const newImage = {
              id: `img_${Date.now()}_${index}`,
              url: imageUrl,
              prompt: prompt || "Image Edit",
              size: size || "1024x1024",
              model: model || "gpt-image-1",
              createdAt: new Date().toISOString(),
            };
            
            // Store the image in our storage
            storage.saveImage(newImage);
            
            return newImage;
          });
          
          res.json({ images: generatedImages });
        } finally {
          // Cleanup temp files
          if (fs.existsSync(mainImagePath)) fs.unlinkSync(mainImagePath);
          if (fs.existsSync(maskPath)) fs.unlinkSync(maskPath);
          console.log("Temporary files cleaned up");
        }
      } catch (error: any) {
        console.error("Error processing image:", error);
        throw new Error(`Image processing error: ${error.message}`);
      }
    } catch (error: any) {
      console.error("Error generating image edits:", error);
      res.status(500).json({ 
        message: error.message || "Failed to edit images" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}