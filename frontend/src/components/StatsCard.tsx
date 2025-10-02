import type { ReactNode } from 'react';

interface Props {
  icon: ReactNode;
  title: string;
  value: string;
  subtitle: string;
  variant?: 'default' | 'success' | 'info';
}

export default function StatsCard({ icon, title, value, subtitle, variant = 'default' }: Props) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'text-green-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start gap-3">
        <div className="text-gray-400">{icon}</div>
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className={`text-2xl font-semibold mb-1 ${getVariantClasses()}`}>{value}</p>
          <p className="text-sm text-gray-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
