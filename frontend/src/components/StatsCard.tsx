import type { ReactNode } from 'react';
import Tooltip from './Tooltip';

interface Props {
  icon: ReactNode;
  title: string;
  value: string;
  subtitle: string;
  variant?: 'default' | 'success' | 'info';
  tooltipTitle?: string;
  tooltipContent?: string;
  tooltipItems?: string[];
  tooltipFooter?: string;
}

export default function StatsCard({
  icon,
  title,
  value,
  subtitle,
  variant = 'default',
  tooltipTitle,
  tooltipContent,
  tooltipItems,
  tooltipFooter,
}: Props) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'text-green-600 dark:text-emerald-400';
      case 'info':
        return 'text-blue-600 dark:text-sky-400';
      default:
        return 'text-gray-600 dark:text-slate-100';
    }
  };

  const card = (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="text-gray-400 dark:text-slate-500">{icon}</div>
        <div className="flex-1">
          <p className="mb-1 text-sm text-gray-500 dark:text-slate-400">{title}</p>
          <p className={`text-2xl font-semibold mb-1 ${getVariantClasses()}`}>{value}</p>
          <p className="text-sm text-gray-400 dark:text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  if (!tooltipContent) {
    return card;
  }

  return (
    <Tooltip
      title={tooltipTitle}
      content={tooltipContent}
      items={tooltipItems}
      footer={tooltipFooter}
      position="bottom"
      fullWidth
    >
      {card}
    </Tooltip>
  );
}
