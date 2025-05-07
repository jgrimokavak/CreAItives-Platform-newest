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
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-5xl flex-grow">
        <section className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
              Create with AI
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              Describe what you want to create or edit an existing image. Our AI will generate high-quality results in seconds.
            </p>
          </div>

          <Tabs 
            value={mode} 
            onValueChange={(value) => setMode(value as "generate" | "edit")}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
              <TabsTrigger value="generate" className="text-sm sm:text-base py-2.5">Create New</TabsTrigger>
              <TabsTrigger value="edit" className="text-sm sm:text-base py-2.5">Edit Image</TabsTrigger>
            </TabsList>
            
            <TabsContent value="generate" className="mt-2 focus-visible:outline-none focus-visible:ring-0">
              <PromptForm
                onGenerateStart={handleGenerateStart}
                onGenerateComplete={handleGenerateComplete}
                onError={handleError}
              />
            </TabsContent>
            
            <TabsContent value="edit" className="mt-2 focus-visible:outline-none focus-visible:ring-0">
              <EditForm
                onEditStart={handleGenerateStart}
                onEditComplete={handleGenerateComplete}
                onError={handleError}
              />
            </TabsContent>
          </Tabs>
        </section>

        {isLoading && (
          <div className="max-w-3xl mx-auto">
            <LoadingState />
          </div>
        )}

        {error && (
          <div className="max-w-3xl mx-auto">
            <ErrorState message={error} onDismiss={handleDismissError} />
          </div>
        )}

        {!isLoading && !error && (
          <>
            {images.length > 0 ? (
              <ImageGallery images={images} onClearResults={handleClearResults} />
            ) : (
              <div className="max-w-3xl mx-auto">
                <EmptyState />
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
