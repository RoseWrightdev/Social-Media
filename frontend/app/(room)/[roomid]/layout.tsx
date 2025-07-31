import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Video Room',
  description: 'Video conferencing room',
}

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
