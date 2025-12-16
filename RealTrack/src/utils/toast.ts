type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

type ToastListener = (toasts: ToastMessage[]) => void;

class ToastManager {
    private toasts: ToastMessage[] = [];
    private listeners: Set<ToastListener> = new Set<ToastListener>();
    private idCounter = 0;

    subscribe(listener: ToastListener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(listener => listener([...this.toasts]));
    }

    private add(type: ToastType, message: string, duration = 5000) {
        const id = `toast-${++this.idCounter}-${Date.now()}`;
        const toast: ToastMessage = { id, type, message, duration };

        this.toasts.push(toast);
        this.notify();

        if (duration > 0) {
            setTimeout(() => this.remove(id), duration);
        }
    }

    remove(id: string) {
        this.toasts = this.toasts.filter(t => t.id !== id);
        this.notify();
    }

    success(message: string, duration?: number) {
        this.add('success', message, duration);
    }

    error(message: string, duration?: number) {
        this.add('error', message, duration);
    }

    warning(message: string, duration?: number) {
        this.add('warning', message, duration);
    }

    info(message: string, duration?: number) {
        this.add('info', message, duration);
    }

    clear() {
        this.toasts = [];
        this.notify();
    }
}

export const toast = new ToastManager();
