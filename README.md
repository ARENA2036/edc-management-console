# ARENA2036 EDC Management Console

EDC management platform for TractusX EDC (Eclipse Dataspace Connector) instances with Keycloak authentication.

## Features

- 🔐 **Keycloak Authentication** - Secure OAuth2/OIDC authentication
- 📊 **Dashboard** - Real-time monitoring with statistics cards
- 🚀 **EDC Deployment Wizard** - Step-by-step EDC deployment
- 📋 **Connector Management** - Full CRUD operations for EDC connectors
- 📈 **Activity Logging** - Track all system activities

## Technology Stack

### Backend
- **Python 3.11** with FastAPI
- **PostgreSQL** database with SQLAlchemy ORM
- **API Key Authentication** (Keycloak integration ready)


### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Keycloak-js** for authentication
- **React Router** for navigation

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 14+ (or use SQLite for development)
- Keycloak 23+ (optional, for full authentication)

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

# Configure environment variables
cp .env.example .env
# Edit .env and set your values:
# - DATABASE_URL (PostgreSQL connection string)
# - API_KEY (your secure API key)
# - Keycloak credentials (if using Keycloak)
```

**Environment Variables (.env):**
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/edc_manager
# or for SQLite: DATABASE_URL=sqlite:///./edc_manager.db

# API Authentication
API_KEY=your-secure-api-key-here

# Keycloak (Optional)
CENTRALIDP_CLIENT_ID=your-client-id
CENTRALIDP_CLIENT_SECRET=your-client-secret
```

**Run Backend:**
```bash
uvicorn init:app --host 0.0.0.0 --port 8000 --reload
```

Backend will be available at: `http://localhost:8000`  
API Documentation: `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env:
```

**Frontend Environment (.env):**
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_KEY=your-secure-api-key-here

# Keycloak Configuration
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=CX-Central
VITE_KEYCLOAK_CLIENT_ID=CX-EDC
```

**Run Frontend:**
```bash
npm run dev
```

Frontend will be available at: `http://localhost:5000`

### 4. Keycloak Setup (Optional)

If you want to use Keycloak authentication:

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

3. **Enable Keycloak in Frontend:**

Edit `frontend/src/main.tsx`:
```typescript
import { initKeycloak } from './keycloak';

initKeycloak(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppNew />
    </StrictMode>,
  );
});
```

### 5. Database Migration

The application automatically creates tables on startup. For manual migration:

```bash
cd backend
python -c "from managers.databaseManager import DatabaseManager; import os; DatabaseManager(os.getenv('DATABASE_URL')).create_tables()"
```

## Usage

### Deploying an EDC Connector

1. Click **"Add EDC"** button on dashboard
2. Follow the 4-step wizard:
   - **Step 1:** Configure Submodel Service (URL, API Key)
   - **Step 2:** EDC Configuration (Name, URL)
   - **Step 3:** Business Partner Number (BPN)
   - **Step 4:** Review and Deploy

### Managing Connectors

- **View YAML:** Click the YAML button to see connector configuration
- **Edit:** Modify connector settings
- **Delete:** Remove connector (confirmation required)
- **Monitor Health:** View real-time health status

### Dashboard Features

- **Data Space Card:** Shows current dataspace (Catena-X)
- **System Health:** Overall system status
- **Activity:** Recent system activities
- **EDC Connectors:** Total and active connector count

## API Endpoints

### Connectors
- `GET /api/connectors` - List all connectors
- `POST /api/connectors` - Create connector
- `GET /api/connectors/{id}` - Get connector
- `PUT /api/connectors/{id}` - Update connector
- `DELETE /api/connectors/{id}` - Delete connector
- `GET /api/connectors/{id}/health` - Check health

### System
- `GET /api/health` - System health
- `GET /api/edc/health` - Default EDC health
- `GET /api/activity-logs` - Activity logs

### EDC Operations
- `POST /api/data/get` - EDC GET request with policies
- `POST /api/data/post` - EDC POST request with policies

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
│   │   │   └── ConnectorTableNew.tsx
│   │   ├── api/             # API client
│   │   ├── types/           # TypeScript types
│   │   ├── keycloak.ts      # Keycloak integration
│   │   └── AppNew.tsx       # Main application
```

## Security Considerations

### Production Deployment

1. **Change default API key** in `.env`
2. **Use strong database credentials**
3. **Enable HTTPS** for all connections
4. **Configure CORS** properly
5. **Use Keycloak** for production authentication
6. **Rotate secrets** regularly
7. **Enable rate limiting** on API endpoints

### Environment Variables

Never commit `.env` files to version control. Use `.env.example` as template.

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

**Database connection failed:**
- Check DATABASE_URL in .env
- Ensure PostgreSQL is running
- Verify credentials

**API key authentication failed:**
- Check API_KEY in backend .env
- Ensure frontend sends correct header (X-Api-Key)
- Verify VITE_API_KEY in frontend .env

### Frontend Issues

**Blank screen:**
- Check browser console for errors
- Verify API connection (VITE_API_BASE_URL)
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

Copyright © ARENA2036-X Network
