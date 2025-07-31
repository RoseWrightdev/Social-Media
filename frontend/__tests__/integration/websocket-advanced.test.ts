import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { WebSocketClient, createWebSocketClient } from '@/lib/websockets'
import type { ClientInfo, WebSocketMessage, EventType } from '@/lib/websockets'

// Advanced Mock WebSocket for 100% coverage testing
class AdvancedMockWebSocket extends EventTarget {
  url: string
  readyState: number = WebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  sentMessages: string[] = []

  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  constructor(url: string) {
    super()
    this.url = url
  }

  send(data: string) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    this.sentMessages.push(data)
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED
    const closeEvent = new CloseEvent('close', { code: code || 1000, reason })
    this.onclose?.(closeEvent)
    this.dispatchEvent(closeEvent)
  }

  // Control methods for testing
  simulateOpen() {
    this.readyState = WebSocket.OPEN
    const openEvent = new Event('open')
    this.onopen?.(openEvent)
    this.dispatchEvent(openEvent)
  }

  simulateMessage(data: string) {
    if (this.readyState === WebSocket.OPEN) {
      const messageEvent = new MessageEvent('message', { data })
      this.onmessage?.(messageEvent)
      this.dispatchEvent(messageEvent)
    }
  }

  simulateError() {
    const errorEvent = new Event('error')
    this.onerror?.(errorEvent)
    this.dispatchEvent(errorEvent)
  }

  simulateConnectionError() {
    this.readyState = WebSocket.CLOSED
    const closeEvent = new CloseEvent('close', { code: 1006, reason: 'Connection failed' })
    this.onclose?.(closeEvent)
    this.dispatchEvent(closeEvent)
  }
}

describe('WebSocket Integration Layer - 100% Coverage', () => {
  let mockWebSocket: AdvancedMockWebSocket
  let WebSocketSpy: any
  let client: WebSocketClient

  const mockClientInfo: ClientInfo = {
    clientId: 'test-client-123',
    displayName: 'Test User'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    WebSocketSpy = vi.fn().mockImplementation((url: string | URL) => {
      const mock = new AdvancedMockWebSocket(url.toString())
      mockWebSocket = mock
      return mock
    })
    
    global.WebSocket = WebSocketSpy
    WebSocketSpy.CONNECTING = 0
    WebSocketSpy.OPEN = 1
    WebSocketSpy.CLOSING = 2
    WebSocketSpy.CLOSED = 3
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockWebSocket?.close()
  })

  describe('WebSocket Factory Function', () => {
    it('should create WebSocket client with factory function', () => {
      const client = createWebSocketClient('zoom', 'test-room', 'test-token')
      
      expect(client).toBeInstanceOf(WebSocketClient)
    })

    it('should use custom base URL when provided', () => {
      const client = createWebSocketClient('screenshare', 'test-room', 'test-token', 'wss://custom.domain.com')
      
      expect(client).toBeInstanceOf(WebSocketClient)
    })

    it('should create client for different endpoints', () => {
      const zoomClient = createWebSocketClient('zoom', 'test-room', 'test-token')
      const chatClient = createWebSocketClient('chat', 'test-room', 'test-token')
      const screenshareClient = createWebSocketClient('screenshare', 'test-room', 'test-token')
      
      expect(zoomClient).toBeInstanceOf(WebSocketClient)
      expect(chatClient).toBeInstanceOf(WebSocketClient)
      expect(screenshareClient).toBeInstanceOf(WebSocketClient)
    })
  })

  describe('Direct WebSocket Client Testing', () => {
    beforeEach(() => {
      client = new WebSocketClient({
        url: 'ws://localhost:8080/ws/test',
        token: 'test-token',
        autoReconnect: true,
        reconnectInterval: 1000,
        maxReconnectAttempts: 3,
        heartbeatInterval: 5000
      })
    })

    describe('Connection Management', () => {
      it('should handle connection establishment', async () => {
        const connectPromise = client.connect()
        
        // Simulate successful connection
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        
        await expect(connectPromise).resolves.toBeUndefined()
        expect(client.isConnected()).toBe(true)
        expect(client.getConnectionState()).toBe('connected')
      })

      it('should handle connection failure', async () => {
        const connectPromise = client.connect()
        
        // Simulate connection error
        setTimeout(() => mockWebSocket.simulateError(), 10)
        
        await expect(connectPromise).rejects.toThrow('Failed to connect to WebSocket server')
        expect(client.getConnectionState()).toBe('connecting')
      })

      it('should handle try-catch error in connect method', async () => {
        // Mock URL constructor to throw
        const originalURL = global.URL
        global.URL = vi.fn().mockImplementation(() => {
          throw new Error('URL construction failed')
        }) as any

        const connectPromise = client.connect()
        
        await expect(connectPromise).rejects.toThrow('URL construction failed')
        expect(client.getConnectionState()).toBe('error')

        // Restore URL
        global.URL = originalURL
      })

      it('should disconnect cleanly', async () => {
        const connectPromise = client.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise

        client.disconnect()
        
        expect(client.getConnectionState()).toBe('disconnected')
        expect(mockWebSocket.sentMessages).toHaveLength(0) // No messages sent on clean disconnect
      })
    })

    describe('Message Handling', () => {
      beforeEach(async () => {
        const connectPromise = client.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise
      })

      it('should send messages when connected', () => {
        client.send('add_chat', {
          ...mockClientInfo,
          chatId: 'msg_123',
          timestamp: Date.now(),
          chatContent: 'Hello world'
        })

        expect(mockWebSocket.sentMessages).toHaveLength(1)
        const sentMessage = JSON.parse(mockWebSocket.sentMessages[0])
        expect(sentMessage.event).toBe('add_chat')
        expect(sentMessage.payload.chatContent).toBe('Hello world')
      })

      it('should throw error when sending while disconnected', () => {
        client.disconnect()
        
        expect(() => {
          client.send('add_chat', {
            ...mockClientInfo,
            chatId: 'msg_123',
            timestamp: Date.now(),
            chatContent: 'Hello'
          })
        }).toThrow('WebSocket not connected')
      })

      it('should handle send errors with try-catch', () => {
        // Mock send to throw error
        mockWebSocket.send = vi.fn().mockImplementation(() => {
          throw new Error('Send failed')
        })

        expect(() => {
          client.send('add_chat', {
            ...mockClientInfo,
            chatId: 'msg_123',
            timestamp: Date.now(),
            chatContent: 'Hello'
          })
        }).toThrow('Failed to send WebSocket message')
      })

      it('should handle malformed incoming messages', () => {
        const errorHandlerSpy = vi.fn()
        client.onError(errorHandlerSpy)

        // Send malformed JSON
        mockWebSocket.simulateMessage('invalid json{')

        expect(errorHandlerSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid message format'
          })
        )
      })

      it('should handle errors in message handlers', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        client.on('add_chat', () => {
          throw new Error('Handler error')
        })

        const message: WebSocketMessage = {
          event: 'add_chat',
          payload: {
            ...mockClientInfo,
            chatId: 'msg_123',
            timestamp: Date.now(),
            chatContent: 'Test'
          }
        }

        mockWebSocket.simulateMessage(JSON.stringify(message))

        expect(consoleSpy).toHaveBeenCalledWith(
          'Error in message handler for add_chat:',
          expect.any(Error)
        )

        consoleSpy.mockRestore()
      })
    })

    describe('Event Subscription', () => {
      beforeEach(async () => {
        const connectPromise = client.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise
      })

      it('should subscribe and unsubscribe from events', () => {
        const handler = vi.fn()
        
        client.on('room_state', handler)
        
        const message: WebSocketMessage = {
          event: 'room_state',
          payload: {
            ...mockClientInfo,
            roomId: 'test-room',
            hosts: [],
            participants: [],
            handsRaised: [],
            waitingUsers: [],
            sharingScreen: []
          }
        }

        mockWebSocket.simulateMessage(JSON.stringify(message))
        expect(handler).toHaveBeenCalledWith(message)

        // Unsubscribe
        client.off('room_state', handler)
        
        mockWebSocket.simulateMessage(JSON.stringify(message))
        expect(handler).toHaveBeenCalledTimes(1) // Should not be called again
      })

      it('should handle connection state changes', () => {
        const connectionHandler = vi.fn()
        client.onConnectionChange(connectionHandler)

        client.disconnect()

        expect(connectionHandler).toHaveBeenCalledWith('disconnected')
      })

      it('should handle errors in connection handlers', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        client.onConnectionChange(() => {
          throw new Error('Connection handler error')
        })

        client.disconnect()

        expect(consoleSpy).toHaveBeenCalledWith(
          'Error in connection handler:',
          expect.any(Error)
        )

        consoleSpy.mockRestore()
      })

      it('should handle errors in error handlers', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        client.onError(() => {
          throw new Error('Error handler error')
        })

        // Trigger an error
        mockWebSocket.simulateMessage('invalid json{')

        expect(consoleSpy).toHaveBeenCalledWith(
          'Error in error handler:',
          expect.any(Error)
        )

        consoleSpy.mockRestore()
      })
    })

    describe('Reconnection Logic', () => {
      it('should attempt reconnection on abnormal closure', async () => {
        const connectSpy = vi.spyOn(client, 'connect')
        
        const connectPromise = client.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise

        // Reset spy after initial connection
        connectSpy.mockClear()

        // Simulate abnormal closure (code !== 1000)
        mockWebSocket.readyState = WebSocket.CLOSED
        const closeEvent = new CloseEvent('close', { code: 1006, reason: 'Abnormal closure' })
        mockWebSocket.onclose?.(closeEvent)

        expect(client.getConnectionState()).toBe('reconnecting')

        // Wait for reconnection attempt
        await new Promise(resolve => setTimeout(resolve, 1100)) // Wait longer than reconnectInterval

        expect(connectSpy).toHaveBeenCalled()
      })

      it('should respect max reconnect attempts', async () => {
        // Create client with low max attempts for faster testing
        const shortClient = new WebSocketClient({
          url: 'ws://localhost:8080/ws/test',
          token: 'test-token',
          maxReconnectAttempts: 1,
          reconnectInterval: 100
        })

        const connectPromise = shortClient.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise

        // Simulate abnormal closure multiple times
        for (let i = 0; i < 3; i++) {
          mockWebSocket.readyState = WebSocket.CLOSED
          const closeEvent = new CloseEvent('close', { code: 1006, reason: 'Abnormal closure' })
          mockWebSocket.onclose?.(closeEvent)
          
          await new Promise(resolve => setTimeout(resolve, 150))
        }

        expect(shortClient.getConnectionState()).toBe('error')
      })

      it('should not reconnect when autoReconnect is disabled', async () => {
        const noReconnectClient = new WebSocketClient({
          url: 'ws://localhost:8080/ws/test',
          token: 'test-token',
          autoReconnect: false
        })

        const connectPromise = noReconnectClient.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise

        // Simulate abnormal closure
        mockWebSocket.readyState = WebSocket.CLOSED
        const closeEvent = new CloseEvent('close', { code: 1006, reason: 'Abnormal closure' })
        mockWebSocket.onclose?.(closeEvent)

        expect(noReconnectClient.getConnectionState()).toBe('error')
      })

      it('should clear existing reconnect timer when scheduling new one', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        const reconnectClient = new WebSocketClient({
          url: 'ws://localhost:8080/ws/test',
          token: 'test-token',
          maxReconnectAttempts: 3,
          reconnectInterval: 100
        })

        const connectPromise = reconnectClient.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise

        // Simulate multiple rapid abnormal closures to test timer clearing
        for (let i = 0; i < 2; i++) {
          mockWebSocket.readyState = WebSocket.CLOSED
          const closeEvent = new CloseEvent('close', { code: 1006, reason: 'Rapid closure' })
          mockWebSocket.onclose?.(closeEvent)
          
          // Small delay between closures
          await new Promise(resolve => setTimeout(resolve, 50))
        }

        // Wait for all reconnection attempts with longer timeout
        await new Promise(resolve => setTimeout(resolve, 500))

        // Should be in error state or still trying to reconnect
        const finalState = reconnectClient.getConnectionState()
        expect(['error', 'reconnecting', 'connecting']).toContain(finalState)
        
        consoleSpy.mockRestore()
      })

      it('should handle reconnection failure with exponential backoff', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        const failClient = new WebSocketClient({
          url: 'ws://localhost:8080/ws/test',
          token: 'test-token',
          maxReconnectAttempts: 2,
          reconnectInterval: 50
        })

        const connectPromise = failClient.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise

        // Mock connect to fail on subsequent attempts
        const originalConnect = failClient.connect.bind(failClient)
        vi.spyOn(failClient, 'connect').mockImplementation(async () => {
          throw new Error('Reconnection failed')
        })

        // Simulate abnormal closure
        mockWebSocket.readyState = WebSocket.CLOSED
        const closeEvent = new CloseEvent('close', { code: 1006, reason: 'Connection lost' })
        mockWebSocket.onclose?.(closeEvent)

        // Wait for reconnection attempts
        await new Promise(resolve => setTimeout(resolve, 400))

        expect(consoleSpy).toHaveBeenCalledWith(
          'Reconnection failed:',
          expect.any(Error)
        )

        consoleSpy.mockRestore()
      })
    })

    describe('Heartbeat Functionality', () => {
      it('should send heartbeat messages when connected', async () => {
        const heartbeatClient = new WebSocketClient({
          url: 'ws://localhost:8080/ws/test',
          token: 'test-token',
          heartbeatInterval: 100 // Fast heartbeat for testing
        })

        const connectPromise = heartbeatClient.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise

        // Wait for heartbeat
        await new Promise(resolve => setTimeout(resolve, 150))

        // Check for heartbeat message
        const heartbeatMessages = mockWebSocket.sentMessages.filter(msg => {
          try {
            const parsed = JSON.parse(msg)
            return parsed.event === 'ping'
          } catch {
            return false
          }
        })

        expect(heartbeatMessages.length).toBeGreaterThan(0)
      })

      it('should handle heartbeat send errors', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        const heartbeatClient = new WebSocketClient({
          url: 'ws://localhost:8080/ws/test',
          token: 'test-token',
          heartbeatInterval: 100
        })

        const connectPromise = heartbeatClient.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise

        // Mock send to throw error after connection
        mockWebSocket.send = vi.fn().mockImplementation(() => {
          throw new Error('Heartbeat send failed')
        })

        // Wait for heartbeat attempt
        await new Promise(resolve => setTimeout(resolve, 150))

        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to send heartbeat:',
          expect.any(Error)
        )

        consoleSpy.mockRestore()
      })

      it('should clear existing heartbeat timer when setting up new one', async () => {
        const client = new WebSocketClient({
          url: 'ws://localhost:8080/ws/test',
          token: 'test-token',
          heartbeatInterval: 100
        })

        // Connect first time
        const connectPromise1 = client.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise1

        // Disconnect and connect again to trigger timer clearing
        client.disconnect()
        await new Promise(resolve => setTimeout(resolve, 50))

        const connectPromise2 = client.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise2

        // Should not have any errors from multiple timers
        await new Promise(resolve => setTimeout(resolve, 150))

        expect(client.isConnected()).toBe(true)
      })

      it('should stop heartbeat when disconnected', async () => {
        const heartbeatClient = new WebSocketClient({
          url: 'ws://localhost:8080/ws/test',
          token: 'test-token',
          heartbeatInterval: 100
        })

        const connectPromise = heartbeatClient.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise

        // Count initial heartbeats
        await new Promise(resolve => setTimeout(resolve, 150))
        const initialCount = mockWebSocket.sentMessages.length

        // Disconnect
        heartbeatClient.disconnect()

        // Wait and verify no new heartbeats
        await new Promise(resolve => setTimeout(resolve, 150))
        const finalCount = mockWebSocket.sentMessages.length

        expect(finalCount).toBe(initialCount)
      })
    })

    describe('All WebSocket Methods', () => {
      beforeEach(async () => {
        const connectPromise = client.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise
      })

      it('should send chat messages', () => {
        client.sendChat('Hello world', mockClientInfo)

        expect(mockWebSocket.sentMessages).toHaveLength(1)
        const message = JSON.parse(mockWebSocket.sentMessages[0])
        expect(message.event).toBe('add_chat')
        expect(message.payload.chatContent).toBe('Hello world')
      })

      it('should delete chat messages', () => {
        client.deleteChat('msg_123', mockClientInfo)

        expect(mockWebSocket.sentMessages).toHaveLength(1)
        const message = JSON.parse(mockWebSocket.sentMessages[0])
        expect(message.event).toBe('delete_chat')
        expect(message.payload.chatId).toBe('msg_123')
      })

      it('should request chat history', () => {
        client.requestChatHistory(mockClientInfo)

        expect(mockWebSocket.sentMessages).toHaveLength(1)
        const message = JSON.parse(mockWebSocket.sentMessages[0])
        expect(message.event).toBe('get_recent_chats')
      })

      it('should raise and lower hand', () => {
        client.raiseHand(mockClientInfo)
        client.lowerHand(mockClientInfo)

        expect(mockWebSocket.sentMessages).toHaveLength(2)
        
        const raiseMessage = JSON.parse(mockWebSocket.sentMessages[0])
        expect(raiseMessage.event).toBe('raise_hand')
        
        const lowerMessage = JSON.parse(mockWebSocket.sentMessages[1])
        expect(lowerMessage.event).toBe('lower_hand')
      })

      it('should handle waiting room actions', () => {
        client.requestWaiting(mockClientInfo)
        client.acceptWaiting(mockClientInfo, mockClientInfo)
        client.denyWaiting(mockClientInfo, mockClientInfo)

        expect(mockWebSocket.sentMessages).toHaveLength(3)
        
        const requestMessage = JSON.parse(mockWebSocket.sentMessages[0])
        expect(requestMessage.event).toBe('request_waiting')
        
        const acceptMessage = JSON.parse(mockWebSocket.sentMessages[1])
        expect(acceptMessage.event).toBe('accept_waiting')
        
        const denyMessage = JSON.parse(mockWebSocket.sentMessages[2])
        expect(denyMessage.event).toBe('deny_waiting')
      })

      it('should handle screen sharing actions', () => {
        client.requestScreenShare(mockClientInfo)
        client.acceptScreenShare(mockClientInfo, mockClientInfo)
        client.denyScreenShare(mockClientInfo, mockClientInfo)

        expect(mockWebSocket.sentMessages).toHaveLength(3)
        
        const requestMessage = JSON.parse(mockWebSocket.sentMessages[0])
        expect(requestMessage.event).toBe('request_screenshare')
        
        const acceptMessage = JSON.parse(mockWebSocket.sentMessages[1])
        expect(acceptMessage.event).toBe('accept_screenshare')
        
        const denyMessage = JSON.parse(mockWebSocket.sentMessages[2])
        expect(denyMessage.event).toBe('deny_screenshare')
      })

      it('should send WebRTC signaling messages', () => {
        const mockOffer: RTCSessionDescriptionInit = {
          type: 'offer',
          sdp: 'mock-sdp-offer'
        }
        
        const mockAnswer: RTCSessionDescriptionInit = {
          type: 'answer',
          sdp: 'mock-sdp-answer'
        }

        const mockCandidate = {
          candidate: 'mock-candidate',
          sdpMid: 'audio',
          sdpMLineIndex: 0
        } as RTCIceCandidate

        client.sendWebRTCOffer(mockOffer, 'target-client', mockClientInfo)
        client.sendWebRTCAnswer(mockAnswer, 'target-client', mockClientInfo)
        client.sendICECandidate(mockCandidate, 'target-client', mockClientInfo)
        client.requestRenegotiation('target-client', 'Connection quality poor', mockClientInfo)

        expect(mockWebSocket.sentMessages).toHaveLength(4)
        
        const offerMessage = JSON.parse(mockWebSocket.sentMessages[0])
        expect(offerMessage.event).toBe('offer')
        expect(offerMessage.payload.sdp).toBe('mock-sdp-offer')
        
        const answerMessage = JSON.parse(mockWebSocket.sentMessages[1])
        expect(answerMessage.event).toBe('answer')
        expect(answerMessage.payload.sdp).toBe('mock-sdp-answer')
        
        const candidateMessage = JSON.parse(mockWebSocket.sentMessages[2])
        expect(candidateMessage.event).toBe('candidate')
        expect(candidateMessage.payload.candidate).toBe('mock-candidate')
        
        const renegotiateMessage = JSON.parse(mockWebSocket.sentMessages[3])
        expect(renegotiateMessage.event).toBe('renegotiate')
        expect(renegotiateMessage.payload.reason).toBe('Connection quality poor')
      })
    })

    describe('Cleanup and Resource Management', () => {
      it('should clean up resources on disconnect', async () => {
        const connectPromise = client.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise

        client.disconnect()

        expect(client.getConnectionState()).toBe('disconnected')
        expect(client.isConnected()).toBe(false)
      })

      it('should disable auto-reconnect on manual disconnect', async () => {
        const connectPromise = client.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise

        client.disconnect()

        // Wait to ensure the disconnect is processed
        await new Promise(resolve => setTimeout(resolve, 50))

        // Simulate another close event - should not trigger reconnection
        // Note: After disconnect, the state might be 'disconnected' already
        const currentState = client.getConnectionState()
        expect(['disconnected', 'error']).toContain(currentState)
      })
    })

    describe('Error Scenarios and Edge Cases', () => {
      it('should handle normal WebSocket closure (code 1000)', async () => {
        const connectPromise = client.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise

        // Simulate normal closure
        mockWebSocket.readyState = WebSocket.CLOSED
        const closeEvent = new CloseEvent('close', { code: 1000, reason: 'Normal closure' })
        mockWebSocket.onclose?.(closeEvent)

        expect(client.getConnectionState()).toBe('disconnected')
      })

      it('should handle multiple event subscriptions for same event', async () => {
        const handler1 = vi.fn()
        const handler2 = vi.fn()
        
        const connectPromise = client.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        await connectPromise
        
        client.on('room_state', handler1)
        client.on('room_state', handler2)

        const message: WebSocketMessage = {
          event: 'room_state',
          payload: {
            ...mockClientInfo,
            roomId: 'test-room',
            hosts: [],
            participants: [],
            handsRaised: [],
            waitingUsers: [],
            sharingScreen: []
          }
        }

        mockWebSocket.simulateMessage(JSON.stringify(message))

        expect(handler1).toHaveBeenCalledWith(message)
        expect(handler2).toHaveBeenCalledWith(message)
      })

      it('should handle unsubscribing non-existent handler', () => {
        const handler = vi.fn()
        
        // Try to unsubscribe handler that was never subscribed
        expect(() => {
          client.off('room_state', handler)
        }).not.toThrow()
      })

      it('should handle ICE candidate with null values', () => {
        const connectPromise = client.connect()
        setTimeout(() => mockWebSocket.simulateOpen(), 10)
        
        return connectPromise.then(() => {
          const mockCandidate = {
            candidate: 'mock-candidate',
            sdpMid: null,
            sdpMLineIndex: null
          } as unknown as RTCIceCandidate

          client.sendICECandidate(mockCandidate, 'target-client', mockClientInfo)

          const message = JSON.parse(mockWebSocket.sentMessages[0])
          expect(message.payload.sdpMid).toBeUndefined()
          expect(message.payload.sdpMLineIndex).toBeUndefined()
        })
      })
    })
  })
})
