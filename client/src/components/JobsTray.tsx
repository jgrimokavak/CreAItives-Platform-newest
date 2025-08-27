import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
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
  onJobsUpdate?: (jobs: JobStatus[]) => void;
}

export function JobsTray({ isOpen, onClose, onJobCompleted, onJobsUpdate }: JobsTrayProps) {
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { user } = useAuth();

  // Fetch active jobs on mount and periodically refresh
  useEffect(() => {
    fetchActiveJobs();
    
    // Set up periodic refresh for active jobs (every 10 seconds)
    const refreshInterval = setInterval(() => {
      if (jobs.some(job => job.status === 'pending' || job.status === 'processing')) {
        fetchActiveJobs();
      }
    }, 10000);
    
    return () => clearInterval(refreshInterval);
  }, [jobs.length]);

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
            const updatedJobs = [newJob, ...prev];
            if (onJobsUpdate) {
              onJobsUpdate(updatedJobs);
            }
            return updatedJobs;
          });
        } 
        else if (type === 'jobUpdated') {
          // Only process job updates for the current user (session-specific)
          if (!user || data.userId !== user.id) {
            return;
          }
          
          const updatedJob = data;
          
          setJobs(prev => {
            const updatedJobsList = prev.map(job => 
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
            );
            if (onJobsUpdate) {
              onJobsUpdate(updatedJobsList);
            }
            return updatedJobsList;
          });
          
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
              const updatedJobsList = currentJobs.map((job: JobStatus) => 
                job.jobId === updatedJob.jobId 
                  ? completedJob
                  : job
              );
              if (onJobsUpdate) {
                onJobsUpdate(updatedJobsList);
              }
              return updatedJobsList;
            });
            
            // Remove completed job from tray after a short delay
            setTimeout(() => {
              setJobs(prevJobs => {
                const filteredJobs = prevJobs.filter((job: JobStatus) => job.jobId !== updatedJob.jobId);
                if (onJobsUpdate) {
                  onJobsUpdate(filteredJobs);
                }
                return filteredJobs;
              });
            }, 3000);
          }
          
          // Handle failed jobs - show retry option and remove after longer delay
          if (updatedJob.status === 'failed') {
            // Show failed job for 10 seconds to give user time to see error
            setTimeout(() => {
              setJobs(prevJobs => {
                const filteredJobs = prevJobs.filter((job: JobStatus) => job.jobId !== updatedJob.jobId);
                if (onJobsUpdate) {
                  onJobsUpdate(filteredJobs);
                }
                return filteredJobs;
              });
            }, 10000);
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

  const fetchActiveJobs = async (showLoading = false) => {
    try {
      if (showLoading) setIsRefreshing(true);
      
      const response = await fetch('/api/jobs/active');
      if (response.ok) {
        const data = await response.json();
        const fetchedJobs = data.jobs || [];
        setJobs(fetchedJobs);
        if (onJobsUpdate) {
          onJobsUpdate(fetchedJobs);
        }
      } else {
        console.warn('Failed to fetch active jobs - server returned:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch active jobs:', error);
      // On error, try again after a delay
      setTimeout(() => fetchActiveJobs(), 5000);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Manual refresh function
  const handleRefresh = () => {
    fetchActiveJobs(true);
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
    <div className={`fixed right-0 top-0 h-full w-96 sm:w-80 md:w-96 lg:w-[28rem] bg-white border-l border-gray-200 shadow-xl transform transition-transform duration-300 z-40 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div>
          <h3 className="font-semibold text-xl text-gray-900">Jobs Tray</h3>
          <p className="text-sm text-gray-600 mt-1">Track your image generations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 p-0 hover:bg-white/50 rounded-full"
            title="Refresh jobs"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 w-9 p-0 hover:bg-white/50 rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto h-[calc(100vh-120px)]">
        {jobs.length === 0 ? (
          <div className="text-center text-gray-500 py-8 sm:py-12">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">No active jobs</h4>
            <p className="text-xs sm:text-sm text-gray-500">Your generated images will appear here</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div 
              key={job.jobId} 
              className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-2 sm:space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <span className="font-semibold text-xs sm:text-sm text-gray-900">
                      {getStatusText(job.status)}
                    </span>
                    <div className="text-xs text-gray-500 mt-0.5 hidden sm:block">
                      {getModeDisplayName(job.mode)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full whitespace-nowrap">
                  {getModelDisplayName(job.modelKey)}
                </div>
              </div>

              {job.status === 'processing' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Generating image...</span>
                    <span className="font-medium text-blue-600">{job.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${job.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {job.status === 'failed' && job.errorMessage && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-red-700">
                      {job.errorMessage.length > 120 
                        ? job.errorMessage.substring(0, 120) + '...'
                        : job.errorMessage
                      }
                    </div>
                  </div>
                </div>
              )}

              {job.status === 'completed' && job.resultThumbUrl && (
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-center">
                  <div className="relative group">
                    <img 
                      src={job.resultThumbUrl}
                      alt="Generated result"
                      className="h-24 w-24 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-300 transition-colors"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {jobs.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent">
          <div className="p-4 text-center border-t border-gray-100">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              {jobs.filter(j => j.status === 'pending' || j.status === 'processing').length} active jobs • Max 4 concurrent
            </div>
          </div>
        </div>
      )}
    </div>
  );
}