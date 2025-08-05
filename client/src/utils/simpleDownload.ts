/**
 * Simple download utility for desktop-first experience
 * This bypasses mobile-specific features like Web Share API
 */

export async function simpleDownloadImage(
  imageUrl: string,
  filename: string = 'image.png'
): Promise<void> {
  try {
    let url: string;
    let shouldRevoke = false;

    // Handle data URLs directly
    if (imageUrl.startsWith('data:')) {
      url = imageUrl;
    } else {
      // Fetch and create blob URL for better compatibility
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      url = window.URL.createObjectURL(blob);
      shouldRevoke = true;
    }

    // Create download link
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    if (shouldRevoke) {
      // Small delay before revoking to ensure download starts
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    }
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}