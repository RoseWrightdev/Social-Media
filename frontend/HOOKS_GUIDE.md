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

### Step 1: Basic Connection Setup

Let's start with the most basic video conferencing component that connects to a room.

```tsx
// components/BasicRoom.tsx
import React from 'react';
import { useRoomConnection } from '../hooks/useRoomConnection';

export const BasicRoom = () => {
  const { 
    connect, 
    disconnect, 
    isConnected, 
    connectionState 
  } = useRoomConnection();

  const handleConnect = async () => {
    try {
      await connect();
      console.log('Connected to room successfully');
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return (
    <div className="p-4">
      <h2>Basic Room Connection</h2>
      
      <div className="mb-4">
        <p>Status: {connectionState.status}</p>
        <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      </div>

      <div className="space-x-2">
        <button 
          onClick={handleConnect}
          disabled={isConnected}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Connect
        </button>
        
        <button 
          onClick={disconnect}
          disabled={!isConnected}
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
  const { connect, disconnect, isConnected } = useRoomConnection();
  
  const {
    initializeStream,
    localStream,
    isInitialized,
    isStarting,
    error,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,
    cleanup
  } = useMediaStream({
    video: { width: 1280, height: 720 },
    audio: { echoCancellation: true }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      disconnect();
    };
  }, [cleanup, disconnect]);

  const handleStart = async () => {
    try {
      // First connect to room
      await connect();
      
      // Then initialize media stream
      await initializeStream();
      
      console.log('Room and media ready');
    } catch (error) {
      console.error('Setup failed:', error);
    }
  };

  return (
    <div className="p-4">
      <h2>Media Room</h2>
      
      {/* Connection Status */}
      <div className="mb-4 p-2 border rounded">
        <p>Room Connected: {isConnected ? '✓' : '✗'}</p>
        <p>Media Ready: {isInitialized ? '✓' : '✗'}</p>
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>

      {/* Media Controls */}
      {isInitialized && (
        <div className="mb-4 space-x-2">
          <button
            onClick={toggleAudio}
            className={`px-4 py-2 rounded ${
              isAudioEnabled ? 'bg-green-500' : 'bg-red-500'
            } text-white`}
          >
            {isAudioEnabled ? 'Mute' : 'Unmute'}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`px-4 py-2 rounded ${
              isVideoEnabled ? 'bg-green-500' : 'bg-red-500'
            } text-white`}
          >
            {isVideoEnabled ? 'Stop Video' : 'Start Video'}
          </button>
        </div>
      )}

      {/* Local Video */}
      {localStream && (
        <div className="mb-4">
          <h3>Your Video</h3>
          <video
            ref={(video) => {
              if (video && localStream) {
                video.srcObject = localStream;
              }
            }}
            autoPlay
            muted
            playsInline
            className="w-64 h-48 bg-black rounded"
          />
        </div>
      )}

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={isStarting || (isConnected && isInitialized)}
        className="px-6 py-3 bg-blue-500 text-white rounded text-lg"
      >
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
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  
  const {
    joinRoomWithAuth,
    exitRoom,
    isJoined,
    isHost,
    isWaitingRoom,
    isRoomReady,
    hasConnectionIssues,
    currentUsername
  } = useRoom();

  const {
    initializeStream,
    localStream,
    isInitialized,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled
  } = useMediaStream({
    autoStart: false, // We'll start manually after joining
    video: true,
    audio: true
  });

  const handleJoinRoom = async () => {
    if (!roomId || !username) {
      alert('Please enter room ID and username');
      return;
    }

    try {
      // Get JWT token (in real app, this would come from your auth system)
      const token = localStorage.getItem('authToken') || 'demo-token';
      
      // Join the room with authentication
      await joinRoomWithAuth(roomId, username, token);
      
      // Initialize media after joining
      await initializeStream();
      
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  };

  const handleLeaveRoom = () => {
    exitRoom();
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2>Managed Video Room</h2>

      {/* Join Form */}
      {!isJoined && (
        <div className="mb-6 p-4 border rounded">
          <h3 className="mb-3">Join Room</h3>
          
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full p-2 border rounded"
            />
            
            <input
              type="text"
              placeholder="Your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border rounded"
            />
            
            <button
              onClick={handleJoinRoom}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded"
            >
              Join Room
            </button>
          </div>
        </div>
      )}

      {/* Room Status */}
      {isJoined && (
        <div className="mb-4 p-3 border rounded">
          <h3>Room Status</h3>
          <p>Room ID: {roomId}</p>
          <p>Username: {currentUsername}</p>
          <p>Role: {isHost ? 'Host' : 'Participant'}</p>
          <p>Status: {
            isWaitingRoom ? 'Waiting for approval' :
            isRoomReady ? 'Ready' :
            hasConnectionIssues ? 'Connection issues' :
            'Connecting...'
          }</p>
        </div>
      )}

      {/* Waiting Room */}
      {isWaitingRoom && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
          <h3>Waiting Room</h3>
          <p>Please wait for the host to approve your entry.</p>
        </div>
      )}

      {/* Media Controls */}
      {isRoomReady && isInitialized && (
        <div className="mb-4">
          <h3 className="mb-2">Media Controls</h3>
          <div className="space-x-2">
            <button
              onClick={toggleAudio}
              className={`px-4 py-2 rounded ${
                isAudioEnabled ? 'bg-green-500' : 'bg-red-500'
              } text-white`}
            >
              {isAudioEnabled ? '🎤 Mute' : '🎤 Unmute'}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`px-4 py-2 rounded ${
                isVideoEnabled ? 'bg-green-500' : 'bg-red-500'
              } text-white`}
            >
              {isVideoEnabled ? '📹 Stop Video' : '📹 Start Video'}
            </button>
          </div>
        </div>
      )}

      {/* Local Video */}
      {localStream && (
        <div className="mb-4">
          <h3>Your Video</h3>
          <video
            ref={(video) => {
              if (video && localStream) {
                video.srcObject = localStream;
              }
            }}
            autoPlay
            muted
            playsInline
            className="w-full max-w-md h-48 bg-black rounded"
          />
        </div>
      )}

      {/* Leave Button */}
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
  const connection = useRoomConnection({
    maxRetries: 10,
    retryDelay: 5000,
    autoReconnect: true,
    heartbeatInterval: 15000
  });

  const media = useMediaStream({
    autoStart: false,
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  // Custom connection recovery
  useEffect(() => {
    if (connection.isReconnecting) {
      // Show reconnection UI
      console.log('Attempting to reconnect...');
    }
  }, [connection.isReconnecting]);

  return (
    <div>
      {/* Your component JSX */}
    </div>
  );
};
```

### Error Handling Pattern

```tsx
const RobustConferenceRoom = () => {
  const [error, setError] = useState<string | null>(null);

  const handleRoomError = useCallback((error: string) => {
    setError(error);
    // Log to monitoring service
    console.error('Room error:', error);
  }, []);

  const { joinRoomWithAuth } = useRoom();
  const { initializeStream, error: mediaError } = useMediaStream();

  const handleJoin = async () => {
    try {
      setError(null);
      await joinRoomWithAuth(roomId, username, token);
      await initializeStream();
    } catch (err) {
      handleRoomError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Watch for media errors
  useEffect(() => {
    if (mediaError) {
      handleRoomError(`Media error: ${mediaError}`);
    }
  }, [mediaError, handleRoomError]);

  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-500"
          >
            ✕
          </button>
        </div>
      )}
      {/* Rest of component */}
    </div>
  );
};
```

## Best Practices

### 1. Hook Usage Order

Always use hooks in this order for optimal performance:

```tsx
const MyComponent = () => {
  // 1. Connection management first
  const connection = useRoomConnection();
  
  // 2. Room management
  const room = useRoom();
  
  // 3. Media management
  const media = useMediaStream();
  
  // 4. Feature-specific hooks
  const participants = useParticipants();
  const chat = useChat();
  const ui = useRoomUI();
  
  // 5. Local state last
  const [localState, setLocalState] = useState();
};
```

### 2. Cleanup Pattern

Always implement proper cleanup:

```tsx
const ConferenceComponent = () => {
  const { exitRoom } = useRoom();
  const { cleanup } = useMediaStream();
  
  useEffect(() => {
    return () => {
      cleanup();
      exitRoom();
    };
  }, [cleanup, exitRoom]);
};
```

### 3. Permission Handling

Request permissions before joining:

```tsx
const PermissionAwareComponent = () => {
  const { requestPermissions, initializeStream } = useMediaStream();
  
  const handleStart = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      alert('Camera and microphone access required');
      return;
    }
    
    await initializeStream();
  };
};
```

### 4. Error Boundaries

Wrap conference components in error boundaries:

```tsx
const ConferenceErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary
      fallback={<div>Something went wrong with the video conference.</div>}
      onError={(error) => {
        console.error('Conference error:', error);
        // Report to monitoring service
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
```

## Troubleshooting

### Common Issues

1. **Media not starting**: Check browser permissions and device availability
2. **Connection failures**: Verify WebSocket URL and authentication
3. **Audio echo**: Ensure local video is muted
4. **Poor video quality**: Adjust media constraints based on network conditions

### Debug Helpers

```tsx
const DebugPanel = () => {
  const connection = useRoomConnection();
  const { getStreamStats } = useMediaStream();
  const { participantCount } = useParticipants();

  return (
    <div className="bg-gray-100 p-4 text-xs">
      <h4>Debug Info</h4>
      <p>Connection: {connection.connectionState.status}</p>
      <p>Quality: {connection.quality}</p>
      <p>Latency: {connection.latency}ms</p>
      <p>Participants: {participantCount}</p>
      <button onClick={() => console.log(getStreamStats())}>
        Log Stream Stats
      </button>
    </div>
  );
};
```

This guide provides a complete foundation for implementing video conferencing functionality using our custom hooks. Start with the basic examples and gradually add more features as needed.
