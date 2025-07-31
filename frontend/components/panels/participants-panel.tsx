import React from 'react';
import { useParticipants } from '@/hooks/useRoom';
import { useRoomStore } from '@/store/useRoomStore';

export const ParticipantsPanel: React.FC = () => {
  const {
    participants,
    pendingParticipants,
    speakingParticipants,
    participantCount,
    approveParticipant,
    kickParticipant,
    toggleParticipantAudio,
    toggleParticipantVideo,
    selectParticipant,
    pinParticipant,
  } = useParticipants();

  const { isHost, currentUserId } = useRoomStore();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold">
          Participants ({participantCount})
        </h3>
      </div>

      {/* Pending participants (for hosts) */}
      {isHost && pendingParticipants.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <h4 className="text-yellow-400 font-medium mb-3">
            Waiting for approval ({pendingParticipants.length})
          </h4>
          <div className="space-y-2">
            {pendingParticipants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-2 bg-yellow-900 bg-opacity-50 rounded">
                <span className="text-white text-sm">{participant.username}</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => approveParticipant && approveParticipant(participant.id)}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => kickParticipant && kickParticipant(participant.id)}
                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active participants */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {participants.map((participant) => (
            <ParticipantItem
              key={participant.id}
              participant={participant}
              isCurrentUser={participant.id === currentUserId}
              isSpeaking={speakingParticipants.some(sp => sp.id === participant.id)}
              isHost={isHost}
              onSelect={() => selectParticipant(participant.id)}
              onPin={() => pinParticipant(participant.id)}
              onToggleAudio={() => toggleParticipantAudio && toggleParticipantAudio(participant.id)}
              onToggleVideo={() => toggleParticipantVideo && toggleParticipantVideo(participant.id)}
              onKick={() => kickParticipant && kickParticipant(participant.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface ParticipantItemProps {
  participant: any;
  isCurrentUser: boolean;
  isSpeaking: boolean;
  isHost: boolean;
  onSelect: () => void;
  onPin: () => void;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onKick?: () => void;
}

const ParticipantItem: React.FC<ParticipantItemProps> = ({
  participant,
  isCurrentUser,
  isSpeaking,
  isHost,
  onSelect,
  onPin,
  onToggleAudio,
  onToggleVideo,
  onKick,
}) => {
  const [showControls, setShowControls] = React.useState(false);

  return (
    <div
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        isSpeaking 
          ? 'bg-green-900 bg-opacity-50 border border-green-700' 
          : 'bg-gray-700 hover:bg-gray-600'
      }`}
      onClick={onSelect}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {participant.username.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Name and status */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-white text-sm font-medium">
                {participant.username}
                {isCurrentUser && " (You)"}
              </span>
              {participant.role === 'host' && (
                <span className="text-xs text-yellow-400 bg-yellow-900 px-2 py-1 rounded">
                  Host
                </span>
              )}
            </div>
            
            {/* Media status */}
            <div className="flex items-center space-x-1 mt-1">
              <span className={`text-xs ${participant.isAudioEnabled ? 'text-green-400' : 'text-red-400'}`}>
                {participant.isAudioEnabled ? '🎤' : '🔇'}
              </span>
              <span className={`text-xs ${participant.isVideoEnabled ? 'text-green-400' : 'text-red-400'}`}>
                {participant.isVideoEnabled ? '📹' : '📹'}
              </span>
              {participant.isScreenSharing && (
                <span className="text-xs text-blue-400">📱</span>
              )}
              {isSpeaking && (
                <span className="text-xs text-green-400 animate-pulse">🔊</span>
              )}
            </div>
          </div>
        </div>

        {/* Host controls */}
        {showControls && isHost && !isCurrentUser && (
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPin();
              }}
              className="p-1 text-gray-400 hover:text-white"
              title="Pin participant"
            >
              📌
            </button>
            
            {onToggleAudio && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleAudio();
                }}
                className="p-1 text-gray-400 hover:text-white"
                title="Toggle audio"
              >
                {participant.isAudioEnabled ? '🔇' : '🎤'}
              </button>
            )}
            
            {onToggleVideo && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVideo();
                }}
                className="p-1 text-gray-400 hover:text-white"
                title="Toggle video"
              >
                {participant.isVideoEnabled ? '📹' : '📹'}
              </button>
            )}
            
            {onKick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Remove ${participant.username} from the room?`)) {
                    onKick();
                  }
                }}
                className="p-1 text-red-400 hover:text-red-300"
                title="Remove participant"
              >
                🚫
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
