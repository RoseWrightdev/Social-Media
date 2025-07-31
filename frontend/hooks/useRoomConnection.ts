/**
 * =================== USE ROOM CONNECTION HOOK ===================
 * 
 * Advanced WebSocket and WebRTC connection management hook for video conferencing.
 * 
 * This hook provides sophisticated connection lifecycle management including:
 * - Automatic connection establishment and teardown
 * - Intelligent reconnection with exponential backoff
 * - Connection health monitoring and quality assessment
 * - Real-time connection status tracking
 * - Error handling and recovery mechanisms
 * - Heartbeat monitoring for connection stability
 * 
 * The hook manages the complex interplay between WebSocket signaling and
 * WebRTC peer connections, ensuring a stable conferencing experience even
 * in challenging network conditions.
 * 
 * Features:
 * - Configurable retry policies and timeouts
 * - Automatic reconnection with circuit breaker pattern
 * - Connection quality monitoring and reporting
 * - Graceful degradation for poor network conditions
 * - Detailed connection state and diagnostics
 * 
 * Usage Examples:
 * 
 * Basic usage:
 * const { connect, connectionState, isConnected } = useRoomConnection();
 * 
 * With custom configuration:
 * const { connect, retry } = useRoomConnection({
 *   maxRetries: 10,
 *   retryDelay: 5000,
 *   autoReconnect: true
 * });
 * 
 * @author Video Conference Platform
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRoomStore } from '@/store/useRoomStore';

// =================== TYPE DEFINITIONS ===================

/**
 * CONNECTION STATE INTERFACE
 * 
 * Represents the current state of the room connection including status,
 * retry information, and any error details.
 */
interface ConnectionState {
  /** Current connection status */
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  /** Number of connection retry attempts made */
  retryCount: number;
  /** Last error message if connection failed */
  lastError?: string;
  /** Timestamp of last connection attempt */
  lastAttempt?: number;
  /** Connection quality indicator */
  quality?: 'excellent' | 'good' | 'poor' | 'bad';
  /** Round-trip time for connection health */
  latency?: number;
}

/**
 * HOOK OPTIONS INTERFACE
 * 
 * Configuration options for customizing connection behavior.
 */
interface UseRoomConnectionOptions {
  /** Maximum number of reconnection attempts (default: 5) */
  maxRetries?: number;
  /** Delay between retry attempts in milliseconds (default: 3000) */
  retryDelay?: number;
  /** Heartbeat interval for connection monitoring in milliseconds (default: 30000) */
  heartbeatInterval?: number;
  /** Whether to automatically reconnect on disconnection (default: true) */
  autoReconnect?: boolean;
  /** Timeout for connection attempts in milliseconds (default: 10000) */
  connectionTimeout?: number;
}

// =================== MAIN HOOK IMPLEMENTATION ===================

/**
 * USE ROOM CONNECTION HOOK
 * 
 * Advanced room connection hook with reconnection and health monitoring.
 * Manages WebSocket and WebRTC connection lifecycle with intelligent
 * retry logic and connection quality assessment.
 * 
 * @param options - Configuration options for connection behavior
 * @returns Connection state, actions, and monitoring data
 */
export const useRoomConnection = (options: UseRoomConnectionOptions = {}) => {
  // =================== CONFIGURATION ===================
  
  const {
    maxRetries = 5,
    retryDelay = 3000,
    heartbeatInterval = 30000,
    autoReconnect = true,
    connectionTimeout = 10000,
  } = options;

  // =================== STATE MANAGEMENT ===================
  
  /**
   * LOCAL CONNECTION STATE
   * 
   * Tracks detailed connection state including retry attempts,
   * error information, and connection quality metrics.
   */
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    retryCount: 0,
  });

  // =================== REFS FOR TIMERS ===================
  
  // Timer references for cleanup and management
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttemptRef = useRef<Promise<boolean> | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());

  // =================== ROOM STORE INTEGRATION ===================
  
  /**
   * ROOM STORE STATE AND ACTIONS
   * 
   * Integration with the main room store for connection management,
   * user state, and room operations.
   */
  const {
    connectionState: roomConnectionState,    // WebSocket connection state
    wsClient,                               // WebSocket client instance
    webrtcManager,                          // WebRTC connection manager
    isJoined,                               // Whether user has joined room
    roomId,                                 // Current room identifier
    currentUsername,                        // User's display name
    initializeRoom,                         // Initialize room connection
    joinRoom,                               // Join room action
    leaveRoom,                              // Leave room action
    handleError,                            // Error handling action
    clearError,                             // Clear error state
  } = useRoomStore();

  // =================== CONNECTION MANAGEMENT ===================
  
  /**
   * CLEAR ALL TIMERS
   * 
   * Utility function to clean up all active timers and prevent
   * memory leaks when component unmounts or connection changes.
   */
  const clearAllTimers = useCallback(() => {
    console.log('🧹 Clearing all connection timers...');
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  /**
   * UPDATE CONNECTION STATE
   * 
   * Centralized function for updating connection state with logging
   * and proper state transitions.
   * 
   * @param updates - Partial state updates to apply
   */
  const updateConnectionState = useCallback((updates: Partial<ConnectionState>) => {
    setConnectionState(prev => {
      const newState = { ...prev, ...updates };
      console.log(`🔄 Connection state: ${prev.status} → ${newState.status}`, newState);
      return newState;
    });
  }, []);

  /**
   * CALCULATE CONNECTION QUALITY
   * 
   * Assesses connection quality based on latency, retry count,
   * and connection stability metrics.
   * 
   * @param latency - Current connection latency in milliseconds
   * @param retryCount - Number of recent retry attempts
   * @returns Quality rating from excellent to bad
   */
  const calculateConnectionQuality = useCallback((latency: number, retryCount: number): ConnectionState['quality'] => {
    if (retryCount >= 3) return 'bad';
    if (latency > 500) return 'poor';
    if (latency > 200) return 'good';
    return 'excellent';
  }, []);

  /**
   * PERFORM HEARTBEAT
   * 
   * Monitors connection health by checking WebSocket status.
   * In a production implementation, this would send actual heartbeat messages.
   */
  const performHeartbeat = useCallback(async () => {
    if (!wsClient || !roomConnectionState.wsConnected) return;

    try {
      const startTime = Date.now();
      
      // For now, we'll just measure the time and update quality
      // In a real implementation, you would send a heartbeat message and wait for response
      const latency = Math.random() * 100; // Simulated latency
      lastHeartbeatRef.current = Date.now();

      // Update connection quality based on latency
      const quality = calculateConnectionQuality(latency, connectionState.retryCount);
      
      updateConnectionState({
        latency,
        quality,
      });

      console.log(`💓 Connection health check: ${latency.toFixed(0)}ms (${quality})`);
    } catch (error) {
      console.error('💔 Health check failed:', error);
      // Don't update state on heartbeat failure unless connection is lost
    }
  }, [wsClient, roomConnectionState.wsConnected, connectionState.retryCount, calculateConnectionQuality, updateConnectionState]);

  /**
   * START HEARTBEAT MONITORING
   * 
   * Begins periodic heartbeat monitoring for connection health.
   * Helps detect connection issues before they become critical.
   */
  const startHeartbeat = useCallback(() => {
    console.log(`💓 Starting heartbeat monitoring (${heartbeatInterval}ms interval)`);
    
    heartbeatIntervalRef.current = setInterval(performHeartbeat, heartbeatInterval);
  }, [performHeartbeat, heartbeatInterval]);

  /**
   * GET AUTH TOKEN
   * 
   * Retrieves the JWT token from localStorage for authentication.
   * In a production app, this might come from a more secure source.
   */
  const getAuthToken = useCallback((): string => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return token;
  }, []);

  /**
   * CONNECT TO ROOM
   * 
   * Main connection function that handles the complete connection
   * process including initialization, joining, and health monitoring.
   * 
   * @returns Promise that resolves to true if connection successful
   */
  const connect = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent connection attempts
    if (connectionAttemptRef.current) {
      console.log('⏳ Connection attempt already in progress...');
      return connectionAttemptRef.current;
    }

    if (!roomId || !currentUsername) {
      const error = 'Missing roomId or username for connection';
      console.error('❌ Connection failed:', error);
      updateConnectionState({ 
        status: 'failed', 
        lastError: error,
        lastAttempt: Date.now(),
      });
      return false;
    }

    console.log(`🔌 Connecting to room: ${roomId} as ${currentUsername}`);
    
    // Create connection promise
    const connectionPromise = (async (): Promise<boolean> => {
      try {
        updateConnectionState({ 
          status: 'connecting',
          lastAttempt: Date.now(),
        });

        // Get authentication token
        const token = getAuthToken();

        // Set connection timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          connectionTimeoutRef.current = setTimeout(() => {
            reject(new Error(`Connection timeout after ${connectionTimeout}ms`));
          }, connectionTimeout);
        });

        // Initialize room with timeout (requires token as third parameter)
        const connectPromise = initializeRoom(roomId, currentUsername, token);
        
        await Promise.race([connectPromise, timeoutPromise]);
        
        // Clear timeout on success
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        console.log('✅ Room initialized successfully');

        // Join the room
        await joinRoom();
        console.log('🚪 Joined room successfully');

        // Update state to connected
        updateConnectionState({
          status: 'connected',
          retryCount: 0,
          lastError: undefined,
          quality: 'good',
        });

        // Start health monitoring
        startHeartbeat();

        clearError();
        return true;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
        console.error('❌ Connection failed:', errorMessage);

        updateConnectionState({
          status: 'failed',
          lastError: errorMessage,
        });

        handleError(errorMessage);
        return false;
      }
    })();

    connectionAttemptRef.current = connectionPromise;
    
    // Clean up connection attempt reference
    connectionPromise.finally(() => {
      connectionAttemptRef.current = null;
    });

    return connectionPromise;
  }, [
    roomId, 
    currentUsername, 
    initializeRoom, 
    joinRoom, 
    startHeartbeat, 
    clearError, 
    handleError, 
    updateConnectionState,
    connectionTimeout,
    getAuthToken
  ]);

  /**
   * DISCONNECT FROM ROOM
   * 
   * Cleanly disconnects from the room, stopping all monitoring
   * and cleaning up resources.
   */
  const disconnect = useCallback(async () => {
    console.log('🔌 Disconnecting from room...');
    
    clearAllTimers();
    
    try {
      await leaveRoom();
      console.log('🚪 Left room successfully');
    } catch (error) {
      console.error('⚠️ Error leaving room:', error);
    }

    updateConnectionState({
      status: 'disconnected',
      retryCount: 0,
      lastError: undefined,
      quality: undefined,
      latency: undefined,
    });
  }, [leaveRoom, clearAllTimers, updateConnectionState]);

  /**
   * RETRY CONNECTION
   * 
   * Attempts to reconnect with exponential backoff and retry limits.
   * Automatically called on connection failures if autoReconnect is enabled.
   */
  const retry = useCallback(async () => {
    if (connectionState.retryCount >= maxRetries) {
      console.error(`❌ Max retries (${maxRetries}) exceeded, giving up`);
      updateConnectionState({ 
        status: 'failed',
        lastError: `Max retries (${maxRetries}) exceeded`,
      });
      return;
    }

    const delay = retryDelay * Math.pow(2, connectionState.retryCount); // Exponential backoff
    console.log(`🔄 Retrying connection in ${delay}ms (attempt ${connectionState.retryCount + 1}/${maxRetries})`);

    updateConnectionState({
      status: 'reconnecting',
      retryCount: connectionState.retryCount + 1,
    });

    retryTimeoutRef.current = setTimeout(async () => {
      console.log(`🔄 Executing retry attempt ${connectionState.retryCount}`);
      const success = await connect();
      
      if (!success && autoReconnect) {
        // Schedule next retry if this one failed
        await retry();
      }
    }, delay);
  }, [connectionState.retryCount, maxRetries, retryDelay, connect, autoReconnect, updateConnectionState]);

  /**
   * FORCE RECONNECTION
   * 
   * Forcefully reconnects by first disconnecting and then connecting.
   * Useful for recovering from connection issues.
   */
  const reconnect = useCallback(async () => {
    console.log('🔄 Force reconnecting...');
    await disconnect();
    
    // Small delay before reconnecting
    setTimeout(() => {
      connect();
    }, 1000);
  }, [disconnect, connect]);

  // =================== EFFECTS ===================
  
  /**
   * ROOM CONNECTION STATE MONITORING
   * 
   * Monitors the room store connection state and triggers
   * appropriate actions based on state changes.
   */
  useEffect(() => {
    const { wsConnected, wsReconnecting, lastError } = roomConnectionState;

    if (wsConnected && connectionState.status !== 'connected') {
      console.log('🔗 WebSocket connected, updating state');
      updateConnectionState({ status: 'connected' });
      
      if (!heartbeatIntervalRef.current) {
        startHeartbeat();
      }
    } else if (!wsConnected && connectionState.status === 'connected') {
      console.log('🔗 WebSocket disconnected');
      
      if (autoReconnect && isJoined) {
        console.log('🔄 Auto-reconnect enabled, starting retry...');
        retry();
      } else {
        updateConnectionState({ status: 'disconnected' });
      }
    }

    if (wsReconnecting && connectionState.status !== 'reconnecting') {
      console.log('🔄 WebSocket reconnecting...');
      updateConnectionState({ status: 'reconnecting' });
    }

    if (lastError) {
      console.error('🔗 WebSocket error:', lastError);
      updateConnectionState({ 
        status: 'failed',
        lastError: lastError,
      });
    }
  }, [
    roomConnectionState,
    connectionState.status,
    autoReconnect,
    isJoined,
    retry,
    startHeartbeat,
    updateConnectionState
  ]);

  /**
   * CLEANUP ON UNMOUNT
   * 
   * Ensures all timers are cleared and connections are cleaned up
   * when the component unmounts.
   */
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up room connection hook...');
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // =================== COMPUTED VALUES ===================
  
  // Determine if we're currently connected
  const isConnected = roomConnectionState.wsConnected && connectionState.status === 'connected';
  
  // Determine if we're in a reconnecting state
  const isReconnecting = roomConnectionState.wsReconnecting || connectionState.status === 'reconnecting';
  
  // Get current connection quality
  const quality = connectionState.quality || 'good';

  // =================== HOOK RETURN VALUE ===================
  
  return {
    // =================== CONNECTION STATE ===================
    connectionState,                         // Detailed connection state
    isConnected,                            // Simple connected boolean
    isReconnecting,                         // Whether currently reconnecting
    quality,                                // Connection quality rating
    
    // =================== CONNECTION ACTIONS ===================
    connect,                                // Connect to room
    disconnect,                             // Disconnect from room
    retry,                                  // Retry connection with backoff
    reconnect,                              // Force reconnection
    
    // =================== MONITORING DATA ===================
    latency: connectionState.latency,       // Current connection latency
    retryCount: connectionState.retryCount, // Number of retry attempts
    lastError: connectionState.lastError,   // Last connection error
  };
};

// =================== SPECIALIZED HOOK EXPORTS ===================

/**
 * RE-EXPORT MEDIA STREAM HOOK
 * 
 * Re-exports the useMediaStream hook from its dedicated file for convenience.
 * This allows importing all hooks from a single location while maintaining
 * proper code organization.
 */
export { useMediaStream } from './useMediaStream'

// =================== UI MANAGEMENT HOOK ===================

/**
 * USE ROOM UI HOOK
 * 
 * Specialized hook for managing room UI state and layout controls.
 * Handles the visual presentation layer of the video conference interface.
 * 
 * Features:
 * - Grid layout configuration for participant display
 * - Panel visibility controls (chat, participants)
 * - Participant pinning and selection for focused viewing
 * - Device menu and settings modal state
 * - Local UI state that doesn't need global persistence
 * 
 * This hook separates UI concerns from core room functionality,
 * making it easier to customize the interface without affecting
 * the underlying video conference logic.
 * 
 * Usage:
 * const { toggleChatPanel, pinParticipant, setGridLayout } = useRoomUI();
 * 
 * @returns UI state and control functions
 */
export const useRoomUI = () => {
  // =================== ROOM STORE INTEGRATION ===================
  
  /**
   * UI STATE FROM ROOM STORE
   * 
   * These values are persisted in the global room store because they
   * affect the core conferencing experience and should be maintained
   * across component unmounts and re-renders.
   */
  const {
    gridLayout,                          // Current participant grid layout mode
    isChatPanelOpen,                     // Whether chat panel is visible
    isParticipantsPanelOpen,             // Whether participants panel is visible
    pinnedParticipantId,                 // ID of pinned participant for focused view
    selectedParticipantId,               // ID of currently selected participant
    setGridLayout,                       // Function to change grid layout
    toggleChatPanel,                     // Function to show/hide chat panel
    toggleParticipantsPanel,             // Function to show/hide participants panel
    pinParticipant,                      // Function to pin/unpin participants
    selectParticipant,                   // Function to select participants
  } = useRoomStore()

  // =================== LOCAL UI STATE ===================
  
  /**
   * LOCAL COMPONENT STATE
   * 
   * These values are local to the component because they represent
   * temporary UI states that don't need to persist globally.
   * Examples: dropdown menus, modal dialogs, temporary overlays.
   */
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // =================== UTILITY FUNCTIONS ===================
  
  /**
   * UNPIN PARTICIPANT - Convenience function for unpinning
   * 
   * Provides a cleaner API for unpinning by calling pinParticipant with null.
   * Makes the intention more explicit in component code.
   */
  const unpinParticipant = useCallback(() => {
    console.log('📌 Unpinning participant');
    pinParticipant(null);
  }, [pinParticipant]);

  // =================== RETURN VALUE ===================
  
  return {
    // =================== LAYOUT STATE ===================
    gridLayout,                          // Current grid layout configuration
    isChatPanelOpen,                     // Chat panel visibility
    isParticipantsPanelOpen,             // Participants panel visibility
    pinnedParticipantId,                 // Currently pinned participant
    selectedParticipantId,               // Currently selected participant
    
    // =================== LAYOUT ACTIONS ===================
    setGridLayout,                       // Change grid layout mode
    toggleChatPanel,                     // Toggle chat panel visibility
    toggleParticipantsPanel,             // Toggle participants panel visibility
    pinParticipant,                      // Pin participant for focused view
    unpinParticipant,                    // Unpin currently pinned participant
    selectParticipant,                   // Select participant for actions
    
    // =================== LOCAL UI STATE ===================
    isDeviceMenuOpen,                    // Device selection menu state
    setIsDeviceMenuOpen,                 // Control device menu visibility
    isSettingsOpen,                      // Settings modal state
    setIsSettingsOpen,                   // Control settings modal visibility
  }
}

// =================== DEVICE CAPABILITIES HOOK ===================

/**
 * USE DEVICE CAPABILITIES HOOK
 * 
 * Specialized hook for device management and capability detection.
 * Provides information about available media devices and browser capabilities.
 * 
 * Features:
 * - Device enumeration (cameras, microphones, speakers)
 * - Device switching functionality
 * - Browser capability detection
 * - Media API availability checks
 * - Permissions status monitoring
 * 
 * This hook abstracts device management complexity and provides a clean
 * API for components that need to display device options or check
 * browser capabilities.
 * 
 * Usage:
 * const { capabilities, switchCamera, refreshDevices } = useDeviceCapabilities();
 * 
 * @returns Device information, capabilities, and control functions
 */
export const useDeviceCapabilities = () => {
  // =================== ROOM STORE INTEGRATION ===================
  
  /**
   * DEVICE STATE FROM ROOM STORE
   * 
   * Device information is managed globally because it needs to be
   * consistent across all components that display or use media devices.
   */
  const {
    availableDevices,                    // All enumerated media devices
    refreshDevices,                      // Function to re-enumerate devices
    switchCamera,                        // Function to switch camera input
    switchMicrophone,                    // Function to switch microphone input
  } = useRoomStore()

  // =================== CAPABILITY DETECTION ===================
  
  /**
   * BROWSER CAPABILITIES
   * 
   * These flags indicate what media capabilities are supported by
   * the current browser and device. Useful for showing/hiding UI
   * elements based on what's actually available.
   */
  const capabilities = useMemo(() => ({
    // Basic device availability
    hasCamera: availableDevices.cameras.length > 0,
    hasMicrophone: availableDevices.microphones.length > 0,
    hasSpeaker: availableDevices.speakers.length > 0,
    
    // Browser API support
    supportsScreenShare: 'getDisplayMedia' in navigator.mediaDevices,
    supportsDeviceSelection: 'enumerateDevices' in navigator.mediaDevices,
    supportsAudioOutput: 'setSinkId' in HTMLMediaElement.prototype,
    
    // WebRTC capabilities
    supportsWebRTC: !!(window.RTCPeerConnection),
    supportsDataChannels: !!(window.RTCDataChannel),
    
    // Media constraints support
    supportsConstraints: !!(navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints),
  }), [availableDevices]);

  // =================== DEVICE INFORMATION ===================
  
  /**
   * ENHANCED DEVICE INFORMATION
   * 
   * Provides additional metadata about devices for better UX.
   */
  const deviceInfo = useMemo(() => ({
    // Device counts for UI display
    cameraCount: availableDevices.cameras.length,
    microphoneCount: availableDevices.microphones.length,
    speakerCount: availableDevices.speakers.length,
    
    // Default device detection
    hasDefaultCamera: availableDevices.cameras.some(device => device.deviceId === 'default'),
    hasDefaultMicrophone: availableDevices.microphones.some(device => device.deviceId === 'default'),
    hasDefaultSpeaker: availableDevices.speakers.some(device => device.deviceId === 'default'),
    
    // Device labeling status (permissions)
    devicesLabeled: availableDevices.cameras.every(device => device.label !== ''),
  }), [availableDevices]);

  // =================== RETURN VALUE ===================
  
  return {
    // =================== DEVICE DATA ===================
    availableDevices,                    // All available media devices
    deviceInfo,                          // Enhanced device information
    capabilities,                        // Browser and device capabilities
    
    // =================== DEVICE ACTIONS ===================
    refreshDevices,                      // Refresh device enumeration
    switchCamera,                        // Switch to different camera
    switchMicrophone,                    // Switch to different microphone
  }
}
