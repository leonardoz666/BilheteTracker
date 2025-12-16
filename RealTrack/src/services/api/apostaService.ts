/**
 * Serviço de Apostas
 * 
 * Centraliza todas as operações de CRUD de apostas
 */

import { apiClient, invalidateCachePattern } from './apiClient';
import { eventBus } from '../../utils/eventBus';
import type { 
  ApiBet, 
  ApiBetWithBank, 
  ApiBetSummary,
  ApiUploadTicketResponse 
} from '../../types/api';

// ============================================
// Tipos
// ============================================

export interface Aposta {
  id: string;
  bancaId: string;
  esporte: string;
  evento: string;
  aposta: string;
  mercados?: string[];
  torneio: string;
  pais: string;
  mercado: string;
  tipoAposta: string;
  valorApostado: number;
  odd: number;
  bonus: number;
  dataEvento: string;
  tipster: string;
  status: ApostaStatus;
  casaDeAposta: string;
  retornoObtido: number;
  createdAt?: string;
  updatedAt?: string;
  banca?: {
    id: string;
    nome: string;
  };
}

export type ApostaStatus =
  | 'Pendente'
  | 'Ganha'
  | 'Perdida'
  | 'Meio Ganha'
  | 'Meio Perdida'
  | 'Cashout'
  | 'Reembolso'
  | 'Reembolsada'
  | 'Void';

export interface CreateApostaPayload {
  bancaId: string;
  esporte: string;
  evento: string;
  aposta: string;
  mercados?: string[];
  torneio?: string;
  pais?: string;
  mercado: string;
  tipoAposta: string;
  valorApostado: number;
  odd: number;
  bonus?: number;
  dataEvento: string;
  tipster?: string;
  status?: ApostaStatus;
  casaDeAposta: string;
  retornoObtido?: number;
}

export interface UpdateApostaPayload extends Partial<CreateApostaPayload> {
  aposta?: string;
  mercados?: string[];
  retornoObtido?: number;
}

interface UploadTicketOptions {
  ocrText?: string;
  signal?: AbortSignal;
}

export interface ApostasFilter {
  bancaId?: string;
  status?: ApostaStatus;
  esporte?: string;
  casaDeAposta?: string;
  tipster?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}

export interface ApostasResponse {
  apostas: Aposta[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ApostasSummary {
  totalApostas: number;
  totalInvestido: number;
  resultadoApostas: number;
  taxaAcerto: number;
  apostasGanhas: number;
  apostasPerdidas: number;
  apostasPendentes: number;
  apostasVoid: number;
  apostasConcluidas: number;
}

// ============================================
// Funções de Mapeamento
// ============================================

/**
 * Mapeia dados da API para formato do frontend
 */
const mapApostaFromApi = (item: ApiBet | ApiBetWithBank): Aposta => ({
  id: item.id,
  bancaId: item.bancaId,
  esporte: item.esporte,
  evento: (item as any).evento ?? (item as any).jogo ?? '',
  aposta: (item as any).aposta ?? '',
  mercados: (item as any).mercados ?? [],
  torneio: item.torneio ?? '',
  pais: item.pais ?? '',
  mercado: item.mercado,
  tipoAposta: item.tipoAposta,
  valorApostado: item.valorApostado,
  odd: item.odd,
  bonus: item.bonus,
  dataEvento: (item as any).dataEvento ?? (item as any).dataJogo ?? '',
  tipster: item.tipster ?? '',
  status: item.status as ApostaStatus,
  casaDeAposta: item.casaDeAposta,
  retornoObtido: item.retornoObtido ?? 0,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  banca: 'banca' in item ? item.banca : undefined,
});

/**
 * Mapeia resumo da API
 */
const mapSummaryFromApi = (data: ApiBetSummary): ApostasSummary => ({
  totalApostas: data.totalApostas,
  totalInvestido: data.totalInvestido,
  resultadoApostas: data.resultadoApostas,
  taxaAcerto: data.taxaAcerto,
  apostasGanhas: data.apostasGanhas,
  apostasPerdidas: data.apostasPerdidas,
  apostasPendentes: data.apostasPendentes,
  apostasVoid: data.apostasVoid,
  apostasConcluidas: data.apostasConcluidas,
});

// ============================================
// Helpers
// ============================================

/**
 * Constrói query params para filtros
 */
const buildQueryParams = (filters: ApostasFilter): URLSearchParams => {
  const params = new URLSearchParams();
  
  if (filters.bancaId) params.append('bancaId', filters.bancaId);
  if (filters.status) params.append('status', filters.status);
  if (filters.esporte) params.append('esporte', filters.esporte);
  if (filters.casaDeAposta) params.append('casaDeAposta', filters.casaDeAposta);
  if (filters.tipster) params.append('tipster', filters.tipster);
  if (filters.dataInicio) params.append('dataInicio', filters.dataInicio);
  if (filters.dataFim) params.append('dataFim', filters.dataFim);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  
  return params;
};

// ============================================
// API de Apostas
// ============================================

/**
 * Busca todas as apostas com filtros
 */
async function getAll(filters: ApostasFilter = {}): Promise<ApostasResponse> {
  const params = buildQueryParams(filters);
  const queryString = params.toString();
  const url = queryString ? `/apostas?${queryString}` : '/apostas';
  
  const response = await apiClient.get<{
    data: ApiBetWithBank[];
    total?: number;
    page?: number;
    totalPages?: number;
  }>(url);
  
  const data = response.data;
  const apostas = Array.isArray(data) 
    ? data 
    : Array.isArray(data.data) 
      ? data.data 
      : [];
  
  return {
    apostas: apostas.map(mapApostaFromApi),
    total: 'total' in data ? data.total ?? apostas.length : apostas.length,
    page: 'page' in data ? data.page ?? 1 : 1,
    totalPages: 'totalPages' in data ? data.totalPages ?? 1 : 1,
  };
}

/**
 * Busca apostas de uma banca específica
 */
async function getByBanca(bancaId: string, filters: Omit<ApostasFilter, 'bancaId'> = {}): Promise<ApostasResponse> {
  return getAll({ ...filters, bancaId });
}

/**
 * Busca uma aposta por ID
 */
async function getById(id: string): Promise<Aposta | null> {
  try {
    const response = await apiClient.get<ApiBet>(`/apostas/${id}`);
    return mapApostaFromApi(response.data);
  } catch {
    return null;
  }
}

/**
 * Busca resumo das apostas
 */
async function getSummary(bancaId?: string): Promise<ApostasSummary> {
  const url = bancaId ? `/apostas/resumo?bancaId=${bancaId}` : '/apostas/resumo';
  const response = await apiClient.get<ApiBetSummary>(url);
  return mapSummaryFromApi(response.data);
}

/**
 * Cria uma nova aposta
 */
async function create(payload: CreateApostaPayload): Promise<Aposta> {
  const response = await apiClient.post<ApiBet>('/apostas', payload);
  const newAposta = mapApostaFromApi(response.data);
  
  // Invalidar cache e emitir evento
  invalidateCachePattern('/apostas');
  invalidateCachePattern('/bancas');
  eventBus.emitApostasUpdated();
  
  return newAposta;
}

/**
 * Atualiza uma aposta existente
 */
async function update(id: string, payload: UpdateApostaPayload): Promise<Aposta> {
  const response = await apiClient.put<ApiBet>(`/apostas/${id}`, payload);
  const updatedAposta = mapApostaFromApi(response.data);
  
  // Invalidar cache e emitir evento
  invalidateCachePattern('/apostas');
  invalidateCachePattern('/bancas');
  eventBus.emitApostasUpdated();
  
  return updatedAposta;
}

/**
 * Exclui uma aposta
 */
async function remove(id: string): Promise<void> {
  await apiClient.delete(`/apostas/${id}`);
  
  // Invalidar cache e emitir evento
  invalidateCachePattern('/apostas');
  invalidateCachePattern('/bancas');
  eventBus.emitApostasUpdated();
}

/**
 * Exclui múltiplas apostas
 */
async function removeMany(ids: string[]): Promise<void> {
  await Promise.all(ids.map(id => apiClient.delete(`/apostas/${id}`)));
  
  // Invalidar cache e emitir evento
  invalidateCachePattern('/apostas');
  invalidateCachePattern('/bancas');
  eventBus.emitApostasUpdated();
}

/**
 * Atualiza status de uma aposta
 */
async function updateStatus(id: string, status: ApostaStatus, retornoObtido?: number): Promise<Aposta> {
  return update(id, { status, retornoObtido });
}

/**
 * Upload de ticket para extração de dados
 */
async function uploadTicket(file: File, options: UploadTicketOptions = {}): Promise<ApiUploadTicketResponse> {
  const formData = new FormData();
  formData.append('image', file);

  if (options.ocrText?.trim()) {
    formData.append('ocrText', options.ocrText.trim());
  }
  
  const response = await apiClient.post<ApiUploadTicketResponse>('/upload/bilhete', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal: options.signal,
  });
  
  return response.data;
}

// ============================================
// Export
// ============================================

export const apostaService = {
  // CRUD
  getAll,
  getByBanca,
  getById,
  getSummary,
  create,
  update,
  remove,
  removeMany,
  
  // Ações especiais
  updateStatus,
  uploadTicket,
  
  // Mapeadores
  mapApostaFromApi,
  mapSummaryFromApi,
};

export default apostaService;
