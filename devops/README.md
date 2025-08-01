# DevOps Configuration

Production-ready Kubernetes deployment with auto-scaling and enterprise logging.

## Quick Deploy

```bash
./devops/deploy.sh deploy
```

## Architecture

```text
Internet ←→ Envoy Gateway ←→ Kubernetes Services
                ↓              ↓         ↓
            Gateway API    Frontend   Backend
                ↓           (Next.js)    (Go)
            Load Balancer   Port 3000  Port 8080
                ↓              ↓         ↓
            TLS Termination  Auto-scale Auto-scale
```

## Key Highlights

- Scale: Auto-scaling 2-10 frontend, 2-15 backend replicas
- Security: RBAC, NetworkPolicy, Pod Security, TLS everywhere  
- Observability: ELK stack with Fluent Bit/Vector sidecars
- Infrastructure: Gateway API with Envoy for enterprise routing

## Structure

```text
devops/
├── deploy.sh                      # Deployment script
├── README.md                      # This file
├── docker/                       # Docker configurations
│   ├── .dockerignore             # Docker ignore patterns
│   ├── frontend.dockerfile       # Frontend container
│   └── backend.dockerfile        # Backend container
├── kubernetes/                   # Kubernetes manifests
│   ├── frontend-deployment.yaml  # Frontend deployment & service
│   ├── backend-deployment.yaml   # Backend with logging sidecars
│   ├── logging-infrastructure.yaml # ELK stack deployment
│   ├── log-retention.yaml        # Log lifecycle management
│   ├── logging-dashboard.yaml    # Grafana dashboards & alerts
│   ├── security-policies.yaml    # RBAC, NetworkPolicy, PSP
│   ├── monitoring.yaml           # HPA, PDB, ServiceMonitor
│   └── gateway/                  # Gateway API configurations
│       ├── gateway.yaml          # Gateway definition
│       ├── routes.yaml           # HTTPRoute definitions
│       └── envoy-config.yaml     # Envoy-specific configuration
└── NGINX/                        # Legacy NGINX config (optional)
    └── nginx.conf
```

## Components

Tech Stack: Kubernetes 1.25+, Gateway API, Envoy, Docker, ELK Stack

Core Infrastructure:

- Gateway API with Envoy for traffic management
- Auto-scaling deployments with HPA and PDB  
- Enterprise logging with Fluent Bit and Vector sidecars
- Comprehensive security policies and RBAC
- Prometheus monitoring and health checks

## Prerequisites

- Kubernetes Cluster (v1.25+)
- kubectl configured  
- Docker for building images

## Deployment

```bash
# Deploy entire platform
./devops/deploy.sh deploy

# Step by step
./devops/deploy.sh prerequisites  
./devops/deploy.sh build
./devops/deploy.sh deploy

# Check status
./devops/deploy.sh health
```

Access Points:

- Frontend: <https://social-media.example.com>
- WebSocket: wss://ws.social-media.example.com/ws  
- API: <https://social-media.example.com/api>

## Enterprise Logging

Tech Stack: Fluent Bit, Vector, Elasticsearch, Kibana

Architecture:

```text
Backend App → Shared Volume → Fluent Bit → Vector → Elasticsearch → Kibana
     ↓              ↓            ↓         ↓           ↓          ↓
  File Logs    Log Files    Parsing   Processing   Storage   Visualization
```

Key Features:

- Structured JSON logging with correlation IDs
- Real-time processing with TLS security
- Full-text search across all application logs  
- 90-day retention with automated archival
- Log metrics and pattern-based alerting

## Configuration

Environment Variables:

Frontend:

- `NEXT_TELEMETRY_DISABLED=1`
- `NODE_ENV=production`  
- `BACKEND_URL=http://backend-service:8080`

Backend:

- `GO_ENV=production`
- `PORT=8080`
- `JWT_SECRET`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID` (from secrets)

Secrets Setup:

Update the secrets in `backend-deployment.yaml`:

```bash
# Encode your secrets
echo -n "your-jwt-secret" | base64
echo -n "your-auth0-domain" | base64
echo -n "your-auth0-client-id" | base64
```

TLS Setup:

```bash
kubectl create secret tls social-media-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  -n social-media
```

## Gateway Features

Tech Stack: Gateway API, Envoy Gateway, TLS termination

Core Features:

- HTTP/HTTPS routing with automatic redirects
- WebSocket support for real-time communication
- Load balancing across multiple replicas
- TLS termination with certificate management
- Header modification and path-based routing

Security:

- Non-root containers with dropped capabilities
- Read-only root filesystem and security contexts
- NetworkPolicy for traffic control and TLS everywhere
- RBAC with minimal permissions and service accounts

## Monitoring & Scaling

Auto-scaling:

- HPA: CPU and memory-based scaling
- Frontend: 2-10 replicas, Backend: 2-15 replicas
- Pod Disruption Budgets for high availability

Observability:

- Prometheus ServiceMonitor and metrics endpoints
- Health checks and rolling updates
- Anti-affinity rules for distribution

## Operations

Development:

```bash
# Use local images
DRY_RUN=true ./devops/deploy.sh deploy

# Port forward for testing
kubectl port-forward svc/frontend-service 3000:80 -n social-media
kubectl port-forward svc/backend-service 8080:80 -n social-media
```

Production:

```bash
KUBECTL_CONTEXT=production ./devops/deploy.sh deploy
```

## Troubleshooting

```bash
# Deploy with production settings
KUBECTL_CONTEXT=production ./devops/deploy.sh deploy
```

Check Status:

```bash
kubectl get pods -n social-media
kubectl logs -f deployment/frontend-deployment -n social-media
kubectl logs -f deployment/backend-deployment -n social-media
```

Gateway Issues:

```bash
kubectl get gateway -n social-media
kubectl get httproute -n social-media
kubectl describe gateway social-media-gateway -n social-media
```

Network Debug:

```bash
kubectl get svc -n social-media
kubectl get endpoints -n social-media
kubectl get networkpolicy -n social-media
```

## Advanced Configuration

```bash
./devops/deploy.sh cleanup
```

## Custom Domains

To use your own domain:

1. Update hostnames in `gateway/routes.yaml`
2. Update TLS certificate in `gateway/gateway.yaml`
3. Point your DNS to the Gateway LoadBalancer IP

```bash
# Get Gateway IP
## Advanced Configuration

Custom Domains:

```bash
# Get Gateway LoadBalancer IP
kubectl get gateway social-media-gateway -n social-media -o jsonpath='{.status.addresses[0].value}'
```

1. Update hostnames in `gateway/routes.yaml`
2. Update TLS certificate in `gateway/gateway.yaml`  
3. Point DNS to Gateway IP

Envoy Customization:

Modify `gateway/envoy-config.yaml` for enterprise features:

- Rate limiting and circuit breakers
- Authentication filters and custom listeners
- Advanced routing and traffic management

Observability Stack:

```bash
# Deploy monitoring stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

GitOps Integration:

```yaml
# ArgoCD Application example
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: social-media
spec:
  source:
    repoURL: https://github.com/RoseWrightdev/Social-Media
    path: devops/kubernetes
    targetRevision: HEAD
  destination:
    server: https://kubernetes.default.svc
    namespace: social-media
```

## Cleanup

```bash
./devops/deploy.sh cleanup
```
