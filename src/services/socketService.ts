
import {io, Socket} from 'socket.io-client';
import {API_URL} from '@env'; 
import {useAuthStore} from '@store/useAuthStore';
import Logger from '@utils/logger';
import { CallSession, ChatMessage, User } from '@customtypes/index';
import { RTCSessionDescriptionInit, RTCIceCandidateInit } from './rtcService'; // Import from rtcService


// Define your expected server-to-client and client-to-server events
export interface ServerToClientEvents {
  connect: () => void;
  disconnect: (reason: Socket.DisconnectReason, description?: any) => void;
  connect_error: (err: Error & { data?: any }) => void; // Include data for auth errors
  reconnect_attempt: (attemptNumber: number) => void;
  reconnect_failed: () => void;

  // Custom app events
  'user-joined': (data: { userId: string; roomId: string; user: User }) => void; // Notified when a user joins the room
  'user-left': (data: { userId: string; roomId: string }) => void; // Notified when a user leaves
  'room-full': (data: { roomId: string }) => void;
  'join-room-failed': (data: { roomId: string; reason: string }) => void;

  'incoming-call': (data: { callSession: CallSession }) => void; // If using direct call model
  'call-accepted': (data: { callId: string; callee: User }) => void;
  'call-declined': (data: { callId: string; reason?: string }) => void;
  'call-ended': (data: { callId: string; reason?: string }) => void;
  
  'offer': (data: { sdp: RTCSessionDescriptionInit; callId: string; from: string }) => void;
  'answer': (data: { sdp: RTCSessionDescriptionInit; callId: string; from: string }) => void;
  'ice-candidate': (data: { candidate: RTCIceCandidateInit; callId: string; from: string }) => void;
  
  'chat-message': (message: ChatMessage) => void;
  'user-status-changed': (data: { userId: string; online: boolean, roomId?: string }) => void;
  'error-message': (data: { message: string; details?: any, code?: string }) => void;
}

export interface ClientToServerEvents {
  'join-room': (data: { roomId: string; userId: string }, callback?: (response: { success: boolean; error?: string, users?: User[] }) => void) => void;
  'leave-room': (data: { roomId: string; userId: string }) => void;

  // Signaling events - `to` is the target room/user, `from` is sender, `callId` is the room identifier
  'offer': (data: { sdp: RTCSessionDescriptionInit; callId: string; to: string; from: string }) => void;
  'answer': (data: { sdp: RTCSessionDescriptionInit; callId: string; to: string; from: string }) => void;
  'ice-candidate': (data: { candidate: RTCIceCandidateInit; callId: string; to: string; from: string }) => void;
  
  'end-call': (data: { callId: string, to: string }) => void; // `to` could be a room or specific user
  'chat-message': (data: ChatMessage & { roomId: string }) => void;
  
  // Direct call model (if not using room-based exclusively)
  'dial': (data: { callId: string, roomId: string, caller: User, callee: User }) => void;
  'accept-call': (data: { callId: string; callee: User }) => void;
  'decline-call': (data: { callId: string; reason?: string }) => void;
}


export class SocketService {
  private static instance: SocketService | null = null;
  public socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private readonly socketUrl: string;

  private constructor() {
    this.socketUrl = API_URL || 'http://localhost:3000'; // Fallback if env var is not set

    this.socket = io(this.socketUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000, // Increased delay
      reconnectionDelayMax: 10000,
      autoConnect: false,
      auth: (cb) => {
        const token = useAuthStore.getState().token;
        Logger.debug('SocketService: Auth callback invoked.', { hasToken: !!token });
        cb(token ? { token } : {}); // Server must validate this token
      },
    });

    this.setupCommonListeners();
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  private setupCommonListeners(): void {
    this.socket.on('connect', () => {
      Logger.info(`SocketService: Connected successfully. Socket ID: ${this.socket.id}`);
    });

    this.socket.on('disconnect', (reason, description) => {
      Logger.warn(`SocketService: Disconnected. Reason: ${reason}`, { description });
      if (reason === 'io server disconnect') {
        Logger.error('SocketService: Explicitly disconnected by server.', {description});
      }
    });

    this.socket.on('connect_error', (err) => {
      // Cast err to any to access potential custom 'data' property
      const errorData = (err as any).data;
      Logger.error(`SocketService: Connection Error - ${err.message}`, { name: err.name, data: errorData });
      
      if (errorData?.type === 'AuthError' || err.message.includes('Unauthorized')) {
         Logger.error('SocketService: Authentication error during connection. User might need to re-login.');
      }
    });
    
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      Logger.info(`SocketService: Reconnect attempt #${attemptNumber}`);
    });

    this.socket.on('reconnect_failed', () => {
      Logger.error('SocketService: All reconnection attempts failed. Socket remains disconnected.');
    });

    this.socket.on('error-message', (data) => {
        Logger.error(`SocketService: Server error received - "${data.message}" Code: ${data.code || 'N/A'}`, data.details);
    });
  }

  public connect(): void {
    if (this.socket.disconnected) { 
      Logger.info('SocketService: Attempting to connect...');
      this.socket.connect();
    } else if (this.socket.connected) {
      Logger.info('SocketService: Already connected.');
    } else {
      Logger.info('SocketService: Connection attempt in progress or socket in an intermediate state.');
    }
  }

  public disconnect(): void {
    if (this.socket.connected) {
      Logger.info('SocketService: Manually disconnecting...');
      this.socket.disconnect();
    }
  }

  public emit<Event extends keyof ClientToServerEvents>(
    event: Event,
    ...args: Parameters<ClientToServerEvents[Event]> 
  ): void {
    if (this.socket.connected) {
      Logger.debug(`SocketService: Emitting event "${String(event)}"`, { args });
      (this.socket.emit as any)(event, ...args);
    } else {
      Logger.warn(`SocketService: Cannot emit event "${String(event)}". Socket not connected.`);
    }
  }

  public on<Event extends keyof ServerToClientEvents>(
    event: Event,
    listener: ServerToClientEvents[Event],
  ): () => void { 
    Logger.debug(`SocketService: Registering listener for event "${String(event)}"`);
    this.socket.on(event, listener as any); // Cast listener to any
    return () => this.socket.off(event, listener as any); // Cast listener to any
  }

  public off<Event extends keyof ServerToClientEvents>(
    event: Event,
    listener?: ServerToClientEvents[Event], 
  ): void {
    Logger.debug(`SocketService: Unregistering listener for event "${String(event)}"`);
    if (listener) {
      this.socket.off(event, listener as any); // Cast listener to any
    } else {
      this.socket.off(event);
    }
  }

  public getSocketId(): string | undefined {
    return this.socket.id;
  }

  public isConnected(): boolean {
    return this.socket.connected;
  }
}
