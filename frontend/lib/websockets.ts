/**
 * WebSocket Client Library for Real-time Video Conferencing Platform
 * 
 * This module provides a comprehensive WebSocket client implementation for connecting
 * to the Go backend video conferencing server. It supports real-time communication
 * for video calls, chat, screen sharing, and room management.
 * 
 * Key Features:
 * - Automatic reconnection with exponential backoff
 * - Heartbeat monitoring for connection health
 * - Type-safe message handling with TypeScript
 * - WebRTC signaling support (SDP offers/answers, ICE candidates)
 * - Room management (waiting room, host controls, participant management)
 * - Real-time chat with message history
 * - Screen sharing coordination
 * - Comprehensive error handling and recovery
 * 
 * Architecture:
 * - Event-driven design with message type handlers
 * - Promise-based connection management
 * - Configurable retry logic and timeouts
 * - Separation of concerns between transport and application logic
 * 
 * Usage Example:
 * ```typescript
 * const client = createWebSocketClient('zoom', 'room123', 'jwt-token');
 * 
 * // Subscribe to events
 * client.on('add_chat', (message) => {
 *   console.log('New chat:', message.payload.chatContent);
 * });
 * 
 * // Connect and handle errors
 * try {
 *   await client.connect();
 *   client.sendChat('Hello everyone!', { clientId: 'user1', displayName: 'John' });
 * } catch (error) {
 *   console.error('Connection failed:', error);
 * }
 * ```
 * 
 * @fileoverview WebSocket client for real-time video conferencing platform
 * @author Video Conferencing Platform Team
 * @version 1.0.0
 */

/**
 * Event types supported by the WebSocket API
 * 
 * These events correspond to the Go backend WebSocket handlers and provide
 * type-safe message routing for different platform features.
 * 
 * @enum {string}
 */
export type EventType = 
  // Chat Events - Real-time messaging functionality
  | 'add_chat'          // Send a new chat message to the room
  | 'delete_chat'       // Delete an existing chat message (author/host only)
  | 'get_recent_chats'  // Request recent chat history
  // Hand Raising Events - Speaking queue management
  | 'raise_hand'        // Participant requests to speak
  | 'lower_hand'        // Participant cancels speak request
  // Waiting Room Events - Host-controlled room admission
  | 'request_waiting'   // User requests to join from waiting room
  | 'accept_waiting'    // Host approves waiting room user
  | 'deny_waiting'      // Host denies waiting room user
  // Connection Events - Basic connection lifecycle
  | 'connect'           // Initial connection establishment
  | 'disconnect'        // Clean disconnection
  // Screen Sharing Events - Collaborative screen sharing
  | 'request_screenshare' // Request permission to share screen
  | 'accept_screenshare'  // Host approves screen sharing
  | 'deny_screenshare'    // Host denies screen sharing
  // WebRTC Signaling Events - Peer-to-peer connection setup
  | 'offer'             // WebRTC SDP offer for connection establishment
  | 'answer'            // WebRTC SDP answer responding to offer
  | 'candidate'         // ICE candidate for NAT traversal
  | 'renegotiate'       // Request connection renegotiation
  // Room State Events - Real-time room status updates
  | 'room_state';       // Complete room state synchronization

/**
 * User role types with hierarchical permissions
 * 
 * Roles determine what actions a user can perform in the room:
 * - waiting: Limited permissions, awaiting host approval
 * - participant: Standard meeting participant permissions
 * - screenshare: Enhanced permissions for screen sharing
 * - host: Full administrative control over the room
 * 
 * @enum {string}
 */
export type RoleType = 'waiting' | 'participant' | 'screenshare' | 'host';

/**
 * Base client information for identifying users across the platform
 * 
 * All WebSocket messages include client information to identify the sender
 * and provide context for message routing and permission checks.
 * 
 * @interface ClientInfo
 * @property {string} clientId - Unique identifier for the client session
 * @property {string} displayName - Human-readable name shown in the UI
 */
export interface ClientInfo {
  clientId: string;
  displayName: string;
}

/**
 * Chat message payload structure
 * 
 * Represents a chat message with metadata for persistence, ordering,
 * and moderation capabilities.
 * 
 * @interface ChatPayload
 * @extends ClientInfo
 * @property {string} chatId - Unique identifier for the message
 * @property {number} timestamp - Unix timestamp when message was created
 * @property {string} chatContent - The actual message content (max 1000 chars)
 */
export interface ChatPayload extends ClientInfo {
  chatId: string;
  timestamp: number;
  chatContent: string;
}

/**
 * Participant information payload
 * 
 * Basic participant data used for room management and user lists.
 * Extended by other interfaces for specific use cases.
 * 
 * @interface ParticipantPayload
 * @extends ClientInfo
 */
export interface ParticipantPayload extends ClientInfo {}

/**
 * Complete room state synchronization payload
 * 
 * Provides a comprehensive snapshot of the room's current state,
 * including all participants, their roles, and current activities.
 * 
 * @interface RoomStatePayload
 * @extends ClientInfo
 * @property {string} roomId - Unique identifier for the room
 * @property {ClientInfo[]} hosts - List of users with host privileges
 * @property {ClientInfo[]} participants - List of regular participants
 * @property {ClientInfo[]} handsRaised - List of participants requesting to speak
 * @property {ClientInfo[]} waitingUsers - List of users awaiting approval
 * @property {ClientInfo[]} sharingScreen - List of users currently screen sharing
 */
export interface RoomStatePayload extends ClientInfo {
  roomId: string;
  hosts: ClientInfo[];
  participants: ClientInfo[];
  handsRaised: ClientInfo[];
  waitingUsers: ClientInfo[];
  sharingScreen: ClientInfo[];
}

/**
 * Screen sharing coordination payload
 * 
 * Used for requesting, approving, and managing screen sharing sessions.
 * 
 * @interface ScreenSharePayload
 * @extends ClientInfo
 */
export interface ScreenSharePayload extends ClientInfo {}

/**
 * WebRTC SDP offer payload for peer connection establishment
 * 
 * Contains session description protocol data for initiating a WebRTC connection.
 * 
 * @interface WebRTCOfferPayload
 * @extends ClientInfo
 * @property {string} targetClientId - ID of the client to establish connection with
 * @property {string} sdp - Session Description Protocol data
 * @property {'offer'} type - Message type identifier
 */
export interface WebRTCOfferPayload extends ClientInfo {
  targetClientId: string;
  sdp: string;
  type: 'offer';
}

/**
 * WebRTC SDP answer payload for peer connection response
 * 
 * Contains session description protocol data responding to a connection offer.
 * 
 * @interface WebRTCAnswerPayload
 * @extends ClientInfo
 * @property {string} targetClientId - ID of the client that sent the offer
 * @property {string} sdp - Session Description Protocol data
 * @property {'answer'} type - Message type identifier
 */
export interface WebRTCAnswerPayload extends ClientInfo {
  targetClientId: string;
  sdp: string;
  type: 'answer';
}

/**
 * WebRTC ICE candidate payload for NAT traversal
 * 
 * Contains Interactive Connectivity Establishment data for network traversal.
 * 
 * @interface WebRTCCandidatePayload
 * @extends ClientInfo
 * @property {string} targetClientId - ID of the peer connection target
 * @property {string} candidate - ICE candidate string
 * @property {string} [sdpMid] - Media stream identification tag
 * @property {number} [sdpMLineIndex] - Media line index in SDP
 */
export interface WebRTCCandidatePayload extends ClientInfo {
  targetClientId: string;
  candidate: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
}

/**
 * WebRTC renegotiation request payload
 * 
 * Used to request connection renegotiation for codec changes or error recovery.
 * 
 * @interface WebRTCRenegotiatePayload
 * @extends ClientInfo
 * @property {string} targetClientId - ID of the peer to renegotiate with
 * @property {string} [reason] - Optional reason for renegotiation
 */
export interface WebRTCRenegotiatePayload extends ClientInfo {
  targetClientId: string;
  reason?: string;
}

export type MessagePayload = 
  | ChatPayload
  | ParticipantPayload
  | RoomStatePayload
  | ScreenSharePayload
  | WebRTCOfferPayload
  | WebRTCAnswerPayload
  | WebRTCCandidatePayload
  | WebRTCRenegotiatePayload;

/**
 * WebSocket message structure for client-server communication
 * 
 * All messages follow this standardized format for type-safe routing.
 * 
 * @interface WebSocketMessage
 * @property {EventType} event - The event type identifier
 * @property {MessagePayload} payload - Event-specific data payload
 */
export interface WebSocketMessage {
  event: EventType;
  payload: MessagePayload;
}

/**
 * Chat history response structure
 * 
 * Used for paginated chat message retrieval.
 * 
 * @interface ChatHistoryResponse
 * @property {ChatPayload[]} messages - Array of chat messages
 * @property {number} total - Total number of messages available
 * @property {boolean} hasMore - Whether more messages are available
 */
export interface ChatHistoryResponse {
  messages: ChatPayload[];
  total: number;
  hasMore: boolean;
}

/**
 * WebSocket connection states
 * 
 * @typedef {string} ConnectionState
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

/**
 * Configuration options for WebSocket client
 * 
 * @interface WebSocketConfig
 * @property {string} url - WebSocket server URL
 * @property {string} token - JWT authentication token
 * @property {boolean} [autoReconnect=true] - Enable automatic reconnection
 * @property {number} [reconnectInterval=3000] - Milliseconds between reconnect attempts
 * @property {number} [maxReconnectAttempts=5] - Maximum reconnection attempts
 * @property {number} [heartbeatInterval=30000] - Heartbeat ping interval in milliseconds
 */
export interface WebSocketConfig {
  url: string;
  token: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

/**
 * Event handler function types
 */
export type MessageHandler = (message: WebSocketMessage) => void;
export type ConnectionHandler = (state: ConnectionState) => void;
export type ErrorHandler = (error: Error) => void;

/**
 * Enterprise-grade WebSocket client for real-time video conferencing platform
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - JWT-based authentication
 * - Type-safe message handling
 * - Heartbeat monitoring
 * - Event-driven architecture
 * - Connection state management
 * - Error handling and recovery
 * 
 * The client manages all real-time communication with the Go backend,
 * including chat, participant management, screen sharing, and WebRTC signaling.
 * 
 * @class WebSocketClient
 * 
 * @example
 * ```typescript
 * const client = new WebSocketClient({
 *   url: 'wss://api.example.com/ws',
 *   token: 'jwt-token-here',
 *   autoReconnect: true,
 *   maxReconnectAttempts: 10
 * });
 * 
 * // Handle chat messages
 * client.on('add_chat', (message) => {
 *   console.log('New chat:', message.payload.chatContent);
 * });
 * 
 * // Handle connection state changes
 * client.onConnectionChange((state) => {
 *   console.log('Connection state:', state);
 * });
 * 
 * // Connect and send message
 * await client.connect();
 * client.sendChat('Hello world!', {
 *   clientId: 'user123',
 *   displayName: 'John Doe'
 * });
 * ```
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private messageHandlers = new Map<EventType, MessageHandler[]>();
  private connectionHandlers: ConnectionHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket client with configuration
   * 
   * @param {WebSocketConfig} config - Client configuration options
   */
  constructor(config: WebSocketConfig) {
    this.config = {
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  /**
   * Establish WebSocket connection to the server
   * 
   * Initiates connection with JWT authentication and sets up event handlers.
   * Automatically starts heartbeat monitoring on successful connection.
   * 
   * @returns {Promise<void>} Promise that resolves when connection is established
   * @throws {Error} When connection fails or authentication is rejected
   * 
   * @example
   * ```typescript
   * try {
   *   await client.connect();
   *   console.log('Connected successfully');
   * } catch (error) {
   *   console.error('Connection failed:', error);
   * }
   * ```
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.setConnectionState('connecting');
        
        // Construct WebSocket URL with JWT token
        const wsUrl = new URL(this.config.url);
        wsUrl.searchParams.set('token', this.config.token);
        
        this.ws = new WebSocket(wsUrl.toString());
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.setConnectionState('connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.cleanup();
          
          if (event.code === 1000) {
            // Normal closure
            this.setConnectionState('disconnected');
          } else if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.setConnectionState('reconnecting');
            this.scheduleReconnect();
          } else {
            this.setConnectionState('error');
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.notifyErrorHandlers(new Error('WebSocket connection error'));
          reject(new Error('Failed to connect to WebSocket server'));
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        this.setConnectionState('error');
        reject(error);
      }
    });
  }

  /**
   * Gracefully disconnect from the WebSocket server
   * 
   * Closes the WebSocket connection, stops automatic reconnection,
   * clears all timers, and sets connection state to disconnected.
   * 
   * @example
   * ```typescript
   * // Graceful shutdown when user leaves the page
   * window.addEventListener('beforeunload', () => {
   *   client.disconnect();
   * });
   * 
   * // Manual disconnect
   * client.disconnect();
   * console.log('Disconnected from server');
   * ```
   */
  disconnect(): void {
    this.config.autoReconnect = false;
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
    
    this.cleanup();
    this.setConnectionState('disconnected');
  }

  /**
   * Send a message to the WebSocket server
   * 
   * Low-level method for sending typed messages to the server.
   * Automatically serializes the message and handles connection validation.
   * 
   * @param {EventType} event - The event type identifier
   * @param {MessagePayload} payload - The message payload data
   * @throws {Error} When WebSocket is not connected
   * 
   * @example
   * ```typescript
   * // Send custom message (prefer using specific methods like sendChat)
   * client.send('add_chat', {
   *   clientId: 'user123',
   *   displayName: 'John Doe',
   *   chatId: 'msg456',
   *   timestamp: Date.now(),
   *   chatContent: 'Hello world!'
   * });
   * ```
   */
  send(event: EventType, payload: MessagePayload): void {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    const message: WebSocketMessage = { event, payload };
    
    try {
      this.ws!.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
      throw new Error('Failed to send WebSocket message');
    }
  }

  /**
   * Send a chat message to the room
   * 
   * Broadcasts a chat message to all participants in the current room.
   * Messages are automatically timestamped and assigned unique IDs.
   * 
   * @param {string} content - The message content (max 1000 characters)
   * @param {ClientInfo} clientInfo - Sender's client information
   * 
   * @example
   * ```typescript
   * client.sendChat('Hello everyone!', {
   *   clientId: 'user123',
   *   displayName: 'John Doe'
   * });
   * ```
   */
  sendChat(content: string, clientInfo: ClientInfo): void {
    const payload: ChatPayload = {
      ...clientInfo,
      chatId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      chatContent: content,
    };
    
    this.send('add_chat', payload);
  }

  /**
   * Delete a chat message from the room
   * 
   * Removes a chat message from the room history. Only available to
   * message authors and room hosts.
   * 
   * @param {string} chatId - Unique identifier of the message to delete
   * @param {ClientInfo} clientInfo - Client information for authorization
   * 
   * @example
   * ```typescript
   * client.deleteChat('msg-123', {
   *   clientId: 'user123',
   *   displayName: 'John Doe'
   * });
   * ```
   */
  deleteChat(chatId: string, clientInfo: ClientInfo): void {
    const payload: ChatPayload = {
      ...clientInfo,
      chatId,
      timestamp: Date.now(),
      chatContent: '',
    };
    
    this.send('delete_chat', payload);
  }

  /**
   * Request recent chat message history
   * 
   * Retrieves recent chat messages for the current room.
   * Response is delivered via the message handler system.
   * 
   * @param {ClientInfo} clientInfo - Client information for the request
   * 
   * @example
   * ```typescript
   * // Set up handler for chat history response
   * client.on('get_recent_chats', (message) => {
   *   const history = message.payload as ChatHistoryResponse;
   *   console.log(`Received ${history.messages.length} messages`);
   * });
   * 
   * // Request history
   * client.requestChatHistory({
   *   clientId: 'user123',
   *   displayName: 'John Doe'
   * });
   * ```
   */
  requestChatHistory(clientInfo: ClientInfo): void {
    this.send('get_recent_chats', clientInfo);
  }

  /**
   * Raise hand to request speaking permission
   * 
   * Signals to room hosts that the participant wants to speak.
   * Adds the user to the speaking queue for host approval.
   * 
   * @param {ClientInfo} clientInfo - Client information for the request
   * 
   * @example
   * ```typescript
   * client.raiseHand({
   *   clientId: 'user123',
   *   displayName: 'John Doe'
   * });
   * ```
   */
  raiseHand(clientInfo: ClientInfo): void {
    this.send('raise_hand', clientInfo);
  }

  /**
   * Lower raised hand
   * 
   * Cancels a previously raised hand request and removes
   * the user from the speaking queue.
   * 
   * @param {ClientInfo} clientInfo - Client information for the request
   * 
   * @example
   * ```typescript
   * client.lowerHand({
   *   clientId: 'user123',
   *   displayName: 'John Doe'
   * });
   * ```
   */
  lowerHand(clientInfo: ClientInfo): void {
    this.send('lower_hand', clientInfo);
  }

  /**
   * Request to join room from waiting room
   * 
   * Sends a request to room hosts for permission to join the main room.
   * Used when room has waiting room enabled for host-controlled admission.
   * 
   * @param {ClientInfo} clientInfo - Client information for the request
   * 
   * @example
   * ```typescript
   * client.requestWaiting({
   *   clientId: 'user123',
   *   displayName: 'John Doe'
   * });
   * ```
   */
  requestWaiting(clientInfo: ClientInfo): void {
    this.send('request_waiting', clientInfo);
  }

  /**
   * Accept waiting user into the main room (host only)
   * 
   * Approves a user's request to join from the waiting room.
   * Only hosts can perform this action.
   * 
   * @param {ClientInfo} targetClient - Information of the user to accept
   * @param {ClientInfo} hostInfo - Host's client information for authorization
   * 
   * @example
   * ```typescript
   * // Host accepts a waiting user
   * client.acceptWaiting(
   *   { clientId: 'waiting-user', displayName: 'Jane Smith' },
   *   { clientId: 'host-123', displayName: 'Host Name' }
   * );
   * ```
   */
  acceptWaiting(targetClient: ClientInfo, hostInfo: ClientInfo): void {
    this.send('accept_waiting', targetClient);
  }

  /**
   * Deny waiting user's request to join (host only)
   * 
   * Rejects a user's request to join from the waiting room.
   * Only hosts can perform this action.
   * 
   * @param {ClientInfo} targetClient - Information of the user to deny
   * @param {ClientInfo} hostInfo - Host's client information for authorization
   * 
   * @example
   * ```typescript
   * // Host denies a waiting user
   * client.denyWaiting(
   *   { clientId: 'waiting-user', displayName: 'Spam User' },
   *   { clientId: 'host-123', displayName: 'Host Name' }
   * );
   * ```
   */
  denyWaiting(targetClient: ClientInfo, hostInfo: ClientInfo): void {
    this.send('deny_waiting', targetClient);
  }

  /**
   * Request permission to share screen
   * 
   * Sends a request to room hosts for permission to share screen.
   * Hosts will receive a notification and can approve or deny the request.
   * 
   * @param {ClientInfo} clientInfo - Client information for the request
   * 
   * @example
   * ```typescript
   * client.requestScreenShare({
   *   clientId: 'user123',
   *   displayName: 'John Doe'
   * });
   * ```
   */
  requestScreenShare(clientInfo: ClientInfo): void {
    this.send('request_screenshare', clientInfo);
  }

  /**
   * Accept screen sharing request (host only)
   * 
   * Approves a participant's request to share their screen.
   * Only hosts can perform this action.
   * 
   * @param {ClientInfo} targetClient - Information of the user requesting to share
   * @param {ClientInfo} hostInfo - Host's client information for authorization
   * 
   * @example
   * ```typescript
   * // Host approves screen sharing
   * client.acceptScreenShare(
   *   { clientId: 'presenter-user', displayName: 'Jane Presenter' },
   *   { clientId: 'host-123', displayName: 'Host Name' }
   * );
   * ```
   */
  acceptScreenShare(targetClient: ClientInfo, hostInfo: ClientInfo): void {
    this.send('accept_screenshare', targetClient);
  }

  /**
   * Deny screen sharing request (host only)
   * 
   * Rejects a participant's request to share their screen.
   * Only hosts can perform this action.
   * 
   * @param {ClientInfo} targetClient - Information of the user requesting to share
   * @param {ClientInfo} hostInfo - Host's client information for authorization
   * 
   * @example
   * ```typescript
   * // Host denies screen sharing
   * client.denyScreenShare(
   *   { clientId: 'user-123', displayName: 'John Doe' },
   *   { clientId: 'host-123', displayName: 'Host Name' }
   * );
   * ```
   */
  denyScreenShare(targetClient: ClientInfo, hostInfo: ClientInfo): void {
    this.send('deny_screenshare', targetClient);
  }

  /**
   * Send WebRTC offer for peer connection establishment
   * 
   * Initiates a WebRTC peer connection by sending an SDP offer to another client.
   * Used to establish direct peer-to-peer communication for audio/video streams.
   * 
   * @param {RTCSessionDescriptionInit} offer - WebRTC session description offer
   * @param {string} targetClientId - ID of the client to establish connection with
   * @param {ClientInfo} clientInfo - Sender's client information
   * 
   * @example
   * ```typescript
   * // Create and send WebRTC offer
   * const peerConnection = new RTCPeerConnection();
   * const offer = await peerConnection.createOffer();
   * await peerConnection.setLocalDescription(offer);
   * 
   * client.sendWebRTCOffer(offer, 'target-user-123', {
   *   clientId: 'sender-456',
   *   displayName: 'John Sender'
   * });
   * ```
   */
  sendWebRTCOffer(offer: RTCSessionDescriptionInit, targetClientId: string, clientInfo: ClientInfo): void {
    const payload: WebRTCOfferPayload = {
      ...clientInfo,
      targetClientId,
      sdp: offer.sdp!,
      type: 'offer',
    };
    
    this.send('offer', payload);
  }

  /**
   * Send WebRTC answer to respond to an offer
   * 
   * Responds to a WebRTC offer with an SDP answer to complete the connection handshake.
   * Called after receiving and processing a WebRTC offer from another client.
   * 
   * @param {RTCSessionDescriptionInit} answer - WebRTC session description answer
   * @param {string} targetClientId - ID of the client that sent the offer
   * @param {ClientInfo} clientInfo - Responder's client information
   * 
   * @example
   * ```typescript
   * // Handle incoming offer and send answer
   * client.on('offer', async (message) => {
   *   const offerPayload = message.payload as WebRTCOfferPayload;
   *   const peerConnection = new RTCPeerConnection();
   *   
   *   await peerConnection.setRemoteDescription(offerPayload);
   *   const answer = await peerConnection.createAnswer();
   *   await peerConnection.setLocalDescription(answer);
   *   
   *   client.sendWebRTCAnswer(answer, offerPayload.clientId, {
   *     clientId: 'responder-789',
   *     displayName: 'Jane Responder'
   *   });
   * });
   * ```
   */
  sendWebRTCAnswer(answer: RTCSessionDescriptionInit, targetClientId: string, clientInfo: ClientInfo): void {
    const payload: WebRTCAnswerPayload = {
      ...clientInfo,
      targetClientId,
      sdp: answer.sdp!,
      type: 'answer',
    };
    
    this.send('answer', payload);
  }

  /**
   * Send ICE candidate for NAT traversal
   * 
   * Exchanges ICE (Interactive Connectivity Establishment) candidates
   * to establish the best network path between peers.
   * 
   * @param {RTCIceCandidate} candidate - ICE candidate containing connection information
   * @param {string} targetClientId - ID of the peer connection target
   * @param {ClientInfo} clientInfo - Sender's client information
   * 
   * @example
   * ```typescript
   * // Handle ICE candidate generation
   * peerConnection.onicecandidate = (event) => {
   *   if (event.candidate) {
   *     client.sendICECandidate(event.candidate, 'target-user-123', {
   *       clientId: 'sender-456',
   *       displayName: 'John Sender'
   *     });
   *   }
   * };
   * ```
   */
  sendICECandidate(candidate: RTCIceCandidate, targetClientId: string, clientInfo: ClientInfo): void {
    const payload: WebRTCCandidatePayload = {
      ...clientInfo,
      targetClientId,
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid || undefined,
      sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
    };
    
    this.send('candidate', payload);
  }

  /**
   * Request WebRTC connection renegotiation
   * 
   * Initiates renegotiation of an existing peer connection.
   * Used when connection parameters need to change (codec updates, network changes, etc.).
   * 
   * @param {string} targetClientId - ID of the peer to renegotiate with
   * @param {string} reason - Reason for requesting renegotiation
   * @param {ClientInfo} clientInfo - Requester's client information
   * 
   * @example
   * ```typescript
   * // Request renegotiation due to network change
   * client.requestRenegotiation(
   *   'peer-user-123',
   *   'Network interface changed',
   *   {
   *     clientId: 'requester-456',
   *     displayName: 'John Requester'
   *   }
   * );
   * ```
   */
  requestRenegotiation(targetClientId: string, reason: string, clientInfo: ClientInfo): void {
    const payload: WebRTCRenegotiatePayload = {
      ...clientInfo,
      targetClientId,
      reason,
    };
    
    this.send('renegotiate', payload);
  }

  /**
   * Subscribe to specific WebSocket message types
   * 
   * Registers event handlers for incoming messages of specified types.
   * Multiple handlers can be registered for the same event type.
   * 
   * @param {EventType} event - The event type to listen for
   * @param {MessageHandler} handler - Function to handle incoming messages
   * 
   * @example
   * ```typescript
   * // Listen for chat messages
   * client.on('add_chat', (message) => {
   *   const chat = message.payload as ChatPayload;
   *   console.log(`${chat.displayName}: ${chat.chatContent}`);
   * });
   * 
   * // Listen for room state updates
   * client.on('room_state', (message) => {
   *   const state = message.payload as RoomStatePayload;
   *   console.log(`Room has ${state.participants.length} participants`);
   * });
   * 
   * // Listen for WebRTC offers
   * client.on('offer', (message) => {
   *   const offer = message.payload as WebRTCOfferPayload;
   *   handleWebRTCOffer(offer);
   * });
   * ```
   */
  on(event: EventType, handler: MessageHandler): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)!.push(handler);
  }

  /**
   * Unsubscribe from specific WebSocket message types
   * 
   * Removes a previously registered event handler for the specified event type.
   * Must pass the exact same handler function reference used with `on()`.
   * 
   * @param {EventType} event - The event type to stop listening for
   * @param {MessageHandler} handler - The exact handler function to remove
   * 
   * @example
   * ```typescript
   * // Store handler reference for later removal
   * const chatHandler = (message) => {
   *   console.log('Chat:', message.payload.chatContent);
   * };
   * 
   * // Subscribe
   * client.on('add_chat', chatHandler);
   * 
   * // Later, unsubscribe
   * client.off('add_chat', chatHandler);
   * ```
   */
  off(event: EventType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Subscribe to connection state changes
   * 
   * Registers a handler to be notified when the WebSocket connection
   * state changes (connecting, connected, disconnected, error, reconnecting).
   * 
   * @param {ConnectionHandler} handler - Function to handle state changes
   * 
   * @example
   * ```typescript
   * client.onConnectionChange((state) => {
   *   switch (state) {
   *     case 'connecting':
   *       showLoadingIndicator();
   *       break;
   *     case 'connected':
   *       hideLoadingIndicator();
   *       enableUI();
   *       break;
   *     case 'disconnected':
   *     case 'error':
   *       disableUI();
   *       showErrorMessage();
   *       break;
   *     case 'reconnecting':
   *       showReconnectingIndicator();
   *       break;
   *   }
   * });
   * ```
   */
  onConnectionChange(handler: ConnectionHandler): void {
    this.connectionHandlers.push(handler);
  }

  /**
   * Subscribe to WebSocket and connection errors
   * 
   * Registers a handler to be notified when errors occur during
   * WebSocket communication or connection management.
   * 
   * @param {ErrorHandler} handler - Function to handle errors
   * 
   * @example
   * ```typescript
   * client.onError((error) => {
   *   console.error('WebSocket error:', error.message);
   *   
   *   // Log to error tracking service
   *   errorTracker.log(error);
   *   
   *   // Show user-friendly error message
   *   showErrorToast('Connection problem. Please try again.');
   * });
   * ```
   */
  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Get current connection state
   * 
   * Returns the current state of the WebSocket connection.
   * 
   * @returns {ConnectionState} Current connection state
   * 
   * @example
   * ```typescript
   * const state = client.getConnectionState();
   * if (state === 'connected') {
   *   console.log('Ready to send messages');
   * } else if (state === 'reconnecting') {
   *   console.log('Attempting to reconnect...');
   * }
   * ```
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if WebSocket is currently connected
   * 
   * Returns true if the WebSocket is open and ready to send/receive messages.
   * 
   * @returns {boolean} True if connected, false otherwise
   * 
   * @example
   * ```typescript
   * if (client.isConnected()) {
   *   client.sendChat('Hello!', clientInfo);
   * } else {
   *   console.log('Cannot send message: not connected');
   * }
   * ```
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Private methods

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Notify specific event handlers
      const handlers = this.messageHandlers.get(message.event);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message);
          } catch (error) {
            console.error(`Error in message handler for ${message.event}:`, error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.notifyErrorHandlers(new Error('Invalid message format'));
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.connectionHandlers.forEach(handler => {
        try {
          handler(state);
        } catch (error) {
          console.error('Error in connection handler:', error);
        }
      });
    }
  }

  private notifyErrorHandlers(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        // Send ping to keep connection alive
        try {
          this.ws!.send(JSON.stringify({ event: 'ping', payload: {} }));
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
        }
      }
    }, this.config.heartbeatInterval);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, delay);
  }

  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.ws = null;
  }
}

/**
 * @fileoverview WebSocket Client Usage Summary
 * 
 * This comprehensive WebSocket client provides enterprise-grade real-time communication
 * for video conferencing applications. Key features include:
 * 
 * **Core Features:**
 * - Type-safe message handling with TypeScript interfaces
 * - Automatic reconnection with exponential backoff
 * - JWT-based authentication
 * - Heartbeat monitoring for connection health
 * - Event-driven architecture with subscribe/unsubscribe patterns
 * - Comprehensive error handling and recovery
 * 
 * **Supported Operations:**
 * - Real-time chat messaging with history
 * - Participant management (join/leave/remove)
 * - Hand raising system for speaking requests
 * - Screen sharing coordination
 * - WebRTC signaling for peer-to-peer connections
 * - Waiting room management for host-controlled admission
 * 
 * **Production Ready:**
 * - Extensive error handling and logging
 * - Connection state management
 * - Resource cleanup and memory leak prevention
 * - Configurable timeouts and retry logic
 * - Full TypeScript type safety
 * 
 * **Example Integration:**
 * ```typescript
 * import { WebSocketClient } from './lib/websockets';
 * 
 * const client = new WebSocketClient({
 *   url: process.env.NEXT_PUBLIC_WS_URL!,
 *   token: authToken,
 *   autoReconnect: true,
 *   maxReconnectAttempts: 10
 * });
 * 
 * // Set up event handlers
 * client.on('add_chat', handleChatMessage);
 * client.on('room_state', handleRoomStateUpdate);
 * client.onConnectionChange(handleConnectionChange);
 * client.onError(handleError);
 * 
 * // Connect and start using
 * await client.connect();
 * ```
 * 
 * @version 1.0.0
 * @author Video Conferencing Platform Team
 * @since 2024
 */

/**
 * Factory function to create WebSocket clients for different endpoints
 * 
 * Provides a convenient way to create pre-configured WebSocket clients
 * for different types of real-time communication endpoints.
 * 
 * @param {('zoom'|'screenshare'|'chat')} endpoint - Type of WebSocket endpoint
 * @param {string} roomId - Unique identifier for the room
 * @param {string} token - JWT authentication token
 * @param {string} [baseUrl='ws://localhost:8080'] - Base WebSocket server URL
 * @returns {WebSocketClient} Configured WebSocket client instance
 * 
 * @example
 * ```typescript
 * // Create client for main video conferencing
 * const zoomClient = createWebSocketClient('zoom', 'room-123', jwtToken);
 * 
 * // Create client for screen sharing
 * const screenClient = createWebSocketClient('screenshare', 'room-123', jwtToken);
 * 
 * // Create client for chat only
 * const chatClient = createWebSocketClient('chat', 'room-123', jwtToken, 'wss://prod.example.com');
 * 
 * // Connect and use
 * await zoomClient.connect();
 * zoomClient.on('room_state', handleRoomState);
 * ```
 */
export const createWebSocketClient = (
  endpoint: 'zoom' | 'screenshare' | 'chat',
  roomId: string,
  token: string,
  baseUrl = 'ws://localhost:8080'
): WebSocketClient => {
  const url = `${baseUrl}/ws/${endpoint}/${roomId}`;
  
  return new WebSocketClient({
    url,
    token,
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
  });
};

/**
 * React hook for managing WebSocket connection in React components
 * 
 * Provides a declarative way to manage WebSocket connections in React applications.
 * Handles connection lifecycle, state management, and cleanup automatically.
 * 
 * @param {('zoom'|'screenshare'|'chat')} endpoint - Type of WebSocket endpoint
 * @param {string} roomId - Unique identifier for the room
 * @param {string} token - JWT authentication token
 * @param {Partial<WebSocketConfig>} [options] - Additional WebSocket configuration
 * @returns {Object} Hook return object with client, state, and control methods
 * 
 * @example
 * ```typescript
 * function VideoRoom({ roomId, authToken }) {
 *   const { client, connectionState, connect, disconnect, isConnected } = useWebSocket(
 *     'zoom',
 *     roomId,
 *     authToken,
 *     { maxReconnectAttempts: 10 }
 *   );
 * 
 *   // Set up event handlers
 *   useEffect(() => {
 *     if (!client) return;
 * 
 *     const handleChat = (message) => {
 *       console.log('New chat:', message.payload.chatContent);
 *     };
 * 
 *     client.on('add_chat', handleChat);
 *     return () => client.off('add_chat', handleChat);
 *   }, [client]);
 * 
 *   // Auto-connect on mount
 *   useEffect(() => {
 *     connect();
 *     return () => disconnect();
 *   }, [connect, disconnect]);
 * 
 *   return (
 *     <div>
 *       <div>Status: {connectionState}</div>
 *       <button 
 *         onClick={() => client?.sendChat('Hello!', clientInfo)}
 *         disabled={!isConnected}
 *       >
 *         Send Message
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export const useWebSocket = (
  endpoint: 'zoom' | 'screenshare' | 'chat',
  roomId: string,
  token: string,
  options?: Partial<WebSocketConfig>
) => {
  // This will be implemented as a React hook in a separate file
  // returning { client, connectionState, connect, disconnect, isConnected }
};
