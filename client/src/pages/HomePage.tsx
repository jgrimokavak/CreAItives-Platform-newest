import { Capabilities } from "@/components/Capabilities";
import { ImageCarousel } from "@/components/ImageCarousel";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Zap, Sparkles, Image as ImageIcon } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-0 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950">
        <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(to_bottom_right,white,transparent,white)] dark:bg-grid-slate-700/25"></div>
        <div className="container relative mx-auto px-4 py-20 sm:py-32">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="flex flex-col justify-center space-y-8">
              <div>
                <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 mb-6">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  <span>New Platform Release</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                  <span className="bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent animate-gradient-text">CreAItives</span> Platform 2.0
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-300 max-w-xl">
                  Transform your creative vision into stunning AI-generated imagery with our powerful suite of creation tools.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" className="group">
                  <Link to="/create">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/gallery">
                    Browse Gallery
                  </Link>
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">Fast Generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">High Resolution</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">Smart Prompts</span>
                </div>
              </div>
            </div>
            
            <div className="relative h-full flex items-center justify-center">
              <div className="relative bg-white shadow-xl rounded-xl overflow-hidden p-3 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                <ImageCarousel autoScrollInterval={5000} className="w-full max-w-md mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Capabilities Section */}
      <Capabilities />
      
      {/* Feature Highlight Section */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Unleash Your Creative Vision</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The perfect AI-powered solution for designers, marketers, and creators
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="flex gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/50 rounded-lg p-2 h-min">
                  <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Smart Prompt Assistance</h3>
                  <p className="text-slate-600 dark:text-slate-400">Our AI helps refine your prompts to generate the exact imagery you envision.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/50 rounded-lg p-2 h-min">
                  <ImageIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Advanced Editing Tools</h3>
                  <p className="text-slate-600 dark:text-slate-400">Precise control over your generated images with powerful editing capabilities.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/50 rounded-lg p-2 h-min">
                  <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Fast, High-Quality Results</h3>
                  <p className="text-slate-600 dark:text-slate-400">Generate stunning high-resolution images in seconds with our optimized models.</p>
                </div>
              </div>
            </div>
            
            <div className="relative order-first md:order-last">
              <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden shadow-md">
                <div className="grid grid-cols-2 gap-2 p-4 h-full">
                  <div className="flex items-center justify-center p-4 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 rounded-lg">
                    <ImageIcon className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-float" />
                  </div>
                  <div className="space-y-2 p-4 bg-gradient-to-br from-amber-100 to-rose-100 dark:from-amber-900/40 dark:to-rose-900/40 rounded-lg">
                    <Sparkles className="h-12 w-12 text-amber-600 dark:text-amber-400 animate-float" style={{ animationDelay: '0.5s' }} />
                  </div>
                  <div className="space-y-2 p-4 bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/40 dark:to-teal-900/40 rounded-lg">
                    <Zap className="h-12 w-12 text-green-600 dark:text-green-400 animate-float" style={{ animationDelay: '1s' }} />
                  </div>
                  <div className="space-y-2 p-4 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/40 rounded-lg">
                    <div className="flex items-center justify-center w-full h-full">
                      <div className="font-bold text-3xl bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-transparent animate-pulse-slow">AI</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 h-24 w-24 bg-blue-600 rounded-lg opacity-30 blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Create Amazing Images?</h2>
          <p className="max-w-2xl mx-auto mb-8 text-blue-100">
            Get started with CreAItives Platform 2.0 today and bring your creative ideas to life with the power of AI.
          </p>
          <Button asChild size="lg" variant="secondary" className="group">
            <Link to="/create">
              Start Creating Now
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}