import { createElement } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import {
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';

type StatusKey =
  | 'Pendente'
  | 'Ganha'
  | 'Perdida'
  | 'Meio Ganha'
  | 'Meio Perdida'
  | 'Cashout'
  | 'Reembolsada'
  | 'Void'
  | 'default';

const STATUS_ICON_MAP: Record<StatusKey, LucideIcon> = {
  Pendente: Clock,
  Ganha: CheckCircle,
  Perdida: XCircle,
  'Meio Ganha': TrendingUp,
  'Meio Perdida': TrendingDown,
  Cashout: Zap,
  Reembolsada: RefreshCw,
  Void: RefreshCw,
  default: Clock,
};

export const betStatusPillBaseClass =
  'inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

export const betStatusPillVariants: Record<StatusKey, string> = {
  Pendente:
    'text-[#1b1202] bg-[#ff9d00]',
  Ganha: 'text-white bg-[#10b981]',
  Perdida: 'text-white bg-[#ef4444]',
  'Meio Ganha': 'text-white bg-[#22c55e]',
  'Meio Perdida': 'text-white bg-[#f97316]',
  Cashout: 'text-white bg-[#a855f7]',
  Reembolsada: 'text-white bg-[#3b82f6]',
  Void: 'text-white bg-[#94a3b8]',
  default: 'text-white/80 border border-white/15 bg-white/5',
};

export const betStatusAccentClasses: Record<StatusKey, string> = {
  Pendente: 'text-[#ffb703]',
  Ganha: 'text-[#34d399]',
  Perdida: 'text-[#fb7185]',
  'Meio Ganha': 'text-[#86efac]',
  'Meio Perdida': 'text-[#fb923c]',
  Cashout: 'text-[#c084fc]',
  Reembolsada: 'text-[#93c5fd]',
  Void: 'text-[#cbd5f5]',
  default: 'text-white',
};

export function getBetStatusIcon(status: string, props?: LucideProps) {
  const iconKey = (status as StatusKey) in STATUS_ICON_MAP ? (status as StatusKey) : 'default';
  const Icon = STATUS_ICON_MAP[iconKey];
  return createElement(Icon, { size: 16, ...props });
}
