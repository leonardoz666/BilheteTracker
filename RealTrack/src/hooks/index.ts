/**
 * Hooks - Ponto de entrada centralizado
 * 
 * Exporta todos os hooks customizados do projeto.
 */

// ============================================
// Data Hooks
// ============================================

export { useBancas, type Banca } from './useBancas';
export { useTipsters, type Tipster } from './useTipsters';
export { useAnaliseData } from './useAnaliseData';
export { 
  useDashboardData,
  type DashboardFilters,
  type DashboardMetricas,
  type LucroAcumuladoItem,
  type LucroPorTipsterItem,
  type ResumoEsporteItem,
  type ResumoCasaItem,
  type ApostaRecente,
  type EvolucaoBancaChartItem,
} from './useDashboardData';
export {
  useApostasManager,
  STATUS_WITH_RETURNS,
  calcularRetornoObtido,
  createInitialFormState,
  parseNumberOrFallback,
  parseNullableNumber,
  normalizeOptionalString,
  type ApostasFilters,
  type ApostasStats,
  type ApostaFormState,
  type StatusFormState,
  type UseApostasManagerOptions,
} from './useApostasManager';

// ============================================
// UI Hooks
// ============================================

export { 
  usePaginatedTable,
  type SortDirection,
  type SortConfig,
  type PaginationConfig,
  type UsePaginatedTableOptions,
  type UsePaginatedTableResult,
} from './usePaginatedTable';
export { useChartContainer, type UseChartContainerResult } from './useChartContainer';

// ============================================
// Event Hooks
// ============================================

export {
  useEventListener,
  useEventEmitter,
  useBancaEvents,
  useProfileEvents,
  useApostasEvents,
} from './useEventBus';
