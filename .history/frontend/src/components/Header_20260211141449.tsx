import { User, Menu } from 'lucide-react';

interface Props {
  user?: {
    name: string;
    role: string;
  };
  onLogout?: () => void;
  onMenuToggle?: () => void;
}

export default function Header({ user, onLogout, onMenuToggle }: Props) {  
  return (

    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={onMenuToggle}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden flex-shrink-0"
          >
            <Menu size={22} />
          </button>
          <img 
            src="/arena2036-logo.png" 
            alt="ARENA2036 Logo" 
            className="h-8 md:h-10 object-contain flex-shrink-0"
                      />
          <h1 className="text-base md:text-xl font-semibold truncate">
            <span className="hidden sm:inline">ARENA2036 EDC Management Console</span>
            <span className="sm:hidden">EDC Console</span>
          </h1>
        </div> 
        
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              EN
            </button>
            <button className="px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
              DE
            </button>
          </div>
          
          {user && (
            <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-gray-200">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                <User size={18} />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-xs text-gray-400 hover:text-gray-600 ml-1 md:ml-2"
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
