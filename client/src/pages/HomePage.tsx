import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
import { 
  Sparkles, 
  ImageUpscale, 
  Images, 
  Trash2, 
  MessageSquareText,
  CarFront,
  ChevronRight
} from 'lucide-react';
import { GeneratedImage } from '@/types/image';
import ImageCard from '@/components/ImageCard';

export default function HomePage() {
  const [recentImages, setRecentImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentImages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch recent images from the gallery API (limit to 10)
        const response = await fetch('/api/gallery?limit=10');
        
        if (!response.ok) {
          throw new Error(`Error fetching recent images: ${response.status}`);
        }
        
        const data = await response.json();
        setRecentImages(data.items || []);
      } catch (err) {
        console.error('Error fetching recent images:', err);
        setError('Failed to load recent images');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentImages();
  }, []);

  const features = [
    {
      title: 'Image Creation',
      description: 'Generate stunning AI images with simple text prompts',
      icon: <Sparkles className="h-6 w-6 text-indigo-500" />,
      to: '/',
      color: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      iconColor: 'text-indigo-500',
    },
    {
      title: 'Car Designer',
      description: 'Design custom cars with precise make, model and style options',
      icon: <CarFront className="h-6 w-6 text-blue-500" />,
      to: '/car',
      color: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Image Gallery',
      description: 'Browse, search and manage your collection of AI images',
      icon: <Images className="h-6 w-6 text-emerald-500" />,
      to: '/gallery',
      color: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-500',
    },
    {
      title: 'Upscaling Tool',
      description: 'Enhance image resolution and quality with AI upscaling',
      icon: <ImageUpscale className="h-6 w-6 text-purple-500" />,
      to: '/upscale',
      color: 'bg-purple-50',
      borderColor: 'border-purple-200',
      iconColor: 'text-purple-500',
    },
    {
      title: 'AI Prompt Helper',
      description: 'Get intelligent suggestions to improve your image prompts',
      icon: <MessageSquareText className="h-6 w-6 text-amber-500" />,
      to: '/',
      color: 'bg-amber-50', 
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-500',
    },
    {
      title: 'Trash Management',
      description: 'Recover or permanently delete previously removed images',
      icon: <Trash2 className="h-6 w-6 text-rose-500" />,
      to: '/trash',
      color: 'bg-rose-50',
      borderColor: 'border-rose-200',
      iconColor: 'text-rose-500',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 flex-grow">
        {/* Hero Section */}
        <section className="mb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              CreAItives Platform 2.0
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Transform your ideas into stunning visual creations with our advanced AI image generation tools
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/">
                <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                  Start Creating <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/car">
                <Button size="lg" variant="outline" className="border-2 border-slate-200">
                  Try Car Designer <CarFront className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Link key={index} to={feature.to}>
                <Card className={`h-full hover:shadow-md transition-shadow border ${feature.borderColor} hover:border-slate-300`}>
                  <CardContent className={`p-6 ${feature.color}`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-full ${feature.color} border ${feature.borderColor}`}>
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                        <p className="text-muted-foreground text-sm">{feature.description}</p>
                        <div className="flex items-center mt-4 text-sm font-medium text-primary">
                          Explore <ChevronRight className="h-4 w-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Gallery Carousel */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Recent Creations</h2>
            <Link to="/gallery">
              <Button variant="ghost" className="font-medium text-primary">
                View Gallery <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="mt-4 text-sm text-muted-foreground">Loading recent images...</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-64 flex items-center justify-center border border-dashed rounded-lg bg-slate-50">
              <div className="text-center p-6">
                <p className="text-muted-foreground mb-2">{error}</p>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : recentImages.length === 0 ? (
            <div className="h-64 flex items-center justify-center border border-dashed rounded-lg bg-slate-50">
              <div className="text-center p-6">
                <p className="text-muted-foreground">No images found in your gallery</p>
                <Link to="/">
                  <Button className="mt-4">Create Your First Image</Button>
                </Link>
              </div>
            </div>
          ) : (
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {recentImages.map((image) => (
                  <CarouselItem key={image.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                    <div className="p-1">
                      <ImageCard
                        image={image}
                        mode="preview"
                        onClick={() => window.location.href = '/gallery'}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex justify-end gap-2 mt-4">
                <CarouselPrevious className="static translate-y-0 !mr-0" />
                <CarouselNext className="static translate-y-0 !mr-0" />
              </div>
            </Carousel>
          )}
        </section>

        {/* Call to Action */}
        <section className="mb-8">
          <div className="rounded-xl bg-gradient-to-r from-indigo-100 to-purple-100 border border-slate-200 p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to unleash your creativity?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Start generating stunning AI images with our powerful tools. Whether you're designing cars, 
              creating art, or visualizing ideas, CreAItives Platform 2.0 has everything you need.
            </p>
            <Link to="/">
              <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                Start Creating Now <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}