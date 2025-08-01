# Video Conferencing Hooks Implementation Guide

A comprehensive guide to implementing and using the video conferencing hooks in your React components.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Advanced Usage Patterns](#advanced-usage-patterns)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Overview

The video conferencing platform provides a set of specialized React hooks that manage different aspects of the conferencing experience:

- **`useRoomConnection`** - Connection management and health monitoring
- **`useMediaStream`** - Local media stream management and device control
- **`useRoom`** - High-level room operations and state
- **`useParticipants`** - Participant management and interactions
- **`useMediaControls`** - Media device controls and capabilities
- **`useChat`** - Chat messaging functionality
- **`useRoomUI`** - UI state and layout management

## Architecture

```text
Component Layer
    ↓
Hook Layer (useRoom, useParticipants, etc.)
    ↓
Room Store (Zustand) - Global State Management
    ↓
WebRTC Manager & WebSocket Client - Core Communication
```

The hooks provide a clean abstraction over the complex room store, making it easy to build conferencing components without dealing with low-level WebRTC and WebSocket details.

## Step-by-Step Implementation

### Step 1: Project Setup and Hook Installation

Before using the hooks, ensure your project has the necessary dependencies and structure.

```bash
# Install required dependencies (if not already present)
npm install zustand react@19 typescript

# Verify your project structure includes:
# hooks/
#   useRoomConnection.ts
#   useMediaStream.ts
#   useRoom.ts
#   useParticipants.ts
#   useMediaControls.ts
#   useChat.ts
#   useRoomUI.ts
# store/
#   useRoomStore.ts
# lib/
#   websockets.ts
#   webrtc.ts
```

**Key Configuration Points:**

- TypeScript is required for type safety
- React 18+ for concurrent features
- Modern browser with WebRTC support

### Step 2: Environment Configuration

Set up your environment variables for the video conferencing backend.

```bash
# .env.local
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_STUN_SERVERS=stun:stun.l.google.com:19302
```

```tsx
// lib/config.ts
export const config = {
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  stunServers: [
    { urls: process.env.NEXT_PUBLIC_STUN_SERVERS || 'stun:stun.l.google.com:19302' }
  ]
};
```

### Step 4: Connection State Monitoring

Before building components, understand connection states and monitoring.

```tsx
// components/ConnectionMonitor.tsx
import React from 'react';
import { useRoomConnection } from '../hooks/useRoomConnection';

export const ConnectionMonitor = () => {
  const { connectionState, isConnected, quality, latency } = useRoomConnection();

  return (
    <div className="connection-monitor p-3 bg-gray-100 rounded text-sm">
      <h4 className="font-semibold mb-2">Connection Status</h4>
      
      {/* Status indicator with color coding */}
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-3 h-3 rounded-full ${
          connectionState.status === 'connected' ? 'bg-green-500' :
          connectionState.status === 'connecting' ? 'bg-yellow-500' :
          connectionState.status === 'reconnecting' ? 'bg-orange-500' :
          'bg-red-500'
        }`} />
        <span>Status: {connectionState.status}</span>
      </div>

      {/* Quality and performance metrics */}
      <div className="space-y-1 text-xs text-gray-600">
        <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
        <p>Quality: {quality}</p>
        <p>Latency: {latency}ms</p>
        <p>Retry Count: {connectionState.retryCount}</p>
        {connectionState.lastError && (
          <p className="text-red-600">Last Error: {connectionState.lastError}</p>
        )}
      </div>
    </div>
  );
};
```

**Connection States Explained:**

- **disconnected**: No connection to server
- **connecting**: Attempting initial connection
- **connected**: Successfully connected and operational
- **reconnecting**: Lost connection, attempting to restore
- **failed**: Connection failed after all retries

### Step 5: Basic WebSocket Connection

Let's start with the most basic video conferencing component that connects to a room.

```tsx
// components/BasicRoom.tsx
import React from 'react';
import { useRoomConnection } from '../hooks/useRoomConnection';

export const BasicRoom = () => {
  // Extract connection management functions and state from the useRoomConnection hook
  // This hook handles all the complex WebSocket connection logic behind the scenes
  const { 
    connect,         // Function to establish connection to the room
    disconnect,      // Function to cleanly disconnect from the room
    isConnected,     // Boolean indicating current connection status
    connectionState  // Detailed connection state object with status, retries, etc.
  } = useRoomConnection();

  // Handler function for the connect button
  // This demonstrates proper async/await pattern with error handling
  const handleConnect = async () => {
    try {
      // Call the connect function from the hook
      // This will establish WebSocket connection and perform room handshake
      await connect();
      console.log('Connected to room successfully');
    } catch (error) {
      // Always handle connection errors gracefully
      // In production, you'd want to show user-friendly error messages
      console.error('Failed to connect:', error);
    }
  };

  return (
    <div className="p-4">
      <h2>Basic Room Connection</h2>
      
      {/* Status display section - shows current connection information */}
      <div className="mb-4">
        {/* connectionState.status can be: 'disconnected', 'connecting', 'connected', 'reconnecting', 'failed' */}
        <p>Status: {connectionState.status}</p>
        {/* isConnected is a computed boolean for easy conditional rendering */}
        <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      </div>

      {/* Action buttons with proper disabled states */}
      <div className="space-x-2">
        <button 
          onClick={handleConnect}
          disabled={isConnected}  // Disable when already connected to prevent double-connection
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Connect
        </button>
        
        <button 
          onClick={disconnect}  // disconnect is already a function from the hook
          disabled={!isConnected}  // Disable when not connected - nothing to disconnect
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
};
```

### Step 2: Adding Media Stream Support

Now let's add media stream functionality to capture the user's camera and microphone.

```tsx
// components/MediaRoom.tsx
import React, { useEffect } from 'react';
import { useRoomConnection } from '../hooks/useRoomConnection';
import { useMediaStream } from '../hooks/useMediaStream';

export const MediaRoom = () => {
  // First, get connection management functions
  // We need room connection before we can share media with other participants
  const { connect, disconnect, isConnected } = useRoomConnection();
  
  // Now get media stream management functions and state
  // This hook handles camera, microphone, and all media device operations
  const {
    initializeStream,    // Function to start camera and microphone capture
    localStream,         // The actual MediaStream object containing audio/video tracks
    isInitialized,       // Boolean indicating if media stream is ready
    isStarting,          // Boolean indicating if initialization is in progress
    error,              // String containing any media-related error messages
    toggleAudio,        // Function to mute/unmute microphone
    toggleVideo,        // Function to start/stop camera
    isAudioEnabled,     // Boolean indicating if microphone is currently enabled
    isVideoEnabled,     // Boolean indicating if camera is currently enabled
    cleanup             // Function to properly release media resources
  } = useMediaStream({
    // Configuration object passed to useMediaStream
    video: { width: 1280, height: 720 },  // Request specific video resolution
    audio: { echoCancellation: true }      // Enable audio echo cancellation
  });

  // Cleanup effect - CRITICAL for preventing memory leaks and releasing camera/mic
  // This runs when the component unmounts or dependencies change
  useEffect(() => {
    return () => {
      // Cleanup function runs on unmount
      cleanup();     // Release camera and microphone resources
      disconnect();  // Close WebSocket connection
    };
  }, [cleanup, disconnect]); // Dependencies ensure functions are stable

  // Combined startup handler - demonstrates proper sequencing
  // Room connection must happen before media initialization
  const handleStart = async () => {
    try {
      // Step 1: Connect to the room first
      // This establishes WebSocket connection and authenticates with server
      await connect();
      
      // Step 2: Initialize media stream after successful room connection
      // This requests browser permissions and creates MediaStream object
      await initializeStream();
      
      console.log('Room and media ready');
    } catch (error) {
      // Catch any errors from either connection or media initialization
      console.error('Setup failed:', error);
    }
  };

  return (
    <div className="p-4">
      <h2>Media Room</h2>
      
      {/* Connection and Media Status Display */}
      <div className="mb-4 p-2 border rounded">
        {/* Show room connection status with visual indicator */}
        <p>Room Connected: {isConnected ? '✓' : '✗'}</p>
        {/* Show media initialization status with visual indicator */}
        <p>Media Ready: {isInitialized ? '✓' : '✗'}</p>
        {/* Display any media errors to help users troubleshoot */}
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>

      {/* Media Controls - Only show when media is initialized */}
      {isInitialized && (
        <div className="mb-4 space-x-2">
          <button
            onClick={toggleAudio}  // This function handles mute/unmute logic
            // Dynamic styling based on audio state - green when enabled, red when muted
            className={`px-4 py-2 rounded ${
              isAudioEnabled ? 'bg-green-500' : 'bg-red-500'
            } text-white`}
          >
            {/* Dynamic button text based on current state */}
            {isAudioEnabled ? 'Mute' : 'Unmute'}
          </button>
          
          <button
            onClick={toggleVideo}  // This function handles camera start/stop logic
            // Dynamic styling based on video state - green when enabled, red when stopped
            className={`px-4 py-2 rounded ${
              isVideoEnabled ? 'bg-green-500' : 'bg-red-500'
            } text-white`}
          >
            {/* Dynamic button text based on current state */}
            {isVideoEnabled ? 'Stop Video' : 'Start Video'}
          </button>
        </div>
      )}

      {/* Local Video Display - Only show when we have a media stream */}
      {localStream && (
        <div className="mb-4">
          <h3>Your Video</h3>
          <video
            // Use ref callback pattern to set srcObject when video element is available
            ref={(video) => {
              if (video && localStream) {
                // Assign the MediaStream to the video element's srcObject
                // This is the modern way to display media streams (not src attribute)
                video.srcObject = localStream;
              }
            }}
            autoPlay      // Start playing automatically when stream is set
            muted         // Mute local video to prevent audio feedback
            playsInline   // Prevent fullscreen on mobile devices
            className="w-64 h-48 bg-black rounded"
          />
        </div>
      )}

      {/* Main Action Button */}
      <button
        onClick={handleStart}
        // Disable during startup or when already ready to prevent multiple initialization
        disabled={isStarting || (isConnected && isInitialized)}
        className="px-6 py-3 bg-blue-500 text-white rounded text-lg"
      >
        {/* Dynamic button text based on current state */}
        {isStarting ? 'Starting...' : 'Start Video Call'}
      </button>
    </div>
  );
};
```

### Step 3: Adding Room Management

Let's enhance our component with high-level room management using the `useRoom` hook.

```tsx
// components/ManagedRoom.tsx
import React, { useState } from 'react';
import { useRoom } from '../hooks/useRoom';
import { useMediaStream } from '../hooks/useMediaStream';

export const ManagedRoom = () => {
  // Local state for form inputs - these are controlled components
  const [roomId, setRoomId] = useState('');      // Room identifier entered by user
  const [username, setUsername] = useState('');  // Display name for this user
  
  // useRoom provides high-level room operations and state management
  // This abstracts away the complexity of WebSocket connection + authentication
  const {
    joinRoomWithAuth,     // Combined function: connect + authenticate + join room
    exitRoom,             // Clean exit from room with proper cleanup
    isJoined,             // Boolean: has user successfully joined the room?
    isHost,               // Boolean: does user have host privileges?
    isWaitingRoom,        // Boolean: is user waiting for host approval?
    isRoomReady,          // Boolean: is room fully operational (connected + joined + approved)?
    hasConnectionIssues,  // Boolean: are there network connectivity problems?
    currentUsername       // String: the username actually set in the room (may differ from input)
  } = useRoom();

  // useMediaStream with manual initialization (autoStart: false)
  // We want to control when media starts - after room joining is successful
  const {
    initializeStream,     // Function to start camera/microphone capture
    localStream,          // The MediaStream object containing video/audio tracks
    isInitialized,        // Boolean: is media stream ready for use?
    toggleAudio,          // Function to mute/unmute microphone
    toggleVideo,          // Function to start/stop camera
    isAudioEnabled,       // Boolean: is microphone currently active?
    isVideoEnabled        // Boolean: is camera currently active?
  } = useMediaStream({
    autoStart: false,     // Don't start media automatically - we'll control timing
    video: true,          // Enable video capture (uses default constraints)
    audio: true           // Enable audio capture (uses default constraints)
  });

  // Room joining handler with validation and error handling
  const handleJoinRoom = async () => {
    // Input validation - ensure required fields are filled
    if (!roomId || !username) {
      alert('Please enter room ID and username');
      return;
    }

    try {
      // Get JWT token for authentication
      // In a real application, this would come from your authentication system
      // You might get it from a login flow, OAuth provider, or session storage
      const token = localStorage.getItem('authToken') || 'demo-token';
      
      // Join the room with authentication
      // This single function call handles:
      // 1. WebSocket connection establishment
      // 2. JWT token validation with backend
      // 3. Room join request
      // 4. Waiting room handling (if enabled)
      await joinRoomWithAuth(roomId, username, token);
      
      // Initialize media after successful room joining
      // We do this AFTER joining to ensure we're ready to share media
      await initializeStream();
      
    } catch (error) {
      // Handle any errors during the join process
      // Could be network issues, authentication failures, room full, etc.
      console.error('Failed to join room:', error);
    }
  };

  // Simple room exit handler
  const handleLeaveRoom = () => {
    // exitRoom handles all cleanup:
    // - Stops media streams
    // - Notifies other participants
    // - Closes WebSocket connection
    // - Resets room state
    exitRoom();
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2>Managed Video Room</h2>

      {/* Join Form - Only shown when not connected to any room */}
      {!isJoined && (
        <div className="mb-6 p-4 border rounded">
          <h3 className="mb-3">Join Room</h3>
          
          <div className="space-y-3">
            {/* Room ID input - identifies which room to join */}
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}  // Controlled component
              className="w-full p-2 border rounded"
            />
            
            {/* Username input - display name in the room */}
            <input
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}  // Controlled component
              className="w-full p-2 border rounded"
            />
            
            {/* Join button triggers the room joining process */}
            <button
              onClick={handleJoinRoom}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded"
            >
              Join Room
            </button>
          </div>
        </div>
      )}

      {/* Room Status Display - Only shown when joined to a room */}
      {isJoined && (
        <div className="mb-4 p-3 border rounded">
          <h3>Room Status</h3>
          {/* Display current room information */}
          <p>Room ID: {roomId}</p>
          <p>Username: {currentUsername}</p>  {/* Use actual username from room state */}
          <p>Role: {isHost ? 'Host' : 'Participant'}</p>
          {/* Dynamic status based on room state - helps users understand current situation */}
          <p>Status: {
            isWaitingRoom ? 'Waiting for approval' :           // User in waiting room
            isRoomReady ? 'Ready' :                             // Fully connected and operational
            hasConnectionIssues ? 'Connection issues' :        // Network problems detected
            'Connecting...'                                     // Still connecting
          }</p>
        </div>
      )}

      {/* Waiting Room Notice - Special UI for waiting room state */}
      {isWaitingRoom && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
          <h3>Waiting Room</h3>
          <p>Please wait for the host to admit you to the room.</p>
          <p className="text-sm text-gray-600 mt-2">
            Your media will start automatically once admitted.
          </p>
        </div>
      )}

      {/* Media Controls - Only show when room is ready and media is initialized */}
      {isRoomReady && isInitialized && (
        <div className="mb-4 p-3 border rounded">
          <h3>Media Controls</h3>
          <div className="space-x-2 mt-2">
            <button
              onClick={toggleAudio}
              className={`px-3 py-1 rounded ${
                isAudioEnabled ? 'bg-green-500' : 'bg-red-500'
              } text-white`}
            >
              {isAudioEnabled ? '🎤 Mute' : '🔇 Unmute'}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`px-3 py-1 rounded ${
                isVideoEnabled ? 'bg-green-500' : 'bg-red-500'
              } text-white`}
            >
              {isVideoEnabled ? '📹 Stop Video' : '📷 Start Video'}
            </button>
          </div>
        </div>
      )}

      {/* Local Video Preview - Show when media is available */}
      {localStream && (
        <div className="mb-4">
          <h3>Your Video</h3>
          <video
            ref={(video) => {
              if (video) video.srcObject = localStream;
            }}
            autoPlay
            muted
            playsInline
            className="w-full max-w-md bg-black rounded"
          />
        </div>
      )}

      {/* Leave Room Button - Only show when joined */}
      {isJoined && (
        <button
          onClick={handleLeaveRoom}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Leave Room
        </button>
      )}
    </div>
  );
};
```

**Key Concepts Demonstrated:**

- High-level room management with `useRoom`
- Proper sequencing of room joining and media initialization
- Form handling for room credentials
- State-driven UI updates
- Waiting room handling
- Combined authentication and room operations

## Step 4: Device Selection and Media Configuration

Add device selection capabilities for advanced media control.

```tsx
// components/DeviceSelector.tsx
import React, { useEffect, useState } from 'react';
import { useMediaStream } from '../hooks/useMediaStream';

interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput' | 'audioinput' | 'audiooutput';
}

export const DeviceSelector = () => {
  // State for available devices
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDevice[]>([]);
  
  // State for selected devices
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>('');

  // Media stream hook with device-specific constraints
  const {
    initializeStream,
    localStream,
    isInitialized,
    error,
    switchCamera,        // Function to change video input device
    switchMicrophone,    // Function to change audio input device
    setAudioOutput,      // Function to change audio output device
    getAvailableDevices, // Function to enumerate media devices
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled
  } = useMediaStream({
    // Start with specific device constraints
    video: selectedVideoDevice ? 
      { deviceId: { exact: selectedVideoDevice } } : true,
    audio: selectedAudioDevice ? 
      { deviceId: { exact: selectedAudioDevice } } : true
  });

  // Load available devices on component mount
  useEffect(() => {
    const loadDevices = async () => {
      try {
        // Request permissions first to get device labels
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // Get all available media devices
        const devices = await getAvailableDevices();
        
        // Separate devices by type for organized UI
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        const audioInputs = devices.filter(d => d.kind === 'audioinput'); 
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        
        setVideoDevices(videoInputs);
        setAudioDevices(audioInputs);
        setAudioOutputDevices(audioOutputs);
        
        // Set default selections to first available device
        if (videoInputs.length > 0 && !selectedVideoDevice) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }
        if (audioInputs.length > 0 && !selectedAudioDevice) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
        if (audioOutputs.length > 0 && !selectedOutputDevice) {
          setSelectedOutputDevice(audioOutputs[0].deviceId);
        }
        
      } catch (err) {
        console.error('Failed to load devices:', err);
      }
    };

    loadDevices();
  }, [getAvailableDevices, selectedVideoDevice, selectedAudioDevice, selectedOutputDevice]);

  // Handle video device change
  const handleVideoDeviceChange = async (deviceId: string) => {
    setSelectedVideoDevice(deviceId);
    if (isInitialized) {
      try {
        // Switch to new camera while maintaining stream
        await switchCamera(deviceId);
      } catch (err) {
        console.error('Failed to switch camera:', err);
      }
    }
  };

  // Handle audio device change  
  const handleAudioDeviceChange = async (deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    if (isInitialized) {
      try {
        // Switch to new microphone while maintaining stream
        await switchMicrophone(deviceId);
      } catch (err) {
        console.error('Failed to switch microphone:', err);
      }
    }
  };

  // Handle audio output change
  const handleOutputDeviceChange = async (deviceId: string) => {
    setSelectedOutputDevice(deviceId);
    try {
      // Set audio output for all current and future audio elements
      await setAudioOutput(deviceId);
    } catch (err) {
      console.error('Failed to set audio output:', err);
    }
  };

  // Initialize media with selected devices
  const handleInitialize = async () => {
    try {
      await initializeStream();
    } catch (err) {
      console.error('Failed to initialize media:', err);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h2>Device Selection</h2>
      
      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 rounded">
          <p className="text-red-700">Error: {error}</p>
        </div>
      )}

      {/* Device Selection Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Video Device Selection */}
        <div className="p-3 border rounded">
          <h3 className="font-semibold mb-2">Camera</h3>
          <select
            value={selectedVideoDevice}
            onChange={(e) => handleVideoDeviceChange(e.target.value)}
            className="w-full p-2 border rounded"
            disabled={videoDevices.length === 0}
          >
            {videoDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.substring(0, 8)}`}
              </option>
            ))}
          </select>
          {videoDevices.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">No cameras found</p>
          )}
        </div>

        {/* Audio Input Device Selection */}
        <div className="p-3 border rounded">
          <h3 className="font-semibold mb-2">Microphone</h3>
          <select
            value={selectedAudioDevice}
            onChange={(e) => handleAudioDeviceChange(e.target.value)}
            className="w-full p-2 border rounded"
            disabled={audioDevices.length === 0}
          >
            {audioDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
              </option>
            ))}
          </select>
          {audioDevices.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">No microphones found</p>
          )}
        </div>

        {/* Audio Output Device Selection */}
        <div className="p-3 border rounded">
          <h3 className="font-semibold mb-2">Speakers</h3>
          <select
            value={selectedOutputDevice}
            onChange={(e) => handleOutputDeviceChange(e.target.value)}
            className="w-full p-2 border rounded"
            disabled={audioOutputDevices.length === 0}
          >
            {audioOutputDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Speaker ${device.deviceId.substring(0, 8)}`}
              </option>
            ))}
          </select>
          {audioOutputDevices.length === 0 && (
            <p className="text-sm text-gray-500 mt-1">No speakers found</p>
          )}
        </div>
      </div>

      {/* Media Controls */}
      <div className="p-3 border rounded">
        <h3 className="font-semibold mb-2">Media Controls</h3>
        
        {!isInitialized ? (
          <button
            onClick={handleInitialize}
            className="px-4 py-2 bg-blue-500 text-white rounded"
            disabled={!selectedVideoDevice && !selectedAudioDevice}
          >
            Start Media
          </button>
        ) : (
          <div className="space-x-2">
            <button
              onClick={toggleAudio}
              className={`px-3 py-1 rounded ${
                isAudioEnabled ? 'bg-green-500' : 'bg-red-500'
              } text-white`}
            >
              {isAudioEnabled ? '🎤' : '🔇'}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`px-3 py-1 rounded ${
                isVideoEnabled ? 'bg-green-500' : 'bg-red-500'
              } text-white`}
            >
              {isVideoEnabled ? '📹' : '📷'}
            </button>
          </div>
        )}
      </div>

      {/* Video Preview */}
      {localStream && (
        <div className="p-3 border rounded">
          <h3 className="font-semibold mb-2">Preview</h3>
          <video
            ref={(video) => {
              if (video) video.srcObject = localStream;
            }}
            autoPlay
            muted
            playsInline
            className="w-full max-w-md bg-black rounded"
          />
        </div>
      )}
    </div>
  );
};
```

**Device Selection Features:**

- Enumerate all available media devices
- Device switching while maintaining active streams
- Audio output device selection
- Device labels with fallback for unnamed devices
- Responsive grid layout for device controls
- Error handling for device access failures

## Step 5: Participant Management and Remote Streams

Now let's implement participant management to display remote users and their media streams.

```tsx
          <p>Please wait for the host to approve your entry.</p>
          {/* This gives users feedback that they're not ignored, just waiting */}
        </div>
      )}

      {/* Media Controls - Only show when room is ready and media is initialized */}
      {isRoomReady && isInitialized && (
        <div className="mb-4">
          <h3 className="mb-2">Media Controls</h3>
          <div className="space-x-2">
            {/* Audio toggle button with visual feedback */}
            <button
              onClick={toggleAudio}  // Toggle microphone on/off
              // Dynamic styling: green when enabled (unmuted), red when disabled (muted)
              className={`px-4 py-2 rounded ${
                isAudioEnabled ? 'bg-green-500' : 'bg-red-500'
              } text-white`}
            >
              {/* Emoji + text for clear visual indication */}
              {isAudioEnabled ? '🎤 Mute' : '🎤 Unmute'}
            </button>
            
            {/* Video toggle button with visual feedback */}
            <button
              onClick={toggleVideo}  // Toggle camera on/off
              // Dynamic styling: green when enabled, red when disabled
              className={`px-4 py-2 rounded ${
                isVideoEnabled ? 'bg-green-500' : 'bg-red-500'
              } text-white`}
            >
              {/* Emoji + text for clear visual indication */}
              {isVideoEnabled ? '📹 Stop Video' : '📹 Start Video'}
            </button>
          </div>
        </div>
      )}

      {/* Local Video Preview - Shows user's own camera feed */}
      {localStream && (
        <div className="mb-4">
          <h3>Your Video</h3>
          <video
            // Ref callback pattern to set srcObject when element is ready
            ref={(video) => {
              if (video && localStream) {
                // Set the MediaStream as the video source
                video.srcObject = localStream;
              }
            }}
            autoPlay      // Start playback automatically
            muted         // Mute to prevent audio feedback (user hears themselves)
            playsInline   // Prevent fullscreen on mobile
            className="w-full max-w-md h-48 bg-black rounded"
          />
        </div>
      )}

      {/* Leave Room Button - Only show when actually joined */}
      {isJoined && (
        <button
          onClick={handleLeaveRoom}
          className="px-6 py-2 bg-red-500 text-white rounded"
        >
          Leave Room
        </button>
      )}
    </div>
  );
};
```

### Step 4: Adding Participant Management

Now let's add participant management to see and interact with other participants.

```tsx
// components/ParticipantRoom.tsx
import React from 'react';
import { useRoom } from '../hooks/useRoom';
import { useParticipants } from '../hooks/useParticipants';
import { useMediaStream } from '../hooks/useMediaStream';

export const ParticipantRoom = () => {
  const { isRoomReady, isHost } = useRoom();
  
  const {
    participants,
    localParticipant,
    speakingParticipants,
    pendingParticipants,
    selectedParticipant,
    participantCount,
    selectParticipant,
    pinParticipant,
    approveParticipant,
    kickParticipant,
    isParticipantSpeaking
  } = useParticipants();

  const { localStream } = useMediaStream();

  if (!isRoomReady) {
    return <div>Connecting to room...</div>;
  }

  return (
    <div className="p-4">
      <h2>Video Conference Room</h2>
      
      {/* Room Info */}
      <div className="mb-4 p-3 border rounded">
        <p>Participants: {participantCount}</p>
        <p>Speaking: {speakingParticipants.length}</p>
        {isHost && <p>You are the host</p>}
      </div>

      {/* Pending Participants (Host Only) */}
      {isHost && pendingParticipants.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-100 border rounded">
          <h3>Waiting Room ({pendingParticipants.length})</h3>
          {pendingParticipants.map(participant => (
            <div key={participant.id} className="flex justify-between items-center mb-2">
              <span>{participant.name}</span>
              <button
                onClick={() => approveParticipant(participant.id)}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm"
              >
                Approve
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Participant Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
        {/* Local Participant */}
        {localParticipant && (
          <div className="relative border rounded overflow-hidden">
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
              You {isParticipantSpeaking(localParticipant.id) ? '🗣️' : ''}
            </div>
            <video
              ref={(video) => {
                if (video && localStream) {
                  video.srcObject = localStream;
                }
              }}
              autoPlay
              muted
              playsInline
              className="w-full h-32 bg-black object-cover"
            />
            <div className="p-2 text-center text-sm">
              {localParticipant.name}
            </div>
          </div>
        )}

        {/* Remote Participants */}
        {participants.map(participant => (
          <div 
            key={participant.id}
            className={`relative border rounded overflow-hidden cursor-pointer ${
              selectedParticipant?.id === participant.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => selectParticipant(participant.id)}
          >
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
              {participant.name} {isParticipantSpeaking(participant.id) ? '🗣️' : ''}
              {!participant.audioEnabled && ' 🔇'}
              {!participant.videoEnabled && ' 📹'}
            </div>
            
            {/* In a real app, this would show the participant's video stream */}
            <div className="w-full h-32 bg-gray-800 flex items-center justify-center text-white">
              {participant.videoEnabled ? '📹' : '👤'}
            </div>
            
            <div className="p-2 text-center text-sm">
              {participant.name}
              {participant.isHost && ' (Host)'}
            </div>
          </div>
        ))}
      </div>

      {/* Participant Controls */}
      {selectedParticipant && (
        <div className="mb-4 p-3 border rounded">
          <h3>Participant Controls: {selectedParticipant.name}</h3>
          
          <div className="space-x-2 mt-2">
            <button
              onClick={() => pinParticipant(selectedParticipant.id)}
              className="px-3 py-1 bg-blue-500 text-white rounded"
            >
              Pin Participant
            </button>
            
            {isHost && (
              <button
                onClick={() => kickParticipant(selectedParticipant.id)}
                className="px-3 py-1 bg-red-500 text-white rounded"
              >
                Remove from Room
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

### Step 5: Adding Chat Functionality

Let's add chat messaging to our video conference room.

```tsx
// components/ChatRoom.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { useParticipants } from '../hooks/useParticipants';

export const ChatRoom = () => {
  const [messageText, setMessageText] = useState('');
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    unreadCount,
    isChatPanelOpen,
    hasUnreadMessages,
    sendTextMessage,
    sendPrivateMessage,
    openChat,
    closeChat,
    markMessagesRead
  } = useChat();

  const { participants } = useParticipants();

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    if (isPrivateMode && selectedRecipient) {
      sendPrivateMessage(messageText, selectedRecipient);
    } else {
      sendTextMessage(messageText);
    }

    setMessageText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-96 border rounded">
      {/* Chat Header */}
      <div className="flex justify-between items-center p-3 border-b bg-gray-50">
        <h3>
          Chat {hasUnreadMessages && `(${unreadCount} new)`}
        </h3>
        
        <div className="space-x-2">
          <button
            onClick={isPrivateMode ? () => setIsPrivateMode(false) : () => setIsPrivateMode(true)}
            className={`px-2 py-1 text-xs rounded ${
              isPrivateMode ? 'bg-purple-500 text-white' : 'bg-gray-200'
            }`}
          >
            {isPrivateMode ? 'Private' : 'Public'}
          </button>
          
          <button
            onClick={isChatPanelOpen ? closeChat : openChat}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded"
          >
            {isChatPanelOpen ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {isChatPanelOpen && (
        <>
          {/* Private Mode Recipient Selection */}
          {isPrivateMode && (
            <div className="p-2 border-b bg-purple-50">
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                className="w-full p-1 text-sm border rounded"
              >
                <option value="">Select recipient...</option>
                {participants.map(participant => (
                  <option key={participant.id} value={participant.id}>
                    {participant.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map(message => (
              <div
                key={message.id}
                className={`p-2 rounded text-sm ${
                  message.type === 'private'
                    ? 'bg-purple-100 border border-purple-200'
                    : 'bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold">{message.senderName}</span>
                    {message.type === 'private' && (
                      <span className="ml-2 text-xs text-purple-600">(Private)</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-1">{message.content}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-3 border-t">
            <div className="flex space-x-2">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  isPrivateMode
                    ? selectedRecipient
                      ? `Private message to ${participants.find(p => p.id === selectedRecipient)?.name}...`
                      : 'Select a recipient for private message...'
                    : 'Type a message...'
                }
                disabled={isPrivateMode && !selectedRecipient}
                className="flex-1 p-2 text-sm border rounded resize-none"
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || (isPrivateMode && !selectedRecipient)}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
```

### Step 6: Complete Conference Room

Finally, let's combine everything into a complete video conference room with all features.

```tsx
// components/CompleteConferenceRoom.tsx
import React, { useState } from 'react';
import { useRoom } from '../hooks/useRoom';
import { useParticipants } from '../hooks/useParticipants';
import { useMediaControls } from '../hooks/useMediaControls';
import { useRoomUI } from '../hooks/useRoomUI';
import { ChatRoom } from './ChatRoom';

export const CompleteConferenceRoom = () => {
  const [roomId, setRoomId] = useState('demo-room');
  const [username, setUsername] = useState('');

  // Room management
  const {
    joinRoomWithAuth,
    exitRoom,
    isJoined,
    isHost,
    isRoomReady,
    isWaitingRoom
  } = useRoom();

  // Participant management
  const {
    participants,
    localParticipant,
    participantCount,
    approveParticipant,
    pendingParticipants
  } = useParticipants();

  // Media controls
  const {
    localStream,
    screenShareStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    availableDevices,
    switchCamera,
    switchMicrophone
  } = useMediaControls();

  // UI management
  const {
    gridLayout,
    isChatPanelOpen,
    isParticipantsPanelOpen,
    setGridLayout,
    toggleChatPanel,
    toggleParticipantsPanel
  } = useRoomUI();

  const handleJoinRoom = async () => {
    if (!username) {
      alert('Please enter your name');
      return;
    }

    try {
      const token = 'demo-token'; // In real app, get from auth
      await joinRoomWithAuth(roomId, username, token);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  // Show join form if not connected
  if (!isJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">Join Video Call</h1>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
            
            <input
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
            
            <button
              onClick={handleJoinRoom}
              className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show waiting room
  if (isWaitingRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-xl font-semibold mb-4">Waiting Room</h2>
          <p>Please wait for the host to approve your entry.</p>
          <button
            onClick={exitRoom}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
          >
            Leave
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Room: {roomId}</h1>
          <p className="text-sm text-gray-300">
            {participantCount} participant{participantCount !== 1 ? 's' : ''}
            {isHost && ' • You are the host'}
          </p>
        </div>

        {/* Header Controls */}
        <div className="flex space-x-2">
          {/* Layout Controls */}
          <select
            value={gridLayout}
            onChange={(e) => setGridLayout(e.target.value as any)}
            className="px-3 py-1 bg-gray-700 rounded text-sm"
          >
            <option value="gallery">Gallery</option>
            <option value="speaker">Speaker</option>
            <option value="sidebar">Sidebar</option>
          </select>

          {/* Panel Toggles */}
          <button
            onClick={toggleParticipantsPanel}
            className={`px-3 py-1 rounded text-sm ${
              isParticipantsPanelOpen ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            Participants
          </button>

          <button
            onClick={toggleChatPanel}
            className={`px-3 py-1 rounded text-sm ${
              isChatPanelOpen ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            Chat
          </button>

          <button
            onClick={exitRoom}
            className="px-3 py-1 bg-red-600 rounded text-sm"
          >
            Leave
          </button>
        </div>
      </div>

      <div className="flex flex-1 h-[calc(100vh-80px)]">
        {/* Participants Panel */}
        {isParticipantsPanelOpen && (
          <div className="w-80 bg-gray-800 border-r border-gray-700 p-4">
            <h3 className="font-semibold mb-4">Participants ({participantCount})</h3>
            
            {/* Pending Participants (Host Only) */}
            {isHost && pendingParticipants.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm text-gray-400 mb-2">Waiting for approval:</h4>
                {pendingParticipants.map(participant => (
                  <div key={participant.id} className="flex justify-between items-center mb-2 p-2 bg-yellow-900 rounded">
                    <span className="text-sm">{participant.name}</span>
                    <button
                      onClick={() => approveParticipant(participant.id)}
                      className="px-2 py-1 bg-green-600 text-xs rounded"
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Active Participants */}
            <div className="space-y-2">
              {/* Local Participant */}
              {localParticipant && (
                <div className="p-2 bg-gray-700 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{localParticipant.name} (You)</span>
                    <div className="flex space-x-1">
                      {!isAudioEnabled && <span className="text-red-400">🔇</span>}
                      {!isVideoEnabled && <span className="text-red-400">📹</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Remote Participants */}
              {participants.map(participant => (
                <div key={participant.id} className="p-2 bg-gray-700 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">
                      {participant.name}
                      {participant.isHost && ' (Host)'}
                    </span>
                    <div className="flex space-x-1">
                      {!participant.audioEnabled && <span className="text-red-400">🔇</span>}
                      {!participant.videoEnabled && <span className="text-red-400">📹</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Video Area */}
        <div className="flex-1 p-4">
          {/* Video Grid */}
          <div className={`grid gap-4 h-full ${
            gridLayout === 'gallery' 
              ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              : gridLayout === 'speaker'
              ? 'grid-cols-1'
              : 'grid-cols-2'
          }`}>
            {/* Local Video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={(video) => {
                  if (video && localStream) {
                    video.srcObject = localStream;
                  }
                }}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
                You {!isAudioEnabled && '🔇'} {!isVideoEnabled && '📹'}
              </div>
            </div>

            {/* Screen Share */}
            {screenShareStream && (
              <div className="relative bg-gray-800 rounded-lg overflow-hidden col-span-2">
                <video
                  ref={(video) => {
                    if (video && screenShareStream) {
                      video.srcObject = screenShareStream;
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
                  Your Screen Share
                </div>
              </div>
            )}

            {/* Remote Participants */}
            {participants.map(participant => (
              <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden">
                {/* In real app, this would show actual video stream */}
                <div className="w-full h-full flex items-center justify-center text-6xl">
                  {participant.videoEnabled ? '📹' : '👤'}
                </div>
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
                  {participant.name}
                  {!participant.audioEnabled && ' 🔇'}
                  {!participant.videoEnabled && ' 📹'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Panel */}
        {isChatPanelOpen && (
          <div className="w-80 bg-gray-800 border-l border-gray-700">
            <ChatRoom />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-gray-800 p-4 flex justify-center space-x-4">
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full ${
            isAudioEnabled ? 'bg-gray-600' : 'bg-red-600'
          }`}
        >
          {isAudioEnabled ? '🎤' : '🎤🚫'}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full ${
            isVideoEnabled ? 'bg-gray-600' : 'bg-red-600'
          }`}
        >
          {isVideoEnabled ? '📹' : '📹🚫'}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-full ${
            isScreenSharing ? 'bg-blue-600' : 'bg-gray-600'
          }`}
        >
          🖥️
        </button>

        {/* Device Selection */}
        {availableDevices.cameras.length > 1 && (
          <select
            onChange={(e) => switchCamera(e.target.value)}
            className="px-3 py-2 bg-gray-700 rounded text-sm"
          >
            <option value="">Select Camera</option>
            {availableDevices.cameras.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};
```

## Advanced Usage Patterns

### Custom Hook Configuration

```tsx
// Advanced configuration example
const ConferenceWithAdvancedConfig = () => {
  // useRoomConnection with custom retry and monitoring configuration
  const connection = useRoomConnection({
    maxRetries: 10,        // Retry up to 10 times before giving up
    retryDelay: 5000,      // Wait 5 seconds between retry attempts
    autoReconnect: true,   // Automatically attempt reconnection on disconnect
    heartbeatInterval: 15000  // Send heartbeat every 15 seconds to monitor connection health
  });

  // useMediaStream with high-quality video and advanced audio processing
  const media = useMediaStream({
    autoStart: false,      // Manual control over when media starts
    video: {
      // Ideal constraints - browser will try to match these but may fall back
      width: { ideal: 1920 },     // Prefer 1920px width
      height: { ideal: 1080 },    // Prefer 1080px height  
      frameRate: { ideal: 30 }    // Prefer 30 FPS for smooth video
    },
    audio: {
      // Audio processing constraints for better call quality
      echoCancellation: true,     // Remove echo from speakers
      noiseSuppression: true,     // Filter out background noise
      autoGainControl: true       // Automatically adjust microphone levels
    }
  });

  // Custom connection recovery logic - monitor connection state changes
  useEffect(() => {
    if (connection.isReconnecting) {
      // Show custom reconnection UI to inform users
      console.log('Attempting to reconnect...');
      // You might show a toast notification, modal, or status indicator here
      // Example: showNotification('Connection lost, attempting to reconnect...');
    }
  }, [connection.isReconnecting]);  // React to reconnection state changes

  // Custom media quality monitoring
  useEffect(() => {
    if (connection.quality === 'poor' || connection.quality === 'bad') {
      // Automatically reduce video quality on poor connections
      console.log('Poor connection detected, consider reducing video quality');
      // You might automatically switch to audio-only mode or lower resolution
    }
  }, [connection.quality]);  // React to connection quality changes

  return (
    <div>
      {/* Connection status indicator with detailed information */}
      <div className="status-bar">
        <span>Status: {connection.connectionState.status}</span>
        <span>Quality: {connection.quality}</span>
        <span>Latency: {connection.latency}ms</span>
        {connection.isReconnecting && (
          <span className="reconnecting">Reconnecting...</span>
        )}
      </div>
      
      {/* Your component JSX with enhanced monitoring */}
    </div>
  );
};
```

### Error Handling Pattern

```tsx
const RobustConferenceRoom = () => {
  // Local error state for component-specific error handling
  const [error, setError] = useState<string | null>(null);

  // Centralized error handler for consistent error processing
  const handleRoomError = useCallback((error: string) => {
    setError(error);  // Set local error state for UI display
    
    // Log to monitoring service (replace with your actual logging service)
    console.error('Room error:', error);
    
    // Example: Send to error tracking service
    // errorTracker.captureException(new Error(error));
    
    // Example: Show toast notification
    // toast.error(`Conference error: ${error}`);
  }, []);

  // Get room and media hooks
  const { joinRoomWithAuth } = useRoom();
  const { initializeStream, error: mediaError } = useMediaStream();

  // Enhanced join handler with comprehensive error handling
  const handleJoin = async () => {
    try {
      setError(null);  // Clear any previous errors before starting
      
      // Validate prerequisites before attempting connection
      if (!roomId || !username) {
        throw new Error('Room ID and username are required');
      }
      
      // Check if browser supports required features
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support video calling');
      }
      
      // Attempt room connection with authentication
      await joinRoomWithAuth(roomId, username, token);
      
      // Attempt media initialization
      await initializeStream();
      
    } catch (err) {
      // Handle different types of errors appropriately
      if (err instanceof Error) {
        handleRoomError(err.message);
      } else if (typeof err === 'string') {
        handleRoomError(err);
      } else {
        handleRoomError('An unknown error occurred');
      }
    }
  };

  // Watch for media errors from the hook and handle them
  useEffect(() => {
    if (mediaError) {
      // Media errors need special handling as they often relate to permissions
      if (mediaError.includes('Permission denied')) {
        handleRoomError('Camera and microphone access denied. Please allow permissions and try again.');
      } else if (mediaError.includes('Device not found')) {
        handleRoomError('No camera or microphone found. Please connect a device and try again.');
      } else {
        handleRoomError(`Media error: ${mediaError}`);
      }
    }
  }, [mediaError, handleRoomError]);  // React to media error changes

  return (
    <div>
      {/* Error display with dismiss functionality */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex justify-between items-start">
            <div>
              <strong>Error:</strong> {error}
              {/* Provide helpful hints based on error type */}
              {error.includes('Permission') && (
                <div className="mt-2 text-sm">
                  <p>To fix this:</p>
                  <ul className="list-disc list-inside">
                    <li>Click the camera icon in your browser's address bar</li>
                    <li>Select "Allow" for camera and microphone</li>
                    <li>Refresh the page and try again</li>
                  </ul>
                </div>
              )}
            </div>
            {/* Dismiss button */}
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Rest of component */}
    </div>
  );
};
```

## Best Practices

### 1. Hook Usage Order

Always use hooks in this order for optimal performance and to prevent dependency issues:

```tsx
const MyComponent = () => {
  // 1. Connection management first - establishes the foundation
  // This hook manages WebSocket connections and network monitoring
  const connection = useRoomConnection();
  
  // 2. Room management second - depends on connection being available
  // This hook handles room joining, authentication, and high-level room state
  const room = useRoom();
  
  // 3. Media management third - requires room connection for sharing
  // This hook manages local camera, microphone, and media streams
  const media = useMediaStream();
  
  // 4. Feature-specific hooks fourth - build on the foundation above
  // These hooks provide specialized functionality for specific features
  const participants = useParticipants();  // Manages other users in the room
  const chat = useChat();                  // Handles text messaging
  const ui = useRoomUI();                  // Manages layout and panels
  
  // 5. Local component state last - this ensures hooks are stable before local state
  // Local state should not affect hook initialization or dependencies
  const [localState, setLocalState] = useState();
  const [isLoading, setIsLoading] = useState(false);
  
  // 6. Effects after all hooks and state - ensures everything is ready
  useEffect(() => {
    // Effects that depend on hook state go here
  }, [/* dependencies from hooks */]);
};
```

### 2. Cleanup Pattern

Always implement proper cleanup to prevent memory leaks and release hardware resources:

```tsx
const ConferenceComponent = () => {
  // Get cleanup functions from hooks
  const { exitRoom } = useRoom();
  const { cleanup } = useMediaStream();
  
  // Comprehensive cleanup effect
  useEffect(() => {
    // Return cleanup function that runs on component unmount
    return () => {
      // 1. Clean up media resources first (camera, microphone)
      // This is critical to release hardware and prevent "camera in use" issues
      cleanup();
      
      // 2. Exit room second (WebSocket, peer connections)
      // This notifies other participants and cleans up network resources
      exitRoom();
      
      // Note: Order matters! Media cleanup before room exit prevents
      // trying to send media events during room teardown
    };
  }, [cleanup, exitRoom]);  // Dependencies ensure functions are stable
  
  // Additional cleanup for specific scenarios
  useEffect(() => {
    // Handle page visibility changes (user switches tabs/minimizes window)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Optionally pause video when tab is hidden to save bandwidth
        // This is a UX consideration - some apps do this, others don't
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup event listener
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Handle browser beforeunload event for graceful shutdown
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // Attempt cleanup before page unloads
      cleanup();
      exitRoom();
      
      // Note: Modern browsers limit what you can do in beforeunload
      // This is best-effort cleanup, the main cleanup is in the component effect
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [cleanup, exitRoom]);
};
```

### 3. Permission Handling

Request permissions before joining to provide better user experience:

```tsx
const PermissionAwareComponent = () => {
  // State to track permission status
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  
  // Get permission-related functions from media hook
  const { requestPermissions, initializeStream } = useMediaStream();
  
  // Function to check and request permissions proactively
  const handleCheckPermissions = async () => {
    setIsCheckingPermissions(true);
    
    try {
      // Check current permission state without requesting access
      const permissions = await navigator.permissions.query({ name: 'camera' });
      
      if (permissions.state === 'granted') {
        setPermissionStatus('granted');
      } else if (permissions.state === 'denied') {
        setPermissionStatus('denied');
      } else {
        // State is 'prompt' - we need to request access
        const hasPermissions = await requestPermissions();
        setPermissionStatus(hasPermissions ? 'granted' : 'denied');
      }
    } catch (error) {
      // Some browsers don't support permissions.query
      // Fall back to trying to request permissions directly
      console.warn('Permission check not supported, trying direct request');
      const hasPermissions = await requestPermissions();
      setPermissionStatus(hasPermissions ? 'granted' : 'denied');
    } finally {
      setIsCheckingPermissions(false);
    }
  };
  
  // Enhanced start handler with permission flow
  const handleStart = async () => {
    // Step 1: Check/request permissions first
    if (permissionStatus !== 'granted') {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        // Show helpful error message with instructions
        alert('Camera and microphone access required. Please allow permissions and try again.');
        return;  // Don't proceed without permissions
      }
      setPermissionStatus('granted');
    }
    
    // Step 2: Initialize media stream with granted permissions
    try {
      await initializeStream();
    } catch (error) {
      // Even with permissions, stream initialization can fail
      console.error('Failed to initialize stream:', error);
      alert('Failed to start camera or microphone. Please check your devices and try again.');
    }
  };
  
  // Effect to check permissions on component mount
  useEffect(() => {
    // Proactively check permission status when component loads
    // This allows us to show appropriate UI before user clicks anything
    handleCheckPermissions();
  }, []);  // Run once on mount
  
  return (
    <div>
      {/* Permission status indicator */}
      <div className="permission-status mb-4">
        {isCheckingPermissions && <p>Checking permissions...</p>}
        {permissionStatus === 'granted' && <p className="text-green-600">✓ Camera and microphone access granted</p>}
        {permissionStatus === 'denied' && (
          <div className="text-red-600">
            <p>✗ Camera and microphone access denied</p>
            <button 
              onClick={handleCheckPermissions} 
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm"
            >
              Check Permissions Again
            </button>
          </div>
        )}
      </div>
      
      {/* Start button with permission-aware state */}
      <button
        onClick={handleStart}
        disabled={isCheckingPermissions}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {isCheckingPermissions ? 'Checking...' : 'Start Video Call'}
      </button>
    </div>
  );
};
```

### 4. Error Boundaries

Wrap conference components in error boundaries to handle unexpected errors gracefully:

```tsx
// Error boundary component for conference features
class ConferenceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // Catch JavaScript errors anywhere in the child component tree
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  // Log error details and send to monitoring service
  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error details for debugging
    console.error('Conference error boundary caught an error:', error, errorInfo);
    
    // Send to error monitoring service (replace with your service)
    // errorReporter.captureException(error, { extra: errorInfo });
  }

  // Reset error state - allows user to try again
  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI when an error occurs
      return (
        <div className="error-boundary p-6 border border-red-300 rounded-lg bg-red-50">
          <h2 className="text-xl font-semibold text-red-800 mb-4">
            Something went wrong with the video conference
          </h2>
          
          <div className="mb-4 text-red-700">
            <p>We're sorry, but an unexpected error occurred.</p>
            <p>This might be due to:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Network connectivity issues</li>
              <li>Browser compatibility problems</li>
              <li>Hardware device conflicts</li>
            </ul>
          </div>
          
          {/* Action buttons for user recovery */}
          <div className="space-x-2">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reload Page
            </button>
          </div>
          
          {/* Development-only error details */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600">
                Error Details (Development Only)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    // No error - render children normally
    return this.props.children;
  }
}

// Usage wrapper for conference components
const ConferenceErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <ConferenceErrorBoundary
      onError={(error, errorInfo) => {
        // Additional error handling logic
        console.error('Conference error:', error);
        
        // Send to monitoring service
        // Example: Sentry, LogRocket, etc.
        // errorService.captureException(error, {
        //   tags: { component: 'video-conference' },
        //   extra: errorInfo
        // });
      }}
    >
      {children}
    </ConferenceErrorBoundary>
  );
};

// How to use the error boundary
const App = () => {
  return (
    <ConferenceErrorBoundary>
      <CompleteConferenceRoom />
    </ConferenceErrorBoundary>
  );
};
```

## Troubleshooting

### Common Issues

#### 1. Media not starting

**Symptoms:** Camera or microphone won't start, stream initialization fails

**Causes & Solutions:**

- **Browser permissions denied**: Check browser permissions and device availability

  ```tsx
  // Check permission status
  const checkPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop()); // Clean up test stream
      return true;
    } catch (error) {
      console.error('Permission check failed:', error.name, error.message);
      return false;
    }
  };
  ```

- **Device already in use**: Close other applications using camera/microphone
- **Hardware issues**: Try different devices or restart browser

#### 2. Connection failures

**Symptoms:** Cannot connect to room, frequent disconnections

**Causes & Solutions:**

- **WebSocket URL incorrect**: Verify WebSocket URL and authentication

  ```tsx
  // Debug connection issues
  const debugConnection = () => {
    console.log('WebSocket URL:', process.env.NEXT_PUBLIC_WS_URL);
    console.log('Auth token:', localStorage.getItem('authToken'));
    console.log('Connection state:', connectionState);
  };
  ```

- **Network issues**: Check internet connectivity and firewall settings
- **Server problems**: Verify backend service is running and accessible

#### 3. Audio echo

**Symptoms:** Users hear themselves speaking, feedback loops

**Causes & Solutions:**

- **Local video not muted**: Ensure local video element has `muted` attribute

  ```tsx
  <video
    ref={videoRef}
    autoPlay
    muted  // CRITICAL: Always mute local video to prevent echo
    playsInline
  />
  ```

- **Speaker feedback**: Use headphones or reduce speaker volume
- **Multiple audio sources**: Check for duplicate audio elements

#### 4. Poor video quality

**Symptoms:** Pixelated video, low frame rate, connection drops

**Causes & Solutions:**

- **Network bandwidth**: Adjust media constraints based on network conditions

  ```tsx
  // Adaptive quality based on connection
  const getVideoConstraints = (connectionQuality) => {
    switch (connectionQuality) {
      case 'poor':
        return { width: 320, height: 240, frameRate: 15 };
      case 'good':
        return { width: 640, height: 480, frameRate: 24 };
      case 'excellent':
      default:
        return { width: 1280, height: 720, frameRate: 30 };
    }
  };
  ```

### Debug Helpers

```tsx
const DebugPanel = () => {
  // Get debug information from all hooks
  const connection = useRoomConnection();
  const { getStreamStats } = useMediaStream();
  const { participantCount } = useParticipants();
  const room = useRoom();

  // State for debug visibility
  const [showDebug, setShowDebug] = useState(false);
  const [streamStats, setStreamStats] = useState(null);

  // Function to collect and display stream statistics
  const handleLogStreamStats = () => {
    const stats = getStreamStats();
    setStreamStats(stats);
    console.log('Stream Statistics:', stats);
  };

  // Function to test connection quality
  const testConnection = async () => {
    const startTime = Date.now();
    try {
      // Simple ping test (replace with actual API call)
      await fetch('/api/ping');
      const latency = Date.now() - startTime;
      console.log('Connection test latency:', latency, 'ms');
    } catch (error) {
      console.error('Connection test failed:', error);
    }
  };

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 right-4 px-3 py-1 bg-gray-800 text-white rounded text-xs"
      >
        Show Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-100 p-4 rounded shadow-lg text-xs max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold">Debug Info</h4>
        <button 
          onClick={() => setShowDebug(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      {/* Connection Information */}
      <div className="mb-3">
        <h5 className="font-medium mb-1">Connection</h5>
        <p>Status: <span className="font-mono">{connection.connectionState.status}</span></p>
        <p>Quality: <span className="font-mono">{connection.quality}</span></p>
        <p>Latency: <span className="font-mono">{connection.latency}ms</span></p>
        <p>Retries: <span className="font-mono">{connection.retryCount}</span></p>
      </div>

      {/* Room Information */}
      <div className="mb-3">
        <h5 className="font-medium mb-1">Room</h5>
        <p>Joined: <span className="font-mono">{room.isJoined ? 'Yes' : 'No'}</span></p>
        <p>Ready: <span className="font-mono">{room.isRoomReady ? 'Yes' : 'No'}</span></p>
        <p>Host: <span className="font-mono">{room.isHost ? 'Yes' : 'No'}</span></p>
        <p>Participants: <span className="font-mono">{participantCount}</span></p>
      </div>

      {/* Stream Statistics */}
      {streamStats && (
        <div className="mb-3">
          <h5 className="font-medium mb-1">Stream Stats</h5>
          <pre className="text-xs bg-gray-200 p-2 rounded overflow-auto max-h-20">
            {JSON.stringify(streamStats, null, 2)}
          </pre>
        </div>
      )}

      {/* Debug Actions */}
      <div className="space-y-1">
        <button
          onClick={handleLogStreamStats}
          className="w-full px-2 py-1 bg-blue-500 text-white rounded text-xs"
        >
          Log Stream Stats
        </button>
        
        <button
          onClick={testConnection}
          className="w-full px-2 py-1 bg-green-500 text-white rounded text-xs"
        >
          Test Connection
        </button>
        
        <button
          onClick={() => {
            // Export debug data for support
            const debugData = {
              timestamp: new Date().toISOString(),
              connection: connection.connectionState,
              room: {
                isJoined: room.isJoined,
                isHost: room.isHost,
                participantCount
              },
              streamStats: getStreamStats(),
              userAgent: navigator.userAgent,
              url: window.location.href
            };
            
            // Copy to clipboard for easy sharing
            navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
            alert('Debug data copied to clipboard');
          }}
          className="w-full px-2 py-1 bg-purple-500 text-white rounded text-xs"
        >
          Export Debug Data
        </button>
      </div>
    </div>
  );
};

// Advanced network quality monitoring
const NetworkMonitor = () => {
  const [networkInfo, setNetworkInfo] = useState(null);
  
  useEffect(() => {
    // Monitor network connection changes
    const updateNetworkInfo = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        setNetworkInfo({
          effectiveType: connection.effectiveType,  // '4g', '3g', '2g', 'slow-2g'
          downlink: connection.downlink,            // Bandwidth estimate in Mbps
          rtt: connection.rtt,                      // Round-trip time in ms
          saveData: connection.saveData             // User has data saver enabled
        });
      }
    };
    
    updateNetworkInfo();
    
    // Listen for network changes
    if (navigator.connection) {
      navigator.connection.addEventListener('change', updateNetworkInfo);
      return () => {
        navigator.connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, []);
  
  if (!networkInfo) return null;
  
  return (
    <div className="network-monitor text-xs text-gray-600">
      <span>Network: {networkInfo.effectiveType}</span>
      {networkInfo.downlink && <span> | {networkInfo.downlink}Mbps</span>}
      {networkInfo.rtt && <span> | {networkInfo.rtt}ms RTT</span>}
      {networkInfo.saveData && <span> | Data Saver ON</span>}
    </div>
  );
};
```

### Performance Monitoring

```tsx
// Hook for monitoring component performance
const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0);
  const [metrics, setMetrics] = useState({
    renders: 0,
    lastRenderTime: null,
    averageRenderTime: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    renderCount.current += 1;
    
    // Use RAF to measure actual render completion
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setMetrics(prev => ({
        renders: renderCount.current,
        lastRenderTime: renderTime,
        averageRenderTime: (prev.averageRenderTime * (prev.renders - 1) + renderTime) / prev.renders
      }));
      
      // Log slow renders
      if (renderTime > 16) { // > 1 frame at 60fps
        console.warn(`Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }
    });
  });

  return metrics;
};

// Usage in components
const MyConferenceComponent = () => {
  const performanceMetrics = usePerformanceMonitor('ConferenceRoom');
  
  // Your component logic...
  
  return (
    <div>
      {/* Your component JSX */}
      
      {/* Performance indicator in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-monitor">
          Renders: {performanceMetrics.renders} | 
          Last: {performanceMetrics.lastRenderTime?.toFixed(1)}ms |
          Avg: {performanceMetrics.averageRenderTime.toFixed(1)}ms
        </div>
      )}
    </div>
  );
};
```

This guide provides a complete foundation for implementing video conferencing functionality using our custom hooks. Start with the basic examples and gradually add more features as needed. The detailed comments and troubleshooting section will help you handle real-world scenarios and edge cases.
