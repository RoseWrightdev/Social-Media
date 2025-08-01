'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomid as string;
  
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Get username from localStorage
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      // If no username, redirect to home
      router.push('/');
    }
  }, [router]);

  const handleLeaveRoom = () => {
    localStorage.removeItem('username');
    router.push('/');
  };

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
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Room: {roomId}</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#888' }}>Welcome, {username}</p>
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
            marginBottom: '1rem'
          }}>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>
              Video will appear here
            </p>
          </div>
          
          {/* Control Bar */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center'
          }}>
            <button style={{
              padding: '0.75rem 1rem',
              borderRadius: '50px',
              border: 'none',
              backgroundColor: '#007acc',
              color: 'white',
              cursor: 'pointer'
            }}>
              🎤 Mic
            </button>
            <button style={{
              padding: '0.75rem 1rem',
              borderRadius: '50px',
              border: 'none',
              backgroundColor: '#007acc',
              color: 'white',
              cursor: 'pointer'
            }}>
              📹 Camera
            </button>
            <button style={{
              padding: '0.75rem 1rem',
              borderRadius: '50px',
              border: 'none',
              backgroundColor: '#6c757d',
              color: 'white',
              cursor: 'pointer'
            }}>
              🖥️ Share
            </button>
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
            <h3 style={{ marginBottom: '1rem' }}>Participants (1)</h3>
            <div style={{
              padding: '0.5rem',
              backgroundColor: '#3a3a3a',
              borderRadius: '4px',
              marginBottom: '0.5rem'
            }}>
              {username} (You)
            </div>
          </div>

          {/* Chat */}
          <div>
            <h3 style={{ marginBottom: '1rem' }}>Chat</h3>
            <div style={{
              height: '200px',
              backgroundColor: '#1a1a1a',
              borderRadius: '4px',
              padding: '1rem',
              marginBottom: '1rem',
              overflow: 'auto'
            }}>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>
                Chat messages will appear here
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  backgroundColor: '#333',
                  color: 'white'
                }}
              />
              <button style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#007acc',
                color: 'white',
                cursor: 'pointer'
              }}>
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
        Proof of Concept - Video Conference Room
      </div>
    </div>
  );
}
