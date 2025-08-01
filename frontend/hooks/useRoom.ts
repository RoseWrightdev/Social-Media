import { useEffect, useCallback } from 'react';
import { useRoomStore } from '@/store/useRoomStore';

/**
 * ROOM MANAGEMENT HOOK
 * 
 * This high-level hook provides a simplified interface for room operations
 * in the video conferencing application. It abstracts complex room lifecycle
 * management and provides a clean API for components.
 * 
 * Key Features:
 * - Simplified room joining and leaving
 * - Integrated authentication handling
 * - Connection state monitoring
 * - Automatic error recovery
 * - Host privilege management
 * - Waiting room state handling
 * 
 * Design Philosophy:
 * - Provide a high-level API that hides complexity from components
 * - Handle common room operation patterns automatically
 * - Integrate authentication and error handling seamlessly
 * - Support both simple and advanced room management scenarios
 * 
 * Usage Pattern:
 * const { joinRoomWithAuth, exitRoom, isConnected } = useRoom();
 * await joinRoomWithAuth('room-123', 'John Doe', 'jwt-token');
 */
export const useRoom = () => {
  // =================== ROOM STORE INTEGRATION ===================
  // Extract relevant state and actions from the room store
  const {
    // =================== ROOM STATE ===================
    roomId,                               // Current room identifier
    roomName,                            // Human-readable room name
    isJoined,                            // Whether user has successfully joined the room
    isHost,                              // Whether user has host privileges
    currentUsername,                     // User's display name in the room
    connectionState,                     // Real-time connection status
    isWaitingRoom,                       // Whether user is in waiting room awaiting approval
    
    // =================== ROOM ACTIONS ===================
    initializeRoom,                      // Initialize room connection and setup
    joinRoom,                            // Request to join the room
    leaveRoom,                           // Leave room and cleanup all resources
    updateRoomSettings,                  // Modify room configuration (host only)
    handleError,                         // Handle and display errors
    clearError,                          // Clear current error state
  } = useRoomStore();

  // =================== HIGH-LEVEL ROOM OPERATIONS ===================
  
  /**
   * JOIN ROOM WITH AUTHENTICATION - Simplified room joining
   * 
   * This function combines room initialization and joining into a single operation.
   * It handles the complete flow of:
   * 1. Setting up WebSocket connection to backend
   * 2. Authenticating with JWT token
   * 3. Requesting to join the room (may go to waiting room)
   * 4. Handling any errors that occur during the process
   * 
   * This is the primary method components should use to join rooms.
   * 
   * @param roomId - Unique identifier for the room to join
   * @param username - Display name for the user in this room
   * @param token - JWT authentication token for backend verification
   * @param approvalToken - Optional pre-approval token if user was invited
   */
  const joinRoomWithAuth = useCallback(async (
    roomId: string,
    username: string,
    token: string,
    approvalToken?: string
  ) => {    
    try {
      // =================== ROOM INITIALIZATION ===================
      // Set up all necessary connections and event handlers
      await initializeRoom(roomId, username, token);
      
      // =================== ROOM JOINING ===================
      // Request to join the room (may require host approval)
      await joinRoom(approvalToken);      
    } catch (error) {
      console.error('Failed to join room:', error);
      handleError(`Failed to join room: ${error}`);
      
      // Re-throw error so caller can handle it if needed
      throw error;
    }
  }, [initializeRoom, joinRoom, handleError]);

  /**
   * EXIT ROOM - Clean room departure
   * 
   * Provides a clean way to leave the room with proper cleanup.
   * This wrapper ensures consistent behavior and can be extended
   * with additional cleanup logic if needed.
   */
  const exitRoom = useCallback(() => {    
    // Perform complete room cleanup
    leaveRoom();
    }, [leaveRoom]);

  // =================== ROOM STATUS HELPERS ===================
  
  /**
   * IS ROOM READY - Check if room is fully ready for use
   * 
   * A room is considered ready when:
   * - WebSocket connection is established
   * - User has successfully joined the room
   * - User is not in waiting room awaiting approval
   * 
   * This is useful for conditionally rendering UI components that require
   * a fully established room connection.
   */
  const isRoomReady = connectionState.wsConnected && isJoined && !isWaitingRoom;

  /**
   * HAS CONNECTION ISSUES - Detect connection problems
   * 
   * Connection issues are detected when:
   * - WebSocket is attempting to reconnect
   * - User believes they're joined but WebSocket is disconnected
   * 
   * This helps display appropriate error messages and retry options to users.
   */
  const hasConnectionIssues = connectionState.wsReconnecting || 
    (!connectionState.wsConnected && isJoined);

  // =================== HOOK RETURN VALUE ===================
  
  return {
    // =================== ROOM STATE ===================
    roomId,                               // Current room identifier
    roomName,                            // Human-readable room name
    isJoined,                            // Whether user has joined the room
    isHost,                              // Whether user has host privileges
    currentUsername,                     // User's display name
    isWaitingRoom,                       // Whether user is awaiting approval
    isRoomReady,                         // Whether room is fully operational
    hasConnectionIssues,                 // Whether there are connection problems
    connectionState,                     // Detailed connection status
    
    // =================== ROOM ACTIONS ===================
    joinRoomWithAuth,                    // Join room with authentication
    exitRoom,                            // Leave room cleanly
    updateRoomSettings,                  // Modify room configuration
    clearError,                          // Clear error messages
  };
};

// =================== PARTICIPANT MANAGEMENT HOOK ===================

/**
 * PARTICIPANTS HOOK
 * 
 * Specialized hook for managing participants in the video conference room.
 * Provides convenient access to participant data and management actions.
 * 
 * Features:
 * - Participant list management with easy array access
 * - Speaking participant tracking
 * - Waiting room participant management
 * - Host-only actions for participant control
 * - Selection and pinning utilities
 * 
 * Usage:
 * const { participants, approveParticipant, isParticipantSpeaking } = useParticipants();
 */
export const useParticipants = () => {
  // =================== ROOM STORE INTEGRATION ===================
  const {
    // Participant data from room store
    participants,                        // Map of all active participants
    localParticipant,                    // Current user's participant data
    speakingParticipants,                // Set of participant IDs currently speaking
    pendingParticipants,                 // Array of participants awaiting approval
    selectedParticipantId,               // Currently selected participant ID
    pinnedParticipantId,                 // Currently pinned participant ID
    isHost,                              // Whether current user is host
    
    // Participant management actions
    approveParticipant,                  // Approve waiting room participant
    kickParticipant,                     // Remove participant from room
    toggleParticipantAudio,              // Mute/unmute participant
    toggleParticipantVideo,              // Enable/disable participant video
    selectParticipant,                   // Select participant for actions
    pinParticipant,                      // Pin/unpin participant
  } = useRoomStore();

  // =================== DATA TRANSFORMATIONS ===================
  
  // Convert Map to Array for easier iteration in components
  const participantList = Array.from(participants.values());
  
  // Get list of participants currently speaking
  const speakingList = participantList.filter(p => speakingParticipants.has(p.id));
  
  // Get currently selected participant object
  const selectedParticipant = selectedParticipantId 
    ? participants.get(selectedParticipantId) 
    : null;
    
  // Get currently pinned participant object
  const pinnedParticipant = pinnedParticipantId 
    ? participants.get(pinnedParticipantId) 
    : null;

  // =================== UTILITY FUNCTIONS ===================
  
  /**
   * GET PARTICIPANT - Retrieve participant by ID
   * 
   * @param id - Participant ID to look up
   * @returns Participant object or undefined if not found
   */
  const getParticipant = useCallback((id: string) => {
    return participants.get(id);
  }, [participants]);

  /**
   * IS PARTICIPANT SPEAKING - Check if participant is currently speaking
   * 
   * @param id - Participant ID to check
   * @returns Boolean indicating if participant is speaking
   */
  const isParticipantSpeaking = useCallback((id: string) => {
    return speakingParticipants.has(id);
  }, [speakingParticipants]);

  // =================== HOST ACTIONS ===================
  
  /**
   * HOST ACTIONS - Actions only available to room hosts
   * 
   * These actions are conditionally included based on whether the current
   * user has host privileges. This prevents unauthorized actions and
   * provides a clean API for components.
   */
  const hostActions = isHost ? {
    approveParticipant,                  // Approve participants from waiting room
    kickParticipant,                     // Remove participants from room
    toggleParticipantAudio,              // Control participant audio
    toggleParticipantVideo,              // Control participant video
  } : {};

  // =================== RETURN VALUE ===================
  
  return {
    // =================== PARTICIPANT DATA ===================
    participants: participantList,       // All participants as array
    localParticipant,                    // Current user's participant data
    speakingParticipants: speakingList,  // Currently speaking participants
    pendingParticipants,                 // Participants awaiting approval
    selectedParticipant,                 // Currently selected participant
    pinnedParticipant,                   // Currently pinned participant
    participantCount: participantList.length, // Total participant count
    
    // =================== UTILITY ACTIONS ===================
    getParticipant,                      // Get participant by ID
    isParticipantSpeaking,               // Check if participant is speaking
    selectParticipant,                   // Select participant for actions
    pinParticipant,                      // Pin/unpin participant
    
    // =================== HOST ACTIONS (CONDITIONAL) ===================
    ...hostActions,                      // Host-only actions (if user is host)
  };
};

// =================== MEDIA CONTROLS HOOK ===================

/**
 * MEDIA CONTROLS HOOK
 * 
 * Specialized hook for managing media devices and streams in the room.
 * Provides convenient access to media state and control actions.
 * 
 * Features:
 * - Local media stream management
 * - Screen sharing controls
 * - Device enumeration and switching
 * - Media capability detection
 * - Audio/video toggle controls
 * 
 * Usage:
 * const { toggleAudio, isAudioEnabled, availableDevices } = useMediaControls();
 */
export const useMediaControls = () => {
  // =================== ROOM STORE INTEGRATION ===================
  const {
    // Media stream state
    localStream,                         // User's local media stream
    screenShareStream,                   // User's screen sharing stream
    isAudioEnabled,                      // Whether audio is enabled
    isVideoEnabled,                      // Whether video is enabled
    isScreenSharing,                     // Whether screen sharing is active
    availableDevices,                    // Available cameras, mics, speakers
    selectedDevices,                     // Currently selected device IDs
    
    // Media control actions
    toggleAudio,                         // Toggle microphone on/off
    toggleVideo,                         // Toggle camera on/off
    startScreenShare,                    // Start screen sharing
    stopScreenShare,                     // Stop screen sharing
    switchCamera,                        // Switch to different camera
    switchMicrophone,                    // Switch to different microphone
    refreshDevices,                      // Refresh available device list
  } = useRoomStore();

  // =================== INITIALIZATION EFFECT ===================
  
  /**
   * DEVICE INITIALIZATION
   * 
   * Automatically refresh the device list when the component mounts.
   * This ensures we have up-to-date device information for the UI.
   */
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // =================== ENHANCED ACTIONS ===================
  
  /**
   * TOGGLE SCREEN SHARE - Smart screen sharing toggle
   * 
   * Provides a single function to start or stop screen sharing based
   * on current state. Simplifies UI logic for screen share buttons.
   */
  const toggleScreenShare = useCallback(async () => {    
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  // =================== DEVICE CAPABILITY CHECKS ===================
  
  /**
   * DEVICE AVAILABILITY CHECKS
   * 
   * These boolean flags indicate whether specific types of devices are available.
   * Useful for conditionally showing device-related UI elements.
   */
  const hasCamera = availableDevices.cameras.length > 0;
  const hasMicrophone = availableDevices.microphones.length > 0;
  const hasSpeaker = availableDevices.speakers.length > 0;

  // =================== RETURN VALUE ===================
  
  return {
    // =================== MEDIA STATE ===================
    localStream,                         // Current local media stream
    screenShareStream,                   // Current screen share stream
    isAudioEnabled,                      // Audio enabled state
    isVideoEnabled,                      // Video enabled state
    isScreenSharing,                     // Screen sharing state
    availableDevices,                    // All available devices
    selectedDevices,                     // Currently selected devices
    hasCamera,                           // Whether camera is available
    hasMicrophone,                       // Whether microphone is available
    hasSpeaker,                          // Whether speakers are available
    
    // =================== MEDIA ACTIONS ===================
    toggleAudio,                         // Toggle microphone
    toggleVideo,                         // Toggle camera
    toggleScreenShare,                   // Toggle screen sharing
    switchCamera,                        // Switch camera device
    switchMicrophone,                    // Switch microphone device
    refreshDevices,                      // Refresh device list
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
