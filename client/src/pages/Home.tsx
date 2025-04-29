import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PromptForm from "@/components/PromptForm";
import ImageGallery from "@/components/ImageGallery";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import ImageUploader from "@/components/ImageUploader";
import { GeneratedImage } from "@/types/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FaFeather, FaUpload } from "react-icons/fa";

export default function Home() {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl flex-grow">
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">
              Create stunning AI-generated images
            </h2>
            <p className="text-accent max-w-2xl mx-auto">
              Generate images from text descriptions or upload your own images for AI-powered variations
            </p>
          </div>

          <Tabs defaultValue="text-to-image" className="mt-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="text-to-image" className="flex items-center gap-2">
                <FaFeather className="h-4 w-4" /> Text to Image
              </TabsTrigger>
              <TabsTrigger value="image-upload" className="flex items-center gap-2">
                <FaUpload className="h-4 w-4" /> Upload Image
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="text-to-image" className="pt-6">
              <PromptForm
                onGenerateStart={handleGenerateStart}
                onGenerateComplete={handleGenerateComplete}
                onError={handleError}
              />
            </TabsContent>
            
            <TabsContent value="image-upload" className="pt-6">
              <ImageUploader
                onUploadStart={handleGenerateStart}
                onUploadComplete={handleGenerateComplete}
                onError={handleError}
              />
            </TabsContent>
          </Tabs>
        </section>

        {isLoading && <LoadingState />}

        {error && <ErrorState message={error} onDismiss={handleDismissError} />}

        {!isLoading && !error && (
          <>
            {images.length > 0 ? (
              <ImageGallery images={images} onClearResults={handleClearResults} />
            ) : (
              <EmptyState />
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
