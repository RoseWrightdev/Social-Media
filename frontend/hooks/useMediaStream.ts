import { useState, useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '@/store/useRoomStore';

/**
 * MEDIA STREAM MANAGEMENT HOOK
 * 
 * This custom React hook provides a high-level interface for managing media streams
 * in the video conferencing application. It integrates seamlessly with the room store
 * to provide centralized media state management while offering local stream control.
 * 
 * Key Features:
 * - Automatic media device enumeration and permission handling
 * - Integration with room store for global media state
 * - Device switching and constraint management
 * - Stream lifecycle management with proper cleanup
 * - Error handling and recovery
 * - Real-time device change monitoring
 * 
 * Design Philosophy:
 * - The hook manages local stream initialization and cleanup
 * - Room store manages global media state and WebRTC integration
 * - Clear separation between local operations and room-wide state
 * - Comprehensive error handling for production reliability
 * 
 * Usage Pattern:
 * const { initializeStream, toggleAudio, isAudioEnabled } = useMediaStream({
 *   autoStart: true,
 *   video: { width: 1280, height: 720 },
 *   audio: { echoCancellation: true }
 * });
 */

// =================== TYPE DEFINITIONS ===================

/**
 * Local state interface for media stream management
 * 
 * Tracks the current status of stream initialization and any errors.
 * This is separate from room store state to handle local operations.
 */
interface MediaStreamState {
  isInitialized: boolean;          // Whether media stream has been successfully created
  isStarting: boolean;             // Whether stream initialization is in progress
  error: string | null;            // Current error message, if any
}

/**
 * Configuration options for media stream initialization
 * 
 * Allows customization of stream behavior and media constraints.
 * Supports both simple boolean flags and advanced MediaTrackConstraints.
 */
interface MediaStreamOptions {
  autoStart?: boolean;                              // Whether to automatically initialize stream on mount
  video?: boolean | MediaTrackConstraints;         // Video settings - false to disable, true for default, or custom constraints
  audio?: boolean | MediaTrackConstraints;         // Audio settings - false to disable, true for default, or custom constraints
}

/**
 * MAIN MEDIA STREAM HOOK
 * 
 * Provides comprehensive media stream management with room store integration.
 * Handles the complex lifecycle of media streams while maintaining clean separation
 * between local stream operations and global room state.
 * 
 * @param options - Configuration for stream initialization and behavior
 * @returns Object containing state, actions, and stream management functions
 */
export const useMediaStream = (options: MediaStreamOptions = {}) => {
  // =================== OPTION EXTRACTION WITH DEFAULTS ===================
  // Extract options with sensible defaults for video conferencing
  const {
    autoStart = false,                    // Don't auto-start by default - user should explicitly request
    video = true,                         // Enable video by default for video conferencing
    audio = true,                         // Enable audio by default for video conferencing
  } = options;

  // =================== LOCAL STATE MANAGEMENT ===================
  // Local state for this hook's operations, separate from global room state
  const [state, setState] = useState<MediaStreamState>({
    isInitialized: false,               // Stream not created yet
    isStarting: false,                  // Not currently initializing
    error: null,                        // No errors initially
  });

  // =================== STREAM REFERENCE ===================
  // Local reference to the current media stream
  // This is managed separately from room store to handle local operations
  const streamRef = useRef<MediaStream | null>(null);

  // =================== ROOM STORE INTEGRATION ===================
  // Connect to room store for global media state and actions
  // This provides centralized state management while allowing local control
  const {
    // Global media state from room store
    localStream,                        // The stream stored in room store (may be different from local)
    isAudioEnabled,                     // Global audio enabled state
    isVideoEnabled,                     // Global video enabled state
    isScreenSharing,                    // Whether user is sharing screen
    availableDevices,                   // Available cameras, microphones, speakers
    selectedDevices,                    // Currently selected device IDs
    webrtcManager,                      // WebRTC manager for peer connections

    // Actions from room store
    toggleAudio,                        // Global audio toggle action
    toggleVideo,                        // Global video toggle action
    startScreenShare,                   // Start screen sharing action
    stopScreenShare,                    // Stop screen sharing action
    switchCamera,                       // Switch to different camera device
    switchMicrophone,                   // Switch to different microphone device
    refreshDevices,                     // Refresh available device list
    handleError,                        // Global error handling
  } = useRoomStore();

  // =================== STREAM INITIALIZATION ===================

  /**
   * INITIALIZE STREAM - Core function for creating media streams
   * 
   * This function handles the complex process of:
   * 1. Requesting device permissions from browser
   * 2. Enumerating available media devices
   * 3. Building appropriate media constraints
   * 4. Creating the media stream
   * 5. Integrating with room store and WebRTC
   * 
   * The function is idempotent - multiple calls won't create multiple streams.
   * It's designed to be called from components when media is needed.
   */
  const initializeStream = useCallback(async () => {
    // =================== GUARD CLAUSES ===================
    // Prevent duplicate initialization attempts
    if (state.isStarting || state.isInitialized) {
      return;
    }

    // Set starting state to prevent concurrent initialization
    setState(prev => ({ ...prev, isStarting: true, error: null }));

    try {
      // =================== DEVICE ENUMERATION ===================
      // First, refresh the list of available devices
      // This also requests basic permissions which helps with device enumeration
      await refreshDevices();

      // =================== CONSTRAINT BUILDING ===================
      // Build media constraints based on options and available devices
      const constraints: MediaStreamConstraints = {};

      // Configure audio constraints
      if (audio && availableDevices.microphones.length > 0) {

        // Start with provided audio settings
        constraints.audio = typeof audio === 'boolean' ? true : audio;

        // If a specific microphone is selected, use it
        if (selectedDevices.microphone) {
          constraints.audio = {
            ...(typeof audio === 'object' ? audio : {}),
            deviceId: { exact: selectedDevices.microphone }
          };
        }
      } else if (audio) {
        console.warn('Audio requested but no microphones available');
      }

      // Configure video constraints
      if (video && availableDevices.cameras.length > 0) {
        // Start with provided video settings
        constraints.video = typeof video === 'boolean' ? true : video;

        // If a specific camera is selected, use it
        if (selectedDevices.camera) {
          constraints.video = {
            ...(typeof video === 'object' ? video : {}),
            deviceId: { exact: selectedDevices.camera }
          };
        }
      } else if (video) {
        console.warn('Video requested but no cameras available');
      }
      // =================== MEDIA STREAM CREATION ===================
      // Request user media with the built constraints
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Store stream in local reference for immediate use
      streamRef.current = stream;

      // =================== ROOM STORE INTEGRATION ===================
      // Note: The stream should be integrated with room store for WebRTC sharing
      // For now, we store it locally and let room store manage its own stream
      // In a full implementation, this would sync with room store's localStream
      // 
      // TODO: Integrate with room store by calling an action like setLocalStream(stream)
      // This would allow WebRTC manager to use this stream for peer connections

      // =================== SUCCESS STATE UPDATE ===================
      setState(prev => ({
        ...prev,
        isInitialized: true,               // Mark as successfully initialized
        isStarting: false,                 // No longer starting
        error: null,                       // Clear any previous errors
      }));

      return stream;

    } catch (error) {
      // =================== ERROR HANDLING ===================
      console.error('💥 Failed to initialize media stream:', error);

      // Create user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize media stream';

      // Update local state with error
      setState(prev => ({
        ...prev,
        isStarting: false,                 // No longer starting
        error: errorMessage,               // Store error message
      }));

      // Propagate error to room store for global error handling
      handleError(errorMessage);

      // Re-throw error so caller can handle it if needed
      throw error;
    }
  }, [
    // =================== DEPENDENCY ARRAY ===================
    // Include all values that affect stream initialization
    state.isStarting,                      // Prevent duplicate calls
    state.isInitialized,                   // Prevent duplicate calls
    audio,                                 // Audio configuration affects constraints
    video,                                 // Video configuration affects constraints
    availableDevices.microphones.length,  // Device availability affects constraints
    availableDevices.cameras.length,      // Device availability affects constraints
    selectedDevices.microphone,           // Selected device affects constraints
    selectedDevices.camera,               // Selected device affects constraints
    webrtcManager,                         // WebRTC integration dependency
    refreshDevices,                        // Device refresh action
    handleError,                           // Error handling action
  ]);

  // =================== STREAM CLEANUP ===================

  /**
   * CLEANUP - Stop and release all media resources
   * 
   * This function ensures proper cleanup of media streams to:
   * - Release camera and microphone hardware
   * - Free memory used by stream objects
   * - Reset component state to initial values
   * - Prevent memory leaks in single-page applications
   * 
   * Should be called when component unmounts or stream is no longer needed.
   */
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up media stream...');

    // =================== STREAM CLEANUP ===================
    if (streamRef.current) {
      // Stop all tracks to release hardware resources
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });

      // Clear the stream reference
      streamRef.current = null;
    }

    // =================== STATE RESET ===================
    // Reset to initial state
    setState({
      isInitialized: false,
      isStarting: false,
      error: null,
    });
  }, []);

  // =================== STREAM RESTART ===================

  /**
   * RESTART STREAM - Reinitialize stream with new constraints
   * 
   * Useful for changing stream settings without remounting the component.
   * Performs clean shutdown followed by reinitialization.
   * 
   * @param newOptions - Optional new configuration for restart
   */
  const restartStream = useCallback(async (newOptions?: MediaStreamOptions) => {
    // Clean up current stream
    cleanup();

    // =================== OPTION HANDLING ===================
    // Note: Current implementation doesn't dynamically update constraints
    // This would require refactoring to make constraints reactive to options
    if (newOptions) {
      console.warn('New options provided to restartStream, but dynamic constraint updates not fully implemented');
      // TODO: Implement dynamic constraint updates
      // This would involve making the hook reactive to option changes
    }

    // Reinitialize with current (or new) options
    return initializeStream();
  }, [cleanup, initializeStream]);

  // =================== PERMISSION MANAGEMENT ===================

  /**
   * REQUEST PERMISSIONS - Explicitly request media permissions
   * 
   * Sometimes it's useful to request permissions before actually creating a stream.
   * This function requests permissions for camera and/or microphone based on options.
   * 
   * @returns Promise<boolean> - Whether permissions were granted
   */
  const requestPermissions = useCallback(async () => {

    try {
      // =================== CAMERA PERMISSION ===================
      if (video) {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Stop immediately - we just wanted permission
        videoStream.getTracks().forEach(track => track.stop());
      }

      // =================== MICROPHONE PERMISSION ===================
      if (audio) {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop immediately - we just wanted permission
        audioStream.getTracks().forEach(track => track.stop());
      }

      // =================== DEVICE REFRESH ===================
      // Refresh device list now that we have permissions
      // This will populate device names and IDs properly
      await refreshDevices();

      return true;

    } catch (error) {
      const errorMessage = 'Media permissions denied. Please allow camera and microphone access.';
      setState(prev => ({ ...prev, error: errorMessage }));
      handleError(errorMessage);
      return false;
    }
  }, [video, audio, refreshDevices, handleError]);

  // =================== STREAM STATUS CHECKS ===================

  /**
   * IS CAMERA ACTIVE - Check if camera is currently active
   * 
   * Returns true if there are video tracks in the stream and at least one is enabled.
   * Useful for UI indicators and conditional rendering.
   */
  const isCameraActive = streamRef.current?.getVideoTracks().some(track => track.enabled) ?? false;

  /**
   * IS MICROPHONE ACTIVE - Check if microphone is currently active
   * 
   * Returns true if there are audio tracks in the stream and at least one is enabled.
   * Useful for UI indicators and conditional rendering.
   */
  const isMicrophoneActive = streamRef.current?.getAudioTracks().some(track => track.enabled) ?? false;

  // =================== STREAM STATISTICS ===================

  /**
   * GET STREAM STATS - Comprehensive stream information
   * 
   * Returns detailed information about the current stream including:
   * - Track counts and enabled status
   * - Track settings (resolution, frame rate, etc.)
   * - Device information
   * 
   * Useful for debugging, monitoring, and displaying stream info to users.
   */
  const getStreamStats = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) {
      return null;
    }

    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();

    const stats = {
      // Stream-level information
      streamId: stream.id,
      active: stream.active,

      // Video track information
      video: {
        count: videoTracks.length,
        enabled: videoTracks.some(track => track.enabled),
        settings: videoTracks[0]?.getSettings(),
        constraints: videoTracks[0]?.getConstraints(),
        label: videoTracks[0]?.label,
      },

      // Audio track information
      audio: {
        count: audioTracks.length,
        enabled: audioTracks.some(track => track.enabled),
        settings: audioTracks[0]?.getSettings(),
        constraints: audioTracks[0]?.getConstraints(),
        label: audioTracks[0]?.label,
      },
    };
    return stats;
  }, []);

  // =================== EFFECT HOOKS ===================

  /**
   * AUTO-INITIALIZATION EFFECT
   * 
   * If autoStart is enabled, automatically initialize the stream when the component mounts.
   * This is useful for components that always need media access.
   */
  useEffect(() => {
    if (autoStart && !state.isInitialized && !state.isStarting) {
      initializeStream();
    }
  }, [autoStart, initializeStream, state.isInitialized, state.isStarting]);

  /**
   * CLEANUP EFFECT
   * 
   * Ensures proper cleanup when the component unmounts.
   * This prevents memory leaks and releases media hardware.
   */
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  /**
   * DEVICE CHANGE MONITORING EFFECT
   * 
   * Listens for device changes (plug/unplug of cameras, microphones).
   * Automatically refreshes the device list when changes are detected.
   * This ensures the UI always shows current device availability.
   */
  useEffect(() => {
    const handleDeviceChange = () => {
      refreshDevices();
    };

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    // Cleanup listener on unmount
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  // =================== RETURN VALUE ===================

  /**
   * HOOK RETURN VALUE
   * 
   * Returns a comprehensive object containing:
   * - State from room store (global media state)
   * - Local state (hook-specific state)
   * - Actions from room store (global media actions)
   * - Local actions (hook-specific actions)
   * 
   * This provides a complete interface for media management in components.
   */
  return {
    // =================== GLOBAL STATE FROM ROOM STORE ===================
    localStream,                          // Global local stream from room store
    isAudioEnabled,                       // Global audio enabled state
    isVideoEnabled,                       // Global video enabled state
    isScreenSharing,                      // Global screen sharing state
    availableDevices,                     // Available media devices
    selectedDevices,                      // Currently selected devices

    // =================== LOCAL STATE ===================
    isInitialized: state.isInitialized,  // Whether local stream is initialized
    isStarting: state.isStarting,        // Whether initialization is in progress
    error: state.error,                  // Local error state
    isCameraActive,                      // Whether camera is active in local stream
    isMicrophoneActive,                  // Whether microphone is active in local stream

    // =================== GLOBAL ACTIONS FROM ROOM STORE ===================
    toggleAudio,                         // Toggle global audio state
    toggleVideo,                         // Toggle global video state
    startScreenShare,                    // Start screen sharing
    stopScreenShare,                     // Stop screen sharing
    switchCamera,                        // Switch to different camera
    switchMicrophone,                    // Switch to different microphone
    refreshDevices,                      // Refresh available device list

    // =================== LOCAL ACTIONS ===================
    initializeStream,                    // Initialize local media stream
    cleanup,                             // Clean up local stream and state
    restartStream,                       // Restart stream with new options
    requestPermissions,                  // Request media permissions
    getStreamStats,                      // Get detailed stream statistics
  };
};

// =================== USAGE DOCUMENTATION ===================

/**
 * HOOK USAGE EXAMPLES
 * 
 * This hook is designed to be used in video conference components that need
 * local media stream management. Here are common usage patterns:
 * 
 * // Basic usage with auto-start
 * const MediaComponent = () => {
 *   const { isInitialized, toggleAudio, toggleVideo } = useMediaStream({
 *     autoStart: true,
 *     video: { width: 1280, height: 720 },
 *     audio: { echoCancellation: true, noiseSuppression: true }
 *   });
 * 
 *   return (
 *     <div>
 *       <button onClick={toggleAudio}>Toggle Audio</button>
 *       <button onClick={toggleVideo}>Toggle Video</button>
 *       {isInitialized && <p>Stream ready!</p>}
 *     </div>
 *   );
 * };
 * 
 * // Manual initialization with permission handling
 * const PermissionComponent = () => {
 *   const { 
 *     initializeStream, 
 *     requestPermissions, 
 *     isStarting, 
 *     error 
 *   } = useMediaStream();
 * 
 *   const handleStart = async () => {
 *     const hasPermissions = await requestPermissions();
 *     if (hasPermissions) {
 *       await initializeStream();
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleStart} disabled={isStarting}>
 *         {isStarting ? 'Starting...' : 'Start Camera'}
 *       </button>
 *       {error && <p>Error: {error}</p>}
 *     </div>
 *   );
 * };
 * 
 * // Device switching interface
 * const DeviceSettings = () => {
 *   const { 
 *     availableDevices, 
 *     selectedDevices, 
 *     switchCamera, 
 *     switchMicrophone 
 *   } = useMediaStream();
 * 
 *   return (
 *     <div>
 *       <select 
 *         value={selectedDevices.camera || ''} 
 *         onChange={(e) => switchCamera(e.target.value)}
 *       >
 *         {availableDevices.cameras.map(device => (
 *           <option key={device.deviceId} value={device.deviceId}>
 *             {device.label}
 *           </option>
 *         ))}
 *       </select>
 *     </div>
 *   );
 * };
 * 
 * INTEGRATION WITH ROOM STORE:
 * 
 * The hook integrates seamlessly with the room store:
 * - Global media state (isAudioEnabled, isVideoEnabled) is managed by room store
 * - Local stream initialization is managed by this hook
 * - Actions like toggleAudio/toggleVideo operate on room store state
 * - Device management is coordinated between hook and store
 * 
 * BEST PRACTICES:
 * 
 * 1. Use autoStart: true for components that always need media access
 * 2. Use requestPermissions() before initializeStream() for better UX
 * 3. Always handle the error state to provide user feedback
 * 4. Call cleanup() when media is no longer needed (automatic on unmount)
 * 5. Use getStreamStats() for debugging stream issues
 * 
 * PERFORMANCE CONSIDERATIONS:
 * 
 * - The hook uses useCallback for all functions to prevent unnecessary re-renders
 * - Device monitoring is efficient and only refreshes when actual changes occur
 * - Stream cleanup is comprehensive to prevent memory leaks
 * - Dependency arrays are carefully managed to prevent infinite re-renders
 * 
 * ERROR HANDLING:
 * 
 * The hook provides multiple layers of error handling:
 * - Browser permission denials are caught and user-friendly messages shown
 * - Device access failures are handled gracefully
 * - Errors are propagated to room store for global error management
 * - Local error state allows component-specific error handling
 */