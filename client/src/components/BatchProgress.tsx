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
        title: "Batch job stopping",
        description: data.message || "The job will finish the current image and then create a ZIP with partial results.",
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
      return { 
        text: `Complete! ${status.done} images generated, ${status.failed} failed`, 
        icon: <CheckCircle className="h-5 w-5 text-green-500" /> 
      };
    }
    
    if (status.status === "stopped") {
      return {
        text: `Stopping... ${status.done} of ${status.total} images generated`,
        icon: <AlertCircle className="h-5 w-5 text-yellow-500" />
      };
    }
    
    if (status.failed > 0) {
      return {
        text: `In progress with errors: ${status.done} done, ${status.failed} failed`,
        icon: <AlertCircle className="h-5 w-5 text-yellow-500" />
      };
    }
    
    return {
      text: `Processing: ${status.done} of ${status.total} images generated`,
      icon: <Clock className="h-5 w-5 text-blue-500" />
    };
  };
  
  const statusInfo = getStatusInfo();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {statusInfo.icon}
          Batch Processing
        </CardTitle>
        <CardDescription>
          Job ID: {jobId}
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
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{statusInfo.text}</span>
                <span>{status ? `${status.percent}%` : '0%'}</span>
              </div>
              <Progress value={status?.percent || 0} className="h-2" />
            </div>
            
            {status && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted rounded-md p-2">
                  <div className="text-lg font-medium">{status.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="bg-green-50 rounded-md p-2">
                  <div className="text-lg font-medium text-green-700">{status.done}</div>
                  <div className="text-xs text-green-600">Completed</div>
                </div>
                <div className="bg-red-50 rounded-md p-2">
                  <div className="text-lg font-medium text-red-700">{status.failed}</div>
                  <div className="text-xs text-red-600">Failed</div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
      
      <CardFooter className="flex gap-2 flex-wrap">
        {status?.zipUrl && (
          <Button 
            className="flex-1"
            onClick={() => window.open(status.zipUrl || '', '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download ZIP
          </Button>
        )}
        
        {/* Show Stop Batch button when job is in progress */}
        {status && !status.zipUrl && status.status === "processing" && (
          <Button 
            variant="destructive" 
            className="flex-1"
            onClick={handleStopBatch}
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Batch
          </Button>
        )}
        
        {/* Start New Batch button */}
        {(status?.zipUrl || error || status?.status === "stopped" || status?.status === "failed") && onReset && (
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={onReset}
          >
            <Plus className="h-4 w-4 mr-2" />
            Start New Batch
          </Button>
        )}
        
        {/* View Errors button */}
        {status && status.failed > 0 && status.zipUrl && (
          <Button
            variant="outline"
            onClick={() => window.open(`${status.zipUrl?.replace('.zip', '')}/failed_rows.json`, '_blank')}
          >
            <FileWarning className="h-4 w-4 mr-2" />
            View Errors
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default BatchProgress;