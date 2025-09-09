# Video Model Integration Guide

## Overview & Scope

This guide provides a practical, end-to-end playbook for integrating new AI video models into the `/video` page. It's based on real implementation experience from the Kling v2.1 Master integration completed in September 2025.

**Key Principles:**
- Each model has independent form logic and validation
- Backend parameter mapping must match exact API schemas
- Frontend/backend model configurations must stay synchronized
- Analytics tracking requires model validation updates

## What Info to Collect From the User (Before Coding)

Before implementing any new video model, collect this information:

### Identification
- `modelKey`: Internal identifier (e.g., `kling-v2.1`, `hailuo-02`)
- `displayName`: User-facing name (e.g., `Kling v2.1 Master`)
- `provider`: API provider (e.g., `replicate`, `openai`)
- `version`: Model version or hash

### Capabilities
- **Modes**: text-to-video, image-to-video, image+text-to-video
- **Audio support**: Does the model generate audio?
- **Duration limits**: Min/max seconds (e.g., 5-10s for Kling)
- **Resolution options**: Fixed or variable (e.g., Kling is always 1080p)
- **Aspect ratios**: Supported ratios (e.g., `16:9`, `9:16`, `1:1`)

### API Details
- **Exact API schema**: Required and optional parameters
- **Parameter names**: Backend snake_case vs frontend camelCase
- **Enum values**: Valid options for selects (durations, ratios, etc.)
- **Constraints**: Cross-parameter dependencies
- **Example payloads**: Minimal and full request examples

### UI Requirements
- **Required fields**: Which parameters are mandatory
- **Default values**: Recommended starting values
- **Conditional fields**: Fields that appear/hide based on other selections
- **Validation rules**: Min/max values, format requirements

## Frontend Integration

### Step 1: Update Model Configuration

Add your model to `client/src/config/models.ts`:

```typescript
export const VIDEO_MODELS: ModelDef[] = [
  // ... existing models
  {
    id: 'kling-v2.1',
    name: 'Kling v2.1 Master',
    summary: 'Video generation with superb dynamics and prompt adherence.',
    details: [
      'Generate 1080p videos from text or image',
      'Supports 5-10 second video duration',
      'Excellent prompt adherence and dynamics',
      'Multiple aspect ratio support (16:9, 9:16, 1:1)',
      'Negative prompt support for precise control'
    ],
    recommended: true,
    badges: [] // Badges removed for cleaner UI
  }
];
```

### Step 2: Update Model Selector Architecture

The model selector now uses a distinctive icon and color system. Update `client/src/components/ModelSelector.tsx`:

```typescript
// Import your new icon
import { Zap, Target, YourNewIcon } from 'lucide-react';

// Get provider name from model id
const getProviderName = (modelId: string): string => {
  if (modelId === 'hailuo-02') return 'Minimax';
  if (modelId === 'kling-v2.1') return 'Kling';
  if (modelId === 'your-new-model') return 'YourProvider';  // Add your model
  return 'Unknown';
};

// Get model version label
const getVersionLabel = (modelId: string): string => {
  switch (modelId) {
    case 'hailuo-02': return 'v2';
    case 'kling-v2.1': return 'v2.1';
    case 'your-new-model': return 'v1.0';  // Add your model
    default: return '';
  }
};

// Get model-specific icon (NEW ARCHITECTURE)
const getModelIcon = (modelId: string) => {
  switch (modelId) {
    case 'hailuo-02': return Zap; // Physics simulation energy
    case 'kling-v2.1': return Target; // Precision and adherence
    case 'your-new-model': return YourNewIcon; // Add your model icon
    default: return Sparkles;
  }
};

// Get model colors (UPDATED ARCHITECTURE)
const getModelColors = (modelId: string) => {
  const provider = getProviderName(modelId);
  switch (provider) {
    case 'Minimax':  // HaiLuo model
      return {
        primary: 'bg-cyan-100 border border-cyan-300', // Strong background
        icon: 'text-cyan-700', // Dark icon for visibility
        light: 'bg-cyan-50 border-cyan-200 text-cyan-700',
        text: 'text-cyan-600'
      };
    case 'Kling':  // Kling model
      return {
        primary: 'bg-amber-100 border border-amber-300', // Strong background
        icon: 'text-amber-700', // Dark icon for visibility
        light: 'bg-amber-50 border-amber-200 text-amber-700',
        text: 'text-amber-600'
      };
    case 'YourProvider':  // Add your provider colors
      return {
        primary: 'bg-purple-100 border border-purple-300',
        icon: 'text-purple-700',
        light: 'bg-purple-50 border-purple-200 text-purple-700',
        text: 'text-purple-600'
      };
    default:
      return {
        primary: 'bg-gray-100 border border-gray-300',
        icon: 'text-gray-700',
        light: 'bg-gray-50 border-gray-200 text-gray-700',
        text: 'text-gray-600'
      };
  }
};
```

**Key Architecture Changes:**
- **Icons**: Each model now has a specific Lucide React icon that represents its capabilities
- **Colors**: Stronger backgrounds (`-100` suffix) with darker icons (`-700` suffix) for better visibility
- **No Gradients**: Uses solid colors with borders for reliability across all browsers
- **Icon Colors**: Separate `icon` property in color scheme for proper contrast

### Step 3: Update Form Schema

Update the Zod schema in `client/src/pages/VideoPage.tsx`:

```typescript
const videoGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000, 'Prompt must be less than 2000 characters'),
  model: z.enum(['hailuo-02', 'kling-v2.1']), // Add your model here
  // Model-specific parameters
  // Kling v2.1 specific parameters
  negativePrompt: z.string().optional(),
  startImage: z.string().optional(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional(),
  // Shared parameters
  duration: z.number().int().min(5).max(10),
  projectId: z.string().optional(),
});
```

### Step 4: Add Model-Specific Form Logic

Add form defaults and model-specific UI sections:

```typescript
// Update form defaults when model changes
useEffect(() => {
  if (currentModel === 'kling-v2.1') {
    // Set Kling defaults
    form.setValue('duration', 5);
    form.setValue('aspectRatio', '16:9');
    form.setValue('negativePrompt', '');
  }
  // ... other models
}, [currentModel]);

// Add model-specific UI sections
{currentModel === 'kling-v2.1' && (
  <>
    {/* Aspect Ratio Selector */}
    <div className="space-y-3">
      <Label>Aspect Ratio</Label>
      <Select
        value={form.watch('aspectRatio')}
        onValueChange={(value) => form.setValue('aspectRatio', value)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
          <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
          <SelectItem value="1:1">1:1 (Square)</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Negative Prompt */}
    <div className="space-y-3">
      <Label>Negative Prompt (Optional)</Label>
      <Textarea
        placeholder="Things to avoid in the video..."
        {...form.register('negativePrompt')}
      />
    </div>
  </>
)}
```

### Step 5: Update Duration Options

Make duration options model-specific:

```typescript
{currentModel === 'kling-v2.1' ? (
  <>
    <SelectItem value="5" className="py-3">
      <div className="flex flex-col items-start">
        <span className="font-medium">5 seconds</span>
        <span className="text-xs text-muted-foreground">Standard duration</span>
      </div>
    </SelectItem>
    <SelectItem value="10" className="py-3">
      <div className="flex flex-col items-start">
        <span className="font-medium">10 seconds</span>
        <span className="text-xs text-muted-foreground">Extended duration</span>
      </div>
    </SelectItem>
  </>
) : null}
```

## Backend Integration

### Step 1: Update Server Model Configuration

Add your model to `server/config/models.ts`:

```typescript
export const VIDEO_MODELS = {
  'kling-v2.1': {
    provider: 'replicate',
    modelId: 'kuaishou/kling',
    version: '888fa151118db5e7b975a4145046bdadf4b60413d4229384ca793cc7213da68c',
    parameters: {
      prompt: {
        type: 'string',
        required: true,
        description: 'Text prompt for video generation'
      },
      duration: {
        type: 'integer',
        enum: [5, 10],
        default: 5,
        description: 'Duration of the video in seconds'
      },
      aspect_ratio: {
        type: 'string',
        enum: ['16:9', '9:16', '1:1'],
        default: '16:9',
        description: 'Aspect ratio of the video'
      },
      negative_prompt: {
        type: 'string',
        default: '',
        description: 'Things you do not want to see in the video'
      },
      start_image: {
        type: 'string',
        format: 'uri',
        description: 'First frame of the video (optional)'
      }
    }
  }
};
```

### Step 2: Update Parameter Mapping

In `server/providers/replicate-provider.ts`, add model-specific parameter mapping:

```typescript
// Map parameters for kling-v2.1 model
if (modelKey === 'kling-v2.1') {
  // For Kling, we need to send ONLY the exact parameters it expects
  const klingBody: Record<string, any> = {
    prompt: inputs.prompt, // required
    duration: inputs.duration || 5, // required, enum [5, 10]
    aspect_ratio: inputs.aspectRatio || '16:9', // required, default "16:9"
  };

  // Add optional parameters only if provided
  if (inputs.negativePrompt !== undefined && inputs.negativePrompt !== '') {
    klingBody.negative_prompt = inputs.negativePrompt;
  }
  if (inputs.startImage !== undefined && inputs.startImage !== '') {
    klingBody.start_image = inputs.startImage;
  }

  // Replace body with only valid Kling parameters
  body = klingBody;
}
```

### Step 3: Update Backend Validation Schema (CRITICAL)

**⚠️ CRITICAL:** Update the backend validation schema in `shared/schema.ts` to include your new model:

```typescript
export const generateVideoSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(2000, 'Prompt must be less than 2000 characters'),
  model: z.enum(['hailuo-02', 'kling-v2.1', 'your-new-model']), // Add your model here
  // ... rest of schema
});

// Also update the videoModelSchemas object:
export const videoModelSchemas = {
  // ... existing models
  "your-new-model": z.object({
    prompt: z.string().min(1).max(2000),
    // Add your model-specific parameters here
    duration: z.number().int().min(3).max(12), // Example
  }),
};
```

**Common Error:** If you forget this step, you'll see validation errors like:
```
400: {"error":"Invalid input","details":[{"received":"your-new-model","code":"invalid_enum_value","options":["hailuo-02","kling-v2.1"],"path":["model"],"message":"Invalid enum value. Expected 'hailuo-02' | 'kling-v2.1', received 'your-new-model'"}]}
```

### Step 4: Update Analytics Validation

Add your model to the valid models list in `server/analytics.ts`:

```typescript
const VALID_MODELS = [
  'gpt-image-1', 'imagen-4', 'imagen-3', 'flux-pro', 
  'flux-kontext-max', 'flux-krea-dev', 'wan-2.2', 'hailuo-02', 'kling-v2.1', 'your-new-model', 'upscale',
  'google/nano-banana'
];
```

## Validation & Error Handling

### Critical Lesson: Independent Model Validation

**Problem Encountered:** Cross-model validation was applied to all models, causing incorrect constraints.

**Solution:** Always scope validation to specific models:

```typescript
// Handle duration and resolution validation - ONLY for specific models
useEffect(() => {
  // Only apply this validation for models that need it
  if (currentModel !== 'hailuo-02') return;
  
  const currentDuration = form.watch('duration');
  const currentResolution = form.watch('resolution');
  
  // Model-specific validation logic here
}, [currentModel, form.watch('duration'), form.watch('resolution')]);
```

### Parameter Validation Checklist

1. **Frontend Schema**: Update Zod enum with your model ID
2. **Form Defaults**: Set appropriate defaults when model changes
3. **UI Conditionals**: Show/hide fields based on model capabilities
4. **Backend Mapping**: Send only parameters the API expects
5. **Analytics**: Add model to valid models list

### Step 2.1: Quick Reference - Adding a New Model Icon & Colors

When adding a new model, follow this checklist:

**1. Choose an appropriate Lucide React icon:**
- Physics/Science models: `Zap`, `Atom`, `Cpu`
- Creative/Artistic models: `Palette`, `Brush`, `Sparkles`
- Precision/Technical models: `Target`, `Crosshair`, `Settings`
- Speed/Performance models: `Bolt`, `Rocket`, `Gauge`

**2. Select a color theme:**
- Use distinct color families (cyan, amber, purple, emerald, rose, etc.)
- Always use: `-100` for backgrounds, `-300` for borders, `-700` for icons
- Example: `bg-emerald-100 border-emerald-300` with `text-emerald-700`

**3. Update three functions in ModelSelector.tsx:**
- `getProviderName()`: Map model ID to provider name
- `getModelIcon()`: Map model ID to Lucide icon component
- `getModelColors()`: Map provider to color scheme object

## Testing Plan

### Unit Tests
- [ ] Model selector shows new model with correct colors/labels
- [ ] Form renders model-specific fields
- [ ] Form validation accepts valid inputs, rejects invalid ones
- [ ] Parameter mapping produces correct API payload

### Integration Tests
- [ ] Video generation request succeeds with minimal payload
- [ ] Video generation request succeeds with full payload
- [ ] Invalid parameters return appropriate error messages
- [ ] Job polling completes successfully

### Manual Test Checklist
- [ ] Model appears in selector dropdown
- [ ] Model-specific fields appear when selected
- [ ] Other models' fields are hidden
- [ ] Duration constraints work correctly (no cross-model interference)
- [ ] Video generation completes successfully
- [ ] Generated video plays correctly
- [ ] Analytics events are tracked without "Invalid model" warnings

### Edge Cases
- [ ] Very long prompts (near 2000 character limit)
- [ ] Empty optional fields (negative prompt, start image)
- [ ] Maximum duration selection
- [ ] Different aspect ratios
- [ ] Network failures during generation
- [ ] Provider API errors

## Performance & Cost Notes

### Kling v2.1 Characteristics (Example)
- **Typical Generation Time**: 5-15 minutes (system supports up to 20 minutes)
- **Quality**: High (1080p fixed resolution)
- **Cost Considerations**: 10-second videos cost more than 5-second
- **Reliability**: Generally stable, standard Replicate polling

### Polling Strategy
- **Initial Interval**: 10 seconds (video job polling)
- **Backoff**: Exponential up to 5 seconds max (Replicate API polling)
- **Timeout**: 20 minutes total (system & job queue)
- **Retry Logic**: Standard Replicate error handling
- **Max Attempts**: 120 polling attempts for video jobs

## Security & Privacy

### Parameter Sanitization
- Validate all enum values server-side
- Limit string lengths (prompts, negative prompts)
- Validate image URLs if accepting external images
- Sanitize file uploads

### API Key Management
- Store provider API keys in environment variables
- Never log API keys or user prompts with PII
- Use appropriate request timeouts

### User Data
- Only store necessary metadata
- Don't log sensitive prompt content
- Respect user privacy in analytics

## Maintenance & Versioning

### File Locations to Update
- Frontend: `client/src/config/models.ts`, `client/src/components/ModelSelector.tsx`, `client/src/pages/VideoPage.tsx`
- Backend: `server/config/models.ts`, `server/providers/replicate-provider.ts`, `server/analytics.ts`
- Types: `shared/schema.ts` if adding new database fields

### Deployment Checklist
- [ ] Test in development environment
- [ ] Verify analytics tracking works
- [ ] Check all model-specific UI behaviors
- [ ] Validate API parameter mapping
- [ ] Monitor first production generations

## Change Log

### 2025-09-09 17:15 - Model Selector Architecture Update
- **NEW**: Implemented distinctive icon and color system for model selector
- **Icon System**: Each model now has specific Lucide React icon (Zap for HaiLuo, Target for Kling)
- **Color Architecture**: Switched from unreliable gradients to solid backgrounds with strong contrast
- **Visibility Fix**: Icons now use dark colors (`-700` suffix) on light backgrounds (`-100` suffix)
- **UI Cleanup**: Removed badges for cleaner appearance, updated text content
- **Documentation**: Updated integration guide with new architecture patterns

### 2025-09-09 16:00 - Critical Timeout Fix
- **CRITICAL**: Fixed 5-minute timeout bug causing false failures
- Video job polling increased from 30 to 120 attempts (5min → 20min)
- Job queue timeout increased from 300,000ms to 1,200,000ms (5min → 20min)
- Issue: Videos taking >5min (like Kling v2.1 at 7m57s) marked as failed despite Replicate success
- Impact: All video models now properly support long-duration generations

### 2025-09-09 15:30 - Guide Created
- Created comprehensive video model integration guide
- Based on successful Kling v2.1 Master integration
- Includes real examples of frontend/backend integration
- Documents critical lessons learned (independent model validation)
- Established testing checklist and maintenance procedures
- Source integration: Kling v2.1 Master model with 5/10s duration, 1080p fixed resolution, aspect ratio support, negative prompts, and start image capability