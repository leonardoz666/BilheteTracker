/**
 * Hook para gerenciamento de tipsters
 * 
 * Utiliza o tipsterService para operações de CRUD e
 * mantém cache local para otimização.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { tipsterService, type Tipster } from '../services/api';
import { invalidateCachePattern } from '../services/api/apiClient';

// Re-exportar tipo para manter compatibilidade
export type { Tipster };

// Cache global simples
let tipstersCache: Tipster[] | null = null;
let tipstersCacheTime: number = 0;
const CACHE_DURATION = 60000; // 1 minuto

interface UseTipstersResult {
  tipsters: Tipster[];
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  invalidateCache: () => void;
}

export function useTipsters(): UseTipstersResult {
  const [tipsters, setTipsters] = useState<Tipster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTipsters = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Usar cache se ainda válido e não for forçado
    if (!force && tipstersCache && (now - tipstersCacheTime) < CACHE_DURATION) {
      setTipsters(tipstersCache);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const tipstersData = await tipsterService.getAll();
      setTipsters(tipstersData);
      
      // Atualizar cache local
      tipstersCache = tipstersData;
      tipstersCacheTime = now;
    } catch (err) {
      console.error('Erro ao carregar tipsters:', err);
      setError(err instanceof Error ? err : new Error('Erro ao carregar tipsters'));
      
      // Usar cache mesmo em caso de erro se disponível
      if (tipstersCache) {
        setTipsters(tipstersCache);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTipsters();
  }, [fetchTipsters]);

  // Função para invalidar cache
  const invalidateLocalCache = useCallback(() => {
    tipstersCache = null;
    tipstersCacheTime = 0;
    invalidateCachePattern('/tipsters');
    void fetchTipsters(true);
  }, [fetchTipsters]);

  // Memoizar retorno para evitar re-criação do objeto
  return useMemo(
    () => ({ 
      tipsters, 
      loading, 
      error,
      refetch: fetchTipsters, 
      invalidateCache: invalidateLocalCache 
    }),
    [tipsters, loading, error, fetchTipsters, invalidateLocalCache]
  );
}

export default useTipsters;

