/**
 * Hook para gerenciamento de bancas
 * 
 * Utiliza o bancaService para operações de CRUD e
 * mantém cache local para otimização.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { bancaService, type Banca } from '../services/api';
import { invalidateCachePattern } from '../services/api/apiClient';
import { eventBus, type EventName } from '../utils/eventBus';

// Re-exportar tipo para manter compatibilidade
export type { Banca };

// Cache global simples (o apiClient já tem cache, mas mantemos para estado local)
let bancasCache: Banca[] | null = null;
let bancasCacheTime: number = 0;
const CACHE_DURATION = 60000; // 1 minuto

interface UseBancasResult {
  bancas: Banca[];
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  invalidateCache: () => void;
}

export function useBancas(): UseBancasResult {
  const [bancas, setBancas] = useState<Banca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBancas = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Usar cache se ainda válido e não for forçado
    if (!force && bancasCache && (now - bancasCacheTime) < CACHE_DURATION) {
      setBancas(bancasCache);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const bancasData = await bancaService.getAll();
      setBancas(bancasData);
      
      // Atualizar cache local
      bancasCache = bancasData;
      bancasCacheTime = now;
    } catch (err) {
      console.error('Erro ao carregar bancas:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar bancas'));
      
      // Usar cache mesmo em caso de erro se disponível
      if (bancasCache) {
        setBancas(bancasCache);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBancas();
  }, [fetchBancas]);

  useEffect(() => {
    const events: EventName[] = ['banca:created', 'banca:updated', 'banca:deleted', 'banca:saved'];
    const unsubscribes = events.map((event) =>
      eventBus.on(event, () => {
        void fetchBancas(true);
      })
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [fetchBancas]);

  // Função para invalidar cache (útil após criar/editar/deletar)
  const invalidateLocalCache = useCallback(() => {
    bancasCache = null;
    bancasCacheTime = 0;
    invalidateCachePattern('/bancas');
    void fetchBancas(true);
  }, [fetchBancas]);

  // Memoizar retorno para evitar re-criação do objeto
  return useMemo(
    () => ({ 
      bancas, 
      loading, 
      error,
      refetch: fetchBancas, 
      invalidateCache: invalidateLocalCache 
    }),
    [bancas, loading, error, fetchBancas, invalidateLocalCache]
  );
}

export default useBancas;

