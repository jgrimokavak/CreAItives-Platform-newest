import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openai } from "./openai";
import { toFile } from "openai";
import { z } from "zod";
import { generateImageSchema, editImageSchema } from "@shared/schema";
import path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";
import sharp from "sharp";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // API endpoint to edit images
  app.post("/api/edit-image", async (req, res) => {
    try {
      // Validate request body
      const validationResult = editImageSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { images, prompt, size, quality, n, mask } = validationResult.data;
      
      // Create temp directory for image processing
      const tmpDir = path.join(__dirname, "../temp");
      fs.mkdirSync(tmpDir, { recursive: true });
      
      try {
        // Write each image to PNG
        const imgPaths = images.map((b64, i) => {
          const buf = Buffer.from(b64.replace(/^data:.*;base64,/, ""), "base64");
          const p = path.join(tmpDir, `img_${Date.now()}_${i}.png`);
          fs.writeFileSync(p, buf);
          return p;
        });
        
        // Resolve mask
        let maskPath: string;
        if (mask) {
          maskPath = path.join(tmpDir, "mask.png");
          fs.writeFileSync(maskPath, Buffer.from(mask.replace(/^data:.*;base64,/, ""), "base64"));
        } else {
          // Create a blank transparent mask if none is provided
          const { width, height } = await sharp(imgPaths[0]).metadata();
          const blank = await sharp({
            create: { 
              width: width ?? 1024, 
              height: height ?? 1024, 
              channels: 4, 
              background: { r: 0, g: 0, b: 0, alpha: 0 } 
            }
          }).png().toBuffer();
          
          maskPath = path.join(tmpDir, "mask.png");
          fs.writeFileSync(maskPath, blank);
        }
        
        // Build uploadables
        const uploadables = await Promise.all(imgPaths.map(p => toFile(fs.createReadStream(p))));
        const maskUpload = await toFile(fs.createReadStream(maskPath));
        
        console.log("Sending image edit request with params:", {
          model: "gpt-image-1",
          images: `${images.length} images`,
          mask: mask ? "provided" : "blank",
          prompt,
          n,
          size,
          quality
        });
        
        // OpenAI call
        // @ts-ignore - The OpenAI SDK types don't include all supported sizes
        const response = await openai.images.edit({
          model: "gpt-image-1",
          image: uploadables,
          mask: maskUpload,
          prompt,
          n,
          // Convert size to a compatible format for the API
          size: size === "auto" ? "1024x1024" : size,
          quality: quality as "auto" | "high" | "medium" | "low"
        });
        
        console.log("OpenAI image edit API response:", JSON.stringify({
          created: response.created,
          data: response.data?.map(d => ({
            b64_json: d.b64_json ? "data exists" : "no data",
            url: d.url ? "url exists" : "no url"
          })) || []
        }, null, 2));

        // Check if response has data
        if (!response.data || response.data.length === 0) {
          throw new Error("No edited images were generated");
        }
        
        // Process and store the response
        const generatedImages = response.data.map((image, index) => {
          // Use base64 data from response
          const imageUrl = `data:image/png;base64,${image.b64_json}`;
          
          const newImage = {
            id: `img_${Date.now()}_${index}`,
            url: imageUrl,
            prompt: prompt,
            size: size,
            model: "gpt-image-1",
            createdAt: new Date().toISOString(),
          };
          
          // Store the image in our storage
          storage.saveImage(newImage);
          
          return newImage;
        });
        
        res.json({ images: generatedImages });
        
        // Cleanup temp files
        imgPaths.forEach(p => fs.unlinkSync(p));
        fs.unlinkSync(maskPath);
      } catch (error) {
        // Make sure to clean up temp directory even if there's an error
        if (fs.existsSync(tmpDir)) {
          fs.readdirSync(tmpDir).forEach(file => {
            fs.unlinkSync(path.join(tmpDir, file));
          });
        }
        throw error;
      }
    } catch (error: any) {
      console.error("Error editing images:", error);
      res.status(500).json({ 
        message: error.message || "Failed to edit images" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
