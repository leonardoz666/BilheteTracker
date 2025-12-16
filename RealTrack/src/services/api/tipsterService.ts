/**
 * Serviço de Tipsters
 * 
 * Centraliza todas as operações de CRUD de tipsters
 */

import { apiClient, invalidateCachePattern } from './apiClient';
import type { ApiTipster } from '../../types/api';

// ============================================
// Tipos
// ============================================

export interface Tipster {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface CreateTipsterPayload {
  nome: string;
}

export interface UpdateTipsterPayload {
  nome?: string;
  ativo?: boolean;
}

// ============================================
// Funções de Mapeamento
// ============================================

/**
 * Mapeia dados da API para formato do frontend
 */
const mapTipsterFromApi = (item: ApiTipster): Tipster => ({
  id: item.id,
  nome: item.nome,
  ativo: item.ativo,
});

// ============================================
// API de Tipsters
// ============================================

/**
 * Busca todos os tipsters
 */
async function getAll(): Promise<Tipster[]> {
  const response = await apiClient.get<ApiTipster[]>('/tipsters');
  const data = response.data;
  
  if (!Array.isArray(data)) {
    return [];
  }
  
  return data.map(mapTipsterFromApi);
}

/**
 * Busca apenas tipsters ativos
 */
async function getAtivos(): Promise<Tipster[]> {
  const all = await getAll();
  return all.filter(tipster => tipster.ativo);
}

/**
 * Busca um tipster por ID
 */
async function getById(id: string): Promise<Tipster | null> {
  try {
    const response = await apiClient.get<ApiTipster>(`/tipsters/${id}`);
    return mapTipsterFromApi(response.data);
  } catch {
    return null;
  }
}

/**
 * Cria um novo tipster
 */
async function create(payload: CreateTipsterPayload): Promise<Tipster> {
  const response = await apiClient.post<ApiTipster>('/tipsters', {
    nome: payload.nome.trim(),
  });
  
  // Invalidar cache
  invalidateCachePattern('/tipsters');
  
  return mapTipsterFromApi(response.data);
}

/**
 * Atualiza um tipster existente
 */
async function update(id: string, payload: UpdateTipsterPayload): Promise<Tipster> {
  const response = await apiClient.put<ApiTipster>(`/tipsters/${id}`, payload);
  
  // Invalidar cache
  invalidateCachePattern('/tipsters');
  
  return mapTipsterFromApi(response.data);
}

/**
 * Exclui um tipster
 */
async function remove(id: string): Promise<void> {
  await apiClient.delete(`/tipsters/${id}`);
  
  // Invalidar cache
  invalidateCachePattern('/tipsters');
}

/**
 * Alterna status ativo de um tipster
 */
async function toggleAtivo(id: string, currentAtivo: boolean): Promise<Tipster> {
  return update(id, { ativo: !currentAtivo });
}

/**
 * Busca nomes de tipsters para autocomplete
 */
async function getNomes(): Promise<string[]> {
  const tipsters = await getAtivos();
  return tipsters.map(t => t.nome);
}

// ============================================
// Export
// ============================================

export const tipsterService = {
  // CRUD
  getAll,
  getAtivos,
  getById,
  create,
  update,
  remove,
  
  // Ações especiais
  toggleAtivo,
  getNomes,
  
  // Mapeadores
  mapTipsterFromApi,
};

export default tipsterService;
