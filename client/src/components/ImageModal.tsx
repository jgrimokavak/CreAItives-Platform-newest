import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export default function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add escape key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Add click outside handler
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (imageUrl) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      // Restore body scrolling when modal is closed
      document.body.style.overflow = 'auto';
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) {
    console.log("ImageModal: No image URL provided, not rendering modal");
    return null;
  }
  
  console.log("ImageModal: Rendering with image URL:", imageUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div 
        ref={modalRef}
        className="relative w-full h-full max-w-[90vw] max-h-[90vh] flex items-center justify-center p-4"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>
        
        <img 
          src={imageUrl} 
          alt="Full-size image preview" 
          className="max-w-full max-h-full object-contain"
        />
      </div>
    </div>
  );
}