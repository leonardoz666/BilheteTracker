/**
 * Services API - Ponto de entrada centralizado
 * 
 * Exporta todos os serviços de API e tipos relacionados.
 * Use esta importação para acessar qualquer serviço de API.
 * 
 * @example
 * import { bancaService, apostaService, authService } from '@/services/api';
 * 
 * const bancas = await bancaService.getAll();
 * const apostas = await apostaService.getByBanca(bancaId);
 */

// ============================================
// API Client
// ============================================

export { 
  apiClient as default,
  apiClient,
  get,
  post,
  put,
  patch,
  del,
  invalidateCache,
  invalidateCachePattern,
  clearCache,
  configureAuth,
  type ApiResponse,
  type ApiErrorData,
} from './apiClient';

// ============================================
// Auth Service
// ============================================

export { 
  authService,
  type AuthTokens,
  type LoginResponse,
  type RegisterResponse,
  type TelegramAuthResponse,
  type JWTPayload,
} from './authService';

// ============================================
// Banca Service
// ============================================

export {
  bancaService,
  type Banca,
  type BancaApi,
  type BancaStats,
  type CreateBancaPayload,
  type UpdateBancaPayload,
  type SidebarBanca,
} from './bancaService';

// ============================================
// Aposta Service
// ============================================

export {
  apostaService,
  type Aposta,
  type ApostaStatus,
  type CreateApostaPayload,
  type UpdateApostaPayload,
  type ApostasFilter,
  type ApostasResponse,
  type ApostasSummary,
} from './apostaService';

// ============================================
// Financeiro Service
// ============================================

export {
  financeiroService,
  type Transacao,
  type TipoTransacao,
  type CreateTransacaoPayload,
  type UpdateTransacaoPayload,
  type TransacoesFilter,
  type TransacoesResponse,
  type ResumoFinanceiro,
} from './financeiroService';

// ============================================
// Perfil Service
// ============================================

export {
  perfilService,
  type Perfil,
  type Plano,
  type ConsumoPlano,
  type UpdatePerfilPayload,
  type ChangePasswordPayload,
  type TelegramInfo,
  type RedeemPromoResult,
} from './perfilService';

// ============================================
// Analise Service
// ============================================

export {
  analiseService,
  type AnaliseQueryParams,
  type RoiEntry,
  type OddDistribution,
  type BookmakerComparison,
  type WinRatePorEsporte,
  type HeatmapCell,
  type HeatmapRow,
  type HeatmapData,
  type PerformanceData,
  type DerivedStats,
  type AnaliseCompleta,
} from './analiseService';

// ============================================
// Tipster Service
// ============================================

export {
  tipsterService,
  type Tipster,
  type CreateTipsterPayload,
  type UpdateTipsterPayload,
} from './tipsterService';

// ============================================
// Telegram Service
// ============================================

export {
  telegramService,
  type TelegramUpdateResponse,
} from './telegramService';