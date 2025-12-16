import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from './ui/utils';

const SIZE_MAP = {
  sm: 'max-w-md',
  form: 'max-w-xl',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
} as const;

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: keyof typeof SIZE_MAP;
}

export default function Modal({ isOpen, title, onClose, children, size = 'md' }: ModalProps) {
  const titleId = useId();
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = original;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative w-full rounded-3xl border border-border/30 bg-background-card/95 p-6 shadow-glass backdrop-blur-3xl animate-slide-up',
          SIZE_MAP[size]
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <header id={titleId} className="flex items-start justify-between gap-4 border-b border-border/20 pb-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/40 bg-background text-foreground transition hocus:border-brand-emerald/50 hocus:text-brand-emerald"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </header>
        <div className="mt-4 space-y-4 text-foreground">{children}</div>
      </div>
    </div>,
    document.body
  );
}

