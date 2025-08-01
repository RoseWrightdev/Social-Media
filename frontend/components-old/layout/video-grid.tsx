import React from 'react';
import { useParticipants } from '@/hooks/useRoom';
import { Participant } from '@/store/useRoomStore';

interface VideoGridProps {
  participants: Participant[];
  layout: 'gallery' | 'speaker' | 'sidebar';
  pinnedParticipantId?: string | null;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  participants,
  layout,
  pinnedParticipantId,
}) => {
  const pinnedParticipant = participants.find(p => p.id === pinnedParticipantId);
  const otherParticipants = participants.filter(p => p.id !== pinnedParticipantId);

  if (layout === 'speaker' && pinnedParticipant) {
    return (
      <div className="flex flex-col h-full">
        {/* Main speaker view */}
        <div className="flex-1 relative">
          <ParticipantVideo participant={pinnedParticipant} isMain={true} />
        </div>
        
        {/* Thumbnail row */}
        {otherParticipants.length > 0 && (
          <div className="h-24 flex space-x-2 p-2 bg-gray-800">
            {otherParticipants.map(participant => (
              <div key={participant.id} className="w-32 h-20 relative">
                <ParticipantVideo participant={participant} isMain={false} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (layout === 'sidebar' && pinnedParticipant) {
    return (
      <div className="flex h-full">
        {/* Main view */}
        <div className="flex-1 relative">
          <ParticipantVideo participant={pinnedParticipant} isMain={true} />
        </div>
        
        {/* Sidebar */}
        {otherParticipants.length > 0 && (
          <div className="w-64 bg-gray-800 p-2 space-y-2 overflow-y-auto">
            {otherParticipants.map(participant => (
              <div key={participant.id} className="h-36 relative">
                <ParticipantVideo participant={participant} isMain={false} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Gallery layout (default)
  const gridCols = Math.ceil(Math.sqrt(participants.length));
  const gridRows = Math.ceil(participants.length / gridCols);

  return (
    <div 
      className="grid gap-2 p-2 h-full"
      style={{
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridTemplateRows: `repeat(${gridRows}, 1fr)`,
      }}
    >
      {participants.map(participant => (
        <div key={participant.id} className="relative">
          <ParticipantVideo participant={participant} isMain={false} />
        </div>
      ))}
    </div>
  );
};

interface ParticipantVideoProps {
  participant: Participant;
  isMain: boolean;
}

const ParticipantVideo: React.FC<ParticipantVideoProps> = ({ participant, isMain }) => {
  return (
    <div className="relative w-full h-full bg-gray-700 rounded-lg overflow-hidden">
      {/* Video element */}
      {participant.stream ? (
        <video
          ref={(video) => {
            if (video && participant.stream) {
              video.srcObject = participant.stream;
            }
          }}
          autoPlay
          muted={false} // Don't mute other participants
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-semibold">
              {participant.username.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Overlay with participant info */}
      <div className="absolute bottom-2 left-2 right-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
              {participant.username}
            </span>
            {participant.isSpeaking && (
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {!participant.isAudioEnabled && (
              <span className="text-red-400 bg-black bg-opacity-50 p-1 rounded">🔇</span>
            )}
            {!participant.isVideoEnabled && (
              <span className="text-red-400 bg-black bg-opacity-50 p-1 rounded">📹</span>
            )}
            {participant.isScreenSharing && (
              <span className="text-blue-400 bg-black bg-opacity-50 p-1 rounded">📱</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
