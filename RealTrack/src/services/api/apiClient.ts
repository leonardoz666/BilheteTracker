/**
 * Cliente HTTP centralizado com Axios
 * 
 * Features:
 * - Configuração base unificada
 * - Interceptors de request (auth token)
 * - Interceptors de response (erro, retry, rate limit)
 * - Cache em memória para GET requests
 * - Tipagem genérica para responses
 * - Deduplicação de requisições simultâneas
 */

import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type RawAxiosResponseHeaders,
} from 'axios';

// ============================================
// Tipos
// ============================================

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: RawAxiosResponseHeaders;
}

export interface ApiErrorData {
  error?: string | { path?: string[]; message?: string }[];
  message?: string;
  retryAfter?: number;
}

export interface CacheEntry {
  data: unknown;
  timestamp: number;
  headers?: Record<string, string>;
}

export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  cacheDuration?: number;
  maxCacheSize?: number;
}

// ============================================
// Configuração
// ============================================

const DEFAULT_BASE_URL = 'http://localhost:3001/api';
const envBaseUrl = typeof import.meta.env.VITE_API_URL === 'string' 
  ? import.meta.env.VITE_API_URL 
  : undefined;

const BASE_URL = (envBaseUrl && envBaseUrl.length > 0 ? envBaseUrl : DEFAULT_BASE_URL).replace(/\/$/, '');
const DEFAULT_TIMEOUT = 70000; // 70 segundos
const DEFAULT_MAX_CACHE_SIZE = 50;
const CACHE_DURATION = 60000; // 1 minuto (60 segundos)

// ============================================
// Estado Global
// ============================================

const cache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<unknown>>();

// Referência ao token getter (será injetada pelo authService)
let getAccessToken: (() => string | null) | null = null;
let clearTokens: (() => void) | null = null;

// ============================================
// Utilitários
// ============================================

/**
 * Gera chave única para cache baseada na URL completa montada pelo Axios
 */
const generateCacheKey = (config: InternalAxiosRequestConfig): string => {
  const method = config.method?.toUpperCase() ?? 'GET';
  const uri = axios.getUri({
    ...config,
    baseURL: undefined,
  });
  return `${method}:${uri}`;
};

/**
 * Verifica se endpoint deve usar cache
 */
const shouldUseCache = (url: string | undefined, method: string | undefined): boolean => {
  if (!url || method?.toUpperCase() !== 'GET') return false;
  
  // Endpoints que NÃO devem ser cacheados (dados muito dinâmicos)
  const noCacheEndpoints = [
    '/analise/dashboard',
    '/analise/performance',
    '/apostas/recentes',
    '/apostas/stream',
    '/bancas',  // Bancas mudam frequentemente (padrão, status, etc.)
    '/perfil',  // Perfil pode mudar
  ];
  
  return !noCacheEndpoints.some(endpoint => url.includes(endpoint));
};

/**
 * Obtém dados do cache verificando expiração
 */
const getCachedData = (key: string): CacheEntry | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  
  // Verifica se expirou
  if (Date.now() - entry.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return entry;
};

/**
 * Limpa entradas antigas do cache
 */
const pruneCache = (maxSize: number = DEFAULT_MAX_CACHE_SIZE): void => {
  if (cache.size > maxSize) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    cache.clear();
    entries.slice(0, maxSize).forEach(([key, value]) => cache.set(key, value));
  }
};

const toApiResponse = <T>(response: AxiosResponse<T>): ApiResponse<T> => ({
  data: response.data,
  status: response.status,
  headers: response.headers,
});

// ============================================
// Criação do Cliente
// ============================================

const createApiClient = (config: ApiClientConfig = {}): AxiosInstance => {
  const {
    baseURL = BASE_URL,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  const instance = axios.create({
    baseURL,
    timeout,
    withCredentials: true, // Sempre incluir credentials para httpOnly cookies
  });

  // ========================================
  // Request Interceptor
  // ========================================
  instance.interceptors.request.use((requestConfig: InternalAxiosRequestConfig) => {
    // Adicionar token de autorização se disponível
    const token = getAccessToken?.();
    
    if (token && token !== 'httpOnly-cookie') {
      if (requestConfig.headers instanceof AxiosHeaders) {
        requestConfig.headers.set('Authorization', `Bearer ${token}`);
      } else {
        const headers = AxiosHeaders.from(requestConfig.headers);
        headers.set('Authorization', `Bearer ${token}`);
        requestConfig.headers = headers;
      }
    }

    // Verificar cache antes de fazer a requisição
    if (shouldUseCache(requestConfig.url, requestConfig.method)) {
      const cacheKey = generateCacheKey(requestConfig);
      requestConfig.__cacheKey = cacheKey;
      
      // Verificar se existe no cache e não expirou
      const cachedEntry = getCachedData(cacheKey);
      if (cachedEntry) {
        // Retornar dados do cache evitando a requisição HTTP
        return Promise.reject({
          __fromCache: true,
          data: cachedEntry.data,
          headers: cachedEntry.headers,
          config: requestConfig,
        });
      }
    }

    return requestConfig;
  });

  // ========================================
  // Response Interceptor
  // ========================================
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      const config = response.config;
      const cacheKey = config.__cacheKey;
      
      // Salvar no cache se aplicável
      const headers = AxiosHeaders.from(config.headers);
      if (cacheKey && shouldUseCache(config.url, config.method) && !headers.get('x-no-cache')) {
        cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now(),
          headers: response.headers,
        });

        pruneCache();
      }

      return response;
    },
    async (error: AxiosError<ApiErrorData> | any) => {
      // Tratar resposta do cache (não é realmente um erro)
      if (error.__fromCache) {
        return Promise.resolve({
          data: error.data,
          status: 200,
          statusText: 'OK',
          headers: error.headers || {},
          config: error.config,
        } as AxiosResponse);
      }
      
      const axiosError = error as AxiosError<ApiErrorData>;
      const config = axiosError.config;
      const status = axiosError.response?.status;

      // Retry automático para erros 5xx (apenas uma vez)
      if (
        status !== undefined &&
        status >= 500 &&
        status < 600 &&
        config &&
        !config.__retryCount
      ) {
        config.__retryCount = 1;
        
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            instance.request(config)
              .then(resolve)
              .catch(reject);
          }, 1000); // Aguardar 1 segundo antes de retry
        });
      }

      // Tratar rate limiting (429)
      if (status === 429) {
        const data = axiosError.response?.data;
        const retryAfter = data?.retryAfter ?? 60;
        const message = data?.error ?? 'Muitas requisições. Aguarde alguns minutos.';
        
        console.warn(`Rate limit atingido. Aguarde ${retryAfter} segundos.`);
        
        if (typeof window !== 'undefined') {
          const sanitizedMessage = typeof message === 'string' 
            ? message.replace(/<[^>]*>/g, '') 
            : 'Muitas requisições';
          alert(`${sanitizedMessage}\n\nTente novamente em ${Math.ceil(retryAfter / 60)} minuto(s).`);
        }
      }

      // Tratar erro de autenticação (401)
      if (status === 401) {
        clearTokens?.();
        // Redirecionar para login se não estiver na página de login
        // EXCETO para páginas do Telegram WebApp que têm seu próprio fluxo de auth
        if (typeof window !== 'undefined' && 
            !window.location.pathname.includes('/login') &&
            !window.location.pathname.includes('/telegram/')) {
          window.location.href = '/login';
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// ============================================
// Instância Singleton
// ============================================

const apiClient = createApiClient();

// ============================================
// API Pública
// ============================================

/**
 * Configura funções de autenticação (chamado pelo authService)
 */
export const configureAuth = (
  tokenGetter: () => string | null,
  tokenClearer: () => void
): void => {
  getAccessToken = tokenGetter;
  clearTokens = tokenClearer;
};

/**
 * Invalida cache de um endpoint específico
 */
export const invalidateCache = (url: string, method: string = 'GET'): void => {
  const cacheKey = `${method.toUpperCase()}:${url}`;
  cache.delete(cacheKey);
  pendingRequests.delete(cacheKey);
};

/**
 * Invalida cache por padrão (todos que contêm a string)
 */
export const invalidateCachePattern = (pattern: string): void => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
  for (const key of pendingRequests.keys()) {
    if (key.includes(pattern)) {
      pendingRequests.delete(key);
    }
  }
};

/**
 * Limpa todo o cache
 */
export const clearCache = (): void => {
  cache.clear();
  pendingRequests.clear();
};

/**
 * Requisição GET tipada
 */
export async function get<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.get<T>(url, config);
  return toApiResponse(response);
}

/**
 * Requisição POST tipada
 */
export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.post<T>(url, data, config);
  return toApiResponse(response);
}

/**
 * Requisição PUT tipada
 */
export async function put<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.put<T>(url, data, config);
  return toApiResponse(response);
}

/**
 * Requisição PATCH tipada
 */
export async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.patch<T>(url, data, config);
  return toApiResponse(response);
}

/**
 * Requisição DELETE tipada
 */
export async function del<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.delete<T>(url, config);
  return toApiResponse(response);
}

// Exporta instância para casos que precisam do axios raw
export { apiClient };

// Export default para compatibilidade com código existente
export default apiClient;
