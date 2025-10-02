# TractusX EDC Connector Manager

## Overview
Fullstack application for managing TractusX EDC (Eclipse Dataspace Connector) connectors with React TypeScript frontend and Python FastAPI backend.

## Architecture
- **Backend**: Python FastAPI following TractusX SDK Services reference structure
  - Managers: Database, Authentication, EDC operations
  - Services: EDC integration and data operations
  - Models: Database models (Connectors, Activity Logs) and API request/response models
  - Utilities: HTTP utilities and operators
  
- **Frontend**: React + TypeScript + Tailwind CSS
  - Dashboard with EDC connector management
  - CRUD operations for connectors
  - Health monitoring and activity logs
  - Modal-based UI for details, editing, and YAML viewing

## Configuration
- Backend configuration: `backend/config/configuration.yml`
- Logging configuration: `backend/config/logging.yml`
- Environment variables: See `backend/.env.example` for required secrets

## Security
**IMPORTANT**: All client secrets and credentials MUST be stored as environment variables, NOT in configuration files.

Required environment variables:
- Database credentials (automatically set by Replit)
- CatenaX dataspace credentials (CENTRALIDP_*, SSI_WALLET_*, PORTAL_*, DISCOVERY_*, BPN_DISCOVERY_*)
- API_KEY for backend authentication

## Database
- PostgreSQL database with SQLAlchemy ORM
- Tables: `connectors`, `activity_logs`
- Automatic table creation on startup

## Authentication
- Backend: API key authentication (X-Api-Key header)
- Default API key: `default-api-key-change-in-production` (MUST be changed in production)
- Frontend: Configured to send API key with all requests

## Keycloak Integration (Placeholder)
The project includes placeholder configuration for Keycloak OAuth2/OIDC authentication:
- Realm: CX-Central
- Client ID: CX-EDC
- To implement: Install `python-keycloak` and `keycloak-js` packages and integrate token validation

## Development
- Backend runs on port 8000
- Frontend runs on port 5000
- Both workflows are configured and running automatically

## API Endpoints
- `GET /api/health` - Health check
- `GET /api/connectors` - List all connectors
- `POST /api/connectors` - Create new connector
- `GET /api/connectors/{id}` - Get connector details
- `PUT /api/connectors/{id}` - Update connector
- `DELETE /api/connectors/{id}` - Delete connector
- `GET /api/connectors/{id}/health` - Check connector health
- `GET /api/activity-logs` - Get recent activity logs
- `GET /api/edc/health` - Check default EDC health

## Recent Changes
- 2025-10-02: Initial project setup with backend and frontend
- 2025-10-02: Migrated sensitive credentials to environment variables
- 2025-10-02: Configured workflows for backend (port 8000) and frontend (port 5000)

## Next Steps for Production
1. Replace default API key with secure random key
2. Implement full Keycloak OAuth2 integration
3. Add proper error handling and validation
4. Implement comprehensive logging
5. Add unit and integration tests
6. Configure HTTPS and CORS policies for production
