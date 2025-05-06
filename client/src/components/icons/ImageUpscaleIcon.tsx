import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const ImageUpscaleIcon: React.FC<IconProps> = ({ className = "", size = 24 }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Top arrow */}
      <path d="M11 7h5v5" />
      <path d="M16 7L7 16" />
      
      {/* Empty square */}
      <rect x="3" y="13" width="8" height="8" rx="2" />
      
      {/* Bottom right diagonal lines */}
      <path d="M13 13h4" />
      <path d="M17 13v4" />
    </svg>
  );
};

export default ImageUpscaleIcon;