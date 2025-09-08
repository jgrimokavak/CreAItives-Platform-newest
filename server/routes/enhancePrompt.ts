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
  model: z.enum(["gpt-image-1", "imagen-3", "imagen-4", "flux-pro", "flux-kontext-max", "flux-krea-dev", "wan-2.2", "google/nano-banana"]),
});

// Model-specific templates
function systemTemplate(model: string): string {
  const baseTemplate = `You are an expert prompt engineer. ENHANCE (don't completely rewrite) the user's prompt to optimize it for the {MODEL} image model.

IMPORTANT GUIDELINES:

1. PRESERVE the user's original intent, subject, and structure. Never add new content, objects, or ideas that were not implied by the user.

2. ALWAYS SPECIFY VISUAL STYLE:
   - If no style is mentioned (even if the subject suggests realism), ALWAYS add an explicit style such as "a realistic photograph" or "a detailed illustration".
   - If the user writes "photo", elevate to "a professional photograph" and improve its technical description subtly.
   - EVERY prompt must have a clear visual style, never leave it ambiguous.

3. ENHANCE naturally:
   - Add helpful visual terms such as lighting (e.g. "soft natural light"), perspective (e.g. "shot from eye level"), and realism cues.
   - Include light camera or lens hints only if they fit the intended style (e.g. "shot on 35mm" for realistic photos).

4. HANDLE VAGUE INPUTS CAREFULLY:
   - For extremely vague prompts (e.g. "a person running"), add minimal but relevant environmental context (e.g. "on a track" or "in a forest") ONLY when it helps clarify the visual.
   - Do NOT add speculative details to setting descriptions (e.g. avoid adding "vibrant nightlife" to "futuristic city") unless directly implied.

5. CONTEXT-AWARE REFINEMENTS:
   - If the prompt involves a car, default to "a modern car" unless the user specifies otherwise.
   - Adjust tone to remain visually informative, not overly poetic or abstract.
   - Avoid subjective adjectives unless they contribute directly to the clarity or style of the image.

6. MINIMAL AND PURPOSEFUL:
   - Keep the prompt concise and professional. Don't overinflate or overstyle.
   - Do not add technical filler like "8K", "ultra-detailed", "trending" unless the user's intent clearly supports it.

7. NEGATIVE PROMPT:
   - Add a short negative prompt with context-aware flaws to avoid (e.g. "blurry background, distorted proportions, extra limbs").

Return a JSON object with two keys:
{
  "prompt": "<the enhanced prompt>",
  "negativePrompt": "<things to avoid>"
}`;
  
  let modelSpecificGuidance = "";
  
  switch (model) {
    case "gpt-image-1":
      modelSpecificGuidance = "For GPT-Image-1: Subtly enhance realistic prompts with photographic language. If a photo is implied, add natural light, angle hints, or focal clarity.";
      break;
    case "imagen-3":
      modelSpecificGuidance = "For Imagen-3: Add descriptive color, lighting, or scene composition terms to boost vividness and structure. Don't include \"ArtStation\" or stylized terms unless the user leans into illustration or concept art.";
      break;
    case "imagen-4":
      modelSpecificGuidance = "For Imagen-4: Focus on precise visual details, lighting quality, and composition. This model excels at photorealistic rendering with accurate colors and textures. Emphasize specific camera angles, lighting conditions, and material properties for best results.";
      break;
    case "flux-pro":
      modelSpecificGuidance = "For Flux-Pro: Lean into lighting and realism enhancements. For car prompts, add \"modern car\" by default and include studio-like rendering terms if fitting (e.g. \"reflective floor\", \"white backdrop\").";
      break;
    case "flux-kontext-max":
      modelSpecificGuidance = "For Flux-Kontext-Max: Focus on contextual editing and image-to-image transformations. Emphasize continuity with existing image elements while enhancing details and style.";
      break;
    case "flux-krea-dev":
      modelSpecificGuidance = "For Flux-Krea-Dev: Prioritize photorealistic, non-oversaturated results. Add natural lighting, realistic textures, and avoid the typical 'AI look' with balanced composition and authentic colors.";
      break;
    case "wan-2.2":
      modelSpecificGuidance = "For WAN-2.2: Focus on cinematic quality with dramatic lighting and mood. This model excels at creating beautiful, high-resolution images with rich atmospheric details. Emphasize visual drama, depth, and professional cinematography.";
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