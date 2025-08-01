# Video Conferencing Platform

Production-ready video conferencing with Go and Next.js.

## Features

- Multi-participant video calls
- Real-time chat
- Screen sharing
- Waiting room with host approval
- Role-based permissions

## UI Design

![Chat Participants](https://github.com/user-attachments/assets/1354c553-7088-404d-851e-29c9c52f201b)

Full design system available on [Figma](https://www.figma.com/design/7uD81ikYXdkFDPeAWfXRl8/Social-Media----Comms?node-id=41-2&t=lxks1c13fWrUnXKb-0).

## Key Highlights

- Scale: Auto-scaling Kubernetes deployment (2-15 replicas)
- Reliability: 500+ tests with 100% coverage on critical paths
- Security: JWT auth, RBAC, network policies, pod security
- Observability: Prometheus metrics, distributed tracing
- DevOps: One-command deployment, GitOps-ready

## Quick Start

```bash
git clone https://github.com/RoseWrightdev/Social-Media.git
cd Social-Media
./devops/deploy.sh deploy
```

## Architecture

```text
Client Browser ←→ Next.js Frontend ←→ Go Backend ←→ WebRTC P2P
                         ↓              ↓
                    Zustand State   WebSocket Hub
                         ↓              ↓
                   React Components  Room Manager
```

Core Components:

- Frontend: Next.js with real-time UI updates
- Backend: Go WebSocket server with JWT auth
- Communication: WebRTC for video, WebSocket for signaling
- State: Zustand for client state, Go channels for server state
- Infrastructure: Kubernetes with auto-scaling and monitoring

## Tech Stack

- Backend: Go, WebSocket, JWT
- Frontend: Next.js 15, React 19, TypeScript
- Infrastructure: Kubernetes, Envoy Gateway
- Testing: 500+ tests

## Backend

Tech Stack: Go 1.24+, Gorilla WebSocket, JWT, Gin Framework

Key Features:

- Event-driven WebSocket architecture with Go channels
- JWT authentication with Auth0 integration
- Real-time message routing and room state management
- Rate limiting and CORS protection
- Comprehensive unit and integration tests

## Frontend

Tech Stack: Next.js 15, React 19, TypeScript 5, Zustand, Vitest

Key Features:

- Real-time UI updates with WebSocket integration
- Custom hooks for room, media, and participant management
- WebRTC peer-to-peer video streaming
- Responsive design with modern React patterns
- 100% test coverage on critical user flows

## DevOps

Tech Stack: Kubernetes, Envoy Gateway, Docker, Prometheus, Grafana

Key Features:

- Auto-scaling based on CPU/Memory metrics (2-15 replicas)
- High availability with Pod Disruption Budgets
- Enterprise security (RBAC, NetworkPolicy, Pod Security)
- TLS termination and certificate management
- Monitoring with distributed tracing and alerting

## API & Authentication

OpenAPI Specification: Complete WebSocket API documentation with event schemas, request/response models, and error handling patterns. See [API docs](backend/go/internal/api/v1/session/openapi.yaml).

Auth0 Integration: Production-ready authentication with JWT token validation, user management, and secure session handling. Supports social logins and enterprise SSO.

WebSocket Events: Real-time communication protocol with structured message routing for video calls, chat, screen sharing, and room management.

## Local Development

```bash
# Backend
cd backend/go && go run cmd/v1/session/main.go

# Frontend
cd frontend && npm install && npm run dev
```

## License

MIT License - see [LICENSE](LICENSE) file.
