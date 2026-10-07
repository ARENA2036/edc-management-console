import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { toApiError, type ApiError } from '../api/errors';
import { useI18n } from '../i18n';
import ErrorDetails from './ErrorDetails';

function ErrorFallback({ error, onReset }: { error: ApiError; onReset: () => void }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-16 dark:bg-slate-950">
      <div className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
          {t('errorBoundaryTitle')}
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-slate-400">
          {t('errorBoundaryDescription')}
        </p>
        <ErrorDetails error={error} className="mt-6" />
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <RefreshCw size={16} />
          {t('errorBoundaryReload')}
        </button>
      </div>
    </div>
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  error: ApiError | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: toApiError(error, 'The interface stopped responding.') };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
