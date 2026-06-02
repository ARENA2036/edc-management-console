import Keycloak from 'keycloak-js';
import { getRuntimeConfigValue } from '../runtime-config';

const keycloak = new Keycloak({
  url: getRuntimeConfigValue(
    import.meta.env.VITE_KEYCLOAK_URL,
    window.__RUNTIME_CONFIG__?.keycloakUrl,
  ),
  realm: getRuntimeConfigValue(
    import.meta.env.VITE_KEYCLOAK_REALM,
    window.__RUNTIME_CONFIG__?.realm,  
  ),
  clientId: getRuntimeConfigValue(
    import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    window.__RUNTIME_CONFIG__?.clientId, 
  ),
});

export default keycloak;
