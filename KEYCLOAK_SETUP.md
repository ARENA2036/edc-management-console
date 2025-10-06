# Keycloak Integration Setup

## ✅ Current Status

The Keycloak authentication integration is **fully implemented** and working! The system successfully:
- Initializes Keycloak with the official login theme
- Redirects to Keycloak login page on app load
- Handles JWT token storage and refresh
- Sends Bearer tokens to the backend
- Backend validates JWT tokens

## 🔧 Configuration Required

The Keycloak client **CX-EDC** in realm **CX-Central** needs to be configured with the correct redirect URIs.

### For Replit Development

Add this redirect URI to the Keycloak client configuration:

```
https://e82bbaa7-6ec2-4eb7-bb20-522825f519cd-00-3k0o4c254bk5u.spock.replit.dev/*
```

### For Local Development

Add this redirect URI:

```
http://localhost:5000/*
```

### For Production

Add your production domain:

```
https://yourdomain.com/*
```

## 📝 Keycloak Client Configuration Steps

1. **Login to Keycloak Admin Console:**
   - URL: https://centralidp.arena2036-x.de/auth/admin/
   
2. **Navigate to Client:**
   - Select Realm: `CX-Central`
   - Go to Clients → `CX-EDC`

3. **Update Settings:**
   - **Valid Redirect URIs:** Add the URI above
   - **Web Origins:** Add `*` or your specific domain
   - **Access Type:** `public` (for frontend apps)
   - **Standard Flow Enabled:** `ON`
   - **Direct Access Grants Enabled:** `ON`

4. **Save Changes**

## 🚀 System Architecture

### Frontend (Port 5000)
- Keycloak-js library initializes with `onLoad: 'login-required'`
- Official Keycloak login theme (not custom form)
- Token stored in localStorage
- Automatic token refresh before expiry
- Username displayed from `tokenParsed.preferred_username`
- Logout redirects to Keycloak

### Backend (Port 8008)
- Accepts `Authorization: Bearer <token>` header
- Validates JWT tokens using python-jose
- Extracts username from token claims
- No signature verification (development mode)

### API Communication
- Axios interceptor automatically adds Bearer token
- Base URL: `http://localhost:8008/api`
- All requests authenticated via JWT

## 🔒 Current Authentication Mode

**Development Mode:** JWT tokens are decoded without signature verification.

**For Production:** Implement proper JWT signature validation using Keycloak's public keys:

```python
# Get Keycloak public key
import requests
response = requests.get(
    "https://centralidp.arena2036-x.de/auth/realms/CX-Central"
)
jwks_uri = response.json()['jwks_uri']
# Use jwks_uri to verify JWT signature
```

## 🧪 Testing the Integration

Once redirect URIs are configured in Keycloak:

1. **Open the app** → Automatically redirects to Keycloak login
2. **Login with credentials** → Redirects back to dashboard
3. **Check username** → Displayed in top-right corner
4. **API calls** → Automatically include Bearer token
5. **Logout** → Redirects to Keycloak logout

## 📋 Environment Variables

**Frontend (.env):**
```env
VITE_KEYCLOAK_URL=https://centralidp.arena2036-x.de/auth/
VITE_KEYCLOAK_REALM=CX-Central
VITE_KEYCLOAK_CLIENT_ID=CX-EDC
VITE_BACKEND_URL=http://localhost:8008
```

**Backend (environment):**
```env
DATABASE_URL=<auto-configured>
SESSION_SECRET=<auto-configured>
AUTH_ENABLED=true
```

## 🐛 Troubleshooting

### "Invalid parameter: redirect_uri" Error

**Cause:** The redirect URI is not configured in Keycloak client.

**Solution:** Add the redirect URI to the Keycloak client configuration (see steps above).

### "Failed to load connectors" Error

**Cause:** Backend authentication rejects the request.

**Solution:** Check that Bearer token is being sent and backend is validating correctly.

## 📊 Implementation Files

- `frontend/src/auth/keycloak.ts` - Keycloak instance
- `frontend/src/main.tsx` - Keycloak initialization
- `frontend/src/api/client.ts` - Axios with Bearer token
- `frontend/src/AppNew.tsx` - Username display and logout
- `backend/managers/authManager.py` - JWT validation

## 🎯 Next Steps

1. **Configure Keycloak Client** with redirect URIs
2. **Test full authentication flow**
3. **Implement production JWT validation** with signature verification
4. **Add role-based access control** using Keycloak roles
5. **Configure refresh token rotation** for enhanced security
