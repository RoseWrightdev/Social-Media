import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useRoomStore } from '@/store/useRoomStore'
import { WebSocketClient } from '@/lib/websockets'

// Enhanced Mock WebSocket implementation for testing
class MockWebSocket extends EventTarget {
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
    
    // Simulate realistic connection timing
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      const openEvent = new Event('open')
      this.onopen?.(openEvent)
      this.dispatchEvent(openEvent)
    }, 10)
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

  // Simulate receiving a message from server
  simulateMessage(data: string) {
    if (this.readyState === WebSocket.OPEN) {
      const messageEvent = new MessageEvent('message', { data })
      this.onmessage?.(messageEvent)
      this.dispatchEvent(messageEvent)
    }
  }

  // Simulate connection error
  simulateError() {
    const errorEvent = new Event('error')
    this.onerror?.(errorEvent)
    this.dispatchEvent(errorEvent)
  }
}

describe('Frontend-Backend Integration Tests', () => {
  let mockWebSocket: MockWebSocket
  let WebSocketSpy: any

  beforeEach(() => {
    // Reset store state
    useRoomStore.getState().leaveRoom()
    
    // Clear all mocks
    vi.clearAllMocks()
    
    // Create a spy on WebSocket constructor
    WebSocketSpy = vi.fn().mockImplementation((url: string | URL) => {
      const mock = new MockWebSocket(url.toString())
      mockWebSocket = mock
      return mock
    })
    
    // Mock WebSocket constructor with spy
    ;(global as any).WebSocket = WebSocketSpy
    // Copy static properties
    WebSocketSpy.CONNECTING = 0
    WebSocketSpy.OPEN = 1
    WebSocketSpy.CLOSING = 2
    WebSocketSpy.CLOSED = 3
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockWebSocket?.close()
  })

  describe('WebSocket Connection', () => {
    it('should connect to correct backend endpoint', async () => {
      const store = useRoomStore.getState()
      
      // Wait for connection to establish
      await act(async () => {
        await store.initializeRoom('test-room-123', 'Test User', 'jwt-token-123')
      })

      // Wait a bit for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 20))

      // Verify WebSocket was created with correct URL
      expect(WebSocketSpy).toHaveBeenCalledWith(
        'ws://localhost:8080/ws/zoom/test-room-123?token=jwt-token-123'
      )
      
      // Get updated store state
      const updatedStore = useRoomStore.getState()
      
      // Verify store state was updated
      expect(updatedStore.roomId).toBe('test-room-123')
      expect(updatedStore.currentUsername).toBe('Test User')
      expect(updatedStore.wsClient).toBeTruthy()
      expect(updatedStore.connectionState.wsConnected).toBe(true)
    })

    it('should handle room_state events from backend', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 20))

      // Simulate backend sending room_state event
      const roomStateEvent = {
        event: 'room_state',
        payload: {
          clientId: 'user_123',
          displayName: 'Test User',
          roomId: 'test-room',
          hosts: [
            { clientId: 'host_1', displayName: 'Host User' }
          ],
          participants: [
            { clientId: 'user_123', displayName: 'Test User' },
            { clientId: 'user_456', displayName: 'Other User' }
          ],
          handsRaised: [],
          waitingUsers: [
            { clientId: 'waiting_1', displayName: 'Waiting User' }
          ],
          sharingScreen: []
        }
      }

      await act(async () => {
        mockWebSocket.simulateMessage(JSON.stringify(roomStateEvent))
        // Wait for event handlers to process
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      // Get updated store state
      const updatedStore = useRoomStore.getState()
      
      // Verify participants were updated in store
      // Backend sends 1 host + 2 participants = 3 total participants in the map
      const participants = Array.from(updatedStore.participants.values())
      expect(participants).toHaveLength(3) // 1 host + 2 participants
      expect(participants.find(p => p.id === 'host_1')?.role).toBe('host')
      expect(participants.find(p => p.id === 'user_123')?.username).toBe('Test User')
      
      // Verify waiting room users
      expect(updatedStore.pendingParticipants).toHaveLength(1)
      expect(updatedStore.pendingParticipants[0].username).toBe('Waiting User')
    })

    it('should handle chat messages from backend', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20))

      // Simulate backend sending chat message
      const chatEvent = {
        event: 'add_chat',
        payload: {
          clientId: 'user_456',
          displayName: 'John Doe',
          chatId: 'msg_789',
          chatContent: 'Hello everyone!',
          timestamp: Date.now()
        }
      }

      await act(async () => {
        mockWebSocket.simulateMessage(JSON.stringify(chatEvent))
        // Wait for event processing
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      // Get updated store state
      const updatedStore = useRoomStore.getState()

      // Verify chat message was added to store
      expect(updatedStore.messages).toHaveLength(1)
      expect(updatedStore.messages[0].content).toBe('Hello everyone!')
      expect(updatedStore.messages[0].username).toBe('John Doe')
      expect(updatedStore.messages[0].participantId).toBe('user_456')
      expect(updatedStore.unreadCount).toBe(1)
    })

    it('should handle waiting room acceptance', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20))

      // Set initial waiting room state
      act(() => {
        useRoomStore.setState({ isWaitingRoom: true, isJoined: false })
      })

      // Simulate backend accepting user from waiting room
      const acceptEvent = {
        event: 'accept_waiting',
        payload: {
          clientId: 'user_123',
          displayName: 'Test User'
        }
      }

      await act(async () => {
        mockWebSocket.simulateMessage(JSON.stringify(acceptEvent))
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      // Get updated store state
      const updatedStore = useRoomStore.getState()

      // Verify user was admitted to room
      expect(updatedStore.isWaitingRoom).toBe(false)
      expect(updatedStore.isJoined).toBe(true)
    })

    it('should handle waiting room denial', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20))

      // Simulate backend denying user access
      const denyEvent = {
        event: 'deny_waiting',
        payload: {
          clientId: 'user_123',
          displayName: 'Test User'
        }
      }

      await act(async () => {
        mockWebSocket.simulateMessage(JSON.stringify(denyEvent))
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      // Get updated store state
      const updatedStore = useRoomStore.getState()

      // Verify error was set
      expect(updatedStore.connectionState.lastError).toBe('Access to room denied by host')
    })

    it('should handle hand raising events', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 20))

      // Simulate user raising hand
      const raiseHandEvent = {
        event: 'raise_hand',
        payload: {
          clientId: 'user_456',
          displayName: 'Other User'
        }
      }

      await act(async () => {
        mockWebSocket.simulateMessage(JSON.stringify(raiseHandEvent))
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      // Get updated store state
      const updatedStore = useRoomStore.getState()

      // Verify speaking participants was updated
      expect(updatedStore.speakingParticipants.has('user_456')).toBe(true)

      // Simulate user lowering hand
      const lowerHandEvent = {
        event: 'lower_hand',
        payload: {
          clientId: 'user_456',
          displayName: 'Other User'
        }
      }

      await act(async () => {
        mockWebSocket.simulateMessage(JSON.stringify(lowerHandEvent))
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      // Get updated store state again
      const finalStore = useRoomStore.getState()

      // Verify speaking participants was updated
      expect(finalStore.speakingParticipants.has('user_456')).toBe(false)
    })
  })

  describe('Sending Messages to Backend', () => {
    it('should send chat messages to backend', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

      // Send a chat message
      act(() => {
        store.sendMessage('Hello from frontend!')
      })

      // Verify message was sent via WebSocket
      expect(mockWebSocket.sentMessages.length).toBeGreaterThan(0)
      
      const sentMessage = JSON.parse(mockWebSocket.sentMessages[0])
      expect(sentMessage.event).toBe('add_chat')
      expect(sentMessage.payload.chatContent).toBe('Hello from frontend!')
      expect(sentMessage.payload.displayName).toBe('Test User')
    })

    it('should send join room request to backend', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

      // Join the room
      await act(async () => {
        await store.joinRoom()
      })

      // Verify join request was sent
      expect(mockWebSocket.sentMessages.length).toBeGreaterThan(0)
      
      const sentMessage = JSON.parse(mockWebSocket.sentMessages[0])
      expect(sentMessage.event).toBe('request_waiting')
      expect(sentMessage.payload.displayName).toBe('Test User')
    })
  })

  describe('Store State Management', () => {
    it('should properly reset state when leaving room', async () => {
      const store = useRoomStore.getState()
      
      // Initialize room with some state
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
        store.addParticipant({
          id: 'user_123',
          username: 'Test Participant',
          role: 'participant',
          isAudioEnabled: true,
          isVideoEnabled: true,
          isScreenSharing: false,
          isSpeaking: false,
          lastActivity: new Date(),
        })
      })

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 20))

      // Get updated store state after initialization
      const initializedStore = useRoomStore.getState()

      // Verify room was initialized
      expect(initializedStore.roomId).toBe('test-room')
      expect(initializedStore.participants.size).toBe(1)
      expect(initializedStore.wsClient).toBeTruthy()

      // Leave room
      act(() => {
        initializedStore.leaveRoom()
      })

      // Get final store state after leaving
      const finalStore = useRoomStore.getState()

      // Verify state was reset
      expect(finalStore.roomId).toBeNull()
      expect(finalStore.participants.size).toBe(0)
      expect(finalStore.wsClient).toBeNull()
      expect(finalStore.connectionState.wsConnected).toBe(false)
      expect(finalStore.messages).toHaveLength(0)
    })

    it('should handle connection state changes', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 20))

      // Test connection state updates
      act(() => {
        store.updateConnectionState({
          wsConnected: false,
          wsReconnecting: true,
          lastError: 'Connection lost'
        })
      })

      // Get updated store state
      const updatedStore = useRoomStore.getState()

      expect(updatedStore.connectionState.wsConnected).toBe(false)
      expect(updatedStore.connectionState.wsReconnecting).toBe(true)
      expect(updatedStore.connectionState.lastError).toBe('Connection lost')

      // Test clearing error
      act(() => {
        store.clearError()
      })

      expect(store.connectionState.lastError).toBeUndefined()
    })
  })

  describe('Authentication Integration', () => {
    it('should include JWT token in WebSocket connection', async () => {
      const store = useRoomStore.getState()
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', testToken)
      })

      // Verify WebSocket was created with token in query params
      expect(WebSocketSpy).toHaveBeenCalledWith(
        `ws://localhost:8080/ws/zoom/test-room?token=${testToken}`
      )
    })

    it('should handle authentication errors', async () => {
      const store = useRoomStore.getState()
      
      // Mock WebSocket to simulate auth error
      WebSocketSpy.mockImplementation((url: string | URL) => {
        const mock = new MockWebSocket(url.toString())
        mockWebSocket = mock
        // Simulate auth error immediately
        setTimeout(() => {
          mock.simulateError()
        }, 5)
        return mock
      })

      try {
        await act(async () => {
          await store.initializeRoom('test-room', 'Test User', 'invalid-token')
        })
      } catch (error) {
        // Expected to fail due to auth error
      }

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 30))

      // Get updated store state
      const updatedStore = useRoomStore.getState()

      // Should handle auth failure gracefully - error should be set in store
      expect(updatedStore.connectionState.lastError).toBe('Failed to initialize room: Error: Failed to connect to WebSocket server')
    })
  })
})
