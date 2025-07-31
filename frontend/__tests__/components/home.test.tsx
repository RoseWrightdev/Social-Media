import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import HomePage from '../../app/page'

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

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should render without errors when no auth token', () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    expect(() => render(<HomePage />)).not.toThrow()
  })

  it('should render an empty component for now', () => {
    const { container } = render(<HomePage />)
    
    // The component currently renders an empty fragment
    expect(container.firstChild).toBeNull()
  })
})
