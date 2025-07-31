/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaControls } from '@/hooks/useRoom'

// Mock media devices
const mockDevices = {
  cameras: [
    { deviceId: 'camera-1', label: 'Camera 1', kind: 'videoinput' },
    { deviceId: 'camera-2', label: 'Camera 2', kind: 'videoinput' },
  ],
  microphones: [
    { deviceId: 'mic-1', label: 'Microphone 1', kind: 'audioinput' },
    { deviceId: 'mic-2', label: 'Microphone 2', kind: 'audioinput' },
  ],
  speakers: [
    { deviceId: 'speaker-1', label: 'Speaker 1', kind: 'audiooutput' },
  ],
}

const mockSelectedDevices = {
  camera: 'camera-1',
  microphone: 'mic-1',
  speaker: 'speaker-1',
}

// Mock media streams
const mockLocalStream = {
  id: 'local-stream',
  getTracks: () => [],
  getAudioTracks: () => [],
  getVideoTracks: () => [],
} as any

const mockScreenShareStream = {
  id: 'screen-stream',
  getTracks: () => [],
  getAudioTracks: () => [],
  getVideoTracks: () => [],
} as any

// Mock the room store
const mockRoomStore = {
  // Media stream state
  localStream: mockLocalStream,
  screenShareStream: null as any,
  isAudioEnabled: true,
  isVideoEnabled: true,
  isScreenSharing: false,
  availableDevices: mockDevices,
  selectedDevices: mockSelectedDevices,
  
  // Media control actions
  toggleAudio: vi.fn(),
  toggleVideo: vi.fn(),
  startScreenShare: vi.fn(),
  stopScreenShare: vi.fn(),
  switchCamera: vi.fn(),
  switchMicrophone: vi.fn(),
  refreshDevices: vi.fn(),
}

vi.mock('@/store/useRoomStore', () => ({
  useRoomStore: () => mockRoomStore
}))

describe('useMediaControls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock store state
    mockRoomStore.localStream = mockLocalStream
    mockRoomStore.screenShareStream = null
    mockRoomStore.isAudioEnabled = true
    mockRoomStore.isVideoEnabled = true
    mockRoomStore.isScreenSharing = false
    mockRoomStore.availableDevices = mockDevices
    mockRoomStore.selectedDevices = mockSelectedDevices
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('basic hook functionality', () => {
    it('should return media state correctly', () => {
      const { result } = renderHook(() => useMediaControls())

      expect(result.current.localStream).toEqual(mockLocalStream)
      expect(result.current.screenShareStream).toBeNull()
      expect(result.current.isAudioEnabled).toBe(true)
      expect(result.current.isVideoEnabled).toBe(true)
      expect(result.current.isScreenSharing).toBe(false)
      expect(result.current.availableDevices).toEqual(mockDevices)
      expect(result.current.selectedDevices).toEqual(mockSelectedDevices)
    })

    it('should provide all expected actions', () => {
      const { result } = renderHook(() => useMediaControls())

      expect(typeof result.current.toggleAudio).toBe('function')
      expect(typeof result.current.toggleVideo).toBe('function')
      expect(typeof result.current.toggleScreenShare).toBe('function')
      expect(typeof result.current.switchCamera).toBe('function')
      expect(typeof result.current.switchMicrophone).toBe('function')
      expect(typeof result.current.refreshDevices).toBe('function')
    })

    it('should refresh devices on mount', () => {
      renderHook(() => useMediaControls())

      expect(mockRoomStore.refreshDevices).toHaveBeenCalledTimes(1)
    })
  })

  describe('device capability checks', () => {
    it('should detect device availability correctly', () => {
      const { result } = renderHook(() => useMediaControls())

      expect(result.current.hasCamera).toBe(true)
      expect(result.current.hasMicrophone).toBe(true)
      expect(result.current.hasSpeaker).toBe(true)
    })

    it('should handle no devices available', () => {
      mockRoomStore.availableDevices = {
        cameras: [],
        microphones: [],
        speakers: [],
      }

      const { result } = renderHook(() => useMediaControls())

      expect(result.current.hasCamera).toBe(false)
      expect(result.current.hasMicrophone).toBe(false)
      expect(result.current.hasSpeaker).toBe(false)
    })
  })

  describe('media control actions', () => {
    it('should call toggleAudio', () => {
      const { result } = renderHook(() => useMediaControls())

      act(() => {
        result.current.toggleAudio()
      })

      expect(mockRoomStore.toggleAudio).toHaveBeenCalledTimes(1)
    })

    it('should call toggleVideo', () => {
      const { result } = renderHook(() => useMediaControls())

      act(() => {
        result.current.toggleVideo()
      })

      expect(mockRoomStore.toggleVideo).toHaveBeenCalledTimes(1)
    })

    it('should call switchCamera', () => {
      const { result } = renderHook(() => useMediaControls())

      act(() => {
        result.current.switchCamera('camera-2')
      })

      expect(mockRoomStore.switchCamera).toHaveBeenCalledWith('camera-2')
    })

    it('should call switchMicrophone', () => {
      const { result } = renderHook(() => useMediaControls())

      act(() => {
        result.current.switchMicrophone('mic-2')
      })

      expect(mockRoomStore.switchMicrophone).toHaveBeenCalledWith('mic-2')
    })

    it('should call refreshDevices', () => {
      const { result } = renderHook(() => useMediaControls())

      act(() => {
        result.current.refreshDevices()
      })

      // Called once on mount + once manually
      expect(mockRoomStore.refreshDevices).toHaveBeenCalledTimes(2)
    })
  })

  describe('screen sharing', () => {
    it('should start screen share when not sharing', async () => {
      mockRoomStore.isScreenSharing = false
      mockRoomStore.startScreenShare.mockResolvedValue(undefined)

      const { result } = renderHook(() => useMediaControls())

      await act(async () => {
        await result.current.toggleScreenShare()
      })

      expect(mockRoomStore.startScreenShare).toHaveBeenCalledTimes(1)
      expect(mockRoomStore.stopScreenShare).not.toHaveBeenCalled()
    })

    it('should stop screen share when sharing', async () => {
      mockRoomStore.isScreenSharing = true
      mockRoomStore.stopScreenShare.mockResolvedValue(undefined)

      const { result } = renderHook(() => useMediaControls())

      await act(async () => {
        await result.current.toggleScreenShare()
      })

      expect(mockRoomStore.stopScreenShare).toHaveBeenCalledTimes(1)
      expect(mockRoomStore.startScreenShare).not.toHaveBeenCalled()
    })

    it('should handle screen share start errors', async () => {
      mockRoomStore.isScreenSharing = false
      const error = new Error('Screen share denied')
      mockRoomStore.startScreenShare.mockRejectedValue(error)

      const { result } = renderHook(() => useMediaControls())

      await expect(
        act(async () => {
          await result.current.toggleScreenShare()
        })
      ).rejects.toThrow('Screen share denied')
    })

    it('should handle screen share stop errors', async () => {
      mockRoomStore.isScreenSharing = true
      const error = new Error('Failed to stop screen share')
      mockRoomStore.stopScreenShare.mockRejectedValue(error)

      const { result } = renderHook(() => useMediaControls())

      await expect(
        act(async () => {
          await result.current.toggleScreenShare()
        })
      ).rejects.toThrow('Failed to stop screen share')
    })
  })

  describe('state updates', () => {
    it('should reflect media state changes', () => {
      const { result, rerender } = renderHook(() => useMediaControls())

      // Initial state
      expect(result.current.isAudioEnabled).toBe(true)
      expect(result.current.isVideoEnabled).toBe(true)

      // Update state
      mockRoomStore.isAudioEnabled = false
      mockRoomStore.isVideoEnabled = false
      mockRoomStore.isScreenSharing = true
      mockRoomStore.screenShareStream = mockScreenShareStream

      rerender()

      expect(result.current.isAudioEnabled).toBe(false)
      expect(result.current.isVideoEnabled).toBe(false)
      expect(result.current.isScreenSharing).toBe(true)
      expect(result.current.screenShareStream).toEqual(mockScreenShareStream)
    })

    it('should reflect device changes', () => {
      const { result, rerender } = renderHook(() => useMediaControls())

      // Initial state
      expect(result.current.hasCamera).toBe(true)
      expect(result.current.availableDevices.cameras).toHaveLength(2)

      // Update devices
      const newDevices = {
        cameras: [{ deviceId: 'camera-new', label: 'New Camera', kind: 'videoinput' }],
        microphones: [],
        speakers: [],
      }
      mockRoomStore.availableDevices = newDevices

      rerender()

      expect(result.current.availableDevices).toEqual(newDevices)
      expect(result.current.hasCamera).toBe(true)
      expect(result.current.hasMicrophone).toBe(false)
    })
  })

  describe('function stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useMediaControls())

      const firstToggleScreenShare = result.current.toggleScreenShare

      // Update some state
      mockRoomStore.isAudioEnabled = false
      rerender()

      expect(result.current.toggleScreenShare).toBe(firstToggleScreenShare)
    })
  })

  describe('initialization behavior', () => {
    it('should only refresh devices once on mount', () => {
      const { unmount, rerender } = renderHook(() => useMediaControls())

      expect(mockRoomStore.refreshDevices).toHaveBeenCalledTimes(1)

      // Rerender shouldn't trigger another refresh
      rerender()
      expect(mockRoomStore.refreshDevices).toHaveBeenCalledTimes(1)

      // Unmount and remount should trigger another refresh
      unmount()
      renderHook(() => useMediaControls())
      expect(mockRoomStore.refreshDevices).toHaveBeenCalledTimes(2)
    })
  })
})
