import { useEffect, useState } from 'react';
import { toast as toastManager, type ToastMessage } from '../utils/toast';
import Toast from './Toast';

const ToastContainer = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        const unsubscribe = toastManager.subscribe(setToasts);
        return unsubscribe;
    }, []);

    // Limitar a 3 toasts visíveis
    const visibleToasts = toasts.slice(-3);

    return (
        <div
            className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
            aria-live="polite"
            aria-atomic="true"
        >
            <div className="flex flex-col gap-3 pointer-events-auto">
                {visibleToasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        toast={toast}
                        onRemove={(id) => toastManager.remove(id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default ToastContainer;
