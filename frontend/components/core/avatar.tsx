import React from 'react'
import { cn } from '@/lib/utils'

export interface AvatarProps {
  src?: string
  alt?: string
  fallback?: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  fallback,
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full bg-gray-500 flex items-center justify-center',
        sizeClasses[size],
        className
      )}
    >
      {fallback}
    </div>
  )
}
