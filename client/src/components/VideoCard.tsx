import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  MoreHorizontal, 
  Play, 
  Download, 
  Trash2, 
  MoveIcon, 
  Loader2, 
  VideoIcon as VideoIconSm,
  AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoCardProps {
  video: {
    id: string;
    url?: string | null;
    thumbUrl?: string | null;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    prompt: string;
    model: string;
    resolution?: string | null;
    duration?: string | null;
    projectId?: string | null;
    createdAt?: string | null;
  };
  draggable?: boolean;
  onDelete?: (id: string) => void;
  onMove?: (id: string, projectId: string | null) => void;
  className?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string | null;
}

export default function VideoCard({ 
  video, 
  draggable = false, 
  onDelete, 
  onMove, 
  className 
}: VideoCardProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch projects for move menu
  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: () => apiRequest('/api/projects'),
    enabled: true,
  });

  // Delete video mutation
  const deleteMutation = useMutation({
    mutationFn: (videoId: string) => apiRequest(`/api/video/${videoId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({ title: 'Video deleted successfully' });
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/video'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      if (video.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/projects', video.projectId, 'details'] 
        });
      }
      
      onDelete?.(video.id);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete video',
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
    }
  });

  // Move video mutation
  const moveMutation = useMutation({
    mutationFn: ({ videoId, projectId }: { videoId: string; projectId: string | null }) =>
      apiRequest(`/api/video/${videoId}/move`, { 
        method: 'PATCH', 
        body: JSON.stringify({ projectId }),
        headers: { 'Content-Type': 'application/json' }
      }),
    onSuccess: (_, { projectId }) => {
      const projectName = projectId 
        ? projects?.find(p => p.id === projectId)?.name || 'Project'
        : 'No project';
      
      toast({ 
        title: `Video moved to ${projectName}` 
      });
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/video'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      if (video.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/projects', video.projectId, 'details'] 
        });
      }
      if (projectId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/projects', projectId, 'details'] 
        });
      }
      
      onMove?.(video.id, projectId || null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to move video',
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
    }
  });

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.focus();
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = async () => {
    if (!video.url) return;
    
    try {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video-${video.id}.mp4`;
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

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      deleteMutation.mutate(video.id);
    }
  };

  const handleMove = (projectId: string | null) => {
    moveMutation.mutate({ videoId: video.id, projectId });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing': return <Loader2 className="w-3 h-3 animate-spin" />;
      case 'failed': return <AlertCircle className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <Card className={cn("group relative overflow-hidden", className)} draggable={draggable}>
      <CardContent className="p-0">
        {/* Video/Thumbnail Section */}
        <div className="aspect-video bg-muted relative overflow-hidden">
          {video.url && video.status === 'completed' ? (
            <video
              ref={videoRef}
              controls
              preload="metadata"
              poster={video.thumbUrl || undefined}
              className="w-full h-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            >
              <source src={video.url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : video.thumbUrl ? (
            <img
              src={video.thumbUrl}
              alt={video.prompt}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <VideoIconSm className="w-8 h-8 text-muted-foreground" />
            </div>
          )}

          {/* Status processing overlay */}
          {video.status === 'processing' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-2 right-2 flex gap-2">
            <Badge 
              variant={getStatusVariant(video.status)} 
              className="text-xs flex items-center gap-1"
            >
              {getStatusIcon(video.status)}
              {video.status}
            </Badge>
          </div>

          {/* Quick Play Button (only for completed videos) */}
          {video.url && video.status === 'completed' && !isPlaying && (
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Button
                size="sm"
                onClick={handlePlay}
                className="rounded-full bg-black/50 hover:bg-black/70 text-white"
              >
                <Play className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-3">
          {/* Prompt */}
          <p className="text-sm font-medium line-clamp-2 mb-2" title={video.prompt}>
            {video.prompt}
          </p>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <span>{video.model}</span>
              {video.resolution && (
                <>
                  <span>•</span>
                  <span>{video.resolution}</span>
                </>
              )}
              {video.duration && (
                <>
                  <span>•</span>
                  <span>{video.duration}s</span>
                </>
              )}
            </div>
            <span>{formatDate(video.createdAt || null)}</span>
          </div>

          {/* Actions Menu */}
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={deleteMutation.isPending || moveMutation.isPending}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {video.url && video.status === 'completed' && (
                  <>
                    <DropdownMenuItem onClick={handlePlay}>
                      <Play className="w-4 h-4 mr-2" />
                      Play
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={moveMutation.isPending}>
                    <MoveIcon className="w-4 h-4 mr-2" />
                    Move to...
                    {moveMutation.isPending && <Loader2 className="w-3 h-3 ml-2 animate-spin" />}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleMove(null)}>
                      <span className="text-muted-foreground">No project</span>
                    </DropdownMenuItem>
                    {projects?.map((project) => (
                      <DropdownMenuItem 
                        key={project.id} 
                        onClick={() => handleMove(project.id)}
                        disabled={video.projectId === project.id}
                      >
                        {project.name}
                        {video.projectId === project.id && (
                          <span className="ml-auto text-xs text-muted-foreground">Current</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete} 
                  className="text-destructive focus:text-destructive"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                  {deleteMutation.isPending && <Loader2 className="w-3 h-3 ml-2 animate-spin" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}