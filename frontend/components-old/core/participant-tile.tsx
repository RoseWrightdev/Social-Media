import React from 'react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/core/avatar'

export interface ParticipantTileProps {
  participant: {
    id: string
    displayName: string
    isAudioEnabled: boolean
    isVideoEnabled: boolean
    isHost?: boolean
    isScreenSharing?: boolean
    videoStream?: MediaStream | null
    avatarUrl?: string
  }
  isSelected?: boolean
  isPinned?: boolean
  isSpeaking?: boolean
  onSelect?: (participantId: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isSelected = false,
  isPinned = false,
  isSpeaking = false,
  onSelect,
  className,
  size = 'md',
}) => {
  const {
    id,
    displayName,
    isAudioEnabled,
    isVideoEnabled,
    isHost,
    isScreenSharing,
    videoStream,
    avatarUrl,
  } = participant

  const sizeClasses = {
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64',
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div
      className={cn(
        'relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer group',
        sizeClasses[size],
        isSelected && 'ring-2 ring-blue-500',
        isPinned && 'ring-2 ring-green-400',
        isSpeaking && 'ring-green-400',
        className
      )}
      onClick={() => onSelect?.(id)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.(id)
        }
      }}
    >
      {/* Video or Avatar */}
      {isVideoEnabled && videoStream ? (
        <video
          ref={(video) => {
            if (video && videoStream) {
              video.srcObject = videoStream
            }
          }}
          autoPlay
          muted
          className="w-full h-full object-cover"
        />
      ) : avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          data-testid="avatar"
          className="w-full h-full flex items-center justify-center bg-gray-700"
        >
          <Avatar
            fallback={
              <div data-testid="avatar-fallback" className="text-white text-2xl font-semibold">
                {getInitials(displayName)}
              </div>
            }
          />
        </div>
      )}

      {/* Overlay with controls and info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
        {/* Top indicators */}
        <div className="absolute top-2 left-2 flex gap-1">
          {!isAudioEnabled && (
            <div className="bg-red-500 text-white p-1 rounded">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
            </div>
          )}
          {isAudioEnabled && (
            <div className="bg-green-500 text-white p-1 rounded">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
            </div>
          )}
          {!isVideoEnabled && (
            <div className="bg-red-500 text-white p-1 rounded">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82l-2-2H16c1.1 0 2 .9 2 2v-.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1h12c.21 0 .39-.08.55-.18L19.73 19 21 17.73 3.27 2zM15 13.5V13c0-.55-.45-1-1-1H7.82l7.18 7.18V13.5z"/>
              </svg>
            </div>
          )}
          {isScreenSharing && (
            <div className="bg-blue-500 text-white p-1 rounded" aria-label="Screen sharing">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 5h16v11H4V5z"/>
              </svg>
            </div>
          )}
          {isPinned && (
            <div className="bg-yellow-500 text-white p-1 rounded" aria-label="Pinned participant">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="text-white text-sm font-medium truncate">
            {displayName}
          </div>
          {isHost && (
            <div className="text-yellow-400 text-xs">Host</div>
          )}
        </div>
      </div>
    </div>
  )
}
