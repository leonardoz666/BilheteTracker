/**
 * Serviço de Perfil
 * 
 * Centraliza todas as operações relacionadas ao perfil do usuário
 */

import { apiClient, invalidateCachePattern } from './apiClient';
import { eventBus } from '../../utils/eventBus';
import type { ApiProfileResponse, ApiPlanConsumption } from '../../types/api';

// ============================================
// Tipos
// ============================================

export interface Plano {
  id: string;
  nome: string;
  preco: number;
  limiteApostasDiarias: number;
}

export interface Perfil {
  id: string;
  nomeCompleto: string;
  email: string;
  membroDesde: string;
  statusConta: string;
  updatedAt: string;
  telegramId?: string | null;
  telegramUsername?: string | null;
  fotoPerfil?: string | null;
  promoExpiresAt?: string | null;
  plano: Plano;
}

export interface ConsumoPlano {
  plano: {
    nome: string;
    limiteDiario: number;
  };
  consumo: {
    apostasHoje: number;
    limite: number;
    porcentagem: number;
    proximoReset: string | null;
  };
}

export interface UpdatePerfilPayload {
  nomeCompleto?: string;
  email?: string;
  telegramUsername?: string;
  fotoPerfil?: string;
}

export interface ChangePasswordPayload {
  senhaAtual: string;
  novaSenha: string;
  confirmarSenha: string;
}

export interface TelegramInfo {
  isConnected: boolean;
  username?: string;
  telegramId?: string;
}

// ============================================
// Funções de Mapeamento
// ============================================

/**
 * Mapeia dados do perfil da API
 */
const mapPerfilFromApi = (data: ApiProfileResponse): Perfil => ({
  id: data.id,
  nomeCompleto: data.nomeCompleto,
  email: data.email,
  membroDesde: data.membroDesde,
  statusConta: data.statusConta,
  updatedAt: data.updatedAt,
  telegramId: data.telegramId,
  telegramUsername: data.telegramUsername,
  fotoPerfil: data.fotoPerfil,
  promoExpiresAt: data.promoExpiresAt,
  plano: {
    id: data.plano.id,
    nome: data.plano.nome,
    preco: data.plano.preco,
    limiteApostasDiarias: data.plano.limiteApostasDiarias,
  },
});

/**
 * Mapeia dados de consumo do plano
 */
const mapConsumoFromApi = (data: ApiPlanConsumption): ConsumoPlano => ({
  plano: {
    nome: data.plano.nome,
    limiteDiario: data.plano.limiteDiario,
  },
  consumo: {
    apostasHoje: data.consumo.apostasHoje,
    limite: data.consumo.limite,
    porcentagem: data.consumo.porcentagem,
    proximoReset: data.consumo.proximoReset,
  },
});

// ============================================
// API de Perfil
// ============================================

/**
 * Busca o perfil do usuário autenticado
 */
async function get(): Promise<Perfil> {
  const response = await apiClient.get<ApiProfileResponse>('/perfil');
  return mapPerfilFromApi(response.data);
}

/**
 * Atualiza o perfil do usuário
 */
async function update(payload: UpdatePerfilPayload): Promise<Perfil> {
  // Se houver fotoPerfil como File, faz upload antes
  if (payload.fotoPerfil && typeof payload.fotoPerfil !== 'string') {
    const formData = new FormData();
    formData.append('foto', payload.fotoPerfil);
    const uploadRes = await apiClient.post<{ url: string }>('/upload/perfil', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    payload.fotoPerfil = uploadRes.data.url;
  }
  const response = await apiClient.put<ApiProfileResponse>('/perfil', payload);
  const updatedPerfil = mapPerfilFromApi(response.data);
  // Invalidar cache e emitir evento
  invalidateCachePattern('/perfil');
  eventBus.emitProfileUpdated({
    id: updatedPerfil.id,
    nomeCompleto: updatedPerfil.nomeCompleto,
    email: updatedPerfil.email,
  });
  return updatedPerfil;
}

/**
 * Altera a senha do usuário
 */
async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await apiClient.put('/perfil/senha', payload);
}

/**
 * Busca consumo do plano
 */
async function getConsumo(): Promise<ConsumoPlano> {
  const response = await apiClient.get<ApiPlanConsumption>('/perfil/consumo');
  return mapConsumoFromApi(response.data);
}

/**
 * Busca informações do Telegram
 */
async function getTelegramInfo(): Promise<TelegramInfo> {
  try {
    const perfil = await get();
    return {
      isConnected: !!perfil.telegramId,
      username: perfil.telegramUsername ?? undefined,
      telegramId: perfil.telegramId ?? undefined,
    };
  } catch {
    return {
      isConnected: false,
    };
  }
}

/**
 * Desconecta o Telegram
 */
async function disconnectTelegram(): Promise<void> {
  await apiClient.delete('/perfil/telegram');

  // Invalidar cache e emitir evento
  invalidateCachePattern('/perfil');
  eventBus.emitProfileUpdated();
}

/**
 * Verifica se email está disponível
 */
async function checkEmailAvailable(email: string): Promise<boolean> {
  try {
    const response = await apiClient.get<{ available: boolean }>(`/auth/check-email?email=${encodeURIComponent(email)}`);
    return response.data.available;
  } catch {
    return false;
  }
}

/**
 * Solicita exclusão da conta
 */
async function requestAccountDeletion(): Promise<void> {
  await apiClient.delete('/perfil/account');
}

/**
 * Reseta a conta do usuário (remove bancas, apostas e transações)
 */
interface ResetAccountResponse {
  deleted: {
    bancas: number;
    apostas: number;
    transacoes: number;
  };
}

async function resetAccount(): Promise<ResetAccountResponse> {
  const response = await apiClient.delete<ResetAccountResponse>('/perfil/reset');

  // Invalidar cache
  invalidateCachePattern('/perfil');
  invalidateCachePattern('/bancas');
  invalidateCachePattern('/apostas');
  invalidateCachePattern('/financeiro');

  return response.data;
}

/**
 * Atualiza informações do Telegram
 */
async function updateTelegram(telegramId: string | null): Promise<ApiProfileResponse> {
  const response = await apiClient.put<ApiProfileResponse>('/perfil/telegram', { telegramId });

  // Invalidar cache e emitir evento
  invalidateCachePattern('/perfil');
  eventBus.emitProfileUpdated();

  return response.data;
}

interface RedeemPromoCodeResponse {
  message: string;
  expiresAt: string;
  remainingUses: number;
  profile: ApiProfileResponse;
}

export interface RedeemPromoResult {
  message: string;
  expiresAt: string;
  remainingUses: number;
  profile: Perfil;
}

async function redeemPromoCode(code: string): Promise<RedeemPromoResult> {
  const response = await apiClient.post<RedeemPromoCodeResponse>('/perfil/promo-code', { code });
  const mappedProfile = mapPerfilFromApi(response.data.profile);

  invalidateCachePattern('/perfil');
  eventBus.emitProfileUpdated({
    id: mappedProfile.id,
    nomeCompleto: mappedProfile.nomeCompleto,
    email: mappedProfile.email,
  });

  return {
    message: response.data.message,
    expiresAt: response.data.expiresAt,
    remainingUses: response.data.remainingUses,
    profile: mappedProfile,
  };
}

// ============================================
// Export
// ============================================

export const perfilService = {
  // CRUD
  get,
  update,
  changePassword,

  // Aliases para compatibilidade
  getProfile: get,
  updateProfile: update,

  // Consumo e plano
  getConsumo,

  // Telegram
  getTelegramInfo,
  disconnectTelegram,
  updateTelegram,
  redeemPromoCode,

  // Reset e exclusão
  resetAccount,
  checkEmailAvailable,
  requestAccountDeletion,

  // Mapeadores
  mapPerfilFromApi,
  mapConsumoFromApi,
};

export default perfilService;
