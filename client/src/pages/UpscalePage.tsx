import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Slider } from "../components/ui/slider";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Loader2 } from "lucide-react";

export default function UpscalePage() {
  const [, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Add parameters from the schema
  const [scale, setScale] = useState<number>(4); // Default from schema
  const [faceEnhance, setFaceEnhance] = useState<boolean>(false); // Default from schema

  // Parse query parameters for source image
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceUrl = params.get('sourceUrl');

    if (sourceUrl) {
      // If we have a source URL, set it as the preview
      setPreviewUrl(sourceUrl);

      // Convert the URL to a blob and create a File from it
      fetch(sourceUrl)
        .then(response => response.blob())
        .then(blob => {
          const file = new File([blob], "source-image.jpg", { type: "image/jpeg" });
          setSelectedFile(file);
        })
        .catch(error => {
          console.error("Error loading source image:", error);
          setError("Failed to load source image. Please try again with a different image.");
        });
    }
  }, []);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setOutputUrl(null); // Reset output when a new file is selected
    setError(null);
  };

  // Handle upscale button click
  const handleUpscale = async () => {
    if (!selectedFile) {
      setError("Please select an image to upscale");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('scale', scale.toString());
      formData.append('face_enhance', faceEnhance.toString());

      const response = await fetch('/api/upscale', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setJobId(data.jobId);
    } catch (err: any) {
      console.error("Error starting upscale job:", err);
      setError(err.message || "Failed to start upscale process");
      setUploading(false);
    }
  };

  // Poll job status if we have a jobId
  const { isLoading: isPolling } = useQuery({
    queryKey: ['/api/upscale/status', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      
      const response = await fetch(`/api/upscale/status/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'done') {
        setOutputUrl(data.url);
        setJobId(null); // Stop polling
        setUploading(false);
      } else if (data.status === 'error') {
        setError(data.error || "Upscale failed");
        setJobId(null); // Stop polling
        setUploading(false);
      }
      
      return data;
    },
    enabled: !!jobId,
    refetchInterval: jobId ? 2000 : false,
    retry: 3
  });

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Upscale Image</h1>
        <p className="text-accent">
          Enhance image resolution and quality using Real-ESRGAN AI model
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source Image Card */}
        <Card>
          <CardHeader>
            <CardTitle>Source Image</CardTitle>
            <CardDescription>
              Select an image file to upscale (up to 4x resolution)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="bg-muted rounded-md aspect-square flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Source preview"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-muted-foreground">No image selected</div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 text-sm"
              />
              
              {/* Parameters from schema */}
              <div className="space-y-4 mt-4 border-t pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="scale-slider">Scale Factor: {scale}x</Label>
                    <span className="text-xs text-muted-foreground">Higher values = larger image</span>
                  </div>
                  <Slider
                    id="scale-slider"
                    min={1}
                    max={4}
                    step={1}
                    value={[scale]}
                    onValueChange={(value) => setScale(value[0])}
                    disabled={uploading || isPolling}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upscale factor (1-4x). Higher values generate larger images with more detail.
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="face-enhance"
                    checked={faceEnhance}
                    onCheckedChange={setFaceEnhance}
                    disabled={uploading || isPolling}
                  />
                  <Label htmlFor="face-enhance">Face Enhancement</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applies special processing to improve faces in the image. 
                  Recommended for portraits and photos with people.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleUpscale}
              disabled={!selectedFile || uploading || isPolling}
              className="w-full"
            >
              {uploading || isPolling ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                </span>
              ) : (
                "Upscale Image"
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Result Card */}
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Result</CardTitle>
            <CardDescription>
              {outputUrl
                ? "Your upscaled image is ready"
                : "The enhanced image will appear here"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-md aspect-square flex items-center justify-center overflow-hidden">
              {outputUrl ? (
                <img
                  src={outputUrl}
                  alt="Upscaled result"
                  className="max-h-full max-w-full object-contain"
                />
              ) : uploading || isPolling ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">
                    Upscaling your image... This may take a minute.
                  </p>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  Upscaled result will appear here
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {outputUrl && (
              <Alert variant="warning" className="mt-4">
                <AlertTitle>Temporary Result</AlertTitle>
                <AlertDescription>
                  Upscaled images are <strong>not stored</strong>. They'll disappear once you
                  leave or refresh this page. Click <em>Download</em> to keep a copy.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
            >
              Back to Generator
            </Button>
            
            {outputUrl && (
              <Button asChild>
                <a href={outputUrl} download="upscaled-image.jpg">
                  Download Upscaled Image
                </a>
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}