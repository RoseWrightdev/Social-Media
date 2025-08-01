# Shadcn UI Component Architecture Guide

## Overview

This guide provides a comprehensive framework for implementing video conferencing UI components using Shadcn UI, following enterprise-grade architectural patterns that mirror your Go backend's organization and elegance.

**Key Architectural Principles:**

- **Domain-Driven Design** - Components organized by business domain (room, media, chat, participants)
- **Single Responsibility** - Each component has one clear purpose and minimal dependencies
- **Composable Architecture** - Building blocks that combine seamlessly
- **Type Safety** - Full TypeScript integration with proper interfaces
- **Accessibility First** - WCAG compliant with comprehensive screen reader supp## Implementation Strategy

### Component Integration Philosophy

Each Shadcn component is carefully selected and configured to work seamlessly with your existing hooks architecture:

**Separation of Concerns:**

- **Shadcn Components** - Handle presentation and user interaction
- **Custom Hooks** - Manage business logic and state
- **TypeScript Interfaces** - Ensure type safety across the application
- **Tailwind Classes** - Provide consistent styling and responsive design

### Development Workflow

#### Phase 1: Foundation Setup

1. **Install Required Components**

   ```bash
   npx shadcn@latest add card button toggle avatar badge
   npx shadcn@latest add input dialog tabs scroll-area
   npx shadcn@latest add resizable-panels skeleton alert
   ```

2. **Create Type Definitions**

   ```typescript
   // types/conference.ts
   interface Participant {
     id: string;
     name: string;
     avatarUrl?: string;
     isAudioEnabled: boolean;
     isVideoEnabled: boolean;
     isSpeaking: boolean;
     isHost: boolean;
     connectionStatus: 'connected' | 'connecting' | 'disconnected';
   }
   ```

3. **Set Up Component Structure**

   ```text
   components/v1/
   ├── room/       # Conference orchestration
   ├── media/      # Video and audio components  
   ├── chat/       # Messaging components
   └── shared/     # Reusable UI components
   ```

#### Phase 2: Core Implementation

Build components in order of dependency:

1. **Shared Components** - Avatar, badges, basic controls
2. **Media Components** - Video tiles, control bars
3. **Layout Components** - Resizable panels, grids
4. **Feature Components** - Chat, participant lists
5. **Integration** - Connect hooks to UI components

#### Phase 3: Polish & Accessibility

- Add comprehensive keyboard navigation
- Implement screen reader support  
- Test responsive behavior
- Optimize performance with React.memo
- Add loading states and error boundaries

### Quality Assurance

**Accessibility Standards:**

- WCAG 2.1 AA compliance
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- Color contrast requirements

**Performance Metrics:**

- Component render optimization
- Bundle size monitoring
- WebRTC stream efficiency
- Memory usage tracking
- Load time optimization

**Cross-Browser Testing:**

- Chrome, Firefox, Safari, Edge
- Mobile responsive design
- WebRTC compatibility
- Touch interaction support
- Fallback mechanisms

## Best Practices Summary

**Component Design:**

- Single responsibility per component
- Prop-driven configuration
- Consistent naming conventions
- Proper TypeScript interfaces
- Comprehensive error handling

**State Management:**

- Business logic in custom hooks
- UI state in component local state
- Minimal prop drilling
- Efficient re-render patterns
- Clear data flow

**Styling Approach:**

- Utility-first with Tailwind CSS
- Consistent design tokens
- Responsive breakpoints
- Dark/light mode support
- Accessible color schemes

**Integration Patterns:**

- Hook-first architecture
- Component composition
- Event-driven interactions
- Proper loading states
- Graceful error handling

This architecture provides a robust foundation that mirrors your Go backend's elegance while delivering a modern, accessible, and maintainable frontend experience.omponent Organization Strategy

### Domain-Based Structure

Following your backend's layered architecture, components are organized by domain responsibility:

```text
components/v1/
├── room/           # Conference room orchestration
├── media/          # Video, audio, and streaming
├── chat/           # Real-time messaging
├── participants/   # User management and presence
└── shared/         # Reusable UI primitives
```

## Core UI Component Categories

### Layout & Structure Components

These components provide the foundational layout and container structure for the application.

#### Card - Primary Container Component

Professional container for all major UI sections with consistent styling and spacing.

```typescript
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Conference room container
<Card className="h-full bg-card border-border">
  <CardHeader className="border-b border-border/40">
    <CardTitle className="text-lg font-semibold">Conference Room</CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    <VideoGrid participants={participants} />
  </CardContent>
</Card>

// Chat panel with optimized layout
<Card className="h-full flex flex-col">
  <CardHeader className="pb-3 border-b">
    <CardTitle className="text-sm font-medium">Chat</CardTitle>
  </CardHeader>
  <CardContent className="flex-1 overflow-hidden p-0">
    <MessageList messages={messages} />
  </CardContent>
</Card>
```

**Use Cases:**

- Video section containers
- Chat panel wrappers
- Settings dialog content
- Participant list containers

#### ResizablePanels - Adaptive Layout System

Responsive layout system that allows users to customize their workspace.

```typescript
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

<ResizablePanelGroup 
  direction="horizontal" 
  className="h-screen bg-background"
>
  <ResizablePanel 
    defaultSize={75} 
    minSize={50}
    className="min-w-0"
  >
    <VideoGrid participants={participants} />
  </ResizablePanel>
  
  <ResizableHandle 
    withHandle 
    className="w-2 bg-border hover:bg-border/80 transition-colors" 
  />
  
  <ResizablePanel 
    defaultSize={25} 
    minSize={20} 
    maxSize={40}
    className="min-w-0"
  >
    <Tabs defaultValue="chat" className="h-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="chat">Chat</TabsTrigger>
        <TabsTrigger value="participants">Participants</TabsTrigger>
      </TabsList>
      <TabsContent value="chat">
        <ChatPanel roomId={roomId} />
      </TabsContent>
    </Tabs>
  </ResizablePanel>
</ResizablePanelGroup>
```

**Use Cases:**

- Main video/sidebar split
- Multi-panel dashboards
- Adjustable workspace layouts

#### ScrollArea - Optimized Content Scrolling

High-performance scrollable areas with consistent styling across browsers.

```typescript
import { ScrollArea } from "@/components/ui/scroll-area";

<ScrollArea className="h-64 w-full">
  <div className="space-y-2 p-4">
    {messages.map(message => (
      <MessageItem 
        key={message.id} 
        message={message}
        className="rounded-lg p-3 hover:bg-accent/50 transition-colors"
      />
    ))}
  </div>
</ScrollArea>
```

**Use Cases:**

- Chat message history
- Participant lists
- Settings panels
- Long form content

### Interactive Control Components

Professional controls for media management and user interactions with accessibility built-in.

#### Toggle - Media Control States

Accessible toggle controls for audio, video, and feature states with clear visual feedback.

```typescript
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { MicIcon, MicOffIcon, VideoIcon, VideoOffIcon } from "lucide-react";

interface MediaControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

function MediaControls({ 
  isAudioEnabled, 
  isVideoEnabled, 
  onToggleAudio, 
  onToggleVideo 
}: MediaControlsProps) {
  return (
    <div className="flex gap-3 items-center">
      <Toggle 
        pressed={isAudioEnabled}
        onPressedChange={onToggleAudio}
        variant="outline"
        size="lg"
        className={cn(
          "h-12 w-12 rounded-full transition-all duration-200",
          !isAudioEnabled && "bg-destructive text-destructive-foreground hover:bg-destructive/80"
        )}
        aria-label={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {isAudioEnabled ? (
          <MicIcon className="h-5 w-5" />
        ) : (
          <MicOffIcon className="h-5 w-5" />
        )}
      </Toggle>
      
      <Toggle 
        pressed={isVideoEnabled}
        onPressedChange={onToggleVideo}
        variant="outline"
        size="lg"
        className={cn(
          "h-12 w-12 rounded-full transition-all duration-200",
          !isVideoEnabled && "bg-destructive text-destructive-foreground hover:bg-destructive/80"
        )}
        aria-label={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {isVideoEnabled ? (
          <VideoIcon className="h-5 w-5" />
        ) : (
          <VideoOffIcon className="h-5 w-5" />
        )}
      </Toggle>
    </div>
  );
}
```

**Use Cases:**

- Audio/video mute controls
- Feature toggles (screen share, recording)
- Settings switches
- Preference controls

#### Button - Primary Actions

Professional action buttons with proper loading states and accessibility.

```typescript
import { Button } from "@/components/ui/button";
import { Loader2Icon, PhoneIcon, SendIcon } from "lucide-react";

interface ActionButtonsProps {
  onJoin: () => void;
  onLeave: () => void;
  onSendMessage: (message: string) => void;
  isConnecting: boolean;
  isConnected: boolean;
}

function ActionButtons({ 
  onJoin, 
  onLeave, 
  onSendMessage, 
  isConnecting, 
  isConnected 
}: ActionButtonsProps) {
  return (
    <div className="flex gap-2">
      {!isConnected ? (
        <Button 
          onClick={onJoin} 
          disabled={isConnecting}
          className="w-full h-12"
          size="lg"
        >
          {isConnecting ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            "Join Conference"
          )}
        </Button>
      ) : (
        <Button 
          onClick={onLeave} 
          variant="destructive"
          className="w-full h-12"
          size="lg"
        >
          <PhoneIcon className="mr-2 h-4 w-4 rotate-[135deg]" />
          End Call
        </Button>
      )}
      
      <Button 
        onClick={() => onSendMessage("Quick message")}
        variant="outline"
        size="icon"
        className="h-12 w-12"
      >
        <SendIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

**Use Cases:**

- Join/leave conference actions
- Send message buttons
- Settings confirmations
- Navigation actions

#### Slider - Audio and Quality Controls

Professional sliders for volume, quality, and setting adjustments with real-time feedback.

```typescript
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { VolumeIcon, Volume2Icon } from "lucide-react";

interface VolumeControlProps {
  volume: number;
  onVolumeChange: (value: number) => void;
  isMuted: boolean;
}

function VolumeControl({ volume, onVolumeChange, isMuted }: VolumeControlProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="volume-slider" className="text-sm font-medium">
          Volume
        </Label>
        <span className="text-sm text-muted-foreground">
          {Math.round(volume)}%
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        {isMuted ? (
          <VolumeIcon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Volume2Icon className="h-4 w-4" />
        )}
        
        <Slider
          id="volume-slider"
          value={[volume]}
          onValueChange={([value]) => onVolumeChange(value)}
          max={100}
          min={0}
          step={5}
          className="flex-1"
          aria-label="Adjust volume"
        />
      </div>
    </div>
  );
}
```

**Use Cases:**

- Volume controls
- Video quality settings
- Bandwidth adjustments
- Setting ranges and thresholds

### User Information Components

Components for displaying participant information with rich status indicators and interactive elements.

#### Avatar - Professional Participant Display

Accessible avatar components with status indicators and presence information.

```typescript
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ParticipantAvatarProps {
  participant: {
    id: string;
    name: string;
    avatarUrl?: string;
    isSpeaking: boolean;
    isHost: boolean;
    connectionStatus: 'connected' | 'connecting' | 'disconnected';
  };
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}

function ParticipantAvatar({ 
  participant, 
  size = 'md', 
  showStatus = true 
}: ParticipantAvatarProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base'
  };

  return (
    <div className="relative">
      <Avatar 
        className={cn(
          sizeClasses[size],
          participant.isSpeaking && "ring-2 ring-green-500 ring-offset-2 ring-offset-background"
        )}
      >
        <AvatarImage 
          src={participant.avatarUrl} 
          alt={`${participant.name}'s avatar`}
        />
        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
          {getInitials(participant.name)}
        </AvatarFallback>
      </Avatar>
      
      {/* Status indicators */}
      {showStatus && (
        <>
          {/* Connection status */}
          <div 
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
              participant.connectionStatus === 'connected' && "bg-green-500",
              participant.connectionStatus === 'connecting' && "bg-yellow-500",
              participant.connectionStatus === 'disconnected' && "bg-red-500"
            )}
            aria-label={`Connection status: ${participant.connectionStatus}`}
          />
          
          {/* Host badge */}
          {participant.isHost && (
            <Badge 
              variant="secondary" 
              className="absolute -top-1 -right-1 text-xs px-1 h-5"
            >
              Host
            </Badge>
          )}
        </>
      )}
    </div>
  );
}

// Participant card with full info
function ParticipantCard({ participant }: { participant: ParticipantAvatarProps['participant'] }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
      <ParticipantAvatar participant={participant} size="md" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{participant.name}</p>
        <p className="text-xs text-muted-foreground">
          {participant.isHost ? 'Host' : 'Participant'}
        </p>
      </div>
      
      {participant.isSpeaking && (
        <Badge variant="outline" className="text-xs">
          Speaking
        </Badge>
      )}
    </div>
  );
}
```

**Use Cases:**

- Participant thumbnails in video grid
- User profile displays
- Speaker identification
- Status and presence indicators

#### **Badge** - Status indicators

```typescript
// Usage: Connection status, participant count, feature indicators
import { Badge } from "@/components/ui/badge";

function ConnectionStatus({ status, latency }: ConnectionStatusProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'connected': return 'default';
      case 'connecting': return 'secondary';
      case 'disconnected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusVariant(status)}>
        {status.toUpperCase()}
      </Badge>
      
      {status === 'connected' && (
        <Badge variant="outline" className="text-xs">
          {latency}ms
        </Badge>
      )}
    </div>
  );
}
```

#### **Tooltip** - Helpful information

```typescript
// Usage: Control explanations, status details, help text
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function MediaControlsWithTooltips({ media }: { media: MediaControls }) {
  return (
    <TooltipProvider>
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle pressed={media.isAudioEnabled} onPressedChange={media.toggleAudio}>
              <MicIcon />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>
            <p>{media.isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
```

### **4. Communication Components**

#### **Input** - Chat message input

```typescript
// Usage: Text input, search, form fields
import { Input } from "@/components/ui/input";

function MessageInput({ onSend }: { onSend: (message: string) => void }) {
  const [message, setMessage] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) {
        onSend(message.trim());
        setMessage('');
      }
    }
  };

  return (
    <div className="flex gap-2 p-3 border-t">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="flex-1"
      />
      <Button 
        onClick={() => onSend(message)}
        disabled={!message.trim()}
        size="sm"
      >
        Send
      </Button>
    </div>
  );
}
```

#### **Popover** - Contextual actions

```typescript
// Usage: Emoji picker, participant actions, quick settings
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function EmojiPicker({ onEmojiSelect }: { onEmojiSelect: (emoji: string) => void }) {
  const emojis = ['😀', '😂', '❤️', '👍', '👎', '🎉'];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          😀
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="grid grid-cols-3 gap-1">
          {emojis.map(emoji => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              onClick={() => onEmojiSelect(emoji)}
              className="h-8 w-8 p-0"
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### **5. Settings & Configuration Components**

#### **Select** - Device and option selection

```typescript
// Usage: Camera selection, microphone selection, quality settings
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function DeviceSelector({ devices, selectedDevice, onDeviceChange }: DeviceSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Camera</label>
      <Select value={selectedDevice} onValueChange={onDeviceChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select camera" />
        </SelectTrigger>
        <SelectContent>
          {devices.map(device => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

#### **Dialog** - Settings and confirmations

```typescript
// Usage: Settings panel, confirmation dialogs, detailed forms
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function SettingsDialog({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Settings</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conference Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### **Tabs** - Organized settings sections

```typescript
// Usage: Settings categories, different views, organized content
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function SettingsPanel() {
  return (
    <Tabs defaultValue="video" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="video">Video</TabsTrigger>
        <TabsTrigger value="audio">Audio</TabsTrigger>
        <TabsTrigger value="general">General</TabsTrigger>
      </TabsList>
      
      <TabsContent value="video" className="space-y-4">
        <DeviceSelector type="camera" />
        <QualitySelector />
      </TabsContent>
      
      <TabsContent value="audio" className="space-y-4">
        <DeviceSelector type="microphone" />
        <VolumeControl />
      </TabsContent>
      
      <TabsContent value="general" className="space-y-4">
        <NotificationSettings />
        <PrivacySettings />
      </TabsContent>
    </Tabs>
  );
}
```

### **6. Feedback & State Components**

#### **Alert** - Error and status messages

```typescript
// Usage: Connection errors, warnings, important information
import { Alert, AlertDescription } from "@/components/ui/alert";

function ConnectionAlert({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

#### **Skeleton** - Loading states

```typescript
// Usage: Video loading, participant loading, content placeholders
import { Skeleton } from "@/components/ui/skeleton";

function VideoGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
```

#### **Progress** - Loading and upload progress

```typescript
// Usage: Connection progress, file uploads, initialization steps
import { Progress } from "@/components/ui/progress";

function ConnectionProgress({ progress, status }: { progress: number; status: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{status}</span>
        <span>{progress}%</span>
      </div>
      <Progress value={progress} className="w-full" />
    </div>
  );
}
```

## 🎯 **Component Integration Patterns**

### **Pattern 1: Hook Integration**

```typescript
// Each component uses your hooks for data and actions
function VideoControls() {
  const { toggleAudio, toggleVideo, isAudioEnabled, isVideoEnabled } = useMediaStream();
  
  return (
    <div className="flex gap-2">
      <Toggle pressed={isAudioEnabled} onPressedChange={toggleAudio}>
        <MicIcon />
      </Toggle>
      <Toggle pressed={isVideoEnabled} onPressedChange={toggleVideo}>
        <VideoIcon />
      </Toggle>
    </div>
  );
}
```

### **Pattern 2: Composition**

```typescript
// Combine components to build complex UI sections
function ConferenceRoom({ roomId }: { roomId: string }) {
  return (
    <Card className="h-screen flex flex-col">
      <CardHeader>
        <RoomHeader roomId={roomId} />
      </CardHeader>
      
      <CardContent className="flex-1 flex">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel>
            <VideoGrid roomId={roomId} />
          </ResizablePanel>
          <ResizablePanel>
            <ChatPanel roomId={roomId} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </CardContent>
      
      <div className="p-4 border-t">
        <MediaControls />
      </div>
    </Card>
  );
}
```

### **Pattern 3: State Management**

```typescript
// Components manage their own UI state, hooks handle business logic
function ParticipantsList() {
  const { participants } = useRoom();
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  
  return (
    <ScrollArea className="h-64">
      {Array.from(participants.values()).map(participant => (
        <ParticipantCard
          key={participant.id}
          participant={participant}
          isSelected={selectedParticipant === participant.id}
          onSelect={setSelectedParticipant}
        />
      ))}
    </ScrollArea>
  );
}
```

## 📋 **Implementation Checklist**

- [ ] Install required Shadcn components
- [ ] Create component structure in `components/v1/`
- [ ] Implement layout components (Card, ResizablePanels)
- [ ] Build interactive controls (Toggle, Button, Slider)
- [ ] Add user information displays (Avatar, Badge, Tooltip)
- [ ] Create communication components (Input, Popover)
- [ ] Implement settings components (Select, Dialog, Tabs)
- [ ] Add feedback components (Alert, Skeleton, Progress)
- [ ] Test component integration with your hooks
- [ ] Add proper TypeScript interfaces
- [ ] Implement responsive design
- [ ] Add accessibility features

This architecture gives you clean, reusable components that work seamlessly with your existing hooks while maintaining the same organized, domain-focused approach as your Go backend.
