import React from "react";

// Custom ImageUpscale icon component
export const ImageUpscale = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Frame/Border */}
      <rect x="3" y="3" width="18" height="18" rx="2" />
      
      {/* Image representation (mountain shape) */}
      <path d="M3 14l4-4 5 5" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      
      {/* Upscale arrows */}
      <polyline points="16 10 21 10 21 15" />
      <line x1="21" y1="10" x2="17" y2="14" />
    </svg>
  );
};

export default ImageUpscale;