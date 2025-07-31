/**
 * WebSocket client for real-time video conferencing platform
 * Integrates with Go backend WebSocket API
 */

export type EventType = 
  // Chat Events
  | 'add_chat'
  | 'delete_chat'
  | 'get_recent_chats'
  // Hand Raising Events
  | 'raise_hand'
  | 'lower_hand'
  // Waiting Room Events
  | 'request_waiting'
  | 'accept_waiting'
  | 'deny_waiting'
  // Connection Events
  | 'connect'
  | 'disconnect'
  // Screen Sharing Events
  | 'request_screenshare'
  | 'accept_screenshare'
  | 'deny_screenshare'
  // WebRTC Signaling Events
  | 'offer'
  | 'answer'
  | 'candidate'
  | 'renegotiate'
  // Room State Events
  | 'room_state';

export type RoleType = 'waiting' | 'participant' | 'screenshare' | 'host';

export interface ClientInfo {
  clientId: string;
  displayName: string;
}

export interface ChatPayload extends ClientInfo {
  chatId: string;
  timestamp: number;
  chatContent: string;
}

export interface ParticipantPayload extends ClientInfo {}

export interface RoomStatePayload extends ClientInfo {
  roomId: string;
  hosts: ClientInfo[];
  participants: ClientInfo[];
  handsRaised: ClientInfo[];
  waitingUsers: ClientInfo[];
  sharingScreen: ClientInfo[];
}

export interface ScreenSharePayload extends ClientInfo {}

// WebRTC Signaling Payloads
export interface WebRTCOfferPayload extends ClientInfo {
  targetClientId: string;
  sdp: string;
  type: 'offer';
}

export interface WebRTCAnswerPayload extends ClientInfo {
  targetClientId: string;
  sdp: string;
  type: 'answer';
}

export interface WebRTCCandidatePayload extends ClientInfo {
  targetClientId: string;
  candidate: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
}

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

export interface WebSocketMessage {
  event: EventType;
  payload: MessagePayload;
}

export interface ChatHistoryResponse {
  messages: ChatPayload[];
  total: number;
  hasMore: boolean;
}

// Connection States
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

// WebSocket Client Configuration
export interface WebSocketConfig {
  url: string;
  token: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

// Event Handlers
export type MessageHandler = (message: WebSocketMessage) => void;
export type ConnectionHandler = (state: ConnectionState) => void;
export type ErrorHandler = (error: Error) => void;

/**
 * WebSocket client class for managing real-time communication
 * with the Go backend video conferencing server
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
   * Connect to the WebSocket server
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
   * Disconnect from the WebSocket server
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
   * Send a message to the server
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
   * Send chat message
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
   * Delete chat message
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
   * Request recent chat history
   */
  requestChatHistory(clientInfo: ClientInfo): void {
    this.send('get_recent_chats', clientInfo);
  }

  /**
   * Raise hand
   */
  raiseHand(clientInfo: ClientInfo): void {
    this.send('raise_hand', clientInfo);
  }

  /**
   * Lower hand
   */
  lowerHand(clientInfo: ClientInfo): void {
    this.send('lower_hand', clientInfo);
  }

  /**
   * Request to join from waiting room
   */
  requestWaiting(clientInfo: ClientInfo): void {
    this.send('request_waiting', clientInfo);
  }

  /**
   * Accept waiting user (host only)
   */
  acceptWaiting(targetClient: ClientInfo, hostInfo: ClientInfo): void {
    this.send('accept_waiting', targetClient);
  }

  /**
   * Deny waiting user (host only)
   */
  denyWaiting(targetClient: ClientInfo, hostInfo: ClientInfo): void {
    this.send('deny_waiting', targetClient);
  }

  /**
   * Request screen sharing permission
   */
  requestScreenShare(clientInfo: ClientInfo): void {
    this.send('request_screenshare', clientInfo);
  }

  /**
   * Accept screen sharing (host only)
   */
  acceptScreenShare(targetClient: ClientInfo, hostInfo: ClientInfo): void {
    this.send('accept_screenshare', targetClient);
  }

  /**
   * Deny screen sharing (host only)
   */
  denyScreenShare(targetClient: ClientInfo, hostInfo: ClientInfo): void {
    this.send('deny_screenshare', targetClient);
  }

  /**
   * Send WebRTC offer
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
   * Send WebRTC answer
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
   * Send ICE candidate
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
   * Request connection renegotiation
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
   * Subscribe to specific message types
   */
  on(event: EventType, handler: MessageHandler): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)!.push(handler);
  }

  /**
   * Unsubscribe from message types
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
   */
  onConnectionChange(handler: ConnectionHandler): void {
    this.connectionHandlers.push(handler);
  }

  /**
   * Subscribe to errors
   */
  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if WebSocket is connected
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
 * Factory function to create WebSocket clients for different endpoints
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
 * Hook for managing WebSocket connection in React components
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
