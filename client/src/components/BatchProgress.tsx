import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Download, AlertCircle, CheckCircle, Clock, Square, Plus, FileWarning } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BatchProgressProps {
  jobId: string;
  onComplete?: () => void;
  onReset?: () => void;
}

interface BatchStatus {
  total: number;
  done: number;
  failed: number;
  percent: number;
  status?: "pending" | "processing" | "completed" | "stopped" | "failed";
  zipUrl: string | null;
  message?: string;
}

const BatchProgress: React.FC<BatchProgressProps> = ({ jobId, onComplete, onReset }) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState<boolean>(true);
  
  // Poll for job status
  useEffect(() => {
    if (!jobId || !polling) return;
    
    const fetchStatus = async () => {
      console.log(`Polling batch job status for job ID: ${jobId}`);
      try {
        const response = await fetch(`/api/batch/${jobId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Error response from batch status API:`, errorData);
          throw new Error(errorData.error || 'Failed to fetch batch job status');
        }
        
        const data = await response.json();
        console.log(`Batch job status:`, data);
        setStatus(data);
        
        // If the job is complete (has a ZIP URL), stop polling
        if (data.zipUrl) {
          console.log(`Batch job ${jobId} completed with ZIP URL: ${data.zipUrl}`);
          setPolling(false);
          if (onComplete) {
            console.log(`Calling onComplete callback`);
            onComplete();
          }
          
          // Show success toast
          toast({
            title: "Batch job completed",
            description: `Generated ${data.done} car images${data.failed > 0 ? `, ${data.failed} images failed` : ''}`,
            variant: "default"
          });
        }
        
        // If all images are done or failed, stop polling
        if (data && data.done + data.failed >= data.total) {
          console.log(`All images processed (${data.done} done, ${data.failed} failed). Stopping polling.`);
          setPolling(false);
        }
      } catch (error) {
        console.error('Error fetching batch status:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setPolling(false);
      }
    };
    
    // Immediately fetch status once
    fetchStatus();
    
    // Set up polling every 2 seconds
    const intervalId = setInterval(fetchStatus, 2000);
    
    return () => clearInterval(intervalId);
  }, [jobId, polling, onComplete, toast]);
  
  // Function to stop the batch job
  const handleStopBatch = async () => {
    if (!jobId) return;
    
    try {
      console.log(`Stopping batch job ${jobId}`);
      const response = await fetch(`/api/batch/${jobId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Error stopping batch job:`, errorData);
        toast({
          title: "Error",
          description: errorData.error || "Failed to stop batch job",
          variant: "destructive"
        });
        return;
      }
      
      const data = await response.json();
      console.log(`Batch job stop response:`, data);
      
      // Update status
      setStatus(prev => ({ ...prev, ...data }));
      
      // Show success toast
      toast({
        title: "Creating download file",
        description: "Preparing a ZIP file with all generated images. The download button will appear when ready.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error stopping batch job:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to stop batch job",
        variant: "destructive"
      });
    }
  };
  
  // Determine the status text and icon
  const getStatusInfo = () => {
    if (!status) return { text: 'Initializing...', icon: <Clock className="h-5 w-5 text-muted-foreground" /> };
    
    if (status.zipUrl) {
      if (status.status === "completed") {
        return { 
          text: `Complete - ${status.done} images ready to download`, 
          icon: <CheckCircle className="h-5 w-5 text-green-500" /> 
        };
      } else if (status.status === "stopped") {
        return { 
          text: `Partial result - ${status.done} of ${status.total} images ready`, 
          icon: <AlertCircle className="h-5 w-5 text-amber-500" /> 
        };
      } else if (status.status === "failed") {
        return { 
          text: `Completed with issues - ${status.done} images ready`, 
          icon: <AlertCircle className="h-5 w-5 text-red-500" /> 
        };
      }
    }
    
    if (status.status === "stopped") {
      return {
        text: `Preparing download... Creating ZIP with ${status.done} images`,
        icon: <Clock className="h-5 w-5 text-amber-500" />
      };
    }
    
    if (status.failed > 0) {
      return {
        text: `Processing: ${status.done} complete, ${status.failed} failed`,
        icon: <AlertCircle className="h-5 w-5 text-amber-500" />
      };
    }
    
    return {
      text: `Processing: ${status.done} of ${status.total} images complete`,
      icon: <Clock className="h-5 w-5 text-blue-500" />
    };
  };
  
  const statusInfo = getStatusInfo();
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {statusInfo.icon}
          Batch Car Generation
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>Status: <span className="font-medium">{status?.status || "Initializing"}</span></span>
          {status?.percent !== undefined && (
            <span className="text-sm font-medium bg-primary/10 px-2 py-0.5 rounded-full">
              {status.percent}% Complete
            </span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error ? (
          <div className="bg-red-50 p-4 rounded-md text-red-700 text-sm">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error fetching job status</p>
                <p className="mt-1">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="text-sm font-medium">
                {statusInfo.text}
              </div>
              <Progress value={status?.percent || 0} className="h-3" />
            </div>
            
            {status && (
              <div className="grid grid-cols-3 gap-3 text-center mt-4">
                <div className="bg-muted rounded-md p-3">
                  <div className="text-2xl font-medium">{status.total}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total</div>
                </div>
                <div className="bg-green-50 rounded-md p-3 border border-green-100">
                  <div className="text-2xl font-medium text-green-700">{status.done}</div>
                  <div className="text-xs text-green-600 mt-1">Completed</div>
                </div>
                <div className="bg-red-50 rounded-md p-3 border border-red-100">
                  <div className="text-2xl font-medium text-red-700">{status.failed}</div>
                  <div className="text-xs text-red-600 mt-1">Failed</div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-3 flex-wrap pt-2">
        {/* Only show buttons when ZIP is ready or job is in progress */}
        {status?.zipUrl ? (
          <>
            {/* Primary action: Download when available */}
            <Button 
              className="flex-1 px-4 py-2 h-auto"
              size="lg"
              onClick={() => window.open(status.zipUrl || '', '_blank')}
            >
              <Download className="h-5 w-5 mr-2" />
              Download Images (ZIP)
            </Button>
            
            {/* View Errors button - show when there are errors and batch has finished */}
            {status.failed > 0 && (
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => window.open(`${status.zipUrl?.replace('.zip', '')}/failed_rows.json`, '_blank')}
              >
                <FileWarning className="h-4 w-4 mr-2" />
                View Error Details
              </Button>
            )}
            
            {/* Start New Batch button - only show when ZIP is ready */}
            {onReset && (
              <Button 
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={onReset}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Batch
              </Button>
            )}
          </>
        ) : (
          <>
            {/* Show Stop Batch button only when job is in progress */}
            {status && status.status === "processing" && (
              <Button 
                variant="destructive" 
                className="flex-1 px-4 py-2 h-auto"
                size="lg"
                onClick={handleStopBatch}
              >
                <Square className="h-5 w-5 mr-2" />
                Stop & Save Progress
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default BatchProgress;