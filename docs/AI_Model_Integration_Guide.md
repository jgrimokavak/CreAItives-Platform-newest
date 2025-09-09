# AI Model Integration Guide for CreAItives Platform

## Overview
This guide provides the exact process for successfully adding new AI models to the "Create" page, based on the flux-krea-dev integration experience and all errors encountered during the process.

## Prerequisites
- Model must be available via the provider API (OpenAI, Replicate)
- Model parameters and schema must be documented
- Provider authentication must be configured

## Step-by-Step Integration Process

### 1. Backend Model Configuration

#### 1.1 Add Model to Provider Configuration
**File**: `server/config/models.ts`

```typescript
// Add to the appropriate provider section
export const replicateModels = {
  // ... existing models
  "flux-krea-dev": {
    slug: "black-forest-labs/flux-krea-dev",
    supportsEdit: false,
    visible: ["prompt", "Image", "aspect_ratio", "num_outputs", "go_fast"],
    schema: {
      // Define all model parameters with types and constraints
      prompt: { type: "string", required: true },
      image: { type: "file", required: false },
      aspect_ratio: { type: "string", enum: ["1:1", "16:9", "9:16", "4:3", "3:4"], default: "1:1" },
      num_outputs: { type: "integer", min: 1, max: 4, default: 1 },
      go_fast: { type: "boolean", default: false }
    }
  }
};
```

**Critical Points**:
- `visible` array determines which fields appear in the UI
- Field names must match exactly between backend and frontend
- `supportsEdit` determines if model appears in edit section

#### 1.2 Update Provider Implementation
**File**: `server/providers/replicate-provider.ts`

```typescript
// Ensure proper TypeScript typing for body objects
const body: Record<string, any> = {
  input: {}
};

// Add field mapping if frontend/backend names differ
if (modelKey === "flux-krea-dev" && values.Image) {
  body.input.image = values.Image; // Map frontend "Image" to backend "image"
}
```

**Common Issues Fixed**:
- TypeScript errors: Always type body objects as `Record<string, any>`
- Field mapping: Handle cases where frontend field names differ from API parameter names

### 2. Frontend Form Configuration

#### 2.1 Add Model Schema and Defaults
**File**: `client/src/lib/formSchemas.ts`

```typescript
// Add to modelSchemas
"flux-krea-dev": z.object({
  prompt: z.string().min(1, "Prompt is required"),
  Image: z.string().optional(), // Note: Capital "I" for frontend
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).default("1:1"),
  num_outputs: z.number().int().min(1).max(4).default(1),
  go_fast: z.boolean().default(false),
}),

// Add to modelDefaults  
"flux-krea-dev": {
  prompt: "",
  Image: undefined,
  aspect_ratio: "1:1",
  num_outputs: 1,
  go_fast: false,
},
```

**Critical Points**:
- Schema validation must match exactly what the model expects
- Default values prevent form validation errors
- Field names in frontend may differ from backend (handle in provider)

#### 2.2 Update Type Definitions
**File**: `client/src/lib/formSchemas.ts`

```typescript
// Add model-specific fields to GenericFormValues type
export type GenericFormValues = {
  // ... existing fields
  
  // flux-krea-dev specific fields
  Image?: string;
  aspect_ratio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  num_outputs?: number;
  go_fast?: boolean;
};
```

### 3. UI Component Integration

#### 3.1 Add Model to Catalog
**File**: `client/src/lib/modelCatalog.ts`

```typescript
export const modelCatalog = {
  // ... existing models
  "flux-krea-dev": {
    label: "Flux Krea Dev",
    description: "High-quality image generation with reference image support",
    visible: ["prompt", "Image", "aspect_ratio", "num_outputs", "go_fast"]
  }
};
```

#### 3.2 Implement Custom UI Components (if needed)
**File**: `client/src/components/DynamicForm.tsx`

For special field types like file uploads, create custom components:

```typescript
// Image Upload for flux-krea-dev
{fields.includes("Image") && (
  <FormField
    control={form.control}
    name={"Image" as FormFieldName}
    render={({ field }) => (
      <FormItem className="space-y-1.5">
        <FormLabel className="text-sm font-medium">Reference Image (Optional)</FormLabel>
        <FormControl>
          <ReferenceImageUpload
            value={field.value as string}
            onChange={field.onChange}
          />
        </FormControl>
      </FormItem>
    )}
  />
)}
```

### 4. Testing and Validation

#### 4.1 Check for TypeScript Errors
```bash
# Use LSP diagnostics to identify issues
# Common errors to watch for:
# - Missing imports
# - Type mismatches
# - Undefined properties
```

#### 4.2 Test Model Integration
1. Select the new model in the UI
2. Fill out form with test values
3. Submit and verify API call
4. Check generated images appear in gallery

## Critical Integration Points (Lessons from ByteDance Seedream 4.0)

### 5. Shared Schema Validation
**File**: `shared/schema.ts`

**CRITICAL**: Update ALL validation schemas, not just frontend forms:

```typescript
// 1. Update generateImageSchema
export const generateImageSchema = {
  // ... existing models
  "bytedance/seedream-4": z.object({
    prompt: z.string().min(1).max(32000),
    image_input: z.array(z.string()).optional().default([]),
    size: z.enum(["1K", "2K", "4K"]).default("4K"),
    aspect_ratio: z.enum(["match_input_image", "1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"]).default("1:1"),
    sequential_image_generation: z.enum(["disabled", "auto"]).default("disabled"),
    max_images: z.number().int().min(1).max(15).default(1),
  })
};

// 2. Update generateSchema if needed
// 3. Ensure all related schemas are updated
```

### 6. Backend API Route Validation
**Files**: 
- `server/routes/enhancePrompt.ts`
- `server/routes/promptSuggestions.ts`

**CRITICAL**: Add model to ALL backend validation schemas:

```typescript
// enhancePrompt.ts
const bodySchema = z.object({
  text: z.string().min(3),
  model: z.enum([
    "gpt-image-1", 
    "imagen-3", 
    "imagen-4", 
    "flux-pro", 
    "flux-kontext-max", 
    "flux-krea-dev", 
    "wan-2.2", 
    "google/nano-banana",
    "bytedance/seedream-4" // ADD NEW MODEL HERE
  ]),
});

// promptSuggestions.ts - Same validation schema update required
```

**CRITICAL**: Add model-specific guidance for AI enhance:

```typescript
// In enhancePrompt.ts systemTemplate function
case "bytedance/seedream-4":
  modelSpecificGuidance = "For Seedream 4.0: This model excels at ultra-high resolution (4K) image generation with rich prompt understanding. Emphasize detailed descriptions, realistic textures, and high-quality visual elements. Perfect for multi-reference image workflows and sequential generation.";
  break;
```

### 7. Model Selector UI Integration
**File**: `client/src/components/AIModelSelector.tsx`

**CRITICAL**: Update BOTH icon locations (selected display AND dropdown list):

```typescript
// 1. Add import for new icon
import { Maximize2 } from "lucide-react";

// 2. Update provider mapping
const getProviderName = (modelKey: ModelKey): string => {
  // ... existing providers
  if (modelKey === "bytedance/seedream-4") return "ByteDance";
  return "Google";
};

// 3. Update feature highlights
const getFeatureHighlight = (modelKey: ModelKey): string => {
  // ... existing cases
  case "bytedance/seedream-4": return "4K realism";
  default: return "";
};

// 4. Update BOTH icon rendering locations:
// Selected model display (around line 116)
) : value === "bytedance/seedream-4" ? (
  <Maximize2 className="h-4 w-4 text-white" />

// Dropdown list display (around line 208) - EASY TO MISS!
) : modelKey === "bytedance/seedream-4" ? (
  <Maximize2 className="h-3.5 w-3.5 text-white" />
```

### 8. Color System Integration
**File**: `client/src/lib/modelColors.ts`

**CRITICAL**: Choose distinctive colors and add provider mapping:

```typescript
// 1. Add provider color definition
"bytedance": {
  light: "#e11d48", // Rose red - ensure it's distinctive
  medium: "#be123c",
  dark: "#9f1239",
  bg: "#ffe4e6",
  bgHover: "#fecdd3",
  text: "#e11d48"
},

// 2. Add to getModelColors function
} else if (modelKey === "bytedance/seedream-4") {
  return providerColors["bytedance"];
}
```

### 9. Conditional Field Display
**File**: `client/src/components/DynamicForm.tsx`

**CRITICAL**: Implement proper conditional field logic:

```typescript
// Only show max_images when sequential generation is "auto"
{fields.includes("max_images") && form.watch("sequential_image_generation") === "auto" && (
  <FormField
    control={form.control}
    name={"max_images" as FormFieldName}
    render={({ field }) => (
      // Field implementation
    )}
  />
)}
```

### 10. Default Value Handling
**Files**: 
- `shared/schema.ts`
- `client/src/lib/formSchemas.ts`
- `client/src/components/DynamicForm.tsx`

**CRITICAL**: Ensure consistent defaults across all files:

```typescript
// In DynamicForm.tsx for Select components
<Select
  onValueChange={field.onChange}
  defaultValue={(field.value as string) || "4K"} // Provide fallback
  value={field.value as string}
>
```

## Common Errors and Solutions (Updated)

### Error 1: "No replacement was performed" in str_replace
**Cause**: Field missing from frontend form schemas
**Solution**: Add complete schema definition to `client/src/lib/formSchemas.ts`

### Error 2: TypeScript "Cannot access property" errors
**Cause**: Body objects not properly typed
**Solution**: Type as `Record<string, any>` in provider files

### Error 3: Field validation errors
**Cause**: Frontend field names don't match backend expectations
**Solution**: Add field mapping in provider implementation

### Error 4: Form submission does nothing
**Cause**: Missing model from frontend modelSchemas or modelDefaults
**Solution**: Ensure model is defined in both objects

### Error 5: UI component not rendering
**Cause**: Missing import statements
**Solution**: Add proper imports to DynamicForm.tsx

### Error 6: AI Enhance/Prompt Suggestions not working
**Cause**: Model missing from backend route validation schemas
**Solution**: Add model to `enhancePrompt.ts` and `promptSuggestions.ts` enum arrays

### Error 7: Icon not showing in dropdown
**Cause**: Icon only updated in selected display, not dropdown list
**Solution**: Update icon mapping in BOTH locations in AIModelSelector.tsx

### Error 8: Color too similar to existing models
**Cause**: Poor color choice without checking existing models
**Solution**: Review all existing colors in modelColors.ts and choose distinctive ones

### Error 9: Conditional fields always showing
**Cause**: Missing conditional logic in DynamicForm.tsx
**Solution**: Use form.watch() to conditionally render fields based on other field values

### Error 10: "Invalid model attempted to be logged" in analytics
**Cause**: Model validation in analytics doesn't include new model
**Solution**: Update analytics model validation (though this may be handled automatically)

### Error 11: Multiple validation schema conflicts
**Cause**: Inconsistent schema definitions across shared/schema.ts and frontend
**Solution**: Update ALL related schemas: generateImageSchema, generateSchema, modelFormSchemas

## Comprehensive File Checklist (Updated)

When adding a new model, ensure changes are made to:

### Backend Files:
- [ ] `server/config/models.ts` - Model configuration and schema
- [ ] `server/providers/[provider]-provider.ts` - Implementation and field mapping
- [ ] `server/routes/enhancePrompt.ts` - Add model to validation enum
- [ ] `server/routes/promptSuggestions.ts` - Add model to validation enum
- [ ] `server/routes.ts` - API endpoints (usually auto-handled)

### Frontend Files:
- [ ] `client/src/lib/formSchemas.ts` - Zod schemas, defaults, and types
- [ ] `client/src/lib/modelCatalog.ts` - UI display configuration
- [ ] `client/src/components/DynamicForm.tsx` - Custom UI components and conditional logic
- [ ] `client/src/components/AIModelSelector.tsx` - Icon mapping (BOTH locations), provider mapping, feature highlights
- [ ] `client/src/lib/modelColors.ts` - Color definitions and mapping
- [ ] Import statements updated where needed

### Shared Files:
- [ ] `shared/schema.ts` - Update ALL validation schemas (generateImageSchema, generateSchema, etc.)

### UI Integration Files:
- [ ] Icon imports added to AIModelSelector.tsx
- [ ] Color scheme distinctive from existing models
- [ ] Provider name mapping added
- [ ] Feature highlight text added
- [ ] Conditional field display logic implemented

### Backend AI Features:
- [ ] Model added to enhancePrompt validation
- [ ] Model-specific guidance added to enhancePrompt system template
- [ ] Model added to promptSuggestions validation

### Validation Files:
- [ ] TypeScript compilation passes
- [ ] LSP diagnostics clear
- [ ] Model appears in UI selector with correct icon and color
- [ ] Form validation works
- [ ] Default values populate correctly
- [ ] Conditional fields show/hide properly
- [ ] AI Enhance button works
- [ ] Prompt suggestions work
- [ ] API calls successful
- [ ] Images generate and save

## Field Mapping Best Practices

1. **Consistent Naming**: Try to keep frontend and backend field names identical
2. **Case Sensitivity**: Pay attention to capitalization differences
3. **File Uploads**: Use base64 data URLs for image fields
4. **Validation**: Always provide appropriate Zod validation rules
5. **Defaults**: Set sensible default values to prevent form errors

## UI Component Guidelines

1. **Reuse Components**: Copy successful patterns from existing models
2. **Enhanced Uploads**: Use ReferenceImageUpload for file inputs instead of basic HTML inputs
3. **Validation Feedback**: Ensure form validation errors are displayed
4. **Responsive Design**: Test on different screen sizes
5. **Accessibility**: Include proper labels and descriptions

## Success Indicators (Comprehensive)

### Basic Functionality:
- [ ] Model appears in create page dropdown with correct name
- [ ] Model has distinctive icon and color (not similar to existing models)
- [ ] All model-specific fields render correctly
- [ ] Form validation works properly
- [ ] Default values are set and display correctly
- [ ] Conditional fields show/hide as expected

### Advanced Features:
- [ ] AI Enhance button works without errors
- [ ] Prompt suggestions generate successfully
- [ ] Model-specific guidance appears in enhanced prompts
- [ ] Generate button creates job successfully
- [ ] Images are generated and saved to gallery

### Technical Validation:
- [ ] No TypeScript or runtime errors
- [ ] LSP diagnostics are clear
- [ ] All validation schemas are synchronized
- [ ] Backend routes accept the new model
- [ ] Analytics tracking works (no "Invalid model" errors)

### UI/UX Validation:
- [ ] Icon appears in both selected display AND dropdown list
- [ ] Color scheme is distinctive and readable
- [ ] UI is responsive and accessible
- [ ] Provider name displays correctly
- [ ] Feature highlight text is appropriate

## Post-Integration Testing

After completing the integration, test these scenarios:

1. **Basic Generation**: Select model, enter prompt, generate image
2. **AI Enhancement**: Click "AI Enhance" and verify it works
3. **Prompt Suggestions**: Type a prompt and verify suggestions appear
4. **Conditional Fields**: Test any conditional field display logic
5. **Default Values**: Verify all defaults are set correctly
6. **Form Validation**: Test with invalid inputs to ensure validation works
7. **Image Upload**: If the model supports image input, test file uploads
8. **Multiple Outputs**: If supported, test generating multiple images

## Integration Time Estimate

Based on the ByteDance Seedream 4.0 integration experience:
- **Simple model (basic text-to-image)**: 30-45 minutes
- **Complex model (multiple inputs, conditional fields)**: 1-2 hours
- **Model with custom UI components**: 2-3 hours

The majority of time is spent on:
1. Updating all validation schemas (15-20 minutes)
2. UI integration and styling (20-30 minutes)
3. Testing and debugging (20-40 minutes)

This guide should be referenced whenever adding new AI models to ensure consistent, error-free integration. Following this checklist will prevent the common issues encountered during the ByteDance Seedream 4.0 integration.