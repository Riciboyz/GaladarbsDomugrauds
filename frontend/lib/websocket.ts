import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

class WebSocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth-token');
    }
  }

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(WS_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    // Authenticate if we have a token
    if (this.token) {
      this.authenticate(this.token);
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  authenticate(token: string) {
    this.token = token;
    if (this.socket) {
      this.socket.emit('authenticate', token);
    }
  }

  joinGroup(groupId: string) {
    if (this.socket) {
      this.socket.emit('join_group', groupId);
    }
  }

  leaveGroup(groupId: string) {
    if (this.socket) {
      this.socket.emit('leave_group', groupId);
    }
  }

  createThread(thread: any, groupId?: string) {
    if (this.socket) {
      this.socket.emit('new_thread', { thread, groupId });
    }
  }

  updateThread(thread: any, groupId?: string) {
    if (this.socket) {
      this.socket.emit('thread_updated', { thread, groupId });
    }
  }

  sendNotification(notification: any) {
    if (this.socket) {
      this.socket.emit('new_notification', notification);
    }
  }

  startTyping(groupId: string, userId: string) {
    if (this.socket) {
      this.socket.emit('typing_start', { groupId, userId });
    }
  }

  stopTyping(groupId: string, userId: string) {
    if (this.socket) {
      this.socket.emit('typing_stop', { groupId, userId });
    }
  }

  // Event listeners
  onThreadCreated(callback: (thread: any) => void) {
    if (this.socket) {
      this.socket.on('thread_created', callback);
    }
  }

  onThreadUpdated(callback: (thread: any) => void) {
    if (this.socket) {
      this.socket.on('thread_updated', callback);
    }
  }

  onThreadDeleted(callback: (data: { threadId: string }) => void) {
    if (this.socket) {
      this.socket.on('thread_deleted', callback);
    }
  }

  onNotificationReceived(callback: (notification: any) => void) {
    if (this.socket) {
      this.socket.on('notification_received', callback);
    }
  }

  onUserTyping(callback: (data: { userId: string; isTyping: boolean }) => void) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  onConnect(callback: () => void) {
    if (this.socket) {
      this.socket.on('connect', callback);
    }
  }

  onDisconnect(callback: () => void) {
    if (this.socket) {
      this.socket.on('disconnect', callback);
    }
  }

  // Remove event listeners
  offThreadCreated(callback?: (thread: any) => void) {
    if (this.socket) {
      this.socket.off('thread_created', callback);
    }
  }

  offThreadUpdated(callback?: (thread: any) => void) {
    if (this.socket) {
      this.socket.off('thread_updated', callback);
    }
  }

  offThreadDeleted(callback?: (data: { threadId: string }) => void) {
    if (this.socket) {
      this.socket.off('thread_deleted', callback);
    }
  }

  offNotificationReceived(callback?: (notification: any) => void) {
    if (this.socket) {
      this.socket.off('notification_received', callback);
    }
  }

  offUserTyping(callback?: (data: { userId: string; isTyping: boolean }) => void) {
    if (this.socket) {
      this.socket.off('user_typing', callback);
    }
  }

  offConnect(callback?: () => void) {
    if (this.socket) {
      this.socket.off('connect', callback);
    }
  }

  offDisconnect(callback?: () => void) {
    if (this.socket) {
      this.socket.off('disconnect', callback);
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Create singleton instance
const wsClient = new WebSocketClient();

export default wsClient;
