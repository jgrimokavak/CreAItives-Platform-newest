import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openai } from "./openai";
import type { Uploadable } from "openai/uploads";
import { z } from "zod";
import { generateImageSchema } from "@shared/schema";
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

// Get current file directory (ES Modules compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      
      // Convert base64 strings to Buffers with validation
      let imageBuffers: Buffer[];
      try {
        imageBuffers = images.map((img: string, index: number) => {
          // Check for base64 validity
          console.log(`Image ${index}: Processing base64 data (length: ${img.length} characters)`);
          
          if (!img || img.length === 0) {
            console.error(`Image ${index}: Empty base64 string`);
            throw new Error('Empty image data received');
          }
          
          // Log beginning of the base64 string to verify format
          console.log(`Image ${index}: Base64 preview: ${img.substring(0, 20)}...`);
          
          // Create buffer from base64
          try {
            const buffer = Buffer.from(img, 'base64');
            
            // Verify buffer has content
            if (buffer.length === 0) {
              console.error(`Image ${index}: Empty buffer created from base64 string`);
              throw new Error('Empty buffer created');
            }
            
            // Check for very small buffers which might indicate data problems
            if (buffer.length < 1000) {
              console.warn(`Image ${index}: Very small buffer (${buffer.length} bytes) - may not be a valid image`);
            }
            
            console.log(`Image ${index}: Successfully converted to buffer (size: ${buffer.length} bytes)`);
            
            // Verify it starts with image file signature bytes for basic validation
            // This is a simple check and not foolproof
            const isJPEG = buffer.length > 2 && buffer[0] === 0xFF && buffer[1] === 0xD8;
            const isPNG = buffer.length > 8 && buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
            
            if (isJPEG) {
              console.log(`Image ${index}: Detected as JPEG format`);
            } else if (isPNG) {
              console.log(`Image ${index}: Detected as PNG format`);
            } else {
              console.warn(`Image ${index}: Unknown image format - proceeding anyway`);
            }
            
            return buffer;
          } catch (error) {
            console.error(`Image ${index}: Error converting base64 to buffer:`, error);
            throw new Error('Failed to convert image data to buffer');
          }
        });
      } catch (error: any) {
        console.error('Image processing error:', error.message);
        return res.status(400).json({ message: error.message || "Failed to process image data" });
      }

      console.log(`Processing ${imageBuffers.length} images with model ${model || "gpt-image-1"}`);

      // Handle multiple images only for GPT-Image-1
      let response;

      try {
        // Looking at the OpenAI Node.js SDK version 4.x
        // For multiple images in gpt-image-1 we need a completely different approach

        if (model !== "gpt-image-1") {
          // Single image case - supported by all models
          console.log("Using single image edit API");

          // For DALL-E 3, switch to DALL-E 2 as DALL-E 3 doesn't support image edits
          const useModel = model === "dall-e-3" ? "dall-e-2" : (model || "gpt-image-1");
          console.log(`Using OpenAI SDK with model ${useModel} for image edit`);
          
          // Create temporary files for the images - this is crucial for OpenAI SDK to work properly
          const tempDir = path.join(__dirname, '../temp');
          // Create the temp directory if it doesn't exist
          if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
          }
          
          // Save the main image to a temporary file
          const mainImagePath = path.join(tempDir, `main_${Date.now()}.png`);
          fs.writeFileSync(mainImagePath, imageBuffers[0]);
          console.log(`Saved main image to temporary file: ${mainImagePath}`);
          
          // Create readable stream for the main image
          const mainImageStream = fs.createReadStream(mainImagePath);
          
          // Make the API request with a proper file stream
          response = await openai.images.edit({
            image: mainImageStream, // Pass the file stream instead of the raw buffer
            prompt: prompt || "Edit this image",
            model: useModel,
            n: parseInt(count || "1", 10),
            size: size || "1024x1024",
            quality: quality || "auto",
            ...(useModel !== "gpt-image-1" ? { response_format: "b64_json" } : {})
          });
          
          // Clean up temporary files
          try {
            if (fs.existsSync(mainImagePath)) {
              fs.unlinkSync(mainImagePath);
              console.log(`Deleted temporary file: ${mainImagePath}`);
            }
          } catch (cleanupError) {
            console.warn("Error cleaning up temporary files:", cleanupError);
          }
        } else if (model === "gpt-image-1") {
          console.log("Using OpenAI SDK for GPT-Image-1 image edits");

          try {
            console.log(`Using OpenAI SDK to edit ${imageBuffers.length} images`);

            // We'll use the OpenAI SDK's proper image edit method for better compatibility
            console.log('==== REQUEST ====');
            
            // Create temporary files for the images - this is crucial for OpenAI SDK to work properly
            const tempDir = path.join(__dirname, '../temp');
            // Create the temp directory if it doesn't exist
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            // Save the main image to a temporary file
            const mainImagePath = path.join(tempDir, `main_${Date.now()}.png`);
            fs.writeFileSync(mainImagePath, imageBuffers[0]);
            console.log(`Saved main image to temporary file: ${mainImagePath}`);
            
            // Create readable stream for the main image
            const mainImageStream = fs.createReadStream(mainImagePath);
            
            // Prepare mask if available
            let maskImageStream = undefined;
            let maskImagePath = '';
            if (imageBuffers.length > 1) {
              maskImagePath = path.join(tempDir, `mask_${Date.now()}.png`);
              fs.writeFileSync(maskImagePath, imageBuffers[1]);
              console.log(`Saved mask image to temporary file: ${maskImagePath}`);
              maskImageStream = fs.createReadStream(maskImagePath);
            }
            
            // Prepare the request parameters with proper file streams
            const requestParams: any = {
              model: 'gpt-image-1',
              prompt: prompt || "Edit this image",
              image: mainImageStream, // Pass the file stream instead of the raw buffer
              n: 1,
              size: size as any || "1024x1024",
              quality: quality as any || "auto"
            };
            
            // Add mask if available
            if (maskImageStream) {
              console.log("Using mask image");
              requestParams.mask = maskImageStream;
            }
            
            // Log the request parameters
            console.log("Request parameters:", {
              model: requestParams.model,
              prompt: requestParams.prompt,
              image: "ReadableStream from temporary file",
              mask: maskImageStream ? "ReadableStream from temporary file" : undefined,
              n: requestParams.n,
              size: requestParams.size,
              quality: requestParams.quality
            });
            
            // Make the request with proper file streams
            response = await openai.images.edit(requestParams);
            
            // Clean up temporary files
            try {
              if (fs.existsSync(mainImagePath)) {
                fs.unlinkSync(mainImagePath);
                console.log(`Deleted temporary file: ${mainImagePath}`);
              }
              if (maskImagePath && fs.existsSync(maskImagePath)) {
                fs.unlinkSync(maskImagePath);
                console.log(`Deleted temporary file: ${maskImagePath}`);
              }
            } catch (cleanupError) {
              console.warn("Error cleaning up temporary files:", cleanupError);
            }

            console.log("Successful API response received from OpenAI SDK");
          } catch (error) {
            console.error("OpenAI SDK error:", error);
            throw error;
          }
        }

        console.log("API response received");
      } catch (apiError: any) {
        console.error("==== OPENAI API ERROR ====");
        console.error("Error type:", apiError.constructor.name);
        console.error("Error message:", apiError.message);
        console.error("Full error object:", JSON.stringify(apiError, null, 2));
        if (apiError.response) {
          console.error("Response status:", apiError.response.status);
          console.error("Response headers:", apiError.response.headers);
          console.error("Response data:", apiError.response.data);
        }
        if (apiError.code) {
          console.error("Error code:", apiError.code);
        }
        throw new Error(`OpenAI API error: ${apiError.message || "Unknown error"}`);
      }

      console.log("OpenAI API response:", JSON.stringify(response, null, 2));

      // Check if response has data
      const typedResponse = response as OpenAIImageResponse;
      if (!typedResponse || !typedResponse.data || typedResponse.data.length === 0) {
        throw new Error("No images were generated");
      }

      // Process and store the response
      const responseData = typedResponse.data;
      const generatedImages = responseData.map((image: any, index: number) => {
        const imageData = {
          url: image.url || null,
          b64_json: image.b64_json || null,
          revised_prompt: image.revised_prompt || null
        };

        console.log(`Image ${index} data:`, 
          `url: ${imageData.url ? 'present' : 'missing'}, ` +
          `b64_json: ${imageData.b64_json ? 'present' : 'missing'}, ` +
          `revised_prompt: ${imageData.revised_prompt ? 'present' : 'missing'}`
        );

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