import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useRoomStore } from '@/store/useRoomStore'
import { WebSocketClient } from '@/lib/websockets'

// Mock WebSocket implementation for testing
class MockWebSocket extends EventTarget {
  url: string
  readyState: number = WebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  sentMessages: string[] = []

  constructor(url: string) {
    super()
    this.url = url
    
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      const openEvent = new Event('open')
      this.onopen?.(openEvent)
      this.dispatchEvent(openEvent)
    }, 10)
  }

  send(data: string) {
    this.sentMessages.push(data)
    
    // Echo back for basic testing
    setTimeout(() => {
      const messageEvent = new MessageEvent('message', { data })
      this.onmessage?.(messageEvent)
      this.dispatchEvent(messageEvent)
    }, 10)
  }

  close() {
    this.readyState = WebSocket.CLOSED
    const closeEvent = new CloseEvent('close')
    this.onclose?.(closeEvent)
    this.dispatchEvent(closeEvent)
  }

  // Simulate receiving a message from server
  simulateMessage(data: string) {
    const messageEvent = new MessageEvent('message', { data })
    this.onmessage?.(messageEvent)
    this.dispatchEvent(messageEvent)
  }
}

describe('Frontend-Backend Integration Tests', () => {
  let mockWebSocket: MockWebSocket

  beforeEach(() => {
    // Reset store state
    useRoomStore.getState().leaveRoom()
    
    // Mock WebSocket constructor
    vi.mocked(global.WebSocket).mockImplementation((url: string | URL) => {
      mockWebSocket = new MockWebSocket(url.toString()) as any
      return mockWebSocket as any
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    mockWebSocket?.close()
  })

  describe('WebSocket Connection', () => {
    it('should connect to correct backend endpoint', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room-123', 'Test User', 'jwt-token-123')
      })

      // Verify WebSocket was created with correct URL
      expect(global.WebSocket).toHaveBeenCalledWith(
        'ws://localhost:8080/ws/zoom/test-room-123?token=jwt-token-123'
      )
      
      // Verify store state was updated
      expect(store.roomId).toBe('test-room-123')
      expect(store.currentUsername).toBe('Test User')
      expect(store.wsClient).toBeTruthy()
      expect(store.connectionState.wsConnected).toBe(true)
    })

    it('should handle room_state events from backend', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

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
      })

      // Verify participants were updated in store
      const participants = Array.from(store.participants.values())
      expect(participants).toHaveLength(2)
      expect(participants.find(p => p.id === 'host_1')?.role).toBe('host')
      expect(participants.find(p => p.id === 'user_123')?.username).toBe('Test User')
      
      // Verify waiting room users
      expect(store.pendingParticipants).toHaveLength(1)
      expect(store.pendingParticipants[0].username).toBe('Waiting User')
    })

    it('should handle chat messages from backend', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

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
      })

      // Verify chat message was added to store
      expect(store.messages).toHaveLength(1)
      expect(store.messages[0].content).toBe('Hello everyone!')
      expect(store.messages[0].username).toBe('John Doe')
      expect(store.messages[0].participantId).toBe('user_456')
      expect(store.unreadCount).toBe(1)
    })

    it('should handle waiting room acceptance', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

      // Set initial waiting room state
      act(() => {
        store.updateConnectionState({ wsConnected: true })
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
      })

      // Verify user was admitted to room
      expect(store.isWaitingRoom).toBe(false)
      expect(store.isJoined).toBe(true)
    })

    it('should handle waiting room denial', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

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
      })

      // Verify error was set
      expect(store.connectionState.lastError).toBe('Access to room denied')
    })

    it('should handle hand raising events', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

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
      })

      // Verify speaking participants was updated
      expect(store.speakingParticipants.has('user_456')).toBe(true)

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
      })

      // Verify speaking participants was updated
      expect(store.speakingParticipants.has('user_456')).toBe(false)
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

      // Verify room was initialized
      expect(store.roomId).toBe('test-room')
      expect(store.participants.size).toBe(1)
      expect(store.wsClient).toBeTruthy()

      // Leave room
      act(() => {
        store.leaveRoom()
      })

      // Verify state was reset
      expect(store.roomId).toBeNull()
      expect(store.participants.size).toBe(0)
      expect(store.wsClient).toBeNull()
      expect(store.connectionState.wsConnected).toBe(false)
      expect(store.messages).toHaveLength(0)
    })

    it('should handle connection state changes', async () => {
      const store = useRoomStore.getState()
      
      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'test-token')
      })

      // Test connection state updates
      act(() => {
        store.updateConnectionState({
          wsConnected: false,
          wsReconnecting: true,
          lastError: 'Connection lost'
        })
      })

      expect(store.connectionState.wsConnected).toBe(false)
      expect(store.connectionState.wsReconnecting).toBe(true)
      expect(store.connectionState.lastError).toBe('Connection lost')

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
      expect(global.WebSocket).toHaveBeenCalledWith(
        `ws://localhost:8080/ws/zoom/test-room?token=${testToken}`
      )
    })

    it('should handle authentication errors', async () => {
      const store = useRoomStore.getState()
      
      // Mock WebSocket to simulate auth error
      vi.mocked(global.WebSocket).mockImplementation((url: string | URL) => {
        const mockWs = new MockWebSocket(url.toString()) as any
        setTimeout(() => {
          const errorEvent = new Event('error')
          mockWs.onerror?.(errorEvent)
        }, 10)
        return mockWs
      })

      await act(async () => {
        await store.initializeRoom('test-room', 'Test User', 'invalid-token')
      })

      // Should handle auth failure gracefully
      expect(store.wsClient).toBeTruthy() // Connection object created
    })
  })
})
