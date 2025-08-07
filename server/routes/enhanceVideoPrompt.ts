import { Router } from "express";
import { z } from "zod";
import { openai } from "../openai";
import NodeCache from "node-cache";

const router = Router();

// Create an LRU cache with max 200 items and TTL of 1 hour
const videoPromptCache = new NodeCache({ 
  maxKeys: 200,
  stdTTL: 3600 // 1 hour in seconds
});

// Schema for the request body
const bodySchema = z.object({
  text: z.string().min(3),
  model: z.enum(["minimax-hailuo-02"]), // Currently only supporting this video model
  image: z.string().optional(), // Base64 encoded reference image
});

// Video-specific system template
function videoSystemTemplate(model: string): string {
  const baseTemplate = `You are an expert video prompt engineer. ENHANCE (don't completely rewrite) the user's prompt to optimize it for the {MODEL} video generation model.

IMPORTANT GUIDELINES FOR VIDEO GENERATION:

1. PRESERVE the user's original intent, subject, and action. Never add new content, objects, or actions that were not implied by the user.

2. FOCUS ON MOTION AND DYNAMICS:
   - Always specify clear movement or action (e.g., "walking slowly", "spinning clockwise", "gently swaying")
   - Add temporal elements that work well for video (e.g., "over 5 seconds", "gradually", "smoothly")
   - Describe camera movements if appropriate (e.g., "camera pans left", "slow zoom in")

3. ENHANCE FOR VIDEO QUALITY:
   - Add lighting that changes or moves (e.g., "shifting sunlight", "flickering firelight")
   - Include environmental movement (e.g., "leaves rustling", "waves crashing", "clouds moving")
   - Specify smooth transitions and natural motion flow

4. VIDEO-SPECIFIC VISUAL STYLE:
   - Always specify if it should be "cinematic", "documentary style", "animated", etc.
   - Add frame rate hints for dramatic effect (e.g., "slow motion", "time-lapse effect")
   - Include depth of field and focus changes if relevant

5. TEMPORAL STORYTELLING:
   - Structure the prompt with a clear beginning, middle, and end if appropriate
   - Add progression elements (e.g., "starts close-up, pulls back to reveal", "begins still, then moves")
   - Consider cause and effect relationships in the motion

6. CONTEXT-AWARE REFINEMENTS:
   - For character prompts, specify facial expressions and body language changes
   - For object prompts, describe realistic physics and movement
   - For scenery prompts, add atmospheric elements that change over time

7. TECHNICAL CONSIDERATIONS:
   - Avoid overly complex scenes that might cause artifacts
   - Prefer smooth, continuous motions over abrupt changes
   - Consider lighting consistency throughout the video duration

8. NEGATIVE PROMPT:
   - Add video-specific issues to avoid (e.g., "flickering, abrupt cuts, unnatural motion, morphing objects, inconsistent lighting")

Return a JSON object with two keys:
{
  "prompt": "<the enhanced video prompt>",
  "negativePrompt": "<video-specific things to avoid>"
}`;
  
  let modelSpecificGuidance = "";
  
  switch (model) {
    case "minimax-hailuo-02":
      modelSpecificGuidance = "For Minimax Hailuo-02: This model excels at creating smooth, realistic motion with good temporal consistency. Focus on natural movements, realistic physics, and cinematic camera work. Emphasize smooth transitions and avoid rapid scene changes. The model handles human motion and facial expressions particularly well.";
      break;
    default:
      modelSpecificGuidance = "";
  }
  
  // Combine base template with model-specific guidance
  const system = baseTemplate.replace("{MODEL}", model);
  return modelSpecificGuidance ? `${system} ${modelSpecificGuidance}` : system;
}

router.post("/enhance-video-prompt", async (req, res) => {
  try {
    // Validate request body
    const { text, model, image } = bodySchema.parse(req.body);
    
    // Create cache key (include image hash if present)
    const cacheKey = `video:${model}:${text}:${image ? 'withImage' : 'noImage'}`;
    
    // Check cache first
    const cachedResult = videoPromptCache.get(cacheKey);
    if (cachedResult) {
      console.log("Returning cached enhanced video prompt");
      return res.json(cachedResult);
    }
    
    // Generate system prompt based on the model
    const system = videoSystemTemplate(model);
    
    // Prepare messages for OpenAI API
    const messages: any[] = [
      { role: "system", content: system }
    ];
    
    // Add user prompt with optional image context
    if (image) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `The user wants to create a video with this prompt: "${text}"\n\nI've also provided a reference image. Please analyze the image and enhance the video prompt to incorporate relevant visual elements, movements, and cinematic qualities that would work well for video generation based on what you see.`
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
      messages.push({
        role: "user",
        content: text
      });
    }
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o for better quality and vision capabilities
      messages,
      response_format: { type: "json_object" },
      max_tokens: 300, // Slightly higher for video prompts which tend to be more descriptive
    });
    
    // Parse the result
    const content = completion.choices[0].message.content as string;
    const result = JSON.parse(content);
    
    // Add to cache
    videoPromptCache.set(cacheKey, result);
    
    // Return the enhanced video prompt
    res.json(result);
  } catch (error: any) {
    console.error("Error enhancing video prompt:", error);
    res.status(500).json({ 
      message: error.message || "Failed to enhance video prompt",
      error: true
    });
  }
});

export default router;