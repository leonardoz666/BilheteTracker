import { memo, type ReactNode } from 'react';

export type StatCardColor = 'emerald' | 'blue' | 'red' | 'purple' | 'amber' | 'cyan';

interface StatCardProps {
  title: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
  color?: StatCardColor;
}

const colorClasses = {
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-500',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-700',
    valueColor: 'text-emerald-900'
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-500',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-700',
    valueColor: 'text-blue-900'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-500',
    iconColor: 'text-red-600',
    titleColor: 'text-red-700',
    valueColor: 'text-red-900'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    iconBg: 'bg-purple-500',
    iconColor: 'text-purple-600',
    titleColor: 'text-purple-700',
    valueColor: 'text-purple-900'
  },
  amber: {
    bg: 'bg-[#fff3e0]',
    border: 'border-[#ffd199]',
    iconBg: 'bg-[#ff8a00]',
    iconColor: 'text-white',
    titleColor: 'text-[#c45f00]',
    valueColor: 'text-[#7b3200]'
  },
  cyan: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    iconBg: 'bg-cyan-500',
    iconColor: 'text-cyan-600',
    titleColor: 'text-cyan-700',
    valueColor: 'text-cyan-900'
  }
};

function StatCardTailwind({ title, value, helper, icon, color = 'purple' }: StatCardProps) {
  const colors = colorClasses[color];
  
  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-6 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-4">
        <p className={`${colors.titleColor} text-sm font-semibold uppercase tracking-wide`}>
          {title}
        </p>
        {icon && (
          <span className={`${colors.iconBg} ${colors.iconColor} p-2 rounded-lg shadow-md`}>
            {icon}
          </span>
        )}
      </div>
      <p className={`${colors.valueColor} text-3xl font-bold mb-2`}>
        {value}
      </p>
      {helper && (
        <p className={`${colors.titleColor} text-sm opacity-75`}>
          {helper}
        </p>
      )}
    </div>
  );
}

// Memoizar para evitar re-renders desnecessários quando props não mudam
export default memo(StatCardTailwind);
