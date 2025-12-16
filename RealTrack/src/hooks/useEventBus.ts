/**
 * Hook para usar o EventBus em componentes React
 * 
 * Gerencia automaticamente o lifecycle do listener (adiciona no mount, remove no unmount)
 */

import { useEffect, useCallback, useRef } from 'react';
import { eventBus, type EventName, type EventMap, type EventHandler } from '../utils/eventBus';

/**
 * Hook para escutar eventos do eventBus
 * Automaticamente remove o listener quando o componente desmonta
 * 
 * @example
 * useEventListener('banca:updated', (detail) => {
 *   console.log('Banca atualizada:', detail.id);
 * });
 */
export function useEventListener<T extends EventName>(
  event: T,
  handler: EventHandler<T>,
  deps: React.DependencyList = []
): void {
  // Usar ref para manter referência estável do handler
  const handlerRef = useRef(handler);
  
  // Atualizar ref quando handler mudar
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    // Wrapper que sempre chama a versão mais recente do handler
    const wrappedHandler: EventHandler<T> = (detail) => {
      handlerRef.current(detail);
    };

    const unsubscribe = eventBus.on(event, wrappedHandler);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

/**
 * Hook que retorna função para emitir eventos
 * 
 * @example
 * const emitEvent = useEventEmitter();
 * emitEvent('banca:updated', { id: '123' });
 */
export function useEventEmitter() {
  const emit = useCallback(<T extends EventName>(
    event: T,
    detail: EventMap[T]
  ): void => {
    eventBus.emit(event, detail);
  }, []);

  return emit;
}

/**
 * Hook que retorna helpers para eventos de banca
 */
export function useBancaEvents() {
  const emitCreated = useCallback((id: string) => {
    eventBus.emitBancaCreated(id);
  }, []);

  const emitUpdated = useCallback((id: string) => {
    eventBus.emitBancaUpdated(id);
  }, []);

  const emitDeleted = useCallback((id: string) => {
    eventBus.emitBancaDeleted(id);
  }, []);

  return {
    emitCreated,
    emitUpdated,
    emitDeleted,
  };
}

/**
 * Hook que retorna helper para eventos de perfil
 */
export function useProfileEvents() {
  const emitUpdated = useCallback((detail?: { id?: string; nomeCompleto?: string; email?: string }) => {
    eventBus.emitProfileUpdated(detail);
  }, []);

  return {
    emitUpdated,
  };
}

/**
 * Hook que retorna helper para eventos de apostas
 */
export function useApostasEvents() {
  const emitUpdated = useCallback((count?: number) => {
    eventBus.emitApostasUpdated(count);
  }, []);

  return {
    emitUpdated,
  };
}

// Re-export tipos úteis
export type { EventName, EventMap, EventHandler } from '../utils/eventBus';
