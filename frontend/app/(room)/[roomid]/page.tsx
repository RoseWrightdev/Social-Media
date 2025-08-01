'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRoom, useParticipants } from '@/hooks/useRoom';
import { useMediaStream } from '@/hooks/useMediaStream';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomid as string;
  
  const [username, setUsername] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<Array<{id: string, user: string, text: string, timestamp: Date}>>([]);
  const [localVideoRef, setLocalVideoRef] = useState<HTMLVideoElement | null>(null);
  const [remoteVideoRefs, setRemoteVideoRefs] = useState<Map<string, HTMLVideoElement>>(new Map());
  const [chatContainerRef, setChatContainerRef] = useState<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef) {
      chatContainerRef.scrollTop = chatContainerRef.scrollHeight;
    }
  }, [messages, chatContainerRef]);

  // Use your sophisticated hooks
  const {
    roomId: currentRoomId,
    roomName,
    isJoined,
    isHost,
    currentUsername,
    isWaitingRoom,
    isRoomReady,
    hasConnectionIssues,
    connectionState,
    joinRoomWithAuth,
    exitRoom,
    clearError
  } = useRoom();

  const {
    isInitialized,
    isStarting,
    error: mediaError,
    isAudioEnabled,
    isVideoEnabled,
    isCameraActive,
    isMicrophoneActive,
    initializeStream,
    toggleAudio,
    toggleVideo,
    cleanup: cleanupMedia,
    getStreamStats
  } = useMediaStream({ autoStart: false });

  // Get participants data
  const {
    participants,
    localParticipant,
    speakingParticipants,
    pendingParticipants
  } = useParticipants();

  useEffect(() => {
    // Get username from localStorage
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
      
      // For proof of concept, we'll skip JWT authentication
      // In production, you'd get a real JWT token here
      const mockToken = 'mock-jwt-token';
      
      // Join room using the sophisticated hook
      if (roomId && !isJoined) {
        console.log('Joining room:', roomId, 'as', storedUsername);
        // Note: In development, this might fail without proper Auth0 setup
        // The hook will handle errors gracefully
        joinRoomWithAuth(roomId, storedUsername, mockToken).catch(err => {
          console.log('Room join failed (expected in dev):', err);
        });
      }
    } else {
      // If no username, redirect to home
      router.push('/');
    }
  }, [router, roomId, isJoined, joinRoomWithAuth]);

  const handleLeaveRoom = () => {
    // Clean up media stream
    cleanupMedia();
    // Exit room using sophisticated hook
    exitRoom();
    // Clear localStorage and redirect
    localStorage.removeItem('username');
    router.push('/');
  };

  // Initialize media when room is ready
  useEffect(() => {
    if (isRoomReady && !isInitialized && !isStarting) {
      console.log('Room ready, initializing media...');
      initializeStream().catch(err => {
        console.log('Media initialization failed (expected in dev):', err);
      });
    }
  }, [isRoomReady, isInitialized, isStarting, initializeStream]);

  // Handle local video stream display
  useEffect(() => {
    const displayLocalVideo = async () => {
      if (localVideoRef && isInitialized) {
        try {
          // Get user media for local video preview
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 }, 
            audio: false // We'll handle audio separately
          });
          
          localVideoRef.srcObject = stream;
          localVideoRef.muted = true; // Prevent feedback
          console.log('✅ Local video stream connected');
        } catch (err) {
          console.error('Failed to get local video:', err);
          // Create a placeholder for demo
          if (localVideoRef) {
            localVideoRef.style.backgroundColor = '#1a1a1a';
          }
        }
      }
    };

    displayLocalVideo();
    
    // Cleanup function
    return () => {
      if (localVideoRef && localVideoRef.srcObject) {
        const stream = localVideoRef.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [localVideoRef, isInitialized]);

  // Handle media controls
  const handleToggleAudio = () => {
    console.log('Toggling audio:', isAudioEnabled ? 'OFF' : 'ON');
    toggleAudio();
  };

  const handleToggleVideo = () => {
    console.log('Toggling video:', isVideoEnabled ? 'OFF' : 'ON');
    toggleVideo();
  };

  const handleStartVideo = async () => {
    if (!isInitialized) {
      console.log('Starting video stream...');
      try {
        await initializeStream();
        console.log('✅ Video stream started successfully');
      } catch (err) {
        console.error('❌ Failed to start video stream:', err);
      }
    }
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      console.log('Sending message:', chatMessage);
      
      // Add message locally for immediate feedback
      const newMessage = {
        id: Date.now().toString(),
        user: currentUsername || username,
        text: chatMessage.trim(),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      
      // TODO: Send via WebSocket to backend
      // For now, we'll simulate receiving the message
      setTimeout(() => {
        console.log('Message sent successfully (simulated)');
      }, 100);
      
      setChatMessage('');
    }
  };

  // Add some demo participants when room is ready
  useEffect(() => {
    if (isRoomReady && messages.length === 0) {
      setMessages([
        {
          id: '1',
          user: 'System',
          text: 'Welcome to the room! 👋',
          timestamp: new Date()
        },
        {
          id: '2', 
          user: 'System',
          text: 'Media streams will appear when participants join.',
          timestamp: new Date()
        },
        {
          id: '3',
          user: 'System', 
          text: 'Click "Start Video" to begin your camera feed.',
          timestamp: new Date()
        }
      ]);
      
      // Add a demo chat message after a delay
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          user: 'Demo Bot',
          text: '🤖 This is a demo message to show how chat works!',
          timestamp: new Date()
        }]);
      }, 3000);
    }
  }, [isRoomReady, messages.length]);

  if (!username) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        color: 'white'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#1a1a1a',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '1rem 2rem',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
            Room: {roomName || roomId}
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#888' }}>
            Welcome, {currentUsername || username}
            {isHost && ' (Host)'}
          </p>
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Status: {isRoomReady ? '🟢 Connected' : 
                     isWaitingRoom ? '🟡 Waiting for approval' :
                     hasConnectionIssues ? '🔴 Connection issues' : 
                     '🟡 Connecting...'}
          </div>
        </div>
        <button
          onClick={handleLeaveRoom}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: '#dc3545',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Leave Room
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '2rem',
        height: 'calc(100vh - 200px)'
      }}>
        
        {/* Video Area */}
        <div style={{
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <div style={{
            width: '100%',
            height: '80%',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Local Video */}
            <video
              ref={setLocalVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                backgroundColor: '#000',
                borderRadius: '8px'
              }}
            />
            
            {/* Video Status Overlay */}
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '0.5rem',
              borderRadius: '4px',
              fontSize: '0.8rem'
            }}>
              {isInitialized ? (
                <>
                  📹 {currentUsername || username} (You)
                  <br />
                  🎤 {isAudioEnabled ? 'ON' : 'OFF'} | 📹 {isVideoEnabled ? 'ON' : 'OFF'}
                </>
              ) : (
                '🔄 Initializing camera...'
              )}
            </div>
            
            {/* Participants Grid - for remote videos */}
            {Object.values(participants).length > 0 && (
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                {Object.values(participants).slice(0, 3).map((participant: any) => (
                  <div
                    key={participant.id}
                    style={{
                      width: '120px',
                      height: '90px',
                      backgroundColor: '#333',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      color: 'white',
                      border: '2px solid #007acc'
                    }}
                  >
                    📹 {participant.username}
                  </div>
                ))}
              </div>
            )}
            
            {/* No video fallback */}
            {!isInitialized && (
              <div style={{ textAlign: 'center', color: '#666' }}>
                <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                  Click "Start Video" to begin
                </p>
                <div style={{ fontSize: '0.8rem' }}>
                  Camera: {isCameraActive ? '🟢 Active' : '🔴 Inactive'} | 
                  Mic: {isMicrophoneActive ? '🟢 Active' : '🔴 Inactive'}
                </div>
              </div>
            )}
          </div>
          
          {/* Control Bar */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {!isInitialized ? (
              <button 
                onClick={handleStartVideo}
                disabled={isStarting}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '50px',
                  border: 'none',
                  backgroundColor: '#28a745',
                  color: 'white',
                  cursor: isStarting ? 'not-allowed' : 'pointer',
                  opacity: isStarting ? 0.6 : 1,
                  fontSize: '0.9rem'
                }}
              >
                {isStarting ? '🔄 Starting...' : '📹 Start Video'}
              </button>
            ) : (
              <>
                <button 
                  onClick={handleToggleAudio}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '50px',
                    border: 'none',
                    backgroundColor: isAudioEnabled ? '#007acc' : '#dc3545',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  🎤 {isAudioEnabled ? 'Mute' : 'Unmute'}
                </button>
                <button 
                  onClick={handleToggleVideo}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '50px',
                    border: 'none',
                    backgroundColor: isVideoEnabled ? '#007acc' : '#dc3545',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  📹 {isVideoEnabled ? 'Stop Video' : 'Start Video'}
                </button>
                <button 
                  onClick={() => {
                    console.log('Screen share not implemented yet');
                    alert('Screen sharing coming soon! 🖥️');
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '50px',
                    border: 'none',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  🖥️ Share Screen
                </button>
              </>
            )}
            
            {mediaError && (
              <div style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ff6b6b',
                color: 'white',
                borderRadius: '4px',
                fontSize: '0.8rem',
                marginTop: '0.5rem'
              }}>
                ⚠️ {mediaError}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          
          {/* Participants */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>
              Participants ({Object.keys(participants).length + (localParticipant ? 1 : 0)})
            </h3>
            
            {/* Local participant */}
            {localParticipant && (
              <div style={{
                padding: '0.5rem',
                backgroundColor: '#3a3a3a',
                borderRadius: '4px',
                marginBottom: '0.5rem'
              }}>
                {localParticipant.username} (You) 
                {speakingParticipants.some((p: any) => p.id === localParticipant.id) && ' 🎤'}
              </div>
            )}
            
            {/* Remote participants */}
            {Object.values(participants).map((participant: any) => (
              <div key={participant.id} style={{
                padding: '0.5rem',
                backgroundColor: '#3a3a3a',
                borderRadius: '4px',
                marginBottom: '0.5rem'
              }}>
                {participant.username}
                {speakingParticipants.some((p: any) => p.id === participant.id) && ' 🎤'}
                {participant.isHost && ' 👑'}
              </div>
            ))}
            
            {/* Pending participants (if host) */}
            {isHost && pendingParticipants.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: '#ffc107', marginBottom: '0.5rem' }}>
                  Waiting Room ({pendingParticipants.length})
                </h4>
                {pendingParticipants.map((participant: any) => (
                  <div key={participant.id} style={{
                    padding: '0.5rem',
                    backgroundColor: '#4a4a4a',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{participant.username}</span>
                    <button style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}>
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat */}
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Chat ({messages.length})</h3>
            <div 
              ref={setChatContainerRef}
              style={{
                height: '200px',
                backgroundColor: '#1a1a1a',
                borderRadius: '4px',
                padding: '1rem',
                marginBottom: '1rem',
                overflow: 'auto',
                border: '1px solid #333'
              }}
            >
              {messages.length === 0 ? (
                <p style={{ color: '#666', fontSize: '0.9rem', textAlign: 'center' }}>
                  No messages yet. Start the conversation! 💬
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {messages.map((message) => (
                    <div key={message.id} style={{
                      padding: '0.5rem',
                      backgroundColor: message.user === 'System' ? '#2a4a2a' : '#333',
                      borderRadius: '4px',
                      borderLeft: message.user === (currentUsername || username) ? '3px solid #007acc' : '3px solid #666'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#ccc' }}>
                          {message.user === (currentUsername || username) ? 'You' : message.user}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'white' }}>
                        {message.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Type a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  backgroundColor: '#333',
                  color: 'white'
                }}
              />
              <button 
                onClick={handleSendMessage}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#007acc',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '2rem',
        textAlign: 'center',
        color: '#666',
        fontSize: '0.9rem'
      }}>
        <div>Proof of Concept - Video Conference Room</div>
        <div style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>
          WebSocket: {connectionState.wsConnected ? '🟢' : '🔴'} | 
          Media: {isInitialized ? '🟢' : '🔴'} | 
          Room: {isJoined ? '🟢' : '🔴'}
          {hasConnectionIssues && ' | ⚠️ Connection Issues'}
        </div>
      </div>
    </div>
  );
}
