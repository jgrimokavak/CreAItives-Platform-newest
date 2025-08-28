import { useEffect, useRef } from 'react';
import { queryClient } from './queryClient';

/**
 * Create a WebSocket connection
 * Uses proper URL format based on environment
 */
export function setupWebSocket(onMessage: (ev: string, data: any) => void): WebSocket {
  try {
    // Create proper WebSocket URL based on environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    const wsUrl = `${protocol}//${hostname}${port}/ws`;
    
    console.log('[MP][CLIENT] WS URL', { protocol, hostname, port, url: wsUrl });
    
    // Create the socket with proper error handling
    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
    } catch (wsError) {
      console.warn('WebSocket initialization error:', wsError);
      return createDummySocket();
    }
    
    socket.onopen = () => {
      console.log('WebSocket connected');
    };
    
    socket.onerror = (error) => {
      console.warn('WebSocket error event:', error);
    };
    
    socket.onmessage = (event) => {
      try {
        const { ev, data } = JSON.parse(event.data);
        onMessage(ev, data);
      } catch (error) {
        console.warn('Error parsing WebSocket message:', error);
      }
    };
    
    return socket;
  } catch (error) {
    console.warn('Failed to set up WebSocket:', error);
    return createDummySocket();
  }
}

// Helper function to create a dummy WebSocket object for graceful degradation
function createDummySocket(): WebSocket {
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
    console.log('[TRACE] WebSocket received event:', ev, 'with data:', data);
    switch (ev) {
      case 'imageCreated':
        console.log('[TRACE] Processing imageCreated event, dispatching gallery-updated');
        // Invalidate gallery queries when new images are created
        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
        // Dispatch custom event for components listening for gallery updates
        const createEvent = new CustomEvent('gallery-updated', { detail: { type: 'created', data } });
        console.log('[TRACE] Dispatching gallery-updated event:', createEvent.detail);
        window.dispatchEvent(createEvent);
        break;
        
      case 'imageUpdated':
        // Invalidate gallery queries when images are updated (starred, trashed)
        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
        // Dispatch custom event for components listening for gallery updates
        window.dispatchEvent(new CustomEvent('gallery-updated', { detail: { type: 'updated', data } }));
        break;
        
      case 'imageDeleted':
        // Invalidate gallery queries when images are deleted
        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
        // Dispatch custom event for components listening for gallery updates
        window.dispatchEvent(new CustomEvent('gallery-updated', { detail: { type: 'deleted', data } }));
        break;
        
      case 'gallery-updated':
        // Invalidate gallery queries when the gallery is updated
        queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
        break;
        
      case 'jobCreated':
      case 'jobUpdated':
        // Dispatch job events for JobsTray component
        console.log(`[TRACE] Processing ${ev} event, dispatching ws-message`);
        window.dispatchEvent(new CustomEvent('ws-message', { detail: { type: ev, data } }));
        break;
        
      case 'marketplaceBatchCreated':
      case 'marketplaceJobUpdated': 
      case 'marketplaceBatchCompleted':
        // Dispatch marketplace events for Car Marketplace component
        console.log(`[MP] ws event`, ev, `batchId:`, data.batchId);
        window.dispatchEvent(new CustomEvent('ws-message', { detail: { type: ev, data } }));
        break;
        
      default:
        console.log(`[TRACE] Unknown WebSocket event: ${ev}, with payload:`, data);
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
          
          reconnectTimeoutRef.current = setTimeout(() => {
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