import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Slider from 'react-slick';
import { motion, AnimatePresence } from 'framer-motion';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { 
  Sparkles, 
  Zap,
  Image as ImageIcon,
  ScanSearch,
  ImageUpscale, 
  Images, 
  MessageSquareText,
  CarFront,
  ChevronRight,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import { GeneratedImage } from '@/types/image';

export default function HomePage() {
  const [recentImages, setRecentImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sliderRef = useRef<any>(null);

  // Fetch the recent images from the gallery
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

  // Minimal CSS for a smooth carousel
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Minimalistic Slider Styles */
      .image-carousel .slick-track {
        display: flex;
        gap: 8px;
      }
      
      .image-carousel .slick-slide {
        opacity: 0.85;
        transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
      }
      
      .image-carousel .slick-active {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const capabilities = [
    {
      title: 'Text-to-Image',
      description: 'Transform your ideas into stunning images with 3 powerful AI models',
      icon: <ImageIcon className="h-5 w-5 text-white" />,
      to: '/create',
      bgColor: 'bg-red-400',
    },
    {
      title: 'Image Editing',
      description: 'Erase, replace, and remix existing images with precision',
      icon: <ScanSearch className="h-5 w-5 text-white" />,
      to: '/create',
      bgColor: 'bg-blue-400',
    },
    {
      title: 'Upscale',
      description: 'Enhance resolution and quality for sharper, larger outputs',
      icon: <ImageUpscale className="h-5 w-5 text-white" />,
      to: '/upscale',
      bgColor: 'bg-violet-400',
    },
    {
      title: 'Car Generator',
      description: 'Create realistic car renders with simple requests or CSV batches',
      icon: <CarFront className="h-5 w-5 text-white" />,
      to: '/car',
      bgColor: 'bg-green-400',
    },
    {
      title: 'Live Gallery',
      description: 'Browse and manage your creations with real-time updates',
      icon: <Images className="h-5 w-5 text-white" />,
      to: '/gallery',
      bgColor: 'bg-amber-400',
    },
    {
      title: 'AI Prompt Helper',
      description: 'Smart autocompletes and prompt polish to perfect your ideas',
      icon: <MessageSquareText className="h-5 w-5 text-white" />,
      to: '/create',
      bgColor: 'bg-pink-400',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="pt-10 pb-12 px-4 sm:px-6 lg:px-8 bg-white border-b">
          <div className="container mx-auto max-w-7xl text-center lg:text-left">
            <div className="flex flex-col">
              <div className="w-full">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 mb-4">
                  <span className="mr-1">✨</span> New Platform Release
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  <span className="text-blue-600">CreAItives</span> Platform 2.0
                </h1>
                <p className="text-lg text-slate-600 mb-6 max-w-3xl mx-auto lg:mx-0">
                  Transform your creative vision into stunning AI-generated imagery with our powerful suite of creation tools.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link to="/create">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-2">
                      Get Started <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/gallery">
                    <Button size="lg" variant="outline" className="bg-white border-slate-200 text-slate-700 font-medium">
                      Browse Gallery
                    </Button>
                  </Link>
                </div>
                
                <div className="flex items-center gap-6 mt-8 justify-center lg:justify-start">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">Fast Generation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScanSearch className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">High Resolution</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">Smart Prompts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Capabilities */}
        <section className="py-14 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-2">Platform Capabilities</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Explore the powerful features of our AI image generation platform
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {capabilities.map((capability, index) => (
                <Link key={index} to={capability.to}>
                  <Card className="h-full hover:shadow-md transition-shadow border border-slate-200 overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-md ${capability.bgColor}`}>
                          {capability.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-1">{capability.title}</h3>
                          <p className="text-slate-600 text-sm">{capability.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Gallery Section */}
        {recentImages.length > 0 && (
          <section className="py-14 px-4 sm:px-6 lg:px-8 bg-white border-t">
            <div className="container mx-auto max-w-7xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold">Recent Creations</h2>
                <Link to="/gallery">
                  <Button variant="ghost" className="font-medium text-blue-600 flex items-center gap-1">
                    View All <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {!isLoading ? (
                <div className="relative overflow-hidden">
                  {/* Minimalistic, smooth slider */}
                  <div className="relative">
                    <Slider
                      ref={sliderRef}
                      dots={false}
                      infinite={true}
                      speed={10000} // Extremely slow transition
                      slidesToShow={5}
                      slidesToScroll={1}
                      autoplay={true}
                      autoplaySpeed={0} // No pause
                      cssEase="linear" // Linear motion for continuous flow
                      pauseOnHover={false}
                      swipe={false}
                      touchMove={false}
                      arrows={false}
                      responsive={[
                        {
                          breakpoint: 1280,
                          settings: {
                            slidesToShow: 3,
                          }
                        },
                        {
                          breakpoint: 768,
                          settings: {
                            slidesToShow: 2,
                          }
                        },
                        {
                          breakpoint: 640,
                          settings: {
                            slidesToShow: 1,
                          }
                        }
                      ]}
                      className="image-carousel mx-auto"
                    >
                      {recentImages.map((image) => (
                        <div key={image.id} className="px-3">
                          <div className="overflow-hidden rounded-lg bg-white aspect-square shadow-sm">
                            <img 
                              src={image.thumbUrl || image.url} 
                              alt={image.prompt}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      ))}
                    </Slider>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 animate-spin"></div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Call to Action */}
        <section className="py-14 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-8 text-center">
              <h2 className="text-2xl font-bold mb-4 text-slate-800">Ready to unleash your creativity?</h2>
              <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                Start generating stunning AI images with our powerful tools. Whether you're designing cars, 
                creating art, or visualizing ideas, CreAItives Platform 2.0 has everything you need.
              </p>
              <Link to="/create">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
                  Start Creating Now <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}