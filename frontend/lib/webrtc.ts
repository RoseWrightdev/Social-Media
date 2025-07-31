/**
 * WebRTC client for peer-to-peer video conferencing
 * Integrates with WebSocket signaling for connection establishment
 */

import { WebSocketClient, ClientInfo, WebRTCOfferPayload, WebRTCAnswerPayload, WebRTCCandidatePayload, WebRTCRenegotiatePayload } from './websockets';

// WebRTC Configuration
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  video: boolean | MediaTrackConstraints;
  audio: boolean | MediaTrackConstraints;
  screenshare?: boolean;
}

// Default STUN/TURN servers (you should replace with your own in production)
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

// Peer Connection States
export type PeerConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

// Media Stream Types
export type StreamType = 'camera' | 'screen' | 'audio';

// Event Types
export type PeerEventType = 
  | 'stream-added'
  | 'stream-removed' 
  | 'connection-state-changed'
  | 'ice-candidate'
  | 'negotiation-needed'
  | 'data-channel-message';

// Event Handlers
export type StreamEventHandler = (stream: MediaStream, peerId: string, streamType: StreamType) => void;
export type ConnectionStateHandler = (state: PeerConnectionState, peerId: string) => void;
export type ICECandidateHandler = (candidate: RTCIceCandidate, peerId: string) => void;
export type NegotiationNeededHandler = (peerId: string) => void;
export type DataChannelMessageHandler = (message: any, peerId: string) => void;

/**
 * Manages a single peer-to-peer connection
 */
export class PeerConnection {
  private pc: RTCPeerConnection;
  private peerId: string;
  private localClientInfo: ClientInfo;
  private websocketClient: WebSocketClient;
  private dataChannel: RTCDataChannel | null = null;
  private localStreams = new Map<StreamType, MediaStream>();
  private remoteStreams = new Map<StreamType, MediaStream>();
  
  // Event handlers
  private streamAddedHandlers: StreamEventHandler[] = [];
  private streamRemovedHandlers: StreamEventHandler[] = [];
  private connectionStateHandlers: ConnectionStateHandler[] = [];
  private iceCandidateHandlers: ICECandidateHandler[] = [];
  private negotiationNeededHandlers: NegotiationNeededHandler[] = [];
  private dataChannelMessageHandlers: DataChannelMessageHandler[] = [];

  constructor(
    peerId: string,
    localClientInfo: ClientInfo,
    websocketClient: WebSocketClient,
    config: WebRTCConfig
  ) {
    this.peerId = peerId;
    this.localClientInfo = localClientInfo;
    this.websocketClient = websocketClient;

    // Create peer connection
    this.pc = new RTCPeerConnection({
      iceServers: config.iceServers || DEFAULT_ICE_SERVERS,
      iceCandidatePoolSize: 10,
    });

    this.setupPeerConnectionEvents();
    this.createDataChannel();
  }

  /**
   * Add local media stream (camera/microphone)
   */
  async addLocalStream(stream: MediaStream, streamType: StreamType = 'camera'): Promise<void> {
    try {
      // Remove existing stream of this type
      if (this.localStreams.has(streamType)) {
        await this.removeLocalStream(streamType);
      }

      // Add all tracks to peer connection
      stream.getTracks().forEach(track => {
        this.pc.addTrack(track, stream);
      });

      this.localStreams.set(streamType, stream);
      console.log(`Added local ${streamType} stream to peer ${this.peerId}`);
      
      // This will trigger negotiationneeded event
    } catch (error) {
      console.error(`Failed to add local ${streamType} stream:`, error);
      throw error;
    }
  }

  /**
   * Remove local media stream
   */
  async removeLocalStream(streamType: StreamType): Promise<void> {
    const stream = this.localStreams.get(streamType);
    if (!stream) return;

    try {
      // Remove tracks from peer connection
      const senders = this.pc.getSenders();
      stream.getTracks().forEach(track => {
        const sender = senders.find(s => s.track === track);
        if (sender) {
          this.pc.removeTrack(sender);
        }
        track.stop();
      });

      this.localStreams.delete(streamType);
      console.log(`Removed local ${streamType} stream from peer ${this.peerId}`);
      
      // This will trigger negotiationneeded event
    } catch (error) {
      console.error(`Failed to remove local ${streamType} stream:`, error);
      throw error;
    }
  }

  /**
   * Create and send WebRTC offer
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    try {
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      
      await this.pc.setLocalDescription(offer);
      
      // Send offer through WebSocket
      this.websocketClient.sendWebRTCOffer(offer, this.peerId, this.localClientInfo);
      
      console.log(`Created and sent offer to peer ${this.peerId}`);
      return offer;
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming WebRTC offer
   */
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    try {
      await this.pc.setRemoteDescription(offer);
      
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      
      // Send answer through WebSocket
      this.websocketClient.sendWebRTCAnswer(answer, this.peerId, this.localClientInfo);
      
      console.log(`Created and sent answer to peer ${this.peerId}`);
      return answer;
    } catch (error) {
      console.error('Failed to handle offer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming WebRTC answer
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      await this.pc.setRemoteDescription(answer);
      console.log(`Set remote description from peer ${this.peerId}`);
    } catch (error) {
      console.error('Failed to handle answer:', error);
      throw error;
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleICECandidate(candidateData: { candidate: string; sdpMid?: string; sdpMLineIndex?: number }): Promise<void> {
    try {
      const candidate = new RTCIceCandidate({
        candidate: candidateData.candidate,
        sdpMid: candidateData.sdpMid || null,
        sdpMLineIndex: candidateData.sdpMLineIndex ?? null,
      });
      
      await this.pc.addIceCandidate(candidate);
      console.log(`Added ICE candidate from peer ${this.peerId}`);
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
      throw error;
    }
  }

  /**
   * Request connection renegotiation
   */
  async requestRenegotiation(reason: string): Promise<void> {
    try {
      this.websocketClient.requestRenegotiation(this.peerId, reason, this.localClientInfo);
      console.log(`Requested renegotiation with peer ${this.peerId}: ${reason}`);
    } catch (error) {
      console.error('Failed to request renegotiation:', error);
      throw error;
    }
  }

  /**
   * Send data through data channel
   */
  sendData(data: any): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(data));
      } catch (error) {
        console.error('Failed to send data:', error);
      }
    } else {
      console.warn('Data channel not available or not open');
    }
  }

  /**
   * Get remote streams
   */
  getRemoteStreams(): Map<StreamType, MediaStream> {
    return new Map(this.remoteStreams);
  }

  /**
   * Get local streams
   */
  getLocalStreams(): Map<StreamType, MediaStream> {
    return new Map(this.localStreams);
  }

  /**
   * Get connection state
   */
  getConnectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }

  /**
   * Get connection stats
   */
  async getStats(): Promise<RTCStatsReport> {
    return await this.pc.getStats();
  }

  /**
   * Close the peer connection
   */
  close(): void {
    try {
      // Stop all local streams
      this.localStreams.forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      this.localStreams.clear();

      // Close data channel
      if (this.dataChannel) {
        this.dataChannel.close();
        this.dataChannel = null;
      }

      // Close peer connection
      this.pc.close();
      
      console.log(`Closed peer connection with ${this.peerId}`);
    } catch (error) {
      console.error('Error closing peer connection:', error);
    }
  }

  // Event subscription methods
  onStreamAdded(handler: StreamEventHandler): void {
    this.streamAddedHandlers.push(handler);
  }

  onStreamRemoved(handler: StreamEventHandler): void {
    this.streamRemovedHandlers.push(handler);
  }

  onConnectionStateChanged(handler: ConnectionStateHandler): void {
    this.connectionStateHandlers.push(handler);
  }

  onICECandidate(handler: ICECandidateHandler): void {
    this.iceCandidateHandlers.push(handler);
  }

  onNegotiationNeeded(handler: NegotiationNeededHandler): void {
    this.negotiationNeededHandlers.push(handler);
  }

  onDataChannelMessage(handler: DataChannelMessageHandler): void {
    this.dataChannelMessageHandlers.push(handler);
  }

  // Private methods
  private setupPeerConnectionEvents(): void {
    // ICE candidate event
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate through WebSocket
        this.websocketClient.sendICECandidate(event.candidate, this.peerId, this.localClientInfo);
        
        // Notify handlers
        this.iceCandidateHandlers.forEach(handler => {
          try {
            handler(event.candidate!, this.peerId);
          } catch (error) {
            console.error('Error in ICE candidate handler:', error);
          }
        });
      }
    };

    // Remote stream event
    this.pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        // Determine stream type based on track types
        const hasVideo = stream.getVideoTracks().length > 0;
        const hasAudio = stream.getAudioTracks().length > 0;
        
        let streamType: StreamType = 'camera';
        if (hasVideo && !hasAudio) {
          streamType = 'screen'; // Likely screen share
        } else if (!hasVideo && hasAudio) {
          streamType = 'audio';
        }

        this.remoteStreams.set(streamType, stream);
        
        // Notify handlers
        this.streamAddedHandlers.forEach(handler => {
          try {
            handler(stream, this.peerId, streamType);
          } catch (error) {
            console.error('Error in stream added handler:', error);
          }
        });

        console.log(`Received remote ${streamType} stream from peer ${this.peerId}`);
      }
    };

    // Connection state change
    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState as PeerConnectionState;
      
      this.connectionStateHandlers.forEach(handler => {
        try {
          handler(state, this.peerId);
        } catch (error) {
          console.error('Error in connection state handler:', error);
        }
      });

      console.log(`Peer ${this.peerId} connection state: ${state}`);
    };

    // ICE connection state change
    this.pc.oniceconnectionstatechange = () => {
      console.log(`Peer ${this.peerId} ICE connection state: ${this.pc.iceConnectionState}`);
    };

    // Negotiation needed
    this.pc.onnegotiationneeded = () => {
      this.negotiationNeededHandlers.forEach(handler => {
        try {
          handler(this.peerId);
        } catch (error) {
          console.error('Error in negotiation needed handler:', error);
        }
      });

      console.log(`Negotiation needed for peer ${this.peerId}`);
    };

    // Data channel from remote peer
    this.pc.ondatachannel = (event) => {
      const channel = event.channel;
      this.setupDataChannelEvents(channel);
    };
  }

  private createDataChannel(): void {
    try {
      this.dataChannel = this.pc.createDataChannel('data', {
        ordered: true,
        maxRetransmits: 3,
      });
      
      this.setupDataChannelEvents(this.dataChannel);
    } catch (error) {
      console.error('Failed to create data channel:', error);
    }
  }

  private setupDataChannelEvents(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log(`Data channel opened with peer ${this.peerId}`);
    };

    channel.onclose = () => {
      console.log(`Data channel closed with peer ${this.peerId}`);
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.dataChannelMessageHandlers.forEach(handler => {
          try {
            handler(data, this.peerId);
          } catch (error) {
            console.error('Error in data channel message handler:', error);
          }
        });
      } catch (error) {
        console.error('Failed to parse data channel message:', error);
      }
    };

    channel.onerror = (error) => {
      console.error(`Data channel error with peer ${this.peerId}:`, error);
    };
  }
}

/**
 * WebRTC Manager - handles multiple peer connections and media streams
 */
export class WebRTCManager {
  private peers = new Map<string, PeerConnection>();
  private localClientInfo: ClientInfo;
  private websocketClient: WebSocketClient;
  private config: WebRTCConfig;
  private localMediaStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;

  // Event handlers
  private streamAddedHandlers: StreamEventHandler[] = [];
  private streamRemovedHandlers: StreamEventHandler[] = [];
  private connectionStateHandlers: ConnectionStateHandler[] = [];

  constructor(
    localClientInfo: ClientInfo,
    websocketClient: WebSocketClient,
    config: Partial<WebRTCConfig> = {}
  ) {
    this.localClientInfo = localClientInfo;
    this.websocketClient = websocketClient;
    this.config = {
      iceServers: DEFAULT_ICE_SERVERS,
      video: true,
      audio: true,
      screenshare: false,
      ...config,
    };

    this.setupWebSocketHandlers();
  }

  /**
   * Initialize local media stream (camera/microphone)
   */
  async initializeLocalMedia(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: this.config.video,
        audio: this.config.audio,
      });

      this.localMediaStream = stream;
      
      // Add stream to all existing peers
      for (const peer of this.peers.values()) {
        await peer.addLocalStream(stream, 'camera');
      }

      console.log('Local media stream initialized');
      return stream;
    } catch (error) {
      console.error('Failed to initialize local media:', error);
      throw error;
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      this.localScreenStream = stream;
      
      // Add screen share to all existing peers
      for (const peer of this.peers.values()) {
        await peer.addLocalStream(stream, 'screen');
        await peer.requestRenegotiation('screen sharing started');
      }

      // Handle screen share end
      stream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      console.log('Screen sharing started');
      return stream;
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    if (!this.localScreenStream) return;

    try {
      // Remove screen share from all peers
      for (const peer of this.peers.values()) {
        await peer.removeLocalStream('screen');
        await peer.requestRenegotiation('screen sharing stopped');
      }

      // Stop local screen stream
      this.localScreenStream.getTracks().forEach(track => track.stop());
      this.localScreenStream = null;

      console.log('Screen sharing stopped');
    } catch (error) {
      console.error('Failed to stop screen sharing:', error);
      throw error;
    }
  }

  /**
   * Add a new peer connection
   */
  async addPeer(peerId: string, initiateConnection = false): Promise<PeerConnection> {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId)!;
    }

    const peer = new PeerConnection(
      peerId,
      this.localClientInfo,
      this.websocketClient,
      this.config
    );

    // Setup event handlers
    peer.onStreamAdded((stream, peerId, streamType) => {
      this.streamAddedHandlers.forEach(handler => handler(stream, peerId, streamType));
    });

    peer.onStreamRemoved((stream, peerId, streamType) => {
      this.streamRemovedHandlers.forEach(handler => handler(stream, peerId, streamType));
    });

    peer.onConnectionStateChanged((state, peerId) => {
      this.connectionStateHandlers.forEach(handler => handler(state, peerId));
    });

    this.peers.set(peerId, peer);

    // Add existing local media streams
    if (this.localMediaStream) {
      await peer.addLocalStream(this.localMediaStream, 'camera');
    }
    if (this.localScreenStream) {
      await peer.addLocalStream(this.localScreenStream, 'screen');
    }

    // Initiate connection if requested
    if (initiateConnection) {
      await peer.createOffer();
    }

    console.log(`Added peer ${peerId}`);
    return peer;
  }

  /**
   * Remove a peer connection
   */
  removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.close();
      this.peers.delete(peerId);
      console.log(`Removed peer ${peerId}`);
    }
  }

  /**
   * Get a specific peer connection
   */
  getPeer(peerId: string): PeerConnection | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Get all peer connections
   */
  getAllPeers(): Map<string, PeerConnection> {
    return new Map(this.peers);
  }

  /**
   * Mute/unmute local audio
   */
  toggleAudio(enabled: boolean): void {
    if (this.localMediaStream) {
      this.localMediaStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Enable/disable local video
   */
  toggleVideo(enabled: boolean): void {
    if (this.localMediaStream) {
      this.localMediaStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Get local media stream
   */
  getLocalMediaStream(): MediaStream | null {
    return this.localMediaStream;
  }

  /**
   * Get local screen stream
   */
  getLocalScreenStream(): MediaStream | null {
    return this.localScreenStream;
  }

  /**
   * Clean up all connections and streams
   */
  cleanup(): void {
    // Close all peer connections
    this.peers.forEach(peer => peer.close());
    this.peers.clear();

    // Stop local streams
    if (this.localMediaStream) {
      this.localMediaStream.getTracks().forEach(track => track.stop());
      this.localMediaStream = null;
    }
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(track => track.stop());
      this.localScreenStream = null;
    }

    console.log('WebRTC manager cleaned up');
  }

  // Event subscription methods
  onStreamAdded(handler: StreamEventHandler): void {
    this.streamAddedHandlers.push(handler);
  }

  onStreamRemoved(handler: StreamEventHandler): void {
    this.streamRemovedHandlers.push(handler);
  }

  onConnectionStateChanged(handler: ConnectionStateHandler): void {
    this.connectionStateHandlers.push(handler);
  }

  // Private methods
  private setupWebSocketHandlers(): void {
    // Handle incoming WebRTC offers
    this.websocketClient.on('offer', async (message) => {
      const payload = message.payload as WebRTCOfferPayload;
      if (payload.targetClientId === this.localClientInfo.clientId) {
        const peer = await this.addPeer(payload.clientId, false);
        await peer.handleOffer({ type: 'offer', sdp: payload.sdp });
      }
    });

    // Handle incoming WebRTC answers
    this.websocketClient.on('answer', async (message) => {
      const payload = message.payload as WebRTCAnswerPayload;
      if (payload.targetClientId === this.localClientInfo.clientId) {
        const peer = this.getPeer(payload.clientId);
        if (peer) {
          await peer.handleAnswer({ type: 'answer', sdp: payload.sdp });
        }
      }
    });

    // Handle incoming ICE candidates
    this.websocketClient.on('candidate', async (message) => {
      const payload = message.payload as WebRTCCandidatePayload;
      if (payload.targetClientId === this.localClientInfo.clientId) {
        const peer = this.getPeer(payload.clientId);
        if (peer) {
          await peer.handleICECandidate({
            candidate: payload.candidate,
            sdpMid: payload.sdpMid,
            sdpMLineIndex: payload.sdpMLineIndex,
          });
        }
      }
    });

    // Handle renegotiation requests
    this.websocketClient.on('renegotiate', async (message) => {
      const payload = message.payload as WebRTCRenegotiatePayload;
      if (payload.targetClientId === this.localClientInfo.clientId) {
        const peer = this.getPeer(payload.clientId);
        if (peer) {
          // Re-create offer for renegotiation
          await peer.createOffer();
          console.log(`Renegotiation requested by ${payload.clientId}: ${payload.reason}`);
        }
      }
    });
  }
}

/**
 * Utility functions for media device management
 */
export const MediaDeviceUtils = {
  /**
   * Get available media devices
   */
  async getDevices(): Promise<MediaDeviceInfo[]> {
    try {
      return await navigator.mediaDevices.enumerateDevices();
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  },

  /**
   * Get video input devices (cameras)
   */
  async getVideoDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await this.getDevices();
    return devices.filter(device => device.kind === 'videoinput');
  },

  /**
   * Get audio input devices (microphones)
   */
  async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await this.getDevices();
    return devices.filter(device => device.kind === 'audioinput');
  },

  /**
   * Get audio output devices (speakers)
   */
  async getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await this.getDevices();
    return devices.filter(device => device.kind === 'audiooutput');
  },

  /**
   * Request permissions for media devices
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Failed to request media permissions:', error);
      return false;
    }
  },

  /**
   * Check if screen sharing is supported
   */
  isScreenShareSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  },
};

export default WebRTCManager;
