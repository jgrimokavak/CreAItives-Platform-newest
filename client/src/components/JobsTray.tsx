import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';

export interface JobStatus {
  jobId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  mode: 'background-only' | 'studio-enhance';
  modelKey: string;
  progress: number;
  resultImageUrl?: string;
  resultThumbUrl?: string;
  errorMessage?: string;
  createdAt?: string;
}

interface JobsTrayProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCompleted?: (job: JobStatus) => void;
}

export function JobsTray({ isOpen, onClose, onJobCompleted }: JobsTrayProps) {
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const { user } = useAuth();

  // Fetch active jobs on mount
  useEffect(() => {
    fetchActiveJobs();
  }, []);

  // WebSocket message handler
  useEffect(() => {
    const handleWebSocketMessage = (event: any) => {
      console.log('[JobsTray] WebSocket message received:', event.detail);
      
      const { type, data } = event.detail || {};
      
      if (type === 'jobCreated') {
          // Only show jobs for the current user (session-specific)
          if (!user || data.userId !== user.id) {
            return;
          }
          
          const newJob: JobStatus = {
            jobId: data.jobId,
            userId: data.userId,
            status: 'pending',
            mode: data.mode,
            modelKey: data.modelKey,
            progress: 0
          };
          
          // Prevent duplicates by checking if job already exists
          setJobs(prev => {
            if (prev.some(j => j.jobId === newJob.jobId)) {
              return prev;
            }
            return [newJob, ...prev];
          });
        } 
        else if (type === 'jobUpdated') {
          // Only process job updates for the current user (session-specific)
          if (!user || data.userId !== user.id) {
            return;
          }
          
          const updatedJob = data;
          
          setJobs(prev => prev.map(job => 
            job.jobId === updatedJob.jobId 
              ? { 
                  ...job, 
                  status: updatedJob.status,
                  progress: updatedJob.progress || job.progress,
                  resultImageUrl: updatedJob.resultImageUrl || job.resultImageUrl,
                  resultThumbUrl: updatedJob.resultThumbUrl || job.resultThumbUrl,
                  errorMessage: updatedJob.errorMessage || job.errorMessage
                }
              : job
          ));
          
          // Handle completed or failed jobs
          if (updatedJob.status === 'completed' && updatedJob.resultImageUrl) {
            // Get the current job to build the completed job object
            setJobs(currentJobs => {
              const currentJob = currentJobs.find((j: JobStatus) => j.jobId === updatedJob.jobId);
              
              const completedJob: JobStatus = {
                jobId: updatedJob.jobId,
                userId: updatedJob.userId,
                status: 'completed' as const,
                mode: currentJob?.mode || 'studio-enhance' as const,
                modelKey: currentJob?.modelKey || 'google/nano-banana',
                progress: 100,
                resultImageUrl: updatedJob.resultImageUrl,
                resultThumbUrl: updatedJob.resultThumbUrl
              };
              
              // Notify parent component with setTimeout to avoid setState during render
              if (onJobCompleted) {
                setTimeout(() => {
                  onJobCompleted(completedJob);
                }, 0);
              }
              
              // Return updated jobs
              return currentJobs.map((job: JobStatus) => 
                job.jobId === updatedJob.jobId 
                  ? completedJob
                  : job
              );
            });
            
            // Remove completed job from tray after a short delay
            setTimeout(() => {
              setJobs(prevJobs => prevJobs.filter((job: JobStatus) => job.jobId !== updatedJob.jobId));
            }, 3000);
          }
          
          // Handle failed jobs - remove them after 5 seconds
          if (updatedJob.status === 'failed') {
            setTimeout(() => {
              setJobs(prevJobs => prevJobs.filter((job: JobStatus) => job.jobId !== updatedJob.jobId));
            }, 5000);
          }
        }
    };

    // Listen for custom WebSocket events dispatched by the useWebSocket hook
    if (typeof window !== 'undefined') {
      window.addEventListener('ws-message', handleWebSocketMessage);
      
      return () => {
        window.removeEventListener('ws-message', handleWebSocketMessage);
      };
    }
  }, [onJobCompleted]);

  const fetchActiveJobs = async () => {
    try {
      const response = await fetch('/api/jobs/active');
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to fetch active jobs:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'processing':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Queued';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getModelDisplayName = (modelKey: string) => {
    switch (modelKey) {
      case 'google/nano-banana':
        return 'Nano Banana';
      case 'flux-kontext-max':
        return 'Flux Kontext';
      default:
        return modelKey;
    }
  };

  const getModeDisplayName = (mode: string) => {
    switch (mode) {
      case 'background-only':
        return 'Background Only';
      case 'studio-enhance':
        return 'Studio Enhance';
      default:
        return mode;
    }
  };

  return (
    <div className={`fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg transform transition-transform duration-300 z-40 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-lg">Jobs Tray</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto h-[calc(100vh-80px)]">
        {jobs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No active jobs</p>
            <p className="text-sm">Your generated images will appear here</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div 
              key={job.jobId} 
              className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(job.status)}
                  <span className="font-medium text-sm">
                    {getStatusText(job.status)}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {getModeDisplayName(job.mode)}
                </div>
              </div>

              <div className="text-xs text-gray-600">
                <div>Model: {getModelDisplayName(job.modelKey)}</div>
              </div>

              {job.status === 'processing' && (
                <div className="space-y-1">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {job.progress}%
                  </div>
                </div>
              )}

              {job.status === 'failed' && job.errorMessage && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  {job.errorMessage.length > 100 
                    ? job.errorMessage.substring(0, 100) + '...'
                    : job.errorMessage
                  }
                </div>
              )}

              {job.status === 'completed' && job.resultThumbUrl && (
                <div className="flex justify-center">
                  <img 
                    src={job.resultThumbUrl}
                    alt="Generated result"
                    className="h-20 w-20 object-cover rounded border border-gray-200"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {jobs.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 text-xs text-gray-500 text-center bg-white py-2">
          {jobs.filter(j => j.status === 'pending' || j.status === 'processing').length} active • Max 4 concurrent
        </div>
      )}
    </div>
  );
}