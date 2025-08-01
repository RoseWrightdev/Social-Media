'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRoom, useParticipants, useMediaControls, useChat, useRoomUI } from '@/hooks/useRoom';
import { useRoomConnection } from '@/hooks/useRoomConnection';
import { useMediaStream } from '@/hooks/useMediaStream';
import { ControlBar } from '@/components/layout/control-bar';
import { VideoGrid } from '@/components/layout/video-grid';
import { ChatPanel } from '@/components/panels/chat-panel';
import { ParticipantsPanel } from '@/components/panels/participants-panel';
import { WaitingRoomPanel } from '@/components/panels/waiting-room-panel';
import { Spinner } from '@/components/core/spinner';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomid as string;
  
  // Get token from localStorage for authentication
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    setToken(storedToken);
  }, []);

  // Local state
  const [username, setUsername] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Room management hooks
  const {
    isJoined,
    isWaitingRoom,
    isRoomReady,
    hasConnectionIssues,
    joinRoomWithAuth,
    exitRoom,
    clearError,
  } = useRoom();

  // Connection monitoring
  const {
    isConnected,
    isReconnecting,
    quality: connectionQuality,
    reconnect,
  } = useRoomConnection({ autoReconnect: true });

  // Media initialization
  const {
    isInitialized: isMediaInitialized,
    isStarting: isMediaStarting,
    error: mediaError,
    initializeStream,
    requestPermissions,
    isCameraActive,
    isMicrophoneActive,
  } = useMediaStream({ autoStart: false });

  // Media controls from store
  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    hasCamera,
    hasMicrophone,
  } = useMediaControls();

  // Participants
  const {
    participants,
    participantCount,
    pendingParticipants,
    speakingParticipants,
  } = useParticipants();

  // Chat
  const {
    unreadCount,
    isChatPanelOpen,
    hasUnreadMessages,
  } = useChat();

  // UI state
  const {
    isParticipantsPanelOpen,
    gridLayout,
    isPinned,
    selectedParticipantId,
  } = useRoomUI();

  /**
   * Initialize username from storage or prompt
   */
  const initializeUsername = useCallback(() => {
    let storedUsername = localStorage.getItem(`room-${roomId}-username`);
    if (!storedUsername) {
      storedUsername = prompt('Enter your username:') || `User-${Date.now()}`;
      localStorage.setItem(`room-${roomId}-username`, storedUsername);
    }
    setUsername(storedUsername);
    return storedUsername;
  }, [roomId]);

  /**
   * Get authentication token
   */
  const getAuthToken = useCallback(() => {
    return token || localStorage.getItem(`room-${roomId}-token`) || localStorage.getItem('auth_token') || '';
  }, [token, roomId]);

  /**
   * Initialize room, media, and join
   */
  const initializeRoom = useCallback(async () => {
    if (!roomId) {
      router.push('/');
      return;
    }

    setIsInitializing(true);
    setInitError(null);

    try {
      // 1. Initialize username
      const userDisplayName = initializeUsername();

      // 2. Get authentication token
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('No authentication token available');
      }

      // 3. Request media permissions first
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        throw new Error('Media permissions are required to join the room');
      }

      // 4. Initialize media stream
      await initializeStream();

      // 5. Join room with authentication
      await joinRoomWithAuth(roomId, userDisplayName, authToken);

      // 6. Mark as successfully joined
      localStorage.setItem(`room-${roomId}-joined`, 'true');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize room';
      setInitError(errorMessage);
      console.error('Room initialization error:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [
    roomId,
    router,
    initializeUsername,
    getAuthToken,
    requestPermissions,
    initializeStream,
    joinRoomWithAuth,
  ]);

  /**
   * Handle room exit
   */
  const handleExitRoom = useCallback(() => {
    exitRoom();
    router.push('/');
  }, [exitRoom, router]);

  /**
   * Initialize room on mount
   */
  useEffect(() => {
    if (roomId) {
      initializeRoom();
    }

    return () => {
      // Cleanup on unmount
      exitRoom();
    };
  }, [roomId, initializeRoom, exitRoom]);

  /**
   * Handle beforeunload cleanup
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      exitRoom();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [exitRoom]);

  /**
   * Show loading state
   */
  if (isInitializing || isMediaStarting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-white">
            {isInitializing && 'Initializing room...'}
            {isMediaStarting && 'Setting up camera and microphone...'}
          </p>
        </div>
      </div>
    );
  }

  /**
   * Show initialization error
   */
  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white max-w-md">
          <h2 className="text-2xl font-bold mb-4">Unable to Join Room</h2>
          <p className="text-red-400 mb-4">{initError}</p>
          <div className="space-x-3">
            <button
              onClick={() => {
                setInitError(null);
                initializeRoom();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Show waiting room
   */
  if (isWaitingRoom) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <WaitingRoomPanel
          roomId={roomId}
          username={username}
        />
      </div>
    );
  }

  /**
   * Show media error
   */
  if (mediaError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white max-w-md">
          <h2 className="text-2xl font-bold mb-4">Media Access Error</h2>
          <p className="mb-4">
            Camera and microphone access is required to join the video call.
          </p>
          <p className="text-red-400 mb-4">{mediaError}</p>
          <div className="space-x-3">
            <button
              onClick={() => {
                clearError();
                initializeStream();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => requestPermissions()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Grant Permissions
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Main room interface
   */
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-white">
            Room: {roomId}
          </h1>
          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <span>{participantCount} participants</span>
            {pendingParticipants.length > 0 && (
              <span className="px-2 py-1 bg-yellow-600 text-yellow-100 rounded-full text-xs">
                {pendingParticipants.length} pending
              </span>
            )}
            {speakingParticipants.length > 0 && (
              <span className="px-2 py-1 bg-green-600 text-green-100 rounded-full text-xs">
                {speakingParticipants.length} speaking
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Connection status */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 
                isReconnecting ? 'bg-yellow-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-300">
              {isConnected ? 'Connected' : 
               isReconnecting ? 'Reconnecting...' : 'Disconnected'}
            </span>
            <span className={`text-xs px-2 py-1 rounded ${
              connectionQuality === 'excellent' ? 'bg-green-600 text-green-100' :
              connectionQuality === 'good' ? 'bg-blue-600 text-blue-100' :
              connectionQuality === 'poor' ? 'bg-yellow-600 text-yellow-100' :
              'bg-red-600 text-red-100'
            }`}>
              {connectionQuality}
            </span>
          </div>

          {/* Media status */}
          <div className="flex items-center space-x-1 text-sm text-gray-300">
            {hasCamera && (
              <span className={`${isCameraActive ? 'text-green-400' : 'text-gray-500'}`}>
                📷
              </span>
            )}
            {hasMicrophone && (
              <span className={`${isMicrophoneActive ? 'text-green-400' : 'text-gray-500'}`}>
                🎤
              </span>
            )}
          </div>
          
          {/* Actions */}
          {hasConnectionIssues && (
            <button
              onClick={reconnect}
              className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
            >
              Reconnect
            </button>
          )}
          
          <button
            onClick={handleExitRoom}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Leave
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 relative">
          <VideoGrid
            participants={participants}
            layout={gridLayout}
            pinnedParticipantId={isPinned ? selectedParticipantId : null}
          />
        </div>

        {/* Side panels */}
        <div className="flex">
          {/* Participants panel */}
          {isParticipantsPanelOpen && (
            <div className="w-80 bg-gray-800 border-l border-gray-700">
              <ParticipantsPanel />
            </div>
          )}

          {/* Chat panel */}
          {isChatPanelOpen && (
            <div className="w-80 bg-gray-800 border-l border-gray-700">
              <ChatPanel />
            </div>
          )}
        </div>
      </div>

      {/* Control bar */}
      <div className="bg-gray-800 border-t border-gray-700">
        <ControlBar
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          unreadCount={unreadCount}
          participantCount={participantCount}
        />
      </div>
    </div>
  );
}
