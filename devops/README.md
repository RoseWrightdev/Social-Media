# DevOps Configuration for Social Media Platform

This directory contains all the DevOps configurations for deploying the Social Media Platform using Kubernetes, Gateway API, and Envoy.

## Architecture Overview

```
Internet
    ↓
Envoy Gateway (Gateway API)
    ↓
┌─────────────────────────────────────┐
│             Kubernetes              │
│  ┌─────────────┐  ┌─────────────┐   │
│  │  Frontend   │  │   Backend   │   │
│  │ (Next.js)   │  │    (Go)     │   │
│  │   Port 3000 │  │  Port 8080  │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
```

## Directory Structure

```
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

## Prerequisites

1. **Kubernetes Cluster** (v1.25+)
2. **kubectl** configured to access your cluster
3. **Docker** for building images
4. **Gateway API CRDs** (automatically installed by script)
5. **Envoy Gateway** (automatically installed by script)

## Quick Start

### 1. Deploy Everything
```bash
# Deploy the entire platform
./devops/deploy.sh deploy

# Or step by step:
./devops/deploy.sh prerequisites
./devops/deploy.sh build
./devops/deploy.sh deploy
```

### 2. Check Deployment Status
```bash
./devops/deploy.sh health
```

### 3. Access the Application
- **Frontend**: https://social-media.example.com
- **WebSocket**: wss://ws.social-media.example.com/ws
- **API**: https://social-media.example.com/api

## 🔍 Logging Architecture

### Sidecar Container Implementation

The backend deployment includes **enterprise-grade logging sidecars** for comprehensive log management:

#### **Fluent Bit Sidecar**
- **Real-time log collection** from application logs
- **JSON parsing** and structured logging
- **Kubernetes metadata enrichment** (pod, node, namespace)
- **Metrics exposition** for monitoring log pipeline health
- **Multi-format support** (JSON, plain text, custom parsers)

#### **Vector Sidecar**
- **Advanced log processing** and transformation
- **Event enrichment** with application context
- **Multiple output destinations** (Elasticsearch, Prometheus, console)
- **High-performance** data routing and aggregation
- **Real-time metrics** for observability

#### **Centralized ELK Stack**
- **Elasticsearch cluster** (3 nodes) for log storage and search
- **Kibana dashboard** for log visualization and analysis
- **Index lifecycle management** (hot/warm/cold/delete phases)
- **Automated retention** (90-day default with customizable policies)
- **Log correlation** across services and user sessions

### Log Processing Pipeline

```
Backend App → Shared Volume → Fluent Bit → Vector → Elasticsearch → Kibana
     ↓              ↓            ↓         ↓           ↓          ↓
  File Logs    Log Files    Parsing   Processing   Storage   Visualization
```

**Key Features:**
- 📊 **Structured Logging** with JSON format and metadata
- 🔍 **Full-text Search** across all application logs
- 📈 **Log Metrics** and alerting based on log patterns
- 🏷️ **Correlation IDs** for request tracing across services
- 🔐 **Secure Log Transport** with TLS and authentication
- ⚡ **Real-time Processing** with minimal latency
- 🗂️ **Automated Archival** and lifecycle management

## Configuration

### Environment Variables

#### Frontend
- `NEXT_TELEMETRY_DISABLED=1`
- `NODE_ENV=production`
- `BACKEND_URL=http://backend-service:8080`

#### Backend
- `GO_ENV=production`
- `PORT=8080`
- `JWT_SECRET` (from secret)
- `AUTH0_DOMAIN` (from secret)
- `AUTH0_CLIENT_ID` (from secret)

### Secrets Configuration

Update the secrets in `backend-deployment.yaml`:

```bash
# Encode your secrets
echo -n "your-jwt-secret" | base64
echo -n "your-auth0-domain" | base64
echo -n "your-auth0-client-id" | base64
```

### TLS Configuration

Update the TLS certificate in `gateway/gateway.yaml`:

```bash
# Create TLS secret with your certificates
kubectl create secret tls social-media-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  -n social-media
```

## Gateway API Features

### HTTP Routes
- **Frontend Routes**: Static assets, API proxy
- **Backend Routes**: REST API endpoints
- **WebSocket Routes**: Real-time communication
- **Redirects**: HTTP to HTTPS

### Advanced Features
- **TLS Termination**: Automatic HTTPS
- **Load Balancing**: Across multiple replicas
- **Header Modification**: Request/response headers
- **Path-based Routing**: Different backends for different paths

### Envoy Configuration
- **Security**: Non-root containers, capabilities dropped
- **Observability**: Metrics, access logs
- **High Availability**: Multiple replicas with anti-affinity
- **Resource Limits**: CPU and memory constraints

## Security Features

### Pod Security
- Non-root containers
- Read-only root filesystem
- Dropped capabilities
- Security contexts

### Network Security
- NetworkPolicy for traffic control
- Service mesh ready
- TLS everywhere

### RBAC
- Minimal permissions
- Service accounts
- Role-based access

## Monitoring & Scaling

### Auto-scaling
- **HPA**: CPU and memory-based scaling
- **Frontend**: 2-10 replicas
- **Backend**: 2-15 replicas

### Monitoring
- Prometheus ServiceMonitor
- Health checks
- Metrics endpoints

### High Availability
- Pod Disruption Budgets
- Anti-affinity rules
- Rolling updates

## Development vs Production

### Development
```bash
# Use local images
DRY_RUN=true ./devops/deploy.sh deploy

# Port forward for local access
kubectl port-forward svc/frontend-service 3000:80 -n social-media
kubectl port-forward svc/backend-service 8080:80 -n social-media
```

### Production
```bash
# Deploy with production settings
KUBECTL_CONTEXT=production ./devops/deploy.sh deploy
```

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n social-media
kubectl logs -f deployment/frontend-deployment -n social-media
kubectl logs -f deployment/backend-deployment -n social-media
```

### Check Gateway Status
```bash
kubectl get gateway -n social-media
kubectl get httproute -n social-media
kubectl describe gateway social-media-gateway -n social-media
```

### Check Services
```bash
kubectl get svc -n social-media
kubectl get endpoints -n social-media
```

### Debug Network Issues
```bash
# Check NetworkPolicy
kubectl get networkpolicy -n social-media

# Test service connectivity
kubectl run test-pod --image=busybox -it --rm -n social-media -- /bin/sh
# Inside pod: wget -qO- http://frontend-service/api/health
```

## Cleanup

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
kubectl get gateway social-media-gateway -n social-media -o jsonpath='{.status.addresses[0].value}'
```

## Advanced Configuration

### Custom Envoy Config
Modify `gateway/envoy-config.yaml` for advanced Envoy features:
- Rate limiting
- Authentication filters
- Custom listeners
- Circuit breakers

### Observability Stack
Deploy with Prometheus, Grafana, and Jaeger:
```bash
# Add to your cluster
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

### GitOps Integration
Use ArgoCD or Flux for GitOps deployment:
```yaml
# ArgoCD Application
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
