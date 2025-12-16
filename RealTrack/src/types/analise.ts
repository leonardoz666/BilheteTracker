export interface HeatmapCell {
  investido: number;
  resultado: number;
  roi: number;
}

export type HeatmapRow = Partial<Record<string, HeatmapCell>>;

export type HeatmapData = Partial<Record<string, HeatmapRow>>;

export interface AnaliseFilters {
  bancaId: string;
  status: string;
  tipster: string;
  casa: string;
  esporte: string;
  evento: string;
  dataInicio: string;
  dataFim: string;
  oddMin: string;
  oddMax: string;
}

export type AnaliseQueryParams = Partial<AnaliseFilters>;

export interface AnaliseRoiEntry {
  mes: string;
  roi: number;
}

export interface AnaliseOddDistribution {
  faixa: string;
  quantidade: number;
}

export interface AnaliseBookmakerComparison {
  casa: string;
  investido: number;
  resultado: number;
  roi: number;
}

export interface AnaliseWinRatePorEsporte {
  esporte: string;
  total: number;
  ganhas: number;
  winRate: number;
}

export interface AnalisePerformanceResponse {
  evolucaoRoiMensal?: AnaliseRoiEntry[];
  distribuicaoOdds?: AnaliseOddDistribution[];
  heatmap?: HeatmapData;
  comparacaoBookmakers?: AnaliseBookmakerComparison[];
  winRatePorEsporte?: AnaliseWinRatePorEsporte[];
}

