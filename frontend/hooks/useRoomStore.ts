import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { WebSocketClient, ChatPayload, ClientInfo } from '@/lib/websockets';
import { WebRTCManager } from '@/lib/webrtc';

/**
 * Central state management for video conferencing
 * 
 * @example
 * ```typescript
 * const { initializeRoom, joinRoom, toggleAudio } = useRoomStore();
 * await initializeRoom('room123', 'username', 'jwt-token');
 * await joinRoom();
 * ```
 */

/** Participant in video conference */
export interface Participant {
  id: string;
  username: string;
  role: 'host' | 'moderator' | 'participant';
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  lastActivity: Date;
  stream?: MediaStream;
}

/** Chat message */
export interface ChatMessage {
  id: string;
  participantId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system' | 'private';
  targetId?: string;
}

/** Room configuration */
export interface RoomSettings {
  allowScreenShare: boolean;
  allowChat: boolean;
  allowParticipantAudio: boolean;
  allowParticipantVideo: boolean;
  maxParticipants: number;
  requireApproval: boolean;
}

/** Connection state tracking */
export interface ConnectionState {
  wsConnected: boolean;
  wsReconnecting: boolean;
  webrtcConnected: boolean;
  lastError?: string;
}

/** Complete state interface for the room store */
interface RoomState {
  roomId: string | null;
  roomName: string | null;
  roomSettings: RoomSettings | null;
  isJoined: boolean;
  isHost: boolean;
  currentUserId: string | null;
  currentUsername: string | null;

  participants: Map<string, Participant>;
  localParticipant: Participant | null;
  speakingParticipants: Set<string>;

  localStream: MediaStream | null;
  screenShareStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  
  availableDevices: {
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  };
  
  selectedDevices: {
    camera?: string;
    microphone?: string;
    speaker?: string;
  };

  messages: ChatMessage[];
  unreadCount: number;
  isChatPanelOpen: boolean;

  isParticipantsPanelOpen: boolean;
  isWaitingRoom: boolean;
  pendingParticipants: Participant[];
  selectedParticipantId: string | null;
  gridLayout: 'gallery' | 'speaker' | 'sidebar';
  isPinned: boolean;
  pinnedParticipantId: string | null;

  connectionState: ConnectionState;
  
  wsClient: WebSocketClient | null;
  webrtcManager: WebRTCManager | null;
  clientInfo: ClientInfo | null;
}

/** Actions for room store */
interface RoomActions {
  initializeRoom: (roomId: string, username: string, token: string) => Promise<void>;
  joinRoom: (approvalToken?: string) => Promise<void>;
  leaveRoom: () => void;
  updateRoomSettings: (settings: Partial<RoomSettings>) => void;

  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  approveParticipant: (participantId: string) => void;
  kickParticipant: (participantId: string) => void;
  toggleParticipantAudio: (participantId: string) => void;
  toggleParticipantVideo: (participantId: string) => void;

  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  switchCamera: (deviceId: string) => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<void>;

  sendMessage: (content: string, type?: 'text' | 'private', targetId?: string) => void;
  markMessagesRead: () => void;
  toggleChatPanel: () => void;

  toggleParticipantsPanel: () => void;
  setGridLayout: (layout: 'gallery' | 'speaker' | 'sidebar') => void;
  pinParticipant: (participantId: string | null) => void;
  selectParticipant: (participantId: string | null) => void;

  updateConnectionState: (updates: Partial<ConnectionState>) => void;
  handleError: (error: string) => void;
  clearError: () => void;
}

export const useRoomStore = create<RoomState & RoomActions>()(
  devtools(
    (set, get) => ({
      roomId: null,
      roomName: null,
      roomSettings: null,
      isJoined: false,
      isHost: false,
      currentUserId: null,
      currentUsername: null,

      participants: new Map(),
      localParticipant: null,
      speakingParticipants: new Set(),

      localStream: null,
      screenShareStream: null,
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      
      availableDevices: {
        cameras: [],
        microphones: [],
        speakers: [],
      },
      selectedDevices: {},

      messages: [],
      unreadCount: 0,
      isChatPanelOpen: false,

      isParticipantsPanelOpen: false,
      isWaitingRoom: false,
      pendingParticipants: [],
      selectedParticipantId: null,
      gridLayout: 'gallery',
      isPinned: false,
      pinnedParticipantId: null,

      connectionState: {
        wsConnected: false,
        wsReconnecting: false,
        webrtcConnected: false,
      },

      wsClient: null,
      webrtcManager: null,
      clientInfo: null,

      /** Initialize room connections */
      initializeRoom: async (roomId: string, username: string, token: string) => {
        const state = get();
        
        if (state.wsClient) {
          state.wsClient.disconnect();
        }

        const clientInfo: ClientInfo = {
          clientId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          displayName: username,
        };

        const wsClient = new WebSocketClient({
          url: `ws://localhost:8080/ws/zoom/${roomId}`,
          token,
          autoReconnect: true,
          reconnectInterval: 3000,
          maxReconnectAttempts: 5,
        });

        wsClient.on('add_chat', (message) => {
          const chatPayload = message.payload as ChatPayload;
          
          const chatMessage: ChatMessage = {
            id: chatPayload.chatId,
            participantId: chatPayload.clientId,
            username: chatPayload.displayName,
            content: chatPayload.chatContent,
            timestamp: new Date(chatPayload.timestamp),
            type: 'text',
          };

          set((state) => ({
            messages: [...state.messages, chatMessage],
            unreadCount: state.isChatPanelOpen ? state.unreadCount : state.unreadCount + 1,
          }));
        });

        wsClient.on('room_state', (message) => {
          const payload = message.payload as any;
          
          const participantsMap = new Map<string, Participant>();
          
          payload.hosts?.forEach((host: any) => {
            participantsMap.set(host.clientId, {
              id: host.clientId,
              username: host.displayName,
              role: 'host',
              isAudioEnabled: true,
              isVideoEnabled: true,
              isScreenSharing: false,
              isSpeaking: false,
              lastActivity: new Date(),
            });
          });

          payload.participants?.forEach((participant: any) => {
            participantsMap.set(participant.clientId, {
              id: participant.clientId,
              username: participant.displayName,
              role: 'participant',
              isAudioEnabled: true,
              isVideoEnabled: true,
              isScreenSharing: false,
              isSpeaking: false,
              lastActivity: new Date(),
            });
          });

          const waitingParticipants: Participant[] = payload.waitingUsers?.map((user: any) => ({
            id: user.clientId,
            username: user.displayName,
            role: 'participant' as const,
            isAudioEnabled: false,
            isVideoEnabled: false,
            isScreenSharing: false,
            isSpeaking: false,
            lastActivity: new Date(),
          })) || [];

          set({
            participants: participantsMap,
            pendingParticipants: waitingParticipants,
            isHost: payload.hosts?.some((h: any) => h.clientId === clientInfo.clientId) || false,
          });
        });

        wsClient.on('accept_waiting', (message) => {
          set({ isWaitingRoom: false, isJoined: true });
        });

        wsClient.on('deny_waiting', (message) => {
          get().handleError('Access to room denied by host');
        });

        wsClient.on('raise_hand', (message) => {
          const payload = message.payload as any;
          
          set((state) => {
            const newSpeaking = new Set(state.speakingParticipants);
            newSpeaking.add(payload.clientId);
            return { speakingParticipants: newSpeaking };
          });
        });

        wsClient.on('lower_hand', (message) => {
          const payload = message.payload as any;
          
          set((state) => {
            const newSpeaking = new Set(state.speakingParticipants);
            newSpeaking.delete(payload.clientId);
            return { speakingParticipants: newSpeaking };
          });
        });

        wsClient.on('offer', (message) => {
          if (get().webrtcManager) {
            // TODO: Call webrtcManager.handleOffer(message) when WebRTCManager is implemented
          }
        });

        wsClient.on('answer', (message) => {
          if (get().webrtcManager) {
            // TODO: Call webrtcManager.handleAnswer(message) when WebRTCManager is implemented
          }
        });

        wsClient.on('candidate', (message) => {
          if (get().webrtcManager) {
            // TODO: Call webrtcManager.handleCandidate(message) when WebRTCManager is implemented
          }
        });

        wsClient.onConnectionChange?.((connectionState: string) => {
          set((state) => ({
            connectionState: {
              ...state.connectionState,
              wsConnected: connectionState === 'connected',
              wsReconnecting: connectionState === 'reconnecting',
            }
          }));
        });

        wsClient.onError((error: Error) => {
          console.error('WebSocket error:', error);
          get().handleError(`Connection error: ${error.message}`);
        });

        try {
          await wsClient.connect();

          const webrtcManager = new WebRTCManager(clientInfo, wsClient);

          set((state) => ({
            connectionState: { ...state.connectionState, wsConnected: true }
          }));

          await get().refreshDevices();

          set({
            roomId,
            currentUsername: username,
            wsClient,
            webrtcManager,
            clientInfo,
          });          
        } catch (error) {
          console.error('Failed to initialize room:', error);
          get().handleError(`Failed to initialize room: ${error}`);
          throw error;
        }
      },

      /** Request to join room */
      joinRoom: async (approvalToken?: string) => {
        const { wsClient, clientInfo } = get();
        
        if (!wsClient || !clientInfo) {
          console.error('Cannot join room: WebSocket or client info not available');
          get().handleError('Connection not ready. Please try again.');
          return;
        }

        try {
          wsClient.requestWaiting(clientInfo);
          set({ isJoined: true, isWaitingRoom: false });
        } catch (error) {
          console.error('Failed to join room:', error);
          get().handleError(`Failed to join room: ${error}`);
        }
      },

      /** Clean exit from room with full cleanup */
      leaveRoom: () => {
        const { wsClient, webrtcManager, localStream, screenShareStream } = get();
        
        if (localStream) {
          localStream.getTracks().forEach(track => {
            track.stop();
          });
        }
        
        if (screenShareStream) {
          screenShareStream.getTracks().forEach(track => {
            track.stop();
          });
        }

        if (webrtcManager) {
          webrtcManager.cleanup();
        }

        if (wsClient) {
          wsClient.disconnect();
        }

        set({
          roomId: null,
          roomName: null,
          roomSettings: null,
          isJoined: false,
          isHost: false,
          currentUserId: null,
          currentUsername: null,
          
          participants: new Map(),
          localParticipant: null,
          speakingParticipants: new Set(),
          
          localStream: null,
          screenShareStream: null,
          isAudioEnabled: true,
          isVideoEnabled: true,
          isScreenSharing: false,
          
          messages: [],
          unreadCount: 0,
          isChatPanelOpen: false,
          
          isParticipantsPanelOpen: false,
          isWaitingRoom: false,
          pendingParticipants: [],
          selectedParticipantId: null,
          gridLayout: 'gallery',
          isPinned: false,
          pinnedParticipantId: null,
          
          connectionState: {
            wsConnected: false,
            wsReconnecting: false,
            webrtcConnected: false,
          },
          wsClient: null,
          webrtcManager: null,
          clientInfo: null,
        });
      },

      /** Update room configuration (host only) */
      updateRoomSettings: (settings: Partial<RoomSettings>) => {
        set((state) => ({
          roomSettings: { ...state.roomSettings, ...settings } as RoomSettings
        }));
      },

      /** Add new participant to room */
      addParticipant: (participant: Participant) => {
        set((state) => {
          const newParticipants = new Map(state.participants);
          newParticipants.set(participant.id, participant);
          return { participants: newParticipants };
        });
      },

      /** Remove participant and clean up UI state */
      removeParticipant: (participantId: string) => {
        set((state) => {
          const newParticipants = new Map(state.participants);
          newParticipants.delete(participantId);
          
          const newSpeaking = new Set(state.speakingParticipants);
          newSpeaking.delete(participantId);

          return {
            participants: newParticipants,
            speakingParticipants: newSpeaking,
            selectedParticipantId: state.selectedParticipantId === participantId ? null : state.selectedParticipantId,
            pinnedParticipantId: state.pinnedParticipantId === participantId ? null : state.pinnedParticipantId,
          };
        });
      },

      /** Update participant properties */
      updateParticipant: (participantId: string, updates: Partial<Participant>) => {
        set((state) => {
          const newParticipants = new Map(state.participants);
          const existing = newParticipants.get(participantId);
          
          if (existing) {
            newParticipants.set(participantId, { ...existing, ...updates });
          } else {
            console.warn('Attempted to update non-existent participant:', participantId);
          }
          
          return { participants: newParticipants };
        });
      },

      /** Approve waiting room participant (host only) */
      approveParticipant: (participantId: string) => {
        set((state) => ({
          pendingParticipants: state.pendingParticipants.filter(p => p.id !== participantId)
        }));
        // TODO: Send approval command to backend via WebSocket
      },

      /** Remove participant from room (host only) */
      kickParticipant: (participantId: string) => {
        get().removeParticipant(participantId);
        // TODO: Send kick command to backend via WebSocket
      },

      /** Mute/unmute participant (host only) */
      toggleParticipantAudio: (participantId: string) => {
        const participant = get().participants.get(participantId);
        
        if (participant) {
          get().updateParticipant(participantId, {
            isAudioEnabled: !participant.isAudioEnabled
          });
          // TODO: Send audio control command to backend via WebSocket
        }
      },

      /** Enable/disable participant video (host only) */
      toggleParticipantVideo: (participantId: string) => {
        const participant = get().participants.get(participantId);
        
        if (participant) {
          get().updateParticipant(participantId, {
            isVideoEnabled: !participant.isVideoEnabled
          });
          // TODO: Send video control command to backend via WebSocket
        }
      },

      /** Mute/unmute local microphone */
      toggleAudio: async () => {
        const { localStream, isAudioEnabled } = get();
        if (localStream) {
          const audioTracks = localStream.getAudioTracks();
          audioTracks.forEach(track => {
            track.enabled = !isAudioEnabled;
          });
          set({ isAudioEnabled: !isAudioEnabled });
        } else {
          console.warn('No local stream available for audio toggle');
          get().handleError('Microphone not available. Please check permissions.');
        }
      },

      /** Enable/disable local camera */
      toggleVideo: async () => {
        const { localStream, isVideoEnabled } = get();
        if (localStream) {
          const videoTracks = localStream.getVideoTracks();
          videoTracks.forEach(track => {
            track.enabled = !isVideoEnabled;
          });
          set({ isVideoEnabled: !isVideoEnabled });
        } else {
          console.warn('No local stream available for video toggle');
          get().handleError('Camera not available. Please check permissions.');
        }
      },

      /** Begin screen sharing */
      startScreenShare: async () => {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });

          screenStream.getVideoTracks()[0].onended = () => {
            get().stopScreenShare();
          };

          set({ 
            screenShareStream: screenStream,
            isScreenSharing: true 
          });
        } catch (error) {
          console.error('Failed to start screen share:', error);
          get().handleError(`Failed to start screen share: ${error}`);
        }
      },

      /** End screen sharing */
      stopScreenShare: async () => {
        const { screenShareStream } = get();
        
        if (screenShareStream) {
          screenShareStream.getTracks().forEach(track => {
            track.stop();
          });
        }

        set({ 
          screenShareStream: null,
          isScreenSharing: false 
        });
      },

      /** Change to different camera device */
      switchCamera: async (deviceId: string) => {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId } },
            audio: false,
          });

          const { localStream } = get();
          
          if (localStream) {
            const newVideoTrack = newStream.getVideoTracks()[0];
            const oldVideoTrack = localStream.getVideoTracks()[0];
            
            if (oldVideoTrack) {
              localStream.removeTrack(oldVideoTrack);
              oldVideoTrack.stop();
            }
            
            if (newVideoTrack) {
              localStream.addTrack(newVideoTrack);
            }
          }
          
          set((state) => ({
            selectedDevices: { ...state.selectedDevices, camera: deviceId }
          }));
        } catch (error) {
          console.error('Failed to switch camera:', error);
          get().handleError(`Failed to switch camera: ${error}`);
        }
      },

      /** Change to different microphone device */
      switchMicrophone: async (deviceId: string) => {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: { deviceId: { exact: deviceId } },
          });

          const { localStream } = get();
          
          if (localStream) {
            const newAudioTrack = newStream.getAudioTracks()[0];
            const oldAudioTrack = localStream.getAudioTracks()[0];
            
            if (oldAudioTrack) {
              localStream.removeTrack(oldAudioTrack);
              oldAudioTrack.stop();
            }
            
            if (newAudioTrack) {
              localStream.addTrack(newAudioTrack);
            }
          }
          
          set((state) => ({
            selectedDevices: { ...state.selectedDevices, microphone: deviceId }
          }));
        } catch (error) {
          console.error('Failed to switch microphone:', error);
          get().handleError(`Failed to switch microphone: ${error}`);
        }
      },

      /**
       * REFRESH DEVICES - Update list of available media devices
       * 
       * Enumerates all available cameras, microphones, and speakers.
       * Should be called when devices are plugged/unplugged or on initial setup.
       */
      refreshDevices: async () => {
        try {
          
          // Get all available media devices from browser
          const devices = await navigator.mediaDevices.enumerateDevices();
          
          // Filter devices by type
          const cameras = devices.filter(device => device.kind === 'videoinput');
          const microphones = devices.filter(device => device.kind === 'audioinput');
          const speakers = devices.filter(device => device.kind === 'audiooutput');

          // Update available devices in state
          set({
            availableDevices: { cameras, microphones, speakers }
          });
          
        } catch (error) {
          console.error('Failed to refresh devices:', error);
          get().handleError(`Failed to refresh devices: ${error}`);
        }
      },

      // =================== CHAT MANAGEMENT ===================

      /** Send chat message to room */
      sendChatMessage: async (content: string) => {
        const { wsClient, currentUserId, currentUsername } = get();

        if (!wsClient || !currentUserId || !currentUsername) {
          console.warn('Cannot send message: missing required components');
          return;
        }

        try {
          wsClient.sendChat(content.trim(), {
            clientId: currentUserId,
            displayName: currentUsername
          });
        } catch (error) {
          console.error('Failed to send chat message:', error);
          get().handleError('Failed to send message. Please try again.');
        }
      },

      /** Clear all chat messages */
      clearChatMessages: () => {
        set({ messages: [] });
      },      /**
       * MARK MESSAGES READ - Clear unread message count
       * 
       * Resets the unread message counter, typically called when user
      /** Automatically mark messages as read */
      markMessagesRead: () => {
        set({ unreadCount: 0 });
      },

      /** Toggle chat panel visibility */
      toggleChatPanel: () => {
        set((state) => {
          const newOpen = !state.isChatPanelOpen;
          return {
            isChatPanelOpen: newOpen,
            unreadCount: newOpen ? 0 : state.unreadCount,
          };
        });
      },

      /** Toggle participants panel visibility */
      toggleParticipantsPanel: () => {
        set((state) => {
          const newOpen = !state.isParticipantsPanelOpen;
          return { isParticipantsPanelOpen: newOpen };
        });
      },

      /** Change video display layout */
      setGridLayout: (layout: 'gallery' | 'speaker' | 'sidebar') => {
        set({ gridLayout: layout });
      },

      /** Pin participant's video prominently */
      pinParticipant: (participantId: string | null) => {
        set({
          pinnedParticipantId: participantId,
          isPinned: participantId !== null,
        });
      },

      /** Select participant for actions */
      selectParticipant: (participantId: string | null) => {
        set({ selectedParticipantId: participantId });
      },

      /** Update connection status for UI */
      updateConnectionState: (updates: Partial<ConnectionState>) => {
        set((state) => ({
          connectionState: { ...state.connectionState, ...updates }
        }));
      },

      /** Display error message to user */
      handleError: (error: string) => {
        set((state) => ({
          connectionState: { ...state.connectionState, lastError: error }
        }));
      },

      /** Remove current error message */
      clearError: () => {
        set((state) => ({
          connectionState: { ...state.connectionState, lastError: undefined }
        }));
      },
    }),
    {
      name: 'room-store',
    }
  )
);
