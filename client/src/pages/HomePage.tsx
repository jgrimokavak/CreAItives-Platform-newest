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

  // Add CSS for animations and carousel
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes blob {
        0% {
          transform: translate(0, 0) scale(1);
        }
        33% {
          transform: translate(30px, -20px) scale(1.1);
        }
        66% {
          transform: translate(-20px, 20px) scale(0.9);
        }
        100% {
          transform: translate(0, 0) scale(1);
        }
      }
      .animate-blob {
        animation: blob 7s infinite;
      }
      .animation-delay-2000 {
        animation-delay: 2s;
      }
      .animation-delay-4000 {
        animation-delay: 4s;
      }
      
      /* Custom Slider Styles */
      .image-carousel .slick-track {
        display: flex;
        gap: 12px;
        margin-left: -6px;
        margin-right: -6px;
      }
      
      .image-carousel .slick-slide {
        transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1);
      }
      
      .image-carousel .slick-slide img {
        transform: scale(0.95);
        transition: transform 0.7s cubic-bezier(0.19, 1, 0.22, 1);
        backface-visibility: hidden;
      }
      
      .image-carousel .slick-center img {
        transform: scale(1);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
      }
      
      /* Add image glint/shine effect */
      .image-shine {
        position: relative;
        overflow: hidden;
      }
      
      .image-shine::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -60%;
        width: 30%;
        height: 200%;
        background: linear-gradient(
          to right,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.3) 50%,
          rgba(255, 255, 255, 0) 100%
        );
        transform: rotate(30deg);
        animation: shine 6s infinite;
      }
      
      @keyframes shine {
        0% {
          left: -100%;
        }
        20%, 100% {
          left: 200%;
        }
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
                  {/* Stylized gradient effects */}
                  <div className="absolute -left-20 top-10 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                  <div className="absolute -right-20 top-10 w-40 h-40 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                  
                  {/* Cool, fast, non-interactive slider */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10"
                  >
                    <Slider
                      ref={sliderRef}
                      dots={false}
                      infinite={true}
                      speed={800}
                      slidesToShow={4}
                      slidesToScroll={1}
                      autoplay={true}
                      autoplaySpeed={1500}
                      pauseOnHover={false}
                      swipe={false}
                      touchMove={false}
                      arrows={false}
                      cssEase="cubic-bezier(0.45, 0, 0.55, 1)"
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
                        <div key={image.id} className="px-2">
                          <motion.div 
                            whileHover={{ scale: 1.02 }} 
                            className="relative overflow-hidden rounded-lg shadow-md group"
                          >
                            <div className="aspect-w-16 aspect-h-9 bg-slate-800 image-shine">
                              <img 
                                src={image.thumbUrl || image.url} 
                                alt={image.prompt}
                                className="w-full h-64 object-cover transition-transform duration-700 ease-in-out"
                              />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="absolute bottom-0 left-0 right-0 p-4">
                                <h3 className="text-white text-sm font-medium line-clamp-2 mb-1">{image.prompt}</h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-white/70">{image.model}</span>
                                </div>
                              </div>
                            </div>
                            <div className="absolute top-2 right-2">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-100">
                                {image.size}
                              </span>
                            </div>
                          </motion.div>
                        </div>
                      ))}
                    </Slider>
                  </motion.div>
                  
                  {/* Fancy progress indicator */}
                  <div className="mt-6 flex justify-center">
                    <div className="w-64 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ 
                          repeat: Infinity,
                          duration: 15,
                          ease: "linear"
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg">
                  <motion.div 
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 1.5, repeat: Infinity, ease: "linear" },
                      scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="w-12 h-12 rounded-full border-t-2 border-b-2 border-blue-600"
                  />
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