import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Image, Sparkles, ArrowRight, Upload, Palette } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-8 w-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">AI Studio</h1>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Create Stunning Visual Content with AI
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Transform your ideas into professional-quality images and videos using cutting-edge AI technology. 
            Perfect for marketing teams, content creators, and creative professionals.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-4"
          >
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Image className="h-12 w-12 text-indigo-600 mb-4" />
              <CardTitle>AI Image Generation</CardTitle>
              <CardDescription>
                Create stunning images from text descriptions using multiple AI models including GPT-Image-1, Imagen-4, and Flux-Pro
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Video className="h-12 w-12 text-indigo-600 mb-4" />
              <CardTitle>Video Creation</CardTitle>
              <CardDescription>
                Generate professional videos with Google Vertex AI Veo technology with customizable parameters and AI-driven enhancements
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <Upload className="h-12 w-12 text-indigo-600 mb-4" />
              <CardTitle>Batch Processing</CardTitle>
              <CardDescription>
                Process multiple requests simultaneously with comprehensive project management and workflow tracking
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Additional Features */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="h-6 w-6 text-indigo-600 mr-2" />
                Advanced Customization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• Multiple aspect ratios and resolutions</li>
                <li>• Prompt enhancement with AI</li>
                <li>• Quality settings and style options</li>
                <li>• Real-time preview and editing</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="h-6 w-6 text-indigo-600 mr-2" />
                Professional Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-600">
                <li>• Secure cloud storage and management</li>
                <li>• Project-based organization</li>
                <li>• Gallery with search and filtering</li>
                <li>• Download and export options</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to transform your creative workflow?
          </h3>
          <p className="text-lg text-gray-600 mb-8">
            Join professionals who trust AI Studio for their visual content needs.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8 py-4"
          >
            Start Creating Now <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2025 AI Studio. Professional AI-powered video and image generation platform.
          </p>
        </div>
      </footer>
    </div>
  );
}