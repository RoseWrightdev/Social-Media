/**
 * Room connection management hooks for video conferencing
 * 
 * @example
 * ```tsx
 * const { connect, connectionState, isConnected } = useRoomConnection();
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRoomStore } from '@/hooks/useRoomStore';

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  retryCount: number;
  lastError?: string;
  lastAttempt?: number;
  quality?: 'excellent' | 'good' | 'poor' | 'bad';
  latency?: number;
}

interface UseRoomConnectionOptions {
  maxRetries?: number;
  retryDelay?: number;
  heartbeatInterval?: number;
  autoReconnect?: boolean;
  connectionTimeout?: number;
}

export const useRoomConnection = (options: UseRoomConnectionOptions = {}) => {
  const {
    maxRetries = 5,
    retryDelay = 3000,
    heartbeatInterval = 30000,
    autoReconnect = true,
    connectionTimeout = 10000,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    retryCount: 0,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttemptRef = useRef<Promise<boolean> | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());

  const {
    connectionState: roomConnectionState,
    wsClient,
    webrtcManager,
    isJoined,
    roomId,
    currentUsername,
    initializeRoom,
    joinRoom,
    leaveRoom,
    handleError,
    clearError,
  } = useRoomStore();

  const clearAllTimers = useCallback(() => {    
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

  const updateConnectionState = useCallback((updates: Partial<ConnectionState>) => {
    setConnectionState(prev => {
      const newState = { ...prev, ...updates };
      return newState;
    });
  }, []);

  const calculateConnectionQuality = useCallback((latency: number, retryCount: number): ConnectionState['quality'] => {
    if (retryCount >= 3) return 'bad';
    if (latency > 500) return 'poor';
    if (latency > 200) return 'good';
    return 'excellent';
  }, []);

  const performHeartbeat = useCallback(async () => {
    if (!wsClient || !roomConnectionState.wsConnected) return;

    try {
      const startTime = Date.now();
      const latency = Math.random() * 100; // Simulated latency
      lastHeartbeatRef.current = Date.now();

      const quality = calculateConnectionQuality(latency, connectionState.retryCount);
      
      updateConnectionState({
        latency,
        quality,
      });
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }, [wsClient, roomConnectionState.wsConnected, connectionState.retryCount, calculateConnectionQuality, updateConnectionState]);

  const startHeartbeat = useCallback(() => {    
    heartbeatIntervalRef.current = setInterval(performHeartbeat, heartbeatInterval);
  }, [performHeartbeat, heartbeatInterval]);

  const getAuthToken = useCallback((): string => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return token;
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    if (connectionAttemptRef.current) {
      return connectionAttemptRef.current;
    }

    if (!roomId || !currentUsername) {
      const error = 'Missing roomId or username for connection';
      console.error('Connection failed:', error);
      updateConnectionState({ 
        status: 'failed', 
        lastError: error,
        lastAttempt: Date.now(),
      });
      return false;
    }    
    
    const connectionPromise = (async (): Promise<boolean> => {
      try {
        updateConnectionState({ 
          status: 'connecting',
          lastAttempt: Date.now(),
        });

        const token = getAuthToken();

        const timeoutPromise = new Promise<never>((_, reject) => {
          connectionTimeoutRef.current = setTimeout(() => {
            reject(new Error(`Connection timeout after ${connectionTimeout}ms`));
          }, connectionTimeout);
        });

        const connectPromise = initializeRoom(roomId, currentUsername, token);
        
        await Promise.race([connectPromise, timeoutPromise]);
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        await joinRoom();

        updateConnectionState({
          status: 'connected',
          retryCount: 0,
          lastError: undefined,
          quality: 'good',
        });

        startHeartbeat();
        clearError();
        return true;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
        console.error('Connection failed:', errorMessage);

        updateConnectionState({
          status: 'failed',
          lastError: errorMessage,
        });

        handleError(errorMessage);
        return false;
      }
    })();

    connectionAttemptRef.current = connectionPromise;
    
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

  const disconnect = useCallback(async () => {
    console.log('🔌 Disconnecting from room...');
    
    clearAllTimers();
    
    try {
      await leaveRoom();
    } catch (error) {
      console.error('Error leaving room:', error);
    }

    updateConnectionState({
      status: 'disconnected',
      retryCount: 0,
      lastError: undefined,
      quality: undefined,
      latency: undefined,
    });
  }, [leaveRoom, clearAllTimers, updateConnectionState]);

  const retry = useCallback(async () => {
    if (connectionState.retryCount >= maxRetries) {
      console.error(`Max retries (${maxRetries}) exceeded, giving up`);
      updateConnectionState({ 
        status: 'failed',
        lastError: `Max retries (${maxRetries}) exceeded`,
      });
      return;
    }

    const delay = retryDelay * Math.pow(2, connectionState.retryCount); // Exponential backoff
    updateConnectionState({
      status: 'reconnecting',
      retryCount: connectionState.retryCount + 1,
    });

    retryTimeoutRef.current = setTimeout(async () => {
      const success = await connect();
      
      if (!success && autoReconnect) {
        await retry();
      }
    }, delay);
  }, [connectionState.retryCount, maxRetries, retryDelay, connect, autoReconnect, updateConnectionState]);

  const reconnect = useCallback(async () => {
    await disconnect();
    
    setTimeout(() => {
      connect();
    }, 1000);
  }, [disconnect, connect]);

  useEffect(() => {
    const { wsConnected, wsReconnecting, lastError } = roomConnectionState;

    if (wsConnected && connectionState.status !== 'connected') {
      updateConnectionState({ status: 'connected' });
      
      if (!heartbeatIntervalRef.current) {
        startHeartbeat();
      }
    } else if (!wsConnected && connectionState.status === 'connected') {
      
      if (autoReconnect && isJoined) {
        retry();
      } else {
        updateConnectionState({ status: 'disconnected' });
      }
    }

    if (wsReconnecting && connectionState.status !== 'reconnecting') {
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

  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up room connection hook...');
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const isConnected = roomConnectionState.wsConnected && connectionState.status === 'connected';
  const isReconnecting = roomConnectionState.wsReconnecting || connectionState.status === 'reconnecting';
  const quality = connectionState.quality || 'good';

  return {
    connectionState,
    isConnected,
    isReconnecting,
    quality,
    connect,
    disconnect,
    retry,
    reconnect,
    latency: connectionState.latency,
    retryCount: connectionState.retryCount,
    lastError: connectionState.lastError,
  };
};

export { useMediaStream } from './useMediaStream'

/**
 * Room UI layout and controls
 * 
 * @example
 * ```tsx
 * const { toggleChatPanel, pinParticipant, setGridLayout } = useRoomUI();
 * ```
 */
export const useRoomUI = () => {
  const {
    gridLayout,
    isChatPanelOpen,
    isParticipantsPanelOpen,
    pinnedParticipantId,
    selectedParticipantId,
    setGridLayout,
    toggleChatPanel,
    toggleParticipantsPanel,
    pinParticipant,
    selectParticipant,
  } = useRoomStore()

  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const unpinParticipant = useCallback(() => {
    pinParticipant(null);
  }, [pinParticipant]);

  return {
    gridLayout,
    isChatPanelOpen,
    isParticipantsPanelOpen,
    pinnedParticipantId,
    selectedParticipantId,
    setGridLayout,
    toggleChatPanel,
    toggleParticipantsPanel,
    pinParticipant,
    unpinParticipant,
    selectParticipant,
    isDeviceMenuOpen,
    setIsDeviceMenuOpen,
    isSettingsOpen,
    setIsSettingsOpen,
  }
}

/**
 * Device capabilities and management
 * 
 * @example
 * ```tsx
 * const { capabilities, switchCamera, refreshDevices } = useDeviceCapabilities();
 * ```
 */
export const useDeviceCapabilities = () => {
  const {
    availableDevices,
    refreshDevices,
    switchCamera,
    switchMicrophone,
  } = useRoomStore()

  const capabilities = useMemo(() => ({
    hasCamera: availableDevices.cameras.length > 0,
    hasMicrophone: availableDevices.microphones.length > 0,
    hasSpeaker: availableDevices.speakers.length > 0,
    supportsScreenShare: 'getDisplayMedia' in navigator.mediaDevices,
    supportsDeviceSelection: 'enumerateDevices' in navigator.mediaDevices,
    supportsAudioOutput: 'setSinkId' in HTMLMediaElement.prototype,
    supportsWebRTC: !!(window.RTCPeerConnection),
    supportsDataChannels: !!(window.RTCDataChannel),
    supportsConstraints: !!(navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints),
  }), [availableDevices]);

  const deviceInfo = useMemo(() => ({
    cameraCount: availableDevices.cameras.length,
    microphoneCount: availableDevices.microphones.length,
    speakerCount: availableDevices.speakers.length,
    hasDefaultCamera: availableDevices.cameras.some(device => device.deviceId === 'default'),
    hasDefaultMicrophone: availableDevices.microphones.some(device => device.deviceId === 'default'),
    hasDefaultSpeaker: availableDevices.speakers.some(device => device.deviceId === 'default'),
    devicesLabeled: availableDevices.cameras.every(device => device.label !== ''),
  }), [availableDevices]);

  return {
    availableDevices,
    deviceInfo,
    capabilities,
    refreshDevices,
    switchCamera,
    switchMicrophone,
  }
}
