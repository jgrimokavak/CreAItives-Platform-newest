import { useEffect, useRef } from 'react';
import { queryClient } from './queryClient';

// Function to create a WebSocket connection
const createWebSocket = (onMessage: (ev: string, data: any) => void): WebSocket => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
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
};

export function useWebSocket() {
  // Use a ref to track if the component is mounted
  const isMountedRef = useRef(true);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle WebSocket messages
  const handleMessage = (ev: string, data: any) => {
    switch (ev) {
      case 'imageCreated':
        // Invalidate gallery queries when new images are created
        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
        break;
        
      case 'imageUpdated':
        // Invalidate gallery queries when images are updated (starred, trashed)
        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
        break;
        
      case 'imageDeleted':
        // Invalidate gallery queries when images are deleted
        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
        break;
        
      default:
        console.log('Unknown WebSocket event:', ev, data);
    }
  };
  
  // Function to connect or reconnect WebSocket
  const connectWebSocket = () => {
    // Only connect if the component is still mounted
    if (!isMountedRef.current) return;
    
    // Close existing socket if it exists
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    // Create new socket
    socketRef.current = createWebSocket(handleMessage);
    
    // Set up reconnection logic
    socketRef.current.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      
      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Reconnect after 5 seconds if not a normal closure and component is mounted
      if (event.code !== 1000 && isMountedRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectWebSocket();
        }, 5000);
      }
    };
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