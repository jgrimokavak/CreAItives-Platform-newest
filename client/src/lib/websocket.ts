import { useEffect, useRef } from 'react';
import { queryClient } from './queryClient';

/**
 * Create a WebSocket connection
 * Uses proper URL format based on environment
 */
export function setupWebSocket(onMessage: (ev: string, data: any) => void): WebSocket {
  try {
    // Create proper WebSocket URL based on environment
    const base = import.meta.env.DEV
      ? `ws://${window.location.hostname}:${import.meta.env.VITE_WS_PORT || window.location.port || 3000}`
      : window.location.origin.replace(/^http/, 'ws');
    
    const wsUrl = `${base}/ws`;
    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connected');
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onmessage = (event) => {
      try {
        const { ev, data } = JSON.parse(event.data);
        onMessage(ev, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    return socket;
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    // Create a dummy WebSocket for graceful degradation
    return {
      readyState: WebSocket.CLOSED,
      close: () => {},
      onclose: null,
      onerror: null,
      onmessage: null,
      onopen: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      send: () => {},
      binaryType: 'blob',
      bufferedAmount: 0,
      extensions: '',
      protocol: '',
      url: '',
      CONNECTING: WebSocket.CONNECTING,
      OPEN: WebSocket.OPEN,
      CLOSING: WebSocket.CLOSING,
      CLOSED: WebSocket.CLOSED
    } as unknown as WebSocket;
  }
}

/**
 * Hook to manage WebSocket connection
 * Handles connect/disconnect and reconnection logic
 */
export function useWebSocket() {
  // Use refs to track component lifecycle and socket state
  const isMountedRef = useRef(true);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);
  
  // Handle WebSocket messages
  const handleMessage = (ev: string, data: any) => {
    switch (ev) {
      case 'imageCreated':
        console.log('Image created:', data.image);
        // Invalidate gallery queries when new images are created
        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
        // Dispatch custom event for components listening for gallery updates
        window.dispatchEvent(new CustomEvent('gallery-updated', { detail: { type: 'created', data } }));
        break;
        
      case 'imageUpdated':
        console.log('Image updated:', data);
        // Invalidate gallery queries when images are updated (starred, trashed)
        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
        // Dispatch custom event for components listening for gallery updates
        window.dispatchEvent(new CustomEvent('gallery-updated', { detail: { type: 'updated', data } }));
        break;
        
      case 'imageDeleted':
        console.log('Image deleted:', data);
        // Invalidate gallery queries when images are deleted
        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
        // Dispatch custom event for components listening for gallery updates
        window.dispatchEvent(new CustomEvent('gallery-updated', { detail: { type: 'deleted', data } }));
        break;
        
      case 'gallery-updated':
        console.log('Gallery updated:', data);
        // Invalidate gallery queries when the gallery is updated
        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
        break;
        
      default:
        console.log('Unknown WebSocket event:', ev, data);
    }
  };
  
  // Function to connect or reconnect WebSocket with backoff
  const connectWebSocket = () => {
    // Only connect if the component is still mounted
    if (!isMountedRef.current) return;
    
    // Close existing socket if it exists
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Create new socket
    socketRef.current = setupWebSocket(handleMessage);
    
    const maxReconnectDelay =
     30000; // 30 seconds max
    
    // Set up reconnection logic with exponential backoff
    if (socketRef.current) {
      socketRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Reconnect with exponential backoff if not a normal closure and component is mounted
        if (event.code !== 1000 && isMountedRef.current) {
          // Calculate backoff delay (exponential with jitter)
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptRef.current) + Math.random() * 1000, 
            maxReconnectDelay
          );
          
          reconnectAttemptRef.current++; // Increment for next reconnect attempt
          
          console.log(`Reconnecting in ${Math.round(delay/1000)}s (attempt ${reconnectAttemptRef.current})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connectWebSocket();
          }, delay);
        }
      };
    }
  };
  
  useEffect(() => {
    // Connect when the component mounts
    connectWebSocket();
    
    // Cleanup function runs when component unmounts
    return () => {
      isMountedRef.current = false;
      
      // Clear any reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Close the socket if it exists
      if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || 
                               socketRef.current.readyState === WebSocket.CONNECTING)) {
        socketRef.current.close();
      }
    };
  }, []);
}