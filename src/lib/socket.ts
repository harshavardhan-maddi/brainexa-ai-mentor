import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api-config';

// Socket server URLs. Can be configured via `VITE_SOCKET_URL` or derived from `API_BASE_URL`.
const SOCKET_URLS = [import.meta.env.VITE_SOCKET_URL || API_BASE_URL];


class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  // Initialize socket connection
  connect(userData: { name: string; email: string }) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    // Try multiple endpoints until one connects
    const tryConnect = (urls: string[], idx = 0) => {
      const url = urls[idx];
      console.log('Attempting socket connection to', url);
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect_error', (err) => {
        console.error('Connection error to', url, err?.message || err);
        // try next url
        if (idx + 1 < urls.length) {
          tryConnect(urls, idx + 1);
        }
      });

      // If connected, clear any previous handlers (handled below)
      this.socket.on('connect', () => {
        console.log('Connected to realtime server at', url);
      });
    };

    tryConnect(SOCKET_URLS);

    this.socket.on('connect', () => {
      console.log('🟢 Connected to realtime server');
      this.socket?.emit('join', userData);
      
      // Re-attach all listeners to the new socket instance
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.socket?.on(event, callback);
        });
      });
    });

    this.socket.on('disconnect', () => {
      console.log('🔴 Disconnected from realtime server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return this.socket;
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Get socket instance
  getSocket() {
    return this.socket;
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected ?? false;
  }

  // Emit event
  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }

  // Subscribe to events
  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    
    if (this.socket) {
      this.socket.on(event, callback);
      
      // If we're already connected and registering a connect listener, fire it immediately
      if (event === 'connect' && this.socket.connected) {
        callback();
      }
    }
  }

  // Unsubscribe from events
  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      this.socket?.off(event, callback);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }

  // Chat methods
  sendMessage(message: { role: string; content: string; userName: string }) {
    this.socket?.emit('send_message', message);
  }

  sendToAI(message: { role: string; content: string; userName: string; userId?: string; history?: any[]; context?: any }) {
    this.socket?.emit('ai_chat', message);
  }

  // Typing indicator
  sendTyping(userName: string, isTyping: boolean) {
    this.socket?.emit('typing', { userName, isTyping });
  }

  // Quiz results
  shareQuizResult(result: any) {
    this.socket?.emit('quiz_completed', result);
  }

  // Study plan
  shareStudyPlan(plan: any) {
    this.socket?.emit('study_plan_update', plan);
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;

