import React from 'react';
import { Spinner } from '@/components/core/spinner';

interface WaitingRoomPanelProps {
  roomId: string;
  username: string;
}

export const WaitingRoomPanel: React.FC<WaitingRoomPanelProps> = ({
  roomId,
  username,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto text-center">
      <div className="mb-6">
        <Spinner size="lg" />
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-4">
        Waiting for approval
      </h2>
      
      <p className="text-gray-300 mb-6">
        Hi <span className="font-semibold text-white">{username}</span>, 
        you're in the waiting room for <span className="font-semibold text-white">Room {roomId}</span>.
      </p>
      
      <p className="text-gray-400 text-sm mb-6">
        The host will let you in soon. Please wait...
      </p>
      
      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="text-white font-medium mb-2">While you wait:</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• Check your camera and microphone</li>
          <li>• Ensure you have a stable internet connection</li>
          <li>• Prepare any materials you need</li>
        </ul>
      </div>
    </div>
  );
};
