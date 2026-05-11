import { CircleHelp, Menu, MoonStar, SunMedium, User } from 'lucide-react';
import { useI18n } from '../i18n';
import Tooltip from './Tooltip';

interface Props {
  user?: {
    name: string;
    role: string;
  };
  onLogout?: () => void;
  onMenuToggle?: () => void;
  onHelpClick?: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export default function Header({
  user,
  onLogout,
  onMenuToggle,
  onHelpClick,
  theme,
  onThemeToggle,
}: Props) {
  const { language, setLanguage, t } = useI18n();

  return (
    <header className="border-b border-gray-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 md:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden flex-shrink-0"
          >
            <Menu size={22} />
          </button>
          <img 
            src="/arena2036-logo.png" 
            alt="ARENA2036 Logo" 
            className="h-8 md:h-10 object-contain flex-shrink-0"
                      />
          <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100 md:text-xl">
            <span className="hidden sm:inline">ARENA2036 EDC Management Console</span>
            <span className="sm:hidden">EDC Console</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <div className="hidden items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-900 sm:flex">
            <Tooltip content={t('languageEnglish')}>
              <button
                onClick={() => setLanguage('en')}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  language === 'en'
                    ? 'bg-white font-semibold text-gray-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                    : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {t('languageEnglish')}
              </button>
            </Tooltip>
            <Tooltip content={t('languageGerman')}>
              <button
                onClick={() => setLanguage('de')}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  language === 'de'
                    ? 'bg-white font-semibold text-gray-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                    : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {t('languageGerman')}
              </button>
            </Tooltip>
          </div>

          <Tooltip
            content={
              language === 'de'
                ? theme === 'dark'
                  ? 'Zum hellen Modus wechseln'
                  : 'Zum dunklen Modus wechseln'
                : theme === 'dark'
                ? 'Switch to light mode'
                : 'Switch to dark mode'
            }
          >
            <button
              onClick={onThemeToggle}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
            </button>
          </Tooltip>

          <Tooltip content={t('helpButton')}>
            <button
              onClick={onHelpClick}
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <CircleHelp size={18} />
            </button>
          </Tooltip>

          {user && (
            <div className="flex items-center gap-2 border-l border-gray-200 pl-2 dark:border-slate-700 md:gap-3 md:pl-4">
              <div className="h-8 w-8 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center text-white">
                <User size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{user.role}</p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="ml-1 text-xs text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 md:ml-2"
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
