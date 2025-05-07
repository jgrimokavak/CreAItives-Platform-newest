import { AlertCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorState({ message, onDismiss }: ErrorStateProps) {
  return (
    <div className="bg-destructive/5 border border-destructive/20 text-destructive-foreground p-5 rounded-xl mb-8">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          <div className="bg-destructive/10 p-2 rounded-full">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Image Generation Failed</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="h-7 w-7 rounded-full -mr-1 hover:bg-destructive/10 hover:text-destructive"
            >
              <XCircle className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
          
          <p className="text-sm mt-2 text-destructive-foreground/90">
            {message || "Please check your prompt and try again. If the problem persists, try again later."}
          </p>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              className="text-xs h-8 border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Try Again
            </Button>
            
            <Button
              variant="link"
              size="sm"
              onClick={onDismiss}
              className="text-xs text-destructive-foreground/70 hover:text-destructive-foreground h-8"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
