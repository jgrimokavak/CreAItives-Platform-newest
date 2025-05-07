import { AlertCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorState({ message, onDismiss }: ErrorStateProps) {
  return (
    <div className="bg-destructive/5 border border-destructive/20 text-destructive-foreground rounded-xl h-full flex items-center justify-center w-full">
      <div className="p-6 max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="bg-destructive/10 p-3 rounded-full mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          
          <h3 className="font-medium text-destructive mb-2">Image Generation Failed</h3>
          
          <p className="text-sm mb-5 text-destructive-foreground/90">
            {message || "Please check your prompt and try again. If the problem persists, try again later."}
          </p>
          
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              className="text-xs px-3 border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Try Again
            </Button>
            
            <Button
              variant="link"
              size="sm"
              onClick={onDismiss}
              className="text-xs text-destructive-foreground/70 hover:text-destructive-foreground"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
