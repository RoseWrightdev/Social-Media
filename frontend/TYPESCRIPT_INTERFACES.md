# TypeScript Interface Documentation

## Overview

This document defines all TypeScript interfaces and types used throughout the video conferencing application, ensuring type safety between hooks and Shadcn UI components.

## Core Domain Types

### Connection Management Types

Advanced connection state and configuration types for sophisticated connection handling.

```typescript
/**
 * Detailed connection state for room connections
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
  
  /** Connection quality indicator based on latency and stability */
  quality?: 'excellent' | 'good' | 'poor' | 'bad';
  
  /** Round-trip time for connection health monitoring */
  latency?: number;
}

/**
 * Configuration options for connection behavior
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

/**
 * Return type for useRoomConnection hook
 */
interface UseRoomConnectionReturn {
  // Connection State
  connectionState: ConnectionState;
  isConnected: boolean;
  isReconnecting: boolean;
  quality: ConnectionState['quality'];
  
  // Connection Actions
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  retry: () => Promise<void>;
  reconnect: () => Promise<void>;
  
  // Monitoring Data
  latency?: number;
  retryCount: number;
  lastError?: string;
}

/**
 * Device capabilities and information
 */
interface DeviceCapabilities {
  // Basic device availability
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasSpeaker: boolean;
  
  // Browser API support
  supportsScreenShare: boolean;
  supportsDeviceSelection: boolean;
  supportsAudioOutput: boolean;
  
  // WebRTC capabilities
  supportsWebRTC: boolean;
  supportsDataChannels: boolean;
  
  // Media constraints support
  supportsConstraints: boolean;
}

/**
 * Enhanced device information with metadata
 */
interface DeviceInfo {
  // Device counts for UI display
  cameraCount: number;
  microphoneCount: number;
  speakerCount: number;
  
  // Default device detection
  hasDefaultCamera: boolean;
  hasDefaultMicrophone: boolean;
  hasDefaultSpeaker: boolean;
  
  // Device labeling status (permissions)
  devicesLabeled: boolean;
}

/**
 * Available media devices categorized by type
 */
interface AvailableDevices {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
}
```

### Media Stream Management Types

Advanced media stream state and configuration types for sophisticated media handling.

```typescript
/**
 * Local state interface for media stream management
 */
interface MediaStreamState {
  /** Whether media stream has been successfully created */
  isInitialized: boolean;
  
  /** Whether stream initialization is in progress */
  isStarting: boolean;
  
  /** Current error message, if any */
  error: string | null;
}

/**
 * Configuration options for media stream initialization
 */
interface MediaStreamOptions {
  /** Whether to automatically initialize stream on mount */
  autoStart?: boolean;
  
  /** Video settings - false to disable, true for default, or custom constraints */
  video?: boolean | MediaTrackConstraints;
  
  /** Audio settings - false to disable, true for default, or custom constraints */
  audio?: boolean | MediaTrackConstraints;
}

/**
 * Return type for useMediaStream hook - Comprehensive media management
 */
interface UseMediaStreamReturn {
  // =================== GLOBAL STATE FROM ROOM STORE ===================
  /** Global local stream from room store */
  localStream: MediaStream | null;
  
  /** Global audio enabled state */
  isAudioEnabled: boolean;
  
  /** Global video enabled state */
  isVideoEnabled: boolean;
  
  /** Global screen sharing state */
  isScreenSharing: boolean;
  
  /** Available media devices */
  availableDevices: AvailableDevices;
  
  /** Currently selected devices */
  selectedDevices: {
    camera?: string;
    microphone?: string;
    speaker?: string;
  };

  // =================== LOCAL STATE ===================
  /** Whether local stream is initialized */
  isInitialized: boolean;
  
  /** Whether initialization is in progress */
  isStarting: boolean;
  
  /** Local error state */
  error: string | null;
  
  /** Whether camera is active in local stream */
  isCameraActive: boolean;
  
  /** Whether microphone is active in local stream */
  isMicrophoneActive: boolean;

  // =================== GLOBAL ACTIONS FROM ROOM STORE ===================
  /** Toggle global audio state */
  toggleAudio: () => void;
  
  /** Toggle global video state */
  toggleVideo: () => void;
  
  /** Start screen sharing */
  startScreenShare: () => Promise<void>;
  
  /** Stop screen sharing */
  stopScreenShare: () => void;
  
  /** Switch to different camera */
  switchCamera: (deviceId: string) => Promise<void>;
  
  /** Switch to different microphone */
  switchMicrophone: (deviceId: string) => Promise<void>;
  
  /** Refresh available device list */
  refreshDevices: () => Promise<void>;

  // =================== LOCAL ACTIONS ===================
  /** Initialize local media stream */
  initializeStream: () => Promise<MediaStream | undefined>;
  
  /** Clean up local stream and state */
  cleanup: () => void;
  
  /** Restart stream with new options */
  restartStream: (newOptions?: MediaStreamOptions) => Promise<MediaStream | undefined>;
  
  /** Request media permissions */
  requestPermissions: () => Promise<boolean>;
  
  /** Get detailed stream statistics */
  getStreamStats: () => MediaStreamStats | null;
}

/**
 * Detailed stream statistics and information
 */
interface MediaStreamStats {
  /** Stream identifier */
  streamId: string;
  
  /** Whether stream is active */
  active: boolean;
  
  /** Video track information */
  video: {
    count: number;
    enabled: boolean;
    settings?: MediaTrackSettings;
    constraints?: MediaTrackConstraints;
    label?: string;
  };
  
  /** Audio track information */
  audio: {
    count: number;
    enabled: boolean;
    settings?: MediaTrackSettings;
    constraints?: MediaTrackConstraints;
    label?: string;
  };
}
```

### Participant Interface

The fundamental participant type used across all components and hooks.

```typescript
/**
 * Represents a participant in the video conference
 */
interface Participant {
  /** Unique identifier for the participant */
  id: string;
  
  /** Display name in the conference */
  name: string;
  
  /** Optional avatar image URL */
  avatarUrl?: string;
  
  /** Whether participant's microphone is enabled */
  isAudioEnabled: boolean;
  
  /** Whether participant's camera is enabled */
  isVideoEnabled: boolean;
  
  /** Whether participant is currently speaking */
  isSpeaking: boolean;
  
  /** Whether participant has host privileges */
  isHost: boolean;
  
  /** Real-time connection status */
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  
  /** When the participant joined the room */
  joinedAt: Date;
  
  /** Optional MediaStream for video/audio */
  stream?: MediaStream;
}
```

### Room State Interface

Comprehensive room state used by the `useRoom` hook.

```typescript
/**
 * Complete room state interface
 */
interface RoomState {
  /** Current room identifier */
  roomId: string | null;
  
  /** Human-readable room name */
  roomName: string | null;
  
  /** Whether user has successfully joined */
  isJoined: boolean;
  
  /** Whether user has host privileges */
  isHost: boolean;
  
  /** User's display name in the room */
  currentUsername: string | null;
  
  /** Whether user is in waiting room */
  isWaitingRoom: boolean;
  
  /** Real-time connection status */
  connectionState: ConnectionState;
  
  /** Current error message if any */
  error: string | null;
}

/**
 * WebSocket and connection state details
 */
interface ConnectionState {
  /** Whether WebSocket is connected */
  wsConnected: boolean;
  
  /** Whether WebSocket is attempting to connect */
  wsConnecting: boolean;
  
  /** Whether WebSocket is attempting to reconnect */
  wsReconnecting: boolean;
  
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  
  /** Last successful connection timestamp */
  lastConnected: Date | null;
}
```

### Media State Interface

Media device and stream state used by `useMediaControls` hook.

```typescript
/**
 * Media devices and stream state
 */
interface MediaState {
  /** User's local media stream */
  localStream: MediaStream | null;
  
  /** Screen sharing stream */
  screenShareStream: MediaStream | null;
  
  /** Whether audio is enabled */
  isAudioEnabled: boolean;
  
  /** Whether video is enabled */
  isVideoEnabled: boolean;
  
  /** Whether screen sharing is active */
  isScreenSharing: boolean;
  
  /** Available media devices */
  availableDevices: AvailableDevices;
  
  /** Currently selected device IDs */
  selectedDevices: SelectedDevices;
}

/**
 * Available media devices categorized by type
 */
interface AvailableDevices {
  /** Available camera devices */
  cameras: MediaDevice[];
  
  /** Available microphone devices */
  microphones: MediaDevice[];
  
  /** Available speaker devices */
  speakers: MediaDevice[];
}

/**
 * Currently selected device IDs
 */
interface SelectedDevices {
  /** Selected camera device ID */
  camera: string | null;
  
  /** Selected microphone device ID */
  microphone: string | null;
  
  /** Selected speaker device ID */
  speaker: string | null;
}

/**
 * Media device information
 */
interface MediaDevice {
  /** Unique device identifier */
  deviceId: string;
  
  /** Human-readable device label */
  label: string;
  
  /** Device type */
  kind: 'videoinput' | 'audioinput' | 'audiooutput';
  
  /** Whether device is currently available */
  isAvailable: boolean;
}
```

### Chat Interface

Chat message and state types used by `useChat` hook.

```typescript
/**
 * Chat message interface
 */
interface ChatMessage {
  /** Unique message identifier */
  id: string;
  
  /** Message content */
  content: string;
  
  /** Message type */
  type: 'text' | 'private' | 'system' | 'emoji';
  
  /** Sender participant ID */
  senderId: string;
  
  /** Sender display name */
  senderName: string;
  
  /** Target participant ID for private messages */
  targetId?: string;
  
  /** When message was sent */
  timestamp: Date;
  
  /** Whether message has been read */
  isRead: boolean;
  
  /** Whether this is a system message */
  isSystem: boolean;
}

/**
 * Chat state interface
 */
interface ChatState {
  /** All chat messages */
  messages: ChatMessage[];
  
  /** Number of unread messages */
  unreadCount: number;
  
  /** Whether chat panel is open */
  isChatPanelOpen: boolean;
  
  /** Whether user is currently typing */
  isTyping: boolean;
  
  /** Other participants currently typing */
  typingParticipants: Set<string>;
}
```

### UI Layout Interface

UI layout and view state used by `useRoomUI` hook.

```typescript
/**
 * UI layout and view state
 */
interface UIState {
  /** Whether participants panel is open */
  isParticipantsPanelOpen: boolean;
  
  /** Current grid layout mode */
  gridLayout: GridLayoutMode;
  
  /** Whether a participant is pinned */
  isPinned: boolean;
  
  /** ID of pinned participant */
  pinnedParticipantId: string | null;
  
  /** ID of currently selected participant */
  selectedParticipantId: string | null;
  
  /** Panel sizes for resizable layout */
  panelSizes: PanelSizes;
  
  /** UI theme preferences */
  theme: ThemeMode;
}

/**
 * Grid layout modes for video display
 */
type GridLayoutMode = 'gallery' | 'speaker' | 'sidebar' | 'focus';

/**
 * Panel size configuration for resizable layout
 */
interface PanelSizes {
  /** Main video panel size percentage */
  videoPanel: number;
  
  /** Sidebar panel size percentage */
  sidebarPanel: number;
  
  /** Chat panel height when in horizontal mode */
  chatPanel?: number;
}

/**
 * Theme mode options
 */
type ThemeMode = 'light' | 'dark' | 'system';
```

## Hook Return Types

### useRoom Hook Return Type

```typescript
/**
 * Return type for useRoom hook
 */
interface UseRoomReturn {
  // =================== STATE ===================
  /** Current room identifier */
  roomId: string | null;
  
  /** Human-readable room name */
  roomName: string | null;
  
  /** Whether user has joined the room */
  isJoined: boolean;
  
  /** Whether user has host privileges */
  isHost: boolean;
  
  /** User's display name */
  currentUsername: string | null;
  
  /** Whether user is awaiting approval */
  isWaitingRoom: boolean;
  
  /** Whether room is fully operational */
  isRoomReady: boolean;
  
  /** Whether there are connection problems */
  hasConnectionIssues: boolean;
  
  /** Detailed connection status */
  connectionState: ConnectionState;
  
  // =================== ACTIONS ===================
  /** Join room with authentication */
  joinRoomWithAuth: (
    roomId: string,
    username: string,
    token: string,
    approvalToken?: string
  ) => Promise<void>;
  
  /** Leave room cleanly */
  exitRoom: () => void;
  
  /** Modify room configuration (host only) */
  updateRoomSettings: (settings: RoomSettings) => Promise<void>;
  
  /** Clear error messages */
  clearError: () => void;
}

/**
 * Room configuration settings
 */
interface RoomSettings {
  /** Room display name */
  name?: string;
  
  /** Whether room requires approval to join */
  requiresApproval?: boolean;
  
  /** Whether room is locked to new participants */
  isLocked?: boolean;
  
  /** Maximum number of participants */
  maxParticipants?: number;
  
  /** Whether recording is enabled */
  isRecording?: boolean;
}
```

### useRoomConnection Hook Return Type

```typescript
/**
 * Return type for useRoomConnection hook - Advanced connection management
 */
interface UseRoomConnectionReturn {
  // =================== CONNECTION STATE ===================
  /** Detailed connection state with retry info and quality metrics */
  connectionState: ConnectionState;
  
  /** Simple boolean indicating if currently connected */
  isConnected: boolean;
  
  /** Whether currently in reconnecting state */
  isReconnecting: boolean;
  
  /** Connection quality rating based on latency and stability */
  quality: ConnectionState['quality'];
  
  // =================== CONNECTION ACTIONS ===================
  /** Connect to room with authentication and timeout handling */
  connect: () => Promise<boolean>;
  
  /** Cleanly disconnect from room and cleanup resources */
  disconnect: () => Promise<void>;
  
  /** Retry connection with exponential backoff */
  retry: () => Promise<void>;
  
  /** Force reconnection by disconnecting then connecting */
  reconnect: () => Promise<void>;
  
  // =================== MONITORING DATA ===================
  /** Current connection latency in milliseconds */
  latency?: number;
  
  /** Number of retry attempts made */
  retryCount: number;
  
  /** Last connection error message */
  lastError?: string;
}
```

### useRoomUI Hook Return Type

```typescript
/**
 * Return type for useRoomUI hook - UI state management
 */
interface UseRoomUIReturn {
  // =================== LAYOUT STATE ===================
  /** Current grid layout configuration */
  gridLayout: 'grid' | 'speaker' | 'gallery';
  
  /** Whether chat panel is visible */
  isChatPanelOpen: boolean;
  
  /** Whether participants panel is visible */
  isParticipantsPanelOpen: boolean;
  
  /** ID of currently pinned participant */
  pinnedParticipantId: string | null;
  
  /** ID of currently selected participant */
  selectedParticipantId: string | null;
  
  // =================== LAYOUT ACTIONS ===================
  /** Change grid layout mode */
  setGridLayout: (layout: 'grid' | 'speaker' | 'gallery') => void;
  
  /** Toggle chat panel visibility */
  toggleChatPanel: () => void;
  
  /** Toggle participants panel visibility */
  toggleParticipantsPanel: () => void;
  
  /** Pin participant for focused view */
  pinParticipant: (participantId: string | null) => void;
  
  /** Unpin currently pinned participant */
  unpinParticipant: () => void;
  
  /** Select participant for actions */
  selectParticipant: (participantId: string | null) => void;
  
  // =================== LOCAL UI STATE ===================
  /** Device selection menu visibility */
  isDeviceMenuOpen: boolean;
  
  /** Control device menu visibility */
  setIsDeviceMenuOpen: (open: boolean) => void;
  
  /** Settings modal visibility */
  isSettingsOpen: boolean;
  
  /** Control settings modal visibility */
  setIsSettingsOpen: (open: boolean) => void;
}
```

### useDeviceCapabilities Hook Return Type

```typescript
/**
 * Return type for useDeviceCapabilities hook - Device management
 */
interface UseDeviceCapabilitiesReturn {
  // =================== DEVICE DATA ===================
  /** All available media devices categorized by type */
  availableDevices: AvailableDevices;
  
  /** Enhanced device information with metadata */
  deviceInfo: DeviceInfo;
  
  /** Browser and device capabilities */
  capabilities: DeviceCapabilities;
  
  // =================== DEVICE ACTIONS ===================
  /** Refresh device enumeration */
  refreshDevices: () => Promise<void>;
  
  /** Switch to different camera */
  switchCamera: (deviceId: string) => Promise<void>;
  
  /** Switch to different microphone */
  switchMicrophone: (deviceId: string) => Promise<void>;
}
```

### useParticipants Hook Return Type

```typescript
/**
 * Return type for useParticipants hook
 */
interface UseParticipantsReturn {
  // =================== DATA ===================
  /** All participants as array */
  participants: Participant[];
  
  /** Current user's participant data */
  localParticipant: Participant | null;
  
  /** Currently speaking participants */
  speakingParticipants: Participant[];
  
  /** Participants awaiting approval */
  pendingParticipants: Participant[];
  
  /** Currently selected participant */
  selectedParticipant: Participant | null;
  
  /** Currently pinned participant */
  pinnedParticipant: Participant | null;
  
  /** Total participant count */
  participantCount: number;
  
  // =================== UTILITIES ===================
  /** Get participant by ID */
  getParticipant: (id: string) => Participant | undefined;
  
  /** Check if participant is speaking */
  isParticipantSpeaking: (id: string) => boolean;
  
  /** Select participant for actions */
  selectParticipant: (id: string | null) => void;
  
  /** Pin/unpin participant */
  pinParticipant: (id: string | null) => void;
  
  // =================== HOST ACTIONS ===================
  /** Approve participants from waiting room (host only) */
  approveParticipant?: (id: string) => Promise<void>;
  
  /** Remove participants from room (host only) */
  kickParticipant?: (id: string) => Promise<void>;
  
  /** Control participant audio (host only) */
  toggleParticipantAudio?: (id: string) => Promise<void>;
  
  /** Control participant video (host only) */
  toggleParticipantVideo?: (id: string) => Promise<void>;
}
```

### useMediaControls Hook Return Type

```typescript
/**
 * Return type for useMediaControls hook
 */
interface UseMediaControlsReturn {
  // =================== STATE ===================
  /** Current local media stream */
  localStream: MediaStream | null;
  
  /** Current screen share stream */
  screenShareStream: MediaStream | null;
  
  /** Audio enabled state */
  isAudioEnabled: boolean;
  
  /** Video enabled state */
  isVideoEnabled: boolean;
  
  /** Screen sharing state */
  isScreenSharing: boolean;
  
  /** All available devices */
  availableDevices: AvailableDevices;
  
  /** Currently selected devices */
  selectedDevices: SelectedDevices;
  
  /** Device capability flags */
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasSpeaker: boolean;
  
  // =================== ACTIONS ===================
  /** Toggle microphone */
  toggleAudio: () => Promise<void>;
  
  /** Toggle camera */
  toggleVideo: () => Promise<void>;
  
  /** Toggle screen sharing */
  toggleScreenShare: () => Promise<void>;
  
  /** Switch camera device */
  switchCamera: (deviceId: string) => Promise<void>;
  
  /** Switch microphone device */
  switchMicrophone: (deviceId: string) => Promise<void>;
  
  /** Refresh device list */
  refreshDevices: () => Promise<void>;
}
```

### useChat Hook Return Type

```typescript
/**
 * Return type for useChat hook
 */
interface UseChatReturn {
  // =================== STATE ===================
  /** All chat messages */
  messages: ChatMessage[];
  
  /** Number of unread messages */
  unreadCount: number;
  
  /** Whether chat panel is open */
  isChatPanelOpen: boolean;
  
  /** Whether there are unread messages */
  hasUnreadMessages: boolean;
  
  // =================== ACTIONS ===================
  /** Send a text message */
  sendTextMessage: (content: string) => Promise<void>;
  
  /** Send a private message */
  sendPrivateMessage: (content: string, targetId: string) => Promise<void>;
  
  /** Open chat panel and mark as read */
  openChat: () => void;
  
  /** Close chat panel */
  closeChat: () => void;
  
  /** Mark messages as read */
}
```

## Component Prop Types

### Common Component Props

```typescript
/**
 * Base props for all room components
 */
interface BaseRoomComponentProps {
  /** Optional CSS class name */
  className?: string;
  
  /** Optional inline styles */
  style?: React.CSSProperties;
  
  /** Optional test ID for testing */
  'data-testid'?: string;
}

/**
 * Props for participant-related components
 */
interface ParticipantComponentProps extends BaseRoomComponentProps {
  /** Participant data */
  participant: Participant;
  
  /** Whether this participant is the local user */
  isLocal?: boolean;
  
  /** Whether participant is currently speaking */
  isSpeaking?: boolean;
  
  /** Whether participant is selected */
  isSelected?: boolean;
  
  /** Callback when participant is selected */
  onSelect?: (participantId: string) => void;
  
  /** Callback when participant is double-clicked */
  onDoubleClick?: (participantId: string) => void;
}

/**
 * Props for media control components
 */
interface MediaControlProps extends BaseRoomComponentProps {
  /** Whether audio is enabled */
  isAudioEnabled?: boolean;
  
  /** Whether video is enabled */
  isVideoEnabled?: boolean;
  
  /** Whether screen sharing is active */
  isScreenSharing?: boolean;
  
  /** Callback to toggle audio */
  onToggleAudio?: () => void;
  
  /** Callback to toggle video */
  onToggleVideo?: () => void;
  
  /** Callback to toggle screen share */
  onToggleScreenShare?: () => void;
  
  /** Callback to end call */
  onEndCall?: () => void;
  
  /** Whether controls are disabled */
  disabled?: boolean;
}
```

## Event Handler Types

```typescript
/**
 * Event handler type definitions
 */
type RoomEventHandlers = {
  /** Called when participant joins */
  onParticipantJoined: (participant: Participant) => void;
  
  /** Called when participant leaves */
  onParticipantLeft: (participantId: string) => void;
  
  /** Called when participant starts speaking */
  onParticipantStartedSpeaking: (participantId: string) => void;
  
  /** Called when participant stops speaking */
  onParticipantStoppedSpeaking: (participantId: string) => void;
  
  /** Called when new chat message arrives */
  onMessageReceived: (message: ChatMessage) => void;
  
  /** Called when connection state changes */
  onConnectionStateChanged: (state: ConnectionState) => void;
  
  /** Called when error occurs */
  onError: (error: string) => void;
};

/**
 * Media event handler types
 */
type MediaEventHandlers = {
  /** Called when local stream changes */
  onLocalStreamChanged: (stream: MediaStream | null) => void;
  
  /** Called when screen share starts */
  onScreenShareStarted: (stream: MediaStream) => void;
  
  /** Called when screen share stops */
  onScreenShareStopped: () => void;
  
  /** Called when device list changes */
  onDevicesChanged: (devices: AvailableDevices) => void;
  
  /** Called when media error occurs */
  onMediaError: (error: string) => void;
};
```

## Utility Types

```typescript
/**
 * Utility types for common patterns
 */

/** Make all properties optional */
type PartialParticipant = Partial<Participant>;

/** Pick specific properties from Participant */
type ParticipantSummary = Pick<Participant, 'id' | 'name' | 'isHost' | 'isSpeaking'>;

/** Omit sensitive properties for public APIs */
type PublicParticipant = Omit<Participant, 'stream'>;

/** Union type for all possible message types */
type MessageType = ChatMessage['type'];

/** Union type for all possible connection states */
type ConnectionStatus = ConnectionState['wsConnected'] extends true 
  ? 'connected' 
  : 'disconnected';

/** Function type for async actions */
type AsyncAction<T = void> = () => Promise<T>;

/** Function type for sync actions */
type SyncAction<T = void> = () => T;

/** Generic callback type */
type Callback<T = void> = (value: T) => void;

/** Generic event handler type */
type EventHandler<T = Event> = (event: T) => void;
```

This comprehensive type system ensures type safety across all hook-component integrations while providing clear contracts for data flow and event handling throughout the application.
