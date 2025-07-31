# Real-time Video Conferencing Platform

A modern, production-ready video conferencing platform built with Go backend and Next.js frontend, featuring WebRTC peer-to-peer communication, real-time chat, screen sharing, and advanced room management.

**🚀 Now with Enterprise-Grade Kubernetes Deployment using Gateway API and Envoy!**
**🧪 Comprehensive Testing Suite: 250+ tests with 100% coverage for critical components!**

## 🎨 UI Designs

The full set of designs is available on my [Figma account](https://www.figma.com/design/7uD81ikYXdkFDPeAWfXRl8/Social-Media----Comms?node-id=41-2&t=lxks1c13fWrUnXKb-0).

![Chat Participants](https://github.com/user-attachments/assets/1354c553-7088-404d-851e-29c9c52f201b)

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

### DevOps & Infrastructure

- **Kubernetes-native deployment** with Gateway API and Envoy
- **Auto-scaling** based on CPU/Memory usage (2-15 replicas)
- **High availability** with Pod Disruption Budgets and anti-affinity
- **Enterprise security** with RBAC, NetworkPolicy, and Pod Security
- **TLS termination** and automatic HTTPS with certificate management
- **Observability-ready** with Prometheus, Grafana, and Jaeger integration
- **GitOps-ready** configurations for ArgoCD/Flux deployment

### 🧪 Testing & Quality Assurance

- **Comprehensive test coverage** with 81 hook tests achieving 100% coverage
- **Robust mocking** for WebSocket, WebRTC, and media stream APIs
- **Integration testing** for real-time communication layers
- **Error scenario testing** for network failures and edge cases
- **Security testing** for authentication and authorization flows
- **Performance testing** for concurrent user scenarios

## 🚀 Deployment Features

### One-Click Production Deployment

```bash
# Deploy entire platform to Kubernetes
./devops/deploy.sh deploy
```

**What gets deployed:**

- ✅ **Envoy Gateway** with Gateway API for advanced traffic management
- ✅ **Auto-scaling** frontend (2-10 pods) and backend (2-15 pods)
- ✅ **TLS termination** with automatic HTTPS certificate management
- ✅ **Security policies** (RBAC, NetworkPolicy, Pod Security Standards)
- ✅ **Monitoring stack** (Prometheus, Grafana, ServiceMonitor)
- ✅ **High availability** with anti-affinity and Pod Disruption Budgets
- ✅ **Load balancing** with health checks and failover
- ✅ **WebSocket support** with dedicated routes and scaling

### Deployment Options

| Environment | Command | Features |
|-------------|---------|----------|
| **Production** | `./devops/deploy.sh deploy` | Full security, auto-scaling, monitoring |
| **Staging** | `KUBECTL_CONTEXT=staging ./devops/deploy.sh deploy` | Production-like with staging context |
| **Development** | `DRY_RUN=true ./devops/deploy.sh deploy` | Validate configs without applying |
| **Health Check** | `./devops/deploy.sh health` | Check deployment status |
| **Cleanup** | `./devops/deploy.sh cleanup` | Remove all resources |

## 🏗️ Architecture

### Production Infrastructure

**Cloud-Native Kubernetes Deployment:**
```
Internet → Envoy Gateway (Gateway API) → Kubernetes Cluster
                                       ├── Frontend (Next.js) - Auto-scaling 2-10 pods
                                       ├── Backend (Go) - Auto-scaling 2-15 pods
                                       ├── WebSocket (Real-time) - Load balanced
                                       └── Monitoring (Prometheus/Grafana)
```

**Key Infrastructure Features:**

- 🚀 **Gateway API** with Envoy for advanced traffic management
- 🔒 **Enterprise Security** (RBAC, NetworkPolicy, Pod Security)
- 📊 **Auto-scaling** based on CPU/Memory metrics
- 🛡️ **High Availability** with multi-zone deployment
- 🔐 **TLS Everywhere** with automatic certificate management
- 📈 **Observability** with Prometheus, Grafana, and distributed tracing

### Backend (Go)

- **WebSocket-based real-time communication** using Gorilla WebSocket
- **JWT authentication** with Auth0 integration
- **Structured message routing** with event-driven architecture
- **Comprehensive test coverage** with unit and integration tests
- **Production-ready logging** and error handling
- **Rate limiting** and CORS protection

### Frontend (Next.js 15)

- **Modern React 19** with TypeScript and App Router
- **Real-time UI updates** with WebSocket integration
- **Responsive design** with Tailwind CSS 4
- **Component testing** with Vitest and React Testing Library
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

- **Go 1.24+** - High-performance backend runtime
- **Gorilla WebSocket** - Real-time WebSocket communication
- **JWT** - Secure authentication with Auth0
- **Gin Framework** - HTTP web framework
- **Testify** - Comprehensive testing framework

### Frontend

- **Next.js 15** - Modern React framework with App Router and Turbopack
- **React 19** - Latest React with concurrent features
- **TypeScript 5** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling with latest features
- **Zustand** - Lightweight state management
- **Vitest & Cypress** - Modern testing frameworks

### DevOps

- **Kubernetes** - Production orchestration with Gateway API
- **Envoy Gateway** - Advanced traffic management and load balancing
- **Docker** - Multi-stage optimized containers
- **Prometheus & Grafana** - Comprehensive monitoring and alerting
- **Auto-scaling** - HPA based on CPU/Memory metrics
- **Security** - RBAC, NetworkPolicy, Pod Security Standards

## 🚦 Getting Started

### Quick Deployment (Production)

**Deploy to Kubernetes with one command:**

```bash
# Clone and deploy
git clone https://github.com/RoseWrightdev/Social-Media.git
cd Social-Media
./devops/deploy.sh deploy
```

**Access your application:**

- Frontend: https://social-media.example.com
- WebSocket: wss://ws.social-media.example.com/ws
- Monitoring: https://social-media.example.com/metrics

### Local Development

### Prerequisites

- Go 1.24 or higher
- Node.js 20 or higher
- Docker (for production deployment)
- Kubernetes cluster (for production deployment)

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
npm run test:run      # Run all tests once
npm run test:coverage # Run tests with coverage report

# Hook tests (100% coverage)
npm test __tests__/hooks/useRoom.test.ts      # Main room management (11 tests)
npm test __tests__/hooks/useParticipants.test.ts # Participant management (18 tests) 
npm test __tests__/hooks/useMediaControls.test.ts # Media controls (18 tests)
npm test __tests__/hooks/useChat.test.ts      # Chat functionality (16 tests)
npm test __tests__/hooks/useRoomUI.test.ts    # UI management (18 tests)

# Integration tests
npm test __tests__/integration/   # Full integration test suite

# E2E tests
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
│   │   ├── useRoom.ts       # Room management hooks (100% tested)
│   │   ├── useMediaStream.ts # Media stream management
│   │   └── useRoomConnection.ts # WebSocket connection handling
│   ├── lib/                 # Utility libraries
│   │   ├── websockets.ts    # WebSocket client (100% tested)
│   │   └── webrtc.ts        # WebRTC manager (100% tested)
│   └── __tests__/           # Test suites
│       ├── hooks/           # Hook tests (81 tests, 100% coverage)
│       ├── components/      # Component tests
│       ├── integration/     # Integration test suites
│       └── security/        # Security-focused tests
└── devops/                  # Production deployment
    ├── deploy.sh            # One-click deployment script
    ├── docker/              # Optimized container configs
    ├── kubernetes/          # K8s manifests with Gateway API
    │   ├── gateway/         # Envoy Gateway configuration
    │   ├── security-policies.yaml
    │   └── monitoring.yaml  # Auto-scaling & observability
    └── README.md            # Deployment documentation
```

## 🔧 Configuration

### Production Deployment

**Copy and configure environment:**

```bash
cd devops
cp .env.example .env
# Edit .env with your values
```

**Key Configuration:**

```bash
# Domain Configuration
DOMAIN=your-domain.com
WEBSOCKET_DOMAIN=ws.your-domain.com

# Auth0 (Base64 encoded)
AUTH0_DOMAIN=your-auth0-domain
AUTH0_CLIENT_ID=your-client-id
JWT_SECRET=your-jwt-secret

# TLS Certificates
TLS_CERT_PATH=/path/to/cert.pem
TLS_KEY_PATH=/path/to/key.pem
```

### Development Environment Variables

```bash
# Backend (.env)
JWT_SECRET=your-jwt-secret
AUTH0_DOMAIN=your-auth0-domain
CORS_ORIGINS=http://localhost:3000

# Frontend (.env.local)
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain
```

### Production Features

The platform includes enterprise-ready configurations:

- **Kubernetes Gateway API** with Envoy for advanced traffic management
- **Auto-scaling** (2-15 replicas) based on CPU/Memory metrics
- **High availability** with Pod Disruption Budgets and anti-affinity
- **Security** with RBAC, NetworkPolicy, and Pod Security Standards
- **TLS termination** and automatic certificate management
- **Monitoring** with Prometheus, Grafana, and distributed tracing
- **GitOps-ready** for ArgoCD/Flux deployment

## 📊 Performance & Scalability

- **WebRTC P2P**: Reduces server load with direct client connections
- **Efficient WebSocket**: Minimal overhead for real-time communication
- **Kubernetes Auto-scaling**: Horizontal scaling from 2-15 replicas based on metrics
- **Envoy Load Balancing**: Advanced traffic distribution and health checking
- **Connection pooling**: Optimized resource utilization
- **Rate limiting**: Protection against abuse and DoS attacks
- **Multi-zone deployment**: High availability across failure domains
- **Resource optimization**: Tuned CPU/Memory requests and limits

## 🧪 Testing

The platform includes comprehensive testing:

- **Backend**: 90%+ test coverage with unit and integration tests
- **Frontend Hooks**: 100% test coverage for all useRoom hooks (81 tests)
  - `useRoom` - Room management and authentication (11 tests)
  - `useParticipants` - Participant management and host actions (18 tests)
  - `useMediaControls` - Media devices and screen sharing (18 tests)
  - `useChat` - Real-time messaging and panel management (16 tests)
  - `useRoomUI` - Layout and UI state management (18 tests)
- **Frontend Components**: Component testing with Vitest and React Testing Library
- **Integration**: WebSocket, WebRTC, and media stream integration tests (100% coverage)
- **E2E**: Full user flow testing with Cypress
- **WebRTC**: Specialized tests for signaling and connection establishment

### Testing Coverage Summary

| Component | Tests | Coverage | Description |
|-----------|-------|----------|-------------|
| **useRoom hooks** | 81 tests | 100% | Complete hook testing suite |
| **WebSocket integration** | 37 tests | 100% | Real-time communication (websockets.ts) |
| **WebRTC integration** | 25 tests | 100% | Peer-to-peer connections (webrtc.ts) |
| **Media stream management** | 11 tests | 100% | Device and stream handling (useMediaStream) |
| **Room connection logic** | 28 tests | 100% | Connection state management (useRoomConnection) |
| **Frontend components** | 50+ tests | 95%+ | UI component testing and integration |
| **Backend Go services** | 50+ tests | 90%+ | WebSocket handlers and room logic |
| **Security & auth** | 15+ tests | 95%+ | Authentication and authorization |

> **Total: 250+ tests ensuring production-ready reliability across all critical components**

## 📚 Documentation

- **[DevOps Guide](devops/README.md)** - Complete Kubernetes deployment guide
- **[API Documentation](backend/go/internal/api/v1/session/openapi.yaml)** - WebSocket API reference
- **[Frontend Components](frontend/components/)** - UI component library
- **[WebRTC Implementation](backend/go/internal/v1/session/webrtc_test.go)** - Signaling examples
- **[Authentication Guide](frontend/AUTHENTICATION.md)** - Auth0 integration details

### Quick Links

- 🚀 **[One-Click Deployment](devops/deploy.sh)** - Deploy to Kubernetes
- 🔧 **[Configuration](devops/.env.example)** - Environment variables
- 🛡️ **[Security](devops/kubernetes/security-policies.yaml)** - RBAC and policies
- 📊 **[Monitoring](devops/kubernetes/monitoring.yaml)** - Observability setup
- 🌐 **[Gateway](devops/kubernetes/gateway/)** - Traffic management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`go test ./... && npm test`)
4. Test deployment (`./devops/deploy.sh deploy DRY_RUN=true`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Workflow

```bash
# Setup development environment
git clone https://github.com/RoseWrightdev/Social-Media.git
cd Social-Media

# Run backend
cd backend/go && go run cmd/v1/session/main.go

# Run frontend (new terminal)
cd frontend && npm run dev

# Run tests
cd frontend && npm test && cd ../backend/go && go test ./...

# Test specific frontend hooks (100% coverage)
cd frontend && npm test __tests__/hooks/

# Test with coverage report
cd frontend && npm run test -- --coverage

# Test production deployment
./devops/deploy.sh deploy
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
