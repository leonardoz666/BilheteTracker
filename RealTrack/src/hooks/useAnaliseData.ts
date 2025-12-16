import { useCallback, useEffect, useMemo, useState } from 'react';
import { analiseService } from '../services/api';
import type {
  AnaliseBookmakerComparison,
  AnaliseHeatmapData,
  AnaliseOddDistribution,
  AnaliseRoiEntry,
  AnaliseWinRatePorEsporte,
} from '../types/AnaliseData';
import type { AnaliseFilters } from '../types/analise';

export interface UseAnaliseDataState {
  evolucaoRoiMensal: AnaliseRoiEntry[];
  distribuicaoOdds: AnaliseOddDistribution[];
  heatmap: AnaliseHeatmapData;
  comparacaoBookmakers: AnaliseBookmakerComparison[];
  winRatePorEsporte: AnaliseWinRatePorEsporte[];
}

export interface UseAnaliseDataResult {
  data: UseAnaliseDataState;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

const defaultState: UseAnaliseDataState = {
  evolucaoRoiMensal: [],
  distribuicaoOdds: [],
  heatmap: {},
  comparacaoBookmakers: [],
  winRatePorEsporte: [],
};

const PERFORMANCE_ERROR_FALLBACK = 'Erro ao carregar dados de performance.';

const isStatusError = (error: unknown): error is { response?: { status?: number } } => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const response = (error as { response?: unknown }).response;
  if (typeof response !== 'object' || response === null) {
    return false;
  }
  const status = (response as { status?: unknown }).status;
  return typeof status === 'number';
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (isStatusError(error)) {
    return error.response?.status;
  }
  return undefined;
};

const normalizeError = (error: unknown, fallback: string): Error => {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string' && error.trim() !== '') {
    return new Error(error);
  }
  return new Error(fallback);
};

export function useAnaliseData(filters: AnaliseFilters): UseAnaliseDataResult {
  const [state, setState] = useState<UseAnaliseDataState>(defaultState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasBanca = Boolean(filters.bancaId);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};

    if (filters.bancaId) {
      params.bancaId = filters.bancaId;
    }
    if (filters.status && filters.status !== 'Tudo') {
      params.status = filters.status;
    }
    if (filters.tipster) {
      params.tipster = filters.tipster;
    }
    if (filters.casa) {
      params.casa = filters.casa;
    }
    if (filters.esporte) {
      params.esporte = filters.esporte;
    }
    if (filters.evento) {
      params.evento = filters.evento;
    }
    if (filters.dataInicio) {
      params.dataInicio = filters.dataInicio;
    }
    if (filters.dataFim) {
      params.dataFim = filters.dataFim;
    }
    if (filters.oddMin) {
      params.oddMin = filters.oddMin;
    }
    if (filters.oddMax) {
      params.oddMax = filters.oddMax;
    }

    return params;
  }, [filters]);

  const fetchData = useCallback(async () => {
    if (!hasBanca) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await analiseService.getPerformance(queryParams);

      setState(data);
    } catch (err) {
      const status = getErrorStatus(err);
      if (status !== 429) {
        console.error('Erro ao carregar dados de performance:', err);
      }
      setError(normalizeError(err, PERFORMANCE_ERROR_FALLBACK));
    } finally {
      setIsLoading(false);
    }
  }, [hasBanca, queryParams]);

  useEffect(() => {
    let isCancelled = false;

    if (!hasBanca) {
      setState(defaultState);
      setIsLoading(false);
      setError(null);
      return () => {
        isCancelled = true;
      };
    }

    const run = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await analiseService.getPerformance(queryParams);

        if (isCancelled) return;

        setState(data);
      } catch (err) {
        if (isCancelled) return;

        const status = getErrorStatus(err);
        if (status !== 429) {
          console.error('Erro ao carregar dados de performance:', err);
        }
        setError(normalizeError(err, PERFORMANCE_ERROR_FALLBACK));
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [hasBanca, queryParams]);

  const reload = useCallback(() => {
    void fetchData();
  }, [fetchData]);

  return {
    data: state,
    isLoading,
    error,
    reload,
  };
}

export default useAnaliseData;


