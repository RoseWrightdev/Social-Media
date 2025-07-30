# Real-time Video Conferencing Platform

A modern, production-ready video conferencing platform built with Go backend and Next.js frontend, featuring WebRTC peer-to-peer communication, real-time chat, screen sharing, and advanced room management.

## 🚀 Features

### 🎥 Video Conferencing

- **Multi-participant video calls** with WebRTC peer-to-peer connections
- **Real-time audio/video streaming** with automatic quality adaptation
- **Connection establishment** via SDP offer/answer exchange
- **ICE candidate exchange** for NAT traversal and optimal routing
- **Connection renegotiation** for dynamic stream management

### 💬 Real-time Chat

- **Persistent messaging** with configurable history limits (last 50 messages)
- **Message validation** and content moderation (1000 character limit)
- **Real-time broadcasting** to all participants
- **Message deletion** for hosts and authors

### 🖥️ Screen Sharing

- **Host-controlled approval system** for screen sharing requests
- **Multiple concurrent screen shares** support
- **Dynamic stream management** with WebRTC renegotiation
- **Seamless integration** with video conferencing

### 🚪 Waiting Room

- **Security-focused admission control** with host approval
- **First-user-host privilege** for room ownership
- **Request/approve/deny workflow** for joining participants
- **Real-time notifications** for waiting room events

### 🔐 Permission System

Hierarchical role-based access control:

- **Waiting**: Users awaiting admission (limited permissions)
- **Participant**: Active meeting participants (chat, video, hand raising)
- **Screenshare**: Currently sharing screen (enhanced privileges)
- **Host**: Room administrators (full control, user management)

### ✋ Interactive Features

- **Hand raising system** for speaking queue management
- **Participant management** with real-time status updates
- **Room state synchronization** across all clients
- **Connection status monitoring** and automatic reconnection

## 🏗️ Architecture

### Backend (Go)

- **WebSocket-based real-time communication** using Gorilla WebSocket
- **JWT authentication** with Auth0 integration
- **Structured message routing** with event-driven architecture
- **Comprehensive test coverage** with unit and integration tests
- **Production-ready logging** and error handling
- **Rate limiting** and CORS protection

### Frontend (Next.js 14)

- **Modern React** with TypeScript and App Router
- **Real-time UI updates** with WebSocket integration
- **Responsive design** with Tailwind CSS
- **Component testing** with Jest and React Testing Library
- **E2E testing** with Cypress
- **Zustand state management** for real-time data

### WebRTC Implementation

- **Peer-to-peer connections** for low-latency communication
- **SDP offer/answer exchange** through WebSocket signaling
- **ICE candidate gathering** for optimal connectivity
- **Dynamic renegotiation** for stream management
- **Cross-browser compatibility** with modern WebRTC APIs

## 📋 API Documentation

The platform provides comprehensive WebSocket APIs for:

### Connection Endpoints

- `ws://localhost:8080/ws/zoom/{roomId}` - Video conferencing
- `ws://localhost:8080/ws/screenshare/{roomId}` - Screen sharing
- `ws://localhost:8080/ws/chat/{roomId}` - Text chat

### WebRTC Signaling Events

- `offer` - WebRTC offer for establishing peer connections
- `answer` - WebRTC answer responding to offers
- `candidate` - ICE candidates for connectivity establishment
- `renegotiate` - Connection renegotiation for stream changes

### Room Management Events

- `connect`/`disconnect` - User connection management
- `request_waiting`/`accept_waiting`/`deny_waiting` - Waiting room control
- `raise_hand`/`lower_hand` - Speaking queue management
- `add_chat`/`delete_chat`/`get_recent_chats` - Chat functionality
- `request_screenshare`/`accept_screenshare`/`deny_screenshare` - Screen sharing control

Full API documentation is available in the [OpenAPI specification](backend/go/internal/api/v1/session/openapi.yaml).

## 🛠️ Tech Stack

### Backend

- **Go 1.21+** - High-performance backend runtime
- **Gorilla WebSocket** - Real-time WebSocket communication
- **JWT** - Secure authentication with Auth0
- **Testify** - Comprehensive testing framework

### Frontend

- **Next.js 14** - Modern React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Zustand** - Lightweight state management
- **Jest & Cypress** - Testing frameworks

### DevOps

- **Docker** - Containerized deployment
- **Kubernetes** - Production orchestration
- **NGINX** - Load balancing and reverse proxy

## 🚦 Getting Started

### Prerequisites

- Go 1.21 or higher
- Node.js 18 or higher
- Docker (optional, for containerized deployment)

### Backend Setup

```bash
cd backend/go
go mod download
go run cmd/v1/session/main.go
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# Backend tests
cd backend/go
go test ./...

# Frontend tests
cd frontend
npm test              # Unit tests
npm run test:e2e      # E2E tests
```

## 📁 Project Structure

```text
Social-Media/
├── backend/go/               # Go backend
│   ├── cmd/v1/session/      # Application entrypoint
│   ├── internal/v1/session/ # Core session logic
│   │   ├── handlers.go      # WebSocket event handlers
│   │   ├── types.go         # Data structures and types
│   │   ├── client.go        # Client connection management
│   │   ├── room.go          # Room state management
│   │   └── *_test.go        # Comprehensive test suite
│   └── docs/                # Documentation
├── frontend/                # Next.js frontend
│   ├── app/                 # App Router pages
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility libraries
│   └── __tests__/           # Test suites
└── devops/                  # Deployment configuration
    ├── kubernetes/          # K8s manifests
    └── NGINX/              # Load balancer config
```

## 🔧 Configuration

### Environment Variables

```bash
# Backend
JWT_SECRET=your-jwt-secret
AUTH0_DOMAIN=your-auth0-domain
CORS_ORIGINS=http://localhost:3000

# Frontend
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain
```

### Production Deployment

The platform includes production-ready configurations:

- **Kubernetes manifests** for scalable deployment
- **NGINX configuration** for load balancing
- **Docker containers** for consistent environments
- **Rate limiting** and security headers

## 📊 Performance & Scalability

- **WebRTC P2P**: Reduces server load with direct client connections
- **Efficient WebSocket**: Minimal overhead for real-time communication
- **Horizontal scaling**: Stateless backend design supports multiple instances
- **Connection pooling**: Optimized resource utilization
- **Rate limiting**: Protection against abuse and DoS attacks

## 🧪 Testing

The platform includes comprehensive testing:

- **Backend**: 95%+ test coverage with unit and integration tests
- **Frontend**: Component testing with Jest and React Testing Library
- **E2E**: Full user flow testing with Cypress
- **WebRTC**: Specialized tests for signaling and connection establishment

## 📚 Documentation

- [API Documentation](backend/go/internal/api/v1/session/openapi.yaml) - Complete WebSocket API reference
- [Frontend Components](frontend/components/) - UI component library
- [WebRTC Implementation](backend/go/internal/v1/session/webrtc_test.go) - Signaling test examples

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`go test ./... && npm test`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎨 UI Screenshots

The full set of designs is available on my [Figma account](https://www.figma.com/design/7uD81ikYXdkFDPeAWfXRl8/Social-Media----Comms?node-id=41-2&t=lxks1c13fWrUnXKb-0).

![UI Shown Talking](https://github.com/user-attachments/assets/af9924f4-9724-4bc3-8b6f-cf4feac0755f)

![Chat Participants](https://github.com/user-attachments/assets/1354c553-7088-404d-851e-29c9c52f201b)

![UI Shown No Camera Talking](https://github.com/user-attachments/assets/4da5e28a-40dc-4d57-a886-259692388859)
