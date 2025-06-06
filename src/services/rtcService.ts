
import {
  mediaDevices,
  RTCPeerConnection,
  RTCIceCandidate, // Class for creating candidate objects
  RTCSessionDescription, // Class for creating SDP objects
  MediaStream,
  // MediaStreamConstraints, // Not directly exported, use local definition
  MediaStreamTrack,
  // RTCOfferOptions, // Import this for createOffer options type - Not exported per error
  // RTCIceCandidateInit, // Define locally or use RTCIceCandidate constructor arg type
  // RTCSessionDescriptionInit, // Define locally or use RTCSessionDescription constructor arg type
  // For event payloads, we'll use inline types or 'any' if specific types aren't easily available from the lib
  // RTCIceCandidateType, // This specific type for candidate.type is not directly used for filtering.
} from 'react-native-webrtc';
import {SocketService} from './socketService';
import Logger from '@utils/logger';
import { PermissionUtils } from '@utils/permissions';
import { TURN_URL, TURN_USERNAME, TURN_PASSWORD } from '@env'; // Import from @env

// Define Init types if not exported by react-native-webrtc, based on standard WebRTC
export interface RTCSessionDescriptionInit {
  type: RTCSdpType; // 'offer' | 'pranswer' | 'answer' | 'rollback'
  sdp?: string;
}

export interface RTCIceCandidateInit {
  candidate?: string | null; // Allow null as per some library versions
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string; // Not typically used by clients directly but part of spec
}

// Local definition for RTCOfferOptions if not exported by react-native-webrtc
export interface RTCOfferOptions {
  iceRestart?: boolean;
  offerToReceiveAudio?: boolean;
  offerToReceiveVideo?: boolean;
  voiceActivityDetection?: boolean; // Note: standard is voiceActivityDetection, but some older APIs might use different casing
}


// Example TURN server configuration (replace with your actual TURN server details)
// These should ideally be fetched from a backend or a secure configuration source, not hardcoded.
const FALLBACK_TURN_URL = 'turns:your-turn-server.example.com:5349'; // Placeholder - replace with a real or no fallback
const FALLBACK_TURN_USERNAME = 'your_username'; // Placeholder
const FALLBACK_TURN_PASSWORD = 'your_password'; // Placeholder

// Constructing mutable RTCConfiguration
const rtcConfiguration: RTCConfiguration = { // Use RTCConfiguration type
  iceServers: [
    {
      urls: [TURN_URL || FALLBACK_TURN_URL],
      username: TURN_USERNAME || FALLBACK_TURN_USERNAME,
      credential: TURN_PASSWORD || FALLBACK_TURN_PASSWORD,
    },
    // You can add more STUN/TURN servers here if needed.
    // Note: Forcing relay means STUN servers for NAT traversal are less critical if TURN is robust.
    // e.g., { urls: 'stun:stun.l.google.com:19302' }
  ],
  iceTransportPolicy: 'relay', // Enforces TURN relay connections
  sdpSemantics: 'unified-plan', // Recommended for modern WebRTC
};

Logger.info('RTCService: Initializing with RTCConfiguration', rtcConfiguration);


// Updated AppMediaTrackConstraints for modern WebRTC
interface AppMediaTrackConstraints {
    width?: number | { ideal?: number; min?: number; max?: number; exact?: number };
    height?: number | { ideal?: number; min?: number; max?: number; exact?: number };
    frameRate?: number | { ideal?: number; min?: number; max?: number; exact?: number };
    facingMode?: 'user' | 'environment' | { ideal?: 'user' | 'environment'; exact?: 'user' | 'environment' };
    deviceId?: string | { ideal?: string; exact?: string };
    // Add other relevant constraints like aspectRatio, etc.
}

// Corrected typo in AppMediaStreamConstraints
interface AppMediaStreamConstraints {
  audio?: boolean | AppMediaTrackConstraints; // Assuming audio can also have detailed constraints if needed
  video?: boolean | AppMediaTrackConstraints; // Corrected: AppMediaTrackConstraints
}


export class RTCService {
  public peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private onLocalStreamCallback: (stream: MediaStream) => void;
  private onRemoteStreamCallback: (stream: MediaStream) => void;

  private localUserId: string;
  private roomId: string; // Used as the callId or communication channel identifier
  private socketService: SocketService;


  constructor(
    localUserId: string,
    roomId: string, // This will be used as callId for signaling
    onLocalStream: (stream: MediaStream) => void,
    onRemoteStream: (stream: MediaStream) => void,
  ) {
    this.localUserId = localUserId;
    this.roomId = roomId;
    this.onLocalStreamCallback = onLocalStream;
    this.onRemoteStreamCallback = onRemoteStream;
    this.socketService = SocketService.getInstance();
    this.initializePeerConnection();
  }

  private handleIceCandidate = (event: RTCPeerConnectionIceEvent) => { // Use specific event type
    if (event.candidate) {
      this.analyzeAndLogIceCandidate(event.candidate); // Analyze for IP leak and log
      this.socketService.emit('ice-candidate', {
          candidate: event.candidate.toJSON(), // Send as plain object
          callId: this.roomId,
          to: this.roomId, // Target room/call for broadcasting or specific user
          from: this.localUserId,
      });
    } else {
      Logger.debug('RTCService: End of ICE candidates.');
    }
  };

  private handleTrack = (event: RTCTrackEvent) => { // Use specific event type
    Logger.info('RTCService: Remote track received.', { streamIds: event.streams.map(s => s.id) });
    if (event.streams && event.streams[0]) {
      this.onRemoteStreamCallback(event.streams[0]);
    } else {
      const newStream = new MediaStream();
      newStream.addTrack(event.track as MediaStreamTrack);
      this.onRemoteStreamCallback(newStream);
      Logger.warn('RTCService: Remote track event received, track added to new stream because event.streams was empty or missing.');
    }
  };

  private handleIceConnectionStateChange = (event: Event) => {
    if(!this.peerConnection) return;
    Logger.info(`RTCService: ICE connection state changed to ${this.peerConnection.iceConnectionState}`,
      { currentTargetState: this.peerConnection.iceConnectionState });
  };

  private handleSignalingStateChange = (event: Event) => {
    if(!this.peerConnection) return;
    Logger.info(`RTCService: Signaling state changed to ${this.peerConnection.signalingState}`,
      { currentTargetState: this.peerConnection.signalingState });
  };

  private handleConnectionStateChange = (event: Event) => {
    if(!this.peerConnection) return;
    Logger.info(`RTCService: PeerConnection state changed to ${this.peerConnection.connectionState}`,
      { currentTargetState: this.peerConnection.connectionState });
  };


  private initializePeerConnection() {
    try {
        this.peerConnection = new RTCPeerConnection(rtcConfiguration);
        Logger.info('RTCService: PeerConnection initialized.');

        this.peerConnection.onicecandidate = this.handleIceCandidate as (ev: RTCPeerConnectionIceEvent) => void;
        this.peerConnection.ontrack = this.handleTrack as (ev: RTCTrackEvent) => void;
        this.peerConnection.oniceconnectionstatechange = this.handleIceConnectionStateChange;
        this.peerConnection.onsignalingstatechange = this.handleSignalingStateChange;
        this.peerConnection.onconnectionstatechange = this.handleConnectionStateChange;

    } catch (error) {
        Logger.error('RTCService: Failed to initialize PeerConnection', error);
        throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Parses an ICE candidate string to check if it's a host or srflx type.
   * @param candidateString The ICE candidate string.
   * @returns True if the candidate is 'host' or 'srflx', false otherwise.
   */
  public sanitizeCandidate(candidateString: string): boolean {
    const typeMatch = candidateString?.match(/ typ (\w+)/);
    const candidateType = typeMatch ? typeMatch[1] : 'unknown';
    return candidateType === 'host' || candidateType === 'srflx';
  }


  private analyzeAndLogIceCandidate(candidate: RTCIceCandidate): void {
    const candidateString = candidate.candidate;
    const typeMatch = candidateString?.match(/ typ (\w+)/);
    const candidateType = typeMatch ? typeMatch[1] : 'unknown'; // e.g., host, srflx, relay, prflx
    const candidateJson = candidate.toJSON(); // For structured logging

    const logContext = {
        candidateString: candidateString, // Raw candidate for debugging, might contain IP
        parsedType: candidateType,
        sdpMLineIndex: candidateJson.sdpMLineIndex,
        sdpMid: candidateJson.sdpMid,
        currentIceTransportPolicy: rtcConfiguration.iceTransportPolicy,
    };
    
    // The logger will sanitize context for Sentry, but we are explicit here about potential IP
    const sanitizedLogContextForSentry = {
        ...logContext,
        candidateString: `type ${candidateType} (details masked)`, // Mask candidate string for Sentry if sending whole context
    };


    if (rtcConfiguration.iceTransportPolicy === 'relay') {
        if (candidateType === 'host' || candidateType === 'srflx') {
            Logger.warn(
              `POTENTIAL_IP_LEAK: Non-relay ICE candidate (type: ${candidateType}) generated despite iceTransportPolicy='relay'. This might expose local/public IP if TURN server is not properly forcing relay.`,
              { ...logContext, sentryContext: sanitizedLogContextForSentry } // Provide both for local and Sentry
            );
        } else if (candidateType === 'relay') {
            Logger.info(`RTCService: Relay (TURN) candidate of type '${candidateType}' generated as expected.`, logContext);
        } else {
             // prflx (peer reflexive) might still appear in some scenarios even with relay,
             // but it's less common and indicates a direct P2P check happened.
             // Treat as unexpected if relay is strictly enforced and expected.
            Logger.warn(`RTCService: ICE candidate of potentially unexpected type '${candidateType}' generated with iceTransportPolicy='relay'.`, logContext);
        }
    } else {
        // If policy is not 'relay', then host and srflx are expected.
        if (candidateType === 'host' || candidateType === 'srflx') {
             Logger.info(`RTCService: Local or STUN candidate (${candidateType}) generated. iceTransportPolicy is '${rtcConfiguration.iceTransportPolicy}'.`, logContext);
        } else if (candidateType === 'relay') {
             Logger.info(`RTCService: Relay (TURN) candidate (${candidateType}) generated. iceTransportPolicy is '${rtcConfiguration.iceTransportPolicy}'.`, logContext);
        } else {
             Logger.info(`RTCService: ICE candidate of type '${candidateType}' generated. iceTransportPolicy is '${rtcConfiguration.iceTransportPolicy}'.`, logContext);
        }
    }
  }

  async startLocalStream(): Promise<MediaStream | null> {
    Logger.info('RTCService: Attempting to get local media stream.');
    const permissions = await PermissionUtils.requestMultiplePermissions(['camera', 'microphone']);
    if (permissions.camera !== 'granted' || permissions.microphone !== 'granted') {
      Logger.error('RTCService: Camera or microphone permissions denied.', { permissions });
      return null;
    }

    const constraints: AppMediaStreamConstraints = {
      audio: true,
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 },
        facingMode: 'user',
      },
    };

    try {
      const stream = await mediaDevices.getUserMedia(constraints as any); // Cast to any due to MediaStreamConstraints type issue
      this.localStream = stream;
      this.onLocalStreamCallback(stream);
      Logger.info('RTCService: Local stream acquired successfully.');

      stream.getTracks().forEach(track => {
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, stream);
        } else {
          Logger.warn('RTCService: PeerConnection not available when trying to add track.');
        }
      });
      Logger.debug('RTCService: Local stream tracks added to PeerConnection.');
      return stream;
    } catch (error) {
      Logger.error('RTCService: Error acquiring local media stream', error);
      return null;
    }
  }

  async createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit | null> {
    if (!this.peerConnection) {
        Logger.warn('RTCService: createOffer called but PeerConnection is null.');
        return null;
    }
    try {
      Logger.info('RTCService: Creating SDP offer.');
      if (!this.localStream) {
        await this.startLocalStream();
        if (!this.localStream) {
            Logger.error('RTCService: Cannot create offer, local stream failed to initialize.');
            return null;
        }
      }
      const offer = await this.peerConnection.createOffer(options);
      await this.peerConnection.setLocalDescription(offer);
      Logger.debug('RTCService: Offer created and set as local description.', { offerSdpPreview: offer.sdp?.substring(0,60) });

      this.socketService.emit('offer', {
        sdp: offer,
        callId: this.roomId,
        to: this.roomId,
        from: this.localUserId,
      });
      return offer;
    } catch (error) {
      Logger.error('RTCService: Error creating offer', error);
      return null;
    }
  }

  async handleOffer(offerSdp: RTCSessionDescriptionInit, fromUserId: string): Promise<void> {
    if (!this.peerConnection) {
        Logger.warn('RTCService: handleOffer called but PeerConnection is null.');
        return;
    }
    try {
      Logger.info('RTCService: Handling offer from user.', { fromUserId, offerSdpPreview: offerSdp.sdp?.substring(0,60) });
      if (!this.localStream) {
        await this.startLocalStream();
        if (!this.localStream) {
            Logger.error('RTCService: Cannot handle offer, local stream failed to initialize.');
            return;
        }
      }
      if (!offerSdp.sdp) {
        Logger.error('RTCService: Offer SDP is missing in handleOffer.', { fromUserId });
        return;
      }
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({type: offerSdp.type, sdp: offerSdp.sdp!}));
      Logger.debug('RTCService: Offer set as remote description.');
    } catch (error) {
      Logger.error('RTCService: Error handling offer', error, { fromUserId });
    }
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.peerConnection) {
        Logger.warn('RTCService: createAnswer called but PeerConnection is null.');
        return null;
    }
    try {
      Logger.info('RTCService: Creating SDP answer.');
       if (!this.localStream) {
        await this.startLocalStream();
        if (!this.localStream) {
            Logger.error('RTCService: Cannot create answer, local stream failed to initialize.');
            return null;
        }
      }
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      Logger.debug('RTCService: Answer created and set as local description.', { answerSdpPreview: answer.sdp?.substring(0,60) });

      this.socketService.emit('answer', {
        sdp: answer,
        callId: this.roomId,
        to: this.roomId,
        from: this.localUserId,
      });
      return answer;
    } catch (error) {
      Logger.error('RTCService: Error creating answer', error);
      return null;
    }
  }

  async handleAnswer(answerSdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
        Logger.warn('RTCService: handleAnswer called but PeerConnection is null.');
        return;
    }
    try {
      Logger.info('RTCService: Handling answer.', { answerSdpPreview: answerSdp.sdp?.substring(0,60) });
       if (!answerSdp.sdp) {
        Logger.error('RTCService: Answer SDP is missing in handleAnswer.');
        return;
      }
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription({type: answerSdp.type, sdp: answerSdp.sdp!}));
      Logger.debug('RTCService: Answer set as remote description.');
    } catch (error) {
      Logger.error('RTCService: Error handling answer', error);
    }
  }

  async addIceCandidate(candidateInit: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
        Logger.warn('RTCService: addIceCandidate called but PeerConnection is null.');
        return;
    }
    try {
      if (!candidateInit.candidate) {
          Logger.debug('RTCService: addIceCandidate called with null or empty candidate string, skipping.');
          return;
      }
      const candidate = new RTCIceCandidate(candidateInit);
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      if (error && (error as Error).message.includes("candidate does not belong to any SdpMline") || (error as Error).message.includes("Error adding ICE candidate")) {
        Logger.debug('RTCService: Ignoring ICE candidate, remote description likely not set yet or MLine mismatch.', {candidate: candidateInit.candidate, error: (error as Error).message});
      } else {
        Logger.error('RTCService: Error adding received ICE candidate', error, {candidate: candidateInit.candidate});
      }
    }
  }

  toggleMute(mute: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !mute;
      });
      Logger.info(`RTCService: Audio tracks ${!mute ? 'enabled (unmuted)' : 'disabled (muted)'}.`);
    }
  }

  toggleVideo(enable: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enable;
      });
      Logger.info(`RTCService: Video tracks ${enable ? 'enabled' : 'disabled'}.`);
    }
  }

  switchCamera(): void {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];
        if (typeof (videoTrack as any)._switchCamera === 'function') {
          (videoTrack as any)._switchCamera();
          Logger.info('RTCService: Switched camera.');
        } else {
          Logger.warn('RTCService: _switchCamera method not available on video track.');
        }
      } else {
         Logger.warn('RTCService: No video track found to switch camera.');
      }
    }
  }

  close(): void {
    Logger.info('RTCService: Closing peer connection and releasing streams.');
    this.localStream?.getTracks().forEach(track => {
        track.stop();
        if (typeof (track as any).release === 'function') {
            (track as any).release();
        }
    });
    if (typeof (this.localStream as any)?.release === 'function') {
        (this.localStream as any).release();
    }
    this.localStream = null;

    if (this.peerConnection) {
        this.peerConnection.onicecandidate = null;
        this.peerConnection.ontrack = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.onsignalingstatechange = null;
        this.peerConnection.onconnectionstatechange = null;
        
        this.peerConnection.close();
        this.peerConnection = null;
    }
    Logger.info('RTCService: Connection closed and resources released.');
  }
}

// Define RTCConfiguration type if not available from 'react-native-webrtc'
interface RTCConfiguration {
  iceServers?: RTCIceServer[];
  iceTransportPolicy?: 'all' | 'relay';
  bundlePolicy?: 'balanced' | 'max-compat' | 'max-bundle';
  rtcpMuxPolicy?: 'negotiate' | 'require';
  sdpSemantics?: 'plan-b' | 'unified-plan';
}

// RTCPeerConnectionIceEvent and RTCTrackEvent are standard WebRTC event types.
// Ensure these match the library's actual event object structure if issues arise.
export interface RTCPeerConnectionIceEvent extends Event {
  candidate: RTCIceCandidate | null;
}

export interface RTCTrackEvent extends Event {
  receiver: any; // RTCRtpReceiver
  streams: ReadonlyArray<MediaStream>;
  track: MediaStreamTrack;
  transceiver: any; // RTCRtpTransceiver
}

interface RTCIceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
    credentialType?: 'password' | 'oauth';
}
