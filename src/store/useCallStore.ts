
import {create} from 'zustand';
import {CallSession, CallStatus, ChatMessage, User} from '@customtypes/index';
import {MediaStream} from 'react-native-webrtc';
import { CallConnectionState } from '@hooks/useCallConnection'; // Import the connection state type
import Logger from '@utils/logger';

interface CallState {
  currentCall: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  chatMessages: ChatMessage[];
  
  isMuted: boolean; // Reflects desired state for local audio
  isVideoEnabled: boolean; // Reflects desired state for local video
  
  connectionState: CallConnectionState; // WebRTC peer connection state
  connectedUsers: User[]; // List of users in the current call session

  // Actions
  initiateCall: (callSession: CallSession, localUserStream?: MediaStream) => void;
  answerCall: (callSessionId: string) => void;
  declineCall: (callSessionId: string) => void;
  endCall: (callSessionId: string) => void;
  updateCallStatus: (callSessionId: string, status: CallStatus) => void;

  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  clearStreams: () => void;

  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: (callSessionId: string) => void;

  setMuted: (muted: boolean) => void; // Directly set mute state
  setVideoEnabled: (enabled: boolean) => void; // Directly set video state

  setConnectionState: (state: CallConnectionState) => void;
  addConnectedUser: (user: User) => void;
  removeConnectedUser: (userId: string) => void;
  setConnectedUsers: (users: User[]) => void;
  clearConnectedUsers: () => void;
}

export const useCallStore = create<CallState>()((set, get) => ({
  currentCall: null,
  localStream: null,
  remoteStream: null,
  chatMessages: [],
  isMuted: false,
  isVideoEnabled: true,
  connectionState: 'new', 
  connectedUsers: [],

  initiateCall: (callSession, localUserStream) => {
    Logger.info('CallStore: Initiating call', { callId: callSession.id });
    // If local stream is already available (e.g., pre-acquired), set it
    if (localUserStream) {
      get().localStream?.getTracks().forEach(track => track.stop()); // Stop any old tracks
      get().localStream?.release();
    }
    set({
      currentCall: {...callSession, status: CallStatus.DIALING},
      chatMessages: [],
      isMuted: false,
      isVideoEnabled: true,
      connectionState: 'new',
      connectedUsers: callSession.caller ? [callSession.caller] : [], // Start with the caller
      localStream: localUserStream || null,
    });
  },

  answerCall: callSessionId => {
    const currentCall = get().currentCall;
    if (currentCall && currentCall.id === callSessionId) {
      Logger.info('CallStore: Answering call', { callId: callSessionId });
      set({currentCall: {...currentCall, status: CallStatus.ACTIVE}, connectionState: 'connecting'});
    }
  },

  declineCall: callSessionId => {
    const currentCall = get().currentCall;
    if (currentCall && currentCall.id === callSessionId) {
      Logger.info('CallStore: Declining call', { callId: callSessionId });
      get().clearStreams(); // Ensure streams are cleared
      set({
        currentCall: {...currentCall, status: CallStatus.ENDED, endTime: Date.now()},
        localStream: null, 
        remoteStream: null,
        connectionState: 'closed',
        chatMessages: [],
        connectedUsers: [],
      });
    }
  },

  endCall: callSessionId => {
    const currentCall = get().currentCall;
    if (currentCall && currentCall.id === callSessionId && currentCall.status !== CallStatus.ENDED) {
      Logger.info('CallStore: Ending call', { callId: callSessionId });
      get().clearStreams();
      set({
        currentCall: {...currentCall, status: CallStatus.ENDED, endTime: Date.now()},
        localStream: null,
        remoteStream: null,
        connectionState: 'closed',
        // chatMessages: [], // Decide whether to clear chat on call end
        connectedUsers: [],
      });
    }
  },

  updateCallStatus: (callSessionId, status) => {
    const currentCall = get().currentCall;
    if (currentCall && currentCall.id === callSessionId) {
      Logger.debug(`CallStore: Updating call status to ${status}`, { callId: callSessionId });
      set({currentCall: {...currentCall, status}});
      if (status === CallStatus.ENDED || status === CallStatus.FAILED) {
        get().clearStreams();
        set({ connectionState: status === CallStatus.FAILED ? 'failed' : 'closed', connectedUsers: [] });
      }
    }
  },

  setLocalStream: stream => {
    get().localStream?.getTracks().forEach(track => track.stop());
    get().localStream?.release();
    set({localStream: stream});
  },
  setRemoteStream: stream => {
    get().remoteStream?.getTracks().forEach(track => track.stop());
    get().remoteStream?.release();
    set({remoteStream: stream});
  },
  clearStreams: () => {
    Logger.debug('CallStore: Clearing local and remote streams.');
    get().localStream?.getTracks().forEach(track => track.stop());
    get().localStream?.release();
    get().remoteStream?.getTracks().forEach(track => track.stop());
    get().remoteStream?.release();
    set({ localStream: null, remoteStream: null });
  },

  addChatMessage: message => {
    set(state => ({chatMessages: [...state.chatMessages, message]}));
  },
  clearChatMessages: callSessionId => {
    const currentCall = get().currentCall;
    if (currentCall && currentCall.id === callSessionId) {
      set({chatMessages: []});
    }
  },

  setMuted: (muted) => {
    // This action updates the desired state. Actual track manipulation is in RTCService/CallScreen.
    set({isMuted: muted});
  },
  setVideoEnabled: (enabled) => {
    // This action updates the desired state.
    set({isVideoEnabled: enabled});
  },

  setConnectionState: (state) => {
    Logger.debug(`CallStore: Setting WebRTC connection state to ${state}`);
    set({connectionState: state});
    if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        // If connection fails or closes, and call was active, mark call as ended/failed
        const call = get().currentCall;
        if (call && (call.status === CallStatus.ACTIVE || call.status === CallStatus.DIALING || call.status === CallStatus.RINGING)) {
           get().updateCallStatus(call.id, state === 'failed' ? CallStatus.FAILED : CallStatus.ENDED);
        }
    }
  },
  addConnectedUser: (user) => {
    set(state => {
      if (!state.connectedUsers.find(u => u.id === user.id)) {
        Logger.info(`CallStore: Adding user to connected list: ${user.name}`);
        return {connectedUsers: [...state.connectedUsers, user]};
      }
      return {}; // No change
    });
  },
  removeConnectedUser: (userId) => {
    set(state => {
      const userExists = state.connectedUsers.find(u => u.id === userId);
      if (userExists) {
          Logger.info(`CallStore: Removing user from connected list: ${userId}`);
          return {connectedUsers: state.connectedUsers.filter(u => u.id !== userId)};
      }
      return {};
    });
  },
  setConnectedUsers: (users) => {
    Logger.debug('CallStore: Setting connected users list', { count: users.length });
    set({connectedUsers: users});
  },
  clearConnectedUsers: () => {
    Logger.debug('CallStore: Clearing connected users list.');
    set({connectedUsers: []});
  }
}));
