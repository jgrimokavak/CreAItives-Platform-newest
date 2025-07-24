import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, Image, Upload, Settings, LogOut } from "lucide-react";
import { Link } from "wouter";

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

export default function AuthenticatedHomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const typedUser = user as User;
  const userInitials = typedUser ? (
    (typedUser.firstName?.[0]?.toUpperCase() || '') + (typedUser.lastName?.[0]?.toUpperCase() || '')
  ) : (
    typedUser?.email?.[0]?.toUpperCase() || 'U'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">AI Studio</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={typedUser?.profileImageUrl} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {typedUser?.firstName || typedUser?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">{typedUser?.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {typedUser?.firstName || 'Creator'}!
          </h2>
          <p className="text-gray-600">
            Choose a tool below to start creating amazing visual content.
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/create">
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105">
              <CardHeader>
                <Image className="h-12 w-12 text-indigo-600 mb-4" />
                <CardTitle>Create Images</CardTitle>
                <CardDescription>
                  Generate stunning images using AI models like GPT-Image-1, Imagen-4, and Flux-Pro
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/video">
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105">
              <CardHeader>
                <Video className="h-12 w-12 text-indigo-600 mb-4" />
                <CardTitle>Generate Videos</CardTitle>
                <CardDescription>
                  Create professional videos with Google Vertex AI Veo technology
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/gallery">
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105">
              <CardHeader>
                <Upload className="h-12 w-12 text-indigo-600 mb-4" />
                <CardTitle>View Gallery</CardTitle>
                <CardDescription>
                  Browse, organize, and manage your created images and videos
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Additional Tools */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle>Specialized Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/upscale">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Image Upscaling
                </Button>
              </Link>
              <Link href="/car">
                <Button variant="outline" className="w-full justify-start">
                  <Image className="h-4 w-4 mr-2" />
                  Car Generation
                </Button>
              </Link>
              <Link href="/email-builder">
                <Button variant="outline" className="w-full justify-start">
                  <Upload className="h-4 w-4 mr-2" />
                  Email Builder
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Your recent creations and projects will appear here. Start by creating your first image or video!
              </p>
              <Link href="/create">
                <Button className="mt-4 w-full">
                  Create Your First Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}