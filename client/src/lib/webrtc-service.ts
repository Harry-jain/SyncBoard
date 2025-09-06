import SimplePeer from 'simple-peer';
import { io, Socket } from 'socket.io-client';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  socketUrl: string;
}

export interface MediaStreams {
  audio: MediaStream | null;
  video: MediaStream | null;
  screen: MediaStream | null;
}

export interface CallState {
  isConnected: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  participants: Map<string, Participant>;
  localStreams: MediaStreams;
}

export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  stream?: MediaStream;
  screenStream?: MediaStream;
}

export interface CallOptions {
  audio: boolean;
  video: boolean;
  screen?: boolean;
}

export class WebRTCService {
  private socket: Socket | null = null;
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private localStreams: MediaStreams = {
    audio: null,
    video: null,
    screen: null
  };
  private callState: CallState = {
    isConnected: false,
    isMuted: false,
    isVideoEnabled: true,
    isScreenSharing: false,
    participants: new Map(),
    localStreams: this.localStreams
  };
  private config: WebRTCConfig;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: WebRTCConfig) {
    this.config = config;
  }

  // Initialize the WebRTC service
  async initialize(): Promise<void> {
    try {
      // Initialize socket connection
      this.socket = io(this.config.socketUrl, {
        transports: ['websocket'],
        upgrade: false
      });

      this.setupSocketListeners();
      await this.initializeMedia();
    } catch (error) {
      console.error('Failed to initialize WebRTC service:', error);
      throw error;
    }
  }

  // Initialize media streams
  private async initializeMedia(): Promise<void> {
    try {
      // Request audio and video permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });

      this.localStreams.audio = stream;
      this.localStreams.video = stream;
      this.callState.localStreams = this.localStreams;

      this.emit('mediaReady', { streams: this.localStreams });
    } catch (error) {
      console.error('Failed to initialize media:', error);
      throw error;
    }
  }

  // Setup socket event listeners
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      this.emit('disconnected');
    });

    this.socket.on('call_request', (data) => {
      this.emit('incomingCall', data);
    });

    this.socket.on('call_accepted', (data) => {
      this.emit('callAccepted', data);
    });

    this.socket.on('call_ended', (data) => {
      this.emit('callEnded', data);
    });

    this.socket.on('participant_joined', (data) => {
      this.handleParticipantJoined(data);
    });

    this.socket.on('participant_left', (data) => {
      this.handleParticipantLeft(data);
    });

    this.socket.on('media_toggle', (data) => {
      this.handleMediaToggle(data);
    });

    this.socket.on('screen_share_start', (data) => {
      this.handleScreenShareStart(data);
    });

    this.socket.on('screen_share_stop', (data) => {
      this.handleScreenShareStop(data);
    });

    this.socket.on('webrtc_signal', (data) => {
      this.handleWebRTCSignal(data);
    });

    this.socket.on('webrtc_offer', (data) => {
      this.handleWebRTCOffer(data);
    });

    this.socket.on('webrtc_answer', (data) => {
      this.handleWebRTCAnswer(data);
    });

    this.socket.on('webrtc_ice_candidate', (data) => {
      this.handleWebRTCIceCandidate(data);
    });
  }

  // Start a call
  async startCall(targetUserId: string, options: CallOptions): Promise<void> {
    try {
      this.callState.isConnected = true;
      this.callState.isMuted = !options.audio;
      this.callState.isVideoEnabled = options.video;

      // Send call request
      this.socket?.emit('call_request', {
        targetUserId,
        callType: options.video ? 'video' : 'audio',
        options
      });

      this.emit('callStarted', { targetUserId, options });
    } catch (error) {
      console.error('Failed to start call:', error);
      throw error;
    }
  }

  // Accept a call
  async acceptCall(callId: string): Promise<void> {
    try {
      this.callState.isConnected = true;
      
      this.socket?.emit('call_accept', { callId });
      this.emit('callAccepted', { callId });
    } catch (error) {
      console.error('Failed to accept call:', error);
      throw error;
    }
  }

  // End a call
  async endCall(): Promise<void> {
    try {
      // Close all peer connections
      this.peers.forEach(peer => {
        peer.destroy();
      });
      this.peers.clear();

      // Stop all media streams
      this.stopAllMedia();

      // Reset call state
      this.callState.isConnected = false;
      this.callState.participants.clear();

      this.socket?.emit('call_end');
      this.emit('callEnded');
    } catch (error) {
      console.error('Failed to end call:', error);
      throw error;
    }
  }

  // Toggle audio mute
  toggleAudio(): void {
    if (!this.localStreams.audio) return;

    this.callState.isMuted = !this.callState.isMuted;
    this.localStreams.audio.getAudioTracks().forEach(track => {
      track.enabled = !this.callState.isMuted;
    });

    this.socket?.emit('media_toggle', {
      type: 'audio',
      enabled: !this.callState.isMuted
    });

    this.emit('audioToggled', { isMuted: this.callState.isMuted });
  }

  // Toggle video
  toggleVideo(): void {
    if (!this.localStreams.video) return;

    this.callState.isVideoEnabled = !this.callState.isVideoEnabled;
    this.localStreams.video.getVideoTracks().forEach(track => {
      track.enabled = this.callState.isVideoEnabled;
    });

    this.socket?.emit('media_toggle', {
      type: 'video',
      enabled: this.callState.isVideoEnabled
    });

    this.emit('videoToggled', { isEnabled: this.callState.isVideoEnabled });
  }

  // Start screen sharing
  async startScreenShare(): Promise<void> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      this.localStreams.screen = screenStream;
      this.callState.isScreenSharing = true;

      // Replace video track with screen share
      this.peers.forEach(peer => {
        const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenStream.getVideoTracks()[0]);
        }
      });

      this.socket?.emit('screen_share_start', {
        stream: screenStream
      });

      this.emit('screenShareStarted', { stream: screenStream });

      // Handle screen share end
      screenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };
    } catch (error) {
      console.error('Failed to start screen share:', error);
      throw error;
    }
  }

  // Stop screen sharing
  stopScreenShare(): void {
    if (!this.localStreams.screen) return;

    this.localStreams.screen.getTracks().forEach(track => track.stop());
    this.localStreams.screen = null;
    this.callState.isScreenSharing = false;

    // Restore video track
    this.peers.forEach(peer => {
      const sender = peer.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender && this.localStreams.video) {
        sender.replaceTrack(this.localStreams.video.getVideoTracks()[0]);
      }
    });

    this.socket?.emit('screen_share_stop');
    this.emit('screenShareStopped');
  }

  // Create a peer connection
  private createPeerConnection(userId: string, isInitiator: boolean): SimplePeer.Instance {
    const peer = new SimplePeer({
      initiator: isInitiator,
      trickle: false,
      config: {
        iceServers: this.config.iceServers
      }
    });

    // Add local stream
    if (this.localStreams.audio) {
      peer.addStream(this.localStreams.audio);
    }

    peer.on('signal', (data) => {
      this.socket?.emit('webrtc_signal', {
        targetUserId: userId,
        signal: data
      });
    });

    peer.on('stream', (stream) => {
      this.handleRemoteStream(userId, stream);
    });

    peer.on('error', (error) => {
      console.error('Peer connection error:', error);
      this.emit('peerError', { userId, error });
    });

    peer.on('close', () => {
      this.peers.delete(userId);
      this.callState.participants.delete(userId);
      this.emit('participantLeft', { userId });
    });

    return peer;
  }

  // Handle remote stream
  private handleRemoteStream(userId: string, stream: MediaStream): void {
    const participant = this.callState.participants.get(userId);
    if (participant) {
      participant.stream = stream;
      this.emit('remoteStream', { userId, stream });
    }
  }

  // Handle participant joined
  private handleParticipantJoined(data: any): void {
    const participant: Participant = {
      id: data.userId,
      name: data.name,
      avatar: data.avatar,
      isMuted: false,
      isVideoEnabled: true,
      isScreenSharing: false
    };

    this.callState.participants.set(data.userId, participant);
    this.emit('participantJoined', participant);
  }

  // Handle participant left
  private handleParticipantLeft(data: any): void {
    this.callState.participants.delete(data.userId);
    this.peers.delete(data.userId);
    this.emit('participantLeft', { userId: data.userId });
  }

  // Handle media toggle
  private handleMediaToggle(data: any): void {
    const participant = this.callState.participants.get(data.userId);
    if (participant) {
      if (data.type === 'audio') {
        participant.isMuted = !data.enabled;
      } else if (data.type === 'video') {
        participant.isVideoEnabled = data.enabled;
      }
      this.emit('participantMediaToggled', { userId: data.userId, type: data.type, enabled: data.enabled });
    }
  }

  // Handle screen share start
  private handleScreenShareStart(data: any): void {
    const participant = this.callState.participants.get(data.userId);
    if (participant) {
      participant.isScreenSharing = true;
      participant.screenStream = data.stream;
      this.emit('participantScreenShareStarted', { userId: data.userId, stream: data.stream });
    }
  }

  // Handle screen share stop
  private handleScreenShareStop(data: any): void {
    const participant = this.callState.participants.get(data.userId);
    if (participant) {
      participant.isScreenSharing = false;
      participant.screenStream = undefined;
      this.emit('participantScreenShareStopped', { userId: data.userId });
    }
  }

  // Handle WebRTC signal
  private handleWebRTCSignal(data: any): void {
    const peer = this.peers.get(data.fromUserId);
    if (peer) {
      peer.signal(data.signal);
    }
  }

  // Handle WebRTC offer
  private handleWebRTCOffer(data: any): void {
    const peer = this.createPeerConnection(data.fromUserId, false);
    peer.signal(data.offer);
    this.peers.set(data.fromUserId, peer);
  }

  // Handle WebRTC answer
  private handleWebRTCAnswer(data: any): void {
    const peer = this.peers.get(data.fromUserId);
    if (peer) {
      peer.signal(data.answer);
    }
  }

  // Handle WebRTC ICE candidate
  private handleWebRTCIceCandidate(data: any): void {
    const peer = this.peers.get(data.fromUserId);
    if (peer) {
      peer.signal(data.candidate);
    }
  }

  // Stop all media streams
  private stopAllMedia(): void {
    Object.values(this.localStreams).forEach(stream => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    });
    this.localStreams = { audio: null, video: null, screen: null };
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Get current call state
  getCallState(): CallState {
    return { ...this.callState };
  }

  // Get local streams
  getLocalStreams(): MediaStreams {
    return { ...this.localStreams };
  }

  // Cleanup
  destroy(): void {
    this.stopAllMedia();
    this.peers.forEach(peer => peer.destroy());
    this.peers.clear();
    this.socket?.disconnect();
    this.eventListeners.clear();
  }
}

// Default configuration
export const defaultWebRTCConfig: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  socketUrl: window.location.origin
};

// Create singleton instance
export const webrtcService = new WebRTCService(defaultWebRTCConfig);