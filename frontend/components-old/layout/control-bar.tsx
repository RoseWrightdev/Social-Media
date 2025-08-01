import React from 'react';
import { useMediaStream, useRoomUI, useDeviceCapabilities } from '@/hooks/useRoomConnection';
import { ControlButton } from '@/components/core/control-button';

interface ControlBarProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  unreadCount: number;
  participantCount: number;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  unreadCount,
  participantCount,
}) => {
  const {
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useMediaStream();

  const {
    isChatPanelOpen,
    isParticipantsPanelOpen,
    toggleChatPanel,
    toggleParticipantsPanel,
    setIsDeviceMenuOpen,
    setIsSettingsOpen,
  } = useRoomUI();

  const { capabilities } = useDeviceCapabilities();

  const handleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-gray-800">
      {/* Left side - Media controls */}
      <div className="flex items-center space-x-2">
        {/* Microphone toggle */}
        {capabilities.hasMicrophone && (
          <ControlButton
            icon={isAudioEnabled ? 'microphone' : 'microphone-slash'}
            isActive={isAudioEnabled}
            onClick={toggleAudio}
            tooltip={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            className={!isAudioEnabled ? 'bg-red-600 hover:bg-red-700' : ''}
          />
        )}

        {/* Camera toggle */}
        {capabilities.hasCamera && (
          <ControlButton
            icon={isVideoEnabled ? 'video' : 'video-slash'}
            isActive={isVideoEnabled}
            onClick={toggleVideo}
            tooltip={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            className={!isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : ''}
          />
        )}

        {/* Screen share */}
        {capabilities.supportsScreenShare && (
          <ControlButton
            icon="screen-share"
            isActive={isScreenSharing}
            onClick={handleScreenShare}
            tooltip={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
            className={isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : ''}
          />
        )}
      </div>

      {/* Center - Room info */}
      <div className="flex items-center space-x-4 text-white">
        <span className="text-sm">
          {participantCount} participant{participantCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Right side - UI controls */}
      <div className="flex items-center space-x-2">
        {/* Participants panel toggle */}
        <ControlButton
          icon="users"
          isActive={isParticipantsPanelOpen}
          onClick={toggleParticipantsPanel}
          tooltip="Participants"
          badge={participantCount > 1 ? participantCount.toString() : undefined}
        />

        {/* Chat panel toggle */}
        <ControlButton
          icon="chat"
          isActive={isChatPanelOpen}
          onClick={toggleChatPanel}
          tooltip="Chat"
          badge={unreadCount > 0 ? unreadCount.toString() : undefined}
          className={unreadCount > 0 ? 'animate-pulse' : ''}
        />

        {/* Device settings */}
        <ControlButton
          icon="settings"
          onClick={() => setIsDeviceMenuOpen(true)}
          tooltip="Device settings"
        />

        {/* More options */}
        <ControlButton
          icon="more"
          onClick={() => setIsSettingsOpen(true)}
          tooltip="More options"
        />
      </div>
    </div>
  );
};
