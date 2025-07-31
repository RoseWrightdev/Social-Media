# Video Conferencing Frontend

A modern, production-ready video conferencing frontend built with Next.js 15, React 19, and TypeScript. Features real-time WebRTC communication, comprehensive testing suite, and enterprise-grade deployment capabilities.

**🧪 100% Test Coverage: 180+ tests across hooks, components, and integration layers**

## 🚀 Features

- **Next.js 15** with App Router and Turbopack for fast development
- **React 19** with concurrent features and modern hooks
- **TypeScript 5** for type-safe development
- **Tailwind CSS 4** for modern styling
- **Zustand** for lightweight state management
- **Vitest** for fast, modern testing
- **100% test coverage** for critical components

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Runtime**: React 19 with TypeScript 5
- **Styling**: Tailwind CSS 4 with utility-first approach
- **State Management**: Zustand for real-time data
- **Testing**: Vitest + React Testing Library + Cypress
- **Real-time**: WebSocket + WebRTC integration
- **Build Tool**: Turbopack for fast development

## 🧪 Testing Suite

Our comprehensive testing includes:

### Hook Testing (81 tests - 100% coverage)

- `useRoom` - Room management and authentication (11 tests)
- `useParticipants` - Participant management (18 tests)
- `useMediaControls` - Media device controls (18 tests)
- `useChat` - Real-time messaging (16 tests)
- `useRoomUI` - UI state management (18 tests)

### Integration Testing (100+ tests)

- WebSocket integration (37 tests)
- WebRTC integration (25 tests)
- Media stream management (11 tests)
- Room connection logic (28 tests)

### Component Testing

- UI component testing with Vitest
- E2E testing with Cypress
- Security and authentication flows

## 🚦 Getting Started

### Prerequisites

- Node.js 20 or higher
- npm, yarn, pnpm, or bun

### Installation

```bash
# Install dependencies
npm install

# Start development server with Turbopack
npm run dev

# Open http://localhost:3000
```

### Development Commands

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests with Vitest
npm run test:run     # Run all tests once
npm run cypress:open # Open Cypress E2E tests
```

## 🧪 Testing Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm test __tests__/hooks/useRoom.test.ts           # Room management (11 tests)
npm test __tests__/hooks/useParticipants.test.ts   # Participants (18 tests)
npm test __tests__/hooks/useMediaControls.test.ts  # Media controls (18 tests)
npm test __tests__/hooks/useChat.test.ts           # Chat functionality (16 tests)
npm test __tests__/hooks/useRoomUI.test.ts         # UI management (18 tests)

# Integration tests
npm test __tests__/integration/                    # WebSocket, WebRTC, media streams

# Run with coverage
npm test -- --coverage

# E2E tests
npm run cypress:open
```

## 📁 Project Structure

```text
frontend/
├── app/                    # Next.js App Router
│   ├── (room)/[roomid]/   # Room pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
│   ├── core/             # Core UI components
│   ├── layout/           # Layout components
│   ├── panels/           # Chat, participants panels
│   └── ui/               # Base UI components
├── hooks/                # Custom React hooks (100% tested)
│   ├── useRoom.ts        # Room management
│   ├── useMediaStream.ts # Media stream handling
│   └── useRoomConnection.ts # WebSocket connection
├── lib/                  # Utility libraries (100% tested)
│   ├── websockets.ts     # WebSocket client
│   ├── webrtc.ts         # WebRTC manager
│   └── utils.ts          # Utility functions
├── store/                # Zustand state management
│   └── useRoomStore.ts   # Global room state
└── __tests__/            # Test suites (180+ tests)
    ├── hooks/            # Hook tests (81 tests, 100% coverage)
    ├── components/       # Component tests
    ├── integration/      # Integration tests (100+ tests)
    └── security/         # Security tests
```

## 🎯 Key Features

### Real-time Communication

- WebRTC peer-to-peer video/audio
- WebSocket signaling for connection establishment
- Real-time chat with message history
- Screen sharing with approval system

### User Experience

- Responsive design for all devices
- Waiting room with host approval
- Multiple layout options (gallery, speaker, sidebar)
- Real-time participant management

### Development Experience

- Fast development with Turbopack
- Type-safe with TypeScript 5
- Comprehensive testing with 100% coverage
- Modern React patterns and hooks

## 🔧 Configuration

### Environment Variables

Create `.env.local` in the root directory:

```bash
# WebSocket connection
NEXT_PUBLIC_WS_URL=ws://localhost:8080

# Authentication (Auth0)
NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
```

### Production Deployment

The frontend is designed for production deployment with:

- **Kubernetes** with auto-scaling (2-10 pods)
- **Envoy Gateway** for advanced traffic management
- **TLS termination** and HTTPS
- **Health checks** and monitoring
- **Resource optimization** and caching

## 📊 Performance

- **Fast development** with Turbopack
- **Optimized builds** with Next.js 15
- **Efficient WebRTC** peer-to-peer connections
- **Minimal JavaScript** with tree shaking
- **Modern browser features** for optimal performance

## 🤝 Contributing

1. Install dependencies: `npm install`
2. Start development: `npm run dev`
3. Run tests: `npm test`
4. Create your feature
5. Ensure tests pass: `npm run test -- --coverage`
6. Submit pull request

## 📚 Learn More

- **[Main Project README](../README.md)** - Complete project documentation
- **[Next.js Documentation](https://nextjs.org/docs)** - Next.js features and API
- **[React Documentation](https://react.dev)** - React 19 features
- **[Tailwind CSS](https://tailwindcss.com/docs)** - Utility-first CSS
- **[Vitest Documentation](https://vitest.dev)** - Modern testing framework
- **[WebRTC Implementation](../backend/go/internal/v1/session/webrtc_test.go)** - Signaling examples

## 📄 License

This project is part of the Real-time Video Conferencing Platform and is licensed under the MIT License.
