/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WaitingRoomPanel } from '@/components/panels/waiting-room-panel'

// Mock the Spinner component
vi.mock('@/components/core/spinner', () => ({
  Spinner: ({ size }: { size?: string }) => (
    <div data-testid="spinner" data-size={size}>Loading...</div>
  )
}))

describe('WaitingRoomPanel', () => {
  const defaultProps = {
    roomId: 'room-123',
    username: 'TestUser'
  }

  describe('rendering', () => {
    it('should render the waiting room panel with correct content', () => {
      render(<WaitingRoomPanel {...defaultProps} />)

      // Check for main heading
      expect(screen.getByText('Waiting for approval')).toBeInTheDocument()
      
      // Check for spinner
      expect(screen.getByTestId('spinner')).toBeInTheDocument()
      expect(screen.getByTestId('spinner')).toHaveAttribute('data-size', 'lg')
    })

    it('should display the username correctly', () => {
      render(<WaitingRoomPanel {...defaultProps} />)

      expect(screen.getByText('TestUser')).toBeInTheDocument()
    })

    it('should display the room ID correctly', () => {
      render(<WaitingRoomPanel {...defaultProps} />)

      expect(screen.getByText('Room room-123')).toBeInTheDocument()
    })

    it('should display the waiting message', () => {
      render(<WaitingRoomPanel {...defaultProps} />)

      expect(screen.getByText('The host will let you in soon. Please wait...')).toBeInTheDocument()
    })
  })

  describe('waiting instructions', () => {
    it('should display the "While you wait" section', () => {
      render(<WaitingRoomPanel {...defaultProps} />)

      expect(screen.getByText('While you wait:')).toBeInTheDocument()
    })

    it('should display all waiting instructions', () => {
      render(<WaitingRoomPanel {...defaultProps} />)

      expect(screen.getByText('• Check your camera and microphone')).toBeInTheDocument()
      expect(screen.getByText('• Ensure you have a stable internet connection')).toBeInTheDocument()
      expect(screen.getByText('• Prepare any materials you need')).toBeInTheDocument()
    })
  })

  describe('styling and layout', () => {
    it('should have correct CSS classes for layout', () => {
      const { container } = render(<WaitingRoomPanel {...defaultProps} />)
      
      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass('bg-gray-800', 'rounded-lg', 'p-8', 'max-w-md', 'mx-auto', 'text-center')
    })

    it('should have correct styling for the instructions container', () => {
      render(<WaitingRoomPanel {...defaultProps} />)
      
      const instructionsContainer = screen.getByText('While you wait:').closest('div')
      expect(instructionsContainer).toHaveClass('bg-gray-700', 'rounded-lg', 'p-4')
    })
  })

  describe('accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<WaitingRoomPanel {...defaultProps} />)

      const mainHeading = screen.getByRole('heading', { level: 2 })
      expect(mainHeading).toHaveTextContent('Waiting for approval')

      const subHeading = screen.getByRole('heading', { level: 3 })
      expect(subHeading).toHaveTextContent('While you wait:')
    })

    it('should have accessible list structure', () => {
      render(<WaitingRoomPanel {...defaultProps} />)

      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()

      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(3)
    })
  })

  describe('prop variations', () => {
    it('should handle different usernames', () => {
      render(<WaitingRoomPanel roomId="room-123" username="Jane Doe" />)

      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })

    it('should handle different room IDs', () => {
      render(<WaitingRoomPanel roomId="meeting-456" username="TestUser" />)

      expect(screen.getByText('Room meeting-456')).toBeInTheDocument()
    })

    it('should handle long usernames', () => {
      const longUsername = 'Very Long Username That Might Wrap'
      render(<WaitingRoomPanel roomId="room-123" username={longUsername} />)

      expect(screen.getByText(longUsername)).toBeInTheDocument()
    })

    it('should handle special characters in props', () => {
      render(<WaitingRoomPanel roomId="room-@#$" username="User & Co." />)

      expect(screen.getByText('User & Co.')).toBeInTheDocument()
      expect(screen.getByText('Room room-@#$')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle empty strings gracefully', () => {
      render(<WaitingRoomPanel roomId="" username="" />)

      // Should still render the component structure
      expect(screen.getByText('Waiting for approval')).toBeInTheDocument()
      expect(screen.getByText('Room')).toBeInTheDocument()
    })

    it('should handle very long room IDs', () => {
      const longRoomId = 'very-long-room-id-that-might-cause-layout-issues-12345'
      render(<WaitingRoomPanel roomId={longRoomId} username="TestUser" />)

      expect(screen.getByText(`Room ${longRoomId}`)).toBeInTheDocument()
    })
  })
})
