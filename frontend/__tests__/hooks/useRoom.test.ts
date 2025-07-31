/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRoom } from '@/hooks/useRoom'

// Mock the room store
const mockRoomStore = {
  // Room state
  roomId: null as string | null,
  roomName: '',
  isJoined: false,
  isHost: false,
  currentUsername: '',
  connectionState: { wsConnected: false, wsReconnecting: false },
  isWaitingRoom: false,
  
  // Room actions
  initializeRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  updateRoomSettings: vi.fn(),
  handleError: vi.fn(),
  clearError: vi.fn(),
}

vi.mock('@/store/useRoomStore', () => ({
  useRoomStore: () => mockRoomStore
}))

describe('useRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock store state
    mockRoomStore.roomId = null
    mockRoomStore.roomName = ''
    mockRoomStore.isJoined = false
    mockRoomStore.isHost = false
    mockRoomStore.currentUsername = ''
    mockRoomStore.connectionState = { wsConnected: false, wsReconnecting: false }
    mockRoomStore.isWaitingRoom = false
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('basic hook functionality', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHook(() => useRoom())

      expect(result.current.roomId).toBeNull()
      expect(result.current.roomName).toBe('')
      expect(result.current.isJoined).toBe(false)
      expect(result.current.isHost).toBe(false)
      expect(result.current.currentUsername).toBe('')
      expect(result.current.isWaitingRoom).toBe(false)
      expect(result.current.isRoomReady).toBe(false)
      expect(result.current.hasConnectionIssues).toBe(false)
    })

    it('should provide all expected actions', () => {
      const { result } = renderHook(() => useRoom())

      expect(typeof result.current.joinRoomWithAuth).toBe('function')
      expect(typeof result.current.exitRoom).toBe('function')
      expect(typeof result.current.updateRoomSettings).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
    })
  })

  describe('joinRoomWithAuth', () => {
    it('should successfully join room with authentication', async () => {
      mockRoomStore.initializeRoom.mockResolvedValue(undefined)
      mockRoomStore.joinRoom.mockResolvedValue(undefined)

      const { result } = renderHook(() => useRoom())

      await act(async () => {
        await result.current.joinRoomWithAuth('room-123', 'TestUser', 'jwt-token')
      })

      expect(mockRoomStore.initializeRoom).toHaveBeenCalledWith('room-123', 'TestUser', 'jwt-token')
      expect(mockRoomStore.joinRoom).toHaveBeenCalledWith(undefined)
    })

    it('should join room with approval token', async () => {
      mockRoomStore.initializeRoom.mockResolvedValue(undefined)
      mockRoomStore.joinRoom.mockResolvedValue(undefined)

      const { result } = renderHook(() => useRoom())

      await act(async () => {
        await result.current.joinRoomWithAuth('room-123', 'TestUser', 'jwt-token', 'approval-token')
      })

      expect(mockRoomStore.initializeRoom).toHaveBeenCalledWith('room-123', 'TestUser', 'jwt-token')
      expect(mockRoomStore.joinRoom).toHaveBeenCalledWith('approval-token')
    })

    it('should handle initialization errors', async () => {
      const error = new Error('Failed to initialize')
      mockRoomStore.initializeRoom.mockRejectedValue(error)

      const { result } = renderHook(() => useRoom())

      await expect(
        act(async () => {
          await result.current.joinRoomWithAuth('room-123', 'TestUser', 'jwt-token')
        })
      ).rejects.toThrow('Failed to initialize')

      expect(mockRoomStore.handleError).toHaveBeenCalledWith('Failed to join room: Error: Failed to initialize')
      expect(mockRoomStore.joinRoom).not.toHaveBeenCalled()
    })

    it('should handle join room errors', async () => {
      mockRoomStore.initializeRoom.mockResolvedValue(undefined)
      const error = new Error('Room is full')
      mockRoomStore.joinRoom.mockRejectedValue(error)

      const { result } = renderHook(() => useRoom())

      try {
        await act(async () => {
          await result.current.joinRoomWithAuth('room-123', 'TestUser', 'jwt-token')
        })
        expect.fail('Expected function to throw')
      } catch (thrown) {
        expect((thrown as Error).message).toBe('Room is full')
      }

      expect(mockRoomStore.initializeRoom).toHaveBeenCalledWith('room-123', 'TestUser', 'jwt-token')
      expect(mockRoomStore.joinRoom).toHaveBeenCalledWith(undefined)
      expect(mockRoomStore.handleError).toHaveBeenCalledWith('Failed to join room: Error: Room is full')
    })
  })

  describe('exitRoom', () => {
    it('should call leaveRoom when exiting', () => {
      const { result } = renderHook(() => useRoom())

      act(() => {
        result.current.exitRoom()
      })

      expect(mockRoomStore.leaveRoom).toHaveBeenCalledTimes(1)
    })
  })

  describe('room status helpers', () => {
    it('should calculate isRoomReady correctly', () => {
      // Not ready: not connected
      mockRoomStore.connectionState = { wsConnected: false, wsReconnecting: false }
      mockRoomStore.isJoined = true
      mockRoomStore.isWaitingRoom = false

      const { result, rerender } = renderHook(() => useRoom())
      expect(result.current.isRoomReady).toBe(false)

      // Not ready: not joined
      mockRoomStore.connectionState = { wsConnected: true, wsReconnecting: false }
      mockRoomStore.isJoined = false
      mockRoomStore.isWaitingRoom = false
      rerender()
      expect(result.current.isRoomReady).toBe(false)

      // Not ready: in waiting room
      mockRoomStore.connectionState = { wsConnected: true, wsReconnecting: false }
      mockRoomStore.isJoined = true
      mockRoomStore.isWaitingRoom = true
      rerender()
      expect(result.current.isRoomReady).toBe(false)

      // Ready: all conditions met
      mockRoomStore.connectionState = { wsConnected: true, wsReconnecting: false }
      mockRoomStore.isJoined = true
      mockRoomStore.isWaitingRoom = false
      rerender()
      expect(result.current.isRoomReady).toBe(true)
    })

    it('should calculate hasConnectionIssues correctly', () => {
      // No issues: connected and not joined
      mockRoomStore.connectionState = { wsConnected: true, wsReconnecting: false }
      mockRoomStore.isJoined = false

      const { result, rerender } = renderHook(() => useRoom())
      expect(result.current.hasConnectionIssues).toBe(false)

      // Issues: reconnecting
      mockRoomStore.connectionState = { wsConnected: false, wsReconnecting: true }
      mockRoomStore.isJoined = false
      rerender()
      expect(result.current.hasConnectionIssues).toBe(true)

      // Issues: joined but disconnected
      mockRoomStore.connectionState = { wsConnected: false, wsReconnecting: false }
      mockRoomStore.isJoined = true
      rerender()
      expect(result.current.hasConnectionIssues).toBe(true)

      // No issues: connected and joined
      mockRoomStore.connectionState = { wsConnected: true, wsReconnecting: false }
      mockRoomStore.isJoined = true
      rerender()
      expect(result.current.hasConnectionIssues).toBe(false)
    })
  })

  describe('state updates', () => {
    it('should reflect room state changes', () => {
      const { result, rerender } = renderHook(() => useRoom())

      // Initial state
      expect(result.current.roomId).toBeNull()
      expect(result.current.isHost).toBe(false)

      // Update state
      mockRoomStore.roomId = 'room-123'
      mockRoomStore.roomName = 'Test Room'
      mockRoomStore.isHost = true
      mockRoomStore.currentUsername = 'TestUser'

      rerender()

      expect(result.current.roomId).toBe('room-123')
      expect(result.current.roomName).toBe('Test Room')
      expect(result.current.isHost).toBe(true)
      expect(result.current.currentUsername).toBe('TestUser')
    })
  })

  describe('function stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useRoom())

      const firstJoinRoomWithAuth = result.current.joinRoomWithAuth
      const firstExitRoom = result.current.exitRoom

      // Update some state
      mockRoomStore.roomId = 'room-123'
      rerender()

      expect(result.current.joinRoomWithAuth).toBe(firstJoinRoomWithAuth)
      expect(result.current.exitRoom).toBe(firstExitRoom)
    })
  })
})
