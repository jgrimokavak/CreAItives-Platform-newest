const ImageUpscaleIcon = ({ className = "", size = 24 }) => {
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
      <path d="M6 6h5v5" />
      <path d="M16 6l-5 5" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h7" />
      <path d="M14 21h7" />
      <path d="M14 14v7" />
      <path d="M21 14v7" />
    </svg>
  );
};

export default ImageUpscaleIcon;