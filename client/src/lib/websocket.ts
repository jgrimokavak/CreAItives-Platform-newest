import { useEffect } from 'react';
import { queryClient } from './queryClient';

export function useWebSocket() {
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Connect to WebSocket without custom protocol
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connected');
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      
      // Reconnect after 5 seconds if the socket is closed
      if (event.code !== 1000) { // 1000 is normal closure
        setTimeout(() => {
          console.log('Attempting to reconnect...');
          useWebSocket(); // Recursively call this function to reconnect
        }, 5000);
      }
    };
    
    socket.onmessage = (event) => {
      try {
        const { ev, data } = JSON.parse(event.data);
        
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
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    // Clean up the WebSocket connection when the component unmounts
    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, []);
}