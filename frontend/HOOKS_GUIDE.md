# Advanced Hooks Guide

## Overview

This guide provides detailed documentation for the sophisticated custom hooks used in the video conferencing application. These hooks manage complex business logic including connection management, device handling, and UI state orchestration.

**Hook Philosophy:**

- **Single Responsibility** - Each hook has a focused purpose
- **Composable Design** - Hooks can be combined for complex functionality  
- **Error Resilience** - Built-in error handling and recovery mechanisms
- **Production Ready** - Optimized for real-world conferencing scenarios

## useRoomConnection Hook

### Purpose

The `useRoomConnection` hook provides sophisticated WebSocket and WebRTC connection management with intelligent reconnection, health monitoring, and quality assessment. This is the most advanced hook in the application, designed to handle challenging network conditions gracefully.

### Key Features

- **Automatic Connection Management** - Handles establishment and teardown
- **Intelligent Reconnection** - Exponential backoff with circuit breaker pattern
- **Connection Health Monitoring** - Real-time quality assessment and heartbeat
- **Error Recovery** - Comprehensive error handling and recovery mechanisms
- **Configurable Behavior** - Extensive options for customization

### Basic Usage

```typescript
import { useRoomConnection } from "@/hooks/useRoomConnection";

function RoomComponent() {
  const {
    connectionState,
    isConnected,
    isReconnecting,
    connect,
    disconnect,
    reconnect
  } = useRoomConnection();

  // Connect when component mounts
  useEffect(() => {
    connect();
  }, [connect]);

  if (!isConnected) {
    return <div>Connecting to room...</div>;
  }

  return <div>Connected! Room is ready.</div>;
}
```

### Advanced Configuration

```typescript
import { useRoomConnection } from "@/hooks/useRoomConnection";

function RoomComponent() {
  const connection = useRoomConnection({
    maxRetries: 10,              // Increase retry attempts
    retryDelay: 5000,            // Longer delay between retries
    heartbeatInterval: 15000,    // More frequent health checks
    autoReconnect: true,         // Enable automatic reconnection
    connectionTimeout: 20000     // Longer connection timeout
  });

  const { 
    connectionState, 
    quality, 
    latency, 
    retryCount,
    lastError 
  } = connection;

  // Monitor connection quality
  useEffect(() => {
    if (quality === 'poor' || quality === 'bad') {
      console.warn('Connection quality degraded:', quality);
      // Could trigger UI warning or adjust video quality
    }
  }, [quality]);

  return (
    <div>
      <div>Status: {connectionState.status}</div>
      <div>Quality: {quality}</div>
      <div>Latency: {latency}ms</div>
      {retryCount > 0 && <div>Retries: {retryCount}</div>}
      {lastError && <div>Error: {lastError}</div>}
    </div>
  );
}
```

### Connection State Management

The hook manages connection state through a comprehensive state machine:

```typescript
interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  retryCount: number;
  lastError?: string;
  lastAttempt?: number;
  quality?: 'excellent' | 'good' | 'poor' | 'bad';
  latency?: number;
}
```

#### State Transitions

- **disconnected** → **connecting** - Initial connection attempt
- **connecting** → **connected** - Successful connection
- **connecting** → **failed** - Connection attempt failed
- **connected** → **reconnecting** - Connection lost, attempting recovery
- **reconnecting** → **connected** - Successful reconnection
- **failed** → **reconnecting** - Retry attempt after failure
- **any** → **disconnected** - Manual disconnection

### Error Handling

The hook implements comprehensive error handling:

```typescript
function ConnectionMonitor() {
  const { connectionState, lastError, retry, reconnect } = useRoomConnection();

  const handleConnectionError = useCallback(() => {
    switch (connectionState.status) {
      case 'failed':
        if (connectionState.retryCount < 3) {
          // Automatic retry for first few failures
          retry();
        } else {
          // Manual intervention required
          console.error('Multiple connection failures:', lastError);
          // Show user error message with manual retry option
        }
        break;
      
      case 'reconnecting':
        // Show reconnecting indicator
        console.log('Attempting to reconnect...');
        break;
        
      default:
        break;
    }
  }, [connectionState, lastError, retry]);

  useEffect(() => {
    handleConnectionError();
  }, [handleConnectionError]);

  return (
    <div>
      {connectionState.status === 'failed' && (
        <div>
          <p>Connection failed: {lastError}</p>
          <button onClick={reconnect}>Try Again</button>
        </div>
      )}
    </div>
  );
}
```

### Quality Monitoring

Connection quality is continuously monitored and reported:

```typescript
function ConnectionQualityIndicator() {
  const { quality, latency, connectionState } = useRoomConnection();

  const getQualityColor = () => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'poor': return 'text-yellow-600';
      case 'bad': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getQualityIcon = () => {
    switch (quality) {
      case 'excellent': return <SignalIcon className="h-4 w-4 text-green-600" />;
      case 'good': return <SignalIcon className="h-4 w-4 text-blue-600" />;
      case 'poor': return <SignalSlashIcon className="h-4 w-4 text-yellow-600" />;
      case 'bad': return <SignalSlashIcon className="h-4 w-4 text-red-600" />;
      default: return <SignalIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {getQualityIcon()}
      <span className={getQualityColor()}>
        {quality} ({latency}ms)
      </span>
      {connectionState.retryCount > 0 && (
        <span className="text-xs text-muted-foreground">
          ({connectionState.retryCount} retries)
        </span>
      )}
    </div>
  );
}
```

### Integration with Room Store

The hook integrates seamlessly with the global room store:

```typescript
function RoomConnectionProvider({ children }: { children: React.ReactNode }) {
  const { roomId, currentUsername } = useRoomStore();
  const { 
    isConnected, 
    connectionState, 
    connect, 
    disconnect 
  } = useRoomConnection({
    autoReconnect: true,
    maxRetries: 5
  });

  // Auto-connect when room details are available
  useEffect(() => {
    if (roomId && currentUsername && !isConnected) {
      connect();
    }
  }, [roomId, currentUsername, isConnected, connect]);

  // Provide connection state to child components
  return (
    <ConnectionContext.Provider value={{ isConnected, connectionState }}>
      {children}
    </ConnectionContext.Provider>
  );
}
```

### Performance Optimization

The hook is optimized for performance with proper memoization:

```typescript
// All callbacks are memoized to prevent unnecessary re-renders
const connect = useCallback(async () => {
  // Connection logic
}, [roomId, currentUsername, initializeRoom, joinRoom]);

const disconnect = useCallback(async () => {
  // Disconnection logic
}, [leaveRoom, clearAllTimers, updateConnectionState]);

// State updates are batched and optimized
const updateConnectionState = useCallback((updates: Partial<ConnectionState>) => {
  setConnectionState(prev => ({ ...prev, ...updates }));
}, []);
```

### Testing Strategies

Testing the connection hook requires simulating various network conditions:

```typescript
// Mock WebSocket failures
jest.mock('@/store/useRoomStore', () => ({
  useRoomStore: () => ({
    connectionState: { 
      wsConnected: false, 
      wsReconnecting: true,
      lastError: 'Network error' 
    },
    initializeRoom: jest.fn().mockRejectedValue(new Error('Connection failed')),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
  })
}));

describe('useRoomConnection', () => {
  it('should handle connection failures gracefully', async () => {
    const { result } = renderHook(() => useRoomConnection());
    
    await act(async () => {
      const connected = await result.current.connect();
      expect(connected).toBe(false);
    });
    
    expect(result.current.connectionState.status).toBe('failed');
    expect(result.current.isConnected).toBe(false);
  });

  it('should retry connection with exponential backoff', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useRoomConnection({ retryDelay: 1000 }));
    
    await act(async () => {
      await result.current.retry();
    });
    
    expect(result.current.connectionState.status).toBe('reconnecting');
    
    // Fast-forward time to trigger retry
    act(() => {
      jest.advanceTimersByTime(2000); // Exponential backoff: 1000 * 2^1
    });
    
    expect(result.current.connectionState.retryCount).toBe(1);
    jest.useRealTimers();
  });
});
```

## useMediaStream Hook

### Media Management Purpose

The `useMediaStream` hook provides comprehensive media stream management for video conferencing applications. It handles the complex lifecycle of camera and microphone access, device enumeration, stream initialization, and seamless integration with the room store for global media state management.

### Media Key Features

- **Automatic Device Enumeration** - Discovers and manages available cameras, microphones, and speakers
- **Permission Management** - Handles browser permission requests with user-friendly error handling
- **Stream Lifecycle Management** - Proper initialization, cleanup, and resource management
- **Device Switching** - Hot-swapping between different media devices
- **Integration with Room Store** - Seamless coordination with global media state
- **Real-time Device Monitoring** - Automatic detection of device plug/unplug events
- **Advanced Constraints** - Support for custom video and audio constraints
- **Error Recovery** - Comprehensive error handling and recovery mechanisms

### Media Basic Usage

```typescript
import { useMediaStream } from "@/hooks/useMediaStream";

function MediaComponent() {
  const {
    isInitialized,
    isStarting,
    error,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    initializeStream
  } = useMediaStream({
    autoStart: true,
    video: { width: 1280, height: 720 },
    audio: { echoCancellation: true }
  });

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (isStarting) {
    return <div>Starting camera...</div>;
  }

  if (!isInitialized) {
    return (
      <button onClick={initializeStream}>
        Start Camera
      </button>
    );
  }

  return (
    <div>
      <button onClick={toggleAudio}>
        {isAudioEnabled ? 'Mute' : 'Unmute'}
      </button>
      <button onClick={toggleVideo}>
        {isVideoEnabled ? 'Stop Camera' : 'Start Camera'}
      </button>
    </div>
  );
}
```

### Advanced Media Configuration

```typescript
import { useMediaStream } from "@/hooks/useMediaStream";

function AdvancedMediaComponent() {
  const media = useMediaStream({
    autoStart: false,                    // Manual initialization
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
      facingMode: { ideal: 'user' }      // Front-facing camera
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: { ideal: 48000 }
    }
  });

  const {
    // Stream state
    isInitialized,
    isStarting,
    error,
    isCameraActive,
    isMicrophoneActive,
    
    // Device management
    availableDevices,
    selectedDevices,
    switchCamera,
    switchMicrophone,
    refreshDevices,
    
    // Stream control
    initializeStream,
    cleanup,
    restartStream,
    requestPermissions,
    getStreamStats
  } = media;

  // Request permissions first for better UX
  const handleSetupMedia = async () => {
    try {
      const hasPermissions = await requestPermissions();
      if (hasPermissions) {
        await initializeStream();
        
        // Get stream information
        const stats = getStreamStats();
        console.log('Stream stats:', stats);
      }
    } catch (err) {
      console.error('Media setup failed:', err);
    }
  };

  // Handle device switching
  const handleCameraSwitch = async (deviceId: string) => {
    try {
      await switchCamera(deviceId);
      
      // Restart stream if already initialized to apply new device
      if (isInitialized) {
        await restartStream();
      }
    } catch (err) {
      console.error('Camera switch failed:', err);
    }
  };

  return (
    <div className="media-controls">
      {/* Permission Setup */}
      {!isInitialized && (
        <button 
          onClick={handleSetupMedia}
          disabled={isStarting}
        >
          {isStarting ? 'Setting up...' : 'Setup Camera & Microphone'}
        </button>
      )}

      {/* Device Selection */}
      {availableDevices.cameras.length > 0 && (
        <select 
          value={selectedDevices.camera || ''}
          onChange={(e) => handleCameraSwitch(e.target.value)}
        >
          <option value="">Select Camera</option>
          {availableDevices.cameras.map(camera => (
            <option key={camera.deviceId} value={camera.deviceId}>
              {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      )}

      {/* Stream Status */}
      {isInitialized && (
        <div className="stream-status">
          <div>Camera: {isCameraActive ? 'Active' : 'Inactive'}</div>
          <div>Microphone: {isMicrophoneActive ? 'Active' : 'Inactive'}</div>
        </div>
      )}

      {/* Device Refresh */}
      <button onClick={refreshDevices}>
        Refresh Devices
      </button>

      {/* Error Display */}
      {error && (
        <div className="error">
          Error: {error}
          <button onClick={handleSetupMedia}>Retry</button>
        </div>
      )}
    </div>
  );
}
```

### Media Stream State Management

The hook manages both local and global media state:

```typescript
// Local state (hook-specific)
interface MediaStreamState {
  isInitialized: boolean;    // Whether local stream is created
  isStarting: boolean;       // Whether initialization is in progress
  error: string | null;      // Local error state
}

// Global state (from room store)
interface GlobalMediaState {
  isAudioEnabled: boolean;   // Global audio toggle state
  isVideoEnabled: boolean;   // Global video toggle state
  isScreenSharing: boolean;  // Screen sharing state
  availableDevices: {        // Available devices
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  };
  selectedDevices: {         // Currently selected devices
    camera?: string;
    microphone?: string;
    speaker?: string;
  };
}
```

### Permission Management

The hook provides sophisticated permission handling:

```typescript
function PermissionAwareComponent() {
  const { 
    requestPermissions, 
    initializeStream, 
    error,
    isStarting 
  } = useMediaStream({ autoStart: false });

  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

  // Check permission status
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        if (cameraPermission.state === 'granted' && micPermission.state === 'granted') {
          setPermissionStatus('granted');
        } else if (cameraPermission.state === 'denied' || micPermission.state === 'denied') {
          setPermissionStatus('denied');
        } else {
          setPermissionStatus('prompt');
        }
      } catch (err) {
        setPermissionStatus('unknown');
      }
    };

    checkPermissions();
  }, []);

  const handleRequestAccess = async () => {
    try {
      const granted = await requestPermissions();
      if (granted) {
        setPermissionStatus('granted');
        await initializeStream();
      } else {
        setPermissionStatus('denied');
      }
    } catch (err) {
      console.error('Permission request failed:', err);
    }
  };

  return (
    <div>
      {permissionStatus === 'denied' && (
        <div className="permission-denied">
          <h3>Camera Access Denied</h3>
          <p>Please enable camera and microphone access in your browser settings.</p>
        </div>
      )}
      
      {permissionStatus === 'prompt' && (
        <div className="permission-prompt">
          <h3>Camera Access Required</h3>
          <p>This app needs access to your camera and microphone for video calls.</p>
          <button onClick={handleRequestAccess} disabled={isStarting}>
            {isStarting ? 'Requesting...' : 'Allow Access'}
          </button>
        </div>
      )}
      
      {permissionStatus === 'granted' && (
        <div className="permission-granted">
          <p>✅ Camera and microphone access granted</p>
        </div>
      )}
      
      {error && <div className="error">Error: {error}</div>}
    </div>
  );
}
```

### Device Management

Advanced device switching and management:

```typescript
function DeviceManager() {
  const {
    availableDevices,
    selectedDevices,
    switchCamera,
    switchMicrophone,
    refreshDevices,
    restartStream,
    isInitialized
  } = useMediaStream();

  // Monitor device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      console.log('Device change detected, refreshing...');
      refreshDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  const handleDeviceSwitch = async (type: 'camera' | 'microphone', deviceId: string) => {
    try {
      if (type === 'camera') {
        await switchCamera(deviceId);
      } else {
        await switchMicrophone(deviceId);
      }
      
      // Restart stream to apply new device
      if (isInitialized) {
        await restartStream();
      }
    } catch (err) {
      console.error(`Failed to switch ${type}:`, err);
    }
  };

  return (
    <div className="device-manager">
      <h3>Device Settings</h3>
      
      {/* Camera Selection */}
      <div className="device-group">
        <label>Camera:</label>
        <select
          value={selectedDevices.camera || ''}
          onChange={(e) => handleDeviceSwitch('camera', e.target.value)}
        >
          <option value="">Default Camera</option>
          {availableDevices.cameras.map(camera => (
            <option key={camera.deviceId} value={camera.deviceId}>
              {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </div>

      {/* Microphone Selection */}
      <div className="device-group">
        <label>Microphone:</label>
        <select
          value={selectedDevices.microphone || ''}
          onChange={(e) => handleDeviceSwitch('microphone', e.target.value)}
        >
          <option value="">Default Microphone</option>
          {availableDevices.microphones.map(mic => (
            <option key={mic.deviceId} value={mic.deviceId}>
              {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </div>

      <button onClick={refreshDevices}>
        Refresh Devices
      </button>
    </div>
  );
}
```

### Stream Statistics and Monitoring

Monitor stream quality and performance:

```typescript
function StreamMonitor() {
  const { getStreamStats, isInitialized } = useMediaStream();
  const [stats, setStats] = useState<any>(null);

  // Update stats periodically
  useEffect(() => {
    if (!isInitialized) return;

    const updateStats = () => {
      const currentStats = getStreamStats();
      setStats(currentStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, [isInitialized, getStreamStats]);

  if (!stats) {
    return <div>No stream statistics available</div>;
  }

  return (
    <div className="stream-monitor">
      <h3>Stream Statistics</h3>
      
      <div className="stat-group">
        <h4>Video Track</h4>
        <div>Count: {stats.video.count}</div>
        <div>Enabled: {stats.video.enabled ? 'Yes' : 'No'}</div>
        {stats.video.settings && (
          <div>
            <div>Resolution: {stats.video.settings.width}x{stats.video.settings.height}</div>
            <div>Frame Rate: {stats.video.settings.frameRate}fps</div>
            <div>Device: {stats.video.label}</div>
          </div>
        )}
      </div>

      <div className="stat-group">
        <h4>Audio Track</h4>
        <div>Count: {stats.audio.count}</div>
        <div>Enabled: {stats.audio.enabled ? 'Yes' : 'No'}</div>
        {stats.audio.settings && (
          <div>
            <div>Sample Rate: {stats.audio.settings.sampleRate}Hz</div>
            <div>Channels: {stats.audio.settings.channelCount}</div>
            <div>Device: {stats.audio.label}</div>
          </div>
        )}
      </div>

      <div className="stat-group">
        <h4>Stream Info</h4>
        <div>Stream ID: {stats.streamId}</div>
        <div>Active: {stats.active ? 'Yes' : 'No'}</div>
      </div>
    </div>
  );
}
```

### Integration with Video Elements

Connect streams to video elements for display:

```typescript
function VideoDisplay() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { localStream, isVideoEnabled, isInitialized } = useMediaStream({
    autoStart: true,
    video: { width: 640, height: 480 }
  });

  // Connect stream to video element
  useEffect(() => {
    if (videoRef.current && localStream && isVideoEnabled) {
      videoRef.current.srcObject = localStream;
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [localStream, isVideoEnabled]);

  return (
    <div className="video-display">
      {isInitialized && isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: 'auto' }}
        />
      ) : (
        <div className="no-video">
          {!isInitialized ? 'Camera not initialized' : 'Camera is off'}
        </div>
      )}
    </div>
  );
}
```

### Error Handling and Recovery

Comprehensive error handling strategies:

```typescript
function RobustMediaComponent() {
  const media = useMediaStream({ autoStart: false });
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const { 
    error, 
    initializeStream, 
    requestPermissions, 
    restartStream,
    cleanup 
  } = media;

  // Auto-retry on errors
  useEffect(() => {
    if (error && retryCount < maxRetries) {
      const timer = setTimeout(async () => {
        console.log(`Retrying media initialization (${retryCount + 1}/${maxRetries})`);
        setRetryCount(prev => prev + 1);
        
        try {
          await restartStream();
          setRetryCount(0); // Reset on success
        } catch (err) {
          console.error('Retry failed:', err);
        }
      }, 2000 * Math.pow(2, retryCount)); // Exponential backoff

      return () => clearTimeout(timer);
    }
  }, [error, retryCount, maxRetries, restartStream]);

  const handleManualRetry = async () => {
    setRetryCount(0);
    cleanup();
    
    try {
      const hasPermissions = await requestPermissions();
      if (hasPermissions) {
        await initializeStream();
      }
    } catch (err) {
      console.error('Manual retry failed:', err);
    }
  };

  return (
    <div>
      {error && (
        <div className="error-handler">
          <h3>Media Error</h3>
          <p>{error}</p>
          
          {retryCount < maxRetries ? (
            <p>Retrying... ({retryCount}/{maxRetries})</p>
          ) : (
            <div>
              <p>Max retries exceeded. Please try manually.</p>
              <button onClick={handleManualRetry}>
                Retry Now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## useRoomUI Hook

### UI Management Purpose

The `useRoomUI` hook manages UI state and layout controls for the video conference interface. It separates presentation concerns from business logic, making the interface highly customizable.

### UI Key Features

- **Layout Management** - Grid, speaker, and gallery view modes
- **Panel Controls** - Chat and participants panel visibility
- **Participant Focus** - Pinning and selection functionality
- **Device UI State** - Menu and settings modal management
- **Local State Management** - UI state that doesn't need global persistence

### UI Basic Usage

```typescript
import { useRoomUI } from "@/hooks/useRoomConnection";

function RoomLayout() {
  const {
    gridLayout,
    isChatPanelOpen,
    isParticipantsPanelOpen,
    toggleChatPanel,
    toggleParticipantsPanel,
    setGridLayout
  } = useRoomUI();

  return (
    <div className="room-layout">
      <div className="controls">
        <button onClick={() => setGridLayout('grid')}>Grid View</button>
        <button onClick={() => setGridLayout('speaker')}>Speaker View</button>
        <button onClick={toggleChatPanel}>
          {isChatPanelOpen ? 'Hide' : 'Show'} Chat
        </button>
        <button onClick={toggleParticipantsPanel}>
          {isParticipantsPanelOpen ? 'Hide' : 'Show'} Participants
        </button>
      </div>
      
      <div className={`main-view ${gridLayout}`}>
        {/* Video grid content */}
      </div>
      
      {isChatPanelOpen && <ChatPanel />}
      {isParticipantsPanelOpen && <ParticipantsPanel />}
    </div>
  );
}
```

### Advanced Layout Management

```typescript
function AdvancedRoomLayout() {
  const {
    gridLayout,
    pinnedParticipantId,
    selectedParticipantId,
    pinParticipant,
    unpinParticipant,
    selectParticipant,
    isDeviceMenuOpen,
    setIsDeviceMenuOpen,
    isSettingsOpen,
    setIsSettingsOpen
  } = useRoomUI();

  const handleParticipantAction = (participantId: string, action: string) => {
    switch (action) {
      case 'pin':
        pinParticipant(participantId);
        break;
      case 'unpin':
        unpinParticipant();
        break;
      case 'select':
        selectParticipant(participantId);
        break;
    }
  };

  return (
    <div className="advanced-room-layout">
      {/* Layout controls */}
      <div className="layout-controls">
        <LayoutSelector 
          currentLayout={gridLayout} 
          onLayoutChange={setGridLayout} 
        />
        <DeviceMenu 
          isOpen={isDeviceMenuOpen}
          onToggle={setIsDeviceMenuOpen}
        />
        <SettingsButton 
          onClick={() => setIsSettingsOpen(true)}
        />
      </div>

      {/* Main video area with pinned participant handling */}
      <div className="video-area">
        {pinnedParticipantId && (
          <PinnedParticipantView 
            participantId={pinnedParticipantId}
            onUnpin={unpinParticipant}
          />
        )}
        <ParticipantGrid 
          layout={gridLayout}
          selectedId={selectedParticipantId}
          onParticipantAction={handleParticipantAction}
        />
      </div>

      {/* Settings modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
```

## useDeviceCapabilities Hook

### Device Management Purpose

The `useDeviceCapabilities` hook provides comprehensive device management and capability detection for media devices used in video conferencing.

### Device Key Features

- **Device Enumeration** - Lists all available cameras, microphones, and speakers
- **Capability Detection** - Checks browser and device support for various features
- **Device Switching** - Provides functions to change active devices
- **Permission Monitoring** - Tracks device access permissions
- **Enhanced Metadata** - Additional device information for better UX

### Device Basic Usage

```typescript
import { useDeviceCapabilities } from "@/hooks/useRoomConnection";

function DeviceSelector() {
  const {
    availableDevices,
    capabilities,
    switchCamera,
    switchMicrophone,
    refreshDevices
  } = useDeviceCapabilities();

  return (
    <div className="device-selector">
      {capabilities.hasCamera && (
        <select onChange={(e) => switchCamera(e.target.value)}>
          <option value="">Select Camera</option>
          {availableDevices.cameras.map(camera => (
            <option key={camera.deviceId} value={camera.deviceId}>
              {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      )}

      {capabilities.hasMicrophone && (
        <select onChange={(e) => switchMicrophone(e.target.value)}>
          <option value="">Select Microphone</option>
          {availableDevices.microphones.map(mic => (
            <option key={mic.deviceId} value={mic.deviceId}>
              {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      )}

      <button onClick={refreshDevices}>Refresh Devices</button>
    </div>
  );
}
```

### Capability-Based UI

```typescript
function CapabilityAwareUI() {
  const { capabilities, deviceInfo } = useDeviceCapabilities();

  return (
    <div className="capability-ui">
      {/* Screen sharing only if supported */}
      {capabilities.supportsScreenShare && (
        <button>Share Screen</button>
      )}

      {/* Audio output selection only if supported */}
      {capabilities.supportsAudioOutput && (
        <AudioOutputSelector />
      )}

      {/* Device selection only if available */}
      {capabilities.supportsDeviceSelection && deviceInfo.devicesLabeled && (
        <DeviceSelector />
      )}

      {/* WebRTC features */}
      {capabilities.supportsWebRTC ? (
        <VideoConferenceUI />
      ) : (
        <div>WebRTC not supported in this browser</div>
      )}

      {/* Data channels for chat */}
      {capabilities.supportsDataChannels && (
        <PeerToPeerChat />
      )}
    </div>
  );
}
```

## Hook Composition Patterns

### Combining Hooks for Complex Features

```typescript
function RoomManager() {
  // Connection management
  const connection = useRoomConnection({
    autoReconnect: true,
    maxRetries: 3
  });

  // UI state management
  const ui = useRoomUI();

  // Device capabilities
  const devices = useDeviceCapabilities();

  // Coordinate between hooks
  useEffect(() => {
    // Hide device menu if connection fails
    if (!connection.isConnected) {
      ui.setIsDeviceMenuOpen(false);
    }
  }, [connection.isConnected, ui.setIsDeviceMenuOpen]);

  useEffect(() => {
    // Refresh devices when connection is established
    if (connection.isConnected) {
      devices.refreshDevices();
    }
  }, [connection.isConnected, devices.refreshDevices]);

  return {
    connection,
    ui,
    devices,
    // Combined state
    isReady: connection.isConnected && devices.capabilities.hasCamera,
    // Combined actions
    setupRoom: async () => {
      await connection.connect();
      await devices.refreshDevices();
      ui.setGridLayout('grid');
    }
  };
}
```

### Provider Pattern with Hooks

```typescript
function RoomProvider({ children }: { children: React.ReactNode }) {
  const connection = useRoomConnection();
  const ui = useRoomUI();
  const devices = useDeviceCapabilities();

  const contextValue = {
    connection,
    ui,
    devices,
    // Derived state
    isFullyReady: connection.isConnected && devices.capabilities.hasCamera
  };

  return (
    <RoomContext.Provider value={contextValue}>
      {children}
    </RoomContext.Provider>
  );
}

// Usage in components
function VideoGrid() {
  const { connection, ui, devices } = useRoomContext();
  
  if (!connection.isConnected) {
    return <ConnectionIndicator state={connection.connectionState} />;
  }

  return (
    <div className={`video-grid ${ui.gridLayout}`}>
      {/* Video grid implementation */}
    </div>
  );
}
```

## Best Practices

### Hook Performance Optimization

```typescript
// ✅ Good: Memoize expensive calculations
const { availableDevices } = useDeviceCapabilities();

const deviceOptions = useMemo(() => {
  return availableDevices.cameras.map(camera => ({
    value: camera.deviceId,
    label: camera.label || `Camera ${camera.deviceId.slice(0, 8)}`
  }));
}, [availableDevices.cameras]);

// ✅ Good: Debounce frequent operations
const { refreshDevices } = useDeviceCapabilities();

const debouncedRefresh = useMemo(
  () => debounce(refreshDevices, 1000),
  [refreshDevices]
);
```

### Error Boundaries

```typescript
// Wrap hook-heavy components in error boundaries
function RoomWithErrorBoundary() {
  return (
    <ErrorBoundary fallback={<RoomErrorFallback />}>
      <RoomComponent />
    </ErrorBoundary>
  );
}

function RoomErrorFallback({ error }: { error: Error }) {
  return (
    <div className="error-fallback">
      <h2>Something went wrong with the room connection</h2>
      <details>
        <summary>Error details</summary>
        <pre>{error.message}</pre>
      </details>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  );
}
```

### Testing Hooks

```typescript
// Custom render helper for hooks with providers
function renderHookWithProviders<T>(
  hook: () => T,
  { initialProps }: { initialProps?: any } = {}
) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RoomProvider>{children}</RoomProvider>
  );

  return renderHook(hook, { wrapper, initialProps });
}

// Test hook interactions
describe('Hook Integration', () => {
  it('should coordinate connection and UI state', async () => {
    const { result } = renderHookWithProviders(() => ({
      connection: useRoomConnection(),
      ui: useRoomUI()
    }));

    // Test connection affects UI
    await act(async () => {
      await result.current.connection.connect();
    });

    expect(result.current.connection.isConnected).toBe(true);
    // UI should respond to connection state
  });
});
```

This comprehensive hook system provides the foundation for a robust, scalable video conferencing application with excellent error handling, performance optimization, and maintainability.
