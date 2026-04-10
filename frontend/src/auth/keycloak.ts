import Keycloak from 'keycloak-js';
import { getRuntimeConfigValue } from '../runtime-config';

const keycloak = new Keycloak({
  url: getRuntimeConfigValue(
    import.meta.env.VITE_KEYCLOAK_URL,
    window.__RUNTIME_CONFIG__?.keycloakUrl,
    'https://centralidp.arena2036-x.de/auth',
  ),
  realm: getRuntimeConfigValue(
    import.meta.env.VITE_KEYCLOAK_REALM,
    window.__RUNTIME_CONFIG__?.realm,
    'CX-Central',
  ),
  clientId: getRuntimeConfigValue(
    import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    window.__RUNTIME_CONFIG__?.clientId,
    'CX-EDC',
  ),
});

export default keycloak;
