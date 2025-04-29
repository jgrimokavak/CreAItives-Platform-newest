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
          // Following documentation at https://platform.openai.com/docs/api-reference/images
          console.log("Using Node.js fetch API for GPT-Image-1 image edits");
          
          const form = new FormData();
          form.append('model', 'gpt-image-1');
          form.append('prompt', prompt || "Edit these images");
          
          // Important: OpenAI requires n=1 for image edits with GPT-Image-1
          form.append('n', '1');
          
          form.append('size', size || "1024x1024");
          form.append('quality', quality || "auto");
          
          // Add all images to the form data using the image[] format
          // This is documented in the curl example in the OpenAI API docs
          for (let i = 0; i < imageBuffers.length; i++) {
            // Create a blob for each image
            const blob = new Blob([imageBuffers[i]], { type: 'image/png' });
            
            // Use the image[] format as shown in the documentation
            form.append('image[]', blob, `image_${i}.png`);
            
            console.log(`Added image ${i} to form data`);
          }
          
          // Log detailed information
          console.log(`Making request to OpenAI with ${imageBuffers.length} images`);
          console.log(`Model: ${model}, Size: ${size}, Quality: ${quality}`);
          
          try {
            // Make the direct API call using fetch
            const apiResponse = await fetch('https://api.openai.com/v1/images/edits', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
              },
              body: form
            });
            
            // Check for errors in the response
            if (!apiResponse.ok) {
              const errorText = await apiResponse.text();
              console.error(`OpenAI API error: ${apiResponse.status}`, errorText);
              throw new Error(`OpenAI API error: ${apiResponse.status} - ${errorText}`);
            }
            
            // Parse the response
            response = await apiResponse.json();
            console.log("Successful API response received");
          } catch (fetchError) {
            console.error("Fetch API error:", fetchError);
            throw fetchError;
          }
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
