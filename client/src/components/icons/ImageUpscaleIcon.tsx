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
      {/* Arrow in top right */}
      <path d="M7 7h5v5" />
      <path d="M17 7l-5 5" />
      
      {/* Image box */}
      <rect x="3" y="14" width="7" height="7" rx="1" />
      
      {/* Bottom right corner */}
      <path d="M14 14h7" />
      <path d="M14 21h7" />
      <path d="M14 14v7" />
      <path d="M21 14v7" />
    </svg>
  );
};

export default ImageUpscaleIcon;