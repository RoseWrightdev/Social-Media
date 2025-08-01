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

Organize components following domain-driven design principles:

```text
components/v1/
├── room/
│   ├── RoomContainer.tsx       # Main orchestrator component
│   ├── RoomHeader.tsx          # Room title, status, and controls
│   └── RoomLayout.tsx          # Resizable layout manager
├── media/
│   ├── VideoGrid.tsx           # Participant video grid
│   ├── VideoTile.tsx           # Individual video display
│   ├── MediaControls.tsx       # Audio/video toggle controls
│   └── DeviceSettings.tsx      # Camera/microphone selection
├── chat/
│   ├── ChatPanel.tsx           # Chat container and wrapper
│   ├── MessageList.tsx         # Message history display
│   └── MessageInput.tsx        # Message composition input
└── participants/
    ├── ParticipantsList.tsx    # Participant roster
    └── ParticipantCard.tsx     # Individual participant info
```

## Core Components

### RoomContainer.tsx - Main Application Entry Point

The primary orchestrator component that manages connection state and renders the appropriate UI.

```typescript
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConferenceRoom } from "@/hooks/useConferenceRoom";
import { RoomHeader } from "./RoomHeader";
import { RoomLayout } from "./RoomLayout";
import { MediaControls } from "../media/MediaControls";

interface RoomContainerProps {
  roomId: string;
}

export function RoomContainer({ roomId }: RoomContainerProps) {
  const conference = useConferenceRoom(roomId);

  // Loading/connection state
  if (!conference.state.isConnected) {
    return (
      <Card className="p-6 max-w-md mx-auto mt-8">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Join Conference</h2>
          <Button 
            onClick={conference.actions.joinConference}
            className="w-full"
            disabled={conference.status.loading}
          >
            {conference.status.loading ? 'Connecting...' : 'Join Room'}
          </Button>
        </div>
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

### VideoGrid.tsx - Adaptive Video Display

Responsive grid layout that automatically adjusts based on participant count with proper loading states.

```typescript
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VideoTile } from "./VideoTile";

interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
}

interface VideoGridProps {
  participants: Map<string, Participant>;
  localStream: MediaStream | null;
}

export function VideoGrid({ participants, localStream }: VideoGridProps) {
  const participantArray = Array.from(participants.values());
  const totalParticipants = participantArray.length + (localStream ? 1 : 0);
  
  // Empty state
  if (totalParticipants === 0) {
    return (
      <Card className="h-full flex items-center justify-center m-4">
        <div className="text-center space-y-4 p-8">
          <Skeleton className="h-32 w-48 mx-auto rounded-lg" />
          <Alert>
            <AlertDescription>
              Waiting for participants to join the conference...
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    );
  }

  return (
    <div className="h-full p-4">
      <div className={`grid gap-4 h-full ${getGridClass(totalParticipants)}`}>
        {/* Local video stream */}
        {localStream && (
          <VideoTile
            key="local"
            stream={localStream}
            name="You"
            isLocal={true}
            isMuted={true}
            isVideoEnabled={true}
            isSpeaking={false}
          />
        )}
        
        {/* Remote participant streams */}
        {participantArray.map(participant => (
          <VideoTile
            key={participant.id}
            stream={participant.stream}
            name={participant.name}
            isLocal={false}
            isMuted={!participant.isAudioEnabled}
            isVideoEnabled={participant.isVideoEnabled}
            isSpeaking={participant.isSpeaking}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Determines optimal grid layout based on participant count
 */
function getGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 4) return "grid-cols-2 lg:grid-cols-2";
  if (count <= 9) return "grid-cols-2 lg:grid-cols-3";
  if (count <= 16) return "grid-cols-3 lg:grid-cols-4";
  return "grid-cols-4 lg:grid-cols-5";
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

Accessible media controls with tooltips and clear visual feedback for all user interactions.

```typescript
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  MicIcon, 
  MicOffIcon, 
  VideoIcon, 
  VideoOffIcon, 
  PhoneIcon, 
  SettingsIcon,
  ScreenShareIcon 
} from "lucide-react";

interface MediaControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall?: () => void;
  onOpenSettings?: () => void;
  onToggleScreenShare?: () => void;
  isScreenSharing?: boolean;
}

export function MediaControls({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  onOpenSettings,
  onToggleScreenShare,
  isScreenSharing = false
}: MediaControlsProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center justify-center gap-3">
        {/* Primary controls */}
        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={isAudioEnabled}
                onPressedChange={onToggleAudio}
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

          {/* Video toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                pressed={isVideoEnabled}
                onPressedChange={onToggleVideo}
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
        </div>

        {/* Secondary controls */}
        {(onToggleScreenShare || onOpenSettings) && (
          <>
            <Separator orientation="vertical" className="h-8" />
            <div className="flex items-center gap-2">
              {/* Screen share */}
              {onToggleScreenShare && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      pressed={isScreenSharing}
                      onPressedChange={onToggleScreenShare}
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
            </div>
          </>
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
              <TooltipContent>
                End call (Ctrl+D)
              </TooltipContent>
            </Tooltip>
          </>
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

Business logic stays in custom hooks, UI components remain pure:

```typescript
// Hook handles business logic
const conference = useConferenceRoom(roomId);

// Component handles presentation
return (
  <MediaControls
    isAudioEnabled={conference.state.isAudioEnabled}
    onToggleAudio={conference.actions.toggleAudio}
  />
);
```

### Type Safety & Interfaces

Define clear TypeScript interfaces for all component props:

```typescript
// Define shared types
interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isSpeaking: boolean;
  joinedAt: Date;
}

interface ConferenceState {
  participants: Map<string, Participant>;
  localStream: MediaStream | null;
  isConnected: boolean;
  roomId: string;
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

## Best Practices Summary

**Component Organization:**

- Group by domain (room, media, chat, participants)
- Use consistent naming conventions
- Keep components focused and reusable

**State Management:**

- Business logic in custom hooks
- UI state in component local state
- Global state for cross-cutting concerns

**Styling:**

- Use Tailwind utility classes consistently
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
