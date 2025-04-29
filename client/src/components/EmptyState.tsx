import { FaImage } from "react-icons/fa";

export default function EmptyState() {
  return (
    <div className="text-center py-16 bg-muted rounded-lg border border-gray-200">
      <div className="mb-4 text-accent">
        <FaImage className="text-5xl mx-auto" />
      </div>
      <h3 className="text-xl font-medium mb-2">No images generated yet</h3>
      <p className="text-accent max-w-md mx-auto mb-6">
        Enter a prompt above and click "Generate Images" to create AI-generated images
      </p>
    </div>
  );
}
