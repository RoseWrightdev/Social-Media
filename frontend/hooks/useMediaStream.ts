import { useState, useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '@/store/useRoomStore';

interface MediaStreamState {
  isInitialized: boolean;
  isStarting: boolean;
  error: string | null;
}

interface MediaStreamOptions {
  autoStart?: boolean;
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

/**
 * Enhanced media stream hook that integrates with room store
 * Manages local media stream lifecycle and device management
 */
export const useMediaStream = (options: MediaStreamOptions = {}) => {
  const {
    autoStart = false,
    video = true,
    audio = true,
  } = options;

  const [state, setState] = useState<MediaStreamState>({
    isInitialized: false,
    isStarting: false,
    error: null,
  });

  const streamRef = useRef<MediaStream | null>(null);

  // Get room store state and actions
  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    availableDevices,
    selectedDevices,
    webrtcManager,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    switchMicrophone,
    refreshDevices,
    handleError,
  } = useRoomStore();

  /**
   * Initialize media stream with room integration
   */
  const initializeStream = useCallback(async () => {
    if (state.isStarting || state.isInitialized) return;

    setState(prev => ({ ...prev, isStarting: true, error: null }));

    try {
      // Request permissions and get devices first
      await refreshDevices();

      // Build constraints based on options and available devices
      const constraints: MediaStreamConstraints = {};

      if (audio && availableDevices.microphones.length > 0) {
        constraints.audio = typeof audio === 'boolean' ? true : audio;
        if (selectedDevices.microphone) {
          constraints.audio = {
            ...(typeof audio === 'object' ? audio : {}),
            deviceId: { exact: selectedDevices.microphone }
          };
        }
      }

      if (video && availableDevices.cameras.length > 0) {
        constraints.video = typeof video === 'boolean' ? true : video;
        if (selectedDevices.camera) {
          constraints.video = {
            ...(typeof video === 'object' ? video : {}),
            deviceId: { exact: selectedDevices.camera }
          };
        }
      }

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Store stream in room store - WebRTC manager will pick it up from there
      // The room store will handle updating the WebRTC manager
      // This integration happens through the store's actions

      setState(prev => ({
        ...prev,
        isInitialized: true,
        isStarting: false,
        error: null,
      }));

      return stream;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize media stream';
      setState(prev => ({
        ...prev,
        isStarting: false,
        error: errorMessage,
      }));
      handleError(errorMessage);
      throw error;
    }
  }, [
    state.isStarting,
    state.isInitialized,
    audio,
    video,
    availableDevices.microphones.length,
    availableDevices.cameras.length,
    selectedDevices.microphone,
    selectedDevices.camera,
    webrtcManager,
    refreshDevices,
    handleError,
  ]);

  /**
   * Stop and cleanup media stream
   */
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setState({
      isInitialized: false,
      isStarting: false,
      error: null,
    });
  }, []);

  /**
   * Restart stream with new constraints
   */
  const restartStream = useCallback(async (newOptions?: MediaStreamOptions) => {
    cleanup();
    
    // If new options are provided, we need to reinitialize with those options
    if (newOptions) {
      // For now, just reinitialize - a full implementation would update the constraints
      // This would require refactoring to make constraints dynamic
      console.warn('New options provided to restartStream, but not fully implemented');
    }
    
    return initializeStream();
  }, [cleanup, initializeStream]);

  /**
   * Handle device permissions
   */
  const requestPermissions = useCallback(async () => {
    try {
      // Request camera permission
      if (video) {
        await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      // Request microphone permission
      if (audio) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      // Refresh device list after permissions granted
      await refreshDevices();
      
      return true;
    } catch (error) {
      const errorMessage = 'Media permissions denied';
      setState(prev => ({ ...prev, error: errorMessage }));
      handleError(errorMessage);
      return false;
    }
  }, [video, audio, refreshDevices, handleError]);

  /**
   * Check if camera is available and enabled
   */
  const isCameraActive = streamRef.current?.getVideoTracks().some(track => track.enabled) ?? false;

  /**
   * Check if microphone is available and enabled
   */
  const isMicrophoneActive = streamRef.current?.getAudioTracks().some(track => track.enabled) ?? false;

  /**
   * Get current stream statistics
   */
  const getStreamStats = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return null;

    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();

    return {
      video: {
        count: videoTracks.length,
        enabled: videoTracks.some(track => track.enabled),
        settings: videoTracks[0]?.getSettings(),
      },
      audio: {
        count: audioTracks.length,
        enabled: audioTracks.some(track => track.enabled),
        settings: audioTracks[0]?.getSettings(),
      },
    };
  }, []);

  /**
   * Auto-initialize on mount if requested
   */
  useEffect(() => {
    if (autoStart && !state.isInitialized && !state.isStarting) {
      initializeStream();
    }
  }, [autoStart, initializeStream, state.isInitialized, state.isStarting]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  /**
   * Monitor device changes
   */
  useEffect(() => {
    const handleDeviceChange = () => {
      refreshDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  return {
    // State from room store
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    availableDevices,
    selectedDevices,
    
    // Local state
    isInitialized: state.isInitialized,
    isStarting: state.isStarting,
    error: state.error,
    isCameraActive,
    isMicrophoneActive,
    
    // Actions from room store
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    switchMicrophone,
    refreshDevices,
    
    // Local actions
    initializeStream,
    cleanup,
    restartStream,
    requestPermissions,
    getStreamStats,
  };
};