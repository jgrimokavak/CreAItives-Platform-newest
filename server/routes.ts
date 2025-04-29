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
      const { images, prompt, model, size, count, quality } = req.body;
      
      if (!images || !images.length) {
        return res.status(400).json({ message: "No images provided" });
      }
      
      // Prepare parameters for the API call
      const requestParams: any = {
        model: model || "gpt-image-1",
        n: parseInt(count || "1", 10),
        size: size || "1024x1024",
      };
      
      // The prompt is required for image edits
      requestParams.prompt = prompt || "Edit this image";
      
      // Add model-specific parameters
      if (model === "gpt-image-1") {
        // GPT-Image-1 specific parameters
        if (quality) {
          requestParams.quality = quality === "auto" ? "auto" : quality;
        }
        // GPT-Image-1 doesn't support response_format
      } else if (model === "dall-e-2") {
        // DALL-E 2 specific parameters
        requestParams.response_format = "b64_json";
      } else {
        // DALL-E 3 doesn't support image edits API, default to DALL-E 2
        requestParams.model = "dall-e-2";
        requestParams.response_format = "b64_json";
        console.log("Defaulting to dall-e-2 as dall-e-3 doesn't support image edits");
      }
      
      console.log("Sending image edit request with params:", JSON.stringify(requestParams));
      
      // Convert base64 strings to Buffers
      const imageBuffers = images.map((img: string) => Buffer.from(img, 'base64'));
      
      // Use createEdit API instead of createVariation for GPT-Image-1 (supports multiple images)
      const response = await openai.images.edit({
        image: imageBuffers[0], // First image is the primary one
        // Convert other images to array format required by the API
        // Only include additional images if there are more than one and we're using gpt-image-1
        ...(imageBuffers.length > 1 && model === "gpt-image-1" 
            ? { image: imageBuffers.slice(1) as any } 
            : {}),
        ...requestParams
      });
      
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
