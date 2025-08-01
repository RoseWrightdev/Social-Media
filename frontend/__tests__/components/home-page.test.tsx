/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import Home from '@/app/page'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

// Mock the Spinner component
vi.mock('@/components/core/spinner', () => ({
  Spinner: ({ size }: { size?: string }) => (
    <div data-testid="spinner" data-size={size}>Loading...</div>
  )
}))

describe('Home Page', () => {
  const mockPush = vi.fn()
  const mockUseRouter = useRouter as any

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush
    })
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the home page with correct title', () => {
      render(<Home />)

      expect(screen.getByText('Video Conference')).toBeInTheDocument()
      expect(screen.getByText('Create or join a video meeting')).toBeInTheDocument()
    })

    it('should render the form with all required fields', () => {
      render(<Home />)

      expect(screen.getByLabelText('Your Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Room ID')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Generate' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Join Room' })).toBeInTheDocument()
    })

    it('should render the instructions section', () => {
      render(<Home />)

      expect(screen.getByText('How it works:')).toBeInTheDocument()
      expect(screen.getByText('• Enter your name and a room ID')).toBeInTheDocument()
      expect(screen.getByText('• Click "Generate" for a random room ID')).toBeInTheDocument()
      expect(screen.getByText('• Share the room ID with others to join')).toBeInTheDocument()
      expect(screen.getByText('• Allow camera and microphone permissions')).toBeInTheDocument()
    })
  })

  describe('form interactions', () => {
    it('should allow typing in the username field', () => {
      render(<Home />)

      const usernameInput = screen.getByLabelText('Your Name') as HTMLInputElement
      fireEvent.change(usernameInput, { target: { value: 'John Doe' } })

      expect(usernameInput.value).toBe('John Doe')
    })

    it('should allow typing in the room ID field', () => {
      render(<Home />)

      const roomIdInput = screen.getByLabelText('Room ID') as HTMLInputElement
      fireEvent.change(roomIdInput, { target: { value: 'test-room-123' } })

      expect(roomIdInput.value).toBe('test-room-123')
    })

    it('should generate a random room ID when Generate button is clicked', () => {
      render(<Home />)

      const generateButton = screen.getByRole('button', { name: 'Generate' })
      const roomIdInput = screen.getByLabelText('Room ID') as HTMLInputElement

      expect(roomIdInput.value).toBe('')
      
      fireEvent.click(generateButton)
      
      expect(roomIdInput.value).not.toBe('')
      expect(roomIdInput.value.length).toBeGreaterThan(0)
    })

    it('should generate different room IDs on multiple clicks', () => {
      render(<Home />)

      const generateButton = screen.getByRole('button', { name: 'Generate' })
      const roomIdInput = screen.getByLabelText('Room ID') as HTMLInputElement

      fireEvent.click(generateButton)
      const firstId = roomIdInput.value

      fireEvent.click(generateButton)
      const secondId = roomIdInput.value

      expect(firstId).not.toBe(secondId)
    })
  })

  describe('form submission', () => {
    it('should join room with valid inputs', async () => {
      render(<Home />)

      const usernameInput = screen.getByLabelText('Your Name')
      const roomIdInput = screen.getByLabelText('Room ID')
      const joinButton = screen.getByRole('button', { name: 'Join Room' })

      fireEvent.change(usernameInput, { target: { value: 'John Doe' } })
      fireEvent.change(roomIdInput, { target: { value: 'test-room' } })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/test-room')
      })
    })

    it('should trim whitespace from inputs', async () => {
      render(<Home />)

      const usernameInput = screen.getByLabelText('Your Name')
      const roomIdInput = screen.getByLabelText('Room ID')
      const joinButton = screen.getByRole('button', { name: 'Join Room' })

      fireEvent.change(usernameInput, { target: { value: '  John Doe  ' } })
      fireEvent.change(roomIdInput, { target: { value: '  test-room  ' } })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/test-room')
      })
    })

    it('should handle form submission correctly', async () => {
      render(<Home />)

      const usernameInput = screen.getByLabelText('Your Name')
      const roomIdInput = screen.getByLabelText('Room ID')
      const joinButton = screen.getByRole('button', { name: 'Join Room' })

      fireEvent.change(usernameInput, { target: { value: 'John Doe' } })
      fireEvent.change(roomIdInput, { target: { value: 'test-room' } })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/test-room')
      })
      expect(localStorage.setItem).toHaveBeenCalledWith('username', 'John Doe')
    })
  })

  describe('loading state', () => {
    it('should show loading state while joining room', () => {
      render(<Home />)

      const usernameInput = screen.getByLabelText('Your Name')
      const roomIdInput = screen.getByLabelText('Room ID')
      const joinButton = screen.getByRole('button', { name: 'Join Room' })

      fireEvent.change(usernameInput, { target: { value: 'John Doe' } })
      fireEvent.change(roomIdInput, { target: { value: 'test-room' } })
      fireEvent.click(joinButton)

      expect(screen.getByTestId('spinner')).toBeInTheDocument()
      expect(screen.getByText('Joining...')).toBeInTheDocument()
      expect(joinButton).toBeDisabled()
    })
  })

  describe('accessibility', () => {
    it('should have proper form labels', () => {
      render(<Home />)

      expect(screen.getByLabelText('Your Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Room ID')).toBeInTheDocument()
    })

    it('should have required attributes on inputs', () => {
      render(<Home />)

      const usernameInput = screen.getByLabelText('Your Name')
      const roomIdInput = screen.getByLabelText('Room ID')

      expect(usernameInput).toHaveAttribute('required')
      expect(roomIdInput).toHaveAttribute('required')
    })

    it('should have proper placeholders', () => {
      render(<Home />)

      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter or generate room ID')).toBeInTheDocument()
    })

    it('should be keyboard navigable', () => {
      render(<Home />)

      const usernameInput = screen.getByLabelText('Your Name')
      const roomIdInput = screen.getByLabelText('Room ID')
      const generateButton = screen.getByRole('button', { name: 'Generate' })
      const joinButton = screen.getByRole('button', { name: 'Join Room' })

      usernameInput.focus()
      expect(document.activeElement).toBe(usernameInput)

      roomIdInput.focus()
      expect(document.activeElement).toBe(roomIdInput)

      generateButton.focus()
      expect(document.activeElement).toBe(generateButton)

      joinButton.focus()
      expect(document.activeElement).toBe(joinButton)
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in inputs', async () => {
      render(<Home />)

      const usernameInput = screen.getByLabelText('Your Name')
      const roomIdInput = screen.getByLabelText('Room ID')
      const joinButton = screen.getByRole('button', { name: 'Join Room' })

      fireEvent.change(usernameInput, { target: { value: 'John & Jane O\'Connor' } })
      fireEvent.change(roomIdInput, { target: { value: 'room-@#$%' } })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('username', 'John & Jane O\'Connor')
        expect(mockPush).toHaveBeenCalledWith('/room-@#$%')
      })
    })

    it('should handle very long inputs', async () => {
      render(<Home />)

      const longUsername = 'A'.repeat(100)
      const longRoomId = 'room-' + 'B'.repeat(100)

      const usernameInput = screen.getByLabelText('Your Name')
      const roomIdInput = screen.getByLabelText('Room ID')
      const joinButton = screen.getByRole('button', { name: 'Join Room' })

      fireEvent.change(usernameInput, { target: { value: longUsername } })
      fireEvent.change(roomIdInput, { target: { value: longRoomId } })
      fireEvent.click(joinButton)

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('username', longUsername)
        expect(mockPush).toHaveBeenCalledWith(`/${longRoomId}`)
      })
    })

    it('should handle router navigation errors gracefully', () => {
      mockPush.mockRejectedValueOnce(new Error('Navigation failed'))
      
      render(<Home />)

      const usernameInput = screen.getByLabelText('Your Name')
      const roomIdInput = screen.getByLabelText('Room ID')
      const joinButton = screen.getByRole('button', { name: 'Join Room' })

      fireEvent.change(usernameInput, { target: { value: 'John Doe' } })
      fireEvent.change(roomIdInput, { target: { value: 'test-room' } })
      fireEvent.click(joinButton)

      // Should handle the error without crashing
      expect(screen.getByTestId('spinner')).toBeInTheDocument()
    })
  })
})
