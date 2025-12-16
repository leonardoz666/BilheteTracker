import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  Loader2,
  Plus,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FilterPopover from '../components/FilterPopover';
import DateInput from '../components/DateInput';
import { CASAS_APOSTAS } from '../constants/casasApostas';
import { STATUS_APOSTAS } from '../constants/statusApostas';
import { stripEsporteEmoji } from '../constants/esportes';
import { formatCurrency, formatPercent, getFirstName } from '../utils/formatters';
import { useDashboardData, useTipsters, useBancas, useChartContainer } from '../hooks';
import { cn } from '../components/ui/utils';
import { chartTheme } from '../utils/chartTheme';
import ImportCSVModal from '../components/ImportCSVModal';

const formatSignedPercent = (value: number): string => {
  const normalized = formatPercent(Math.abs(value));
  if (value > 0) return `+${normalized}`;
  if (value < 0) return `-${normalized}`;
  return normalized;
};

const formatSignedCurrency = (value: number): string => {
  const normalized = formatCurrency(Math.abs(value));
  if (value > 0) return `+${normalized}`;
  if (value < 0) return `-${normalized}`;
  return normalized;
};

const formatAxisCurrency = (value: number): string => {
  const formatted = formatCurrency(value);
  return formatted.replace(/,00$/, '');
};

const timeframeOptions = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '60', label: '60 dias' },
];

const labelTextClass = 'text-white/65';
const softLabelTextClass = 'text-white/55';
const ESPORTE_EMOJI_REGEX = /\p{Extended_Pictographic}/u;
const normalizeKey = (value: string) =>
  stripEsporteEmoji(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const SPORT_ICON_MAP: Record<string, string> = {
  basquetebol: '⚽️',
  'futebol americano': '🏈',
  basquete: '🏀',
  futebol: '⚽️',
  tenis: '🎾',
  volei: '🏐',
  corridas: '🏎️',
};
const SPORT_NAME_MAP: Record<string, string> = {
  basquetebol: 'Basquete',
};
const extractEmoji = (value?: string) => {
  if (!value) return null;
  const match = ESPORTE_EMOJI_REGEX.exec(value);
  return match ? match[0] : null;
};
const getSportIcon = (name?: string) => {
  if (!name) return '🏅';
  const emoji = extractEmoji(name);
  if (emoji) return emoji;
  const key = normalizeKey(name);
  return SPORT_ICON_MAP[key] ?? '🏅';
};
const getSportDisplayName = (name?: string) => {
  if (!name) return undefined;
  const baseName = stripEsporteEmoji(name);
  const key = normalizeKey(baseName);
  return SPORT_NAME_MAP[key] ?? baseName;
};

interface BreakdownCardItem {
  id: string;
  icon: string;
  name: string;
  subtitle: string;
  roi: number;
  lucro: number;
  apostas: number;
  ganhas: number;
  aproveitamento: number;
  stake: number;
  extraStats?: {
    label: string;
    value: string;
    helper?: string;
    highlight?: 'positive' | 'negative';
  }[];
}

interface BreakdownListProps {
  items: BreakdownCardItem[];
  expandedId: string | null;
  onToggle: (id: string | null) => void;
  emptyMessage: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedSport, setExpandedSport] = useState<string | null>(null);
  const [expandedCasa, setExpandedCasa] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const {
    loading,
    profile,
    metricas,
    resumoPorEsporte,
    resumoPorCasa,
    apostasRecentes,
    loadingApostasRecentes,
    filters,
    handleFilterChange,
    clearFilters,
    activeFiltersCount,
    periodoGrafico,
    setPeriodoGrafico,
    evolucaoBancaChart,
    crescimentoPercentual,
    melhorDia,
    mediaDiaria,
    fetchDashboardData,
  } = useDashboardData();

  const {
    containerRef: evolucaoChartRef,
    hasSize: evolucaoChartReady,
    dimensions: evolucaoChartDimensions,
  } = useChartContainer({ minHeight: 200, minWidth: 200 });
  const evolucaoChartWidth = Math.max(evolucaoChartDimensions.width, 0);
  const evolucaoChartHeight = Math.max(evolucaoChartDimensions.height, 0);

  const { tipsters } = useTipsters();
  const { bancas: userBancas, loading: bancasLoading } = useBancas();

  const defaultBancaId = useMemo(() => {
    if (!userBancas.length) return '';
    const padrao = userBancas.find((banca) => banca.padrao);
    return padrao?.id ?? userBancas[0]?.id ?? '';
  }, [userBancas]);

  useEffect(() => {
    if (!defaultBancaId) return;
    const bancaStillExists = userBancas.some((banca) => banca.id === filters.bancaId);
    const shouldSync = !filters.bancaId || !bancaStillExists;
    if (shouldSync && filters.bancaId !== defaultBancaId) {
      handleFilterChange('bancaId', defaultBancaId);
    }
  }, [defaultBancaId, filters.bancaId, handleFilterChange, userBancas]);

  const handleApplyFilters = () => {
    setFiltersOpen(false);
    void fetchDashboardData();
  };

  const handleClearFilters = () => {
    clearFilters();
    setFiltersOpen(false);
    void fetchDashboardData();
  };

  const rawAccuracyPercent = Number.isFinite(metricas.taxaAcerto) ? metricas.taxaAcerto : 0;
  const normalizedAccuracyPercent = rawAccuracyPercent > 1 ? rawAccuracyPercent / 100 : rawAccuracyPercent;
  const accuracyPercent = Math.min(Math.max(normalizedAccuracyPercent, 0), 1);
  const accuracyPercentLabel = formatPercent(accuracyPercent * 100);
  const totalApostas = metricas.totalApostas ?? 0;
  const apostasGanhas = metricas.apostasGanhas ?? Math.round(totalApostas * accuracyPercent);
  const derrotasCalculadas = metricas.apostasPerdidas ?? Math.max(totalApostas - apostasGanhas, 0);
  const derrotasLabel = derrotasCalculadas === 1 ? 'derrota' : 'derrotas';
  const apostasLabel = totalApostas === 1 ? 'aposta' : 'apostas';
  const accuracyDetailText = `${derrotasCalculadas} ${derrotasLabel} de ${totalApostas} ${apostasLabel}`;
  const handleNovaAposta = () => {
    navigate('/atualizar', { state: { openNovaAposta: true } });
  };

  const sportBreakdown = useMemo<BreakdownCardItem[]>(
    () =>
      resumoPorEsporte.slice(0, 4).map((item, index) => ({
        id: item.esporte || `esporte-${index}`,
        icon: getSportIcon(item.esporte),
        name: item.esporte || 'Outros',
        subtitle: `${item.apostas} apostas • ${formatPercent(item.aproveitamento)} de vitórias`,
        roi: item.roi,
        lucro: item.lucro,
        apostas: item.apostas,
        ganhas: item.ganhas,
        aproveitamento: item.aproveitamento,
        stake: item.stakeMedia,
      })),
    [resumoPorEsporte]
  );

  const casaBreakdown = useMemo<BreakdownCardItem[]>(
    () =>
      resumoPorCasa.slice(0, 4).map((item, index) => ({
        id: item.casa || `casa-${index}`,
        icon: '🏦',
        name: item.casa || 'Outras casas',
        subtitle: `${item.apostas} apostas \u2022 ${formatPercent(item.aproveitamento)} de vit\u00F3rias`,
        roi: item.roi,
        lucro: item.lucro,
        apostas: item.apostas,
        ganhas: item.ganhas,
        aproveitamento: item.aproveitamento,
        stake: item.stakeMedia,
        extraStats: [
          {
            label: 'Saldo',
            value: formatCurrency(item.saldo),
            highlight: item.saldo >= 0 ? 'positive' : 'negative',
          },
        ],
      })),
    [resumoPorCasa]
  );

  const lucroPeriodo = useMemo(
    () => evolucaoBancaChart.reduce((total, item) => total + item.diário, 0),
    [evolucaoBancaChart]
  );
  const periodoDiasLabel = `${periodoGrafico} dias`;
  const melhorDiaFormatado = useMemo(() => {
    if (!melhorDia.data) return 'Sem histórico';
    const parsed = new Date(melhorDia.data);
    if (Number.isNaN(parsed.getTime())) return melhorDia.data;
    return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  }, [melhorDia.data]);
  const crescimentoLabel = formatSignedPercent(crescimentoPercentual);
  const crescimentoNegativo = crescimentoPercentual < 0;
  const GrowthTrendIcon = crescimentoNegativo ? ArrowDownRight : ArrowUpRight;
  const growthColorClass = crescimentoNegativo ? 'text-[#ff9bb7]' : 'text-[#8efadd]';
  const chartTooltipStyles = useMemo(
    () => ({
      backgroundColor: 'rgba(3, 21, 19, 0.95)',
      border: '1px solid rgba(31, 231, 203, 0.25)',
      borderRadius: 16,
      boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
      color: '#f4fffc',
      padding: '12px 16px',
    }),
    []
  );

  const filterInputClass =
    'mt-2 w-full rounded-2xl border border-border/40 bg-background px-4 py-3 text-sm text-foreground placeholder:text-foreground-muted transition focus-visible:border-brand-emerald focus-visible:ring-2 focus-visible:ring-brand-emerald/30';

  const cardSurfaceClass = 'bg-[#10322e]';
  const cardBorderClass = 'border-white/5';
  const cardShadowClass = 'shadow-[0_25px_45px_rgba(0,0,0,0.25)]';
  const sectionCardClass = `rounded-lg ${cardBorderClass} ${cardSurfaceClass} p-6 ${cardShadowClass} backdrop-blur-sm`;
  const evolutionCardClass =
    'rounded-[32px] border border-white/5 bg-gradient-to-br from-[#031d1a] via-[#042722] to-[#021213] p-6 sm:p-8 text-white shadow-[0_35px_70px_rgba(0,0,0,0.6)]';
  const evolutionMetricCardClass =
    'rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm';
  const timeframeSwitchBaseClass =
    'rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1fe7cb]/40';
  const evolutionChartShellClass =
    'rounded-[28px] border border-white/10 bg-black/10 p-4 sm:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur';
  const lucroLineGradientId = 'lucroLineGradient';

  return (
    <div className="space-y-8 text-foreground">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className={cn('text-2xs uppercase tracking-[0.3em]', softLabelTextClass)}>Visão geral</p>
            <h1 className="text-3xl font-semibold">
              Bem-vindo de volta, {profile ? getFirstName(profile.nomeCompleto) : 'Usuário'} 👋
            </h1>
            <p className={cn('text-sm', labelTextClass)}>Acompanhe seus números mais importantes em tempo real.</p>
          </div>
          <div className="flex items-center gap-3 mt-6 relative">
            {loading && (
              <span className={cn('inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-xs text-foreground-muted', softLabelTextClass)}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Atualizando
              </span>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-border/40 bg-background px-4 py-2 text-sm font-semibold text-foreground transition hocus:border-brand-emerald/60 hocus:text-brand-emerald"
              onClick={handleNovaAposta}
            >
              <Plus size={16} /> Nova aposta
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-border/40 bg-background px-4 py-2 text-sm font-semibold text-foreground transition hocus:border-brand-emerald/60 hocus:text-brand-emerald"
              onClick={() => setImportModalOpen(true)}
            >
              <Download size={16} /> Importar dados
            </button>
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl border border-border/40 bg-background px-4 py-2 text-sm font-semibold text-foreground transition hocus:border-brand-emerald/60 hocus:text-brand-emerald"
                onClick={() => setFiltersOpen((prev) => !prev)}
                aria-expanded={filtersOpen}
              >
                <Filter size={16} />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="rounded-full bg-brand-emerald/15 px-2 text-xs font-semibold text-brand-emerald">{activeFiltersCount}</span>
                )}
              </button>
              {filtersOpen && (
                <div className="absolute left-0 top-full mt-2 z-50">
                  <FilterPopover
                    open={filtersOpen}
                    onClose={() => setFiltersOpen(false)}
                    onClear={handleClearFilters}
                    footer={
                      <button
                        type="button"
                        className="w-full rounded-2xl bg-brand-linear px-4 py-2 text-sm font-semibold text-[#f2f2f2] shadow-glow transition active:scale-[0.99]"
                        onClick={handleApplyFilters}
                      >
                        Aplicar filtros
                      </button>
                    }
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm font-medium text-foreground">
                        <span>Status</span>
                        <select
                          value={filters.status}
                          onChange={(event) => handleFilterChange('status', event.target.value)}
                          className={filterInputClass}
                        >
                          <option value="">Todos</option>
                          {STATUS_APOSTAS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-foreground">
                        <span>Tipster</span>
                        <select
                          value={filters.tipster}
                          onChange={(event) => handleFilterChange('tipster', event.target.value)}
                          className={filterInputClass}
                        >
                          <option value="">Todos</option>
                          {tipsters
                            .filter((tipster) => tipster.ativo)
                            .map((tipster) => (
                              <option key={tipster.id} value={tipster.nome}>
                                {tipster.nome}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-foreground">
                        <span>Casa de aposta</span>
                        <select
                          value={filters.casa}
                          onChange={(event) => handleFilterChange('casa', event.target.value)}
                          className={filterInputClass}
                        >
                          <option value="">Todas</option>
                          {CASAS_APOSTAS.map((casa) => (
                            <option key={casa} value={casa}>
                              {casa}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium text-foreground">
                        <span>Banca</span>
                        <select
                          value={filters.bancaId}
                          onChange={(event) => handleFilterChange('bancaId', event.target.value)}
                          className={filterInputClass}
                          disabled={bancasLoading}
                        >
                          <option value="">Todas</option>
                          {userBancas.map((banca) => (
                            <option key={banca.id} value={banca.id}>
                              {banca.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="space-y-4">
                        <label className="text-sm font-medium text-foreground">
                          <span>Data (de)</span>
                          <DateInput value={filters.dataInicio} onChange={(value) => handleFilterChange('dataInicio', value)} className={filterInputClass} />
                        </label>
                        <label className="text-sm font-medium text-foreground">
                          <span>Data (até)</span>
                          <DateInput value={filters.dataFim} onChange={(value) => handleFilterChange('dataFim', value)} className={filterInputClass} />
                          <p className="mt-2 text-xs text-foreground-muted">
                            Deixe o campo vazio para considerar todo o histórico.
                          </p>
                        </label>
                      </div>
                    </div>
                  </FilterPopover>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-4">
        <div
          className={cn(
            'col-span-1 space-y-6 rounded-lg border border-border/30 p-6 text-[#f2f2f2] shadow-card lg:col-span-2',
            'bg-bank-hero'
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/80">Saldo da banca</p>
              <p className="text-4xl font-semibold tracking-tight">{formatCurrency(metricas.saldoBanca)}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-3 py-1 text-sm font-semibold">
              <TrendingUp size={16} />
              {formatSignedPercent(metricas.roi)}
            </span>
          </div>

          <div className="grid gap-6 text-sm md:grid-cols-3">
            <div>
              <p className="text-white/70">Lucro total</p>
              <p className="text-2xl font-semibold">{formatCurrency(metricas.lucroTotal)}</p>
            </div>
            <div>
              <p className="text-white/70">Depósitos</p>
              <p className="text-lg font-semibold">{formatCurrency(metricas.totalDepositado)}</p>
            </div>
            <div>
              <p className="text-white/70">Saques</p>
              <p className="text-lg font-semibold">{formatCurrency(metricas.totalSacado)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-white/75">
            <div className="flex flex-wrap gap-6">
              <span>Total investido: {formatCurrency(metricas.totalInvestido)}</span>
              <span>ROI médio: {formatSignedPercent(metricas.roi)}</span>
            </div>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-[#f2f2f2] transition hover:bg-white/20">
              Ver detalhes <ArrowUpRight size={16} />
            </button>
          </div>
        </div>

        <div className={cn(sectionCardClass, 'space-y-4 lg:col-span-2')}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-emerald/15 text-brand-emerald">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Taxa de acerto</p>
                <p className={cn('text-xs text-foreground-muted', softLabelTextClass)}>Taxa atual</p>
              </div>
            </div>
            <span className="text-3xl font-semibold text-foreground">{accuracyPercentLabel}</span>
          </div>
          <div className="grid gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-foreground sm:grid-cols-3">
            <div>
              <p className={cn('text-2xs uppercase tracking-[0.3em] text-foreground-muted', softLabelTextClass)}>Apostas</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{totalApostas}</p>
            </div>
            <div>
              <p className={cn('text-2xs uppercase tracking-[0.3em] text-foreground-muted', softLabelTextClass)}>Greens</p>
              <p className="mt-1 text-xl font-semibold text-emerald-400">{apostasGanhas}</p>
            </div>
            <div>
              <p className={cn('text-2xs uppercase tracking-[0.3em] text-foreground-muted', softLabelTextClass)}>Reds</p>
              <p className="mt-1 text-xl font-semibold text-rose-400">{derrotasCalculadas}</p>
            </div>
          </div>
          <div className="rounded-full bg-foreground/10 p-0.5">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-[#10ad7b] via-[#11b08f] to-[#12b4a8] shadow-[0_0_10px_rgba(16,185,129,0.25)] transition-[width] duration-500"
              style={{ width: `${(accuracyPercent * 100).toFixed(1)}%` }}
            />
          </div>
          <p className={cn('text-xs text-foreground-muted', softLabelTextClass)}>{accuracyPercentLabel} ({accuracyDetailText})</p>
        </div>

      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className={cn(evolutionCardClass, 'space-y-6')}>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#7efee0]">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">Evolução do Lucro</p>
                <p className="text-sm text-white/70">Acompanhe o desempenho financeiro do seu negócio.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 p-1">
              {timeframeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    timeframeSwitchBaseClass,
                    periodoGrafico === option.value
                      ? 'bg-[#1fe7cb] text-[#031d1a] shadow-[0_15px_30px_rgba(31,231,203,0.35)]'
                      : 'text-white/65 hover:text-white'
                  )}
                  onClick={() => setPeriodoGrafico(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className={evolutionMetricCardClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Total acumulado</p>
              <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(lucroPeriodo)}</p>
              <p className={cn('mt-3 flex items-center gap-2 text-sm font-semibold', growthColorClass)}>
                <GrowthTrendIcon className="h-4 w-4" /> {crescimentoLabel} vs período anterior
              </p>
            </div>
            <div className={evolutionMetricCardClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Melhor dia</p>
              <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(melhorDia.valor)}</p>
              <p className="mt-1 text-sm text-white/65">{melhorDiaFormatado}</p>
            </div>
            <div className={evolutionMetricCardClass}>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Média diária</p>
              <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(mediaDiaria || 0)}</p>
              <p className="mt-1 text-sm text-white/65">Últimos {periodoDiasLabel}</p>
            </div>
          </div>

          <div className={evolutionChartShellClass}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white">Gráfico de desempenho</p>
                <p className="text-sm text-white/60">Lucro diário em reais</p>
              </div>
            </div>
            <div ref={evolucaoChartRef} className="mt-6 h-72 w-full">
              {!evolucaoChartReady ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-xs font-medium text-white/60">
                  Preparando gráfico...
                </div>
              ) : evolucaoBancaChart.length > 0 ? (
                <LineChart
                  width={evolucaoChartWidth}
                  height={evolucaoChartHeight}
                  data={evolucaoBancaChart}
                  margin={{ top: 5, right: 30, left: 10, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id={lucroLineGradientId} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#35ffe4" />
                      <stop offset="100%" stopColor="#1ddfd0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ ...chartTheme.axisTick, fill: 'rgba(255,255,255,0.7)' }}
                    tickMargin={12}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={70}
                    tick={{ ...chartTheme.axisTick, fill: 'rgba(255,255,255,0.7)' }}
                    tickFormatter={formatAxisCurrency}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyles}
                    itemStyle={{ color: '#1fe7cb' }}
                    labelStyle={{ color: '#e8ffff', fontWeight: 600 }}
                    formatter={(value: number) => [formatCurrency(value), 'Lucro diário']}
                    labelFormatter={(label: string) => `Dia ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="diário"
                    stroke={`url(#${lucroLineGradientId})`}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0, fill: '#38ffe4' }}
                    activeDot={{ r: 6, fill: '#38ffe4', stroke: '#042620', strokeWidth: 2 }}
                  />
                </LineChart>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-white/70">
                  Nenhum dado disponível para o período selecionado.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={cn(sectionCardClass, 'space-y-5')}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Performance recente</h3>
              <p className={cn('text-sm text-foreground-muted', labelTextClass)}>Últimas 5 apostas registradas</p>
            </div>
            <TrendingUp size={18} className="text-brand-emerald" />
          </div>

          {loadingApostasRecentes ? (
            <div className={cn('flex h-48 items-center justify-center text-foreground-muted', softLabelTextClass)}>
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : apostasRecentes.length === 0 ? (
            <div className={cn('flex h-48 items-center justify-center text-sm text-foreground-muted', labelTextClass)}>Nenhuma aposta recente.</div>
          ) : (
            <div className="space-y-3">
              {apostasRecentes.slice(0, 5).map((aposta) => {
                const status = aposta.status?.toUpperCase() ?? 'PENDENTE';
                const positive = status === 'GANHOU';
                const negative = status === 'PERDEU';
                const statusClass = positive
                  ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : negative
                    ? 'border border-red-500/30 bg-red-500/15 text-red-500'
                    : 'border border-white/10 bg-white/5 text-white/70';
                const valueClass = positive ? 'text-emerald-400' : negative ? 'text-rose-400' : 'text-foreground';
                const rawDate = aposta.dataEvento ? new Date(aposta.dataEvento) : null;
                const formattedDate = rawDate && !Number.isNaN(rawDate.getTime())
                  ? rawDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                  : '—';
                const description = aposta.evento ?? 'Aposta sem descrição';
                const oddLabel = aposta.odd ?? '-';
                const bettingHouse = aposta.casaDeAposta ?? 'Casa desconhecida';

                return (
                  <div
                    key={aposta.id}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">{description}</p>
                      <p className={cn('text-xs text-foreground-muted', softLabelTextClass)}>
                        {formattedDate} · Odd {oddLabel} · {bettingHouse}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn('rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide', statusClass)}>
                        {status}
                      </span>
                      <span className={cn('text-base font-semibold', valueClass)}>
                        {formatSignedCurrency(aposta.lucro ?? 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={cn(sectionCardClass, 'space-y-5')}>
          <div>
            <h3 className="text-lg font-semibold">Desempenho por esporte</h3>
            <p className={cn('text-sm text-foreground-muted', labelTextClass)}>Descubra onde a banca performa melhor</p>
          </div>
          <BreakdownList
            items={sportBreakdown}
            expandedId={expandedSport}
            onToggle={setExpandedSport}
            emptyMessage="Nenhum esporte registrado no período."
          />
        </div>

        <div className={cn(sectionCardClass, 'space-y-5')}>
          <div>
            <h3 className="text-lg font-semibold">Desempenho por casa</h3>
            <p className={cn('text-sm text-foreground-muted', labelTextClass)}>Veja quais casas oferecem melhor ROI</p>
          </div>
          <BreakdownList
            items={casaBreakdown}
            expandedId={expandedCasa}
            onToggle={setExpandedCasa}
            emptyMessage="Nenhum histórico por casa disponível."
          />
        </div>
      </section>

      {/* Import Modal */}
      <ImportCSVModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        bancas={userBancas}
        defaultBancaId={defaultBancaId}
        onImportSuccess={() => {
          void fetchDashboardData();
        }}
      />
    </div>
  );
}

function BreakdownList({ items, expandedId, onToggle, emptyMessage }: BreakdownListProps) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-dashed border-white/10 bg-[#0b1f1f]/60 px-4 py-10 text-center text-sm text-white/60 backdrop-blur',
          labelTextClass
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const isExpanded = expandedId === item.id;
        const lucroPositive = item.lucro > 0;
        const lucroNeutral = item.lucro === 0;
        const rawWinPercent = Number.isFinite(item.aproveitamento) ? item.aproveitamento : 0;
        const clampedWinPercent = Math.min(Math.max(rawWinPercent, 0), 100);
        const stakeValue = Number.isFinite(item.stake) ? item.stake : 0;
        const roiValue = Number.isFinite(item.roi) ? item.roi : 0;
        const progressColor =
          clampedWinPercent >= 50
            ? 'from-emerald-500 to-teal-400'
            : clampedWinPercent >= 30
              ? 'from-amber-500 to-orange-400'
              : 'from-rose-500 to-red-500';
        const roiBadgeClass =
          roiValue > 0
            ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
            : roiValue < 0
              ? 'border border-rose-500/30 bg-rose-500/15 text-rose-300'
              : 'border border-white/10 bg-white/5 text-white/70';
        const lucroClass = lucroPositive ? 'text-emerald-300' : lucroNeutral ? 'text-white/70' : 'text-rose-300';
        const roiNormalized = Math.max(0, Math.min(100, (roiValue + 100) / 2));

        return (
          <div
            key={item.id}
            className={cn(
              'rounded-2xl border bg-[#0b1f1f] text-foreground shadow-[0_25px_35px_rgba(0,0,0,0.35)] transition duration-300 backdrop-blur-sm',
              isExpanded ? 'border-emerald-500/40 shadow-emerald-500/10' : 'border-white/5 hover:border-white/20'
            )}
          >
            <button
              type="button"
              onClick={() => onToggle(isExpanded ? null : item.id)}
              className="flex w-full items-center gap-4 px-4 py-4 text-left"
              aria-expanded={isExpanded}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#1b3a37] to-[#132826] text-2xl">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-white">{item.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                  <span>{item.apostas} apostas</span>
                  <span>•</span>
                  <span className={cn(rawWinPercent >= 40 ? 'text-emerald-300' : rawWinPercent === 0 ? 'text-white/60' : 'text-rose-300')}>
                    {formatPercent(clampedWinPercent)} win
                  </span>
                </div>
              </div>
              <div className={cn('rounded-lg px-3 py-1.5 text-sm font-semibold', roiBadgeClass)}>{formatSignedPercent(roiValue)}</div>
              <div className="text-right">
                <p className={cn('text-base font-semibold', lucroClass)}>{formatSignedCurrency(item.lucro)}</p>
                <p className="text-xs uppercase tracking-wide text-white/50">Lucro</p>
              </div>
              <ChevronDown className={cn('ml-2 h-5 w-5 text-white/50 transition', isExpanded && 'rotate-180 text-white/80')} />
            </button>

            {isExpanded && (
              <div className="border-t border-white/10 bg-white/5 px-4 pb-5 pt-4">
                <div className="grid gap-3 pt-2 text-sm text-white sm:grid-cols-2 lg:grid-cols-4">
                  <BreakdownStat label="Apostas" value={item.apostas.toString()} />
                  <BreakdownStat
                    label="Vitórias"
                    value={item.ganhas.toString()}
                    helper={`${formatPercent(clampedWinPercent)} de aproveitamento`}
                    highlight={rawWinPercent >= 50 ? 'positive' : rawWinPercent <= 30 ? 'negative' : undefined}
                  />
                  <BreakdownStat label="Stake médio" value={formatCurrency(stakeValue)} helper="média" />
                  <BreakdownStat
                    label="Lucro total"
                    value={formatSignedCurrency(item.lucro)}
                    highlight={item.lucro >= 0 ? 'positive' : 'negative'}
                  />
                </div>

                {item.extraStats?.length ? (
                  <div className="mt-3 grid gap-3 text-sm text-white sm:grid-cols-2 lg:grid-cols-4">
                    {item.extraStats.map((extra) => (
                      <BreakdownStat
                        key={`${item.id}-${extra.label}`}
                        label={extra.label}
                        value={extra.value}
                        helper={extra.helper}
                        highlight={extra.highlight}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Taxa de aproveitamento</span>
                    <span>{formatPercent(clampedWinPercent)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full border border-white/10 bg-[#071312]">
                    <div
                      className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', progressColor)}
                      style={{ width: `${clampedWinPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
                  <span>Retorno sobre investimento</span>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, index) => {
                        const threshold = (index + 1) * 20;
                        const filled = roiNormalized >= threshold;
                        const fillClass = filled
                          ? roiNormalized >= 60
                            ? 'bg-emerald-500'
                            : roiNormalized >= 40
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          : 'bg-white/10';

                        return <span key={`${item.id}-roi-${index}`} className={cn('h-6 w-1.5 rounded-sm transition', fillClass)} />;
                      })}
                    </div>
                    <span className={cn('text-sm font-semibold', roiValue > 0 ? 'text-emerald-300' : roiValue < 0 ? 'text-rose-300' : 'text-white/70')}>
                      {formatSignedPercent(roiValue)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BreakdownStat({
  label,
  value,
  helper,
  highlight,
}: {
  label: string;
  value: string;
  helper?: string;
  highlight?: 'positive' | 'negative';
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d2424] p-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">{label}</p>
      <p
        className={cn(
          'mt-2 text-xl font-semibold text-white',
          highlight === 'positive' && 'text-emerald-300',
          highlight === 'negative' && 'text-rose-300'
        )}
      >
        {value}
      </p>
      {helper && <p className="text-xs text-white/60">{helper}</p>}
    </div>
  );
}
