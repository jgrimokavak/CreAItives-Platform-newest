import { Router } from "express";
import { z } from "zod";
import { openai } from "../openai";
import { LRUCache } from "lru-cache";

const router = Router();
const bodySchema = z.object({
  text: z.string().min(3),
  model: z.enum(["gpt-image-1", "imagen-3", "imagen-4", "flux-pro"]),
});

// Cache suggestions to reduce API calls and costs
const cache = new LRUCache<string, any>({ max: 300, ttl: 1000 * 60 * 10 }); // 10 minute TTL

router.post("/prompt-suggestions", async (req, res) => {
  try {
    // Validate request body
    const { text, model } = bodySchema.parse(req.body);
    
    // Create cache key
    const cacheKey = `${model}:${text}`;
    
    // Check cache first
    if (cache.has(cacheKey)) {
      console.log("Returning cached prompt suggestions");
      return res.json(cache.get(cacheKey));
    }
    
    // Generate system prompt for appropriate suggestions
    const systemPrompt = `You are an assistant that suggests creative styling options for text-to-image prompts. 
Return JSON with four arrays: "imageTypes", "cameraPositions", "lightingStyles", "colorPalettes". 
Pick up to 6 concise suggestions for each, tailored to the user's text and the ${model} model.
Focus on options that would improve the visual quality of the generated image.

For cameraPositions, always include at least 2 experimental or unconventional options like "extreme fish-eye lens", "360-degree view", "microscopic perspective", "drone shot", "split-frame view", "tilt-shift miniature effect", or similarly creative viewpoints.

Keep all suggestions concise and directly applicable - no need for explanations.`;
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o for better quality suggestions
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      max_tokens: 250, // Limit token usage
    });
    
    // Parse the result
    const content = completion.choices[0].message.content as string;
    const suggestions = JSON.parse(content);
    
    // Add to cache
    cache.set(cacheKey, suggestions);
    
    // Return the suggestions
    res.json(suggestions);
  } catch (error: any) {
    console.error("Error generating prompt suggestions:", error);
    res.status(500).json({ 
      message: error.message || "Failed to generate prompt suggestions",
      error: true
    });
  }
});

export default router;