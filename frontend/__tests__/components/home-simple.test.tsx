import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import HomePage from '../../app/page'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
}))

// Mock localStorage for JWT token storage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

// Mock room store
vi.mock('../../store/useRoomStore', () => ({
  useRoomStore: vi.fn(() => ({
    roomId: '',
    currentUsername: '',
    initializeRoom: vi.fn(),
    isJoined: false,
    connectionState: {
      wsConnected: false,
      lastError: null
    }
  }))
}))

describe('HomePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should render without crashing', () => {
    expect(() => render(<HomePage />)).not.toThrow()
  })

  it('should render an empty component for now', () => {
    const { container } = render(<HomePage />)
    
    // The component currently renders an empty fragment
    expect(container.firstChild).toBeNull()
  })

  it('should be ready for future content', () => {
    render(<HomePage />)
    
    // This is a placeholder test for when we add real content
    // For now, just ensure no errors are thrown
    expect(true).toBe(true)
  })
})
