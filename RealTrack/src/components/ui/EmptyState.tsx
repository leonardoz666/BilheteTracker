import { memo } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
}

function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border border-white/10 bg-white/5 px-8 py-10 text-center text-white shadow-[0_25px_45px_rgba(0,0,0,0.25)]">
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="text-sm text-white/70">{description}</p>
    </div>
  );
}

export default memo(EmptyState);


