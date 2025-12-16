/**
 * Sistema de eventos centralizado
 * - Mantém listeners em Map<string, Set<Listener>>
 * - Evita delete dinâmico e coerções desnecessárias
 * - Fornece compatibilidade com eventos legados baseados em window
 */

export interface BancaEventDetail {
  id: string;
}

export interface ProfileEventDetail {
  id?: string;
  nomeCompleto?: string;
  email?: string;
}

export interface ApostasEventDetail {
  count?: number;
}

export interface ThemeEventDetail {
  theme: 'light' | 'dark';
}

export interface FinanceiroEventDetail {
  bancaId?: string;
}

export interface EventMap {
  'banca:created': BancaEventDetail;
  'banca:updated': BancaEventDetail;
  'banca:deleted': BancaEventDetail;
  'banca:saved': BancaEventDetail;
  'profile:updated': ProfileEventDetail | undefined;
  'apostas:updated': ApostasEventDetail | undefined;
  'financeiro:updated': FinanceiroEventDetail | undefined;
  'theme:changed': ThemeEventDetail;
}

export type EventName = keyof EventMap;
export type EventHandler<T extends EventName> = (detail: EventMap[T]) => void;

const legacyEventMap: Record<EventName, string> = {
  'banca:created': 'banca-created',
  'banca:updated': 'banca-updated',
  'banca:deleted': 'banca-deleted',
  'banca:saved': 'banca-saved',
  'profile:updated': 'profile-updated',
  'apostas:updated': 'apostas-updated',
  'financeiro:updated': 'financeiro-updated',
  'theme:changed': 'theme-changed',
};

type AnyEventHandler = EventHandler<EventName>;

class EventBus {
  private listeners = new Map<EventName, Set<AnyEventHandler>>();
  private legacyDispatching = new Set<string>();

  on<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    const handlers = this.ensureListenerSet(event);
    handlers.add(handler as AnyEventHandler);
    return () => this.off(event, handler);
  }

  off<T extends EventName>(event: T, handler: EventHandler<T>): void {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    handlers.delete(handler as AnyEventHandler);
    if (handlers.size === 0) {
      this.listeners.delete(event);
    }
  }

  once<T extends EventName>(event: T, handler: EventHandler<T>): () => void {
    const wrapped: EventHandler<T> = (detail) => {
      this.off(event, wrapped);
      handler(detail);
    };
    return this.on(event, wrapped);
  }

  emit<T extends EventName>(event: T, detail: EventMap[T]): void {
    this.emitLocal(event, detail);
    this.dispatchLegacyEvent(event, detail);
  }

  clear(event?: EventName): void {
    if (event) {
      this.listeners.delete(event);
      return;
    }
    this.listeners.clear();
  }

  clearAll(): void {
    this.listeners.clear();
  }

  connectLegacyEvents(): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const removers: (() => void)[] = [];
    for (const [busEvent, legacyEvent] of Object.entries(legacyEventMap)) {
      const handler = (nativeEvent: Event) => {
        if (this.legacyDispatching.has(legacyEvent)) {
          return;
        }
        const customEvent = nativeEvent as CustomEvent<unknown>;
        this.emitLocal(busEvent as EventName, customEvent.detail as EventMap[EventName]);
      };
      window.addEventListener(legacyEvent, handler);
      removers.push(() => window.removeEventListener(legacyEvent, handler));
    }

    return () => {
      removers.forEach((remove) => remove());
    };
  }

  emitBancaUpdated(id: string): void {
    this.emit('banca:updated', { id });
  }

  emitBancaCreated(id: string): void {
    this.emit('banca:created', { id });
  }

  emitBancaDeleted(id: string): void {
    this.emit('banca:deleted', { id });
  }

  emitProfileUpdated(detail?: ProfileEventDetail): void {
    this.emit('profile:updated', detail);
  }

  emitApostasUpdated(count?: number): void {
    this.emit('apostas:updated', { count });
  }

  private ensureListenerSet(event: EventName): Set<AnyEventHandler> {
    const existing = this.listeners.get(event);
    if (existing) {
      return existing;
    }
    const created = new Set<AnyEventHandler>();
    this.listeners.set(event, created);
    return created;
  }

  private emitLocal<T extends EventName>(event: T, detail: EventMap[T]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    handlers.forEach((handler) => {
      try {
        (handler as EventHandler<T>)(detail);
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    });
  }

  private dispatchLegacyEvent<T extends EventName>(event: T, detail: EventMap[T]): void {
    if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') {
      return;
    }

    const legacyName = legacyEventMap[event];
    this.legacyDispatching.add(legacyName);
    try {
      const legacyEvent = new CustomEvent(legacyName, { detail });
      window.dispatchEvent(legacyEvent);
    } finally {
      this.legacyDispatching.delete(legacyName);
    }
  }
}

export const eventBus = new EventBus();
export default eventBus;
