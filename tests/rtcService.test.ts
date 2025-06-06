
import { RTCService, RTCSessionDescriptionInit, RTCIceCandidateInit, RTCPeerConnectionIceEvent, RTCTrackEvent, RTCOfferOptions } from '@services/rtcService'; // Import local RTCOfferOptions
import { SocketService } from '@services/socketService';
import { mediaDevices, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, MediaStream, MediaStreamTrack } from 'react-native-webrtc';
import Logger from '@utils/logger'; // Sentry calls are mocked
import { PermissionUtils } from '@utils/permissions';

// Mock dependencies
jest.mock('react-native-webrtc'); // Already comprehensively mocked in jest.setup.js
jest.mock('@services/socketService');
jest.mock('@utils/permissions');

const mockMediaDevices = mediaDevices as jest.Mocked<typeof mediaDevices>;
const mockRTCPeerConnection = RTCPeerConnection as jest.Mocked<typeof RTCPeerConnection>;
const MockedSocketService = SocketService as jest.Mocked<typeof SocketService>;
const mockPermissionUtils = PermissionUtils as jest.Mocked<typeof PermissionUtils>;


describe('RTCService', () => {
  let rtcService: RTCService;
  let mockSocketInstanceEmit: jest.Mock; 
  let onLocalStreamCallback: jest.Mock;
  let onRemoteStreamCallback: jest.Mock;
  let mockPcInstance: jest.Mocked<RTCPeerConnection>;

  const localUserId = 'user1';
  const roomId = 'room1';

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocketInstanceEmit = jest.fn();

    MockedSocketService.getInstance.mockReturnValue({
      emit: mockSocketInstanceEmit,
      on: jest.fn(),
      off: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      getSocketId: jest.fn(() => 'mock-socket-id'),
      isConnected: jest.fn(() => true),
    } as any);


    onLocalStreamCallback = jest.fn();
    onRemoteStreamCallback = jest.fn();

    // Mock RTCPeerConnection instance methods via the class mock's instances array
    // This allows us to get the instance created by `new RTCPeerConnection()`
    // The default mock from jest.setup.js should provide instances with jest.fn() methods.
    // We re-assign mockPcInstance after RTCService constructor to get the latest instance.

    // Mock mediaDevices.getUserMedia
    const mockAudioTrack = { kind: 'audio', enabled: true, stop: jest.fn(), release: jest.fn() } as unknown as MediaStreamTrack;
    const mockVideoTrack = { kind: 'video', enabled: true, _switchCamera: jest.fn(), stop: jest.fn(), release: jest.fn() } as unknown as MediaStreamTrack;
    const mockStreamInstance = {
        getTracks: jest.fn(() => [mockAudioTrack, mockVideoTrack]),
        getAudioTracks: jest.fn(() => [mockAudioTrack]),
        getVideoTracks: jest.fn(() => [mockVideoTrack]),
        id: 'mock-stream-id',
        toURL: jest.fn(() => 'mock-stream-url'),
        release: jest.fn(),
        addTrack: jest.fn(),
    } as unknown as jest.Mocked<MediaStream>;
    mockMediaDevices.getUserMedia.mockResolvedValue(mockStreamInstance);

    // Mock permissions
    mockPermissionUtils.requestMultiplePermissions.mockResolvedValue({ camera: 'granted', microphone: 'granted' });

    rtcService = new RTCService(localUserId, roomId, onLocalStreamCallback, onRemoteStreamCallback);
    // The constructor calls initializePeerConnection, which creates an instance.
    // Assign mockPcInstance to this newly created one for accurate testing of event listeners.
    mockPcInstance = mockRTCPeerConnection.mock.instances[mockRTCPeerConnection.mock.instances.length - 1];

    // Ensure methods on the instance are jest.fn() if not already from global mock
    mockPcInstance.createOffer = jest.fn().mockResolvedValue({ type: 'offer', sdp: 'mockOfferSdp' } as RTCSessionDescriptionInit);
    mockPcInstance.createAnswer = jest.fn().mockResolvedValue({ type: 'answer', sdp: 'mockAnswerSdp' } as RTCSessionDescriptionInit);
    mockPcInstance.setLocalDescription = jest.fn().mockResolvedValue(undefined);
    mockPcInstance.setRemoteDescription = jest.fn().mockResolvedValue(undefined);
    mockPcInstance.addIceCandidate = jest.fn().mockResolvedValue(undefined);
    mockPcInstance.close = jest.fn();
    mockPcInstance.addTrack = jest.fn();
    // For on<event> properties, ensure they are initially null or can be assigned
    mockPcInstance.onicecandidate = null;
    mockPcInstance.ontrack = null;
    mockPcInstance.oniceconnectionstatechange = null;
    mockPcInstance.onsignalingstatechange = null;
    mockPcInstance.onconnectionstatechange = null;
  });

  it('should initialize RTCPeerConnection on construction and assign event handlers', () => {
    expect(mockRTCPeerConnection).toHaveBeenCalledTimes(1);
    expect(rtcService.peerConnection).toBeDefined();
    // Check if on<event> handlers were assigned
    expect(mockPcInstance.onicecandidate).toBeInstanceOf(Function);
    expect(mockPcInstance.ontrack).toBeInstanceOf(Function);
    expect(mockPcInstance.oniceconnectionstatechange).toBeInstanceOf(Function);
    expect(mockPcInstance.onsignalingstatechange).toBeInstanceOf(Function);
    expect(mockPcInstance.onconnectionstatechange).toBeInstanceOf(Function);
  });

  describe('startLocalStream', () => {
    it('should request permissions and get user media', async () => {
      await rtcService.startLocalStream();
      expect(mockPermissionUtils.requestMultiplePermissions).toHaveBeenCalledWith(['camera', 'microphone']);
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
      expect(onLocalStreamCallback).toHaveBeenCalledWith(expect.objectContaining({ id: 'mock-stream-id' }));
      expect(mockPcInstance.addTrack).toHaveBeenCalledTimes(2); // Audio and Video track
    });

    it('should return null if permissions are denied', async () => {
      mockPermissionUtils.requestMultiplePermissions.mockResolvedValueOnce({ camera: 'denied', microphone: 'granted' });
      const stream = await rtcService.startLocalStream();
      expect(stream).toBeNull();
      expect(mockMediaDevices.getUserMedia).not.toHaveBeenCalled();
      expect(onLocalStreamCallback).not.toHaveBeenCalled();
    });
  });

  describe('createOffer', () => {
    it('should create an offer, set local description, and emit via socket', async () => {
      await rtcService.startLocalStream(); // Ensure stream is started
      const offer = await rtcService.createOffer(undefined); // Pass undefined for options

      expect(mockPcInstance.createOffer).toHaveBeenCalledTimes(1);
      expect(mockPcInstance.createOffer).toHaveBeenCalledWith(undefined);
      expect(mockPcInstance.setLocalDescription).toHaveBeenCalledWith(offer);
      expect(mockSocketInstanceEmit).toHaveBeenCalledWith('offer', {
        sdp: offer,
        callId: roomId,
        to: roomId,
        from: localUserId,
      });
      expect(offer).toEqual({ type: 'offer', sdp: 'mockOfferSdp' });
    });
     it('should start local stream if not already started', async () => {
      const offer = await rtcService.createOffer(undefined);
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
      expect(onLocalStreamCallback).toHaveBeenCalled();
      expect(offer).not.toBeNull();
    });
  });

  describe('handleOffer', () => {
    it('should set remote description', async () => {
      const offerSdp: RTCSessionDescriptionInit = { type: 'offer', sdp: 'remoteOfferSdp' };
      await rtcService.startLocalStream();
      await rtcService.handleOffer(offerSdp, 'user2');

      expect(mockPcInstance.setRemoteDescription).toHaveBeenCalledWith(expect.objectContaining({type: 'offer', sdp: 'remoteOfferSdp'}));
    });
  });

  describe('createAnswer', () => {
    it('should create an answer, set local description, and emit via socket', async () => {
      await rtcService.startLocalStream();
      const offerSdp: RTCSessionDescriptionInit = { type: 'offer', sdp: 'remoteOfferSdp' };
      // Simulate setRemoteDescription being called before createAnswer
      (mockPcInstance.setRemoteDescription as jest.Mock).mockResolvedValueOnce(undefined);
      await mockPcInstance.setRemoteDescription(new RTCSessionDescription({type: offerSdp.type, sdp: offerSdp.sdp!}));

      const answer = await rtcService.createAnswer(); // No options argument

      expect(mockPcInstance.createAnswer).toHaveBeenCalledTimes(1);
      expect(mockPcInstance.createAnswer).toHaveBeenCalledWith(); // Expect no arguments
      expect(mockPcInstance.setLocalDescription).toHaveBeenCalledWith(answer);
      expect(mockSocketInstanceEmit).toHaveBeenCalledWith('answer', {
        sdp: answer,
        callId: roomId,
        to: roomId,
        from: localUserId,
      });
      expect(answer).toEqual({ type: 'answer', sdp: 'mockAnswerSdp' });
    });
  });

  describe('handleAnswer', () => {
    it('should set remote description', async () => {
      const answerSdp: RTCSessionDescriptionInit = { type: 'answer', sdp: 'remoteAnswerSdp' };
      await rtcService.handleAnswer(answerSdp);
      expect(mockPcInstance.setRemoteDescription).toHaveBeenCalledWith(expect.objectContaining({type: 'answer', sdp: 'remoteAnswerSdp'}));
    });
  });

  describe('addIceCandidate', () => {
    it('should add ICE candidate to peer connection', async () => {
      const candidateInit: RTCIceCandidateInit = { candidate: 'mockCandidate', sdpMid: '0', sdpMLineIndex: 0 };
      await rtcService.addIceCandidate(candidateInit);
      expect(mockPcInstance.addIceCandidate).toHaveBeenCalledWith(expect.any(RTCIceCandidate));
    });
     it('should not add null or empty candidate string', async () => {
      const candidateInitNull: RTCIceCandidateInit = { candidate: null, sdpMid: '0', sdpMLineIndex: 0 };
      const candidateInitEmpty: RTCIceCandidateInit = { candidate: '', sdpMid: '0', sdpMLineIndex: 0 };
      await rtcService.addIceCandidate(candidateInitNull);
      await rtcService.addIceCandidate(candidateInitEmpty);
      expect(mockPcInstance.addIceCandidate).not.toHaveBeenCalled();
    });
  });

  describe('ICE candidate emission', () => {
    it('should emit ICE candidates via socket when peerConnection dispatches "icecandidate" event', () => {
        const icecandidateHandler = mockPcInstance.onicecandidate;
        expect(icecandidateHandler).toBeInstanceOf(Function);

        const mockCandidate = new RTCIceCandidate({ candidate: 'candidateString', sdpMid: '0', sdpMLineIndex: 0 });
        const iceEvent = { candidate: mockCandidate, type: 'icecandidate' } as unknown as RTCPeerConnectionIceEvent;

        (icecandidateHandler as Function)(iceEvent);

        expect(mockSocketInstanceEmit).toHaveBeenCalledWith('ice-candidate', {
            candidate: mockCandidate.toJSON(),
            callId: roomId,
            to: roomId,
            from: localUserId,
        });
    });
  });


  describe('Media Controls', () => {
    let localStreamInstance: MediaStream;
    let audioTrack: jest.Mocked<MediaStreamTrack>;
    let videoTrack: jest.Mocked<MediaStreamTrack & { _switchCamera?: jest.Mock }>;


    beforeEach(async () => {
      // RTCService already creates a stream, but let's ensure it's fresh for this block
      const stream = await rtcService.startLocalStream();
      if (!stream) throw new Error("Local stream not initialized for media control tests");
      localStreamInstance = stream;
      const tracks = localStreamInstance.getTracks() as jest.Mocked<MediaStreamTrack>[];
      audioTrack = tracks.find(t => t.kind === 'audio')!;
      videoTrack = tracks.find(t => t.kind === 'video')! as jest.Mocked<MediaStreamTrack & { _switchCamera?: jest.Mock }>;
      if (!videoTrack._switchCamera) { // Ensure _switchCamera is a mock if not already by the global mock
        (videoTrack as any)._switchCamera = jest.fn();
      }
    });

    it('toggleMute should enable/disable audio tracks', () => {
      rtcService.toggleMute(true); // Mute
      expect(audioTrack.enabled).toBe(false);

      rtcService.toggleMute(false); // Unmute
      expect(audioTrack.enabled).toBe(true);
    });

    it('toggleVideo should enable/disable video tracks', () => {
      rtcService.toggleVideo(false); // Disable video
      expect(videoTrack.enabled).toBe(false);

      rtcService.toggleVideo(true); // Enable video
      expect(videoTrack.enabled).toBe(true);
    });

    it('switchCamera should call _switchCamera on video track', () => {
      rtcService.switchCamera();
      expect(videoTrack._switchCamera).toHaveBeenCalledTimes(1);
    });
  });

  describe('close', () => {
    it('should stop and release local stream tracks, remove event listeners and close peer connection', async () => {
      const localStreamInstance = await rtcService.startLocalStream();
      const tracks = localStreamInstance!.getTracks() as jest.Mocked<MediaStreamTrack>[];

      rtcService.close();

      tracks.forEach(track => {
        expect(track.stop).toHaveBeenCalled();
        if ((track as any).release) { // release is not standard but often present
            expect((track as any).release).toHaveBeenCalled();
        }
      });
       if ((localStreamInstance as any)?.release) {
            expect((localStreamInstance as any).release).toHaveBeenCalled();
        }
      // Check if on<event> handlers were set to null
      expect(mockPcInstance.onicecandidate).toBeNull();
      expect(mockPcInstance.ontrack).toBeNull();
      expect(mockPcInstance.oniceconnectionstatechange).toBeNull();
      expect(mockPcInstance.onsignalingstatechange).toBeNull();
      expect(mockPcInstance.onconnectionstatechange).toBeNull();
      expect(mockPcInstance.close).toHaveBeenCalledTimes(1);
      expect(rtcService.peerConnection).toBeNull();
    });
  });
});
