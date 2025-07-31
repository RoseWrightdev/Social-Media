/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useParticipants } from '@/hooks/useRoom'

// Mock participant data
const mockParticipant1 = {
  id: 'participant-1',
  username: 'User1',
  isHost: false,
  isVideoEnabled: true,
  isAudioEnabled: true,
  stream: null,
}

const mockParticipant2 = {
  id: 'participant-2',
  username: 'User2',
  isHost: false,
  isVideoEnabled: false,
  isAudioEnabled: true,
  stream: null,
}

const mockLocalParticipant = {
  id: 'local-user',
  username: 'LocalUser',
  isHost: true,
  isVideoEnabled: true,
  isAudioEnabled: true,
  stream: null,
}

// Mock the room store
const mockRoomStore = {
  // Participant data
  participants: new Map([
    ['participant-1', mockParticipant1],
    ['participant-2', mockParticipant2],
  ]),
  localParticipant: mockLocalParticipant,
  speakingParticipants: new Set(['participant-1']),
  pendingParticipants: [{ id: 'pending-1', username: 'PendingUser' }],
  selectedParticipantId: null as string | null,
  pinnedParticipantId: null as string | null,
  isHost: true,
  
  // Participant management actions
  approveParticipant: vi.fn(),
  kickParticipant: vi.fn(),
  toggleParticipantAudio: vi.fn(),
  toggleParticipantVideo: vi.fn(),
  selectParticipant: vi.fn(),
  pinParticipant: vi.fn(),
}

vi.mock('@/store/useRoomStore', () => ({
  useRoomStore: () => mockRoomStore
}))

describe('useParticipants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock store state
    mockRoomStore.participants = new Map([
      ['participant-1', mockParticipant1],
      ['participant-2', mockParticipant2],
    ])
    mockRoomStore.localParticipant = mockLocalParticipant
    mockRoomStore.speakingParticipants = new Set(['participant-1'])
    mockRoomStore.pendingParticipants = [{ id: 'pending-1', username: 'PendingUser' }]
    mockRoomStore.selectedParticipantId = null
    mockRoomStore.pinnedParticipantId = null
    mockRoomStore.isHost = true
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('basic hook functionality', () => {
    it('should return participant data correctly', () => {
      const { result } = renderHook(() => useParticipants())

      expect(result.current.participants).toHaveLength(2)
      expect(result.current.participants[0]).toEqual(mockParticipant1)
      expect(result.current.participants[1]).toEqual(mockParticipant2)
      expect(result.current.localParticipant).toEqual(mockLocalParticipant)
      expect(result.current.participantCount).toBe(2)
    })

    it('should return speaking participants correctly', () => {
      const { result } = renderHook(() => useParticipants())

      expect(result.current.speakingParticipants).toHaveLength(1)
      expect(result.current.speakingParticipants[0]).toEqual(mockParticipant1)
    })

    it('should return pending participants', () => {
      const { result } = renderHook(() => useParticipants())

      expect(result.current.pendingParticipants).toHaveLength(1)
      expect(result.current.pendingParticipants[0]).toEqual({ id: 'pending-1', username: 'PendingUser' })
    })

    it('should provide all expected utility functions', () => {
      const { result } = renderHook(() => useParticipants())

      expect(typeof result.current.getParticipant).toBe('function')
      expect(typeof result.current.isParticipantSpeaking).toBe('function')
      expect(typeof result.current.selectParticipant).toBe('function')
      expect(typeof result.current.pinParticipant).toBe('function')
    })
  })

  describe('participant selection and pinning', () => {
    it('should handle selected participant', () => {
      mockRoomStore.selectedParticipantId = 'participant-1'

      const { result } = renderHook(() => useParticipants())

      expect(result.current.selectedParticipant).toEqual(mockParticipant1)
    })

    it('should handle pinned participant', () => {
      mockRoomStore.pinnedParticipantId = 'participant-2'

      const { result } = renderHook(() => useParticipants())

      expect(result.current.pinnedParticipant).toEqual(mockParticipant2)
    })

    it('should return null for non-existent selected participant', () => {
      mockRoomStore.selectedParticipantId = 'non-existent'

      const { result } = renderHook(() => useParticipants())

      expect(result.current.selectedParticipant).toBeUndefined()
    })

    it('should return null for non-existent pinned participant', () => {
      mockRoomStore.pinnedParticipantId = 'non-existent'

      const { result } = renderHook(() => useParticipants())

      expect(result.current.pinnedParticipant).toBeUndefined()
    })
  })

  describe('utility functions', () => {
    it('should get participant by ID', () => {
      const { result } = renderHook(() => useParticipants())

      const participant = result.current.getParticipant('participant-1')
      expect(participant).toEqual(mockParticipant1)

      const nonExistent = result.current.getParticipant('non-existent')
      expect(nonExistent).toBeUndefined()
    })

    it('should check if participant is speaking', () => {
      const { result } = renderHook(() => useParticipants())

      expect(result.current.isParticipantSpeaking('participant-1')).toBe(true)
      expect(result.current.isParticipantSpeaking('participant-2')).toBe(false)
      expect(result.current.isParticipantSpeaking('non-existent')).toBe(false)
    })

    it('should call selectParticipant action', () => {
      const { result } = renderHook(() => useParticipants())

      act(() => {
        result.current.selectParticipant('participant-1')
      })

      expect(mockRoomStore.selectParticipant).toHaveBeenCalledWith('participant-1')
    })

    it('should call pinParticipant action', () => {
      const { result } = renderHook(() => useParticipants())

      act(() => {
        result.current.pinParticipant('participant-2')
      })

      expect(mockRoomStore.pinParticipant).toHaveBeenCalledWith('participant-2')
    })
  })

  describe('host actions', () => {
    it('should provide host actions when user is host', () => {
      mockRoomStore.isHost = true

      const { result } = renderHook(() => useParticipants())

      expect(typeof result.current.approveParticipant).toBe('function')
      expect(typeof result.current.kickParticipant).toBe('function')
      expect(typeof result.current.toggleParticipantAudio).toBe('function')
      expect(typeof result.current.toggleParticipantVideo).toBe('function')
    })

    it('should not provide host actions when user is not host', () => {
      mockRoomStore.isHost = false

      const { result } = renderHook(() => useParticipants())

      expect(result.current.approveParticipant).toBeUndefined()
      expect(result.current.kickParticipant).toBeUndefined()
      expect(result.current.toggleParticipantAudio).toBeUndefined()
      expect(result.current.toggleParticipantVideo).toBeUndefined()
    })

    it('should call host actions when available', () => {
      mockRoomStore.isHost = true

      const { result } = renderHook(() => useParticipants())

      act(() => {
        result.current.approveParticipant?.('pending-1')
      })
      expect(mockRoomStore.approveParticipant).toHaveBeenCalledWith('pending-1')

      act(() => {
        result.current.kickParticipant?.('participant-1')
      })
      expect(mockRoomStore.kickParticipant).toHaveBeenCalledWith('participant-1')

      act(() => {
        result.current.toggleParticipantAudio?.('participant-2')
      })
      expect(mockRoomStore.toggleParticipantAudio).toHaveBeenCalledWith('participant-2')

      act(() => {
        result.current.toggleParticipantVideo?.('participant-1')
      })
      expect(mockRoomStore.toggleParticipantVideo).toHaveBeenCalledWith('participant-1')
    })
  })

  describe('state updates', () => {
    it('should reflect participant changes', () => {
      const { result, rerender } = renderHook(() => useParticipants())

      // Initial state
      expect(result.current.participants).toHaveLength(2)

      // Add new participant
      const newParticipant = {
        id: 'participant-3',
        username: 'User3',
        isHost: false,
        isVideoEnabled: true,
        isAudioEnabled: false,
        stream: null,
      }

      mockRoomStore.participants.set('participant-3', newParticipant)
      rerender()

      expect(result.current.participants).toHaveLength(3)
      expect(result.current.participantCount).toBe(3)
    })

    it('should reflect speaking participants changes', () => {
      const { result, rerender } = renderHook(() => useParticipants())

      // Initial state
      expect(result.current.speakingParticipants).toHaveLength(1)

      // Add speaking participant
      mockRoomStore.speakingParticipants.add('participant-2')
      rerender()

      expect(result.current.speakingParticipants).toHaveLength(2)
    })
  })

  describe('function stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useParticipants())

      const firstGetParticipant = result.current.getParticipant
      const firstIsParticipantSpeaking = result.current.isParticipantSpeaking

      // Update some state
      mockRoomStore.selectedParticipantId = 'participant-1'
      rerender()

      expect(result.current.getParticipant).toBe(firstGetParticipant)
      expect(result.current.isParticipantSpeaking).toBe(firstIsParticipantSpeaking)
    })
  })
})
