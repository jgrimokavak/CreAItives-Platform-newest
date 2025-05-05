import { FaImage } from "react-icons/fa";
import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-muted border-t border-gray-200 py-6 mt-auto">
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
              Multi-model image generation platform
            </p>
          </div>
          
          {/* Kavak Logo */}
          <div className="mb-4 md:mb-0 flex items-center">
            <img 
              src="/images/kavak-logo.png" 
              alt="Kavak" 
              className="h-8" 
            />
          </div>
          
          {/* Navigation Links */}
          <div className="flex space-x-4">
            <Link to="/" className="text-accent hover:text-primary transition-colors">
              <span className="text-sm">Home</span>
            </Link>
            <Link to="/gallery" className="text-accent hover:text-primary transition-colors">
              <span className="text-sm">Gallery</span>
            </Link>
            <Link to="/trash" className="text-accent hover:text-primary transition-colors">
              <span className="text-sm">Trash</span>
            </Link>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200 text-center text-xs text-accent">
          <p>© {new Date().getFullYear()} AI Image Generator. All images are stored locally.</p>
        </div>
      </div>
    </footer>
  );
}
