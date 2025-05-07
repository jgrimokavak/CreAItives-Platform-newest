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
  const baseTemplate = "You are an expert prompt engineer. Rewrite the user prompt so it is perfectly optimised for the {MODEL} image model, adding vivid camera angles, lighting, style adjectives, palette references, and an 8K quality hint. Return JSON with keys \"prompt\" and \"negativePrompt\".";
  
  let modelSpecificGuidance = "";
  
  switch (model) {
    case "gpt-image-1":
      modelSpecificGuidance = "Use photographic terms, explicit lens types, f‑stop, film grain.";
      break;
    case "imagen-3":
      modelSpecificGuidance = "Add bold color descriptions, meticulous composition, trending on ArtStation.";
      break;
    case "flux-pro":
      modelSpecificGuidance = "Focus on realistic automotive rendering, studio HDR lighting.";
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
      model: "gpt-4o-mini", // Use cheaper model for cost control
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