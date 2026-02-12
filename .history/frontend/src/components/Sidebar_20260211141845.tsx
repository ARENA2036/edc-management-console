import { Home, Monitor, Settings, ExternalLink, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}
export default function Sidebar({ isOpen, onClose }: Props) {
  const location = useLocation();
  
  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/' },
    { icon: Monitor, label: 'Monitor', path: '/monitor' },
    { icon: ExternalLink, label: 'SDE', path: '/sde' },
  ];

  return (
    <>
    {isOpen && (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
      />
    )}
    <div className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col h-screen
      transform transition-transform duration-300 ease-in-out
      md:relative md:translate-x-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-500 rounded-lg text-white flex-1">
            <Home size={20} />
            <span className="font-medium">Dashboard</span>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1 text-gray-400 hover:text-gray-600 md:hidden"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <Link
          to="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Settings size={20} />
          <span>Dataspace Settings</span>
        </Link>
        </div>
      </div>
      
      </>
  );
}
