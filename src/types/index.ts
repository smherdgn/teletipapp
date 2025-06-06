
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'doctor' | 'patient';
  // Add other user-specific fields
}

export enum CallStatus {
  IDLE = 'idle',
  DIALING = 'dialing',
  RINGING = 'ringing',
  ACTIVE = 'active',
  ENDED = 'ended',
  FAILED = 'failed',
}

export interface CallSession {
  id: string;
  caller: User;
  callee: User;
  status: CallStatus;
  startTime?: number; // Timestamp
  endTime?: number;   // Timestamp
  roomId?: string;    // For WebRTC signaling
}

export interface ChatMessage {
  id: string;
  callId: string; // Link message to a call session
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number; // Timestamp
  isLocalUser?: boolean;
}

export interface ReportDocument {
  uri: string;
  name: string;
  type: string; // e.g., 'application/pdf'
  size?: number;
}

export interface ConsentDetails {
  cameraAccess: boolean;
  microphoneAccess: boolean;
  dataTransmission: boolean;
  medicalDataProcessing: boolean;
  // Add any other specific consent items here
}

// Add more shared types as needed