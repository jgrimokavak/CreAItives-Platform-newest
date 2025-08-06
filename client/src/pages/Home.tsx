import { useState, useEffect } from "react";
import PromptForm from "@/components/PromptForm";
import EditForm from "@/components/EditForm";
import ImageGallery from "@/components/ImageGallery";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { GeneratedImage } from "@/types/image";
import NavTabs, { TabContent } from "@/components/NavTabs";
import { useEditor } from "@/context/EditorContext";
import { useWebSocket } from "@/lib/websocket";

export default function Home() {
  // Get initial mode from URL
  const getInitialMode = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") as "generate" | "edit" || "generate";
  };
  
  const [mode, setMode] = useState<"generate" | "edit">(getInitialMode());
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mode: editorMode } = useEditor();
  
  // Connect to WebSocket for real-time updates
  useWebSocket();
  
  // Listen for URL changes to update the mode
  useEffect(() => {
    const handleUrlChange = () => {
      setMode(getInitialMode());
    };
    
    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handleUrlChange);
    
    // Custom event for our replaceState changes
    window.addEventListener('urlchange', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('urlchange', handleUrlChange);
    };
  }, []);
  
  // Listen for WebSocket gallery updates to refresh images
  useEffect(() => {
    const handleGalleryUpdate = (event: CustomEvent) => {
      if (event.detail?.type === 'created' && event.detail?.data?.image) {
        const newImage = event.detail.data.image;
        // Transform the WebSocket image data to match our GeneratedImage type
        const transformedImage: GeneratedImage = {
          id: newImage.id,
          url: newImage.thumbUrl || newImage.url,
          prompt: newImage.prompt,
          size: newImage.size,
          model: newImage.model,
          createdAt: newImage.createdAt,
          sourceThumb: undefined,
          sourceImage: undefined,
          width: newImage.width,
          height: newImage.height,
          thumbUrl: newImage.thumbUrl,
          fullUrl: newImage.fullUrl,
          starred: newImage.starred,
          deletedAt: newImage.deletedAt
        };
        // Add the new image to the list
        setImages(prev => [transformedImage, ...prev.filter(img => img.id !== transformedImage.id)]);
      }
    };
    
    window.addEventListener('gallery-updated', handleGalleryUpdate as EventListener);
    return () => {
      window.removeEventListener('gallery-updated', handleGalleryUpdate as EventListener);
    };
  }, []);

  const handleGenerateStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleGenerateComplete = (newImages: GeneratedImage[]) => {
    setIsLoading(false);
    setImages(newImages);
  };

  const handleError = (message: string) => {
    setIsLoading(false);
    setError(message);
  };

  const handleClearResults = () => {
    setImages([]);
  };

  const handleDismissError = () => {
    setError(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl flex-grow">
        {/* Main Content Area with Side-by-Side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-5">
            {/* Page Header - Left Aligned */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">
                AI Image Studio
              </h1>
              <p className="text-muted-foreground text-sm">
                Generate custom images or enhance existing ones with our AI-powered tools
              </p>
            </div>

            <div className="h-[calc(100%-5rem)]">
              <div className="w-full h-full flex flex-col">
                <div className="mb-6">
                  <NavTabs 
                    currentTab={mode}
                    onChange={(value) => setMode(value as "generate" | "edit")}
                    tabs={[
                      { value: "generate", label: "Create New" },
                      { value: "edit", label: "Edit Image" }
                    ]}
                  />
                </div>

                <div className="flex-1">
                  <TabContent value="generate" currentTab={mode}>
                    <PromptForm
                      onGenerateStart={handleGenerateStart}
                      onGenerateComplete={handleGenerateComplete}
                      onError={handleError}
                    />
                  </TabContent>

                  <TabContent value="edit" currentTab={mode}>
                    <EditForm
                      onEditStart={handleGenerateStart}
                      onEditComplete={handleGenerateComplete}
                      onError={handleError}
                    />
                  </TabContent>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-7">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Results</h2>
              <p className="text-xs text-muted-foreground">
                Your generated images will appear here
              </p>
            </div>

            <div className="h-[calc(100%-4rem)]">
              {isLoading && (
                <div className="h-full">
                  <LoadingState />
                </div>
              )}

              {error && (
                <div className="h-full">
                  <ErrorState message={error} onDismiss={handleDismissError} />
                </div>
              )}

              {!isLoading && !error && (
                <div className="h-full">
                  {images.length > 0 ? (
                    <ImageGallery images={images} onClearResults={handleClearResults} />
                  ) : (
                    <div className="h-full flex items-center">
                      <EmptyState />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}