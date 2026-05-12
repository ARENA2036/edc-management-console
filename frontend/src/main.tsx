import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import keycloak from './auth/keycloak'

const initKeycloak = async () => {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
    });
    // const authenticated = true;
    if (authenticated) {
      localStorage.setItem('token', keycloak.token || '');
      
      keycloak.onTokenExpired = () => {
        keycloak.updateToken(30).then((refreshed) => {
          if (refreshed) {
            localStorage.setItem('token', keycloak.token || '');
          }
        }).catch(() => {
          keycloak.login();
        });
      };

      createRoot(document.getElementById('root')!).render(
        <StrictMode>
          <App/>
        </StrictMode>,
      );
    }
  } catch (error) {
    console.error('Failed to initialize Keycloak:', error);
  }
};

initKeycloak();
