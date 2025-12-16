import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { chartTheme } from '../utils/chartTheme';
import { formatCurrency, formatPercent } from '../utils/formatters';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import { AnaliseFilters as AnaliseFiltersComponent } from '../components/analise/AnaliseFilters';
import AnaliseRoiChart from '../components/analise/AnaliseRoiChart';
import AnaliseOddsChart from '../components/analise/AnaliseOddsChart';
import { chartCardBaseClass, chartCardInteractiveClass, chartTitleClass } from '../components/analise/chartStyles';
import useAnaliseData from '../hooks/useAnaliseData';
import { useBancas } from '../hooks/useBancas';
import { useChartContainer } from '../hooks/useChartContainer';
import type { AnaliseFilters as AnaliseFiltersType } from '../types/AnaliseFilters';
import type { RoiChartPoint } from '../types/RoiChartPoint';
import type { OddsChartPoint } from '../types/OddsChartPoint';

const heatmapRows = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const heatmapCols = ['Manhã (06-12)', 'Tarde (12-18)', 'Noite (18-24)', 'Madrugada (00-06)'];

interface HeatmapCell {
  investido: number;
  resultado: number;
  roi: number;
}

type HeatmapRow = Record<string, HeatmapCell | undefined>;
type HeatmapData = Record<string, HeatmapRow | undefined>;

interface AnaliseViewState {
  evolucaoRoiMensal: { mes: string; roi: number }[];
  distribuicaoOdds: { faixa: string; quantidade: number }[];
  heatmap: HeatmapData;
  comparacaoBookmakers: { casa: string; investido: number; resultado: number; roi: number }[];
  winRatePorEsporte: { esporte: string; total: number; ganhas: number; winRate: number }[];
}

interface AnaliseResultSnapshot {
  data: AnaliseViewState;
  isLoading: boolean;
}

const defaultHeatmap: HeatmapData = {};
const emptyAnaliseState: AnaliseViewState = {
  evolucaoRoiMensal: [],
  distribuicaoOdds: [],
  heatmap: defaultHeatmap,
  comparacaoBookmakers: [],
  winRatePorEsporte: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isStringValue = (value: unknown): value is string => typeof value === 'string';

const isArrayOf = <T,>(value: unknown, predicate: (entry: unknown) => entry is T): value is T[] => {
  return Array.isArray(value) && value.every(predicate);
};

const isRoiEntry = (value: unknown): value is { mes: string; roi: number } => {
  return isRecord(value) && isStringValue(value.mes) && isFiniteNumber(value.roi);
};

const isOddDistribution = (value: unknown): value is { faixa: string; quantidade: number } => {
  return isRecord(value) && isStringValue(value.faixa) && isFiniteNumber(value.quantidade);
};

const isBookmakerComparison = (value: unknown): value is { casa: string; investido: number; resultado: number; roi: number } => {
  return (
    isRecord(value) &&
    isStringValue(value.casa) &&
    isFiniteNumber(value.investido) &&
    isFiniteNumber(value.resultado) &&
    isFiniteNumber(value.roi)
  );
};

const isWinRateEntry = (value: unknown): value is { esporte: string; total: number; ganhas: number; winRate: number } => {
  return (
    isRecord(value) &&
    isStringValue(value.esporte) &&
    isFiniteNumber(value.total) &&
    isFiniteNumber(value.ganhas) &&
    isFiniteNumber(value.winRate)
  );
};

const isHeatmapCell = (value: unknown): value is HeatmapCell => {
  return (
    isRecord(value) &&
    isFiniteNumber(value.investido) &&
    isFiniteNumber(value.resultado) &&
    isFiniteNumber(value.roi)
  );
};

const isHeatmapRow = (value: unknown): value is HeatmapRow => {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every((cell) => cell === undefined || isHeatmapCell(cell));
};

const isHeatmapData = (value: unknown): value is HeatmapData => {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every((row) => row === undefined || isHeatmapRow(row));
};

const normalizeHeatmap = (value: unknown): HeatmapData => (isHeatmapData(value) ? value : defaultHeatmap);

const isAnaliseState = (value: unknown): value is AnaliseViewState => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isArrayOf(value.evolucaoRoiMensal, isRoiEntry) &&
    isArrayOf(value.distribuicaoOdds, isOddDistribution) &&
    isHeatmapData(value.heatmap) &&
    isArrayOf(value.comparacaoBookmakers, isBookmakerComparison) &&
    isArrayOf(value.winRatePorEsporte, isWinRateEntry)
  );
};

const normalizeAnaliseResult = (value: unknown): AnaliseResultSnapshot => {
  if (!isRecord(value)) {
    return { data: emptyAnaliseState, isLoading: false };
  }

  const { data, isLoading } = value;
  if (isAnaliseState(data) && typeof isLoading === 'boolean') {
    return { data, isLoading };
  }

  return {
    data: isAnaliseState(data) ? data : emptyAnaliseState,
    isLoading: typeof isLoading === 'boolean' ? isLoading : false,
  };
};
const defaultDistribuicaoOdds: OddsChartPoint[] = [
  { faixa: '1.00-1.50', quantidade: 0 },
  { faixa: '1.51-2.00', quantidade: 0 },
  { faixa: '2.01-3.00', quantidade: 0 },
  { faixa: '3.01-5.00', quantidade: 0 },
  { faixa: '5.01+', quantidade: 0 },
];
const initialFilters: AnaliseFiltersType = {
  bancaId: '',
  status: '',
  tipster: '',
  casa: '',
  esporte: '',
  evento: '',
  dataInicio: '',
  dataFim: '',
  oddMin: '',
  oddMax: '',
};

export default function Analise() {
  const [filters, setFilters] = useState<AnaliseFiltersType>(initialFilters);
  const { bancas } = useBancas();
  const autoSyncBancaRef = useRef(true);
  const preferredBancaId = useMemo(() => {
    if (bancas.length === 0) {
      return '';
    }
    const padrao = bancas.find((banca) => banca.padrao);
    return padrao?.id ?? bancas[0].id;
  }, [bancas]);

  useEffect(() => {
    const fallbackId = preferredBancaId || bancas[0]?.id || '';
    if (!fallbackId) {
      return;
    }
    setFilters((prev) => {
      const bancaExists = prev.bancaId ? bancas.some((banca) => banca.id === prev.bancaId) : false;
      const shouldForceSync = !prev.bancaId || !bancaExists || autoSyncBancaRef.current;

      if (!shouldForceSync && prev.bancaId === fallbackId) {
        autoSyncBancaRef.current = true;
        return prev;
      }

      if (!shouldForceSync) {
        return prev;
      }

      if (prev.bancaId === fallbackId) {
        autoSyncBancaRef.current = true;
        return prev;
      }

      autoSyncBancaRef.current = true;
      return { ...prev, bancaId: fallbackId };
    });
  }, [preferredBancaId, bancas]);

  const handleFiltersChange = useCallback((next: AnaliseFiltersType) => {
    setFilters((prev) => {
      if (next.bancaId && next.bancaId !== prev.bancaId) {
        autoSyncBancaRef.current = false;
      }
      return next;
    });
  }, []);

  const { data, isLoading } = normalizeAnaliseResult(useAnaliseData(filters));
  const {
    evolucaoRoiMensal,
    distribuicaoOdds,
    heatmap: rawHeatmap,
    winRatePorEsporte,
    comparacaoBookmakers,
  } = data;

  const heatmap = normalizeHeatmap(rawHeatmap);

  // Preparar dados para gráfico de ROI mensal
  const roiMensalChart: RoiChartPoint[] = evolucaoRoiMensal.map((item) => ({
    mes: new Date(`${item.mes}-01`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    roi: item.roi,
  }));

  // Preparar dados para distribuição de odds
  const oddsChart: OddsChartPoint[] = distribuicaoOdds.length > 0 ? distribuicaoOdds : defaultDistribuicaoOdds;

  // Função para obter cor do heatmap baseado no ROI
  const getHeatmapColorClass = (roi: number): string => {
    if (roi > 10) return 'bg-semantic-success';
    if (roi > 0) return 'bg-semantic-warning-yellow';
    if (roi > -10) return 'bg-semantic-warning-light';
    return 'bg-semantic-danger';
  };

  const getHeatmapOpacity = (roi: number, investido: number): number => {
    if (investido === 0) return 0.1;
    const absRoi = Math.abs(roi);
    return Math.min(0.3 + (absRoi / 50) * 0.7, 1);
  };

  // Calcular estatísticas filtradas (por enquanto usando dados totais)
  const totalApostas = distribuicaoOdds.reduce((sum, item) => sum + item.quantidade, 0);
  const totalInvestido = comparacaoBookmakers.reduce((sum, item) => sum + item.investido, 0);
  const totalLucro = comparacaoBookmakers.reduce((sum, item) => sum + item.resultado, 0);
  const roiMedio = totalInvestido > 0 ? (totalLucro / totalInvestido) * 100 : 0;

  const stats = [
    { title: 'Apostas Filtradas', value: totalApostas.toString(), helper: 'Total de apostas', color: 'blue' as const },
    { title: 'Investimento Filtrado', value: formatCurrency(totalInvestido), helper: 'Total investido', color: 'purple' as const },
    { title: 'Lucro Filtrado', value: formatCurrency(totalLucro), helper: 'Lucro/prejuízo total', color: 'emerald' as const },
    { title: 'ROI Filtrado', value: formatPercent(roiMedio), helper: 'Retorno sobre investimento', color: 'amber' as const }
  ];
  const statGridClass = 'grid gap-6 sm:grid-cols-2 xl:grid-cols-4';
  const chartGridClass = 'grid gap-6 lg:grid-cols-2';
  const skeletonCardClass = `${chartCardBaseClass} animate-pulse`;
  const skeletonChartClass = `${chartCardBaseClass} h-[320px] animate-pulse`;
  const {
    containerRef: winRateContainerRef,
    hasSize: winRateReady,
    dimensions: winRateDimensions,
  } = useChartContainer({ minHeight: 200, minWidth: 200 });
  const winRateWidth = Math.max(winRateDimensions.width, 0);
  const winRateHeight = Math.max(winRateDimensions.height, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gráficos"
        subtitle="Visualize suas métricas e acompanhe evolução"
        actions={<AnaliseFiltersComponent value={filters} onChange={handleFiltersChange} />}
      />

      {isLoading ? (
        <div className={statGridClass}>
          {stats.map((stat) => (
            <Skeleton key={stat.title} className={`${skeletonCardClass} space-y-3`}>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">{stat.title}</div>
              <div className="text-3xl font-semibold text-white">...</div>
              <p className="text-sm text-white/50">{stat.helper}</p>
            </Skeleton>
          ))}
        </div>
      ) : (
        <div className={statGridClass}>
          {stats.map((stat) => (
            <StatCard key={stat.title} title={stat.title} value={stat.value} helper={stat.helper} color={stat.color} />
          ))}
        </div>
      )}

      <section className={chartGridClass}>
        {isLoading ? (
          <>
            <Skeleton className={skeletonChartClass} />
            <Skeleton className={skeletonChartClass} />
          </>
        ) : (
          <>
            <AnaliseRoiChart data={roiMensalChart} />
            <AnaliseOddsChart data={oddsChart} />
          </>
        )}
      </section>

      <section className={chartGridClass}>
        <div className={chartCardInteractiveClass}>
          <h3 className={chartTitleClass}>Win Rate por Esporte</h3>
          <div
            ref={winRateContainerRef}
            className="mt-2 w-full"
            style={{ minHeight: 260, height: 260 }}
          >
            {!winRateReady ? (
              <div className="flex h-full items-center justify-center text-xs font-medium text-foreground-muted">
                Preparando gráfico...
              </div>
            ) : winRatePorEsporte.length > 0 ? (
              <BarChart
                width={winRateWidth}
                height={winRateHeight}
                data={winRatePorEsporte.slice(0, 10)}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <defs>
                  <linearGradient id={chartTheme.gradients.winRate.id} x1="0" y1="0" x2="0" y2="1">
                    {chartTheme.gradients.winRate.stops.map((stop) => (
                      <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
                    ))}
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} vertical={false} />
                <XAxis
                  dataKey="esporte"
                  stroke={chartTheme.axisStroke}
                  tick={{ ...chartTheme.axisTick }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickLine={false}
                />
                <YAxis
                  stroke={chartTheme.axisStroke}
                  tick={{ ...chartTheme.axisTick }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft', style: chartTheme.axisLabel }}
                />
                <Tooltip
                  contentStyle={{
                    ...chartTheme.tooltip,
                    border: `1px solid ${chartTheme.colors.borderSuccess}`
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'winRate') {
                      return [formatPercent(value), 'Win Rate'];
                    }
                    return [value, name === 'ganhas' ? 'Ganhas' : 'Total'];
                  }}
                  labelStyle={chartTheme.tooltipLabel}
                  itemStyle={chartTheme.tooltipItem}
                />
                <Bar
                  dataKey="winRate"
                  fill={`url(#${chartTheme.gradients.winRate.id})`}
                  radius={chartTheme.barRadius}
                  animationDuration={800}
                  maxBarSize={32}
                >
                  {winRatePorEsporte.slice(0, 10).map((entry) => (
                    <Cell key={`cell-${entry.esporte}`} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <div className="flex h-full items-center justify-center">
                <EmptyState title="Sem dados" description="Nenhuma aposta encontrada para os filtros." />
              </div>
            )}
          </div>
        </div>
        <div className={chartCardInteractiveClass}>
          <h3 className={chartTitleClass}>Heatmap de Performance</h3>
          <div className="mt-6 overflow-x-auto text-white">
            <div
              className="grid gap-2 text-xs"
              style={{ gridTemplateColumns: `120px repeat(${heatmapCols.length}, minmax(0, 1fr))` }}
            >
              <div />
              {heatmapCols.map((col) => (
                <span
                  key={col}
                  className="text-center text-[0.7rem] font-semibold uppercase tracking-wide text-white/60"
                >
                  {col.split(' ')[0]}
                </span>
              ))}
              {heatmapRows.map((row) => (
                <div key={row} className="contents">
                  <span className="flex items-center text-sm font-semibold text-white">{row}</span>
                  {heatmapCols.map((col) => {
                    const rowData = heatmap[row];
                    const cellData = rowData?.[col];
                    const roi = cellData?.roi ?? 0;
                    const investido = cellData?.investido ?? 0;
                    const colorClass = getHeatmapColorClass(roi);
                    const opacity = getHeatmapOpacity(roi, investido);
                    const title = investido > 0 ? `ROI: ${formatPercent(roi)}\nInvestido: ${formatCurrency(investido)}` : undefined;

                    return (
                      <div
                        key={`${row}-${col}`}
                        className={`flex h-10 items-center justify-center rounded-2xl text-[0.7rem] font-semibold transition ${colorClass} ${opacity > 0.5 ? 'text-white' : 'text-slate-900'} ${investido > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                        style={{ opacity }}
                        title={title}
                      >
                        {investido > 0 ? formatPercent(roi) : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

