# Shadcn UI Implementation Guide

## Overview

This guide provides a complete implementation blueprint for building a professional video conferencing interface using Shadcn UI components integrated with your existing React hooks architecture.

**Key Benefits:**

- **Consistent Design System** - Professional UI components with built-in accessibility
- **Type Safety** - Full TypeScript integration with proper interfaces
- **Performance Optimized** - Minimal bundle size with tree-shaking
- **Maintainable Architecture** - Clear separation of business logic and presentation

## Quick Start

## Installation & Setup

### 1. Install Dependencies

First, install the required Shadcn UI components:

```bash
# Essential layout components
npx shadcn@latest add card separator resizable-panels scroll-area

# Interactive controls  
npx shadcn@latest add button toggle switch slider

# User interface elements
npx shadcn@latest add avatar badge tooltip hover-card

# Input and communication
npx shadcn@latest add input textarea popover command

# Configuration and dialogs
npx shadcn@latest add select dropdown-menu dialog tabs

# Feedback and loading states
npx shadcn@latest add alert skeleton progress toast
```

### 2. Project Structure

Organize components following domain-driven design principles with nested components:

```text
components/v1/
├── room/
│   └── components/
│       ├── RoomContainer.tsx       # Main orchestrator component
│       ├── RoomHeader.tsx          # Room title, status, and controls
│       └── RoomLayout.tsx          # Resizable layout manager
├── media/
│   └── components/
│       ├── VideoGrid.tsx           # Participant video grid
│       ├── VideoTile.tsx           # Individual video display
│       ├── MediaControls.tsx       # Audio/video toggle controls
│       ├── MediaPermissionPrompt.tsx # Permission request flow
│       └── DeviceSettings.tsx      # Camera/microphone selection
├── connection/
│   └── components/
│       ├── ConnectionStatusIndicator.tsx # Connection health display
│       └── ConnectionProvider.tsx  # Connection context provider
├── chat/
│   └── components/
│       ├── ChatPanel.tsx           # Chat container and wrapper
│       ├── MessageList.tsx         # Message history display
│       └── MessageInput.tsx        # Message composition input
└── participants/
    └── components/
        ├── ParticipantsList.tsx    # Participant roster
        └── ParticipantCard.tsx     # Individual participant info
```

## Core Components

### RoomContainer.tsx - Main Application Entry Point

The primary orchestrator component using your sophisticated hooks architecture.

```typescript
import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoomConnection } from "@/hooks/useRoomConnection";
import { useMediaStream } from "@/hooks/useMediaStream";
import { useRoomUI } from "@/hooks/useRoomConnection";
import { useRoomStore } from "@/store/useRoomStore";
import { RoomHeader } from "./RoomHeader";
import { RoomLayout } from "./RoomLayout";
import { MediaControls } from "../media/components/MediaControls";
import { ConnectionStatusIndicator } from "../connection/components/ConnectionStatusIndicator";

interface RoomContainerProps {
  roomId: string;
  username: string;
}

export function RoomContainer({ roomId, username }: RoomContainerProps) {
  // =================== HOOK INTEGRATION ===================
  const connection = useRoomConnection({
    maxRetries: 5,
    retryDelay: 3000,
    autoReconnect: true,
    connectionTimeout: 15000
  });

  const media = useMediaStream({
    autoStart: false,
    
  
  // Connection loading state
  if (!isConnected) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="p-6 max-w-md mx-auto">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              {isReconnecting ? (
                <Skeleton className="h-8 w-32 mx-auto" />
              ) : (
                <h2 className="text-xl font-semibold">
                  {connectionState.status === 'connecting' ? 'Joining Room' : 'Connection Required'}
                </h2>
              )}
              
              <div className="flex items-center justify-center gap-2">
                <Badge variant={connectionState.status === 'failed' ? 'destructive' : 'outline'}>
                  {connectionState.status}
                </Badge>
                {connectionState.retryCount > 0 && (
                  <Badge variant="secondary">
                    Retry {connectionState.retryCount}
                  </Badge>
                )}
              </div>
            </div>

            {connectionState.status === 'connecting' && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Connecting to {roomId}...
                </p>
              </div>
            )}

            {connectionState.status === 'failed' && connectionState.lastError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {connectionState.lastError}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              {connectionState.status === 'failed' && (
                <Button 
                  onClick={retry}
                  variant="outline"
                  disabled={isReconnecting}
                  className="flex-1"
                >
                  {isReconnecting ? 'Retrying...' : 'Retry Connection'}
                </Button>
              )}
              
              <Button 
                onClick={connect}
                disabled={connectionState.status === 'connecting'}
                className="flex-1"
              >
                {connectionState.status === 'connecting' ? 'Connecting...' : 'Join Room'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Connected state - main application layout
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header with connection status */}
      <header className="border-b bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <RoomHeader 
            roomId={roomId}
            participantCount={participants.size}
            onLeave={disconnect}
          />
          <ConnectionStatusIndicator 
            roomId={roomId}
            username={username}
          />
        </div>
      </header>
      
      {/* Main content area */}
      <main className="flex-1 overflow-hidden">
        <RoomLayout 
          participants={participants}
          gridLayout={gridLayout}
          isChatPanelOpen={isChatPanelOpen}
          isParticipantsPanelOpen={isParticipantsPanelOpen}
          roomId={roomId}
        />
      </main>
      
      {/* Media controls footer */}
      <footer className="border-t bg-card/50 p-4">
        <MediaControls />
      </footer>
    </div>
  );
}
      </Card>
    );
  }

  // Connected state - main application layout
  return (
    <div className="h-screen flex flex-col bg-background">
      <RoomHeader 
        roomId={roomId}
        participantCount={conference.state.participants.size}
        onLeave={conference.actions.leaveConference}
      />
      
      <main className="flex-1 overflow-hidden">
        <RoomLayout 
          participants={conference.state.participants}
          localStream={conference.state.localStream}
          roomId={roomId}
        />
      </main>
      
      <footer className="border-t bg-card/50 p-4">
        <MediaControls 
          isAudioEnabled={conference.state.isAudioEnabled}
          isVideoEnabled={conference.state.isVideoEnabled}
          onToggleAudio={conference.actions.toggleAudio}
          onToggleVideo={conference.actions.toggleVideo}
          onEndCall={conference.actions.leaveConference}
        />
      </footer>
    </div>
  );
}
```

### RoomLayout.tsx - Responsive Layout Manager

Implements a resizable layout using Shadcn's ResizablePanel components for optimal space utilization.

```typescript
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoGrid } from "../media/VideoGrid";
import { ChatPanel } from "../chat/ChatPanel";
import { ParticipantsList } from "../participants/ParticipantsList";

interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
}

interface RoomLayoutProps {
  participants: Map<string, Participant>;
  localStream: MediaStream | null;
  roomId: string;
}

export function RoomLayout({ participants, localStream, roomId }: RoomLayoutProps) {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Primary video area */}
      <ResizablePanel defaultSize={75} minSize={50} className="min-w-0">
        <VideoGrid 
          participants={participants}
          localStream={localStream}
        />
      </ResizablePanel>
      
      <ResizableHandle withHandle className="w-2 bg-border hover:bg-border/80" />
      
      {/* Secondary sidebar */}
      <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="min-w-0">
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
            <TabsTrigger value="chat" className="rounded-none">
              Chat
            </TabsTrigger>
            <TabsTrigger value="participants" className="rounded-none">
              Participants
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="flex-1 mt-0 p-0">
            <ChatPanel roomId={roomId} />
          </TabsContent>
          
          <TabsContent value="participants" className="flex-1 mt-0 p-0">
            <ParticipantsList participants={participants} />
          </TabsContent>
        </Tabs>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

### VideoGrid.tsx - Participant Video Display

Component for rendering video streams using your media hooks architecture.

```typescript
import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, Users } from "lucide-react";
import { useMediaStream } from "@/hooks/useMediaStream";
import { useRoomStore } from "@/store/useRoomStore";
import { cn } from "@/lib/utils";
import { VideoTile } from "./VideoTile";

interface VideoGridProps {
  className?: string;
  maxVisible?: number;
  gridLayout?: 'auto' | 'speaker' | 'gallery';
}

export function VideoGrid({ 
  className, 
  maxVisible = 12,
  gridLayout = 'auto'
}: VideoGridProps) {
  const { 
    participants, 
    localParticipant,
    activeSpeaker,
    roomState 
  } = useRoomStore();

  const media = useMediaStream({
    autoStart: false,
    video: { width: 1280, height: 720 },
    audio: { echoCancellation: true, noiseSuppression: true }
  });

  const {
    localStream,
    remoteStreams,
    isVideoEnabled,
    isAudioEnabled,
    deviceInfo
  } = media;

  // Convert participants Map to array for rendering
  const participantList = React.useMemo(() => {
    const list = Array.from(participants.values());
    
    // Always show local participant first
    if (localParticipant) {
      return [localParticipant, ...list.filter(p => p.id !== localParticipant.id)];
    }
    
    return list;
  }, [participants, localParticipant]);

  // Determine grid layout classes based on participant count
  const getGridClasses = React.useCallback((count: number) => {
    if (gridLayout === 'speaker' && activeSpeaker) {
      return "grid grid-cols-1 gap-2"; // Single speaker view
    }
    
    if (count === 1) return "grid grid-cols-1";
    if (count === 2) return "grid grid-cols-2 gap-2";
    if (count <= 4) return "grid grid-cols-2 gap-2";
    if (count <= 6) return "grid grid-cols-3 gap-2";
    if (count <= 9) return "grid grid-cols-3 gap-2";
    
    return "grid grid-cols-4 gap-2"; // Max 4x3 grid
  }, [gridLayout, activeSpeaker]);

  // Handle empty state
  if (participantList.length === 0) {
    return (
      <Card className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-center space-y-4">
          <Users className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium">Waiting for participants</h3>
            <p className="text-sm text-muted-foreground">
              Share the room link to invite others
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const visibleParticipants = participantList.slice(0, maxVisible);
  const overflowCount = Math.max(0, participantList.length - maxVisible);

  return (
    <div className={cn("relative", className)}>
      {/* Speaker view for active speaker mode */}
      {gridLayout === 'speaker' && activeSpeaker && (
        <div className="mb-4">
          <VideoTile
            participant={activeSpeaker}
            stream={activeSpeaker.id === localParticipant?.id ? localStream : remoteStreams.get(activeSpeaker.id)}
            isLocal={activeSpeaker.id === localParticipant?.id}
            isActiveSpeaker={true}
            className="aspect-video w-full max-h-[60vh]"
            showControls={activeSpeaker.id === localParticipant?.id}
          />
        </div>
      )}

      {/* Participant grid */}
      <div className={getGridClasses(visibleParticipants.length)}>
        {visibleParticipants.map((participant) => {
          const isLocal = participant.id === localParticipant?.id;
          const stream = isLocal ? localStream : remoteStreams.get(participant.id);
          const isActiveSpeaking = activeSpeaker?.id === participant.id;
          
          return (
            <VideoTile
              key={participant.id}
              participant={participant}
              stream={stream}
              isLocal={isLocal}
              isActiveSpeaker={isActiveSpeaking}
              showControls={isLocal}
              className={cn(
                "aspect-video",
                gridLayout === 'speaker' && activeSpeaker && !isActiveSpeaking && "max-h-32"
              )}
            />
          );
        })}
      </div>

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <Card className="absolute bottom-4 right-4 p-2">
          <Badge variant="secondary" className="text-xs">
            +{overflowCount} more
          </Badge>
        </Card>
      )}

      {/* Media status indicators */}
      {localParticipant && (
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge 
            variant={isVideoEnabled ? "default" : "destructive"}
            className="flex items-center gap-1"
          >
            {isVideoEnabled ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
            Video
          </Badge>
          
          <Badge 
            variant={isAudioEnabled ? "default" : "destructive"}
            className="flex items-center gap-1"
          >
            {isAudioEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
            Audio
          </Badge>
          
          {deviceInfo.hasCamera === false && (
            <Badge variant="outline" className="text-xs">
              No Camera
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
```

### VideoTile.tsx - Individual Video Component

Professional video tile with accessibility features and visual feedback indicators.

```typescript
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MicIcon, MicOffIcon, VideoOffIcon } from "lucide-react";
import { useRef, useEffect } from "react";

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal: boolean;
  isMuted?: boolean;
  isVideoEnabled?: boolean;
  isSpeaking?: boolean;
  avatarUrl?: string;
}

export function VideoTile({
  stream,
  name,
  isLocal,
  isMuted = false,
  isVideoEnabled = true,
  isSpeaking = false,
  avatarUrl
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden bg-muted transition-all duration-200",
        isSpeaking && "ring-2 ring-green-500 ring-offset-2",
        "hover:shadow-lg"
      )}
    >
      {/* Video content */}
      {stream && isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || isMuted}
          className="w-full h-full object-cover"
          aria-label={`Video feed for ${name}`}
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <Avatar className="w-16 h-16 lg:w-20 lg:h-20">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="text-lg font-semibold">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      {/* Information overlay */}
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between">
        <Badge 
          variant="secondary" 
          className="text-xs font-medium bg-black/60 text-white border-0"
        >
          {name}
        </Badge>
        
        <div className="flex gap-1">
          {!isVideoEnabled && (
            <Badge 
              variant="destructive" 
              className="p-1 h-6 w-6 flex items-center justify-center"
              aria-label="Camera off"
            >
              <VideoOffIcon className="h-3 w-3" />
            </Badge>
          )}
          
          {isMuted && (
            <Badge 
              variant="destructive" 
              className="p-1 h-6 w-6 flex items-center justify-center"
              aria-label="Microphone muted"
            >
              <MicOffIcon className="h-3 w-3" />
            </Badge>
          )}
        </div>
      </div>
      
      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="absolute top-2 right-2">
          <Badge className="bg-green-500 text-white border-0 animate-pulse">
            <MicIcon className="h-3 w-3" />
          </Badge>
        </div>
      )}
    </Card>
  );
}
```

### MediaControls.tsx - Professional Control Bar

Accessible media controls integrated with your hooks architecture and tooltips for clear visual feedback.

```typescript
import React from 'react';
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { 
  MicIcon, 
  MicOffIcon, 
  VideoIcon, 
  VideoOffIcon, 
  PhoneIcon, 
  SettingsIcon,
  ScreenShareIcon,
  WifiIcon,
  WifiOffIcon
} from "lucide-react";
import { useMediaStream } from "@/hooks/useMediaStream";
import { useRoomConnection } from "@/hooks/useRoomConnection";
import { useDeviceCapabilities } from "@/hooks/useDeviceCapabilities";

interface MediaControlsProps {
  onEndCall?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

export function MediaControls({
  onEndCall,
  onOpenSettings,
  className
}: MediaControlsProps) {
  // =================== HOOK INTEGRATION ===================
  const media = useMediaStream({
    autoStart: false,
    video: { width: 1280, height: 720 },
    audio: { echoCancellation: true, noiseSuppression: true }
  });

  const connection = useRoomConnection({
    maxRetries: 5,
    retryDelay: 3000,
    autoReconnect: true,
    connectionTimeout: 15000
  });

  const devices = useDeviceCapabilities();

  const {
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    deviceInfo,
    streamState,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare
  } = media;

  const { connectionState, isConnected } = connection;
  const { hasCamera, hasMicrophone, hasScreenShare } = devices;

  // =================== HANDLERS ===================
  
  const handleToggleVideo = React.useCallback(async () => {
    if (!hasCamera) return;
    await toggleVideo();
  }, [hasCamera, toggleVideo]);

  const handleToggleAudio = React.useCallback(async () => {
    if (!hasMicrophone) return;
    await toggleAudio();
  }, [hasMicrophone, toggleAudio]);

  const handleToggleScreenShare = React.useCallback(async () => {
    if (!hasScreenShare) return;
    
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  }, [hasScreenShare, isScreenSharing, startScreenShare, stopScreenShare]);

  // =================== PERMISSION ALERTS ===================
  
  // Show permission alerts for missing capabilities
  const showPermissionAlert = !hasCamera || !hasMicrophone;

  return (
    <TooltipProvider>
      <div className={cn("space-y-4", className)}>
        {/* Permission alerts */}
        {showPermissionAlert && (
          <Alert>
            <AlertDescription>
              {!hasCamera && !hasMicrophone && "Camera and microphone access required for video calls."}
              {!hasCamera && hasMicrophone && "Camera access required for video."}
              {hasCamera && !hasMicrophone && "Microphone access required for audio."}
            </AlertDescription>
          </Alert>
        )}

        {/* Main controls bar */}
        <div className="flex items-center justify-center gap-3">
          {/* Primary controls */}
          <div className="flex items-center gap-2">
            {/* Audio toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  pressed={isAudioEnabled}
                  onPressedChange={handleToggleAudio}
                  variant="outline"
                  size="lg"
                  disabled={!hasMicrophone || streamState.audio === 'requesting'}
                  className={cn(
                    "h-12 w-12 rounded-full transition-all",
                    !isAudioEnabled && "bg-destructive text-destructive-foreground hover:bg-destructive/80",
                    !hasMicrophone && "opacity-50 cursor-not-allowed"
                  )}
                  aria-label={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {streamState.audio === 'requesting' ? (
                    <div className="h-5 w-5 animate-spin border-2 border-current border-t-transparent rounded-full" />
                  ) : isAudioEnabled ? (
                    <MicIcon className="h-5 w-5" />
                  ) : (
                    <MicOffIcon className="h-5 w-5" />
                  )}
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                {!hasMicrophone 
                  ? "Microphone not available" 
                  : streamState.audio === 'requesting' 
                    ? "Requesting microphone access..."
                    : isAudioEnabled 
                      ? 'Mute microphone (M)' 
                      : 'Unmute microphone (M)'
                }
              </TooltipContent>
            </Tooltip>

            {/* Video toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  pressed={isVideoEnabled}
                  onPressedChange={handleToggleVideo}
                  variant="outline"
                  size="lg"
                  disabled={!hasCamera || streamState.video === 'requesting'}
                  className={cn(
                    "h-12 w-12 rounded-full transition-all",
                    !isVideoEnabled && "bg-destructive text-destructive-foreground hover:bg-destructive/80",
                    !hasCamera && "opacity-50 cursor-not-allowed"
                  )}
                  aria-label={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                >
                  {streamState.video === 'requesting' ? (
                    <div className="h-5 w-5 animate-spin border-2 border-current border-t-transparent rounded-full" />
                  ) : isVideoEnabled ? (
                    <VideoIcon className="h-5 w-5" />
                  ) : (
                    <VideoOffIcon className="h-5 w-5" />
                  )}
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                {!hasCamera 
                  ? "Camera not available" 
                  : streamState.video === 'requesting' 
                    ? "Requesting camera access..."
                    : isVideoEnabled 
                      ? 'Turn off camera (V)' 
                      : 'Turn on camera (V)'
                }
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Secondary controls */}
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-2">
            {/* Screen share */}
            {hasScreenShare && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={isScreenSharing}
                    onPressedChange={handleToggleScreenShare}
                    variant="outline"
                    size="lg"
                    disabled={streamState.screen === 'requesting'}
                    className="h-12 w-12 rounded-full"
                    aria-label={isScreenSharing ? 'Stop screen share' : 'Start screen share'}
                  >
                    {streamState.screen === 'requesting' ? (
                      <div className="h-5 w-5 animate-spin border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <ScreenShareIcon className="h-5 w-5" />
                    )}
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>
                  {streamState.screen === 'requesting' 
                    ? "Requesting screen share access..."
                    : isScreenSharing 
                      ? 'Stop screen share' 
                      : 'Share screen'
                  }
                </TooltipContent>
              </Tooltip>
            )}

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
                <TooltipContent>
                  Settings
                </TooltipContent>
              </Tooltip>
            )}

            {/* Connection status indicator */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant={isConnected ? "default" : "destructive"}
                  className="flex items-center gap-1 px-2 py-1"
                >
                  {isConnected ? (
                    <WifiIcon className="h-3 w-3" />
                  ) : (
                    <WifiOffIcon className="h-3 w-3" />
                  )}
                  {connectionState.status}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Connection: {connectionState.status}
                {connectionState.retryCount > 0 && ` (Retry ${connectionState.retryCount})`}
              </TooltipContent>
            </Tooltip>
          </div>

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
                <TooltipContent>
                  End call
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Device info display */}
        {deviceInfo && (
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            {deviceInfo.selectedCamera && (
              <span>📹 {deviceInfo.selectedCamera.label || 'Camera'}</span>
            )}
            {deviceInfo.selectedMicrophone && (
              <span>🎤 {deviceInfo.selectedMicrophone.label || 'Microphone'}</span>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
```

### ChatPanel.tsx - Integrated Chat Interface

Full-featured chat component with message history and real-time messaging capabilities.

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { useChat } from "@/hooks/useChat";

interface ChatPanelProps {
  roomId: string;
}

export function ChatPanel({ roomId }: ChatPanelProps) {
  const { messages, sendMessage, isConnected, unreadCount } = useChat(roomId);

  return (
    <Card className="h-full flex flex-col border-0 rounded-none">
      <CardHeader className="pb-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Chat</CardTitle>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        <Separator />
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-4">
          <MessageList 
            messages={messages} 
            isConnected={isConnected}
          />
        </ScrollArea>
        
        <div className="border-t bg-card">
          <MessageInput 
            onSend={sendMessage} 
            disabled={!isConnected}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

### MessageInput.tsx - Enhanced Message Composer

Professional message input with emoji picker, send button, and keyboard shortcuts.

```typescript
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SendIcon, SmileIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

const COMMON_EMOJIS = [
  '😀', '😂', '🤣', '😊', '😍', '🤔', '👍', '👎', 
  '❤️', '🎉', '🔥', '💯', '👏', '🙌', '✨', '⚡'
];

export function MessageInput({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message...",
  maxLength = 1000 
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSend(trimmedMessage);
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setIsEmojiOpen(false);
    inputRef.current?.focus();
  };

  // Auto-focus input when component mounts
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const canSend = message.trim().length > 0 && !disabled;
  const isNearLimit = message.length > maxLength * 0.8;

  return (
    <TooltipProvider>
      <div className="flex gap-2 p-3 bg-background">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "pr-10 transition-colors",
              isNearLimit && "border-warning"
            )}
            aria-label="Message input"
          />
          
          {/* Character count indicator */}
          {isNearLimit && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {message.length}/{maxLength}
            </div>
          )}
        </div>
        
        {/* Emoji picker */}
        <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  disabled={disabled}
                  aria-label="Add emoji"
                >
                  <SmileIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Add emoji</TooltipContent>
          </Tooltip>
          
          <PopoverContent className="w-auto p-2" align="end" sideOffset={5}>
            <div className="grid grid-cols-4 gap-1">
              {COMMON_EMOJIS.map(emoji => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEmojiSelect(emoji)}
                  className="h-8 w-8 p-0 hover:bg-accent"
                  aria-label={`Add ${emoji} emoji`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Send button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              onClick={handleSend} 
              disabled={!canSend}
              size="icon"
              className={cn(
                "transition-all",
                canSend && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              aria-label="Send message"
            >
              <SendIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Send message (Enter)
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
```

## Architecture & Integration Patterns

### Component Design Principles

Our implementation follows enterprise-grade patterns that ensure maintainability and scalability:

#### Single Responsibility Principle

Each component has one clear purpose and minimal external dependencies:

- `RoomContainer` - Orchestrates the entire conference experience
- `VideoGrid` - Manages video layout and participant display
- `MediaControls` - Handles user media interactions

#### Composition over Inheritance

Components are designed to be composed together rather than extended:

```typescript
// Good: Composition
<RoomContainer roomId="abc123">
  <VideoGrid participants={participants} />
  <ChatPanel roomId="abc123" />
</RoomContainer>

// Avoid: Complex inheritance hierarchies
```

#### Hook Integration Pattern

Your sophisticated hooks architecture provides clean separation between business logic and UI components:

```typescript
// Component uses multiple specialized hooks
function RoomContainer({ roomId, username }: RoomContainerProps) {
  // Connection management
  const connection = useRoomConnection({
    maxRetries: 5,
    retryDelay: 3000,
    autoReconnect: true,
    connectionTimeout: 15000
  });

  // Media stream handling
  const media = useMediaStream({
    autoStart: false,
    video: { width: 1280, height: 720 },
    audio: { echoCancellation: true, noiseSuppression: true }
  });

  // Room state management
  const { participants, localParticipant } = useRoomStore();

  // UI state management
  const ui = useRoomUI();

  // Component handles presentation only
  return (
    <div className="h-screen flex flex-col">
      <RoomHeader 
        roomId={roomId}
        participantCount={participants.size}
        onLeave={connection.disconnect}
      />
      <VideoGrid 
        participants={participants}
        localStream={media.localStream}
        gridLayout={ui.gridLayout}
      />
      <MediaControls 
        onEndCall={connection.disconnect}
      />
    </div>
  );
}
```

### Type Safety & Interfaces

Your TypeScript interfaces provide complete type safety across the component hierarchy:

```typescript
// From your TYPESCRIPT_INTERFACES.md documentation
interface RoomConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
  lastError: string | null;
  retryCount: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

interface MediaStreamState {
  video: 'idle' | 'requesting' | 'active' | 'failed';
  audio: 'idle' | 'requesting' | 'active' | 'failed';
  screen: 'idle' | 'requesting' | 'active' | 'failed';
}

interface DeviceInfo {
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasScreenShare: boolean;
  selectedCamera: MediaDeviceInfo | null;
  selectedMicrophone: MediaDeviceInfo | null;
  availableCameras: MediaDeviceInfo[];
  availableMicrophones: MediaDeviceInfo[];
}

// Component props inherit from hook return types
interface VideoGridProps {
  participants: Map<string, Participant>;
  localStream: MediaStream | null;
  gridLayout?: 'auto' | 'speaker' | 'gallery';
  maxVisible?: number;
}
}

interface ConferenceActions {
  joinConference: () => void;
  leaveConference: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
}
```

### Performance Optimization

#### Memo Components for Expensive Renders

```typescript
import { memo } from 'react';

export const VideoTile = memo(({ stream, name, isLocal }: VideoTileProps) => {
  // Component implementation
});
```

#### Lazy Loading for Secondary Features

```typescript
import { lazy, Suspense } from 'react';

const DeviceSettings = lazy(() => import('./DeviceSettings'));

// Usage
<Suspense fallback={<Skeleton className="h-64 w-96" />}>
  <DeviceSettings />
</Suspense>
```

#### Efficient State Updates

```typescript
// Use callbacks to prevent unnecessary re-renders
const handleToggleAudio = useCallback(() => {
  conference.actions.toggleAudio();
}, [conference.actions]);
```

## Implementation Checklist

### Phase 1: Core Infrastructure

- [ ] Install required Shadcn UI components
- [ ] Set up component directory structure (`components/v1/`)
- [ ] Create shared TypeScript interfaces
- [ ] Implement `RoomContainer` (main orchestrator)
- [ ] Set up basic routing and navigation

### Phase 2: Video & Media

- [ ] Implement `VideoGrid` with responsive layout
- [ ] Create `VideoTile` with accessibility features
- [ ] Build `MediaControls` with keyboard shortcuts
- [ ] Add device selection (`DeviceSettings`)
- [ ] Test cross-browser media compatibility

### Phase 3: Communication

- [ ] Build `ChatPanel` with real-time messaging
- [ ] Implement `MessageInput` with emoji support
- [ ] Create `ParticipantsList` with user status
- [ ] Add notification system for chat messages
- [ ] Implement message persistence

### Phase 4: Polish & Accessibility

- [ ] Add comprehensive keyboard navigation
- [ ] Implement screen reader support
- [ ] Create responsive design for mobile devices
- [ ] Add loading states and error boundaries
- [ ] Optimize performance with React.memo and lazy loading

### Phase 5: Advanced Features

- [ ] Screen sharing capabilities
- [ ] Recording functionality
- [ ] Virtual backgrounds
- [ ] Breakout rooms
- [ ] Meeting analytics and insights

## Context Providers & Domain Separation

Your implementation uses individual context providers for clean domain separation:

```typescript
// providers/session-provider.tsx
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <RoomConnectionProvider>
      <MediaStreamProvider>
        <DeviceCapabilitiesProvider>
          {children}
        </DeviceCapabilitiesProvider>
      </MediaStreamProvider>
    </RoomConnectionProvider>
  );
}

// Individual domain contexts
export function RoomConnectionProvider({ children }: { children: React.ReactNode }) {
  // Room connection logic
}

export function MediaStreamProvider({ children }: { children: React.ReactNode }) {
  // Media stream management
}

export function DeviceCapabilitiesProvider({ children }: { children: React.ReactNode }) {
  // Device detection and management
}
```

## Testing Integration

Your Vitest setup provides comprehensive testing for components and hooks:

```typescript
// Component testing with hooks
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MediaControls } from '@/components/v1/media/components/MediaControls';

// Mock your hooks
vi.mock('@/hooks/useMediaStream', () => ({
  useMediaStream: () => ({
    isVideoEnabled: true,
    isAudioEnabled: true,
    toggleVideo: vi.fn(),
    toggleAudio: vi.fn(),
    streamState: { video: 'active', audio: 'active', screen: 'idle' }
  })
}));

describe('MediaControls', () => {
  it('renders with proper accessibility attributes', () => {
    render(<MediaControls />);
    
    expect(screen.getByLabelText(/mute microphone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/turn off camera/i)).toBeInTheDocument();
  });
});
```

## Best Practices Summary

**Component Organization:**

- Nested components folder structure (`components/v1/domain/components/`)
- Domain-driven design with clear boundaries
- Component-level error boundaries for resilience

**Hook Architecture:**

- Specialized hooks for specific concerns (connection, media, UI)
- Clear return type interfaces for all hooks
- Sophisticated state management with retry logic and error handling

**State Management:**

- Individual context providers for domain separation
- Zustand store for global room state
- Local component state for UI-specific concerns

**Styling & UI:**

- Tailwind CSS for utility-first styling
- Shadcn UI components for consistent design system
- Hooks-only UI pattern (no class components)

**Testing:**

- Vitest for fast unit and integration testing
- Component testing with proper hook mocking
- Accessibility testing for inclusive design

**Development Experience:**

- TypeScript interfaces for complete type safety
- Comprehensive documentation with examples
- Linting and formatting for code quality
- Leverage Shadcn's design system
- Maintain consistent spacing and typography

**Accessibility:**

- Add proper ARIA labels and roles
- Support keyboard navigation
- Test with screen readers
- Provide visual feedback for all interactions

**Performance:**

- Optimize video rendering with proper memoization
- Lazy load non-critical components
- Use efficient WebRTC stream management
- Monitor bundle size and loading performance

This implementation provides a solid foundation that mirrors the elegance and organization of your Go backend while delivering a modern, accessible, and performant user experience.
