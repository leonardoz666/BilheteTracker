/**
 * Serviço Financeiro
 * 
 * Centraliza todas as operações de transações financeiras (depósitos e saques)
 */

import { apiClient, invalidateCachePattern } from './apiClient';
import { eventBus } from '../../utils/eventBus';
import type { 
  ApiFinancialTransaction, 
  ApiFinancialTransactionWithBank,
  ApiFinancialSummary 
} from '../../types/api';

// ============================================
// Tipos
// ============================================

export type TipoTransacao = 'Depósito' | 'Saque';

export interface Transacao {
  id: string;
  bancaId: string;
  tipo: TipoTransacao;
  casaDeAposta: string;
  valor: number;
  dataTransacao: string;
  observacao: string;
  createdAt?: string;
  updatedAt?: string;
  banca?: {
    id: string;
    nome: string;
  };
}

export interface CreateTransacaoPayload {
  bancaId: string;
  tipo: TipoTransacao;
  casaDeAposta: string;
  valor: number;
  dataTransacao: string;
  observacao?: string;
}

export type UpdateTransacaoPayload = Partial<CreateTransacaoPayload>;

export interface TransacoesFilter {
  bancaId?: string;
  tipo?: TipoTransacao;
  casaDeAposta?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}

export interface TransacoesResponse {
  transacoes: Transacao[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ResumoFinanceiro {
  totalDepositado: number;
  totalSacado: number;
  saldoAtual: number;
  totalTransacoes: number;
  totalDepositos: number;
  totalSaques: number;
  resultadoApostas: number;
  apostasPendentes: number;
  valorApostasPendentes: number;
  apostasConcluidas: number;
  porCasa: Record<string, {
    depositos: number;
    saques: number;
    saldo: number;
    apostas: number;
    resultado: number;
  }>;
}

// ============================================
// Funções de Mapeamento
// ============================================

/**
 * Mapeia dados da API para formato do frontend
 */
const mapTransacaoFromApi = (item: ApiFinancialTransaction | ApiFinancialTransactionWithBank): Transacao => ({
  id: item.id,
  bancaId: item.bancaId,
  tipo: item.tipo,
  casaDeAposta: item.casaDeAposta,
  valor: item.valor,
  dataTransacao: item.dataTransacao,
  observacao: item.observacao ?? '',
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  banca: 'banca' in item ? item.banca : undefined,
});

/**
 * Mapeia resumo financeiro da API
 */
const mapResumoFromApi = (data: ApiFinancialSummary): ResumoFinanceiro => ({
  totalDepositado: data.totalDepositado,
  totalSacado: data.totalSacado,
  saldoAtual: data.saldoAtual,
  totalTransacoes: data.totalTransacoes,
  totalDepositos: data.totalDepositos,
  totalSaques: data.totalSaques,
  resultadoApostas: data.resultadoApostas,
  apostasPendentes: data.apostasPendentes,
  valorApostasPendentes: data.valorApostasPendentes,
  apostasConcluidas: data.apostasConcluidas,
  porCasa: data.porCasa,
});

// ============================================
// Helpers
// ============================================

/**
 * Constrói query params para filtros
 */
const buildQueryParams = (filters: TransacoesFilter): URLSearchParams => {
  const params = new URLSearchParams();
  
  if (filters.bancaId) params.append('bancaId', filters.bancaId);
  if (filters.tipo) params.append('tipo', filters.tipo);
  if (filters.casaDeAposta) params.append('casaDeAposta', filters.casaDeAposta);
  if (filters.dataInicio) params.append('dataInicio', filters.dataInicio);
  if (filters.dataFim) params.append('dataFim', filters.dataFim);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));
  
  return params;
};

// ============================================
// API de Transações Financeiras
// ============================================

/**
 * Busca todas as transações com filtros
 */
async function getAll(filters: TransacoesFilter = {}): Promise<TransacoesResponse> {
  const params = buildQueryParams(filters);
  const queryString = params.toString();
  const url = queryString ? `/financeiro/transacoes?${queryString}` : '/financeiro/transacoes';
  
  const response = await apiClient.get<{
    data: ApiFinancialTransactionWithBank[];
    total?: number;
    page?: number;
    totalPages?: number;
  }>(url);
  
  const data = response.data;
  const transacoes = Array.isArray(data) 
    ? data 
    : Array.isArray(data.data) 
      ? data.data 
      : [];
  
  return {
    transacoes: transacoes.map(mapTransacaoFromApi),
    total: 'total' in data ? data.total ?? transacoes.length : transacoes.length,
    page: 'page' in data ? data.page ?? 1 : 1,
    totalPages: 'totalPages' in data ? data.totalPages ?? 1 : 1,
  };
}

/**
 * Busca transações de uma banca específica
 */
async function getByBanca(bancaId: string, filters: Omit<TransacoesFilter, 'bancaId'> = {}): Promise<TransacoesResponse> {
  return getAll({ ...filters, bancaId });
}

/**
 * Busca uma transação por ID.
 * Backend não possui endpoint individual - manter assinatura por compatibilidade.
 */
function getById(_id: string): Promise<Transacao | null> {
  // Backend não possui rota GET /financeiro/:id
  // Para buscar uma transação específica, use getAll e filtre pelo ID
  void _id; // mantido apenas para compatibilidade com chamadas existentes
  console.warn('financeiroService.getById: Backend não possui endpoint individual. Use getAll com filtros.');
  return Promise.resolve(null);
}

/**
 * Busca resumo financeiro
 */
async function getResumo(bancaId?: string): Promise<ResumoFinanceiro> {
  const url = bancaId ? `/financeiro/saldo-geral?bancaId=${bancaId}` : '/financeiro/saldo-geral';
  const response = await apiClient.get<ApiFinancialSummary>(url);
  return mapResumoFromApi(response.data);
}

/**
 * Cria uma nova transação
 */
async function create(payload: CreateTransacaoPayload): Promise<Transacao> {
  const response = await apiClient.post<ApiFinancialTransaction>('/financeiro/transacao', payload);
  const newTransacao = mapTransacaoFromApi(response.data);
  
  // Invalidar cache e emitir evento
  invalidateCachePattern('/financeiro');
  invalidateCachePattern('/bancas');
  eventBus.emit('financeiro:updated', undefined);
  
  return newTransacao;
}

/**
 * Atualiza uma transação existente
 */
async function update(id: string, payload: UpdateTransacaoPayload): Promise<Transacao> {
  const response = await apiClient.put<ApiFinancialTransaction>(`/financeiro/transacao/${id}`, payload);
  const updatedTransacao = mapTransacaoFromApi(response.data);
  
  // Invalidar cache e emitir evento
  invalidateCachePattern('/financeiro');
  invalidateCachePattern('/bancas');
  eventBus.emit('financeiro:updated', undefined);
  
  return updatedTransacao;
}

/**
 * Exclui uma transação
 */
async function remove(id: string): Promise<void> {
  await apiClient.delete(`/financeiro/transacao/${id}`);
  
  // Invalidar cache e emitir evento
  invalidateCachePattern('/financeiro');
  invalidateCachePattern('/bancas');
  eventBus.emit('financeiro:updated', undefined);
}

/**
 * Exclui múltiplas transações
 */
async function removeMany(ids: string[]): Promise<void> {
  await Promise.all(ids.map(id => apiClient.delete(`/financeiro/transacao/${id}`)));
  
  // Invalidar cache e emitir evento
  invalidateCachePattern('/financeiro');
  invalidateCachePattern('/bancas');
  eventBus.emit('financeiro:updated', undefined);
}

/**
 * Cria um depósito
 */
async function criarDeposito(
  bancaId: string,
  casaDeAposta: string,
  valor: number,
  dataTransacao: string,
  observacao?: string
): Promise<Transacao> {
  return create({
    bancaId,
    tipo: 'Depósito',
    casaDeAposta,
    valor,
    dataTransacao,
    observacao,
  });
}

/**
 * Cria um saque
 */
async function criarSaque(
  bancaId: string,
  casaDeAposta: string,
  valor: number,
  dataTransacao: string,
  observacao?: string
): Promise<Transacao> {
  return create({
    bancaId,
    tipo: 'Saque',
    casaDeAposta,
    valor,
    dataTransacao,
    observacao,
  });
}

/**
 * Alias para getAll que retorna apenas o array de transações
 * (compatibilidade com código existente)
 */
async function getTransacoes(filters: TransacoesFilter = {}): Promise<Transacao[]> {
  const response = await getAll(filters);
  return response.transacoes;
}

/**
 * Alias para getResumo (compatibilidade com código existente)
 */
async function getSaldoGeral(filters?: { bancaId?: string }): Promise<ResumoFinanceiro> {
  return getResumo(filters?.bancaId);
}

// ============================================
// Export
// ============================================

export const financeiroService = {
  // CRUD
  getAll,
  getByBanca,
  getById,
  getResumo,
  create,
  update,
  remove,
  removeMany,
  
  // Aliases para compatibilidade
  getTransacoes,
  getSaldoGeral,
  createTransacao: create,
  updateTransacao: update,
  deleteTransacao: remove,
  
  // Ações especiais
  criarDeposito,
  criarSaque,
  
  // Mapeadores
  mapTransacaoFromApi,
  mapResumoFromApi,
};

export default financeiroService;
