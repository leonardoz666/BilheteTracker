/**
 * Hook para gerenciamento de apostas
 * 
 * Centraliza a lógica de CRUD, filtros e estatísticas de apostas
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { apostaService, type ApostaStatus } from '../services/api';
import { eventBus } from '../utils/eventBus';
import type { ApiBetWithBank } from '../types/api';

// ============================================
// Tipos
// ============================================

export interface ApostasFilters {
  esporte: string;
  status: string;
  statusSalvamento: string;
  tipster: string;
  casaDeAposta: string;
  dataDe: string;
  dataAte: string;
  searchText: string;
  oddMin: string;
  oddMax: string;
}

export interface ApostasStats {
  totalApostas: number;
  totalInvestido: number;
  totalGanhos: number;
  totalPendente: number;
}

export interface ApostaFormState {
  bancaId: string;
  esporte: string;
  evento: string;
  aposta: string;
  torneio: string;
  pais: string;
  mercado: string;
  tipoAposta: string;
  valorApostado: string;
  odd: string;
  bonus: string;
  dataEvento: string;
  tipster: string;
  status: string;
  casaDeAposta: string;
  retornoObtido: string;
}

export interface StatusFormState {
  status: string;
  retornoObtido: string;
}

// ============================================
// Constantes
// ============================================

export const STATUS_WITH_RETURNS = ['Ganha', 'Meio Ganha', 'Cashout'];

const initialFilters: ApostasFilters = {
  esporte: '',
  status: '',
  statusSalvamento: '',
  tipster: '',
  casaDeAposta: '',
  dataDe: '',
  dataAte: '',
  searchText: '',
  oddMin: '',
  oddMax: '',
};

const todayISO = new Date().toISOString().split('T')[0];

export const createInitialFormState = (bancaId = ''): ApostaFormState => ({
  bancaId,
  esporte: '',
  evento: '',
  aposta: '',
  torneio: '',
  pais: 'Mundo',
  mercado: '',
  tipoAposta: '',
  valorApostado: '',
  odd: '',
  bonus: '0',
  dataEvento: todayISO,
  tipster: '',
  status: 'Pendente',
  casaDeAposta: '',
  retornoObtido: '',
});

// ============================================
// Helpers
// ============================================

export const parseNumberOrFallback = (value: string, fallback = 0): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseNullableNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const normalizeOptionalString = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * Calcula retorno obtido baseado no status
 */
export const calcularRetornoObtido = (
  status: string,
  valorApostado: number,
  odd: number,
  retornoManualValue?: number
): number | null => {
  switch (status) {
    case 'Ganha':
      return valorApostado * odd;
    case 'Meio Ganha':
      return (valorApostado * odd) / 2 + valorApostado / 2;
    case 'Cashout':
      return retornoManualValue ?? valorApostado * odd * 0.7;
    case 'Perdida':
    case 'Meio Perdida':
    case 'Reembolsada':
    case 'Void':
    case 'Pendente':
    default:
      return null;
  }
};

// ============================================
// Hook Principal
// ============================================

interface UseApostasManagerOptions {
  defaultBancaId?: string;
}

export function useApostasManager(options: UseApostasManagerOptions = {}) {
  const { defaultBancaId = '' } = options;

  // Estados principais
  const [apostas, setApostas] = useState<ApiBetWithBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Filtros
  const [filters, setFilters] = useState<ApostasFilters>(initialFilters);

  // Fetch de apostas
  const fetchApostas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apostaService.getAll();
      // apostaService.getAll() returns { apostas: [], total, page, totalPages }
      // Extract the apostas array from the response
      const apostasData = response.apostas;
      setApostas(Array.isArray(apostasData) ? apostasData as unknown as ApiBetWithBank[] : []);
    } catch (err) {
      console.error('Erro ao buscar apostas:', err);
      setError(err instanceof Error ? err : new Error('Erro ao buscar apostas'));
      setApostas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Efeito inicial
  useEffect(() => {
    void fetchApostas();
  }, [fetchApostas]);

  // Escutar eventos
  useEffect(() => {
    const unsubscribe = eventBus.on('apostas:updated', () => {
      void fetchApostas();
    });
    return unsubscribe;
  }, [fetchApostas]);

  // Criar aposta
  const createAposta = useCallback(async (formData: ApostaFormState) => {
    const dataEventoDate = new Date(formData.dataEvento);
    const payload = {
      bancaId: formData.bancaId,
      esporte: formData.esporte.trim(),
      evento: formData.evento.trim(),
      aposta: formData.aposta.trim(),
      torneio: normalizeOptionalString(formData.torneio),
      pais: normalizeOptionalString(formData.pais),
      mercado: formData.mercado.trim(),
      tipoAposta: formData.tipoAposta,
      valorApostado: Number.parseFloat(formData.valorApostado),
      odd: Number.parseFloat(formData.odd),
      bonus: parseNumberOrFallback(formData.bonus),
      dataEvento: dataEventoDate.toISOString(),
      tipster: normalizeOptionalString(formData.tipster),
      status: formData.status as ApostaStatus,
      casaDeAposta: formData.casaDeAposta,
    };

    await apostaService.create(payload);
    await fetchApostas();
  }, [fetchApostas]);

  // Atualizar aposta
  const updateAposta = useCallback(async (id: string, formData: ApostaFormState) => {
    const dataEventoDate = new Date(formData.dataEvento);
    const payload = {
      bancaId: formData.bancaId,
      esporte: formData.esporte.trim(),
      evento: formData.evento.trim(),
      aposta: formData.aposta.trim(),
      torneio: normalizeOptionalString(formData.torneio),
      pais: normalizeOptionalString(formData.pais),
      mercado: formData.mercado.trim(),
      tipoAposta: formData.tipoAposta,
      valorApostado: Number.parseFloat(formData.valorApostado),
      odd: Number.parseFloat(formData.odd),
      bonus: parseNumberOrFallback(formData.bonus),
      dataEvento: dataEventoDate.toISOString(),
      tipster: normalizeOptionalString(formData.tipster),
      status: formData.status as ApostaStatus,
      casaDeAposta: formData.casaDeAposta,
      retornoObtido: parseNullableNumber(formData.retornoObtido),
    };

    await apostaService.update(id, payload);
    await fetchApostas();
  }, [fetchApostas]);

  // Deletar aposta
  const deleteAposta = useCallback(async (id: string) => {
    await apostaService.remove(id);
    await fetchApostas();
  }, [fetchApostas]);

  // Atualizar status
  const updateStatus = useCallback(async (
    id: string,
    aposta: ApiBetWithBank,
    statusFormData: StatusFormState
  ) => {
    let retornoObtido: number | undefined;

    if (STATUS_WITH_RETURNS.includes(statusFormData.status)) {
      const retornoManualValue = parseNullableNumber(statusFormData.retornoObtido);
      if (retornoManualValue !== undefined && retornoManualValue > 0) {
        retornoObtido = retornoManualValue;
      } else {
        const calculado = calcularRetornoObtido(
          statusFormData.status,
          aposta.valorApostado,
          aposta.odd,
          retornoManualValue
        );
        if (calculado !== null) {
          retornoObtido = calculado;
        }
      }
    }

    await apostaService.update(id, {
      status: statusFormData.status as ApostaStatus,
      retornoObtido,
    });
    await fetchApostas();
  }, [fetchApostas]);

  // Filtrar apostas
  const filteredApostas = useMemo(() => {
    return apostas.filter((aposta: ApiBetWithBank) => {
      if (filters.esporte && aposta.esporte !== filters.esporte) return false;
      if (filters.status && aposta.status !== filters.status) return false;
      if (filters.tipster && aposta.tipster !== filters.tipster) return false;
      if (filters.casaDeAposta && aposta.casaDeAposta !== filters.casaDeAposta) return false;

      if (filters.dataDe) {
        const dataAposta = new Date(aposta.dataEvento).getTime();
        const deTime = new Date(filters.dataDe).getTime();
        if (Number.isFinite(deTime) && dataAposta < deTime) return false;
      }
      if (filters.dataAte) {
        const dataAposta = new Date(aposta.dataEvento).getTime();
        const ateDate = new Date(filters.dataAte);
        ateDate.setHours(23, 59, 59, 999);
        const ateTime = ateDate.getTime();
        if (Number.isFinite(ateTime) && dataAposta > ateTime) return false;
      }

      if (filters.searchText) {
        const text = filters.searchText.toLowerCase();
        const combined = `${aposta.evento} ${aposta.mercado} ${aposta.esporte}`.toLowerCase();
        if (!combined.includes(text)) return false;
      }

      if (filters.oddMin) {
        const min = Number.parseFloat(filters.oddMin);
        if (Number.isFinite(min) && aposta.odd < min) return false;
      }
      if (filters.oddMax) {
        const max = Number.parseFloat(filters.oddMax);
        if (Number.isFinite(max) && aposta.odd > max) return false;
      }

      return true;
    });
  }, [apostas, filters]);

  // Calcular estatísticas
  const stats = useMemo((): ApostasStats => {
    const totalInvestido = apostas.reduce((sum: number, aposta: ApiBetWithBank) => sum + aposta.valorApostado, 0);
    const totalGanhos = apostas
      .filter((aposta: ApiBetWithBank) => aposta.status !== 'Pendente' && typeof aposta.retornoObtido === 'number')
      .reduce((sum: number, aposta: ApiBetWithBank) => sum + (aposta.retornoObtido ?? 0), 0);
    const totalPendente = apostas
      .filter((aposta: ApiBetWithBank) => aposta.status === 'Pendente')
      .reduce((sum: number, aposta: ApiBetWithBank) => sum + aposta.valorApostado, 0);

    return {
      totalApostas: apostas.length,
      totalInvestido,
      totalGanhos,
      totalPendente,
    };
  }, [apostas]);

  // Contador de filtros ativos
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((value) => value !== '').length;
  }, [filters]);

  // Handlers de filtro
  const setFilter = useCallback(<K extends keyof ApostasFilters>(
    key: K,
    value: ApostasFilters[K]
  ) => {
    setFilters((prev: ApostasFilters) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  return {
    // Estado
    apostas,
    filteredApostas,
    loading,
    error,
    stats,

    // Filtros
    filters,
    setFilter,
    setFilters,
    clearFilters,
    activeFilterCount,

    // Ações
    fetchApostas,
    createAposta,
    updateAposta,
    deleteAposta,
    updateStatus,

    // Helpers
    createInitialFormState: () => createInitialFormState(defaultBancaId),
  };
}

export default useApostasManager;
