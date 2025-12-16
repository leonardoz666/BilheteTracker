import type { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
}

export function Skeleton({ className, children }: SkeletonProps) {
  return <div className={['loading-skeleton', className].filter(Boolean).join(' ')}>{children}</div>;
}

export default Skeleton;


