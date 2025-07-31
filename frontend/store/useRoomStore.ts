import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { WebSocketClient, ChatPayload, ClientInfo } from '@/lib/websockets';
import { WebRTCManager } from '@/lib/webrtc';

// Types for participants and room state
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

export interface ChatMessage {
  id: string;
  participantId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system' | 'private';
  targetId?: string; // for private messages
}

export interface RoomSettings {
  allowScreenShare: boolean;
  allowChat: boolean;
  allowParticipantAudio: boolean;
  allowParticipantVideo: boolean;
  maxParticipants: number;
  requireApproval: boolean;
}

export interface ConnectionState {
  wsConnected: boolean;
  wsReconnecting: boolean;
  webrtcConnected: boolean;
  lastError?: string;
}

// Main room store state interface
interface RoomState {
  // Room info
  roomId: string | null;
  roomName: string | null;
  roomSettings: RoomSettings | null;
  isJoined: boolean;
  isHost: boolean;
  currentUserId: string | null;
  currentUsername: string | null;

  // Participants
  participants: Map<string, Participant>;
  localParticipant: Participant | null;
  speakingParticipants: Set<string>;

  // Media states
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

  // Chat
  messages: ChatMessage[];
  unreadCount: number;
  isChatPanelOpen: boolean;

  // UI states
  isParticipantsPanelOpen: boolean;
  isWaitingRoom: boolean;
  pendingParticipants: Participant[];
  selectedParticipantId: string | null;
  gridLayout: 'gallery' | 'speaker' | 'sidebar';
  isPinned: boolean;
  pinnedParticipantId: string | null;

  // Connection
  connectionState: ConnectionState;
  
  // Clients
  wsClient: WebSocketClient | null;
  webrtcManager: WebRTCManager | null;
  clientInfo: ClientInfo | null;
}

// Actions interface
interface RoomActions {
  // Room management
  initializeRoom: (roomId: string, username: string, token: string) => Promise<void>;
  joinRoom: (approvalToken?: string) => Promise<void>;
  leaveRoom: () => void;
  updateRoomSettings: (settings: Partial<RoomSettings>) => void;

  // Participant management
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  approveParticipant: (participantId: string) => void;
  kickParticipant: (participantId: string) => void;
  toggleParticipantAudio: (participantId: string) => void;
  toggleParticipantVideo: (participantId: string) => void;

  // Media controls
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  switchCamera: (deviceId: string) => Promise<void>;
  switchMicrophone: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<void>;

  // Chat
  sendMessage: (content: string, type?: 'text' | 'private', targetId?: string) => void;
  markMessagesRead: () => void;
  toggleChatPanel: () => void;

  // UI controls
  toggleParticipantsPanel: () => void;
  setGridLayout: (layout: 'gallery' | 'speaker' | 'sidebar') => void;
  pinParticipant: (participantId: string | null) => void;
  selectParticipant: (participantId: string | null) => void;

  // Connection management
  updateConnectionState: (updates: Partial<ConnectionState>) => void;
  handleError: (error: string) => void;
  clearError: () => void;
}

// Create the store
export const useRoomStore = create<RoomState & RoomActions>()(
  devtools(
    (set, get) => ({
      // Initial state
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

      // Actions
      initializeRoom: async (roomId: string, username: string, token: string) => {
        const state = get();
        
        // Clean up existing connections
        if (state.wsClient) {
          state.wsClient.disconnect();
        }

        // Create client info
        const clientInfo: ClientInfo = {
          clientId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          displayName: username,
        };

        // Create new WebSocket client with CORRECT endpoint
        const wsClient = new WebSocketClient({
          url: `ws://localhost:8080/ws/zoom/${roomId}`, // ✅ Fixed: was /ws/room/ 
          token,
          autoReconnect: true,
          reconnectInterval: 3000,
          maxReconnectAttempts: 5,
        });

        // Set up ALL backend event handlers
        
        // Chat events
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

        // CRITICAL: Add room_state handler (was missing)
        wsClient.on('room_state', (message) => {
          const payload = message.payload as any; // RoomStatePayload from backend
          
          // Update participants from backend
          const participantsMap = new Map<string, Participant>();
          
          // Add hosts
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

          // Add participants  
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

          // Update waiting room
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

        // Waiting room events
        wsClient.on('accept_waiting', (message) => {
          set({ isWaitingRoom: false, isJoined: true });
        });

        wsClient.on('deny_waiting', (message) => {
          get().handleError('Access to room denied');
        });

        // Hand raising events
        wsClient.on('raise_hand', (message) => {
          const payload = message.payload as any;
          // Add to speaking participants or update UI
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

        // WebRTC signaling events
        wsClient.on('offer', (message) => {
          if (get().webrtcManager) {
            // Handle WebRTC offer - will be implemented in WebRTCManager
            console.log('Received WebRTC offer:', message);
          }
        });

        wsClient.on('answer', (message) => {
          if (get().webrtcManager) {
            // Handle WebRTC answer - will be implemented in WebRTCManager
            console.log('Received WebRTC answer:', message);
          }
        });

        wsClient.on('candidate', (message) => {
          if (get().webrtcManager) {
            // Handle ICE candidate - will be implemented in WebRTCManager
            console.log('Received ICE candidate:', message);
          }
        });

        // Connection state handlers
        wsClient.onConnectionChange?.((connectionState: string) => {
          set((state) => ({
            connectionState: {
              ...state.connectionState,
              wsConnected: connectionState === 'connected',
              wsReconnecting: connectionState === 'reconnecting',
            }
          }));
        });

        // Connect WebSocket
        await wsClient.connect();

        // Create WebRTC manager
        const webrtcManager = new WebRTCManager(clientInfo, wsClient);

        // Update connection state
        set((state) => ({
          connectionState: { ...state.connectionState, wsConnected: true }
        }));

        // Get available devices
        await get().refreshDevices();

        set({
          roomId,
          currentUsername: username,
          wsClient,
          webrtcManager,
          clientInfo,
        });
      },

      joinRoom: async (approvalToken?: string) => {
        const { wsClient, clientInfo } = get();
        if (!wsClient || !clientInfo) return;

        try {
          // Use existing WebSocket methods
          wsClient.requestWaiting(clientInfo);
          set({ isJoined: true, isWaitingRoom: false });
        } catch (error) {
          get().handleError(`Failed to join room: ${error}`);
        }
      },

      leaveRoom: () => {
        const { wsClient, webrtcManager, localStream, screenShareStream } = get();
        
        // Stop media streams
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        if (screenShareStream) {
          screenShareStream.getTracks().forEach(track => track.stop());
        }

        // Cleanup WebRTC
        if (webrtcManager) {
          webrtcManager.cleanup();
        }

        // Disconnect client
        if (wsClient) {
          wsClient.disconnect();
        }

        // Reset state
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

      updateRoomSettings: (settings: Partial<RoomSettings>) => {
        // For now, just update local state
        set((state) => ({
          roomSettings: { ...state.roomSettings, ...settings } as RoomSettings
        }));
      },

      addParticipant: (participant: Participant) => {
        set((state) => {
          const newParticipants = new Map(state.participants);
          newParticipants.set(participant.id, participant);
          return { participants: newParticipants };
        });
      },

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

      updateParticipant: (participantId: string, updates: Partial<Participant>) => {
        set((state) => {
          const newParticipants = new Map(state.participants);
          const existing = newParticipants.get(participantId);
          if (existing) {
            newParticipants.set(participantId, { ...existing, ...updates });
          }
          return { participants: newParticipants };
        });
      },

      approveParticipant: (participantId: string) => {
        // For now, just remove from pending
        set((state) => ({
          pendingParticipants: state.pendingParticipants.filter(p => p.id !== participantId)
        }));
      },

      kickParticipant: (participantId: string) => {
        // Remove participant
        get().removeParticipant(participantId);
      },

      toggleParticipantAudio: (participantId: string) => {
        // Update participant state
        const participant = get().participants.get(participantId);
        if (participant) {
          get().updateParticipant(participantId, {
            isAudioEnabled: !participant.isAudioEnabled
          });
        }
      },

      toggleParticipantVideo: (participantId: string) => {
        // Update participant state
        const participant = get().participants.get(participantId);
        if (participant) {
          get().updateParticipant(participantId, {
            isVideoEnabled: !participant.isVideoEnabled
          });
        }
      },

      toggleAudio: async () => {
        const { localStream, isAudioEnabled } = get();
        
        if (localStream) {
          const audioTracks = localStream.getAudioTracks();
          audioTracks.forEach(track => {
            track.enabled = !isAudioEnabled;
          });
          
          set({ isAudioEnabled: !isAudioEnabled });
        }
      },

      toggleVideo: async () => {
        const { localStream, isVideoEnabled } = get();
        
        if (localStream) {
          const videoTracks = localStream.getVideoTracks();
          videoTracks.forEach(track => {
            track.enabled = !isVideoEnabled;
          });
          
          set({ isVideoEnabled: !isVideoEnabled });
        }
      },

      startScreenShare: async () => {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });

          // Set up screen share end detection
          screenStream.getVideoTracks()[0].onended = () => {
            get().stopScreenShare();
          };

          set({ 
            screenShareStream: screenStream,
            isScreenSharing: true 
          });
        } catch (error) {
          get().handleError(`Failed to start screen share: ${error}`);
        }
      },

      stopScreenShare: async () => {
        const { screenShareStream } = get();
        
        if (screenShareStream) {
          screenShareStream.getTracks().forEach(track => track.stop());
        }

        set({ 
          screenShareStream: null,
          isScreenSharing: false 
        });
      },

      switchCamera: async (deviceId: string) => {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId } },
            audio: false,
          });

          // Replace video track in local stream
          const { localStream } = get();
          if (localStream) {
            const videoTrack = newStream.getVideoTracks()[0];
            const oldVideoTrack = localStream.getVideoTracks()[0];
            
            if (oldVideoTrack) {
              localStream.removeTrack(oldVideoTrack);
              oldVideoTrack.stop();
            }
            
            if (videoTrack) {
              localStream.addTrack(videoTrack);
            }
          }
          
          set((state) => ({
            selectedDevices: { ...state.selectedDevices, camera: deviceId }
          }));
        } catch (error) {
          get().handleError(`Failed to switch camera: ${error}`);
        }
      },

      switchMicrophone: async (deviceId: string) => {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: { deviceId: { exact: deviceId } },
          });

          // Replace audio track in local stream
          const { localStream } = get();
          if (localStream) {
            const audioTrack = newStream.getAudioTracks()[0];
            const oldAudioTrack = localStream.getAudioTracks()[0];
            
            if (oldAudioTrack) {
              localStream.removeTrack(oldAudioTrack);
              oldAudioTrack.stop();
            }
            
            if (audioTrack) {
              localStream.addTrack(audioTrack);
            }
          }
          
          set((state) => ({
            selectedDevices: { ...state.selectedDevices, microphone: deviceId }
          }));
        } catch (error) {
          get().handleError(`Failed to switch microphone: ${error}`);
        }
      },

      refreshDevices: async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          
          const cameras = devices.filter(device => device.kind === 'videoinput');
          const microphones = devices.filter(device => device.kind === 'audioinput');
          const speakers = devices.filter(device => device.kind === 'audiooutput');

          set({
            availableDevices: { cameras, microphones, speakers }
          });
        } catch (error) {
          get().handleError(`Failed to refresh devices: ${error}`);
        }
      },

      sendMessage: (content: string, type: 'text' | 'private' = 'text', targetId?: string) => {
        const { wsClient, clientInfo } = get();
        if (!wsClient || !clientInfo) return;

        // Use existing sendChat method
        wsClient.sendChat(content, clientInfo);
      },

      markMessagesRead: () => {
        set({ unreadCount: 0 });
      },

      toggleChatPanel: () => {
        set((state) => {
          const newOpen = !state.isChatPanelOpen;
          return {
            isChatPanelOpen: newOpen,
            unreadCount: newOpen ? 0 : state.unreadCount,
          };
        });
      },

      toggleParticipantsPanel: () => {
        set((state) => ({ isParticipantsPanelOpen: !state.isParticipantsPanelOpen }));
      },

      setGridLayout: (layout: 'gallery' | 'speaker' | 'sidebar') => {
        set({ gridLayout: layout });
      },

      pinParticipant: (participantId: string | null) => {
        set({
          pinnedParticipantId: participantId,
          isPinned: participantId !== null,
        });
      },

      selectParticipant: (participantId: string | null) => {
        set({ selectedParticipantId: participantId });
      },

      updateConnectionState: (updates: Partial<ConnectionState>) => {
        set((state) => ({
          connectionState: { ...state.connectionState, ...updates }
        }));
      },

      handleError: (error: string) => {
        console.error('Room error:', error);
        set((state) => ({
          connectionState: { ...state.connectionState, lastError: error }
        }));
      },

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
