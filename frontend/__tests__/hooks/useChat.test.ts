/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChat } from '@/hooks/useRoom'

// Mock chat messages
const mockMessages = [
  {
    id: 'msg-1',
    content: 'Hello everyone!',
    type: 'text' as const,
    senderId: 'user-1',
    senderName: 'User1',
    timestamp: Date.now() - 10000,
  },
  {
    id: 'msg-2',
    content: 'How is everyone doing?',
    type: 'text' as const,
    senderId: 'user-2',
    senderName: 'User2',
    timestamp: Date.now() - 5000,
  },
  {
    id: 'msg-3',
    content: 'Private message',
    type: 'private' as const,
    senderId: 'user-1',
    senderName: 'User1',
    targetId: 'local-user',
    timestamp: Date.now(),
  },
]

// Mock the room store
const mockRoomStore = {
  messages: mockMessages,
  unreadCount: 2,
  isChatPanelOpen: false,
  
  // Actions
  sendMessage: vi.fn(),
  markMessagesRead: vi.fn(),
  toggleChatPanel: vi.fn(),
}

vi.mock('@/store/useRoomStore', () => ({
  useRoomStore: () => mockRoomStore
}))

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock store state
    mockRoomStore.messages = mockMessages
    mockRoomStore.unreadCount = 2
    mockRoomStore.isChatPanelOpen = false
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('basic hook functionality', () => {
    it('should return chat state correctly', () => {
      const { result } = renderHook(() => useChat())

      expect(result.current.messages).toEqual(mockMessages)
      expect(result.current.unreadCount).toBe(2)
      expect(result.current.isChatPanelOpen).toBe(false)
      expect(result.current.hasUnreadMessages).toBe(true)
    })

    it('should provide all expected actions', () => {
      const { result } = renderHook(() => useChat())

      expect(typeof result.current.sendTextMessage).toBe('function')
      expect(typeof result.current.sendPrivateMessage).toBe('function')
      expect(typeof result.current.openChat).toBe('function')
      expect(typeof result.current.closeChat).toBe('function')
      expect(typeof result.current.markMessagesRead).toBe('function')
    })

    it('should calculate hasUnreadMessages correctly', () => {
      const { result, rerender } = renderHook(() => useChat())

      // Has unread messages
      expect(result.current.hasUnreadMessages).toBe(true)

      // No unread messages
      mockRoomStore.unreadCount = 0
      rerender()
      expect(result.current.hasUnreadMessages).toBe(false)
    })
  })

  describe('message sending', () => {
    it('should send text message', () => {
      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.sendTextMessage('Hello world!')
      })

      expect(mockRoomStore.sendMessage).toHaveBeenCalledWith('Hello world!', 'text')
    })

    it('should send private message', () => {
      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.sendPrivateMessage('Secret message', 'user-2')
      })

      expect(mockRoomStore.sendMessage).toHaveBeenCalledWith('Secret message', 'private', 'user-2')
    })
  })

  describe('chat panel management', () => {
    it('should open chat when panel is closed', () => {
      mockRoomStore.isChatPanelOpen = false

      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.openChat()
      })

      expect(mockRoomStore.toggleChatPanel).toHaveBeenCalledTimes(1)
      expect(mockRoomStore.markMessagesRead).toHaveBeenCalledTimes(1)
    })

    it('should mark messages as read when opening already open chat', () => {
      mockRoomStore.isChatPanelOpen = true

      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.openChat()
      })

      expect(mockRoomStore.toggleChatPanel).not.toHaveBeenCalled()
      expect(mockRoomStore.markMessagesRead).toHaveBeenCalledTimes(1)
    })

    it('should close chat when panel is open', () => {
      mockRoomStore.isChatPanelOpen = true

      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.closeChat()
      })

      expect(mockRoomStore.toggleChatPanel).toHaveBeenCalledTimes(1)
    })

    it('should not close chat when panel is already closed', () => {
      mockRoomStore.isChatPanelOpen = false

      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.closeChat()
      })

      expect(mockRoomStore.toggleChatPanel).not.toHaveBeenCalled()
    })
  })

  describe('message reading', () => {
    it('should mark messages as read', () => {
      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.markMessagesRead()
      })

      expect(mockRoomStore.markMessagesRead).toHaveBeenCalledTimes(1)
    })
  })

  describe('state updates', () => {
    it('should reflect message changes', () => {
      const { result, rerender } = renderHook(() => useChat())

      // Initial state
      expect(result.current.messages).toHaveLength(3)

      // Add new message
      const newMessage = {
        id: 'msg-4',
        content: 'New message',
        type: 'text' as const,
        senderId: 'user-3',
        senderName: 'User3',
        timestamp: Date.now(),
      }

      mockRoomStore.messages = [...mockMessages, newMessage]
      rerender()

      expect(result.current.messages).toHaveLength(4)
      expect(result.current.messages[3]).toEqual(newMessage)
    })

    it('should reflect unread count changes', () => {
      const { result, rerender } = renderHook(() => useChat())

      // Initial state
      expect(result.current.unreadCount).toBe(2)
      expect(result.current.hasUnreadMessages).toBe(true)

      // Clear unread messages
      mockRoomStore.unreadCount = 0
      rerender()

      expect(result.current.unreadCount).toBe(0)
      expect(result.current.hasUnreadMessages).toBe(false)
    })

    it('should reflect chat panel state changes', () => {
      const { result, rerender } = renderHook(() => useChat())

      // Initial state
      expect(result.current.isChatPanelOpen).toBe(false)

      // Open chat panel
      mockRoomStore.isChatPanelOpen = true
      rerender()

      expect(result.current.isChatPanelOpen).toBe(true)
    })
  })

  describe('function stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useChat())

      const firstSendTextMessage = result.current.sendTextMessage
      const firstSendPrivateMessage = result.current.sendPrivateMessage
      const firstOpenChat = result.current.openChat
      const firstCloseChat = result.current.closeChat

      // Update some state
      mockRoomStore.unreadCount = 5
      rerender()

      expect(result.current.sendTextMessage).toBe(firstSendTextMessage)
      expect(result.current.sendPrivateMessage).toBe(firstSendPrivateMessage)
      expect(result.current.openChat).toBe(firstOpenChat)
      expect(result.current.closeChat).toBe(firstCloseChat)
    })
  })

  describe('edge cases', () => {
    it('should handle empty message list', () => {
      mockRoomStore.messages = []

      const { result } = renderHook(() => useChat())

      expect(result.current.messages).toHaveLength(0)
      expect(result.current.messages).toEqual([])
    })

    it('should handle sending empty messages', () => {
      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.sendTextMessage('')
      })

      expect(mockRoomStore.sendMessage).toHaveBeenCalledWith('', 'text')

      act(() => {
        result.current.sendPrivateMessage('', 'user-1')
      })

      expect(mockRoomStore.sendMessage).toHaveBeenCalledWith('', 'private', 'user-1')
    })
  })
})
