import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: window.__RUNTIME_CONFIG__?.keycloakUrl!,
  realm: window.__RUNTIME_CONFIG__?.realm!,
  clientId: window.__RUNTIME_CONFIG__?.clientId!,
};

const keycloak = new Keycloak(keycloakConfig);

export const initKeycloak = async (onAuthenticatedCallback: () => void) => {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
      pkceMethod: 'S256',
    });

    if (authenticated) {
      onAuthenticatedCallback();
    } else {
      console.warn('User is not authenticated');
      keycloak.login();
    }
  } catch (error) {
    console.error('Keycloak initialization failed:', error);
  }
};

export const getToken = () => keycloak.token;

export const getUserInfo = () => ({
  name: keycloak.tokenParsed?.preferred_username || 'User',
  email: keycloak.tokenParsed?.email || '',
  roles: keycloak.tokenParsed?.realm_access?.roles || [],
});

export const doLogout = () => keycloak.logout();

export const updateToken = async () => {
  try {
    const refreshed = await keycloak.updateToken(30);
    if (refreshed) {
      console.log('Token was successfully refreshed');
    }
    return keycloak.token;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    keycloak.login();
  }
};

export default keycloak;
