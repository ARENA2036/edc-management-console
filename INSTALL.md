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

## Helm Charts
