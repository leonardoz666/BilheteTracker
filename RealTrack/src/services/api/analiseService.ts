/**
 * Serviço de Análise
 * 
 * Centraliza todas as operações de análise e estatísticas
 */

import { apiClient } from './apiClient';
import type { AnalisePerformanceResponse, AnaliseFilters } from '../../types/analise';

// ============================================
// Tipos
// ============================================

export interface AnaliseQueryParams {
  bancaId?: string;
  status?: string;
  tipster?: string;
  casa?: string;
  esporte?: string;
  evento?: string;
  dataInicio?: string;
  dataFim?: string;
  oddMin?: string;
  oddMax?: string;
}

export interface RoiEntry {
  mes: string;
  roi: number;
}

export interface OddDistribution {
  faixa: string;
  quantidade: number;
}

export interface BookmakerComparison {
  casa: string;
  investido: number;
  resultado: number;
  roi: number;
}

export interface WinRatePorEsporte {
  esporte: string;
  total: number;
  ganhas: number;
  winRate: number;
}

export interface HeatmapCell {
  investido: number;
  resultado: number;
  roi: number;
}

export type HeatmapRow = Partial<Record<string, HeatmapCell>>;
export type HeatmapData = Partial<Record<string, HeatmapRow>>;

export interface PerformanceData {
  evolucaoRoiMensal: RoiEntry[];
  distribuicaoOdds: OddDistribution[];
  heatmap: HeatmapData;
  comparacaoBookmakers: BookmakerComparison[];
  winRatePorEsporte: WinRatePorEsporte[];
}

export interface DerivedStats {
  totalApostas: number;
  totalInvestido: number;
  totalLucro: number;
  roiMedio: number;
}

export interface AnaliseCompleta extends PerformanceData {
  stats: DerivedStats;
}

// ============================================
// Helpers
// ============================================

/**
 * Constrói query params para filtros de análise
 */
const buildQueryParams = (filters: AnaliseQueryParams): URLSearchParams => {
  const params = new URLSearchParams();
  
  if (filters.bancaId) params.append('bancaId', filters.bancaId);
  if (filters.status && filters.status !== 'todos') params.append('status', filters.status);
  if (filters.tipster && filters.tipster !== 'todos') params.append('tipster', filters.tipster);
  if (filters.casa && filters.casa !== 'todos') params.append('casaDeAposta', filters.casa);
  if (filters.esporte && filters.esporte !== 'todos') params.append('esporte', filters.esporte);
  if (filters.evento) params.append('evento', filters.evento);
  if (filters.dataInicio) params.append('dataInicio', filters.dataInicio);
  if (filters.dataFim) params.append('dataFim', filters.dataFim);
  if (filters.oddMin) params.append('oddMin', filters.oddMin);
  if (filters.oddMax) params.append('oddMax', filters.oddMax);
  
  return params;
};

/**
 * Converte filtros do formato do componente para query params
 */
const convertFiltersToParams = (filters: AnaliseFilters): AnaliseQueryParams => ({
  status: filters.status,
  tipster: filters.tipster,
  casa: filters.casa,
  esporte: filters.esporte,
  evento: filters.evento,
  dataInicio: filters.dataInicio,
  dataFim: filters.dataFim,
  oddMin: filters.oddMin,
  oddMax: filters.oddMax,
});

// ============================================
// Funções de Mapeamento
// ============================================

/**
 * Mapeia resposta da API para formato interno
 */
const mapPerformanceFromApi = (data: AnalisePerformanceResponse): PerformanceData => ({
  evolucaoRoiMensal: data.evolucaoRoiMensal ?? [],
  distribuicaoOdds: data.distribuicaoOdds ?? [],
  heatmap: data.heatmap ?? {},
  comparacaoBookmakers: data.comparacaoBookmakers ?? [],
  winRatePorEsporte: data.winRatePorEsporte ?? [],
});

/**
 * Calcula estatísticas derivadas dos dados de performance
 */
const calculateDerivedStats = (data: PerformanceData): DerivedStats => {
  // Total de apostas da comparação de bookmakers
  const totalInvestido = data.comparacaoBookmakers.reduce(
    (acc, item) => acc + item.investido,
    0
  );
  
  const totalLucro = data.comparacaoBookmakers.reduce(
    (acc, item) => acc + item.resultado,
    0
  );
  
  // Total de apostas da distribuição de odds
  const totalApostas = data.distribuicaoOdds.reduce(
    (acc, item) => acc + item.quantidade,
    0
  );
  
  // ROI médio
  const roiMedio = totalInvestido > 0 
    ? (totalLucro / totalInvestido) * 100 
    : 0;
  
  return {
    totalApostas,
    totalInvestido,
    totalLucro,
    roiMedio: Math.round(roiMedio * 100) / 100,
  };
};

// ============================================
// API de Análise
// ============================================

/**
 * Busca dados de performance com filtros
 */
async function getPerformance(filters: AnaliseQueryParams = {}): Promise<PerformanceData> {
  const params = buildQueryParams(filters);
  const queryString = params.toString();
  const url = queryString ? `/analise/performance?${queryString}` : '/analise/performance';
  
  const response = await apiClient.get<AnalisePerformanceResponse>(url);
  return mapPerformanceFromApi(response.data);
}

/**
 * Busca dados de performance para uma banca específica
 */
async function getPerformanceByBanca(
  bancaId: string, 
  filters: Omit<AnaliseQueryParams, 'bancaId'> = {}
): Promise<PerformanceData> {
  return getPerformance({ ...filters, bancaId });
}

/**
 * Busca análise completa com estatísticas derivadas
 */
async function getAnaliseCompleta(filters: AnaliseQueryParams = {}): Promise<AnaliseCompleta> {
  const performance = await getPerformance(filters);
  const stats = calculateDerivedStats(performance);
  
  return {
    ...performance,
    stats,
  };
}

/**
 * Busca evolução de ROI mensal
 */
async function getEvolucaoRoi(filters: AnaliseQueryParams = {}): Promise<RoiEntry[]> {
  const performance = await getPerformance(filters);
  return performance.evolucaoRoiMensal;
}

/**
 * Busca distribuição de odds
 */
async function getDistribuicaoOdds(filters: AnaliseQueryParams = {}): Promise<OddDistribution[]> {
  const performance = await getPerformance(filters);
  return performance.distribuicaoOdds;
}

/**
 * Busca comparação de bookmakers
 */
async function getComparacaoBookmakers(filters: AnaliseQueryParams = {}): Promise<BookmakerComparison[]> {
  const performance = await getPerformance(filters);
  return performance.comparacaoBookmakers;
}

/**
 * Busca heatmap de apostas
 */
async function getHeatmap(filters: AnaliseQueryParams = {}): Promise<HeatmapData> {
  const performance = await getPerformance(filters);
  return performance.heatmap;
}

/**
 * Busca win rate por esporte
 */
async function getWinRatePorEsporte(filters: AnaliseQueryParams = {}): Promise<WinRatePorEsporte[]> {
  const performance = await getPerformance(filters);
  return performance.winRatePorEsporte;
}

// ============================================
// Export
// ============================================

export const analiseService = {
  // Dados de performance
  getPerformance,
  getPerformanceByBanca,
  getAnaliseCompleta,
  
  // Dados específicos
  getEvolucaoRoi,
  getDistribuicaoOdds,
  getComparacaoBookmakers,
  getHeatmap,
  getWinRatePorEsporte,
  
  // Helpers
  buildQueryParams,
  convertFiltersToParams,
  
  // Mapeadores
  mapPerformanceFromApi,
  calculateDerivedStats,
};

export default analiseService;
