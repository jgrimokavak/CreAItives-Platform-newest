import React from "react";
import { ModelKey, modelCatalog, fluxAspectRatios, imagenAspectRatios } from "@/lib/modelCatalog";
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
import { UseFormReturn } from "react-hook-form";
import { GenericFormValues } from "@/lib/formSchemas";

interface DynamicFormProps {
  modelKey: ModelKey;
  form: UseFormReturn<GenericFormValues>;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ modelKey, form }) => {
  const fields = modelCatalog[modelKey].visible;

  return (
    <div className="space-y-4">
      {/* Size field for GPT-Image-1 */}
      {fields.includes("size") && (
        <FormField
          control={form.control}
          name="size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Size</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                  <SelectItem value="1536x1024">1536 × 1024 (Landscape)</SelectItem>
                  <SelectItem value="1024x1536">1024 × 1536 (Portrait)</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      )}

      {/* Quality field for GPT-Image-1 */}
      {fields.includes("quality") && (
        <FormField
          control={form.control}
          name="quality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quality</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      )}

      {/* Number of Images field for GPT-Image-1 */}
      {fields.includes("n") && (
        <FormField
          control={form.control}
          name="count"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Images</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select count" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">1 Image</SelectItem>
                  <SelectItem value="2">2 Images</SelectItem>
                  <SelectItem value="3">3 Images</SelectItem>
                  <SelectItem value="4">4 Images</SelectItem>
                  <SelectItem value="5">5 Images</SelectItem>
                  <SelectItem value="6">6 Images</SelectItem>
                  <SelectItem value="7">7 Images</SelectItem>
                  <SelectItem value="8">8 Images</SelectItem>
                  <SelectItem value="9">9 Images</SelectItem>
                  <SelectItem value="10">10 Images</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      )}

      {/* Aspect Ratio field for Replicate models */}
      {fields.includes("aspect_ratio") && (
        <FormField
          control={form.control}
          name="aspect_ratio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aspect Ratio</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || "1:1"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select aspect ratio" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* Different aspect ratio options depending on model */}
                  {modelKey === "flux-pro" ? (
                    fluxAspectRatios.map(ratio => (
                      <SelectItem key={ratio} value={ratio}>
                        {ratio}
                      </SelectItem>
                    ))
                  ) : (
                    imagenAspectRatios.map(ratio => (
                      <SelectItem key={ratio} value={ratio}>
                        {ratio}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">Choose the output image dimensions ratio.</p>
            </FormItem>
          )}
        />
      )}

      {/* Negative Prompt field for Imagen-3 */}
      {fields.includes("negative_prompt") && (
        <FormField
          control={form.control}
          name="negative_prompt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Negative Prompt</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Elements to avoid in the generated image"
                  className="resize-none min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <p className="text-xs text-slate-500 mt-1">Specify elements you want to exclude from the image.</p>
            </FormItem>
          )}
        />
      )}

      {/* Seed field for Flux-Pro */}
      {fields.includes("seed") && (
        <FormField
          control={form.control}
          name="seed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seed</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="2147483647"
                  placeholder="Random seed (optional)"
                  className="w-full"
                  value={field.value !== undefined ? field.value : ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                    field.onChange(value);
                  }}
                />
              </FormControl>
              <p className="text-xs text-slate-500 mt-1">Set for reproducible generation. Leave empty for random results.</p>
            </FormItem>
          )}
        />
      )}
    </div>
  );
};

export default DynamicForm;