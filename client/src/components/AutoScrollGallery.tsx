import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GeneratedImage } from "@/types/image";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Image } from "lucide-react";

export function AutoScrollGallery() {
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Fetch recent images from the gallery
  const { data: galleryData } = useQuery({
    queryKey: ["/api/gallery"],
    queryFn: async () => {
      const response = await fetch("/api/gallery?limit=12");
      if (!response.ok) {
        throw new Error("Failed to fetch gallery");
      }
      return response.json();
    }
  });

  const images = galleryData?.items || [];

  // Auto-scrolling effect
  useEffect(() => {
    const scrollInterval = setInterval(() => {
      setScrollPosition((prev) => {
        // Reset when all images have been scrolled through
        if (prev >= (images.length * 300) - window.innerWidth) {
          return 0;
        }
        return prev + 1;
      });
    }, 20);

    return () => clearInterval(scrollInterval);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Latest Creations</h2>
            <p className="text-slate-500 dark:text-slate-400">
              No images found. Start creating to see your work here!
            </p>
            <Button asChild className="mt-4">
              <Link href="/car">Create Something</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="container">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Latest Creations</h2>
          <p className="text-slate-500 dark:text-slate-400">
            Browse through our gallery of AI-generated images
          </p>
          <Button asChild className="mt-4">
            <Link href="/gallery">View All <LayoutGrid className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="relative mt-8 h-80">
          <div 
            className="flex gap-4 absolute"
            style={{ 
              transform: `translateX(-${scrollPosition}px)`,
              transition: scrollPosition === 0 ? 'none' : 'transform 0.5s linear'
            }}
          >
            {images.map((image: GeneratedImage, index: number) => (
              <Card key={`${image.id}-${index}`} className="min-w-[300px] max-w-[300px] shadow-md">
                <CardContent className="p-0">
                  <div className="relative aspect-square overflow-hidden">
                    <img 
                      src={image.thumbUrl || image.url} 
                      alt={image.prompt || 'Generated image'} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm truncate text-slate-700 dark:text-slate-300">
                      {image.prompt || 'AI Generated Image'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}