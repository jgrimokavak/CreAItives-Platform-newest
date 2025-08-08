import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VideoIcon } from 'lucide-react';

export default function VideoPageMinimal() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <VideoIcon className="w-8 h-8 text-primary" />
          Video Creation
        </h1>
        <p className="text-muted-foreground">
          Generate AI-powered videos with advanced controls and project organization
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Video Generator</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Video generation interface coming soon...</p>
          <Button className="mt-4">Generate Video</Button>
        </CardContent>
      </Card>
    </div>
  );
}