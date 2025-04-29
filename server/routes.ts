import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openai } from "./openai";
import { z } from "zod";
import { generateImageSchema } from "@shared/schema";

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
      } else {
        // DALL-E 2 specific parameters
        requestParams.quality = 'standard';
        if (output_format) requestParams.response_format = output_format;
      }
      
      const response = await openai.images.generate(requestParams);
      
      // Check if response has data
      if (!response.data || response.data.length === 0) {
        throw new Error("No images were generated");
      }
      
      // Process and store the response
      const generatedImages = response.data.map((image, index) => {
        const newImage = {
          id: `img_${Date.now()}_${index}`,
          url: image.url || "",
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

  const httpServer = createServer(app);
  return httpServer;
}
