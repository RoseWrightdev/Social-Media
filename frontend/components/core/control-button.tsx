import React from 'react'
import { cn } from '@/lib/utils'

export interface ControlButtonProps {
  icon?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'default' | 'primary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  isActive?: boolean
  loading?: boolean
  className?: string
  children?: React.ReactNode
  ariaLabel?: string
  ariaPressed?: boolean
  tooltip?: string
  badge?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export const ControlButton: React.FC<ControlButtonProps> = ({
  icon,
  onClick,
  disabled = false,
  variant = 'default',
  size = 'md',
  isActive = false,
  loading = false,
  className,
  children,
  ariaLabel,
  ariaPressed,
  tooltip,
  badge,
  onMouseEnter,
  onMouseLeave,
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
  
  const variantClasses = {
    default: 'bg-gray-700 text-white hover:bg-gray-600',
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
  }
  
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-12 w-12 text-base',
    lg: 'h-16 w-16 text-lg',
  }
  
  const activeClasses = isActive ? 'ring-2 ring-blue-500' : ''

  return (
    <div className="relative" title={tooltip}>
      <button
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          activeClasses,
          className
        )}
        onClick={onClick}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {loading ? (
          <span>Loading...</span>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </button>
      {badge && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[1.5rem] h-6 flex items-center justify-center">
          {badge}
        </span>
      )}
    </div>
  )
}
