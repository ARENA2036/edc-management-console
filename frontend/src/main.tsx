import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppNew from './AppNew.tsx'
import keycloak from './auth/keycloak'
import { I18nProvider } from './i18n'

const initKeycloak = async () => {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
    });

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
          <I18nProvider>
            <AppNew />
          </I18nProvider>
        </StrictMode>,
      );
    }
  } catch (error) {
    console.error('Failed to initialize Keycloak:', error);
  }
};

initKeycloak();
