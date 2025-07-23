import React from 'react';
import { VideoIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const VideoCreationPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-primary/10 rounded-lg">
          <VideoIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Video Creation</h1>
          <p className="text-slate-600 mt-1">AI-powered video generation with Google Vertex AI (Veo 3)</p>
        </div>
      </div>

      <Card className="border border-slate-200">
        <CardContent className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="p-4 bg-slate-50 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
              <VideoIcon className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Video Creation – Coming Soon</h2>
            <p className="text-slate-600">
              Generate stunning videos using AI with Google Vertex AI's Veo 3 model. 
              This powerful feature will be available soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoCreationPage;