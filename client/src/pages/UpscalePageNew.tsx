import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Info, 
  ChevronLeft, 
  ImageUp, 
  Download, 
  Upload, 
  Zap, 
  Image as ImageIcon
} from "lucide-react";

export default function UpscalePage() {
  const [, setLocation] = useLocation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [originalFileName, setOriginalFileName] = useState<string>("image");
  
  // Add parameters from the schema
  const [enhanceModel, setEnhanceModel] = useState<string>("Standard V2"); // Default from schema
  const [upscaleFactor, setUpscaleFactor] = useState<string>("4x"); // Default to 4x
  const [faceEnhancement, setFaceEnhancement] = useState<boolean>(false); // Default from schema

  // Parse query parameters for source image
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceUrl = params.get('sourceUrl');

    if (sourceUrl) {
      // If we have a source URL, set it as the preview
      setPreviewUrl(sourceUrl);

      // Try to extract a filename from the URL if possible or use the prompt text
      try {
        // First, we'll fetch the image data which might contain metadata about the original prompt
        fetch(`/api/gallery?searchQuery=`)
          .then(response => response.json())
          .then(data => {
            // Look for the image in the gallery data
            const urlParts = sourceUrl.split('/');
            const baseName = urlParts[urlParts.length - 1];
            // Extract the image ID from the filename
            const imageId = baseName.split('.')[0]; // Extract part before extension
            
            // Try to find this image in the gallery
            const matchingImage = data.items.find((item: any) => 
              item.id === imageId || item.fullUrl.includes(imageId) || item.url.includes(imageId)
            );
            
            if (matchingImage && matchingImage.prompt) {
              // Create a clean filename from the prompt
              const cleanPrompt = matchingImage.prompt
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')    // Remove non-word chars
                .replace(/\s+/g, '_')         // Replace spaces with underscores
                .replace(/_+/g, '_')          // Replace multiple underscores with single ones
                .substring(0, 50);            // Limit length
              
              // Make sure we have a valid filename
              const filename = cleanPrompt || 'image';
              setOriginalFileName(filename);
            } else {
              // If no matching image found, use a basic filename
              setOriginalFileName('image');
            }
          })
          .catch(err => {
            console.log("Could not fetch gallery data, using default filename");
            setOriginalFileName('image');
          });
      } catch (err) {
        console.log("Could not extract filename from URL, using default");
        setOriginalFileName('image');
      }

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

    // Extract and clean the original file name without extension
    const rawFileName = file.name.replace(/\.[^/.]+$/, "");
    
    // Create a clean filename
    const cleanFilename = rawFileName
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')    // Remove non-word chars
      .replace(/\s+/g, '_')         // Replace spaces with underscores
      .replace(/_+/g, '_')          // Replace multiple underscores with single ones
      .substring(0, 50);            // Limit length
    
    setOriginalFileName(cleanFilename || 'image');
    
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
      formData.append('enhance_model', enhanceModel);
      formData.append('upscale_factor', upscaleFactor);
      formData.append('face_enhancement', faceEnhancement.toString());

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
    <div className="container max-w-6xl mx-auto py-6 px-4">
      {/* Header with navigation */}
      <div className="flex items-center space-x-2 mb-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLocation("/gallery")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Gallery
        </Button>
      </div>
      
      {/* Page title with icon */}
      <div className="flex items-center mb-6 space-x-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <ImageUp className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Image Upscaler</h1>
          <p className="text-muted-foreground">
            Enhance resolution and quality with AI technology
          </p>
        </div>
      </div>

      <Separator className="mb-6" />
      
      {/* Status tracking bar - only appears when processing */}
      {(uploading || isPolling) && (
        <div className="w-full bg-muted/50 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <Loader2 className="h-5 w-5 text-primary animate-spin mr-3" />
            <div>
              <p className="font-medium">Processing your image</p>
              <p className="text-xs text-muted-foreground">This typically takes 1-2 minutes depending on size and settings</p>
            </div>
          </div>
          <div className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full">
            {isPolling ? "Enhancing..." : "Uploading..."}
          </div>
        </div>
      )}

      {/* Info card - quick guide */}
      <div className="grid grid-cols-1 gap-6 mb-10">
        <Alert className="bg-blue-50/50 border-blue-100 text-blue-800">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-700">About AI Upscaling</AlertTitle>
          <AlertDescription className="text-blue-700/90">
            <p className="mb-2">
              Upscaling uses AI to intelligently enhance image resolution and quality, adding detail that wasn't visible in the original.
            </p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="flex flex-col items-center text-center bg-white/50 rounded-lg p-2">
                <ImageIcon className="h-5 w-5 mb-1 text-blue-500" />
                <span className="text-xs font-medium">Upload any image</span>
              </div>
              <div className="flex flex-col items-center text-center bg-white/50 rounded-lg p-2">
                <Zap className="h-5 w-5 mb-1 text-blue-500" />
                <span className="text-xs font-medium">Select enhancement options</span>
              </div>
              <div className="flex flex-col items-center text-center bg-white/50 rounded-lg p-2">
                <Download className="h-5 w-5 mb-1 text-blue-500" />
                <span className="text-xs font-medium">Download improved version</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Source Image Card */}
        <Card className="border-muted/80 shadow-sm">
          <CardHeader className="bg-muted/10 border-b">
            <div className="flex items-center">
              <div>
                <CardTitle className="flex items-center">
                  <Upload className="h-4 w-4 mr-2 text-muted-foreground" />
                  Source Image
                </CardTitle>
                <CardDescription>
                  Select an image to enhance
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg aspect-square flex items-center justify-center overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Source preview"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">No image selected</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Upload an image or select one from your gallery</p>
                  </div>
                )}
              </div>
              
              {/* File input with better styling */}
              <label className="flex flex-col items-center justify-center w-full h-20 bg-muted/20 hover:bg-muted/30 rounded-lg border-2 border-dashed cursor-pointer transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Drag an image or <span className="text-primary font-medium">browse files</span></p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading || isPolling}
                />
              </label>
              
              {/* Enhancement Options */}
              <div className="space-y-5 mt-4 pt-5 border-t">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Enhancement Options</h3>
                
                {/* Upscale Model */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enhance-model" className="font-medium">Upscale Model</Label>
                    {enhanceModel && (
                      <div className="text-xs inline-flex items-center rounded-full px-2.5 py-0.5 bg-primary/10 text-primary font-medium">
                        {enhanceModel === "Standard V2" && "Universal"}
                        {enhanceModel === "High Fidelity V2" && "Detail Master"}
                        {enhanceModel === "Text Refine" && "Text Wizard"}
                      </div>
                    )}
                  </div>
                  
                  <Select 
                    value={enhanceModel} 
                    onValueChange={setEnhanceModel}
                    disabled={uploading || isPolling}
                  >
                    <SelectTrigger id="enhance-model" className="w-full">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard V2">Universal Enhancer (General Purpose)</SelectItem>
                      <SelectItem value="High Fidelity V2">Detail Master (Preserves Details)</SelectItem>
                      <SelectItem value="Text Refine">Text Wizard (Optimized for Text)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {enhanceModel === "Standard V2" && "Universal Enhancer works well for most images with balanced enhancement. Great for photos, art, and general images."}
                    {enhanceModel === "High Fidelity V2" && "Detail Master preserves fine texture and important details in your images while minimizing artifacts. Best choice for detailed photos and art."}
                    {enhanceModel === "Text Refine" && "Text Wizard specializes in making text sharp and legible in documents, screenshots, and images containing writing."}
                  </p>
                </div>
                
                {/* Upscale Factor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="upscale-factor" className="font-medium">Resolution Increase</Label>
                    <div className="text-xs inline-flex items-center rounded-full px-2.5 py-0.5 bg-primary/10 text-primary font-medium">
                      {upscaleFactor}
                    </div>
                  </div>
                  
                  <Select 
                    value={upscaleFactor} 
                    onValueChange={setUpscaleFactor}
                    disabled={uploading || isPolling}
                  >
                    <SelectTrigger id="upscale-factor" className="w-full">
                      <SelectValue placeholder="Select scale factor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2x">2x - Double Resolution</SelectItem>
                      <SelectItem value="4x">4x - Quadruple Resolution (Recommended)</SelectItem>
                      <SelectItem value="6x">6x - Maximum Resolution</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Higher values produce larger images with more detail, but may take longer to process.
                    4x is recommended for most uses.
                  </p>
                </div>
                
                {/* Face Enhancement */}
                <div className="flex items-start space-x-3 pt-2">
                  <div className="mt-1">
                    <Switch
                      id="face-enhance"
                      checked={faceEnhancement}
                      onCheckedChange={setFaceEnhancement}
                      disabled={uploading || isPolling}
                    />
                  </div>
                  <div>
                    <Label htmlFor="face-enhance" className="font-medium">Face Enhancement</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Applies special processing to improve faces in the image. 
                      Recommended for portraits and photos with people.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t flex justify-end pt-4 px-6">
            <Button
              onClick={handleUpscale}
              disabled={!selectedFile || uploading || isPolling}
              className="w-full"
              size="lg"
            >
              {uploading || isPolling ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                </span>
              ) : (
                <>
                  <ImageUp className="h-4 w-4 mr-2" /> 
                  Upscale Image
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Result Card */}
        <Card className="border-muted/80 shadow-sm">
          <CardHeader className="bg-muted/10 border-b">
            <div className="flex items-center">
              <div>
                <CardTitle className="flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-muted-foreground" />
                  Enhanced Result
                </CardTitle>
                <CardDescription>
                  {outputUrl
                    ? "Your upscaled image is ready for download"
                    : "The enhanced image will appear here"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-muted/30 border-2 border-dashed border-muted rounded-lg aspect-square flex items-center justify-center overflow-hidden">
              {outputUrl ? (
                <img
                  src={outputUrl}
                  alt="Upscaled result"
                  className="max-h-full max-w-full object-contain"
                />
              ) : uploading || isPolling ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-sm text-primary font-medium">
                    Enhancing your image...
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground max-w-md">
                    AI upscaling is a complex process that can take up to 2 minutes depending on image size and settings.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Your enhanced image will appear here</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Upload and process an image to see results</p>
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="mt-6 bg-red-50/60 border-red-200 text-red-800">
                <AlertTitle className="text-red-700 flex items-center">
                  <span className="bg-red-100 p-1 rounded-full mr-2">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.5 14A6.5 6.5 0 1 0 7.5 1a6.5 6.5 0 0 0 0 13ZM7 4v4.5m0 2.5V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  Processing error
                </AlertTitle>
                <AlertDescription className="mt-2 text-sm text-red-700/90">
                  {error}
                  <div className="mt-3 bg-white/50 rounded-lg p-3 text-xs">
                    <p className="font-medium mb-1">This could be due to:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-red-700/80">
                      <li>Temporary service issues with the AI service</li>
                      <li>Invalid image format (try JPEG or PNG)</li>
                      <li>Image size too large (try compressing it first)</li>
                      <li>Network connection problems</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {outputUrl && (
              <Alert className="mt-6 bg-amber-50/60 border-amber-200 text-amber-800">
                <AlertTitle className="text-amber-700 flex items-center">
                  <span className="bg-amber-100 p-1 rounded-full mr-2">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.5 14A6.5 6.5 0 1 0 7.5 1a6.5 6.5 0 0 0 0 13ZM7 4v4.5m0 2.5V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  Important Note
                </AlertTitle>
                <AlertDescription className="mt-2 text-sm text-amber-700/90">
                  Upscaled images are <strong>not stored</strong> in your gallery and will disappear when you
                  leave this page. Make sure to download your enhanced image using the button below.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="bg-muted/10 border-t flex justify-between pt-4 pb-5 px-6">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setLocation("/gallery")}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Gallery
            </Button>
            
            {outputUrl && (
              <Button 
                size="lg"
                onClick={() => {
                  // Create a function to properly download the image
                  const downloadImage = async () => {
                    try {
                      setDownloading(true);
                      // Fetch the image from the URL
                      const response = await fetch(outputUrl);
                      const blob = await response.blob();
                      
                      // Create a temporary link element
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      
                      // Create the filename with the original name and upscale factor
                      const cleanFactor = upscaleFactor.replace('x', ''); // Remove 'x' to avoid 4x-x in filename
                      link.download = `${originalFileName}-${cleanFactor}x-upscale.png`;
                      
                      // Append to the document, click it, and then remove it
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      // Clean up the object URL
                      URL.revokeObjectURL(link.href);
                      
                      // Small delay to show downloading status
                      setTimeout(() => {
                        setDownloading(false);
                      }, 1000);
                    } catch (err) {
                      console.error('Error downloading image:', err);
                      // Show an error message if download fails
                      setError('Failed to download image. Try right-clicking the result and selecting "Save Image As".');
                      setDownloading(false);
                    }
                  };
                  
                  downloadImage();
                }}
                disabled={downloading}
                className="gap-2"
              >
                {downloading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Downloading...
                  </span>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download Enhanced Image
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}