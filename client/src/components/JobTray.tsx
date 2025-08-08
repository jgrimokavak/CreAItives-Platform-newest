import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Loader2, 
  X, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface JobTrayJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  model: string;
  createdAt: string;
  projectId?: string | null;
  url?: string | null;
  thumbUrl?: string | null;
  progress?: number; // Optional progress percentage
}

interface JobTrayProps {
  jobs: JobTrayJob[];
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onPlay?: (job: JobTrayJob) => void;
  onDismiss?: (id: string) => void;
  className?: string;
}

export default function JobTray({ 
  jobs, 
  onCancel, 
  onRetry, 
  onPlay, 
  onDismiss, 
  className 
}: JobTrayProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (jobs.length === 0) {
    return null;
  }

  const activeJobs = jobs.filter(job => job.status === 'pending' || job.status === 'processing');
  const completedJobs = jobs.filter(job => job.status === 'completed');
  const failedJobs = jobs.filter(job => job.status === 'failed');

  const getStatusIcon = (status: JobTrayJob['status']) => {
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

  const getStatusBadge = (status: JobTrayJob['status']) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status]} className="text-xs">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const truncatePrompt = (prompt: string, maxLength: number = 60) => {
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength) + '...';
  };

  return (
    <div className={cn("fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg", className)}>
      <Card className="rounded-none border-0 border-t">
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <h3 className="font-medium text-sm">
                Video Generation {activeJobs.length > 0 && `(${activeJobs.length} active)`}
              </h3>
            </div>
            
            <div className="flex items-center gap-1">
              {activeJobs.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeJobs.length} processing
                </Badge>
              )}
              {completedJobs.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {completedJobs.length} completed
                </Badge>
              )}
              {failedJobs.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {failedJobs.length} failed
                </Badge>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              jobs.forEach(job => onDismiss?.(job.id));
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        </div>

        {/* Job List */}
        {!isCollapsed && (
          <CardContent className="p-0 max-h-64 overflow-y-auto">
            <div className="space-y-1">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-l-4 border-l-transparent"
                  style={{
                    borderLeftColor: 
                      job.status === 'completed' ? '#22c55e' :
                      job.status === 'processing' ? '#3b82f6' :
                      job.status === 'failed' ? '#ef4444' : '#f59e0b'
                  }}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {getStatusIcon(job.status)}
                  </div>

                  {/* Job Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {job.model}
                      </Badge>
                      {getStatusBadge(job.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(job.createdAt)}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium truncate" title={job.prompt}>
                      {truncatePrompt(job.prompt)}
                    </p>
                    
                    {/* Progress Bar */}
                    {(job.status === 'processing' || job.status === 'pending') && (
                      <div className="w-full">
                        <Progress 
                          value={job.progress || undefined} 
                          className="h-1"
                        />
                        {job.progress && (
                          <span className="text-xs text-muted-foreground">
                            {job.progress}% complete
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    {job.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPlay?.(job)}
                        className="gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Play
                      </Button>
                    )}
                    
                    {job.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRetry?.(job.id)}
                        className="gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Retry
                      </Button>
                    )}
                    
                    {(job.status === 'processing' || job.status === 'pending') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancel?.(job.id)}
                        className="gap-1 text-muted-foreground hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDismiss?.(job.id)}
                      className="text-muted-foreground hover:text-foreground"
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
    </div>
  );
}