// WebSocket client for real-time communication
let socket: WebSocket | null = null;
let reconnectInterval: number | null = null;
let eventListeners: { [key: string]: Function[] } = {};

// Function to initialize the WebSocket connection
export const initializeWebSocket = () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
    return;
  }

  // For better compatibility, especially during development
  const host = window.location.hostname;
  const port = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${host}:${port}/ws`;
  
  console.log('Connecting to WebSocket at:', wsUrl);
  
  try {
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connection established');
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
      
      // Trigger all open event listeners
      triggerEvent('open');
    };
    
    socket.onclose = (event) => {
      console.log('WebSocket connection closed', event);
      triggerEvent('close', event);
      
      // Attempt to reconnect
      if (!reconnectInterval) {
        reconnectInterval = window.setInterval(() => {
          console.log('Attempting to reconnect WebSocket...');
          initializeWebSocket();
        }, 5000); // Try to reconnect every 5 seconds
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      triggerEvent('error', error);
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Handle different types of messages
        if (data.type) {
          triggerEvent(data.type, data);
        }
        // Also trigger a generic message event
        triggerEvent('message', data);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    
    // Attempt to reconnect
    if (!reconnectInterval) {
      reconnectInterval = window.setInterval(() => {
        console.log('Attempting to reconnect WebSocket...');
        initializeWebSocket();
      }, 5000);
    }
  }
};

// Function to send a message through the WebSocket
export const sendMessage = (type: string, data: any) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.error('WebSocket is not connected');
    return false;
  }
  
  try {
    const message = JSON.stringify({
      type,
      ...data
    });
    
    socket.send(message);
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
};

// Function to add event listeners
export const addEventListener = (eventType: string, callback: Function) => {
  if (!eventListeners[eventType]) {
    eventListeners[eventType] = [];
  }
  
  eventListeners[eventType].push(callback);
  
  return () => {
    removeEventListener(eventType, callback);
  };
};

// Function to remove event listeners
export const removeEventListener = (eventType: string, callback: Function) => {
  if (!eventListeners[eventType]) return;
  
  eventListeners[eventType] = eventListeners[eventType].filter(
    listener => listener !== callback
  );
};

// Function to trigger events
const triggerEvent = (eventType: string, data?: any) => {
  if (!eventListeners[eventType]) return;
  
  eventListeners[eventType].forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      console.error(`Error in ${eventType} event listener:`, error);
    }
  });
};

// Function to close the WebSocket connection
export const closeWebSocket = () => {
  if (!socket) return;
  
  socket.close();
  socket = null;
  
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }
  
  // Reset event listeners
  eventListeners = {};
};

// Call types for voice/video calls
export const CallType = {
  AUDIO: 'audio',
  VIDEO: 'video'
};

// Call direction types
export const CallDirection = {
  INCOMING: 'incoming',
  OUTGOING: 'outgoing'
};

// Call status types
export const CallStatus = {
  RINGING: 'ringing',
  ONGOING: 'ongoing',
  ENDED: 'ended',
  MISSED: 'missed',
  REJECTED: 'rejected'
};

// Initialize WebSocket connection when this module is imported
if (typeof window !== 'undefined') {
  // Only initialize in browser environment
  window.addEventListener('load', () => {
    initializeWebSocket();
  });
  
  // Reconnect when the window regains focus
  window.addEventListener('focus', () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      initializeWebSocket();
    }
  });
}

export default {
  initializeWebSocket,
  sendMessage,
  addEventListener,
  removeEventListener,
  closeWebSocket,
  CallType,
  CallDirection,
  CallStatus
};