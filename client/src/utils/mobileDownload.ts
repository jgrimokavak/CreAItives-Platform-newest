/**
 * Enhanced mobile download utilities with Web Share API and improved mobile experience
 */

export interface DownloadOptions {
  filename?: string;
  showToast?: boolean;
  fallbackToShare?: boolean;
}

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
}

class MobileDownloadManager {
  private readonly hasWebShare: boolean;
  private readonly hasFileSystemAccess: boolean;
  private readonly isMobile: boolean;
  private readonly isIOS: boolean;
  private readonly isAndroid: boolean;

  constructor() {
    this.hasWebShare = 'share' in navigator && 'canShare' in navigator;
    this.hasFileSystemAccess = 'showSaveFilePicker' in window;
    this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.isAndroid = /Android/.test(navigator.userAgent);
  }

  /**
   * Primary download method with intelligent fallbacks
   */
  async downloadImage(
    imageUrl: string, 
    options: DownloadOptions = {},
    shareOptions: ShareOptions = {}
  ): Promise<{ success: boolean; method: string; message: string }> {
    const { filename = 'image.png', showToast = true, fallbackToShare = true } = options;

    try {
      // Method 1: Try Web Share API for files (best mobile experience)
      if (this.hasWebShare && fallbackToShare) {
        const shareResult = await this.tryWebShareFile(imageUrl, filename, shareOptions);
        if (shareResult.success) {
          return shareResult;
        }
      }

      // Method 2: Try File System Access API (Chromium desktop/mobile)
      if (this.hasFileSystemAccess) {
        const fsResult = await this.tryFileSystemAccess(imageUrl, filename);
        if (fsResult.success) {
          return fsResult;
        }
      }

      // Method 3: Enhanced traditional download with mobile optimizations
      return await this.enhancedTraditionalDownload(imageUrl, filename);

    } catch (error) {
      console.error('Download failed:', error);
      return {
        success: false,
        method: 'error',
        message: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Web Share API with file sharing (best for mobile)
   */
  private async tryWebShareFile(
    imageUrl: string, 
    filename: string,
    shareOptions: ShareOptions
  ): Promise<{ success: boolean; method: string; message: string }> {
    try {
      // Fetch the image and create a File object
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type || 'image/png' });

      // Check if we can share files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: shareOptions.title || 'Download Image',
          text: shareOptions.text || 'Save this image to your gallery',
          ...shareOptions
        });

        return {
          success: true,
          method: 'web-share-file',
          message: 'Image shared successfully - save to gallery from your device\'s share menu'
        };
      }

      // Fallback to URL sharing if file sharing not supported
      if (navigator.share) {
        await navigator.share({
          title: shareOptions.title || 'Download Image',
          text: shareOptions.text || 'Save this image to your gallery',
          url: imageUrl,
          ...shareOptions
        });

        return {
          success: true,
          method: 'web-share-url',
          message: 'Image link shared - open and long-press to save to gallery'
        };
      }

      return { success: false, method: 'web-share-unavailable', message: '' };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, method: 'web-share-cancelled', message: 'Share cancelled by user' };
      }
      return { success: false, method: 'web-share-error', message: '' };
    }
  }

  /**
   * File System Access API (Chromium browsers)
   */
  private async tryFileSystemAccess(
    imageUrl: string, 
    filename: string
  ): Promise<{ success: boolean; method: string; message: string }> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Show save file picker
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'Images',
          accept: { 
            'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif']
          }
        }]
      });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      return {
        success: true,
        method: 'file-system-access',
        message: 'Image saved successfully to your chosen location'
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, method: 'file-system-cancelled', message: 'Save cancelled by user' };
      }
      return { success: false, method: 'file-system-error', message: '' };
    }
  }

  /**
   * Enhanced traditional download with mobile-specific optimizations
   */
  private async enhancedTraditionalDownload(
    imageUrl: string, 
    filename: string
  ): Promise<{ success: boolean; method: string; message: string }> {
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

      // Create download link with mobile-optimized attributes
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = filename;
      
      // Add mobile-specific attributes
      link.setAttribute('target', '_blank');
      if (this.isIOS) {
        // iOS Safari specific handling
        link.setAttribute('rel', 'noopener');
      }

      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      if (shouldRevoke) {
        // Small delay before revoking to ensure download starts
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      }

      // Return different messages based on platform
      let message = 'Image downloaded successfully';
      if (this.isIOS) {
        message = 'Image opened in new tab - long-press and select "Save to Photos" to add to gallery';
      } else if (this.isAndroid) {
        message = 'Image downloaded to Downloads folder - accessible from your gallery apps';
      }

      return {
        success: true,
        method: 'traditional-download',
        message
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user-friendly instructions for manual save
   */
  getManualSaveInstructions(): string {
    if (this.isIOS) {
      return "Long-press the image and select 'Save to Photos' to add it to your gallery";
    } else if (this.isAndroid) {
      return "Long-press the image and select 'Download image' - it will be saved to your Downloads folder and appear in gallery apps";
    }
    return "Right-click the image and select 'Save image as...' to download";
  }

  /**
   * Check what download methods are available
   */
  getAvailableMethods(): {
    webShare: boolean;
    fileSystemAccess: boolean;
    traditional: boolean;
    platform: string;
  } {
    return {
      webShare: this.hasWebShare,
      fileSystemAccess: this.hasFileSystemAccess,
      traditional: true,
      platform: this.isIOS ? 'ios' : this.isAndroid ? 'android' : 'desktop'
    };
  }
}

// Export singleton instance
export const mobileDownloadManager = new MobileDownloadManager();

// Convenience function for easy use
export async function downloadImageMobile(
  imageUrl: string,
  filename?: string,
  options?: DownloadOptions & ShareOptions
): Promise<{ success: boolean; method: string; message: string }> {
  const { title, text, url, ...downloadOptions } = options || {};
  const shareOptions = { title, text, url };
  
  return mobileDownloadManager.downloadImage(
    imageUrl, 
    { filename, ...downloadOptions },
    shareOptions
  );
}