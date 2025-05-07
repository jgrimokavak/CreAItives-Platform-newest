import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PromptForm from "@/components/PromptForm";
import EditForm from "@/components/EditForm";
import ImageGallery from "@/components/ImageGallery";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { GeneratedImage } from "@/types/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditor } from "@/context/EditorContext";
import "@/components/ui/custom-tabs.css";

export default function Home() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mode, setMode } = useEditor();

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
      <Header />
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
              <Tabs 
                value={mode} 
                onValueChange={(value) => setMode(value as "generate" | "edit")}
                className="w-full h-full flex flex-col"
              >
                <div className="mb-6">
                  <TabsList className="custom-tabs-list grid w-full grid-cols-2 relative z-10">
                    <TabsTrigger value="generate" className="custom-tabs-trigger text-sm">Create New</TabsTrigger>
                    <TabsTrigger value="edit" className="custom-tabs-trigger text-sm">Edit Image</TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="flex-1 pt-2">
                  <TabsContent value="generate" className="focus-visible:outline-none focus-visible:ring-0 h-full">
                    <PromptForm
                      onGenerateStart={handleGenerateStart}
                      onGenerateComplete={handleGenerateComplete}
                      onError={handleError}
                    />
                  </TabsContent>
                  
                  <TabsContent value="edit" className="focus-visible:outline-none focus-visible:ring-0 h-full">
                    <EditForm
                      onEditStart={handleGenerateStart}
                      onEditComplete={handleGenerateComplete}
                      onError={handleError}
                    />
                  </TabsContent>
                </div>
              </Tabs>
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
      <Footer />
    </div>
  );
}
