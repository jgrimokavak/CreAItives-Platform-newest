import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function HeroSection() {
  return (
    <section className="relative py-24 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            CreAItives Platform 2.0
          </h1>
          <p className="text-xl mb-8 opacity-90">
            Advanced AI-powered image generation and enhancement platform specialized in automotive design and beyond.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg" variant="default" className="bg-white text-indigo-700 hover:bg-gray-100">
              <Link href="/car">Create Cars</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <Link href="/gallery">View Gallery</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}