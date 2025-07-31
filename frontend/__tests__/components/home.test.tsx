import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Home from '@/app/page'
import { SessionProvider } from 'next-auth/react'

// Mock next-auth session
const mockSession = {
  user: {
    name: 'Test User',
    email: 'test@example.com',
  },
  expires: '2025-12-31',
}

describe('Home Page', () => {
  it('should render sign in page when not authenticated', () => {
    render(
      <SessionProvider session={null}>
        <Home />
      </SessionProvider>
    )

    expect(screen.getByText('Video Conference App')).toBeInTheDocument()
    expect(screen.getByText('Sign In to Continue')).toBeInTheDocument()
  })

  it('should render dashboard when authenticated', () => {
    render(
      <SessionProvider session={mockSession}>
        <Home />
      </SessionProvider>
    )

    expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument()
    expect(screen.getByText('Create New Room')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter room ID')).toBeInTheDocument()
  })
})
