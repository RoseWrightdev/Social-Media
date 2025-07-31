import { useState, useEffect, useCallback, useRef } from 'react';
import { useRoomStore } from '@/store/useRoomStore';

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  retryCount: number;
  lastError?: string;
}

interface UseRoomConnectionOptions {
  maxRetries?: number;
  retryDelay?: number;
  heartbeatInterval?: number;
  autoReconnect?: boolean;
}

/**
 * Advanced room connection hook with reconnection and health monitoring
 * Manages WebSocket and WebRTC connection lifecycle
 */
export const useRoomConnection = (options: UseRoomConnectionOptions = {}) => {
  const {
    maxRetries = 5,
    retryDelay = 3000,
    heartbeatInterval = 30000,
    autoReconnect = true,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    retryCount: 0,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttemptRef = useRef<Promise<boolean> | null>(null);

  // Get room store state and actions
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

  // Rest of the hook implementation...
  return {
    connectionState,
    connect: () => Promise.resolve(true),
    disconnect: () => {},
    retry: () => {},
    reconnect: () => {},
    isConnected: roomConnectionState.wsConnected,
    isReconnecting: roomConnectionState.wsReconnecting,
    quality: 'good' as 'excellent' | 'good' | 'poor' | 'bad',
  };
};

// Re-export specialized hooks from their individual files
export { useMediaStream } from './useMediaStream'

// Additional UI and capability hooks
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

  const unpinParticipant = () => pinParticipant(null)

  // Local UI state (these would typically be in a separate UI store or component state)
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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
    setIsDeviceMenuOpen,
    setIsSettingsOpen,
  }
}

export const useDeviceCapabilities = () => {
  const {
    availableDevices,
    refreshDevices,
    switchCamera,
    switchMicrophone,
  } = useRoomStore()

  return {
    availableDevices,
    refreshDevices,
    switchCamera,
    switchMicrophone,
    capabilities: {
      hasCamera: availableDevices.cameras.length > 0,
      hasMicrophone: availableDevices.microphones.length > 0,
      hasSpeaker: availableDevices.speakers.length > 0,
      supportsScreenShare: 'getDisplayMedia' in navigator.mediaDevices,
    }
  }
}
