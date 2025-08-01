/**
 * @fileoverview WebRTC Client for Peer-to-Peer Video Conferencing
 * 
 * This module provides a complete WebRTC implementation for real-time video conferencing
 * with support for multiple participants, screen sharing, and data channels. It integrates
 * with the WebSocket signaling server for connection establishment and negotiation.
 * 
 * Key Features:
 * - Multi-peer video/audio streaming
 * - Screen sharing with automatic cleanup
 * - Data channel communication
 * - ICE candidate exchange
 * - Connection state management
 * - Media device enumeration and control
 * 
 * @example
 * ```typescript
 * const manager = new WebRTCManager(clientInfo, websocketClient);
 * await manager.initializeLocalMedia();
 * await manager.addPeer('peer-id', true);
 * ```
 * 
 * @author Social Media Platform Team
 * @version 1.0.0
 */

import { WebSocketClient, ClientInfo, WebRTCOfferPayload, WebRTCAnswerPayload, WebRTCCandidatePayload, WebRTCRenegotiatePayload } from './websockets';

/**
 * Configuration options for WebRTC connections
 * 
 * @interface WebRTCConfig
 * @property {RTCIceServer[]} iceServers - STUN/TURN servers for NAT traversal
 * @property {boolean | MediaTrackConstraints} video - Video stream configuration
 * @property {boolean | MediaTrackConstraints} audio - Audio stream configuration
 * @property {boolean} [screenshare] - Enable screen sharing support
 */
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  video: boolean | MediaTrackConstraints;
  audio: boolean | MediaTrackConstraints;
  screenshare?: boolean;
}

/**
 * Default STUN servers for ICE candidate gathering
 * 
 * @note In production, replace with your own TURN servers for better connectivity
 * @see https://webrtc.org/getting-started/turn-server
 */
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

/**
 * WebRTC peer connection states
 * @typedef {'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed'} PeerConnectionState
 */
export type PeerConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

/**
 * Media stream types for classification
 * @typedef {'camera' | 'screen' | 'audio'} StreamType
 */
export type StreamType = 'camera' | 'screen' | 'audio';

/**
 * WebRTC event types for event handling
 * @typedef {('stream-added' | 'stream-removed' | 'connection-state-changed' | 'ice-candidate' | 'negotiation-needed' | 'data-channel-message')} PeerEventType
 */
export type PeerEventType = 
  | 'stream-added'
  | 'stream-removed' 
  | 'connection-state-changed'
  | 'ice-candidate'
  | 'negotiation-needed'
  | 'data-channel-message';

/**
 * Event handler for stream events
 * @callback StreamEventHandler
 * @param {MediaStream} stream - The media stream
 * @param {string} peerId - The peer identifier
 * @param {StreamType} streamType - Type of the stream
 */
export type StreamEventHandler = (stream: MediaStream, peerId: string, streamType: StreamType) => void;

/**
 * Event handler for connection state changes
 * @callback ConnectionStateHandler
 * @param {PeerConnectionState} state - New connection state
 * @param {string} peerId - The peer identifier
 */
export type ConnectionStateHandler = (state: PeerConnectionState, peerId: string) => void;

/**
 * Event handler for ICE candidate events
 * @callback ICECandidateHandler
 * @param {RTCIceCandidate} candidate - The ICE candidate
 * @param {string} peerId - The peer identifier
 */
export type ICECandidateHandler = (candidate: RTCIceCandidate, peerId: string) => void;

/**
 * Event handler for negotiation needed events
 * @callback NegotiationNeededHandler
 * @param {string} peerId - The peer identifier
 */
export type NegotiationNeededHandler = (peerId: string) => void;

/**
 * Event handler for data channel messages
 * @callback DataChannelMessageHandler
 * @param {any} message - The received message
 * @param {string} peerId - The peer identifier
 */
export type DataChannelMessageHandler = (message: any, peerId: string) => void;

/**
 * Manages a single peer-to-peer WebRTC connection
 * 
 * This class handles all aspects of a WebRTC connection with a single remote peer,
 * including media stream management, ICE candidate exchange, data channels, and
 * connection state monitoring.
 * 
 * @class PeerConnection
 * @example
 * ```typescript
 * const peer = new PeerConnection('peer-123', clientInfo, wsClient, config);
 * await peer.addLocalStream(mediaStream, 'camera');
 * await peer.createOffer();
 * ```
 */
export class PeerConnection {
  /** The underlying RTCPeerConnection instance */
  private pc: RTCPeerConnection;
  
  /** Unique identifier for this peer */
  private peerId: string;
  
  /** Local client information */
  private localClientInfo: ClientInfo;
  
  /** WebSocket client for signaling */
  private websocketClient: WebSocketClient;
  
  /** Data channel for peer-to-peer messaging */
  private dataChannel: RTCDataChannel | null = null;
  
  /** Map of local media streams by type */
  private localStreams = new Map<StreamType, MediaStream>();
  
  /** Map of remote media streams by type */
  /** Map of remote media streams by type */
  private remoteStreams = new Map<StreamType, MediaStream>();
  
  /** Event handlers for stream addition */
  private streamAddedHandlers: StreamEventHandler[] = [];
  
  /** Event handlers for stream removal */
  private streamRemovedHandlers: StreamEventHandler[] = [];
  
  /** Event handlers for connection state changes */
  private connectionStateHandlers: ConnectionStateHandler[] = [];
  
  /** Event handlers for ICE candidates */
  private iceCandidateHandlers: ICECandidateHandler[] = [];
  
  /** Event handlers for negotiation needed events */
  private negotiationNeededHandlers: NegotiationNeededHandler[] = [];
  
  /** Event handlers for data channel messages */
  private dataChannelMessageHandlers: DataChannelMessageHandler[] = [];

  /**
   * Creates a new peer connection instance
   * 
   * @param {string} peerId - Unique identifier for the remote peer
   * @param {ClientInfo} localClientInfo - Information about the local client
   * @param {WebSocketClient} websocketClient - WebSocket client for signaling
   * @param {WebRTCConfig} config - WebRTC configuration options
   */
  constructor(
    peerId: string,
    localClientInfo: ClientInfo,
    websocketClient: WebSocketClient,
    config: WebRTCConfig
  ) {
    this.peerId = peerId;
    this.localClientInfo = localClientInfo;
    this.websocketClient = websocketClient;

    // Create peer connection with ICE servers and optimization settings
    this.pc = new RTCPeerConnection({
      iceServers: config.iceServers || DEFAULT_ICE_SERVERS,
      iceCandidatePoolSize: 10, // Pre-gather ICE candidates for faster connection
    });

    this.setupPeerConnectionEvents();
    this.createDataChannel();
  }

  /**
   * Adds a local media stream to the peer connection
   * 
   * This method adds all tracks from the provided stream to the peer connection
   * and triggers renegotiation if necessary. If a stream of the same type already
   * exists, it will be replaced.
   * 
   * @param {MediaStream} stream - The media stream to add
   * @param {StreamType} [streamType='camera'] - Type of the stream being added
   * @returns {Promise<void>} Promise that resolves when the stream is added
   * @throws {Error} If the stream cannot be added to the peer connection
   * 
   * @example
   * ```typescript
   * const stream = await navigator.mediaDevices.getUserMedia({ video: true });
   * await peer.addLocalStream(stream, 'camera');
   * ```
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
      
      // This will trigger negotiationneeded event automatically
    } catch (error) {
      console.error(`Failed to add local ${streamType} stream:`, error);
      throw error;
    }
  }

  /**
   * Removes a local media stream from the peer connection
   * 
   * This method removes all tracks of the specified stream type from the peer
   * connection and stops the tracks to free up media resources.
   * 
   * @param {StreamType} streamType - Type of stream to remove
   * @returns {Promise<void>} Promise that resolves when the stream is removed
   * @throws {Error} If the stream cannot be removed from the peer connection
   * 
   * @example
   * ```typescript
   * await peer.removeLocalStream('camera');
   * ```
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
      
      // This will trigger negotiationneeded event automatically
    } catch (error) {
      console.error(`Failed to remove local ${streamType} stream:`, error);
      throw error;
    }
  }

  /**
   * Creates and sends a WebRTC offer to the remote peer
   * 
   * This method creates an SDP offer, sets it as the local description,
   * and sends it to the remote peer through the WebSocket connection.
   * 
   * @returns {Promise<RTCSessionDescriptionInit>} Promise that resolves with the created offer
   * @throws {Error} If the offer cannot be created or sent
   * 
   * @example
   * ```typescript
   * const offer = await peer.createOffer();
   * console.log('Offer sent:', offer);
   * ```
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    try {
      const offer = await this.pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      
      await this.pc.setLocalDescription(offer);
      
      // Send offer through WebSocket signaling
      this.websocketClient.sendWebRTCOffer(offer, this.peerId, this.localClientInfo);
      
      console.log(`Created and sent offer to peer ${this.peerId}`);
      return offer;
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  /**
   * Handles an incoming WebRTC offer from a remote peer
   * 
   * This method processes an incoming offer by setting it as the remote description,
   * creating an answer, and sending the answer back to the remote peer.
   * 
   * @param {RTCSessionDescriptionInit} offer - The incoming offer to process
   * @returns {Promise<RTCSessionDescriptionInit>} Promise that resolves with the created answer
   * @throws {Error} If the offer cannot be processed or answer cannot be created
   * 
   * @example
   * ```typescript
   * const answer = await peer.handleOffer(incomingOffer);
   * console.log('Answer sent:', answer);
   * ```
   */
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    try {
      await this.pc.setRemoteDescription(offer);
      
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      
      // Send answer through WebSocket signaling
      this.websocketClient.sendWebRTCAnswer(answer, this.peerId, this.localClientInfo);
      
      console.log(`Created and sent answer to peer ${this.peerId}`);
      return answer;
    } catch (error) {
      console.error('Failed to handle offer:', error);
      throw error;
    }
  }

  /**
   * Handles an incoming WebRTC answer from a remote peer
   * 
   * This method processes an incoming answer by setting it as the remote description,
   * completing the connection establishment process.
   * 
   * @param {RTCSessionDescriptionInit} answer - The incoming answer to process
   * @returns {Promise<void>} Promise that resolves when the answer is processed
   * @throws {Error} If the answer cannot be processed
   * 
   * @example
   * ```typescript
   * await peer.handleAnswer(incomingAnswer);
   * console.log('Connection established');
   * ```
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
   * Handles an incoming ICE candidate from a remote peer
   * 
   * ICE candidates are used for NAT traversal and connectivity establishment.
   * This method adds the candidate to the peer connection for network discovery.
   * 
   * @param {Object} candidateData - The ICE candidate data
   * @param {string} candidateData.candidate - The candidate string
   * @param {string} [candidateData.sdpMid] - The media stream identification
   * @param {number} [candidateData.sdpMLineIndex] - The media line index
   * @returns {Promise<void>} Promise that resolves when the candidate is added
   * @throws {Error} If the candidate cannot be added
   * 
   * @example
   * ```typescript
   * await peer.handleICECandidate({
   *   candidate: 'candidate:...',
   *   sdpMid: 'video',
   *   sdpMLineIndex: 0
   * });
   * ```
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
   * Requests connection renegotiation with the remote peer
   * 
   * Renegotiation is needed when the media configuration changes (e.g., screen sharing).
   * This method sends a renegotiation request through the WebSocket connection.
   * 
   * @param {string} reason - Reason for requesting renegotiation
   * @returns {Promise<void>} Promise that resolves when the request is sent
   * @throws {Error} If the renegotiation request fails
   * 
   * @example
   * ```typescript
   * await peer.requestRenegotiation('screen sharing started');
   * ```
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
   * Sends data through the peer-to-peer data channel
   * 
   * The data channel allows direct communication between peers without going
   * through the server. Data is automatically serialized to JSON.
   * 
   * @param {any} data - Data to send through the data channel
   * @returns {void}
   * 
   * @example
   * ```typescript
   * peer.sendData({ type: 'chat', message: 'Hello!' });
   * peer.sendData({ type: 'cursor', x: 100, y: 200 });
   * ```
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
   * Gets a copy of all remote media streams
   * 
   * @returns {Map<StreamType, MediaStream>} Map of stream types to media streams
   * 
   * @example
   * ```typescript
   * const streams = peer.getRemoteStreams();
   * const cameraStream = streams.get('camera');
   * ```
   */
  getRemoteStreams(): Map<StreamType, MediaStream> {
    return new Map(this.remoteStreams);
  }

  /**
   * Gets a copy of all local media streams
   * 
   * @returns {Map<StreamType, MediaStream>} Map of stream types to media streams
   * 
   * @example
   * ```typescript
   * const streams = peer.getLocalStreams();
   * const screenStream = streams.get('screen');
   * ```
   */
  getLocalStreams(): Map<StreamType, MediaStream> {
    return new Map(this.localStreams);
  }

  /**
   * Gets the current WebRTC connection state
   * 
   * @returns {RTCPeerConnectionState} Current connection state
   * 
   * @example
   * ```typescript
   * const state = peer.getConnectionState();
   * if (state === 'connected') {
   *   console.log('Peer is connected');
   * }
   * ```
   */
  getConnectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }

  /**
   * Gets connection statistics for monitoring and debugging
   * 
   * @returns {Promise<RTCStatsReport>} Promise that resolves with connection stats
   * 
   * @example
   * ```typescript
   * const stats = await peer.getStats();
   * stats.forEach(report => {
   *   if (report.type === 'inbound-rtp') {
   *     console.log('Bytes received:', report.bytesReceived);
   *   }
   * });
   * ```
   */
  async getStats(): Promise<RTCStatsReport> {
    return await this.pc.getStats();
  }

  /**
   * Closes the peer connection and cleans up all resources
   * 
   * This method stops all media tracks, closes the data channel, and terminates
   * the peer connection. Should be called when the peer leaves the room.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * peer.close();
   * console.log('Peer connection closed');
   * ```
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

  /**
   * Registers an event handler for stream addition events
   * 
   * @param {StreamEventHandler} handler - Function to call when a stream is added
   * @returns {void}
   * 
   * @example
   * ```typescript
   * peer.onStreamAdded((stream, peerId, streamType) => {
   *   console.log(`New ${streamType} stream from ${peerId}`);
   *   videoElement.srcObject = stream;
   * });
   * ```
   */
  onStreamAdded(handler: StreamEventHandler): void {
    this.streamAddedHandlers.push(handler);
  }

  /**
   * Registers an event handler for stream removal events
   * 
   * @param {StreamEventHandler} handler - Function to call when a stream is removed
   * @returns {void}
   */
  onStreamRemoved(handler: StreamEventHandler): void {
    this.streamRemovedHandlers.push(handler);
  }

  /**
   * Registers an event handler for connection state changes
   * 
   * @param {ConnectionStateHandler} handler - Function to call when connection state changes
   * @returns {void}
   * 
   * @example
   * ```typescript
   * peer.onConnectionStateChanged((state, peerId) => {
   *   if (state === 'failed') {
   *     console.log(`Connection failed with ${peerId}`);
   *   }
   * });
   * ```
   */
  onConnectionStateChanged(handler: ConnectionStateHandler): void {
    this.connectionStateHandlers.push(handler);
  }

  /**
   * Registers an event handler for ICE candidate events
   * 
   * @param {ICECandidateHandler} handler - Function to call when ICE candidates are generated
   * @returns {void}
   */
  onICECandidate(handler: ICECandidateHandler): void {
    this.iceCandidateHandlers.push(handler);
  }

  /**
   * Registers an event handler for negotiation needed events
   * 
   * @param {NegotiationNeededHandler} handler - Function to call when negotiation is needed
   * @returns {void}
   */
  onNegotiationNeeded(handler: NegotiationNeededHandler): void {
    this.negotiationNeededHandlers.push(handler);
  }

  /**
   * Registers an event handler for data channel messages
   * 
   * @param {DataChannelMessageHandler} handler - Function to call when data is received
   * @returns {void}
   * 
   * @example
   * ```typescript
   * peer.onDataChannelMessage((message, peerId) => {
   *   if (message.type === 'chat') {
   *     displayMessage(message.text, peerId);
   *   }
   * });
   * ```
   */
  onDataChannelMessage(handler: DataChannelMessageHandler): void {
    this.dataChannelMessageHandlers.push(handler);
  }

  /**
   * @private
   * Sets up event handlers for the RTCPeerConnection
   * 
   * This method configures all the necessary event listeners for WebRTC events
   * including ICE candidates, remote streams, connection state changes, and negotiation.
   * 
   * @returns {void}
   */
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

  /**
   * @private
   * Creates a data channel for peer-to-peer communication
   * 
   * The data channel enables direct messaging between peers without server relay.
   * It's configured with reliable delivery and retransmission.
   * 
   * @returns {void}
   */
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

  /**
   * @private
   * Sets up event handlers for data channel communication
   * 
   * @param {RTCDataChannel} channel - The data channel to configure
   * @returns {void}
   */
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
 * WebRTC Manager - Orchestrates multiple peer connections and media streams
 * 
 * This class provides a high-level interface for managing WebRTC connections
 * in a multi-participant video conference. It handles local media acquisition,
 * peer connection lifecycle, screen sharing, and event coordination.
 * 
 * @class WebRTCManager
 * @example
 * ```typescript
 * const manager = new WebRTCManager(clientInfo, websocketClient, {
 *   video: { width: 1280, height: 720 },
 *   audio: { echoCancellation: true }
 * });
 * 
 * await manager.initializeLocalMedia();
 * await manager.addPeer('peer-123', true);
 * await manager.startScreenShare();
 * ```
 */
export class WebRTCManager {
  /** Map of peer IDs to their connection instances */
  private peers = new Map<string, PeerConnection>();
  
  /** Local client information */
  private localClientInfo: ClientInfo;
  
  /** WebSocket client for signaling */
  private websocketClient: WebSocketClient;
  
  /** WebRTC configuration options */
  private config: WebRTCConfig;
  
  /** Local camera/microphone stream */
  private localMediaStream: MediaStream | null = null;
  
  /** Local screen sharing stream */
  /** Local screen sharing stream */
  private localScreenStream: MediaStream | null = null;

  /** Event handlers for stream addition across all peers */
  private streamAddedHandlers: StreamEventHandler[] = [];
  
  /** Event handlers for stream removal across all peers */
  private streamRemovedHandlers: StreamEventHandler[] = [];
  
  /** Event handlers for connection state changes across all peers */
  private connectionStateHandlers: ConnectionStateHandler[] = [];

  /**
   * Creates a new WebRTC manager instance
   * 
   * @param {ClientInfo} localClientInfo - Information about the local client
   * @param {WebSocketClient} websocketClient - WebSocket client for signaling
   * @param {Partial<WebRTCConfig>} [config={}] - WebRTC configuration options
   */
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
   * Initializes local media stream (camera and microphone)
   * 
   * This method requests access to the user's camera and microphone, then
   * adds the resulting stream to all existing peer connections. This should
   * be called before joining a room or adding peers.
   * 
   * @returns {Promise<MediaStream>} Promise that resolves with the local media stream
   * @throws {Error} If media access is denied or devices are unavailable
   * 
   * @example
   * ```typescript
   * try {
   *   const stream = await manager.initializeLocalMedia();
   *   localVideo.srcObject = stream;
   * } catch (error) {
   *   console.error('Camera access denied:', error);
   * }
   * ```
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
   * Starts screen sharing and adds it to all peer connections
   * 
   * This method requests access to the user's screen, creates a screen share stream,
   * and adds it to all existing peer connections. It also handles automatic cleanup
   * when the user stops sharing through the browser UI.
   * 
   * @returns {Promise<MediaStream>} Promise that resolves with the screen share stream
   * @throws {Error} If screen share access is denied or not supported
   * 
   * @example
   * ```typescript
   * try {
   *   const screenStream = await manager.startScreenShare();
   *   screenVideo.srcObject = screenStream;
   * } catch (error) {
   *   console.error('Screen share failed:', error);
   * }
   * ```
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
   * Stops screen sharing and removes it from all peer connections
   * 
   * This method stops the screen share stream, removes it from all peer connections,
   * and requests renegotiation to update the media configuration.
   * 
   * @returns {Promise<void>} Promise that resolves when screen sharing is stopped
   * @throws {Error} If stopping screen share fails
   * 
   * @example
   * ```typescript
   * await manager.stopScreenShare();
   * console.log('Screen sharing stopped');
   * ```
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
   * Adds a new peer connection to the conference
   * 
   * This method creates a new peer connection, sets up event handlers, adds any
   * existing local media streams, and optionally initiates the connection process.
   * 
   * @param {string} peerId - Unique identifier for the remote peer
   * @param {boolean} [initiateConnection=false] - Whether to create an offer immediately
   * @returns {Promise<PeerConnection>} Promise that resolves with the peer connection
   * 
   * @example
   * ```typescript
   * // Add peer and let them initiate
   * const peer = await manager.addPeer('peer-123', false);
   * 
   * // Add peer and initiate connection
   * const peer = await manager.addPeer('peer-456', true);
   * ```
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
   * Removes a peer connection and cleans up resources
   * 
   * This method closes the peer connection and removes it from the peer map.
   * Should be called when a participant leaves the conference.
   * 
   * @param {string} peerId - Unique identifier for the peer to remove
   * @returns {void}
   * 
   * @example
   * ```typescript
   * manager.removePeer('peer-123');
   * console.log('Peer removed from conference');
   * ```
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
   * Gets a specific peer connection by ID
   * 
   * @param {string} peerId - The peer identifier to look up
   * @returns {PeerConnection | undefined} The peer connection or undefined if not found
   * 
   * @example
   * ```typescript
   * const peer = manager.getPeer('peer-123');
   * if (peer) {
   *   const stats = await peer.getStats();
   * }
   * ```
   */
  getPeer(peerId: string): PeerConnection | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Gets all current peer connections
   * 
   * @returns {Map<string, PeerConnection>} Map of peer IDs to peer connections
   * 
   * @example
   * ```typescript
   * const allPeers = manager.getAllPeers();
   * console.log(`Connected to ${allPeers.size} peers`);
   * ```
   */
  getAllPeers(): Map<string, PeerConnection> {
    return new Map(this.peers);
  }

  /**
   * Mutes or unmutes the local audio track
   * 
   * This method enables or disables the audio track in the local media stream,
   * affecting all peer connections simultaneously.
   * 
   * @param {boolean} enabled - Whether audio should be enabled
   * @returns {void}
   * 
   * @example
   * ```typescript
   * manager.toggleAudio(false); // Mute
   * manager.toggleAudio(true);  // Unmute
   * ```
   */
  toggleAudio(enabled: boolean): void {
    if (this.localMediaStream) {
      this.localMediaStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Enables or disables the local video track
   * 
   * This method enables or disables the video track in the local media stream,
   * affecting all peer connections simultaneously.
   * 
   * @param {boolean} enabled - Whether video should be enabled
   * @returns {void}
   * 
   * @example
   * ```typescript
   * manager.toggleVideo(false); // Disable camera
   * manager.toggleVideo(true);  // Enable camera
   * ```
   */
  toggleVideo(enabled: boolean): void {
    if (this.localMediaStream) {
      this.localMediaStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Gets the current local media stream (camera/microphone)
   * 
   * @returns {MediaStream | null} The local media stream or null if not initialized
   * 
   * @example
   * ```typescript
   * const localStream = manager.getLocalMediaStream();
   * if (localStream) {
   *   localVideo.srcObject = localStream;
   * }
   * ```
   */
  getLocalMediaStream(): MediaStream | null {
    return this.localMediaStream;
  }

  /**
   * Gets the current local screen sharing stream
   * 
   * @returns {MediaStream | null} The screen share stream or null if not active
   * 
   * @example
   * ```typescript
   * const screenStream = manager.getLocalScreenStream();
   * if (screenStream) {
   *   screenVideo.srcObject = screenStream;
   * }
   * ```
   */
  getLocalScreenStream(): MediaStream | null {
    return this.localScreenStream;
  }

  /**
   * Cleans up all peer connections and media streams
   * 
   * This method should be called when leaving the conference or closing the application.
   * It stops all media tracks, closes all peer connections, and resets internal state.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Clean up when leaving the room
   * manager.cleanup();
   * console.log('WebRTC resources cleaned up');
   * ```
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

  /**
   * Registers an event handler for stream addition events across all peers
   * 
   * @param {StreamEventHandler} handler - Function to call when any peer adds a stream
   * @returns {void}
   * 
   * @example
   * ```typescript
   * manager.onStreamAdded((stream, peerId, streamType) => {
   *   console.log(`New ${streamType} stream from ${peerId}`);
   *   if (streamType === 'camera') {
   *     addVideoElement(peerId, stream);
   *   }
   * });
   * ```
   */
  onStreamAdded(handler: StreamEventHandler): void {
    this.streamAddedHandlers.push(handler);
  }

  /**
   * Registers an event handler for stream removal events across all peers
   * 
   * @param {StreamEventHandler} handler - Function to call when any peer removes a stream
   * @returns {void}
   */
  onStreamRemoved(handler: StreamEventHandler): void {
    this.streamRemovedHandlers.push(handler);
  }

  /**
   * Registers an event handler for connection state changes across all peers
   * 
   * @param {ConnectionStateHandler} handler - Function to call when any peer's connection state changes
   * @returns {void}
   * 
   * @example
   * ```typescript
   * manager.onConnectionStateChanged((state, peerId) => {
   *   if (state === 'connected') {
   *     console.log(`Connected to ${peerId}`);
   *   } else if (state === 'failed') {
   *     console.log(`Connection failed with ${peerId}`);
   *     manager.removePeer(peerId);
   *   }
   * });
   * ```
   */
  onConnectionStateChanged(handler: ConnectionStateHandler): void {
    this.connectionStateHandlers.push(handler);
  }

  /**
   * @private
   * Sets up WebSocket event handlers for WebRTC signaling
   * 
   * This method configures handlers for incoming WebRTC offers, answers,
   * ICE candidates, and renegotiation requests from the signaling server.
   * 
   * @returns {void}
   */
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
 * Utility functions for media device management and capabilities
 * 
 * This module provides helper functions for enumerating and managing media devices,
 * requesting permissions, and checking browser capabilities for WebRTC features.
 * 
 * @namespace MediaDeviceUtils
 * @example
 * ```typescript
 * // Check camera availability
 * const cameras = await MediaDeviceUtils.getVideoDevices();
 * console.log(`Found ${cameras.length} cameras`);
 * 
 * // Request permissions
 * const hasPermission = await MediaDeviceUtils.requestPermissions();
 * if (hasPermission) {
 *   await manager.initializeLocalMedia();
 * }
 * ```
 */
export const MediaDeviceUtils = {
  /**
   * Enumerates all available media devices
   * 
   * This method returns a list of all media input and output devices available
   * to the browser. Note that device labels may be empty unless the user has
   * granted media permissions.
   * 
   * @returns {Promise<MediaDeviceInfo[]>} Promise that resolves with available devices
   * 
   * @example
   * ```typescript
   * const devices = await MediaDeviceUtils.getDevices();
   * devices.forEach(device => {
   *   console.log(`${device.kind}: ${device.label || 'Unknown device'}`);
   * });
   * ```
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
   * Gets available video input devices (cameras)
   * 
   * @returns {Promise<MediaDeviceInfo[]>} Promise that resolves with camera devices
   * 
   * @example
   * ```typescript
   * const cameras = await MediaDeviceUtils.getVideoDevices();
   * const defaultCamera = cameras.find(cam => cam.deviceId === 'default');
   * ```
   */
  async getVideoDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await this.getDevices();
    return devices.filter(device => device.kind === 'videoinput');
  },

  /**
   * Gets available audio input devices (microphones)
   * 
   * @returns {Promise<MediaDeviceInfo[]>} Promise that resolves with microphone devices
   * 
   * @example
   * ```typescript
   * const microphones = await MediaDeviceUtils.getAudioInputDevices();
   * console.log(`Found ${microphones.length} microphones`);
   * ```
   */
  async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await this.getDevices();
    return devices.filter(device => device.kind === 'audioinput');
  },

  /**
   * Gets available audio output devices (speakers/headphones)
   * 
   * @returns {Promise<MediaDeviceInfo[]>} Promise that resolves with speaker devices
   * 
   * @example
   * ```typescript
   * const speakers = await MediaDeviceUtils.getAudioOutputDevices();
   * if (speakers.length > 0) {
   *   // Allow user to select output device
   * }
   * ```
   */
  async getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await this.getDevices();
    return devices.filter(device => device.kind === 'audiooutput');
  },

  /**
   * Requests user permissions for camera and microphone access
   * 
   * This method prompts the user for media permissions and immediately releases
   * the stream, serving as a permission check. Should be called before attempting
   * to access media devices.
   * 
   * @returns {Promise<boolean>} Promise that resolves with true if permissions granted
   * 
   * @example
   * ```typescript
   * const hasPermission = await MediaDeviceUtils.requestPermissions();
   * if (!hasPermission) {
   *   alert('Camera and microphone access required for video calls');
   * }
   * ```
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
   * Checks if screen sharing is supported by the current browser
   * 
   * @returns {boolean} True if screen sharing is supported
   * 
   * @example
   * ```typescript
   * if (MediaDeviceUtils.isScreenShareSupported()) {
   *   // Show screen share button
   *   screenShareButton.style.display = 'block';
   * } else {
   *   console.log('Screen sharing not supported in this browser');
   * }
   * ```
   */
  isScreenShareSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  },
};

export default WebRTCManager;
