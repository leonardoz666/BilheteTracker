/**
 * Serviço de Bancas
 * 
 * Centraliza todas as operações de CRUD de bancas
 */

import { apiClient, invalidateCachePattern } from './apiClient';
import { eventBus } from '../../utils/eventBus';

// ============================================
// Tipos
// ============================================

export interface Banca {
  id: string;
  nome: string;
  descricao: string;
  status: string;
  padrao: boolean;
  visualizacoes: number;
  visitantes: number;
  ultimaVisualizacao: string;
  criadoEm: string;
  stats: BancaStats;
}

export interface BancaStats {
  views: {
    hoje: number;
    semana: number;
    mes: number;
    total: number;
  };
  infoLink: {
    url: string;
    criadoEm: string;
  };
  engajamento: {
    taxaVisitantes: number;
    mediaVisualizacoesDia: number;
    ultimaAtividade: string;
  };
}

export interface BancaApi {
  id: string;
  nome: string;
  descricao?: string | null;
  status?: string | null;
  ePadrao?: boolean | null;
  metricas?: BancaMetricasApi | null;
  stats?: BancaStats;
  linkCompartilhamento?: string | null;
  criadoEm?: string | null;
  updatedAt?: string | null;
}

export interface BancaMetricasApi {
  totalApostas?: number;
  totalTransacoes?: number;
  visualizacoesHoje?: number;
  visualizacoesSemana?: number;
  visualizacoesMes?: number;
}

export interface CreateBancaPayload {
  nome: string;
  descricao?: string;
  saldoInicial?: number;
}

export interface UpdateBancaPayload {
  nome?: string;
  descricao?: string;
  status?: string;
  ePadrao?: boolean;
  saldoInicial?: number;
}

export interface SidebarBanca {
  id: string;
  nome: string;
  descricao: string;
  status: string;
}

// ============================================
// Constantes
// ============================================

import { formatDateTime } from '../../utils/formatters';

const DEFAULT_BANCA_DESCRIPTION = 'Banca sem descrição';

// ============================================
// Funções de Mapeamento
// ============================================

/**
 * Cria estatísticas a partir de dados da API
 */
const createStats = (banca: BancaApi): BancaStats => {
  if (banca.stats) return banca.stats;

  const totalApostas = banca.metricas?.totalApostas ?? 0;
  return {
    views: {
      hoje: banca.metricas?.visualizacoesHoje ?? 0,
      semana: banca.metricas?.visualizacoesSemana ?? 0,
      mes: banca.metricas?.visualizacoesMes ?? 0,
      total: totalApostas,
    },
    infoLink: {
      url: banca.linkCompartilhamento ?? `${window.location.origin}/banca/${banca.id}`,
      criadoEm: formatDateTime(banca.criadoEm),
    },
    engajamento: {
      taxaVisitantes: Math.min(
        100,
        Math.round(
          (banca.metricas?.totalTransacoes && totalApostas
            ? (banca.metricas.totalTransacoes / totalApostas) * 100
            : 0) || 0
        )
      ),
      mediaVisualizacoesDia: totalApostas,
      ultimaAtividade: formatDateTime(banca.updatedAt),
    },
  };
};

const withFallback = (value: string | null | undefined, fallback: string) => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed === '' ? fallback : trimmed;
};

const toOptionalString = (value?: string | null): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * Mapeia dados da API para formato do frontend
 */
const mapBancaFromApi = (item: BancaApi): Banca => {
  const stats = createStats(item);

  return {
    id: item.id,
    nome: item.nome,
    descricao: item.descricao ?? DEFAULT_BANCA_DESCRIPTION,
    status: item.status ?? 'Ativa',
    padrao: item.ePadrao ?? false,
    visualizacoes: stats.views.total,
    visitantes: item.metricas?.totalTransacoes ?? 0,
    ultimaVisualizacao: stats.engajamento.ultimaAtividade,
    criadoEm: formatDateTime(item.criadoEm),
    stats,
  };
};

/**
 * Mapeia para formato simplificado do sidebar
 */
const mapSidebarBanca = (
  item: BancaApi,
  index: number
): SidebarBanca => ({
  id: withFallback(item.id, `banca-${index}`),
  nome: withFallback(item.nome, 'Banca'),
  descricao: item.descricao ?? DEFAULT_BANCA_DESCRIPTION,
  status: item.status ?? 'Ativa',
});

// ============================================
// API de Bancas
// ============================================

/**
 * Busca todas as bancas
 */
async function getAll(): Promise<Banca[]> {
  const response = await apiClient.get<BancaApi[]>('/bancas');
  const data = response.data;

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapBancaFromApi);
}

/**
 * Busca bancas para o sidebar (formato simplificado)
 */
async function getAllForSidebar(): Promise<SidebarBanca[]> {
  const response = await apiClient.get<BancaApi[]>('/bancas');
  const data = response.data;

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map((item, index) => mapSidebarBanca(item, index));
}

/**
 * Busca uma banca por ID
 */
async function getById(id: string): Promise<Banca | null> {
  try {
    const response = await apiClient.get<BancaApi>(`/bancas/${id}`);
    return mapBancaFromApi(response.data);
  } catch {
    return null;
  }
}

/**
 * Cria uma nova banca
 */
async function create(payload: CreateBancaPayload): Promise<Banca> {
  const normalizedPayload = {
    nome: payload.nome.trim(),
    descricao: toOptionalString(payload.descricao),
    saldoInicial: payload.saldoInicial,
  };

  const response = await apiClient.post<BancaApi>('/bancas', normalizedPayload);
  const newBanca = mapBancaFromApi(response.data);

  // Invalidar cache e emitir evento
  invalidateCachePattern('/bancas');
  eventBus.emitBancaCreated(newBanca.id);

  return newBanca;
}

/**
 * Atualiza uma banca existente
 */
async function update(id: string, payload: UpdateBancaPayload): Promise<Banca> {
  const response = await apiClient.put<BancaApi>(`/bancas/${id}`, payload);
  const updatedBanca = mapBancaFromApi(response.data);

  // Invalidar cache e emitir evento
  invalidateCachePattern('/bancas');
  eventBus.emitBancaUpdated(id);

  return updatedBanca;
}

/**
 * Exclui uma banca
 */
async function remove(id: string): Promise<void> {
  await apiClient.delete(`/bancas/${id}`);

  // Invalidar cache e emitir evento
  invalidateCachePattern('/bancas');
  eventBus.emitBancaDeleted(id);
}

/**
 * Alterna status padrão de uma banca
 */
async function togglePadrao(id: string, currentPadrao: boolean): Promise<Banca> {
  return update(id, { ePadrao: !currentPadrao });
}

/**
 * Alterna status ativo/inativo de uma banca
 */
async function toggleStatus(id: string, currentStatus: string): Promise<Banca> {
  const newStatus = currentStatus === 'Ativa' ? 'Inativa' : 'Ativa';
  return update(id, { status: newStatus });
}

// ============================================
// Export
// ============================================

export const bancaService = {
  // CRUD
  getAll,
  getAllForSidebar,
  getById,
  create,
  update,
  remove,
  delete: remove,  // alias para compatibilidade

  // Ações especiais
  togglePadrao,
  toggleStatus,

  // Mapeadores (para casos onde é preciso mapear manualmente)
  mapBancaFromApi,
  mapSidebarBanca,
  createStats,
};

export default bancaService;
