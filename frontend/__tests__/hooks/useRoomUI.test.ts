/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRoomUI } from '@/hooks/useRoom'

// Mock the room store
const mockRoomStore = {
  isParticipantsPanelOpen: false,
  gridLayout: 'gallery' as 'gallery' | 'speaker' | 'sidebar',
  isPinned: false,
  pinnedParticipantId: null as string | null,
  selectedParticipantId: null as string | null,
  
  // Actions
  toggleParticipantsPanel: vi.fn(),
  setGridLayout: vi.fn(),
  pinParticipant: vi.fn(),
  selectParticipant: vi.fn(),
}

vi.mock('@/store/useRoomStore', () => ({
  useRoomStore: () => mockRoomStore
}))

describe('useRoomUI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock store state
    mockRoomStore.isParticipantsPanelOpen = false
    mockRoomStore.gridLayout = 'gallery'
    mockRoomStore.isPinned = false
    mockRoomStore.pinnedParticipantId = null
    mockRoomStore.selectedParticipantId = null
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('basic hook functionality', () => {
    it('should return UI state correctly', () => {
      const { result } = renderHook(() => useRoomUI())

      expect(result.current.isParticipantsPanelOpen).toBe(false)
      expect(result.current.gridLayout).toBe('gallery')
      expect(result.current.isPinned).toBe(false)
      expect(result.current.pinnedParticipantId).toBeNull()
      expect(result.current.selectedParticipantId).toBeNull()
    })

    it('should provide all expected actions', () => {
      const { result } = renderHook(() => useRoomUI())

      expect(typeof result.current.toggleParticipantsPanel).toBe('function')
      expect(typeof result.current.showGalleryView).toBe('function')
      expect(typeof result.current.showSpeakerView).toBe('function')
      expect(typeof result.current.showSidebarView).toBe('function')
      expect(typeof result.current.togglePin).toBe('function')
      expect(typeof result.current.selectParticipant).toBe('function')
    })
  })

  describe('layout management', () => {
    it('should switch to gallery view', () => {
      const { result } = renderHook(() => useRoomUI())

      act(() => {
        result.current.showGalleryView()
      })

      expect(mockRoomStore.setGridLayout).toHaveBeenCalledWith('gallery')
      expect(mockRoomStore.pinParticipant).toHaveBeenCalledWith(null)
    })

    it('should switch to speaker view', () => {
      const { result } = renderHook(() => useRoomUI())

      act(() => {
        result.current.showSpeakerView()
      })

      expect(mockRoomStore.setGridLayout).toHaveBeenCalledWith('speaker')
    })

    it('should switch to sidebar view', () => {
      const { result } = renderHook(() => useRoomUI())

      act(() => {
        result.current.showSidebarView()
      })

      expect(mockRoomStore.setGridLayout).toHaveBeenCalledWith('sidebar')
    })
  })

  describe('participant panel management', () => {
    it('should toggle participants panel', () => {
      const { result } = renderHook(() => useRoomUI())

      act(() => {
        result.current.toggleParticipantsPanel()
      })

      expect(mockRoomStore.toggleParticipantsPanel).toHaveBeenCalledTimes(1)
    })
  })

  describe('participant selection', () => {
    it('should select participant', () => {
      const { result } = renderHook(() => useRoomUI())

      act(() => {
        result.current.selectParticipant('participant-1')
      })

      expect(mockRoomStore.selectParticipant).toHaveBeenCalledWith('participant-1')
    })
  })

  describe('pin management', () => {
    it('should pin selected participant when not pinned', () => {
      mockRoomStore.isPinned = false
      mockRoomStore.selectedParticipantId = 'participant-1'

      const { result } = renderHook(() => useRoomUI())

      act(() => {
        result.current.togglePin()
      })

      expect(mockRoomStore.pinParticipant).toHaveBeenCalledWith('participant-1')
    })

    it('should unpin participant when already pinned', () => {
      mockRoomStore.isPinned = true
      mockRoomStore.pinnedParticipantId = 'participant-1'

      const { result } = renderHook(() => useRoomUI())

      act(() => {
        result.current.togglePin()
      })

      expect(mockRoomStore.pinParticipant).toHaveBeenCalledWith(null)
    })

    it('should not pin when no participant is selected', () => {
      mockRoomStore.isPinned = false
      mockRoomStore.selectedParticipantId = null

      const { result } = renderHook(() => useRoomUI())

      act(() => {
        result.current.togglePin()
      })

      expect(mockRoomStore.pinParticipant).not.toHaveBeenCalled()
    })

    it('should unpin even when no selected participant', () => {
      mockRoomStore.isPinned = true
      mockRoomStore.pinnedParticipantId = 'participant-1'
      mockRoomStore.selectedParticipantId = null

      const { result } = renderHook(() => useRoomUI())

      act(() => {
        result.current.togglePin()
      })

      expect(mockRoomStore.pinParticipant).toHaveBeenCalledWith(null)
    })
  })

  describe('state updates', () => {
    it('should reflect panel state changes', () => {
      const { result, rerender } = renderHook(() => useRoomUI())

      // Initial state
      expect(result.current.isParticipantsPanelOpen).toBe(false)

      // Open panel
      mockRoomStore.isParticipantsPanelOpen = true
      rerender()

      expect(result.current.isParticipantsPanelOpen).toBe(true)
    })

    it('should reflect layout changes', () => {
      const { result, rerender } = renderHook(() => useRoomUI())

      // Initial state
      expect(result.current.gridLayout).toBe('gallery')

      // Change layout
      mockRoomStore.gridLayout = 'speaker'
      rerender()

      expect(result.current.gridLayout).toBe('speaker')
    })

    it('should reflect pin state changes', () => {
      const { result, rerender } = renderHook(() => useRoomUI())

      // Initial state
      expect(result.current.isPinned).toBe(false)
      expect(result.current.pinnedParticipantId).toBeNull()

      // Pin participant
      mockRoomStore.isPinned = true
      mockRoomStore.pinnedParticipantId = 'participant-1'
      rerender()

      expect(result.current.isPinned).toBe(true)
      expect(result.current.pinnedParticipantId).toBe('participant-1')
    })

    it('should reflect selection changes', () => {
      const { result, rerender } = renderHook(() => useRoomUI())

      // Initial state
      expect(result.current.selectedParticipantId).toBeNull()

      // Select participant
      mockRoomStore.selectedParticipantId = 'participant-2'
      rerender()

      expect(result.current.selectedParticipantId).toBe('participant-2')
    })
  })

  describe('function stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useRoomUI())

      const firstShowGalleryView = result.current.showGalleryView
      const firstShowSpeakerView = result.current.showSpeakerView
      const firstShowSidebarView = result.current.showSidebarView
      const firstTogglePin = result.current.togglePin

      // Update some state
      mockRoomStore.gridLayout = 'speaker'
      rerender()

      expect(result.current.showGalleryView).toBe(firstShowGalleryView)
      expect(result.current.showSpeakerView).toBe(firstShowSpeakerView)
      expect(result.current.showSidebarView).toBe(firstShowSidebarView)
      expect(result.current.togglePin).toBe(firstTogglePin)
    })
  })

  describe('complex scenarios', () => {
    it('should handle multiple layout switches', () => {
      const { result } = renderHook(() => useRoomUI())

      // Switch to speaker view
      act(() => {
        result.current.showSpeakerView()
      })
      expect(mockRoomStore.setGridLayout).toHaveBeenCalledWith('speaker')

      // Switch to sidebar view
      act(() => {
        result.current.showSidebarView()
      })
      expect(mockRoomStore.setGridLayout).toHaveBeenCalledWith('sidebar')

      // Switch to gallery view (should also unpin)
      act(() => {
        result.current.showGalleryView()
      })
      expect(mockRoomStore.setGridLayout).toHaveBeenCalledWith('gallery')
      expect(mockRoomStore.pinParticipant).toHaveBeenCalledWith(null)
    })

    it('should handle pin/unpin cycles', () => {
      mockRoomStore.selectedParticipantId = 'participant-1'

      const { result, rerender } = renderHook(() => useRoomUI())

      // Pin participant
      mockRoomStore.isPinned = false
      act(() => {
        result.current.togglePin()
      })
      expect(mockRoomStore.pinParticipant).toHaveBeenCalledWith('participant-1')

      // Unpin participant
      mockRoomStore.isPinned = true
      mockRoomStore.pinnedParticipantId = 'participant-1'
      rerender()
      act(() => {
        result.current.togglePin()
      })
      expect(mockRoomStore.pinParticipant).toHaveBeenCalledWith(null)
    })
  })
})
