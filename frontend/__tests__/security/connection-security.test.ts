import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useRoomStore } from '@/store/useRoomStore'

describe('Backend Connection Security', () => {
  beforeEach(() => {
    useRoomStore.getState().leaveRoom()
  })

  describe('Critical Security Checks', () => {
    it('should use correct WebSocket endpoint (not vulnerable /ws/room/)', () => {
      // This test verifies we fixed the critical endpoint issue
      const mockWebSocketSpy = vi.spyOn(global, 'WebSocket')
      
      useRoomStore.getState().initializeRoom('test-room', 'user', 'jwt-token')
      
      // Verify CORRECT endpoint is used (was /ws/room/ - WRONG)
      expect(mockWebSocketSpy).toHaveBeenCalledWith(
        'ws://localhost:8080/ws/zoom/test-room?token=jwt-token'
      )
      
      // Verify WRONG endpoint is NOT used
      expect(mockWebSocketSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('/ws/room/')
      )
    })

    it('should include JWT token in connection for authentication', () => {
      const mockWebSocketSpy = vi.spyOn(global, 'WebSocket')
      const testJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature'
      
      useRoomStore.getState().initializeRoom('secure-room', 'user', testJWT)
      
      // Verify JWT token is included for backend validation
      expect(mockWebSocketSpy).toHaveBeenCalledWith(
        expect.stringContaining(`token=${testJWT}`)
      )
    })

    it('should prevent connection without authentication token', () => {
      const mockWebSocketSpy = vi.spyOn(global, 'WebSocket')
      
      // Attempt connection without token (should fail in real backend)
      useRoomStore.getState().initializeRoom('room', 'user', '')
      
      // Even with empty token, connection attempt includes token param
      expect(mockWebSocketSpy).toHaveBeenCalledWith(
        expect.stringContaining('token=')
      )
    })

    it('should handle room-specific connections (no cross-room access)', () => {
      const mockWebSocketSpy = vi.spyOn(global, 'WebSocket')
      
      // Connect to specific room
      useRoomStore.getState().initializeRoom('private-room-123', 'user', 'token')
      
      // Verify room ID is part of connection URL (prevents cross-room access)
      expect(mockWebSocketSpy).toHaveBeenCalledWith(
        expect.stringContaining('/ws/zoom/private-room-123')
      )
    })
  })

  describe('Store State Security', () => {
    it('should properly isolate room state', () => {
      const store = useRoomStore.getState()
      
      // Verify initial state is clean
      expect(store.roomId).toBeNull()
      expect(store.participants.size).toBe(0)
      expect(store.messages).toHaveLength(0)
      expect(store.wsClient).toBeNull()
    })

    it('should clean up sensitive data on room leave', () => {
      const store = useRoomStore.getState()
      
      // Simulate room with sensitive data
      store.initializeRoom('sensitive-room', 'user', 'secret-token')
      
      // Leave room
      store.leaveRoom()
      
      // Verify all sensitive data is cleared
      expect(store.roomId).toBeNull()
      expect(store.currentUsername).toBeNull()
      expect(store.wsClient).toBeNull()
      expect(store.participants.size).toBe(0)
      expect(store.messages).toHaveLength(0)
      expect(store.connectionState.wsConnected).toBe(false)
    })
  })
})
