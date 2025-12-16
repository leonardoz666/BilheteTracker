import { useCallback, useEffect, useState } from 'react';
import type { ToastMessage } from '../utils/toast';

interface ToastProps {
    toast: ToastMessage;
    onRemove: (id: string) => void;
}

const Toast = ({ toast, onRemove }: ToastProps) => {
    const [isExiting, setIsExiting] = useState(false);

    const handleRemove = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => {
            onRemove(toast.id);
        }, 300);
    }, [onRemove, toast.id]);

    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => {
                handleRemove();
            }, toast.duration);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [handleRemove, toast.duration]);

    const getIcon = () => {
        const iconClass = "w-5 h-5 flex-shrink-0";
        switch (toast.type) {
            case 'success':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'info':
                return (
                    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    const getStyles = () => {
        const baseStyles = "relative flex items-start gap-3 p-4 rounded-xl backdrop-blur-xl border shadow-lg transition-all duration-300 min-w-[320px] max-w-[450px]";

        switch (toast.type) {
            case 'success':
                return `${baseStyles} bg-brand-emerald/10 dark:bg-brand-emerald/20 border-brand-emerald/30 text-brand-emerald shadow-glow`;
            case 'error':
                return `${baseStyles} bg-danger/10 dark:bg-danger/20 border-danger/30 text-danger`;
            case 'warning':
                return `${baseStyles} bg-warning/10 dark:bg-warning/20 border-warning/30 text-warning`;
            case 'info':
                return `${baseStyles} bg-info/10 dark:bg-info/20 border-info/30 text-info`;
        }
    };

    return (
        <div
            className={`
        ${getStyles()}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0 animate-slide-up'}
      `}
            role="alert"
        >
            <div className="mt-0.5">
                {getIcon()}
            </div>

            <div className="flex-1 text-sm font-medium leading-relaxed pr-2">
                {toast.message}
            </div>

            <button
                onClick={handleRemove}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
                aria-label="Fechar"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

export default Toast;
