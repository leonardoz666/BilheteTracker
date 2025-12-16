/**
 * Serviço de Autenticação
 * 
 * Centraliza toda lógica de autenticação:
 * - Login/Logout
 * - Gestão de tokens (localStorage)
 * - Validação de JWT
 * - Integração com apiClient
 */

import { apiClient, configureAuth } from './apiClient';

// ============================================
// Tipos
// ============================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

export interface RegisterResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface TelegramAuthResponse {
  token?: string;
  error?: string;
}

export interface JWTPayload {
  exp: number;
  iat: number;
  userId?: string;
  email?: string;
  [key: string]: unknown;
}

const isJwtPayload = (value: unknown): value is JWTPayload => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as { exp?: unknown };
  return typeof candidate.exp === 'number';
};

// ============================================
// Constantes
// ============================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'at',
  REFRESH_TOKEN: 'rt',
  EXPIRES_AT: 'exp',
} as const;

const API_URL = typeof import.meta.env.VITE_API_URL === 'string' 
  ? import.meta.env.VITE_API_URL 
  : 'http://localhost:3001/api';

// ============================================
// Funções de Token
// ============================================

/**
 * Salva tokens no localStorage
 */
const setTokens = (tokens: AuthTokens): void => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, tokens.expiresAt.toString());
};

/**
 * Obtém token de acesso atual
 */
const getAccessToken = (): string | null => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (!token) return null;

  // Verificar expiração pelo timestamp salvo
  const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
  if (expiresAt && parseInt(expiresAt, 10) < Date.now()) {
    clearTokens();
    return null;
  }

  return token;
};

/**
 * Obtém refresh token
 */
const getRefreshToken = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
};

/**
 * Limpa todos os tokens
 */
const clearTokens = (): void => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);

  // Chamar logout do backend para limpar cookies httpOnly (se houver)
  fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {
    // Ignorar erros silenciosamente
  });
};

/**
 * Indica se há um token válido no localStorage
 */
const isAuthenticated = (): boolean => {
  return getAccessToken() !== null;
};

/**
 * Parse seguro do payload JWT
 */
const parseJWT = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const decodedPayload: unknown = JSON.parse(atob(parts[1]));
    if (!isJwtPayload(decodedPayload)) {
      return null;
    }

    return decodedPayload;
  } catch {
    return null;
  }
};

/**
 * Verifica se o token está válido
 */
const isTokenValid = (): boolean => {
  const token = getAccessToken();
  if (!token) return false;

  const payload = parseJWT(token);
  if (!payload) return false;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
};

/**
 * Obtém dados do usuário do token
 */
const getTokenPayload = (): JWTPayload | null => {
  const token = getAccessToken();
  if (!token) return null;
  return parseJWT(token);
};

// ============================================
// API de Autenticação
// ============================================

/**
 * Realiza login
 */
const login = async (email: string, senha: string): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', { email, senha });
  const data = response.data;

  if (data.success && data.token && data.refreshToken && data.expiresAt) {
    setTokens({
      accessToken: data.token,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    });
  }

  return data;
};

/**
 * Realiza registro de novo usuário
 */
const register = async (nomeCompleto: string, email: string, senha: string): Promise<RegisterResponse> => {
  const response = await apiClient.post<RegisterResponse>('/auth/register', {
    nomeCompleto,
    email,
    senha,
  });
  return response.data;
};

/**
 * Autentica via Telegram WebApp
 */
const telegramAuth = async (initData: string): Promise<TelegramAuthResponse> => {
  const response = await apiClient.post<TelegramAuthResponse>('/auth/telegram', {
    initData,
  });
  
  const data = response.data;
  // Se recebeu token, salvar os tokens automaticamente
  if (typeof data.token === 'string') {
    setTokens({
      accessToken: data.token,
      refreshToken: data.token, // Telegram usa o mesmo token para ambos
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // Validade de 24h
    });
  }
  
  return data;
};

/**
 * Realiza logout
 */
const logout = (): void => {
  clearTokens();
};

/**
 * Tenta refresh do token
 */
const refreshAccessToken = async (): Promise<boolean> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await apiClient.post<LoginResponse>('/auth/refresh', {
      refreshToken,
    });

    const data = response.data;
    if (data.success && data.token && data.refreshToken && data.expiresAt) {
      setTokens({
        accessToken: data.token,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      });
      return true;
    }

    return false;
  } catch {
    clearTokens();
    return false;
  }
};

// ============================================
// Inicialização
// ============================================

// Configurar apiClient com funções de autenticação
configureAuth(getAccessToken, clearTokens);

// ============================================
// Exports
// ============================================

export const authService = {
  // Gestão de tokens
  setTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  isAuthenticated,
  isTokenValid,
  getTokenPayload,
  parseJWT,
  
  // API
  login,
  register,
  telegramAuth,
  logout,
  refreshAccessToken,
};

// Re-exportar tipos de AuthTokens para uso em hooks
export type { AuthTokens as AuthTokensType };

export default authService;
