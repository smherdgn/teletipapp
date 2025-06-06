
import {useState, useEffect, useCallback, useMemo} from 'react';
import {RTCPeerConnection} from 'react-native-webrtc';
import Logger from '@utils/logger';
import { useCallStore } from '@store/useCallStore'; // Import Zustand store
import { User } from '@customtypes/index';
import { RTCPeerConnectionIceEvent, RTCTrackEvent } from '@services/rtcService'; // Import event types

// Standard WebRTC ICE connection states
export type WebRTCIceConnectionState =
  | 'new'
  | 'checking'
  | 'connected'
  | 'completed'
  | 'failed'
  | 'disconnected'
  | 'closed';

// Standard WebRTC Peer connection states
export type WebRTCPeerConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';


// This type should align with useCallStore's CallConnectionState
export type CallConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

interface UseCallConnectionReturn {
  connectionState: CallConnectionState;
  error: string | null;
  connectedPeers: string[];
  isMediaActive: boolean;
  resetConnectionStatesInStore: () => void;
}

export const useCallConnection = (peerConnection: RTCPeerConnection | null): UseCallConnectionReturn => {
  // Local error state specific to this hook's monitoring of PC events
  const [error, setError] = useState<string | null>(null);

  // Selectors for Zustand store state
  const storeConnectionState = useCallStore(state => state.connectionState);
  const connectedUsers = useCallStore(state => state.connectedUsers);
  const isMutedInStore = useCallStore(state => state.isMuted);
  const isVideoEnabledInStore = useCallStore(state => state.isVideoEnabled);

  // Selectors for Zustand store actions
  const zustandSetConnectionState = useCallStore(state => state.setConnectionState);
  const zustandClearStreams = useCallStore(state => state.clearStreams);
  const zustandClearConnectedUsers = useCallStore(state => state.clearConnectedUsers);
  const zustandSetMuted = useCallStore(state => state.setMuted);
  const zustandSetVideoEnabled = useCallStore(state => state.setVideoEnabled);


  const mapIceConnectionState = (newState: WebRTCIceConnectionState | undefined): CallConnectionState | null => {
    if (!newState) return null;
    switch (newState) {
      case 'new':
      case 'checking':
        return 'connecting';
      case 'connected':
      case 'completed':
        return 'connected';
      case 'disconnected':
        return 'disconnected';
      case 'failed':
        return 'failed';
      case 'closed':
        return 'closed';
      default:
        Logger.warn(`useCallConnection: Unhandled ICE connection state: ${newState}`);
        return null;
    }
  }

  const mapPeerConnectionState = (newState: WebRTCPeerConnectionState | undefined): CallConnectionState | null => {
    if (!newState) return null;
    switch (newState) {
        case 'new': return 'new';
        case 'connecting': return 'connecting';
        case 'connected': return 'connected';
        case 'disconnected': return 'disconnected';
        case 'failed': return 'failed';
        case 'closed': return 'closed';
        default:
            Logger.warn(`useCallConnection: Unhandled overall connection state: ${newState}`);
            return null;
    }
  }

  // This function updates the Zustand store and local error state
  const updateStoreAndErrorState = useCallback((newState: CallConnectionState | null, specificError?: string) => {
    if (newState) {
        zustandSetConnectionState(newState); // Update Zustand store

        if (newState === 'connected') setError(null);
        if (newState === 'failed') setError(specificError || 'Connection failed.');
        if (newState === 'disconnected') Logger.warn('useCallConnection: Connection is disconnected.');
        if (newState === 'closed') Logger.info('useCallConnection: Connection closed.');
    }
  }, [zustandSetConnectionState]);


  const handleIceConnectionStateChange = useCallback((event: Event) => {
    if (peerConnection) {
      const iceState = peerConnection.iceConnectionState as WebRTCIceConnectionState;
      Logger.debug(`useCallConnection: ICE Connection State Changed to ${iceState}`);
      const mappedState = mapIceConnectionState(iceState);
      updateStoreAndErrorState(mappedState, mappedState === 'failed' ? 'ICE connection failed.' : undefined);
    }
  }, [peerConnection, updateStoreAndErrorState]);

  const handleConnectionStateChange = useCallback((event: Event) => {
    if (peerConnection) {
        const overallState = peerConnection.connectionState as WebRTCPeerConnectionState;
        Logger.debug(`useCallConnection: Overall Connection State Changed to ${overallState}`);
        const mappedState = mapPeerConnectionState(overallState);
        updateStoreAndErrorState(mappedState, mappedState === 'failed' ? 'Peer connection failed.' : undefined);
    }
  }, [peerConnection, updateStoreAndErrorState]);


  useEffect(() => {
    if (!peerConnection) {
      updateStoreAndErrorState('closed'); // If PC is null, connection is effectively closed
      return;
    }

    // Initial state checks based on current PC states when peerConnection is provided/changes
    const initialIceState = peerConnection.iceConnectionState as WebRTCIceConnectionState;
    const initialOverallState = peerConnection.connectionState as WebRTCPeerConnectionState;

    const mappedOverallState = mapPeerConnectionState(initialOverallState);
    // Prioritize overall connection state if it's definitive (connected, failed, closed)
    if (mappedOverallState && ['connected', 'failed', 'closed'].includes(mappedOverallState)) {
        updateStoreAndErrorState(mappedOverallState, mappedOverallState === 'failed' ? 'Peer connection initially failed.' : undefined);
    } else {
        // Otherwise, use ICE connection state as a fallback or for intermediate states
        const mappedIceState = mapIceConnectionState(initialIceState);
        updateStoreAndErrorState(mappedIceState, mappedIceState === 'failed' ? 'ICE connection initially failed.' : undefined);
    }

    peerConnection.oniceconnectionstatechange = handleIceConnectionStateChange;
    peerConnection.onconnectionstatechange = handleConnectionStateChange;


    return () => {
      if (peerConnection) {
        peerConnection.oniceconnectionstatechange = null;
        peerConnection.onconnectionstatechange = null;
      }
    };
  }, [peerConnection, handleIceConnectionStateChange, handleConnectionStateChange, updateStoreAndErrorState]);

  const connectedPeers = useMemo(() => connectedUsers.map(u => u.id), [connectedUsers]);
  const isMediaActive = useMemo(() => !isMutedInStore && isVideoEnabledInStore, [isMutedInStore, isVideoEnabledInStore]);

  const resetConnectionStatesInStore = useCallback(() => {
    Logger.info('useCallConnection: Resetting connection-related states in Zustand store.');
    useCallStore.setState({ currentCall: null, chatMessages: [] });
    zustandClearStreams();
    zustandSetMuted(false);
    zustandSetVideoEnabled(true);
    zustandSetConnectionState('new'); // Reset to initial state
    zustandClearConnectedUsers();
  }, [
    zustandClearStreams,
    zustandSetMuted,
    zustandSetVideoEnabled,
    zustandSetConnectionState,
    zustandClearConnectedUsers,
  ]);

  return {
    connectionState: storeConnectionState, // Reflect the Zustand store's state
    error, // Local error state from this hook's monitoring
    connectedPeers,
    isMediaActive,
    resetConnectionStatesInStore,
  };
};
