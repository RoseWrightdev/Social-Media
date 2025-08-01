
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');

  const generateRoomId = () => {
    const id = Math.random().toString(36).substring(2, 15);
    setRoomId(id);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomId.trim() || !username.trim()) {
      alert('Please enter both room ID and username');
      return;
    }

    // Store username for the room page
    localStorage.setItem('username', username.trim());
    
    // Navigate to room
    router.push(`/${roomId.trim()}`);

    try {
      // Store username in localStorage for the room page
      localStorage.setItem('username', username.trim());
      
      // Navigate to the room
      router.push(`/${roomId.trim()}`);
    } catch (err) {
      setError('Failed to join room');
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Video Conference
          </h1>
          <p className="text-gray-400">
            Create or join a video meeting
          </p>
        </div>

        <form onSubmit={handleJoinRoom} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label htmlFor="roomId" className="block text-sm font-medium text-gray-300 mb-2">
              Room ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="roomId"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter or generate room ID"
                required
              />
              <button
                type="button"
                onClick={generateRoomId}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md transition-colors"
              >
                Generate
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isJoining}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md transition-colors flex items-center justify-center"
          >
            {isJoining ? (
              <>
                <Spinner size="sm" />
                <span className="ml-2">Joining...</span>
              </>
            ) : (
              'Join Room'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <h3 className="text-white font-medium mb-2">How it works:</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Enter your name and a room ID</li>
            <li>• Click "Generate" for a random room ID</li>
            <li>• Share the room ID with others to join</li>
            <li>• Allow camera and microphone permissions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
