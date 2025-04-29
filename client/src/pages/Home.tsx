import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PromptForm from "@/components/PromptForm";
import ImageGallery from "@/components/ImageGallery";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import EmptyState from "@/components/EmptyState";
import { GeneratedImage } from "@/types/image";

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
              Enter a detailed description of what you want to see, adjust the parameters, 
              and let AI bring your imagination to life.
            </p>
          </div>

          <PromptForm
            onGenerateStart={handleGenerateStart}
            onGenerateComplete={handleGenerateComplete}
            onError={handleError}
          />
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
