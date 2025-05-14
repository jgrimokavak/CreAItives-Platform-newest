import { Router } from "express";
import { z } from "zod";
import { openai } from "../openai";
import NodeCache from "node-cache";

const router = Router();

// Create an LRU cache with max 200 items and TTL of 1 hour
const promptCache = new NodeCache({ 
  maxKeys: 200,
  stdTTL: 3600 // 1 hour in seconds
});

// Schema for the request body
const bodySchema = z.object({
  text: z.string().min(3),
  model: z.enum(["gpt-image-1", "imagen-3", "flux-pro"]),
});

// Model-specific templates
function systemTemplate(model: string): string {
  const baseTemplate = `You are an expert prompt engineer. ENHANCE (don't completely rewrite) the user's prompt to optimize it for the {MODEL} image model. 

IMPORTANT GUIDELINES:
1. PRESERVE the user's core intent and style - if they want a photo, keep it a photo; if they want illustration, keep it illustration
2. MAINTAIN the subject and setting from the original prompt
3. ADD SUBTLE enhancements like better lighting descriptions, composition hints, or quality terms ONLY when they improve the result
4. DO NOT add '8K' or other technical terms unless truly needed
5. MAKE MINIMAL CHANGES - enhance, don't transform the prompt
6. ADD a short negative prompt that helps avoid common issues

Return a JSON object with two keys: "prompt" (the enhanced version) and "negativePrompt" (things to avoid).`;
  
  let modelSpecificGuidance = "";
  
  switch (model) {
    case "gpt-image-1":
      modelSpecificGuidance = "For GPT-Image-1, subtly enhance with lighting terms or composition hints when needed. Only add photography terms (like lens type, f-stop) if the user is clearly requesting a photo.";
      break;
    case "imagen-3":
      modelSpecificGuidance = "For Imagen-3, subtly enhance with color descriptions or composition terms when they'd improve the result. Don't add 'trending on ArtStation' unless the user wants a digital art style.";
      break;
    case "flux-pro":
      modelSpecificGuidance = "For Flux-Pro, add subtle lighting terms when they'd improve the result. For car-related prompts, you may add more specific automotive rendering terms.";
      break;
    default:
      modelSpecificGuidance = "";
  }
  
  // Combine base template with model-specific guidance
  const system = baseTemplate.replace("{MODEL}", model);
  return modelSpecificGuidance ? `${system} ${modelSpecificGuidance}` : system;
}

router.post("/enhance-prompt", async (req, res) => {
  try {
    // Validate request body
    const { text, model } = bodySchema.parse(req.body);
    
    // Create cache key
    const cacheKey = `${model}:${text}`;
    
    // Check cache first
    const cachedResult = promptCache.get(cacheKey);
    if (cachedResult) {
      console.log("Returning cached enhanced prompt");
      return res.json(cachedResult);
    }
    
    // Generate system prompt based on the model
    const system = systemTemplate(model);
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o for better quality prompt enhancements
      messages: [
        { role: "system", content: system },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      max_tokens: 250, // Limit token usage
    });
    
    // Parse the result
    const content = completion.choices[0].message.content as string;
    const result = JSON.parse(content);
    
    // Add to cache
    promptCache.set(cacheKey, result);
    
    // Return the enhanced prompt
    res.json(result);
  } catch (error: any) {
    console.error("Error enhancing prompt:", error);
    res.status(500).json({ 
      message: error.message || "Failed to enhance prompt",
      error: true
    });
  }
});

export default router;