# Hooks Integration Guide

## Overview

This guide demonstrates how to integrate the custom React hooks from `useRoom.ts` with the Shadcn UI components defined in our architecture. The hooks provide clean business logic APIs that connect seamlessly with our component structure.

**Integration Philosophy:**

- **Hooks handle business logic** - State management, WebRTC, WebSocket connections
- **Components handle presentation** - UI rendering, user interactions, accessibility
- **Props create the bridge** - Clean data flow between hooks and components
- **TypeScript ensures safety** - Full type checking across the integration layer

## Hook-to-Component Mapping

### useRoomConnection Hook Integration

The sophisticated connection management hook provides advanced WebSocket and WebRTC connection handling with intelligent reconnection, health monitoring, and quality assessment.

#### Integration with ConnectionStatusIndicator Component

```typescript
// components/v1/connection/ConnectionStatusIndicator.tsx
import { useRoomConnection } from "@/hooks/useRoomConnection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Wifi, WifiOff, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface ConnectionStatusProps {
  roomId: string;
  username: string;
  onConnectionChange?: (isConnected: boolean) => void;
}

export function ConnectionStatusIndicator({ 
  roomId, 
  username, 
  onConnectionChange 
}: ConnectionStatusProps) {
  // =================== HOOK INTEGRATION ===================
  const {
    // Connection state
    connectionState,
    isConnected,
    isReconnecting,
    quality,
    latency,
    retryCount,
    lastError,
    
    // Connection actions
    connect,
    disconnect,
    retry,
    reconnect,
  } = useRoomConnection({
    maxRetries: 10,
    retryDelay: 3000,
    autoReconnect: true,
    heartbeatInterval: 30000,
  });

  // =================== UI STATE MAPPING ===================
  
  // Map connection status to UI variants
  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (connectionState.status) {
      case 'connected': return quality === 'excellent' ? 'default' : 'secondary';
      case 'connecting': 
      case 'reconnecting': return 'outline';
      case 'failed': 
      case 'disconnected': return 'destructive';
      default: return 'outline';
    }
  };

  // Map quality to progress bar color classes
  const getQualityColor = (): string => {
    switch (quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'poor': return 'bg-yellow-500';
      case 'bad': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Map connection status to icons
  const getStatusIcon = () => {
    if (isReconnecting) return <RotateCcw className="h-4 w-4 animate-spin" />;
    if (isConnected) return <Wifi className="h-4 w-4" />;
    return <WifiOff className="h-4 w-4" />;
  };

  // =================== EFFECT INTEGRATION ===================
  
  // Notify parent component of connection changes
  useEffect(() => {
    onConnectionChange?.(isConnected);
  }, [isConnected, onConnectionChange]);

  // =================== UI RENDERING ===================
  
  return (
    <div className="flex items-center gap-2">
      {/* Connection Status Badge */}
      <Badge variant={getStatusVariant()} className="flex items-center gap-1">
        {getStatusIcon()}
        <span className="capitalize">{connectionState.status}</span>
        {retryCount > 0 && <span className="text-xs">({retryCount})</span>}
      </Badge>

      {/* Connection Quality Indicator */}
      {isConnected && latency && (
        <div className="flex items-center gap-1">
          <Progress 
            value={Math.max(0, 100 - (latency / 10))} 
            className="w-16 h-2"
            indicatorClassName={getQualityColor()}
          />
          <span className="text-xs text-muted-foreground">{latency}ms</span>
        </div>
      )}

      {/* Connection Error Alert */}
      {lastError && !isConnected && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{lastError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={reconnect}
              disabled={isReconnecting}
            >
              {isReconnecting ? <RotateCcw className="h-4 w-4 animate-spin" /> : 'Retry'}
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

#### Integration with RoomConnectionProvider Component

```typescript
// components/providers/RoomConnectionProvider.tsx
import { useRoomConnection } from "@/hooks/useRoomConnection";
import { createContext, useContext, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface RoomConnectionContextType {
  connectionState: ReturnType<typeof useRoomConnection>['connectionState'];
  isConnected: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
}

const RoomConnectionContext = createContext<RoomConnectionContextType | null>(null);

interface RoomConnectionProviderProps {
  children: React.ReactNode;
  roomId: string;
  username: string;
  autoConnect?: boolean;
}

export function RoomConnectionProvider({ 
  children, 
  roomId, 
  username, 
  autoConnect = true 
}: RoomConnectionProviderProps) {
  const { toast } = useToast();
  
  // =================== HOOK INTEGRATION ===================
  const connectionHook = useRoomConnection({
    maxRetries: 5,
    retryDelay: 2000,
    autoReconnect: true,
    connectionTimeout: 15000,
  });

  const { 
    connectionState, 
    isConnected, 
    connect, 
    disconnect, 
    reconnect, 
    lastError 
  } = connectionHook;

  // =================== EFFECT INTEGRATION ===================
  
  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && roomId && username) {
      connect();
    }
  }, [autoConnect, roomId, username, connect]);

  // Show toast notifications for connection events
  useEffect(() => {
    switch (connectionState.status) {
      case 'connected':
        toast({
          title: "Connected",
          description: "Successfully connected to the room",
          variant: "default",
        });
        break;
      case 'failed':
        if (lastError) {
          toast({
            title: "Connection Failed",
            description: lastError,
            variant: "destructive",
          });
        }
        break;
      case 'reconnecting':
        toast({
          title: "Reconnecting",
          description: "Attempting to reconnect...",
          variant: "default",
        });
        break;
    }
  }, [connectionState.status, lastError, toast]);

  // =================== CONTEXT VALUE ===================
  
  const contextValue: RoomConnectionContextType = {
    connectionState,
    isConnected,
    connect,
    disconnect,
    reconnect,
  };

  return (
    <RoomConnectionContext.Provider value={contextValue}>
      {children}
    </RoomConnectionContext.Provider>
  );
}

// Hook for consuming connection context
export const useRoomConnectionContext = () => {
  const context = useContext(RoomConnectionContext);
  if (!context) {
    throw new Error('useRoomConnectionContext must be used within RoomConnectionProvider');
  }
  return context;
};
```

### useMediaStream Hook Integration

The comprehensive media stream management hook provides sophisticated device handling, stream lifecycle management, and seamless integration with Shadcn UI components for video conferencing interfaces.

#### Integration with Media Controls Component

```typescript
// components/v1/media/MediaControls.tsx
import { useMediaStream } from "@/hooks/useMediaStream";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, Settings, RefreshCw, Monitor } from "lucide-react";

interface MediaControlsProps {
  onStreamReady?: (stream: MediaStream) => void;
  onError?: (error: string) => void;
}

export function MediaControls({ onStreamReady, onError }: MediaControlsProps) {
  // =================== HOOK INTEGRATION ===================
  const {
    // Stream state
    isInitialized,
    isStarting,
    error,
    isCameraActive,
    isMicrophoneActive,
    
    // Global media state
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    availableDevices,
    selectedDevices,
    
    // Stream actions
    initializeStream,
    cleanup,
    restartStream,
    requestPermissions,
    
    // Global media actions
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    switchMicrophone,
    refreshDevices,
  } = useMediaStream({
    autoStart: false, // Manual control for better UX
    video: { width: 1280, height: 720, frameRate: 30 },
    audio: { 
      echoCancellation: true, 
      noiseSuppression: true, 
      autoGainControl: true 
    }
  });

  // =================== UI STATE MAPPING ===================
  
  // Map media state to UI variants
  const getAudioButtonVariant = (): "default" | "destructive" => {
    return isAudioEnabled ? "default" : "destructive";
  };

  const getVideoButtonVariant = (): "default" | "destructive" => {
    return isVideoEnabled ? "default" : "destructive";
  };

  // Map initialization state to UI feedback
  const getInitializationStatus = () => {
    if (isStarting) return { text: "Starting camera...", variant: "secondary" as const };
    if (isInitialized) return { text: "Camera ready", variant: "default" as const };
    if (error) return { text: "Camera error", variant: "destructive" as const };
    return { text: "Camera off", variant: "outline" as const };
  };

  // =================== EFFECT INTEGRATION ===================
  
  // Notify parent when stream is ready
  useEffect(() => {
    if (isInitialized && localStream && onStreamReady) {
      onStreamReady(localStream);
    }
  }, [isInitialized, localStream, onStreamReady]);

  // Notify parent of errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // =================== EVENT HANDLERS ===================
  
  const handleStartCamera = async () => {
    try {
      // Request permissions first for better UX
      const hasPermissions = await requestPermissions();
      if (hasPermissions) {
        await initializeStream();
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
    }
  };

  const handleDeviceChange = async (deviceType: 'camera' | 'microphone', deviceId: string) => {
    try {
      if (deviceType === 'camera') {
        await switchCamera(deviceId);
      } else {
        await switchMicrophone(deviceId);
      }
      
      // Restart stream if already initialized to apply new device
      if (isInitialized) {
        await restartStream();
      }
    } catch (err) {
      console.error(`Failed to switch ${deviceType}:`, err);
    }
  };

  // =================== UI RENDERING ===================
  
  const status = getInitializationStatus();

  return (
    <Card className="media-controls">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Media Controls</span>
          <Badge variant={status.variant}>{status.text}</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stream Initialization */}
        {!isInitialized && (
          <Button 
            onClick={handleStartCamera} 
            disabled={isStarting}
            className="w-full"
          >
            {isStarting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Starting Camera...
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" />
                Start Camera
              </>
            )}
          </Button>
        )}

        {/* Media Toggle Controls */}
        {isInitialized && (
          <div className="flex gap-2">
            <Toggle
              pressed={isAudioEnabled}
              onPressedChange={toggleAudio}
              variant={getAudioButtonVariant()}
              aria-label="Toggle microphone"
            >
              {isAudioEnabled ? (
                <Mic className="h-4 w-4" />
              ) : (
                <MicOff className="h-4 w-4" />
              )}
            </Toggle>

            <Toggle
              pressed={isVideoEnabled}
              onPressedChange={toggleVideo}
              variant={getVideoButtonVariant()}
              aria-label="Toggle camera"
            >
              {isVideoEnabled ? (
                <Video className="h-4 w-4" />
              ) : (
                <VideoOff className="h-4 w-4" />
              )}
            </Toggle>

            <Button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              variant={isScreenSharing ? "default" : "outline"}
              size="sm"
            >
              <Monitor className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Device Selection */}
        <div className="space-y-2">
          {availableDevices.cameras.length > 0 && (
            <div>
              <label className="text-sm font-medium">Camera</label>
              <Select
                value={selectedDevices.camera || ""}
                onValueChange={(value) => handleDeviceChange('camera', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {availableDevices.cameras.map((camera) => (
                    <SelectItem key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {availableDevices.microphones.length > 0 && (
            <div>
              <label className="text-sm font-medium">Microphone</label>
              <Select
                value={selectedDevices.microphone || ""}
                onValueChange={(value) => handleDeviceChange('microphone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  {availableDevices.microphones.map((mic) => (
                    <SelectItem key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Device Refresh */}
        <Button
          onClick={refreshDevices}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Devices
        </Button>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartCamera}
                disabled={isStarting}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stream Statistics (for debugging) */}
        {isInitialized && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Camera: {isCameraActive ? 'Active' : 'Inactive'}</div>
            <div>Microphone: {isMicrophoneActive ? 'Active' : 'Inactive'}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### Integration with Video Preview Component

```typescript
// components/v1/media/VideoPreview.tsx
import { useMediaStream } from "@/hooks/useMediaStream";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, VideoOff, Settings } from "lucide-react";

interface VideoPreviewProps {
  className?: string;
  showControls?: boolean;
  onStreamStats?: (stats: any) => void;
}

export function VideoPreview({ 
  className, 
  showControls = true, 
  onStreamStats 
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // =================== HOOK INTEGRATION ===================
  const {
    localStream,
    isInitialized,
    isStarting,
    error,
    isVideoEnabled,
    isCameraActive,
    initializeStream,
    toggleVideo,
    getStreamStats,
  } = useMediaStream({
    autoStart: true,
    video: { width: 640, height: 480 },
    audio: false // Preview doesn't need audio
  });

  // =================== VIDEO ELEMENT INTEGRATION ===================
  
  // Connect stream to video element
  useEffect(() => {
    if (videoRef.current && localStream && isVideoEnabled) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled]);

  // Provide stream statistics to parent
  useEffect(() => {
    if (isInitialized && onStreamStats) {
      const stats = getStreamStats();
      onStreamStats(stats);
    }
  }, [isInitialized, getStreamStats, onStreamStats]);

  // =================== UI RENDERING ===================
  
  return (
    <Card className={`video-preview ${className}`}>
      <div className="relative aspect-video bg-muted">
        {/* Loading State */}
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Skeleton className="w-full h-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-sm text-muted-foreground">Starting camera...</div>
            </div>
          </div>
        )}

        {/* Video Element */}
        {isInitialized && isVideoEnabled && (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover rounded-lg"
          />
        )}

        {/* No Video State */}
        {isInitialized && !isVideoEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <VideoOff className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
            <div className="text-center">
              <VideoOff className="h-12 w-12 text-destructive mx-auto mb-2" />
              <div className="text-sm text-destructive">Camera Error</div>
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant={isCameraActive ? "default" : "secondary"}>
            {isCameraActive ? "Live" : "Off"}
          </Badge>
        </div>

        {/* Controls Overlay */}
        {showControls && isInitialized && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-2">
            <Button
              size="sm"
              variant={isVideoEnabled ? "default" : "destructive"}
              onClick={toggleVideo}
            >
              {isVideoEnabled ? (
                <Video className="h-4 w-4" />
              ) : (
                <VideoOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
```

#### Integration with Media Permission Prompt Component

```typescript
// components/v1/media/MediaPermissionPrompt.tsx
import { useMediaStream } from "@/hooks/useMediaStream";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Video, Mic, Shield, CheckCircle } from "lucide-react";

export function MediaPermissionPrompt() {
  // =================== HOOK INTEGRATION ===================
  const {
    isInitialized,
    isStarting,
    error,
    requestPermissions,
    initializeStream,
  } = useMediaStream({
    autoStart: false // Manual permission flow
  });

  // =================== PERMISSION FLOW ===================
  
  const handleRequestPermissions = async () => {
    try {
      const granted = await requestPermissions();
      if (granted) {
        await initializeStream();
      }
    } catch (err) {
      console.error('Permission request failed:', err);
    }
  };

  // =================== UI RENDERING ===================
  
  if (isInitialized) {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Camera and microphone access granted. You're ready to join the call!
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Media Permissions Required</CardTitle>
        <CardDescription>
          Please allow access to your camera and microphone to join the video call.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Video className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">Camera Access</span>
          </div>
          <div className="flex items-center space-x-2">
            <Mic className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">Microphone Access</span>
          </div>
        </div>

        <Button 
          onClick={handleRequestPermissions}
          disabled={isStarting}
          className="w-full"
        >
          {isStarting ? 'Requesting Access...' : 'Allow Camera & Microphone'}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground text-center">
          Your privacy is important. Media access is only used during video calls.
        </div>
      </CardContent>
    </Card>
  );
}
```

### useRoom Hook Integration

The primary hook for room lifecycle management integrates with container components.

#### Integration with RoomContainer Component

```typescript
// components/v1/room/RoomContainer.tsx
import { useRoom } from "@/hooks/useRoom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface RoomContainerProps {
  roomId: string;
  username: string;
  authToken: string;
}

export function RoomContainer({ roomId, username, authToken }: RoomContainerProps) {
  // =================== HOOK INTEGRATION ===================
  const {
    // State from useRoom hook
    isJoined,
    isHost,
    isWaitingRoom,
    isRoomReady,
    hasConnectionIssues,
    roomName,
    connectionState,
    
    // Actions from useRoom hook
    joinRoomWithAuth,
    exitRoom,
    clearError,
  } = useRoom();

  // =================== CONNECTION HANDLING ===================
  const handleJoinRoom = async () => {
    try {
      await joinRoomWithAuth(roomId, username, authToken);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  // =================== LOADING STATES ===================
  if (!isJoined && connectionState.wsConnecting) {
    return (
      <Card className="p-8 max-w-md mx-auto mt-8">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
        </div>
      </Card>
    );
  }

  // =================== WAITING ROOM STATE ===================
  if (isWaitingRoom) {
    return (
      <Card className="p-6 max-w-md mx-auto mt-8">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Waiting for Approval</h2>
          <p className="text-muted-foreground">
            The host will approve your request to join shortly.
          </p>
          <Button onClick={exitRoom} variant="outline" className="w-full">
            Cancel and Leave
          </Button>
        </div>
      </Card>
    );
  }

  // =================== CONNECTION ISSUES ===================
  if (hasConnectionIssues) {
    return (
      <Card className="p-6 max-w-md mx-auto mt-8">
        <Alert variant="destructive">
          <AlertDescription className="space-y-3">
            <p>Connection issues detected. Please check your network.</p>
            <Button onClick={handleJoinRoom} size="sm">
              Retry Connection
            </Button>
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  // =================== JOIN ROOM STATE ===================
  if (!isJoined) {
    return (
      <Card className="p-6 max-w-md mx-auto mt-8">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Join Conference</h2>
          <p className="text-muted-foreground">
            Ready to join "{roomName}"?
          </p>
          <Button onClick={handleJoinRoom} className="w-full">
            Join Room
          </Button>
        </div>
      </Card>
    );
  }

  // =================== MAIN ROOM INTERFACE ===================
  return (
    <div className="h-screen flex flex-col bg-background">
      <RoomHeader roomName={roomName} isHost={isHost} onLeave={exitRoom} />
      <main className="flex-1 overflow-hidden">
        <RoomLayout />
      </main>
    </div>
  );
}
```

### useParticipants Hook Integration

The participants hook integrates with participant management components.

#### Integration with ParticipantsList Component

```typescript
// components/v1/participants/ParticipantsList.tsx
import { useParticipants } from "@/hooks/useRoom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ParticipantCard } from "./ParticipantCard";

export function ParticipantsList() {
  // =================== HOOK INTEGRATION ===================
  const {
    // Participant data from hook
    participants,
    localParticipant,
    speakingParticipants,
    pendingParticipants,
    selectedParticipant,
    participantCount,
    
    // Actions from hook
    selectParticipant,
    approveParticipant,
    kickParticipant,
    isParticipantSpeaking,
  } = useParticipants();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Participants
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {participantCount}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="space-y-1 p-4">
            {/* Local participant first */}
            {localParticipant && (
              <ParticipantCard
                participant={localParticipant}
                isLocal={true}
                isSpeaking={isParticipantSpeaking(localParticipant.id)}
                isSelected={selectedParticipant?.id === localParticipant.id}
                onSelect={() => selectParticipant(localParticipant.id)}
              />
            )}
            
            {/* Remote participants */}
            {participants.map(participant => (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                isLocal={false}
                isSpeaking={isParticipantSpeaking(participant.id)}
                isSelected={selectedParticipant?.id === participant.id}
                onSelect={() => selectParticipant(participant.id)}
                onKick={kickParticipant}
              />
            ))}
          </div>
          
          {/* Pending participants (waiting room) */}
          {pendingParticipants.length > 0 && (
            <div className="border-t p-4">
              <h4 className="text-sm font-medium mb-2">Waiting Room</h4>
              <div className="space-y-2">
                {pendingParticipants.map(participant => (
                  <div key={participant.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{participant.name}</span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => approveParticipant?.(participant.id)}
                      >
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => kickParticipant?.(participant.id)}
                      >
                        Deny
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

### useMediaControls Hook Integration

The media controls hook integrates with media management components.

#### Integration with MediaControls Component

```typescript
// components/v1/media/MediaControls.tsx
import { useMediaControls } from "@/hooks/useRoom";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  MicIcon, 
  MicOffIcon, 
  VideoIcon, 
  VideoOffIcon, 
  ScreenShareIcon,
  SettingsIcon,
  PhoneIcon 
} from "lucide-react";

interface MediaControlsProps {
  onEndCall?: () => void;
  onOpenSettings?: () => void;
}

export function MediaControls({ onEndCall, onOpenSettings }: MediaControlsProps) {
  // =================== HOOK INTEGRATION ===================
  const {
    // Media state from hook
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    hasCamera,
    hasMicrophone,
    availableDevices,
    selectedDevices,
    
    // Media actions from hook
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    switchCamera,
    switchMicrophone,
  } = useMediaControls();

  return (
    <TooltipProvider>
      <div className="flex items-center justify-center gap-3 p-4 bg-card border-t">
        {/* Primary controls */}
        <div className="flex items-center gap-2">
          {/* Audio control */}
          {hasMicrophone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  pressed={isAudioEnabled}
                  onPressedChange={toggleAudio}
                  variant="outline"
                  size="lg"
                  className={cn(
                    "h-12 w-12 rounded-full transition-all",
                    !isAudioEnabled && "bg-destructive text-destructive-foreground hover:bg-destructive/80"
                  )}
                  aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {isAudioEnabled ? (
                    <MicIcon className="h-5 w-5" />
                  ) : (
                    <MicOffIcon className="h-5 w-5" />
                  )}
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                {isAudioEnabled ? 'Mute microphone (M)' : 'Unmute microphone (M)'}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Video control */}
          {hasCamera && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  pressed={isVideoEnabled}
                  onPressedChange={toggleVideo}
                  variant="outline"
                  size="lg"
                  className={cn(
                    "h-12 w-12 rounded-full transition-all",
                    !isVideoEnabled && "bg-destructive text-destructive-foreground hover:bg-destructive/80"
                  )}
                  aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {isVideoEnabled ? (
                    <VideoIcon className="h-5 w-5" />
                  ) : (
                    <VideoOffIcon className="h-5 w-5" />
                  )}
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                {isVideoEnabled ? 'Turn off camera (V)' : 'Turn on camera (V)'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Secondary controls */}
        <Separator orientation="vertical" className="h-8" />
        <div className="flex items-center gap-2">
          {/* Screen share */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={isScreenSharing}
                onPressedChange={toggleScreenShare}
                variant="outline"
                size="lg"
                className="h-12 w-12 rounded-full"
                aria-label={isScreenSharing ? 'Stop screen share' : 'Start screen share'}
              >
                <ScreenShareIcon className="h-5 w-5" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              {isScreenSharing ? 'Stop screen share' : 'Share screen'}
            </TooltipContent>
          </Tooltip>

          {/* Settings */}
          {onOpenSettings && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onOpenSettings}
                  variant="outline"
                  size="lg"
                  className="h-12 w-12 rounded-full"
                  aria-label="Open settings"
                >
                  <SettingsIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Device selection (quick access) */}
        {availableDevices.cameras.length > 1 && (
          <div className="flex items-center gap-2">
            <Select value={selectedDevices.camera} onValueChange={switchCamera}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Camera" />
              </SelectTrigger>
              <SelectContent>
                {availableDevices.cameras.map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* End call */}
        {onEndCall && (
          <>
            <Separator orientation="vertical" className="h-8" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onEndCall}
                  variant="destructive"
                  size="lg"
                  className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700"
                  aria-label="End call"
                >
                  <PhoneIcon className="h-5 w-5 rotate-[135deg]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>End call (Ctrl+D)</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
```

### useChat Hook Integration

The chat hook integrates with messaging components.

#### Integration with ChatPanel Component

```typescript
// components/v1/chat/ChatPanel.tsx
import { useChat } from "@/hooks/useRoom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageIcon, XIcon } from "lucide-react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

export function ChatPanel() {
  // =================== HOOK INTEGRATION ===================
  const {
    // Chat state from hook
    messages,
    unreadCount,
    isChatPanelOpen,
    hasUnreadMessages,
    
    // Chat actions from hook
    sendTextMessage,
    sendPrivateMessage,
    openChat,
    closeChat,
    markMessagesRead,
  } = useChat();

  // Auto-open chat when receiving messages (if closed)
  React.useEffect(() => {
    if (hasUnreadMessages && !isChatPanelOpen) {
      // Could auto-open or just show notification
      // For now, we'll just show the unread count
    }
  }, [hasUnreadMessages, isChatPanelOpen]);

  if (!isChatPanelOpen) {
    return (
      <Button
        onClick={openChat}
        variant="outline"
        className="relative"
        aria-label={`Open chat${hasUnreadMessages ? ` (${unreadCount} unread)` : ''}`}
      >
        <MessageIcon className="h-4 w-4" />
        {hasUnreadMessages && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Chat</CardTitle>
            {hasUnreadMessages && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button
            onClick={closeChat}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            aria-label="Close chat"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        <Separator />
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-4">
          <MessageList 
            messages={messages}
            onMarkAsRead={markMessagesRead}
          />
        </ScrollArea>
        
        <div className="border-t bg-card">
          <MessageInput 
            onSendMessage={sendTextMessage}
            onSendPrivateMessage={sendPrivateMessage}
            placeholder="Type a message..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

### useRoomUI Hook Integration

The room UI hook integrates with layout and view management components.

#### Integration with ViewControls Component

```typescript
// components/v1/room/ViewControls.tsx
import { useRoomUI } from "@/hooks/useRoom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  Grid3X3Icon, 
  UserIcon, 
  SidebarIcon, 
  PinIcon, 
  PinOffIcon,
  UsersIcon 
} from "lucide-react";

export function ViewControls() {
  // =================== HOOK INTEGRATION ===================
  const {
    // UI state from hook
    gridLayout,
    isPinned,
    selectedParticipantId,
    isParticipantsPanelOpen,
    
    // UI actions from hook
    showGalleryView,
    showSpeakerView,
    showSidebarView,
    togglePin,
    toggleParticipantsPanel,
  } = useRoomUI();

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 p-2 bg-card rounded-lg border">
        {/* Layout controls */}
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={showGalleryView}
                variant={gridLayout === 'gallery' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "h-8 w-8 p-0",
                  gridLayout === 'gallery' && "bg-primary text-primary-foreground"
                )}
                aria-label="Gallery view"
              >
                <Grid3X3Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Gallery view</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={showSpeakerView}
                variant={gridLayout === 'speaker' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "h-8 w-8 p-0",
                  gridLayout === 'speaker' && "bg-primary text-primary-foreground"
                )}
                aria-label="Speaker view"
              >
                <UserIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Speaker view</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={showSidebarView}
                variant={gridLayout === 'sidebar' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "h-8 w-8 p-0",
                  gridLayout === 'sidebar' && "bg-primary text-primary-foreground"
                )}
                aria-label="Sidebar view"
              >
                <SidebarIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sidebar view</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Participant controls */}
        <div className="flex items-center gap-1">
          {/* Pin control */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={togglePin}
                disabled={!selectedParticipantId}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                aria-label={isPinned ? 'Unpin participant' : 'Pin participant'}
              >
                {isPinned ? (
                  <PinOffIcon className="h-4 w-4" />
                ) : (
                  <PinIcon className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPinned ? 'Unpin participant' : 'Pin selected participant'}
            </TooltipContent>
          </Tooltip>

          {/* Participants panel toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={toggleParticipantsPanel}
                variant={isParticipantsPanelOpen ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "h-8 w-8 p-0",
                  isParticipantsPanelOpen && "bg-primary text-primary-foreground"
                )}
                aria-label={isParticipantsPanelOpen ? 'Hide participants' : 'Show participants'}
              >
                <UsersIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isParticipantsPanelOpen ? 'Hide participants' : 'Show participants'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
```

## Complete Integration Example

Here's how all the hooks work together in a complete room layout:

```typescript
// components/v1/room/RoomLayout.tsx
import { useRoom, useParticipants, useMediaControls, useChat, useRoomUI } from "@/hooks/useRoom";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function RoomLayout() {
  // =================== MULTIPLE HOOK INTEGRATION ===================
  const room = useRoom();
  const participants = useParticipants();
  const media = useMediaControls();
  const chat = useChat();
  const ui = useRoomUI();

  // Only render if room is ready
  if (!room.isRoomReady) {
    return <div>Loading...</div>;
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Main video area */}
      <ResizablePanel defaultSize={75} minSize={50}>
        <div className="h-full flex flex-col">
          <div className="flex-1">
            <VideoGrid 
              participants={participants.participants}
              localStream={media.localStream}
              screenShareStream={media.screenShareStream}
              gridLayout={ui.gridLayout}
              pinnedParticipant={participants.pinnedParticipant}
              speakingParticipants={participants.speakingParticipants}
            />
          </div>
          
          <div className="border-t">
            <MediaControls 
              isAudioEnabled={media.isAudioEnabled}
              isVideoEnabled={media.isVideoEnabled}
              isScreenSharing={media.isScreenSharing}
              onToggleAudio={media.toggleAudio}
              onToggleVideo={media.toggleVideo}
              onToggleScreenShare={media.toggleScreenShare}
              onEndCall={room.exitRoom}
            />
          </div>
        </div>
      </ResizablePanel>
      
      <ResizableHandle withHandle />
      
      {/* Sidebar */}
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">
              Chat {chat.hasUnreadMessages && `(${chat.unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="participants">
              Participants ({participants.participantCount})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="flex-1">
            <ChatPanel />
          </TabsContent>
          
          <TabsContent value="participants" className="flex-1">
            <ParticipantsList />
          </TabsContent>
        </Tabs>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

## Best Practices

### Data Flow Patterns

#### Unidirectional Data Flow

```typescript
// ✅ Good: Data flows down, events flow up
<MediaControls 
  isAudioEnabled={media.isAudioEnabled}  // Data down
  onToggleAudio={media.toggleAudio}      // Events up
/>
```

#### Hook Composition

```typescript
// ✅ Good: Compose multiple hooks in components
const room = useRoom();
const media = useMediaControls();
const participants = useParticipants();
```

#### Conditional Rendering Based on Hook State

```typescript
// ✅ Good: Use hook state for conditional rendering
if (!room.isRoomReady) return <LoadingSpinner />;
if (room.hasConnectionIssues) return <ConnectionError />;
```

### Error Handling

```typescript
// ✅ Good: Handle errors from hooks
const { joinRoomWithAuth, clearError } = useRoom();

const handleJoin = async () => {
  try {
    await joinRoomWithAuth(roomId, username, token);
  } catch (error) {
    // Handle error in UI
    toast.error('Failed to join room');
  }
};
```

### Performance Optimization

```typescript
// ✅ Good: Memoize expensive computations
const participantList = useMemo(() => 
  participants.participants.filter(p => p.isActive),
  [participants.participants]
);
```

This integration pattern provides a clean, maintainable, and scalable architecture that separates business logic (hooks) from presentation (Shadcn components) while maintaining type safety and excellent developer experience.
