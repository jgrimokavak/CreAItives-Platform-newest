import React from "react";
import { ModelKey, modelCatalog, fluxAspectRatios, imagenAspectRatios, fluxKontextAspectRatios, wan22AspectRatios } from "@/lib/modelCatalog";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UseFormReturn } from "react-hook-form";
import { GenericFormValues } from "@/lib/formSchemas";
import ReferenceImageUpload from "@/components/ReferenceImageUpload";

interface DynamicFormProps {
  modelKey: ModelKey;
  form: UseFormReturn<GenericFormValues>;
  availableModels?: Record<string, any>;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ modelKey, form, availableModels }) => {
  const modelsToUse = availableModels || modelCatalog;
  const fields = modelsToUse[modelKey].visible;
  
  // Type to allow any form field name as a valid input
  type FormFieldName = keyof GenericFormValues;

  return (
    <div className="space-y-4">
      {/* Size field for GPT-Image-1 (renamed to Aspect Ratio) */}
      {fields.includes("size") && (
        <FormField
          control={form.control}
          name={"size" as FormFieldName}
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-sm font-medium">Aspect Ratio</FormLabel>
              <div className="flex items-center gap-3">
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value as string}
                >
                  <FormControl>
                    <SelectTrigger className="h-9 text-sm flex-grow">
                      <SelectValue placeholder="Select aspect ratio" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Recommended)</SelectItem>
                    <SelectItem value="1024x1024">1:1 (Square)</SelectItem>
                    <SelectItem value="1536x1024">16:9 (Landscape)</SelectItem>
                    <SelectItem value="1024x1536">9:16 (Portrait)</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Visual aspect ratio indicator */}
                {field.value && (
                  <div className="bg-primary/5 rounded p-1.5 border border-primary/10 flex items-center justify-center">
                    {field.value === "1024x1024" && (
                      <div className="w-8 h-8 bg-primary/20 rounded"></div>
                    )}
                    {field.value === "1536x1024" && (
                      <div className="w-10 h-6 bg-primary/20 rounded"></div>
                    )}
                    {field.value === "1024x1536" && (
                      <div className="w-6 h-10 bg-primary/20 rounded"></div>
                    )}
                    {field.value === "auto" && (
                      <div className="w-8 h-8 bg-primary/20 rounded"></div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Choose the dimensions that best suit your needs
              </p>
            </FormItem>
          )}
        />
      )}

      {/* Number of Images and Quality in a grid for GPT-Image-1 */}
      {(fields.includes("n") || fields.includes("quality")) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Number of Images field */}
          {fields.includes("n") && (
            <FormField
              control={form.control}
              name={"count" as FormFieldName}
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm font-medium">Number of Images</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value as string}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="How many?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 Image</SelectItem>
                      <SelectItem value="2">2 Images</SelectItem>
                      <SelectItem value="4">4 Images</SelectItem>
                      <SelectItem value="6">6 Images</SelectItem>
                      <SelectItem value="8">8 Images</SelectItem>
                      <SelectItem value="10">10 Images</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}

          {/* Quality field */}
          {fields.includes("quality") && (
            <FormField
              control={form.control}
              name={"quality" as FormFieldName}
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm font-medium">Quality Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value as string}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Select quality" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="auto">Auto (Recommended)</SelectItem>
                      <SelectItem value="high">High (More details)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="low">Low (Faster)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}
        </div>
      )}

      {/* Aspect Ratio field with visual indicator */}
      {fields.includes("aspect_ratio") && (
        <FormField
          control={form.control}
          name={"aspect_ratio" as FormFieldName}
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-sm font-medium">Aspect Ratio</FormLabel>
              <div className="flex items-center gap-3">
                <Select
                  onValueChange={field.onChange}
                  defaultValue={(field.value as string) || "1:1"}
                >
                  <FormControl>
                    <SelectTrigger className="h-9 text-sm flex-grow">
                      <SelectValue placeholder="Select aspect ratio" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {/* Different aspect ratio options depending on model */}
                    {modelKey === "flux-pro" ? (
                      fluxAspectRatios.map(ratio => (
                        <SelectItem key={ratio} value={ratio}>
                          {ratio} {ratio === "1:1" ? "(Square)" : 
                                  ratio === "16:9" ? "(Landscape)" : 
                                  ratio === "9:16" ? "(Portrait)" : ""}
                        </SelectItem>
                      ))
                    ) : modelKey === "flux-kontext-max" ? (
                      fluxKontextAspectRatios.map(ratio => (
                        <SelectItem key={ratio} value={ratio}>
                          {ratio === "match_input_image" ? "Match Input Image" :
                           ratio === "1:1" ? "1:1 (Square)" : 
                           ratio === "16:9" ? "16:9 (Landscape)" : 
                           ratio === "9:16" ? "9:16 (Portrait)" : 
                           ratio === "4:3" ? "4:3 (Classic)" : 
                           ratio === "3:4" ? "3:4 (Portrait)" : ratio}
                        </SelectItem>
                      ))
                    ) : modelKey === "wan-2.2" ? (
                      wan22AspectRatios.map(ratio => (
                        <SelectItem key={ratio} value={ratio}>
                          {ratio} {ratio === "1:1" ? "(Square)" : 
                                  ratio === "16:9" ? "(Landscape)" : 
                                  ratio === "9:16" ? "(Portrait)" : 
                                  ratio === "4:3" ? "(Classic)" : 
                                  ratio === "3:4" ? "(Portrait)" : 
                                  ratio === "21:9" ? "(Ultra-wide)" : ""}
                        </SelectItem>
                      ))
                    ) : (
                      imagenAspectRatios.map(ratio => (
                        <SelectItem key={ratio} value={ratio}>
                          {ratio} {ratio === "1:1" ? "(Square)" : 
                                  ratio === "16:9" ? "(Landscape)" : 
                                  ratio === "9:16" ? "(Portrait)" : 
                                  ratio === "4:3" ? "(Classic)" : 
                                  ratio === "3:4" ? "(Portrait)" : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                
                {/* Visual aspect ratio indicator */}
                {field.value && (
                  <div className="bg-primary/5 rounded p-1.5 border border-primary/10 flex items-center justify-center">
                    {field.value === "1:1" && (
                      <div className="w-8 h-8 bg-primary/20 rounded"></div>
                    )}
                    {field.value === "16:9" && (
                      <div className="w-10 h-6 bg-primary/20 rounded"></div>
                    )}
                    {field.value === "9:16" && (
                      <div className="w-6 h-10 bg-primary/20 rounded"></div>
                    )}
                    {field.value === "4:3" && (
                      <div className="w-8 h-6 bg-primary/20 rounded"></div>
                    )}
                    {field.value === "3:4" && (
                      <div className="w-6 h-8 bg-primary/20 rounded"></div>
                    )}
                    {field.value === "3:2" && (
                      <div className="w-9 h-6 bg-primary/20 rounded"></div>
                    )}
                    {field.value === "2:3" && (
                      <div className="w-6 h-9 bg-primary/20 rounded"></div>
                    )}
                    {field.value === "5:4" && (
                      <div className="w-8 h-7 bg-primary/20 rounded"></div>
                    )}
                    {field.value === "4:5" && (
                      <div className="w-6 h-8 bg-primary/20 rounded"></div>
                    )}
                    {field.value === "21:9" && (
                      <div className="w-12 h-4 bg-primary/20 rounded"></div>
                    )}
                  </div>
                )}
              </div>
            </FormItem>
          )}
        />
      )}

      {/* Negative Prompt field for Imagen-3 */}
      {fields.includes("negative_prompt") && (
        <FormField
          control={form.control}
          name={"negative_prompt" as FormFieldName}
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-sm font-medium">Negative Prompt</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Specify what you don't want in the image (e.g., blurry, low quality, distorted faces)"
                  className="resize-none min-h-[80px] text-sm"
                  value={field.value as string || ''}
                  onChange={field.onChange}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                This helps avoid unwanted elements and improve image quality
              </p>
            </FormItem>
          )}
        />
      )}

      {/* Seed field for Flux-Pro and Flux-Kontext-Max */}
      {fields.includes("seed") && (
        <FormField
          control={form.control}
          name={"seed" as FormFieldName}
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-sm font-medium">
                Seed Number <span className="text-xs text-muted-foreground">(Optional)</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="2147483647"
                  placeholder="Leave empty for random results"
                  className="h-9 text-sm"
                  value={field.value !== undefined ? field.value.toString() : ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Use the same seed to create variations of similar images
              </p>
            </FormItem>
          )}
        />
      )}

      {/* Prompt Upsampling field for Flux-Kontext-Max */}
      {fields.includes("prompt_upsampling") && (
        <FormField
          control={form.control}
          name={"prompt_upsampling" as FormFieldName}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm space-y-0">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium">Prompt Upsampling</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Automatically improve and enhance your prompt
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value as boolean}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}

      {/* Safety Tolerance field for Flux-Kontext-Max */}
      {fields.includes("safety_tolerance") && (
        <FormField
          control={form.control}
          name={"safety_tolerance" as FormFieldName}
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-sm font-medium">Safety Tolerance</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                defaultValue={(field.value as number)?.toString() || "2"}
              >
                <FormControl>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select safety level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">0 - Most Strict</SelectItem>
                  <SelectItem value="1">1 - Very Strict</SelectItem>
                  <SelectItem value="2">2 - Strict (Default)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Safety tolerance from 0 (most strict) to 2 (maximum allowed for image editing)
              </p>
            </FormItem>
          )}
        />
      )}

      {/* Output Format field for Flux-Kontext-Max */}
      {fields.includes("output_format") && (
        <FormField
          control={form.control}
          name={"output_format" as FormFieldName}
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-sm font-medium">Output Format</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={(field.value as string) || "png"}
              >
                <FormControl>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="png">PNG (Lossless)</SelectItem>
                  <SelectItem value="jpg">JPG (Smaller file size)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the output image format
              </p>
            </FormItem>
          )}
        />
      )}
      
      {/* Image Upload for flux-krea-dev */}
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


      {/* Number of Outputs for flux-krea-dev */}
      {fields.includes("num_outputs") && (
        <FormField
          control={form.control}
          name={"num_outputs" as FormFieldName}
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-sm font-medium">Number of Outputs</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                defaultValue={field.value?.toString() || "1"}
              >
                <FormControl>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="How many images?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">1 Image</SelectItem>
                  <SelectItem value="2">2 Images</SelectItem>
                  <SelectItem value="3">3 Images</SelectItem>
                  <SelectItem value="4">4 Images</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      )}

      {/* Go Fast toggle for flux-krea-dev */}
      {fields.includes("go_fast") && (
        <FormField
          control={form.control}
          name={"go_fast" as FormFieldName}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm space-y-0 mt-3 bg-gradient-to-r from-purple-50 to-violet-50">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium">Go Fast</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Run faster predictions with additional optimizations
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value as boolean}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-purple-600"
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}

      {/* Juiced toggle for wan-2.2 */}
      {fields.includes("juiced") && (
        <FormField
          control={form.control}
          name={"juiced" as FormFieldName}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm space-y-0 mt-3 bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium">Juiced</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Apply bold cinematic enhancements: increased contrast, dramatic lighting, stylized color grading, and enhanced mood and atmosphere
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value as boolean}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-sky-500"
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}

      {/* KAVAK Style toggle for all models */}
      {fields.includes("kavakStyle") && (
        <FormField
          control={form.control}
          name={"kavakStyle" as FormFieldName}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm space-y-0 mt-3 bg-gradient-to-r from-violet-50 to-indigo-50">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium">KAVAK Style</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Apply professional product photography style with dramatic lighting
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value as boolean}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-violet-600"
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </div>
  );
};

export default DynamicForm;