import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Car, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GeneratedImage } from "@/types/image";
import ErrorState from "@/components/ErrorState";
import ImageCard from "@/components/ImageCard";
import { loadCarData, getCarMakes, getCarModels, getBodyStyles, getTrims } from "@/lib/carData";

// Form schema for car creation
const carFormSchema = z.object({
  make: z.string().optional().default(""),
  model: z.string().optional().default(""),
  body_style: z.string().optional().default(""),
  trim: z.string().optional().default(""),
  year: z.coerce
    .number()
    .int()
    .min(1990, "Year must be 1990 or later")
    .max(2025, "Year must be 2025 or earlier")
    .optional(),
  color: z.string().optional().default(""),
  aspect_ratio: z.enum(["1:1", "16:9", "9:16", "3:4", "4:3"]).optional().default("16:9"),
  bg: z.enum(["white", "hub"]).optional().default("white")
});

type CarFormValues = z.infer<typeof carFormSchema>;

// Default form values
const defaultValues: CarFormValues = {
  make: "",
  model: "",
  body_style: "",
  trim: "",
  year: 2023,
  color: "Silver",
  aspect_ratio: "16:9",
  bg: "white"
};

export default function CarCreationPageNew() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // State for dropdown options
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [bodyStyles, setBodyStyles] = useState<string[]>([]);
  const [trims, setTrims] = useState<string[]>([]);
  
  // Loading states
  const [isLoadingMakes, setIsLoadingMakes] = useState(true);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingBodyStyles, setIsLoadingBodyStyles] = useState(false);
  const [isLoadingTrims, setIsLoadingTrims] = useState(false);

  // Form setup
  const form = useForm<CarFormValues>({
    resolver: zodResolver(carFormSchema),
    defaultValues
  });

  // Get form values
  const selectedMake = form.watch("make");
  const selectedModel = form.watch("model");
  const selectedBodyStyle = form.watch("body_style");

  // Function to refresh all car data
  const refreshCarData = useCallback(async () => {
    setIsLoadingMakes(true);
    try {
      // Force refresh the car data from Google Sheets
      await loadCarData(true);
      
      // Reload makes with the fresh data
      const makes = await getCarMakes();
      setMakes(makes);
      
      // Reset form state after refresh
      if (selectedMake) {
        const models = await getCarModels(selectedMake);
        setModels(models);
        
        if (selectedModel) {
          const bodyStyles = await getBodyStyles(selectedMake, selectedModel);
          setBodyStyles(bodyStyles);
          
          if (selectedBodyStyle) {
            const trims = await getTrims(selectedMake, selectedModel, selectedBodyStyle);
            setTrims(trims);
          }
        }
      }
      
      toast({
        title: "Data refreshed",
        description: "Car data has been refreshed from Google Sheets",
      });
    } catch (error) {
      console.error("Error refreshing car data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh car data from Google Sheets",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMakes(false);
    }
  }, [toast, selectedMake, selectedModel, selectedBodyStyle]);

  // Load makes on initial load
  useEffect(() => {
    async function loadMakes() {
      setIsLoadingMakes(true);
      try {
        const makes = await getCarMakes();
        setMakes(makes);
      } catch (error) {
        console.error("Error loading makes:", error);
        toast({
          title: "Error",
          description: "Failed to load car makes",
          variant: "destructive",
        });
      } finally {
        setIsLoadingMakes(false);
      }
    }
    
    loadMakes();
  }, [toast]);

  // Load models when make changes
  useEffect(() => {
    async function loadModels() {
      if (!selectedMake) {
        setModels([]);
        return;
      }
      
      setIsLoadingModels(true);
      try {
        const models = await getCarModels(selectedMake);
        setModels(models);
        
        // Reset model, body style and trim selections
        form.setValue("model", "");
        form.setValue("body_style", "");
        form.setValue("trim", "");
      } catch (error) {
        console.error("Error loading models:", error);
      } finally {
        setIsLoadingModels(false);
      }
    }
    
    loadModels();
  }, [selectedMake, form]);

  // Load body styles when model changes
  useEffect(() => {
    async function loadBodyStyles() {
      if (!selectedMake || !selectedModel) {
        setBodyStyles([]);
        return;
      }
      
      setIsLoadingBodyStyles(true);
      try {
        const styles = await getBodyStyles(selectedMake, selectedModel);
        setBodyStyles(styles);
        
        // Reset body style and trim selections
        form.setValue("body_style", "");
        form.setValue("trim", "");
      } catch (error) {
        console.error("Error loading body styles:", error);
      } finally {
        setIsLoadingBodyStyles(false);
      }
    }
    
    loadBodyStyles();
  }, [selectedMake, selectedModel, form]);

  // Load trims when body style changes
  useEffect(() => {
    async function loadTrims() {
      if (!selectedMake || !selectedModel || !selectedBodyStyle) {
        setTrims([]);
        return;
      }
      
      setIsLoadingTrims(true);
      try {
        const trims = await getTrims(selectedMake, selectedModel, selectedBodyStyle);
        setTrims(trims);
        
        // Reset trim selection
        form.setValue("trim", "");
      } catch (error) {
        console.error("Error loading trims:", error);
      } finally {
        setIsLoadingTrims(false);
      }
    }
    
    loadTrims();
  }, [selectedMake, selectedModel, selectedBodyStyle, form]);

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
  const onSubmit = async (values: CarFormValues, e?: React.BaseSyntheticEvent) => {
    // Prevent default form submission which causes page reload
    if (e) {
      e.preventDefault();
    }
    
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <Car className="mr-2" />
          Car Creation
        </h1>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={refreshCarData}
          disabled={isLoadingMakes || isGenerating}
          className="flex items-center gap-2"
        >
          {isLoadingMakes ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Refresh Car Data
            </>
          )}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Car Image</CardTitle>
          <CardDescription className="space-y-2">
            <p>Select car attributes and generate a hyper-realistic car image using Google Imagen-3</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Car data automatically updates from Google Sheets every 5 minutes. Click the refresh button to update manually.
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Form section */}
            <div>
              <Form {...form}>
                <div className="space-y-4">
                  {/* Make and Model */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="make"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isLoadingMakes || isGenerating}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select make" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="None">None</SelectItem>
                              {makes.map((make) => (
                                <SelectItem key={make} value={make}>
                                  {make}
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
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={isLoadingModels || isGenerating}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="None">None</SelectItem>
                              {models.map((model) => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isLoadingModels && selectedMake && (
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

                  {/* Body Style and Trim */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="body_style"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Style</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingBodyStyles || isGenerating}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select body style" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="None">None</SelectItem>
                              {bodyStyles.map((style) => (
                                <SelectItem key={style} value={style}>
                                  {style}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isLoadingBodyStyles && selectedModel && (
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Loading body styles...
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trim"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trim</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingTrims || isGenerating}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select trim" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="None">None</SelectItem>
                              {trims.map((trim) => (
                                <SelectItem key={trim} value={trim}>
                                  {trim}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isLoadingTrims && selectedBodyStyle && (
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Loading trims...
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Year and Color */}
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
                  </div>

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
                    type="button"
                    className="w-full mt-6"
                    disabled={isGenerating}
                    onClick={() => {
                      // Get current form values directly
                      const values = form.getValues();
                      
                      // Process form values
                      setIsGenerating(true);
                      setError(null);
                      generateMutation.mutate(values);
                    }}
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
                </div>
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