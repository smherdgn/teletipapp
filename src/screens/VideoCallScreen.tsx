
import React, {useEffect, useState, useRef} from 'react';
import {View, Text, TouchableOpacity, Alert, AppState, Platform} from 'react-native';
import {useTailwind} from 'tailwind-rn';
import {VideoCallScreenProps} from '@navigation/types';
import {RTCView, mediaDevices} from 'react-native-webrtc';
import {RTCService} from '@services/rtcService';
import {SocketService} from '@services/socketService'; // Assuming you have a socket service
import {useCallStore} from '@store/useCallStore';
import {CallStatus, ChatMessage} from '@customtypes/index';
import {CommonButton} from '@components/common';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';

const VideoCallScreen: React.FC<VideoCallScreenProps> = ({route, navigation}) => {
  const {callSession: initialCallSession, localUser} = route.params;
  const tw = useTailwind();
  const {t} = useTranslation();
  const {
    currentCall,
    updateCallStatus,
    addChatMessage,
    endCall: endCallStoreAction,
    localStream,
    remoteStream,
    setLocalStream,
    setRemoteStream,
    clearStreams,
  } = useCallStore();

  const rtcServiceRef = useRef<RTCService | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true); // For mobile, default to speaker

  const callSession = currentCall || initialCallSession;

  useEffect(() => {
    const rtcService = new RTCService(
      (stream) => setLocalStream(stream),
      (stream) => setRemoteStream(stream),
      () => { // On ICE candidate
        // This is handled internally by RTCService sending through SocketService
      },
      localUser.id,
      callSession.roomId!
    );
    rtcServiceRef.current = rtcService;

    const socket = SocketService.getInstance(); // Ensure socket is connected

    const setupCall = async () => {
      try {
        const stream = await rtcService.startLocalStream();
        if (!stream) {
          Alert.alert(t('videoCall.errorTitle'), t('videoCall.mediaError'));
          throw new Error(t('videoCall.mediaError'));
        }

        if (callSession.caller.id === localUser.id) { // This user is the caller
          updateCallStatus(callSession.id, CallStatus.DIALING);
          socket.emit('dial', { callId: callSession.id, roomId: callSession.roomId, caller: localUser, callee: callSession.callee });
          await rtcService.createOffer();
        } else { // This user is the callee
          updateCallStatus(callSession.id, CallStatus.RINGING); // Or ACTIVE if already accepted
        }
         // Event listeners (these should ideally be managed in a service or hook)
        socket.on('offer', async (data: { sdp: any; callId: string; from: string }) => {
          if (data.callId === callSession.id && data.from !== localUser.id) {
            await rtcServiceRef.current?.handleOffer(data.sdp);
            const answer = await rtcServiceRef.current?.createAnswer();
            if (answer) {
               socket.emit('answer', { sdp: answer, callId: callSession.id, to: data.from, from: localUser.id });
               updateCallStatus(callSession.id, CallStatus.ACTIVE);
            }
          }
        });

        socket.on('answer', async (data: { sdp: any; callId: string; from: string }) => {
          if (data.callId === callSession.id && data.from !== localUser.id) {
            await rtcServiceRef.current?.handleAnswer(data.sdp);
            updateCallStatus(callSession.id, CallStatus.ACTIVE);
          }
        });

        socket.on('ice-candidate', async (data: { candidate: any; callId: string; from: string }) => {
          if (data.callId === callSession.id && data.from !== localUser.id) {
            await rtcServiceRef.current?.addIceCandidate(data.candidate);
          }
        });

        socket.on('call-ended', (data: { callId: string }) => {
          if (data.callId === callSession.id) {
            handleEndCall(false); // false because it's triggered by remote
          }
        });

        socket.on('call-declined', (data: {callId: string}) => {
            if (data.callId === callSession.id) {
                Alert.alert(t('videoCall.callDeclinedTitle'), t('videoCall.callDeclinedMessage', {name: callSession.callee.name}));
                handleEndCall(false);
            }
        });


      } catch (error) {
        console.error("Error setting up call:", error);
        Alert.alert(t('videoCall.errorTitle'), t('videoCall.setupError'));
        handleEndCall();
      }
    };

    setupCall();
    
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Consider pausing video or showing a notification that call is ongoing
        // For simplicity, we don't handle this here, but it's important for production
      }
    });


    return () => {
      rtcServiceRef.current?.close();
      clearStreams();
      // Clean up socket listeners specific to this call
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('call-ended');
      socket.off('call-declined');
      appStateSubscription.remove();
    };
  }, [callSession.id, callSession.roomId, localUser.id, callSession.caller.id, callSession.callee, updateCallStatus, setLocalStream, setRemoteStream, clearStreams, t]);


  const handleEndCall = (isInitiator = true) => {
    if (isInitiator && callSession.status !== CallStatus.ENDED) {
      SocketService.getInstance().emit('end-call', { callId: callSession.id, to: callSession.callee.id === localUser.id ? callSession.caller.id : callSession.callee.id });
    }
    rtcServiceRef.current?.close();
    endCallStoreAction(callSession.id);
    navigation.goBack();
  };

  const toggleMute = () => {
    rtcServiceRef.current?.toggleMute(!isMuted);
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    rtcServiceRef.current?.toggleVideo(!isVideoEnabled);
    setIsVideoEnabled(!isVideoEnabled);
  };

  const switchCamera = () => {
    rtcServiceRef.current?.switchCamera();
  };

  const toggleSpeaker = () => {
    // For react-native-webrtc, speaker control might need native module interaction
    // or is handled by the OS based on proximity.
    // This is a placeholder. `mediaDevices.setAudioOutput(deviceId)` is web API.
    // For mobile, often you switch between earpiece and speaker.
    // `InCallManager` library can be used for this.
    setSpeakerEnabled(!speakerEnabled);
    // Example: InCallManager.setForceSpeakerphoneOn(!speakerEnabled);
    Alert.alert(t('videoCall.speakerToggle'), t('videoCall.speakerFeatureNote'));
  };

  const handleShareDocument = async () => {
    try {
      const res: DocumentPickerResponse[] = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory', // Important for accessing the file later
      });
      
      const doc = res[0];
      if (doc.fileCopyUri) { // Check if fileCopyUri is available
        const message: ChatMessage = {
          id: uuidv4(),
          callId: callSession.id,
          senderId: localUser.id,
          senderName: localUser.name,
          text: t('videoCall.sharedDocument', { documentName: doc.name }),
          timestamp: Date.now(),
          isLocalUser: true,
          // You might want to add a 'type: "file"' and 'fileUri' field
        };
        // This is a mock. Actual file sharing needs a backend (e.g., upload then send link)
        SocketService.getInstance().emit('chat-message', { ...message, roomId: callSession.roomId });
        addChatMessage(message);
        Alert.alert(t('videoCall.docSharedTitle'), t('videoCall.docSharedMessage', { documentName: doc.name }));
      } else {
        Alert.alert(t('videoCall.errorTitle'), t('videoCall.docShareErrorUri'));
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker
      } else {
        console.error("Error picking document:", err);
        Alert.alert(t('videoCall.errorTitle'), t('videoCall.docShareError'));
      }
    }
  };


  if (!callSession) {
    return (
      <View style={tw('flex-1 justify-center items-center bg-background')}>
        <Text style={tw('text-lg text-text')}>{t('videoCall.callNotFound')}</Text>
        <CommonButton title={t('videoCall.goBack')} onPress={() => navigation.goBack()} style="mt-4" />
      </View>
    );
  }
  
  const otherParticipantName = callSession.caller.id === localUser.id ? callSession.callee.name : callSession.caller.name;

  return (
    <View style={tw('flex-1 bg-black')}>
      {/* Remote Stream */}
      {remoteStream ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={tw('flex-1')}
          objectFit={'cover'}
          mirror={false}
          accessibilityLabel={t('videoCall.remoteVideo')}
        />
      ) : (
        <View style={tw('flex-1 justify-center items-center bg-gray-800')}>
          <Text style={tw('text-white text-lg')}>
            {callSession.status === CallStatus.DIALING && t('videoCall.dialing', {name: otherParticipantName})}
            {callSession.status === CallStatus.RINGING && t('videoCall.ringing', {name: otherParticipantName})}
            {callSession.status === CallStatus.ACTIVE && t('videoCall.waitingForVideo')}
            {callSession.status !== CallStatus.DIALING && callSession.status !== CallStatus.RINGING && callSession.status !== CallStatus.ACTIVE && t('videoCall.connecting')}
          </Text>
        </View>
      )}

      {/* Local Stream (Picture-in-Picture) */}
      {localStream && isVideoEnabled && (
        <RTCView
          streamURL={localStream.toURL()}
          style={tw('absolute w-32 h-48 top-4 right-4 border-2 border-white rounded-md')}
          objectFit={'cover'}
          mirror={true}
          zOrder={1} // Ensure it's on top for Android
          accessibilityLabel={t('videoCall.localVideo')}
        />
      )}

      {/* Call Info */}
      <View style={tw('absolute top-4 left-4 p-2 bg-black bg-opacity-50 rounded')}>
        <Text style={tw('text-white font-semibold')}>{otherParticipantName}</Text>
        <Text style={tw('text-white text-xs')}>{t(`videoCall.status.${callSession.status}`)}</Text>
      </View>


      {/* Controls */}
      <View style={tw('absolute bottom-0 left-0 right-0 p-4 flex-row justify-around items-center bg-black bg-opacity-50')}>
        <ControlButton iconName={isMuted ? 'mic-off' : 'mic'} onPress={toggleMute} label={isMuted ? t('videoCall.unmute') : t('videoCall.mute')} />
        <ControlButton iconName={isVideoEnabled ? 'videocam' : 'videocam-off'} onPress={toggleVideo} label={isVideoEnabled ? t('videoCall.stopVideo') : t('videoCall.startVideo')} />
        <EndCallButton onPress={() => handleEndCall(true)} label={t('videoCall.endCall')} />
        <ControlButton iconName="camera-reverse" onPress={switchCamera} label={t('videoCall.switchCamera')} disabled={!isVideoEnabled}/>
        {Platform.OS === 'android' && <ControlButton iconName="volume-up" onPress={toggleSpeaker} label={speakerEnabled ? t('videoCall.earpiece') : t('videoCall.speaker')} />}
        <ControlButton iconName="attach-file" onPress={handleShareDocument} label={t('videoCall.shareDocument')} />
      </View>
    </View>
  );
};

// Helper component for control buttons
const ControlButton: React.FC<{iconName: string, onPress: () => void, label: string, disabled?: boolean}> = ({ iconName, onPress, label, disabled }) => {
  const tw = useTailwind();
  // Placeholder for actual icons. Use a library like react-native-vector-icons.
  const getIcon = (name: string) => {
    if (name === 'mic') return '🎤';
    if (name === 'mic-off') return '🔇';
    if (name === 'videocam') return '📹';
    if (name === 'videocam-off') return '📵';
    if (name === 'camera-reverse') return '🔄';
    if (name === 'volume-up') return '🔊';
    if (name === 'attach-file') return '📎';
    return '?';
  };
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={tw(`p-3 rounded-full ${disabled ? 'bg-gray-600' : 'bg-gray-700'} items-center justify-center`)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Text style={tw('text-white text-xl')}>{getIcon(iconName)}</Text>
    </TouchableOpacity>
  );
};

const EndCallButton: React.FC<{onPress: () => void, label: string}> = ({onPress, label}) => {
  const tw = useTailwind();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={tw('p-3 bg-red-600 rounded-full items-center justify-center')}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={tw('text-white text-xl')}>📞</Text> {/* Placeholder for hangup icon */}
    </TouchableOpacity>
  );
}

export default VideoCallScreen;
