import type {
  AnaliseBookmakerComparison as LegacyAnaliseBookmakerComparison,
  AnaliseHeatmapData as LegacyHeatmapData,
  AnaliseOddDistribution as LegacyAnaliseOddDistribution,
  AnalisePerformanceResponse as LegacyAnalisePerformanceResponse,
  AnaliseRoiEntry as LegacyAnaliseRoiEntry,
  AnaliseWinRatePorEsporte as LegacyAnaliseWinRatePorEsporte,
} from './analise';

export type AnaliseRoiEntry = LegacyAnaliseRoiEntry;
export type AnaliseOddDistribution = LegacyAnaliseOddDistribution;
export type AnaliseBookmakerComparison = LegacyAnaliseBookmakerComparison;
export type AnaliseWinRatePorEsporte = LegacyAnaliseWinRatePorEsporte;
export type AnaliseHeatmapData = LegacyHeatmapData;

export type AnalisePerformanceResponse = LegacyAnalisePerformanceResponse;

export interface AnaliseDerivedStats {
  totalApostas: number;
  totalInvestido: number;
  totalLucro: number;
  roiMedio: number;
}


