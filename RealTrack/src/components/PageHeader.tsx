import { memo, type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
}

function PageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/20 pb-5 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          {badge && (
            <span className="inline-flex items-center rounded-pill border border-brand-emerald/40 bg-brand-emerald/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-brand-emerald">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm text-foreground-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// Memoizar para evitar re-renders quando props não mudam
export default memo(PageHeader);

