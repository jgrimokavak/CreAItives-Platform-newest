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
      
      // Convert base64 strings to Buffers
      const imageBuffers = images.map((img: string) => Buffer.from(img, 'base64'));
      
      console.log(`Processing ${imageBuffers.length} images with model ${model || "gpt-image-1"}`);
      
      // Handle multiple images only for GPT-Image-1
      let response;
      
      try {
        // Looking at the OpenAI Node.js SDK version 4.x
        // For multiple images in gpt-image-1 we need a completely different approach
        
        if (imageBuffers.length === 1 || model !== "gpt-image-1") {
          // Single image case - supported by all models
          console.log("Using single image edit API");
          
          // For DALL-E 3, switch to DALL-E 2 as DALL-E 3 doesn't support image edits
          const useModel = model === "dall-e-3" ? "dall-e-2" : (model || "gpt-image-1");
          
          response = await openai.images.edit({
            image: imageBuffers[0],
            prompt: prompt || "Edit this image",
            model: useModel,
            n: parseInt(count || "1", 10),
            size: size || "1024x1024",
            quality: quality || "auto",
            ...(useModel !== "gpt-image-1" ? { response_format: "b64_json" } : {})
          });
        } else if (model === "gpt-image-1") {
          // Multiple images case - Only for GPT-Image-1 
          // Based on examining OpenAI JS SDK, we need to use Fetch API directly
          console.log("Using custom fetch implementation for multiple images");
          
          // Create form data
          const formData = new FormData();
          formData.append('model', 'gpt-image-1');
          formData.append('prompt', prompt || "Edit these images");
          formData.append('n', count || "1");
          formData.append('size', size || "1024x1024");
          formData.append('quality', quality || "auto");
          
          // OpenAI API expects the first image separately and the rest in an array
          const mainImage = imageBuffers[0];
          const additionalImages = imageBuffers.slice(1);
          
          // Add main image
          formData.append('image', new Blob([mainImage]), 'image.png');
          
          // Add additional images
          additionalImages.forEach((img, i) => {
            formData.append('additional_images', new Blob([img]), `image_${i+1}.png`);
          });
          
          // Direct fetch to OpenAI API
          const fetchResponse = await fetch('https://api.openai.com/v1/images/edits', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: formData
          });
          
          if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            throw new Error(`OpenAI API error: ${fetchResponse.status} - ${errorText}`);
          }
          
          response = await fetchResponse.json();
        }
        
        console.log("API response received");
      } catch (apiError: any) {
        console.error("OpenAI API error details:", apiError);
        throw new Error(`OpenAI API error: ${apiError.message || "Unknown error"}`);
      }
      
      console.log("OpenAI API response:", JSON.stringify(response, null, 2));
      
      // Check if response has data
      if (!response || !response.data || response.data.length === 0) {
        throw new Error("No images were generated");
      }
      
      // Process and store the response
      const generatedImages = response.data.map((image: any, index: number) => {
        const imageData = {
          url: image.url || null,
          b64_json: image.b64_json || null,
          revised_prompt: image.revised_prompt || null
        };
        
        console.log(`Image ${index} data types:`, Object.keys(imageData).map(k => `${k}: ${imageData[k] ? 'present' : 'missing'}`).join(', '));
        
        // Check if we have a valid URL or base64 image data
        let imageUrl = "";
        if (imageData.url) {
          imageUrl = imageData.url;
          console.log("Using URL from OpenAI");
        } else if (imageData.b64_json) {
          imageUrl = `data:image/png;base64,${imageData.b64_json}`;
          console.log("Using base64 data from OpenAI");
        } else {
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
