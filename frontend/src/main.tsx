import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppNew from './AppNew.tsx'
import keycloak from './auth/keycloak'
import { I18nProvider } from './i18n'

const root = createRoot(document.getElementById('root')!);

const renderApp = () => {
  root.render(
    <StrictMode>
      <I18nProvider>
        <AppNew />
      </I18nProvider>
    </StrictMode>,
  );
};

const renderAuthStatus = (title: string, message: string, actionLabel?: string) => {
  root.render(
    <StrictMode>
      <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
        <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">
              EDC Management Console
            </p>
            <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
            <p className="mt-4 text-base leading-7 text-slate-300">{message}</p>
            {actionLabel && (
              <button
                onClick={() => void keycloak.login()}
                className="mt-6 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </StrictMode>,
  );
};

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
