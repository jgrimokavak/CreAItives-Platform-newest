import { Router } from "express";
import { z } from "zod";
import OpenAI from "openai";
import NodeCache from "node-cache";

const router = Router();

// Cache for enhanced prompts (5 minute TTL)
const editPromptCache = new NodeCache({ stdTTL: 300 });

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Request body schema
const bodySchema = z.object({
  text: z.string().min(1),
  model: z.string(),
  image: z.string().optional(), // Base64 encoded image
});

// System prompt template for image editing
const systemTemplate = (model: string) => {
  return `You are an expert AI prompt engineer specializing in image editing and modification tasks. Your job is to transform vague, incomplete editing instructions into clear, specific, and actionable image editing prompts.

CONTEXT: The user has uploaded an existing image and wants to make changes to it. They are NOT creating a new image from scratch - they are editing/modifying an existing one.

KEY PRINCIPLES FOR IMAGE EDITING PROMPTS:

1. EDITING-FOCUSED LANGUAGE:
   - Use verbs that indicate modification: "adjust", "change", "remove", "add", "enhance", "modify", "transform"
   - Be specific about WHAT to change and HOW to change it
   - Reference existing elements in the image when possible

2. PRESERVE CONTEXT:
   - Assume the user wants to keep most of the image intact
   - Only change what they specifically request
   - Maintain the overall composition unless asked otherwise

3. SPECIFIC INSTRUCTIONS:
   - Instead of "make it better" → "increase brightness and contrast while maintaining natural skin tones"
   - Instead of "change the color" → "change the car color from blue to red while preserving the metallic finish"
   - Instead of "remove background" → "replace the background with a clean white studio backdrop"

4. TECHNICAL PRECISION:
   - Include lighting considerations: "maintain consistent lighting", "adjust shadows accordingly"
   - Mention quality preservation: "preserve image quality and details"
   - Consider realistic results: "ensure natural-looking results"

5. MODEL-SPECIFIC OPTIMIZATIONS:
   - For flux-kontext-max: Focus on precise, contextual changes with good understanding of the existing image
   - For gpt-image-1: Use clear, descriptive language about the desired modifications

6. CONCISE BUT COMPLETE:
   - Keep prompts focused and actionable
   - Include enough detail for accurate execution
   - Avoid unnecessary artistic embellishments

IMPORTANT: If an image is provided, analyze it and reference specific elements you can see to make the prompt more contextually accurate.

Return your response as JSON with this structure:
{
  "prompt": "Enhanced editing instruction here",
  "negativePrompt": "Things to avoid during editing (optional)"
}`;
};

router.post("/enhance-edit-prompt", async (req, res) => {
  try {
    // Validate request body
    const { text, model, image } = bodySchema.parse(req.body);
    
    // Create cache key (exclude image from cache key for now due to size)
    const cacheKey = `edit:${model}:${text}`;
    
    // Check cache first
    const cachedResult = editPromptCache.get(cacheKey);
    if (cachedResult) {
      console.log("Returning cached enhanced edit prompt");
      return res.json(cachedResult);
    }
    
    // Generate system prompt
    const system = systemTemplate(model);
    
    // Prepare messages for OpenAI
    const messages: any[] = [
      { role: "system", content: system }
    ];

    // If image is provided, use vision capabilities
    if (image) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `The user wants to edit this image with the instruction: "${text}"\n\nPlease analyze the image and provide an enhanced, specific editing prompt that takes into account what you can see in the image.`
          },
          {
            type: "image_url",
            image_url: {
              url: image
            }
          }
        ]
      });
    } else {
      // No image provided, just enhance the text prompt
      messages.push({
        role: "user", 
        content: `The user wants to edit an image with this instruction: "${text}"\n\nPlease enhance this into a clear, specific image editing prompt.`
      });
    }
    
    // Call OpenAI API with vision model when image is provided
    const completion = await openai.chat.completions.create({
      model: image ? "gpt-4o" : "gpt-4o", // Use gpt-4o for both since it has vision capabilities
      messages,
      response_format: { type: "json_object" },
      max_tokens: 300,
    });
    
    // Parse the result
    const content = completion.choices[0].message.content as string;
    const result = JSON.parse(content);
    
    // Add to cache
    editPromptCache.set(cacheKey, result);
    
    console.log(`Enhanced edit prompt: "${text}" → "${result.prompt}"`);
    
    // Return the enhanced prompt
    res.json(result);
  } catch (error: any) {
    console.error("Error enhancing edit prompt:", error);
    res.status(500).json({ 
      message: error.message || "Failed to enhance edit prompt",
      error: true
    });
  }
});

export default router;