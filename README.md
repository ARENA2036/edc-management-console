# EDC Management Console

EDC management platform for Tractus-X EDC (Eclipse Dataspace Connector) instances with Keycloak authentication.

## Features

- 🔐 **Keycloak Authentication** - Secure OAuth2/OIDC authentication
- 📊 **Dashboard** - Real-time monitoring with statistics cards
- 🚀 **EDC Deployment Wizard** - Step-by-step EDC deployment
- 📋 **Connector Management** - Full CRUD operations for EDC connectors
- 📈 **Activity Logging** - Track all system activities

## Documentation Paths

Choose the path that matches your role:

- Workshop participant or first-time user: start with the [user guide](docs/user-guide/README.md). It explains login, dashboard navigation, connector deployment, component setup, dataspace settings, and SDE handoff.
- Workshop coach or tutorial organizer: use the [end-to-end workshop guide](docs/README.md) for onboarding context and the overall EMC-to-SDE flow.
- Developer or operator: continue with the setup sections below for local execution, configuration, and deployment prerequisites.

## Technology Stack

### Backend
- **Python 3.11** with FastAPI
- **SQLite by default** with SQLAlchemy ORM
- **API Key and Keycloak Authentication** depending on endpoint

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Keycloak-js** for authentication
- **React Router** for navigation

## Local Setup

### Prerequisites

For local development:

- Python 3.11+
- Node.js 20+
- Keycloak 23+ or a compatible configured Keycloak instance

For containerized or Kubernetes-based deployment:

- [Docker](https://docs.docker.com/get-docker/) for building and running backend/frontend images.
- [kubectl](https://kubernetes.io/docs/tasks/tools/) for interacting with the target Kubernetes cluster.
- [Helm v3+](https://helm.sh/docs/intro/install/) for installing and upgrading chart-based deployments.
- Cloud or platform CLI access, if your target Kubernetes environment requires it.
- Access to the container registry used by your organization.
- Access to a Kubernetes cluster or another supported runtime environment for deploying the backend, frontend, and connector-related services.
- Deployment-specific configuration values for the backend and frontend, including authentication settings, dataspace settings, SDE URL, connector hostnames, cluster context, namespace, and registry credentials.

Before deploying to a shared environment, confirm that `kubectl` points to the correct cluster and namespace, and that your registry credentials allow the cluster to pull the EMC images.

### 1. Clone Repository
```bash
git clone <repository-url>
cd edc-management-console
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment variables or configure backend/config/configuration.yml values:
# - API_KEY (your secure API key)
# - Keycloak credentials
```

**Environment Variables (.env):**
```env
# API Authentication
API_KEY=your-secure-api-key-here

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=CX-Central
KEYCLOAK_CLIENT_ID=CX-EDC
CENTRALIDP_CLIENT_ID=your-client-id
CENTRALIDP_CLIENT_SECRET=your-client-secret
```

**Run Backend:**
```bash
python init.py --host 0.0.0.0 --port 8001
```

Backend will be available at: `http://localhost:8001`  
API Documentation: `http://localhost:8001/docs`

> Note: the backend managers are initialized by the `init_app()` path. If you start the backend with `uvicorn init:app`, make sure startup/lifespan initialization has been wired first.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Create frontend/.env and set your values:
```

**Frontend Environment (.env):**
```env
VITE_BACKEND_URL=http://localhost:8001
VITE_API_KEY=your-secure-api-key-here

# Keycloak Configuration
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=CX-Central
VITE_KEYCLOAK_CLIENT_ID=CX-EDC

# Optional companion app
VITE_SDE_URL=https://sde.example.com
```

**Run Frontend:**
```bash
npm run dev
```

Frontend will be available at: `http://localhost:5000`

### 4. Keycloak Setup

The frontend starts with Keycloak login, so a working Keycloak configuration is required unless the application code is changed for local development.

1. **Install Keycloak:**
```bash
# Using Docker
docker run -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```

2. **Configure Keycloak:**
- Access Keycloak admin console: `http://localhost:8080`
- Create realm: `CX-Central`
- Create client: `CX-EDC`
  - Client Protocol: `openid-connect`
  - Access Type: `public`
  - Valid Redirect URIs: `http://localhost:5000/*`
  - Web Origins: `http://localhost:5000`
- Create users and assign roles

### 5. Database Migration

The application automatically creates SQLite tables on startup. For manual migration:

```bash
cd backend
python -c "from managers.databaseManager import DatabaseManager; DatabaseManager('sqlite:///edc_manager.db').create_tables()"
```

## Usage

### Deploying an EDC Connector

1. Click **ADD** on the dashboard.
2. Choose **EDC Connector**.
3. Enter connector name, BPNL, version, API/control-plane endpoint, and data-plane endpoint.
4. Deploy the connector, or deploy and continue into the component wizard when available.

### Managing Connectors

- **View YAML:** Click the YAML button to see connector configuration
- **Add Component:** Link a Submodel Service or Digital Twin Registry to a connector
- **Delete:** Remove connector (confirmation required)
- **Monitor Health:** View real-time health status

### Dashboard Features

- **Data Space Card:** Shows current dataspace (Catena-X)
- **System Health:** Overall system status
- **Activity:** Recent system activities
- **EDC Connectors:** Total and active connector count

## API Endpoints

### Components
A component is anything the console can deploy: a connector, a digital twin
registry, a submodel server, ...

- `GET /api/components` - List all deployed components
- `POST /api/component` - Deploy one or more components
- `GET /api/components/{id}` - Get one component
- `PUT /api/components/{id}` - Upgrade one or more components
- `DELETE /api/components/{name}` - Delete one component by name
- `GET /api/components/health` - Health of every deployed component
- `GET /api/components/{name}/health` - Health of one component by name

### System
- `GET /health` - Backend health
- `GET /api/config` - Application configuration
- `GET /api/dataspace` - Dataspace settings
- `GET /api/logs` - Activity logs, when enabled by the backend

### Companion Applications
- SDE opens from the frontend using `VITE_SDE_URL` or the configured SDE URL returned by `/api/dataspace`.

## Architecture

```
├── backend/
│   ├── config/              # YAML configurations
│   ├── managers/            # Business logic managers
│   │   ├── authManager.py   # Authentication
│   │   ├── databaseManager.py # Database operations
│   │   └── edcManager.py    # EDC management
│   ├── service/             # Service layer
│   │   └── edcService.py    # EDC integration
│   ├── models/              # Data models
│   │   ├── database.py      # SQLAlchemy models
│   │   └── requests.py      # API request models
│   ├── utilities/           # Helper utilities
│   └── init.py              # FastAPI application
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   ├── DeploymentWizard.tsx
│   │   │   ├── ConnectorsManager.tsx
│   │   │   └── ComponentsManager.tsx
│   │   ├── api/             # API client
│   │   ├── types/           # TypeScript types
│   │   ├── auth/keycloak.ts # Keycloak integration
│   │   └── AppNew.tsx       # Main application
```

## Security Considerations

### Production Deployment

1. **Change default API key** in configuration
2. **Use strong database credentials**
3. **Enable HTTPS** for all connections
4. **Configure CORS** properly
5. **Use Keycloak** for production authentication
6. **Rotate secrets** regularly
7. **Enable rate limiting** on API endpoints

### Environment Variables

Never commit `.env` files to version control. Create them locally and keep real values outside the repository.

## Development

### Running Tests
```bash
# Backend tests
cd backend
pytest

# Frontend tests  
cd frontend
npm test
```

### Code Quality
```bash
# Backend linting
cd backend
black .
flake8 .

# Frontend linting
cd frontend
npm run lint
```

## Troubleshooting

### Backend Issues

**Database initialization failed:**
- Ensure the backend can write `edc_manager.db`
- Ensure backend startup initialization runs before API requests

**API key authentication failed:**
- Check API_KEY in backend .env
- Ensure frontend sends correct header (X-Api-Key)
- Verify VITE_API_KEY in frontend .env

### Frontend Issues

**Blank screen:**
- Check browser console for errors
- Verify API connection (`VITE_BACKEND_URL`)
- Ensure backend is running

**Keycloak redirect loop:**
- Check Keycloak client configuration
- Verify redirect URIs
- Ensure realm and client ID match

### Network Issues

**CORS errors:**
- Backend CORS middleware is configured for all origins in development
- For production, restrict origins in init.py


## License

- Code: Apache-2.0
- Non-code: CC-BY-4.0
- Notice: see `NOTICE` when present in the repository
- Source URL: https://github.com/eclipse-tractusx/edc-management-console
