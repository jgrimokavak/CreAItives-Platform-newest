import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi
} from "@/components/ui/carousel";
import { GeneratedImage } from '@shared/schema';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface ImageCarouselProps {
  className?: string;
  autoScroll?: boolean;
  autoScrollInterval?: number; // milliseconds
}

export function ImageCarousel({ 
  className, 
  autoScroll = true, 
  autoScrollInterval = 3000 
}: ImageCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [hovering, setHovering] = useState(false);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  // Fetch recent gallery images
  const { data, isLoading } = useQuery({
    queryKey: ['/api/gallery'],
    queryFn: async () => {
      const response = await fetch('/api/gallery?limit=12');
      if (!response.ok) throw new Error('Failed to fetch gallery images');
      const data = await response.json();
      return data.items as GeneratedImage[];
    }
  });

  const images = data || [];
  
  useEffect(() => {
    if (!api) return;
    
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);
  
  // Auto-scroll logic
  useEffect(() => {
    if (!autoScroll || hovering || !api || images.length === 0) return;
    
    const timer = setInterval(() => {
      api.scrollNext();
    }, autoScrollInterval);
    
    return () => clearInterval(timer);
  }, [autoScroll, autoScrollInterval, hovering, api, images.length]);

  if (isLoading) {
    return (
      <div className={cn("w-full flex items-center justify-center py-12", className)}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Sparkles className="h-8 w-8 animate-pulse" />
          <p>Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div 
      className={cn("relative w-full", className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <Carousel
        className="w-full"
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
        }}
      >
        <CarouselContent>
          {images.map((image) => (
            <CarouselItem key={image.id} className="md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
              <div className="bg-background overflow-hidden rounded-lg p-1">
                <div className="overflow-hidden rounded-md aspect-square relative group">
                  <img
                    src={image.thumbUrl || image.url}
                    alt={image.prompt}
                    className="object-cover w-full h-full transition-all duration-300 group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-xs text-white line-clamp-2">{image.prompt}</p>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 bg-background/80 backdrop-blur-sm hover:bg-background/90" />
        <CarouselNext className="right-2 bg-background/80 backdrop-blur-sm hover:bg-background/90" />
      </Carousel>
      
      {/* Indicators */}
      <div className="flex justify-center gap-1 mt-3">
        {Array.from({length: count}).map((_, i) => (
          <button
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              current === i ? "bg-primary w-4" : "bg-primary/30"
            )}
            onClick={() => api?.scrollTo(i)}
          />
        ))}
      </div>
    </div>
  );
}