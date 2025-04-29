import { FaImage } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-muted border-t border-gray-200 py-8 mt-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <FaImage className="text-white text-xs" />
              </div>
              <span className="font-medium">AI Image Generator</span>
            </div>
            <p className="text-sm text-accent mt-2">
              Powered by OpenAI's DALL-E Models
            </p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-accent hover:text-foreground transition-colors">
              <span className="text-sm">Documentation</span>
            </a>
            <a href="#" className="text-accent hover:text-foreground transition-colors">
              <span className="text-sm">Privacy Policy</span>
            </a>
            <a href="#" className="text-accent hover:text-foreground transition-colors">
              <span className="text-sm">Terms of Service</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
