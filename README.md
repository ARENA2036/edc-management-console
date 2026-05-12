# ARENA2036 EDC Management Console

[![Contributors][contributors-shield]][contributors-url]
[![Stargazers][stars-shield]][stars-url]
[![Apache 2.0 License][license-shield]][license-url]

[![Latest Release][release-shield]][release-url]
[![Latest Snapshot][snapshot-shield]]()

<!-- [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=eclipse-tractusx_tractusx-edc&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=eclipse-tractusx_tractusx-edc) -->

EDC Management Console (EMC) is a platform designed to manage the deployment and lifecycle of various Eclipse ecosystem components. In its current version, EMC provides streamlined support for provisioning and operating Tractus-X EDC (Eclipse Dataspace Connector) instances, including full integration with Keycloak for authentication and access control. This allows users to deploy secure, compliant, and configurable EDC runtimes with minimal manual setup.

Please refer to:

- [Our docs](docs/README.md)
- [Our Releases]()
- [Report Bug / Request Feature](https://github.com/ARENA2036/edc-management-console/issues)

## About The Project
The project provides pre-built backend and frontend [docker](https://www.docker.com/) images and [helm](https://helm.sh/) charts of the EMC application.

### Features

- 🔐 **Keycloak Authentication** - Secure OAuth2/OIDC authentication
- 📊 **Dashboard** - Real-time monitoring with statistics cards
- 🚀 **EDC Deployment Wizard** - Step-by-step EDC deployment
- 📋 **Connector Management** - Full CRUD operations for EDC connectors
- 📈 **Activity Logging** - Track all system activities

### Technology Stack

#### Backend
- **Python 3.11** with FastAPI
- **PostgreSQL** database with SQLAlchemy ORM
- **API Key Authentication** (Keycloak integration ready)

#### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Keycloak-js** for authentication
- **React Router** for navigation

## Getting Started
Follow the [INSTALL.md](/INSTALL.md) for local setup and deployment on cloud.

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



## License

Distributed under the Apache 2.0 License. See [LICENSE](/LICENSE) for more information.


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[contributors-shield]: https://img.shields.io/github/contributors/eclipse-tractusx/tractusx-edc.svg?style=for-the-badge

[contributors-url]: https://github.com/ARENA2036/edc-management-console/graphs/contributors

[stars-shield]: https://img.shields.io/github/stars/eclipse-tractusx/tractusx-edc.svg?style=for-the-badge

[stars-url]: https://github.com/ARENA2036/edc-management-console/stargazers

[license-shield]: https://img.shields.io/github/license/eclipse-tractusx/tractusx-edc.svg?style=for-the-badge

[license-url]: LICENSE

[release-shield]: https://img.shields.io/github/v/release/eclipse-tractusx/tractusx-edc.svg?style=for-the-badge

[release-url]: https://github.com/ARENA2036/edc-management-console/releases

[snapshot-shield]: https://img.shields.io/badge/dynamic/regex?url=https%3A%2F%2Fraw.githubusercontent.com%2Feclipse-tractusx%2Ftractusx-edc%2Frefs%2Fheads%2Fgh-pages%2Fmisc%2Flatest-versioned-snapshot.txt&search=.*&style=for-the-badge&label=Latest-Snapshot