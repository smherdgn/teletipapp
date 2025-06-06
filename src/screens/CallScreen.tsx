import React, {useEffect, useState, useRef, useCallback} from 'react';
import {View, Text, TouchableOpacity, Alert, AppState, Platform, StyleSheet, SafeAreaView, ActivityIndicator} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import {CallScreenProps} from '@navigation/types';
import {RTCView, MediaStream} from 'react-native-webrtc';
import {RTCService} from '@services/rtcService';
import {SocketService, ServerToClientEvents} from '@services/socketService';
import {useCallStore} from '@store/useCallStore';
import {CallStatus, User} from '@customtypes/index';
import {Button, Icon, Toast, LoadingOverlay} from '@components/common';
import { useTranslation } from 'react-i18next';
import {useAuthStore} from '@store/useAuthStore';
import { Colors } from '@constants/theme';
import Logger from '@utils/logger';
import { useCallConnection, CallConnectionState } from '@hooks/useCallConnection';

const CallScreen: React.FC<CallScreenProps> = ({route, navigation}) => {
  const {roomId} = route.params;
  const tw = useTailwind();
  const {t} = useTranslation();
  const {user: localUser} = useAuthStore();

  const {
    localStream,
    remoteStream,
    setLocalStream,
    setRemoteStream,
    clearStreams,
    endCall: endCallInStore,
    setConnectionState: setConnectionStateInStore,
    connectionState: callStoreConnectionState,
    addConnectedUser,
    removeConnectedUser,
    setConnectedUsers,
    isMuted: isMutedInStore,
    isVideoEnabled: isVideoEnabledInStore,
    setMuted,
    setVideoEnabled,
  } = useCallStore();
  
  const rtcServiceRef = useRef<RTCService | null>(null);
  const socketServiceRef = useRef(SocketService.getInstance());

  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.DIALING);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // Hook to monitor WebRTC connection state
  const { connectionState: rtcConnectionState, error: rtcConnectionError } = useCallConnection(rtcServiceRef.current?.peerConnection || null);

  // Update Zustand store with WebRTC connection state
  useEffect(() => {
    setConnectionStateInStore(rtcConnectionState);
    if (rtcConnectionState === 'failed' && rtcConnectionError) {
        displayToast(t('call.connectionFailed', { error: rtcConnectionError }), 'error');
    }
  }, [rtcConnectionState, rtcConnectionError, setConnectionStateInStore, t]);


  const displayToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  }, []);

  // Initialize Call and RTC Service
  useEffect(() => {
    if (!localUser) {
      Logger.error('CallScreen: Local user not found. Aborting call setup.');
      displayToast(t('common.error'), 'error');
      navigation.replace('RoomEntry'); // Go to a safe screen
      return;
    }

    Logger.info(`CallScreen: Initializing for room ${roomId}, user ${localUser.id}`);
    setIsInitializing(true);

    const rtcService = new RTCService(
      localUser.id,
      roomId,
      (stream: MediaStream) => setLocalStream(stream),
      (stream: MediaStream) => {
          setRemoteStream(stream);
          setCallStatus(CallStatus.ACTIVE);
          // displayToast(t('toastMessages.userJoinedCall', {name: 'Participant'}), 'info'); // Generic message
          Logger.info('CallScreen: Remote stream received and set.');
      }
    );
    rtcServiceRef.current = rtcService;

    const setup = async () => {
      const stream = await rtcService.getLocalStream(); // Handles permissions
      if (!stream) {
        displayToast(t('call.mediaError'), 'error');
        Logger.error('CallScreen: Failed to get local stream. Permissions might be denied.');
        await handleEndCall(false, 'media_error'); // End call locally
        return;
      }
      
      socketServiceRef.current.emit('join-room', { roomId, userId: localUser.id }, (response) => {
        if (response.success) {
            Logger.info(`CallScreen: Successfully joined room ${roomId}. Current users:`, response.users);
            if (response.users) setConnectedUsers(response.users);
            // If other users are in the room, one might initiate an offer, or we might.
            // A common strategy: if more than one user, the "newer" one might expect an offer,
            // or the server might designate an offerer.
            // If only user in the room, wait. If >1 and localUser is designated initiator by server (or by logic)
            if (response.users && response.users.length > 1) {
                // Simple strategy: if I'm not the first one, I might wait for an offer.
                // If I was the first one, and someone else joins, they might send an offer, or I might initiate.
                // For this demo, let's assume if there are others, an offer exchange will happen.
                // The user who joined LAST and sees others might initiate an offer.
                // This logic can be complex and server-driven.
                // Let's say if I'm the second person (or more), I can try to make an offer.
                // This is a placeholder for a more robust initiator selection logic.
                const otherUsers = response.users.filter(u => u.id !== localUser.id);
                if(otherUsers.length > 0) {
                     Logger.info('CallScreen: Other users present in room. Potentially creating offer.');
                     rtcServiceRef.current?.createOffer();
                } else {
                    Logger.info('CallScreen: Joined room, waiting for others.');
                    setCallStatus(CallStatus.RINGING); // Or a "waiting" state
                }
            } else {
                Logger.info('CallScreen: Joined room as the first user. Waiting for others.');
                setCallStatus(CallStatus.RINGING); // Waiting for others
            }
        } else {
            Logger.error(`CallScreen: Failed to join room ${roomId}`, {error: response.error});
            displayToast(t('call.joinRoomFailed', {error: response.error || 'Unknown error'}), 'error');
            handleEndCall(false, 'join_room_failed');
        }
      });
      setCallStatus(CallStatus.DIALING);
      setIsInitializing(false);
    };

    setup();

    return () => {
      Logger.info('CallScreen: Unmounting component. Cleaning up call resources.');
      socketServiceRef.current.emit('leave-room', { roomId, userId: localUser.id });
      rtcServiceRef.current?.close();
      clearStreams();
      endCallInStore(roomId);
    };
  }, [roomId, localUser]); // Only re-run if roomId or localUser changes (shouldn't happen often)

  // Socket Event Handlers
  useEffect(() => {
    const socket = socketServiceRef.current;
    if (!localUser || !rtcServiceRef.current) return;

    const offerHandler: ServerToClientEvents['offer'] = async (data) => {
      if (data.callId === roomId && data.from !== localUser.id) {
        Logger.info('CallScreen: Received offer from', { from: data.from });
        setCallStatus(CallStatus.RINGING); // Or a custom "receiving call" state
        await rtcServiceRef.current?.handleOffer(data.sdp, data.from); // Pass fromUserId
        const answer = await rtcServiceRef.current?.createAnswer();
        if (answer) {
          Logger.info('CallScreen: Sent answer to', { to: data.from });
          setCallStatus(CallStatus.ACTIVE);
        } else {
            Logger.warn('CallScreen: Failed to create answer for offer from', { from: data.from });
        }
      }
    };

    const answerHandler: ServerToClientEvents['answer'] = async (data) => {
      if (data.callId === roomId && data.from !== localUser.id) {
        Logger.info('CallScreen: Received answer from', { from: data.from });
        await rtcServiceRef.current?.handleAnswer(data.sdp);
        setCallStatus(CallStatus.ACTIVE);
      }
    };

    const iceCandidateHandler: ServerToClientEvents['ice-candidate'] = async (data) => {
      if (data.callId === roomId && data.from !== localUser.id) {
        await rtcServiceRef.current?.addIceCandidate(data.candidate);
      }
    };
    
    const callEndedHandler: ServerToClientEvents['call-ended'] = (data) => {
      if (data.callId === roomId) {
        Logger.info('CallScreen: Received remote "call-ended" signal.', { reason: data.reason });
        displayToast(t('toastMessages.userLeftCall', { name: 'Participant' }), 'info');
        handleEndCall(false, data.reason || 'remote_hangup');
      }
    };

    const userJoinedHandler: ServerToClientEvents['user-joined'] = (data) => {
        if (data.roomId === roomId && data.userId !== localUser.id) {
            Logger.info(`CallScreen: User ${data.user.name} joined the room.`);
            addConnectedUser(data.user);
            displayToast(t('toastMessages.userJoinedCall', {name: data.user.name}), 'info');
            // If I was waiting and someone joined, and I'm supposed to make an offer
            if (callStatus !== CallStatus.ACTIVE && callStatus !== CallStatus.DIALING && rtcServiceRef.current?.peerConnection?.signalingState === 'stable') {
                // Check if local user should initiate. This logic needs care.
                // Example: if current user was first and now someone else joined.
                Logger.info('CallScreen: New user joined, local user might create offer if appropriate.');
                // rtcServiceRef.current?.createOffer(); // Avoid offer storms, server should coordinate or use a leader election
            }
        }
    };
    const userLeftHandler: ServerToClientEvents['user-left'] = (data) => {
        if (data.roomId === roomId && data.userId !== localUser.id) {
            Logger.info(`CallScreen: User ${data.userId} left the room.`);
            removeConnectedUser(data.userId);
            displayToast(t('toastMessages.userLeftCall', {name: data.userId}), 'info');
            // If only one person left (this user), the call is effectively over for this user.
            // The server might also send 'call-ended'.
        }
    };

    const unsubOffer = socket.on('offer', offerHandler);
    const unsubAnswer = socket.on('answer', answerHandler);
    const unsubIce = socket.on('ice-candidate', iceCandidateHandler);
    const unsubEnded = socket.on('call-ended', callEndedHandler);
    const unsubUserJoined = socket.on('user-joined', userJoinedHandler);
    const unsubUserLeft = socket.on('user-left', userLeftHandler);

    return () => {
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubEnded();
      unsubUserJoined();
      unsubUserLeft();
    };
  }, [roomId, localUser, callStatus, addConnectedUser, removeConnectedUser, displayToast, t]); // Add dependencies

  // AppState Handling
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState.match(/inactive|background/)) {
        Logger.info('CallScreen: App is inactive/background.');
        // rtcServiceRef.current?.toggleVideo(false); // Example: auto-disable video
      } else if (nextAppState === 'active') {
        Logger.info('CallScreen: App is active.');
        // rtcServiceRef.current?.toggleVideo(isVideoEnabledInStore); // Restore video state
      }
    });
    return () => {
      subscription.remove();
    };
  }, [isVideoEnabledInStore]);


  const handleEndCall = useCallback(async (isInitiator = true, reason?: string) => {
    Logger.info('CallScreen: handleEndCall invoked.', { isInitiator, reason, currentStatus: callStatus });
    if (callStatus === CallStatus.ENDED) { // Prevent multiple executions
        Logger.warn('CallScreen: Call already ended, skipping redundant end call.');
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.replace('RoomEntry');
        return;
    }

    setCallStatus(CallStatus.ENDED); // Optimistically set status

    if (isInitiator && localUser) {
      // Tell other peers in the room this user is ending/leaving.
      // 'to' could be the roomId to broadcast or specific user if direct.
      socketServiceRef.current.emit('end-call', { callId: roomId, to: roomId });
    }
    
    rtcServiceRef.current?.close();
    clearStreams(); // Clear streams in Zustand store
    endCallInStore(roomId); // Update global state that call has ended

    Logger.info('CallScreen: Navigating back or to RoomEntry.');
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('RoomEntry');
    }
  }, [roomId, localUser, navigation, clearStreams, endCallInStore, callStatus]);

  const toggleMuteHandler = () => {
    const newMutedState = !isMutedInStore;
    rtcServiceRef.current?.toggleMute(newMutedState);
    setMuted(newMutedState); // Update Zustand store
    Logger.debug(`CallScreen: Mic ${newMutedState ? 'muted' : 'unmuted'}`);
  };

  const toggleVideoHandler = () => {
    const newVideoState = !isVideoEnabledInStore;
    rtcServiceRef.current?.toggleVideo(newVideoState);
    setVideoEnabled(newVideoState); // Update Zustand store
    Logger.debug(`CallScreen: Video ${newVideoState ? 'enabled' : 'disabled'}`);
  };

  const switchCameraHandler = () => {
    if (isVideoEnabledInStore) {
        rtcServiceRef.current?.switchCamera();
        Logger.debug('CallScreen: Switched camera');
    } else {
        Logger.warn('CallScreen: Switch camera attempt while video is disabled.');
    }
  };
  
  if (isInitializing) {
    return <LoadingOverlay visible={true} text={t('call.initializing')} />;
  }
  
  // Display based on RTC connection state from hook
  let statusText = t(`call.statusMessage.${callStoreConnectionState}`, { error: rtcConnectionError || '' });
  if (callStoreConnectionState === 'connecting' && callStatus === CallStatus.DIALING) statusText = t('call.status.dialing');
  if (callStoreConnectionState === 'connecting' && callStatus === CallStatus.RINGING) statusText = t('call.status.ringing');


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.videoContainer}>
        {remoteStream && callStoreConnectionState === 'connected' ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.fullScreenVideo}
            objectFit={'cover'}
            mirror={false}
            accessibilityLabel={t('call.remoteVideo')}
          />
        ) : (
          <View style={styles.placeholderView}>
            {callStoreConnectionState === 'connecting' || callStoreConnectionState === 'new' ? (
              <ActivityIndicator size="large" color={Colors.primaryLight} />
            ) : (
              <Icon name="VideoOff" size={64} color={Colors.gray500} />
            )}
            <Text style={styles.placeholderText}>{statusText}</Text>
          </View>
        )}

        {localStream && isVideoEnabledInStore && (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit={'cover'}
            mirror={true}
            zOrder={1}
            accessibilityLabel={t('call.localVideo')}
          />
        )}
      </View>
      
      <View style={styles.topInfoContainer}>
         <Text style={styles.roomIdText}>{t('call.roomId', {roomId})}</Text>
         <Text style={styles.connectionStatusText}>{t(`call.connectionState.${callStoreConnectionState}`)}</Text>
      </View>

      <View style={styles.controlsContainer}>
        <Button
          onPress={toggleMuteHandler}
          type="ghost"
          style={styles.controlButton}
          leftIcon={isMutedInStore ? 'MicOff' : 'Mic'}
          iconColor={Colors.white}
          accessibilityLabel={isMutedInStore ? t('call.toggleMicOn') : t('call.toggleMicOff')}
        />
        <Button
          onPress={toggleVideoHandler}
          type="ghost"
          style={styles.controlButton}
          leftIcon={isVideoEnabledInStore ? 'Video' : 'VideoOff'}
          iconColor={Colors.white}
          accessibilityLabel={isVideoEnabledInStore ? t('call.toggleCameraOff') : t('call.toggleCameraOn')}
        />
         {Platform.OS !== 'web' && isVideoEnabledInStore && (
          <Button
            onPress={switchCameraHandler}
            type="ghost"
            style={styles.controlButton}
            leftIcon="SwitchCamera"
            iconColor={Colors.white}
            accessibilityLabel={t('call.switchCamera')}
            disabled={!isVideoEnabledInStore}
          />
        )}
        <Button
          onPress={() => handleEndCall(true, 'user_hangup')}
          type="destructive"
          style={[styles.controlButton, tw('bg-destructive-DEFAULT')]}
          leftIcon="PhoneOff"
          iconColor={Colors.white}
          accessibilityLabel={t('call.endCallButton')}
        />
      </View>
       {toastVisible && (
        <Toast
            message={toastMessage}
            type={toastType}
            visible={toastVisible}
            onDismiss={() => setToastVisible(false)}
            position="top"
        />
    )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.gray900,
  },
  videoContainer: {
    flex: 1,
    position: 'relative', // For local video positioning
  },
  fullScreenVideo: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  placeholderView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.gray800,
  },
  placeholderText: {
    color: Colors.gray300,
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  localVideo: {
    position: 'absolute',
    width: 100, // Consider making this responsive
    height: 150, // Consider making this responsive
    top: 20,
    right: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    overflow: 'hidden',
    backgroundColor: Colors.gray700,
  },
  topInfoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  roomIdText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  connectionStatusText: {
     color: Colors.gray200,
     fontSize: 12,
     marginTop: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 12 : 16, // Adjust padding for safe area on iOS if needed
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlButton: {
    padding: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 6,
  },
});

export default CallScreen;
