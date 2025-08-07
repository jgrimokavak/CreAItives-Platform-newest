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

## Common Errors and Solutions

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

## File Checklist

When adding a new model, ensure changes are made to:

### Backend Files:
- [ ] `server/config/models.ts` - Model configuration and schema
- [ ] `server/providers/[provider]-provider.ts` - Implementation and field mapping
- [ ] `server/routes.ts` - API endpoints (usually auto-handled)

### Frontend Files:
- [ ] `client/src/lib/formSchemas.ts` - Zod schemas, defaults, and types
- [ ] `client/src/lib/modelCatalog.ts` - UI display configuration
- [ ] `client/src/components/DynamicForm.tsx` - Custom UI components
- [ ] Import statements updated where needed

### Validation Files:
- [ ] TypeScript compilation passes
- [ ] LSP diagnostics clear
- [ ] Model appears in UI selector
- [ ] Form validation works
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

## Success Indicators

- [ ] Model appears in create page dropdown
- [ ] All model-specific fields render correctly
- [ ] Form validation works properly  
- [ ] Generate button creates job successfully
- [ ] Images are generated and saved to gallery
- [ ] No TypeScript or runtime errors
- [ ] UI is responsive and accessible

This guide should be referenced whenever adding new AI models to ensure consistent, error-free integration.