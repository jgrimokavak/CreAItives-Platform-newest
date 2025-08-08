import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Download, 
  X, 
  Loader2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export interface JobTrayItem {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  model: string;
  createdAt: number;
  error?: string;
}

interface JobTrayProps {
  jobs: JobTrayItem[];
  onJobUpdate: (jobId: string, status: JobTrayItem['status'], error?: string) => void;
  onJobDismiss: (jobId: string) => void;
  onPlayVideo: (videoId: string) => void;
  onJumpToResult: (videoId: string) => void;
}

export function JobTray({ 
  jobs, 
  onJobUpdate, 
  onJobDismiss, 
  onPlayVideo, 
  onJumpToResult 
}: JobTrayProps) {
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Poll for job status updates
  useEffect(() => {
    const activeJobs = jobs.filter(job => 
      job.status === 'pending' || job.status === 'processing'
    );
    
    if (activeJobs.length === 0) return;
    
    const pollInterval = setInterval(async () => {
      for (const job of activeJobs) {
        try {
          const response = await apiRequest(`/api/video/status/${job.id}`);
          
          if (response.status !== job.status) {
            onJobUpdate(job.id, response.status, response.error);
            
            if (response.status === 'completed') {
              toast({ 
                title: 'Video generation completed!',
                description: `"${job.prompt.slice(0, 50)}${job.prompt.length > 50 ? '...' : ''}"`
              });
            } else if (response.status === 'failed') {
              toast({ 
                title: 'Video generation failed',
                description: response.error || 'Unknown error occurred',
                variant: 'destructive'
              });
            }
          }
        } catch (error) {
          console.error(`Failed to poll job ${job.id}:`, error);
        }
      }
    }, 6000); // Poll every 6 seconds
    
    return () => clearInterval(pollInterval);
  }, [jobs, onJobUpdate, toast]);
  
  const getStatusIcon = (status: JobTrayItem['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };
  
  const getStatusText = (status: JobTrayItem['status']) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
    }
  };
  
  const getStatusColor = (status: JobTrayItem['status']) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
    }
  };
  
  const handleDownload = async (jobId: string) => {
    try {
      const response = await fetch(`/api/object-storage/video/dev/video-generations/${jobId}.mp4`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video-${jobId}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({ title: 'Video download started' });
    } catch (error) {
      toast({
        title: 'Failed to download video',
        description: 'An error occurred while downloading',
        variant: 'destructive'
      });
    }
  };
  
  if (jobs.length === 0) return null;
  
  const activeJobs = jobs.filter(job => job.status === 'pending' || job.status === 'processing');
  const completedJobs = jobs.filter(job => job.status === 'completed');
  const failedJobs = jobs.filter(job => job.status === 'failed');
  
  return (
    <Card className="fixed bottom-4 right-4 w-96 max-w-[calc(100vw-2rem)] shadow-lg z-50 border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Job Tray
            {activeJobs.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeJobs.length} active
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="pt-0 max-h-80 overflow-y-auto">
          <div className="space-y-3">
            {jobs.slice(-5).reverse().map((job) => (
              <div key={job.id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(job.status)}
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(job.status)}`}
                      >
                        {getStatusText(job.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {job.model}
                      </span>
                    </div>
                    
                    <p className="text-sm text-foreground mb-2 line-clamp-2">
                      {job.prompt}
                    </p>
                    
                    {job.status === 'failed' && job.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {job.error}
                      </p>
                    )}
                    
                    {job.status === 'completed' && (
                      <div className="flex gap-1 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onJumpToResult(job.id)}
                          className="h-6 px-2 text-xs"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Play
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(job.id)}
                          className="h-6 px-2 text-xs"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onJobDismiss(job.id)}
                    className="h-6 w-6 p-0 flex-shrink-0"
                    disabled={job.status === 'pending' || job.status === 'processing'}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}