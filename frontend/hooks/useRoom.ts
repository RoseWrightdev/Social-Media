import { useEffect, useCallback } from 'react';
import { useRoomStore } from '@/store/useRoomStore';

/**
 * Main hook for room management and lifecycle
 * Provides high-level room operations and state
 */
export const useRoom = () => {
  const {
    // State
    roomId,
    roomName,
    isJoined,
    isHost,
    currentUsername,
    connectionState,
    isWaitingRoom,
    
    // Actions
    initializeRoom,
    joinRoom,
    leaveRoom,
    updateRoomSettings,
    handleError,
    clearError,
  } = useRoomStore();

  /**
   * Initialize and join a room
   */
  const joinRoomWithAuth = useCallback(async (
    roomId: string,
    username: string,
    token: string,
    approvalToken?: string
  ) => {
    try {
      await initializeRoom(roomId, username, token);
      await joinRoom(approvalToken);
    } catch (error) {
      handleError(`Failed to join room: ${error}`);
    }
  }, [initializeRoom, joinRoom, handleError]);

  /**
   * Leave room and cleanup
   */
  const exitRoom = useCallback(() => {
    leaveRoom();
  }, [leaveRoom]);

  /**
   * Check if room is ready for use
   */
  const isRoomReady = connectionState.wsConnected && isJoined && !isWaitingRoom;

  /**
   * Check if there are connection issues
   */
  const hasConnectionIssues = connectionState.wsReconnecting || 
    (!connectionState.wsConnected && isJoined);

  return {
    // State
    roomId,
    roomName,
    isJoined,
    isHost,
    currentUsername,
    isWaitingRoom,
    isRoomReady,
    hasConnectionIssues,
    connectionState,
    
    // Actions
    joinRoomWithAuth,
    exitRoom,
    updateRoomSettings,
    clearError,
  };
};

/**
 * Hook for managing participants in the room
 */
export const useParticipants = () => {
  const {
    participants,
    localParticipant,
    speakingParticipants,
    pendingParticipants,
    selectedParticipantId,
    pinnedParticipantId,
    isHost,
    
    // Actions
    approveParticipant,
    kickParticipant,
    toggleParticipantAudio,
    toggleParticipantVideo,
    selectParticipant,
    pinParticipant,
  } = useRoomStore();

  // Convert Map to Array for easier rendering
  const participantList = Array.from(participants.values());
  
  // Get currently speaking participants
  const speakingList = participantList.filter(p => speakingParticipants.has(p.id));
  
  // Get selected participant
  const selectedParticipant = selectedParticipantId 
    ? participants.get(selectedParticipantId) 
    : null;
    
  // Get pinned participant
  const pinnedParticipant = pinnedParticipantId 
    ? participants.get(pinnedParticipantId) 
    : null;

  /**
   * Get participant by ID
   */
  const getParticipant = useCallback((id: string) => {
    return participants.get(id);
  }, [participants]);

  /**
   * Check if participant is speaking
   */
  const isParticipantSpeaking = useCallback((id: string) => {
    return speakingParticipants.has(id);
  }, [speakingParticipants]);

  /**
   * Host actions for participant management
   */
  const hostActions = isHost ? {
    approveParticipant,
    kickParticipant,
    toggleParticipantAudio,
    toggleParticipantVideo,
  } : {};

  return {
    // State
    participants: participantList,
    localParticipant,
    speakingParticipants: speakingList,
    pendingParticipants,
    selectedParticipant,
    pinnedParticipant,
    participantCount: participantList.length,
    
    // Actions
    getParticipant,
    isParticipantSpeaking,
    selectParticipant,
    pinParticipant,
    ...hostActions,
  };
};

/**
 * Hook for managing media devices and streams
 */
export const useMediaControls = () => {
  const {
    localStream,
    screenShareStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    availableDevices,
    selectedDevices,
    
    // Actions
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    switchMicrophone,
    refreshDevices,
  } = useRoomStore();

  /**
   * Initialize media stream on component mount
   */
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  /**
   * Toggle screen sharing
   */
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  /**
   * Check if devices are available
   */
  const hasCamera = availableDevices.cameras.length > 0;
  const hasMicrophone = availableDevices.microphones.length > 0;
  const hasSpeaker = availableDevices.speakers.length > 0;

  return {
    // State
    localStream,
    screenShareStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    availableDevices,
    selectedDevices,
    hasCamera,
    hasMicrophone,
    hasSpeaker,
    
    // Actions
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    switchCamera,
    switchMicrophone,
    refreshDevices,
  };
};

/**
 * Hook for managing chat functionality
 */
export const useChat = () => {
  const {
    messages,
    unreadCount,
    isChatPanelOpen,
    
    // Actions
    sendMessage,
    markMessagesRead,
    toggleChatPanel,
  } = useRoomStore();

  /**
   * Send a text message
   */
  const sendTextMessage = useCallback((content: string) => {
    sendMessage(content, 'text');
  }, [sendMessage]);

  /**
   * Send a private message
   */
  const sendPrivateMessage = useCallback((content: string, targetId: string) => {
    sendMessage(content, 'private', targetId);
  }, [sendMessage]);

  /**
   * Open chat panel and mark messages as read
   */
  const openChat = useCallback(() => {
    if (!isChatPanelOpen) {
      toggleChatPanel();
    }
    markMessagesRead();
  }, [isChatPanelOpen, toggleChatPanel, markMessagesRead]);

  /**
   * Close chat panel
   */
  const closeChat = useCallback(() => {
    if (isChatPanelOpen) {
      toggleChatPanel();
    }
  }, [isChatPanelOpen, toggleChatPanel]);

  return {
    // State
    messages,
    unreadCount,
    isChatPanelOpen,
    hasUnreadMessages: unreadCount > 0,
    
    // Actions
    sendTextMessage,
    sendPrivateMessage,
    openChat,
    closeChat,
    markMessagesRead,
  };
};

/**
 * Hook for managing UI layout and panels
 */
export const useRoomUI = () => {
  const {
    isParticipantsPanelOpen,
    gridLayout,
    isPinned,
    pinnedParticipantId,
    selectedParticipantId,
    
    // Actions
    toggleParticipantsPanel,
    setGridLayout,
    pinParticipant,
    selectParticipant,
  } = useRoomStore();

  /**
   * Switch to gallery view
   */
  const showGalleryView = useCallback(() => {
    setGridLayout('gallery');
    pinParticipant(null);
  }, [setGridLayout, pinParticipant]);

  /**
   * Switch to speaker view
   */
  const showSpeakerView = useCallback(() => {
    setGridLayout('speaker');
  }, [setGridLayout]);

  /**
   * Switch to sidebar view
   */
  const showSidebarView = useCallback(() => {
    setGridLayout('sidebar');
  }, [setGridLayout]);

  /**
   * Toggle pin on selected participant
   */
  const togglePin = useCallback(() => {
    if (isPinned && pinnedParticipantId) {
      pinParticipant(null);
    } else if (selectedParticipantId) {
      pinParticipant(selectedParticipantId);
    }
  }, [isPinned, pinnedParticipantId, selectedParticipantId, pinParticipant]);

  return {
    // State
    isParticipantsPanelOpen,
    gridLayout,
    isPinned,
    pinnedParticipantId,
    selectedParticipantId,
    
    // Actions
    toggleParticipantsPanel,
    showGalleryView,
    showSpeakerView,
    showSidebarView,
    togglePin,
    selectParticipant,
  };
};
