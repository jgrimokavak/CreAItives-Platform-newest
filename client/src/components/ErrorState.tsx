import { FaExclamationCircle } from "react-icons/fa";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message: string;
  onDismiss: () => void;
}

export default function ErrorState({ message, onDismiss }: ErrorStateProps) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-8">
      <div className="flex">
        <div className="flex-shrink-0 mr-3">
          <FaExclamationCircle className="text-red-500" />
        </div>
        <div>
          <h3 className="font-medium">Error generating images</h3>
          <p className="text-sm mt-1">
            {message || "Please check your prompt and try again. If the problem persists, try again later."}
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={onDismiss}
            className="text-sm font-medium underline mt-2 p-0 h-auto"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
