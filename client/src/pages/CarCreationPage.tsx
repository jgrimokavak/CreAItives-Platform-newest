import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Car, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GeneratedImage } from "@/types/image";
import ErrorState from "@/components/ErrorState";
import ImageCard from "@/components/ImageCard";

// Form schema for car creation
const carFormSchema = z.object({
  makeId: z.string().min(1, "Car make is required"),
  modelId: z.string().min(1, "Car model is required"),
  year: z.coerce
    .number()
    .int()
    .min(1990, "Year must be 1990 or later")
    .max(2025, "Year must be 2025 or earlier"),
  body_style: z.string().min(1, "Body style is required"),
  color: z.string().min(1, "Color is required"),
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "3:4", "4:3"]),
  bg: z.enum(["white", "hub"])
});

type CarFormValues = z.infer<typeof carFormSchema>;

// Body style options
const BODY_STYLES = [
  "Sedan",
  "SUV",
  "Coupe",
  "Convertible",
  "Hatchback",
  "Pickup Truck",
  "Minivan",
  "Wagon",
  "Crossover"
];

// Default form values
const defaultValues: CarFormValues = {
  makeId: "",
  modelId: "",
  year: 2023,
  body_style: "Sedan",
  color: "Silver",
  aspect_ratio: "16:9",
  bg: "white"
};

export default function CarCreationPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Form setup
  const form = useForm<CarFormValues>({
    resolver: zodResolver(carFormSchema),
    defaultValues
  });

  // Get selected make ID
  const selectedMakeId = form.watch("makeId");

  // Define types for car data
  interface CarMake {
    id: string;
    name: string;
  }

  interface CarModel {
    id: string;
    name: string;
    makeId: string;
  }

  // Fetch car makes
  const { data: makes = [], isLoading: isLoadingMakes } = useQuery<CarMake[]>({
    queryKey: ["/api/cars/makes"],
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
  });

  // Fetch car models when make changes
  const { data: models = [], isLoading: isLoadingModels } = useQuery<CarModel[]>({
    queryKey: ["/api/cars/models", selectedMakeId],
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    enabled: !!selectedMakeId, // Only fetch when makeId is selected
  });

  // Reset model selection when make changes
  useEffect(() => {
    if (selectedMakeId) {
      form.setValue("modelId", "");
    }
  }, [selectedMakeId, form]);

  // Car generation mutation
  const generateMutation = useMutation({
    mutationFn: async (values: CarFormValues) => {
      const response = await fetch("/api/cars/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate car image");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setGeneratedImage(data.image);
      setIsGenerating(false);
      
      // Invalidate gallery cache to show new image
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      
      toast({
        title: "Success!",
        description: "Car image generated successfully.",
      });
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  const onSubmit = async (values: CarFormValues) => {
    setIsGenerating(true);
    setError(null);
    generateMutation.mutate(values);
  };

  // Handle error dismissal
  const handleDismissError = () => {
    setError(null);
  };

  // Download handler
  const handleDownload = (image: GeneratedImage) => {
    // Create an invisible anchor element
    const a = document.createElement("a");
    a.href = image.fullUrl || image.url;
    a.download = `car-${new Date().getTime()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <Car className="mr-2" />
        Car Creation
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Car Image</CardTitle>
          <CardDescription>
            Select car attributes and generate a hyper-realistic car image using Google Imagen-3
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Form section */}
            <div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Make and Model */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="makeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={isLoadingMakes || isGenerating}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select make" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {makes.map((make) => (
                                <SelectItem key={make.id} value={make.id}>
                                  {make.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isLoadingMakes && (
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Loading makes...
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="modelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            disabled={!selectedMakeId || isLoadingModels || isGenerating}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {models.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isLoadingModels && selectedMakeId && (
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Loading models...
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Year and Body Style */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1990}
                              max={2025}
                              disabled={isGenerating}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="body_style"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Style</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isGenerating}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select body style" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {BODY_STYLES.map((style) => (
                                <SelectItem key={style} value={style}>
                                  {style}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Color */}
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Silver, Red, Blue, Black"
                            disabled={isGenerating}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Background Type */}
                  <FormField
                    control={form.control}
                    name="bg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Background Style</FormLabel>
                        <div className="flex space-x-2">
                          <Tabs 
                            value={field.value} 
                            onValueChange={field.onChange}
                            className="w-full"
                          >
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="white">White Studio</TabsTrigger>
                              <TabsTrigger value="hub">Hub (Dark Floor)</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Aspect Ratio */}
                  <FormField
                    control={form.control}
                    name="aspect_ratio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aspect Ratio</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isGenerating}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select aspect ratio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1:1">1:1 (Square)</SelectItem>
                            <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                            <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                            <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                            <SelectItem value="3:4">3:4 (Portrait)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full mt-6"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>Generate Car Image</>
                    )}
                  </Button>
                </form>
              </Form>
            </div>

            {/* Results section */}
            <div className="flex flex-col">
              {isGenerating && (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="h-16 w-16 animate-spin mb-4" />
                  <p className="text-lg font-medium">Generating your car image...</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    This may take up to 30 seconds
                  </p>
                  <Progress value={60} className="w-full max-w-xs" />
                </div>
              )}

              {error && <ErrorState message={error} onDismiss={handleDismissError} />}

              {generatedImage && !isGenerating && !error && (
                <div className="flex flex-col items-center">
                  <h3 className="text-lg font-medium mb-4">Generated Car</h3>
                  <ImageCard
                    image={generatedImage}
                    mode="preview"
                    onDownload={handleDownload}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Image saved to gallery automatically
                  </p>
                </div>
              )}

              {!generatedImage && !isGenerating && !error && (
                <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-200 rounded-lg p-8">
                  <Car className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">No Image Yet</h3>
                  <p className="text-sm text-center text-muted-foreground mt-2">
                    Fill out the form and click "Generate Car Image" to create a
                    custom car visualization
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}