/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from '@/components/core/spinner'

describe('Spinner', () => {
  describe('rendering', () => {
    it('should render with default props', () => {
      render(<Spinner />)

      const spinner = screen.getByRole('status')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('w-6', 'h-6') // default md size
    })

    it('should render with small size', () => {
      render(<Spinner size="sm" />)

      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('w-4', 'h-4')
    })

    it('should render with medium size', () => {
      render(<Spinner size="md" />)

      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('w-6', 'h-6')
    })

    it('should render with large size', () => {
      render(<Spinner size="lg" />)

      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('w-8', 'h-8')
    })

    it('should apply custom className', () => {
      render(<Spinner className="custom-class" />)

      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('custom-class')
    })

    it('should have correct base classes', () => {
      render(<Spinner />)

      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass(
        'animate-spin',
        'rounded-full',
        'border-2',
        'border-gray-300',
        'border-t-blue-600'
      )
    })
  })

  describe('accessibility', () => {
    it('should have proper role for screen readers', () => {
      render(<Spinner />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should have loading text for screen readers', () => {
      render(<Spinner />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle undefined size gracefully', () => {
      render(<Spinner size={undefined} />)

      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('w-6', 'h-6') // should default to md
    })

    it('should handle empty className', () => {
      render(<Spinner className="" />)

      const spinner = screen.getByRole('status')
      expect(spinner).toBeInTheDocument()
    })

    it('should combine size and custom className', () => {
      render(<Spinner size="lg" className="my-custom-class" />)

      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('w-8', 'h-8', 'my-custom-class')
    })
  })
})
