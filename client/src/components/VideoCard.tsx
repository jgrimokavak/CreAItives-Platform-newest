import React, { useRef, useState, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  MoreHorizontal, 
  Download, 
  Trash2, 
  MoveIcon, 
  Loader2, 
  VideoIcon as VideoIconSm,
  AlertCircle,
  Eye,
  Copy,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoCardProps {
  video: {
    id: string;
    url?: string | null;
    thumbUrl?: string | null;
    firstFrameImage?: string | null; // base64 encoded first frame image
    status: 'pending' | 'processing' | 'completed' | 'failed';
    prompt: string;
    model: string;
    resolution?: string | null;
    duration?: string | null;
    projectId?: string | null;
    createdAt?: string | null;
    referenceImageUrl?: string | null; // Reference image used in generation (if any)
  };
  draggable?: boolean;
  onDelete?: (id: string) => void;
  onMove?: (id: string, projectId: string | null) => void;
  onUseReferenceImage?: (src: string) => void;
  className?: string;
  autoPlay?: boolean; // Auto-play the video when it loads
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
  onUseReferenceImage,
  className,
  autoPlay = false
}: VideoCardProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && video.status === 'completed' && video.url && videoRef.current) {
      const videoElement = videoRef.current;
      const playVideo = () => {
        videoElement.play().catch(console.warn);
      };
      
      // Slight delay to ensure video is loaded
      setTimeout(playVideo, 300);
    }
  }, [autoPlay, video.status, video.url]);

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
    
    setIsDownloading(true);
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
    } finally {
      setIsDownloading(false);
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

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: successMessage });
    } catch (error) {
      toast({
        title: 'Failed to copy to clipboard',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const handleCopyImage = async (imageSrc: string) => {
    try {
      if (imageSrc.startsWith('data:')) {
        // Base64 image - copy the data URL
        await copyToClipboard(imageSrc, 'Image copied to clipboard');
      } else {
        // URL image - try to fetch and copy as blob, fallback to opening in new tab
        try {
          const response = await fetch(imageSrc);
          const blob = await response.blob();
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob
            })
          ]);
          toast({ title: 'Image copied to clipboard' });
        } catch {
          // Fallback: open in new tab
          window.open(imageSrc, '_blank');
          toast({ title: 'Image opened in new tab' });
        }
      }
    } catch (error) {
      toast({
        title: 'Failed to copy image',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadImage = async (imageSrc: string) => {
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reference-image-${video.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({ title: 'Reference image download started' });
    } catch (error) {
      toast({
        title: 'Failed to download image',
        description: 'An error occurred while downloading',
        variant: 'destructive'
      });
    }
  };

  const handleUseReference = (imageSrc: string) => {
    if (onUseReferenceImage) {
      onUseReferenceImage(imageSrc);
      toast({ title: 'Reference image selected' });
    }
  };

  // Get the poster/thumbnail source (for video poster attribute)
  const getPosterSrc = () => {
    return video.thumbUrl || video.firstFrameImage || null;
  };

  // Get the reference image source (only if a reference was actually used)
  const getReferenceImageSrc = () => {
    return video.referenceImageUrl || null;
  };

  // Determine if this video has a usable thumbnail for display
  const hasThumbnail = () => {
    return !!(video.thumbUrl || video.firstFrameImage);
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
          {/* Tasteful placeholder background */}
          {!hasThumbnail() && (
            <div 
              className="absolute inset-0 w-full h-full flex flex-col items-center justify-center"
              style={{ 
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              }}
            >
              <div className="p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-white/20">
                <VideoIconSm className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-xs text-slate-500 mt-2">Generating thumbnail...</p>
            </div>
          )}
          
          {video.url && video.status === 'completed' ? (
            <video
              ref={videoRef}
              controls
              preload="metadata"
              poster={getPosterSrc() || undefined}
              className="w-full h-full object-cover"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            >
              <source src={video.url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : hasThumbnail() ? (
            <img
              src={getPosterSrc()!}
              alt={video.prompt}
              className="w-full h-full object-cover"
            />
          ) : null}

          {/* Status processing overlay */}
          {video.status === 'processing' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          )}

          {/* Top-right action cluster */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {/* Download Button - visible for completed videos */}
            {video.url && video.status === 'completed' && (
              <Button
                size="sm"
                variant="secondary"
                className="h-7 w-7 p-0 bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
              </Button>
            )}
            
            {/* Overflow Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 w-7 p-0 bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                  disabled={deleteMutation.isPending || moveMutation.isPending}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {video.url && video.status === 'completed' && (
                  <>
                    <DropdownMenuItem onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuItem onClick={() => copyToClipboard(video.prompt, 'Prompt copied to clipboard')}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy prompt
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
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
            
            {/* Status Badge */}
            <Badge 
              variant={getStatusVariant(video.status)} 
              className="text-xs flex items-center gap-1 ml-1"
            >
              {getStatusIcon(video.status)}
              {video.status}
            </Badge>
          </div>
        </div>

        {/* Bottom Content Area */}
        <div className="p-4 space-y-3">
          {/* Prompt Section */}
          <div className="space-y-2">
            <p className="text-sm font-medium line-clamp-2 leading-relaxed" title={video.prompt}>
              {video.prompt}
            </p>
            <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View full
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Full Prompt</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-96 pr-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {video.prompt}
                    </p>
                  </div>
                </ScrollArea>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(video.prompt, 'Prompt copied to clipboard')}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy prompt
                  </Button>
                  <DialogClose asChild>
                    <Button>Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium">{video.model}</span>
              {video.resolution && (
                <>
                  <span className="opacity-50">•</span>
                  <span>{video.resolution}</span>
                </>
              )}
              {video.duration && (
                <>
                  <span className="opacity-50">•</span>
                  <span>{video.duration}s</span>
                </>
              )}
            </div>
            <span className="tabular-nums">{formatDate(video.createdAt || null)}</span>
          </div>

          {/* Reference Image Chip (only if reference was used) */}
          {getReferenceImageSrc() && (
            <div className="pt-1">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 px-2 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <ImageIcon className="w-3 h-3 mr-1.5" />
                    Reference
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Reference Image</DialogTitle>
                    <DialogDescription>
                      This image was used as reference during generation
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <img
                      src={getReferenceImageSrc()!}
                      alt="Reference image used in generation"
                      className="w-full max-h-64 object-cover rounded-lg border"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDownloadImage(getReferenceImageSrc()!)}
                      >
                        <Download className="w-3.5 h-3.5 mr-2" />
                        Download Image
                      </Button>
                      {onUseReferenceImage && (
                        <Button
                          className="flex-1"
                          onClick={() => handleUseReference(getReferenceImageSrc()!)}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-2" />
                          Use as Reference
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}