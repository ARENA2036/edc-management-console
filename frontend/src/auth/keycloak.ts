import Keycloak, { type KeycloakConfig } from 'keycloak-js';
import { getRuntimeConfigBoolean, getRuntimeConfigValue } from '../runtime-config';

export function getKeycloakConfig(): KeycloakConfig {
  return {
    url: getRuntimeConfigValue(
      import.meta.env.VITE_KEYCLOAK_URL,
      window.__RUNTIME_CONFIG__?.keycloakUrl,
      '',
    ),
    realm: getRuntimeConfigValue(
      import.meta.env.VITE_KEYCLOAK_REALM,
      window.__RUNTIME_CONFIG__?.realm,
      '',
    ),
    clientId: getRuntimeConfigValue(
      import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
      window.__RUNTIME_CONFIG__?.clientId,
      '',
    ),
  };
}

export function validateKeycloakConfig(config: KeycloakConfig) {
  const missingFields = [
    ['url', config.url],
    ['realm', config.realm],
    ['clientId', config.clientId],
  ].filter(([, value]) => !value);

  return {
    valid: missingFields.length === 0,
    missingFields: missingFields.map(([field]) => field),
  };
}

const keycloak = new Keycloak(getKeycloakConfig());

export const isAuthDisabled = () =>
  getRuntimeConfigBoolean(
    import.meta.env.VITE_DISABLE_AUTH,
    window.__RUNTIME_CONFIG__?.disableAuth,
    false,
  );

export default keycloak;
