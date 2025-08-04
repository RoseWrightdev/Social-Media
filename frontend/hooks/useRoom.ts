import { useEffect, useCallback } from 'react';
import { useRoomStore } from '@/hooks/useRoomStore';

/**
 * Room management hooks for video conferencing
 * 
 * @example
 * ```tsx
 * const { joinRoomWithAuth, exitRoom, isRoomReady } = useRoom();
 * await joinRoomWithAuth('room-123', 'John Doe', 'jwt-token');
 * ```
 */
export const useRoom = () => {
  const {
    roomId,
    roomName,
    isJoined,
    isHost,
    currentUsername,
    connectionState,
    isWaitingRoom,
    initializeRoom,
    joinRoom,
    leaveRoom,
    updateRoomSettings,
    handleError,
    clearError,
  } = useRoomStore();

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
      console.error('Failed to join room:', error);
      handleError(`Failed to join room: ${error}`);
      throw error;
    }
  }, [initializeRoom, joinRoom, handleError]);

  const exitRoom = useCallback(() => {
    leaveRoom();
  }, [leaveRoom]);

  const isRoomReady = connectionState.wsConnected && isJoined && !isWaitingRoom;
  const hasConnectionIssues = connectionState.wsReconnecting || 
    (!connectionState.wsConnected && isJoined);

  return {
    roomId,
    roomName,
    isJoined,
    isHost,
    currentUsername,
    isWaitingRoom,
    isRoomReady,
    hasConnectionIssues,
    connectionState,
    joinRoomWithAuth,
    exitRoom,
    updateRoomSettings,
    clearError,
  };
};

/**
 * Participant management for video conferencing
 * 
 * @example
 * ```tsx
 * const { participants, isParticipantSpeaking } = useParticipants();
 * ```
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
    approveParticipant,
    kickParticipant,
    toggleParticipantAudio,
    toggleParticipantVideo,
    selectParticipant,
    pinParticipant,
  } = useRoomStore();

  const participantList = Array.from(participants.values());
  const speakingList = participantList.filter(p => speakingParticipants.has(p.id));
  
  const selectedParticipant = selectedParticipantId 
    ? participants.get(selectedParticipantId) 
    : null;
    
  const pinnedParticipant = pinnedParticipantId 
    ? participants.get(pinnedParticipantId) 
    : null;

  const getParticipant = useCallback((id: string) => {
    return participants.get(id);
  }, [participants]);

  const isParticipantSpeaking = useCallback((id: string) => {
    return speakingParticipants.has(id);
  }, [speakingParticipants]);

  const hostActions = isHost ? {
    approveParticipant,
    kickParticipant,
    toggleParticipantAudio,
    toggleParticipantVideo,
  } : {};

  return {
    participants: participantList,
    localParticipant,
    speakingParticipants: speakingList,
    pendingParticipants,
    selectedParticipant,
    pinnedParticipant,
    participantCount: participantList.length,
    getParticipant,
    isParticipantSpeaking,
    selectParticipant,
    pinParticipant,
    ...hostActions,
  };
};

/**
 * Media controls for video conferencing
 * 
 * @example
 * ```tsx
 * const { toggleAudio, toggleVideo, toggleScreenShare } = useMediaControls();
 * ```
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
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    switchMicrophone,
    refreshDevices,
  } = useRoomStore();

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  const toggleScreenShare = useCallback(async () => {    
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  const hasCamera = availableDevices.cameras.length > 0;
  const hasMicrophone = availableDevices.microphones.length > 0;
  const hasSpeaker = availableDevices.speakers.length > 0;

  return {
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
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    switchCamera,
    switchMicrophone,
    refreshDevices,
  };
};

/**
 * Chat functionality for video conferencing
 * 
 * @example
 * ```tsx
 * const { sendTextMessage, openChat, hasUnreadMessages } = useChat();
 * ```
 */
export const useChat = () => {
  const {
    messages,
    unreadCount,
    isChatPanelOpen,
    sendMessage,
    markMessagesRead,
    toggleChatPanel,
  } = useRoomStore();

  const sendChat = useCallback((content: string) => {
    sendMessage(content, 'text');
  }, [sendMessage]);

  const sendPrivateChat = useCallback((content: string, targetId: string) => {
    sendMessage(content, 'private', targetId);
  }, [sendMessage]);

  const openChat = useCallback(() => {
    if (!isChatPanelOpen) {
      toggleChatPanel();
    }
    markMessagesRead();
  }, [isChatPanelOpen, toggleChatPanel, markMessagesRead]);

  const closeChat = useCallback(() => {
    if (isChatPanelOpen) {
      toggleChatPanel();
    }
  }, [isChatPanelOpen, toggleChatPanel]);

  return {
    messages,
    unreadCount,
    isChatPanelOpen,
    hasUnreadMessages: unreadCount > 0,
    sendChat,
    sendPrivateChat,
    openChat,
    closeChat,
    markMessagesRead,
  };
};

/**
 * Room UI layout and controls
 * 
 * @example
 * ```tsx
 * const { showGalleryView, togglePin, gridLayout } = useRoomUI();
 * ```
 */
export const useRoomUI = () => {
  const {
    isParticipantsPanelOpen,
    gridLayout,
    isPinned,
    pinnedParticipantId,
    selectedParticipantId,
    toggleParticipantsPanel,
    setGridLayout,
    pinParticipant,
    selectParticipant,
  } = useRoomStore();

  const showGalleryView = useCallback(() => {
    setGridLayout('gallery');
    pinParticipant(null);
  }, [setGridLayout, pinParticipant]);

  const showSpeakerView = useCallback(() => {
    setGridLayout('speaker');
  }, [setGridLayout]);

  const showSidebarView = useCallback(() => {
    setGridLayout('sidebar');
  }, [setGridLayout]);

  const togglePin = useCallback(() => {
    if (isPinned && pinnedParticipantId) {
      pinParticipant(null);
    } else if (selectedParticipantId) {
      pinParticipant(selectedParticipantId);
    }
  }, [isPinned, pinnedParticipantId, selectedParticipantId, pinParticipant]);

  return {
    isParticipantsPanelOpen,
    gridLayout,
    isPinned,
    pinnedParticipantId,
    selectedParticipantId,
    toggleParticipantsPanel,
    showGalleryView,
    showSpeakerView,
    showSidebarView,
    togglePin,
    selectParticipant,
  };
};
