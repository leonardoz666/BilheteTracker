import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { AuthManager } from './auth';
import { useToast } from '../contexts/ToastContext';

const DEFAULT_BASE_URL = 'http://localhost:3001/api';
const envBaseUrl = typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : undefined;
const baseURL = (envBaseUrl && envBaseUrl.length > 0 ? envBaseUrl : DEFAULT_BASE_URL).replace(/\/$/, '');

// Cache em memória para requisições GET
interface CacheEntry {
  data: unknown;
  timestamp: number;
  headers?: Record<string, string>;
}

const cache = new Map<string, CacheEntry>();

// Deduplicação de requisições simultâneas
const pendingRequests = new Map<string, Promise<unknown>>();

// Função para gerar chave de cache baseada na URL e parâmetros
const getCacheKey = (config: InternalAxiosRequestConfig): string => {
  let params = '';
  const rawParams: unknown = config.params;

  if (rawParams instanceof URLSearchParams) {
    params = rawParams.toString();
  } else if (typeof rawParams === 'string') {
    params = rawParams;
  } else if (rawParams && typeof rawParams === 'object' && !Array.isArray(rawParams)) {
    const record: Record<string, string> = {};
    const entries = Object.entries(rawParams as Record<string, unknown>);
    for (const [key, value] of entries) {
      record[key] = String(value);
    }
    params = new URLSearchParams(record).toString();
  }

  return `${config.method?.toUpperCase()}:${config.url}${params ? `?${params}` : ''}`;
};

// Função para verificar se endpoint deve usar cache
const shouldCache = (url: string | undefined, method: string | undefined): boolean => {
  if (!url || method?.toUpperCase() !== 'GET') return false;
  // Endpoints que não devem ser cacheados (dados dinâmicos)
  const noCacheEndpoints = ['/analise/dashboard', '/analise/performance', '/apostas/recentes'];
  return !noCacheEndpoints.some(endpoint => url.includes(endpoint));
};

const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 70000, // 70 segundos de timeout para uploads/análises mais demorados
});

api.interceptors.request.use((config) => {
  // Usar apenas httpOnly cookies para autenticação
  // Navegador envia cookies automaticamente com withCredentials: true
  config.withCredentials = true;

  // Marcar cache key no config para uso posterior
  if (shouldCache(config.url, config.method)) {
    const cacheKey = getCacheKey(config);
    (config as InternalAxiosRequestConfig & { __cacheKey?: string }).__cacheKey = cacheKey;
  }

  return config;
});


// Função para invalidar cache de um endpoint específico (útil após POST/PUT/DELETE)
export const invalidateCache = (url: string, method: string = 'GET') => {
  const cacheKey = `${method.toUpperCase()}:${url}`;
  cache.delete(cacheKey);
  pendingRequests.delete(cacheKey);
};

// Função para limpar todo o cache
export const clearCache = () => {
  cache.clear();
  pendingRequests.clear();
};

// Nota: Cache e deduplicação são implementados através de interceptors
// O cache salva dados após cada resposta GET bem-sucedida
// A deduplicação pode ser implementada em hooks específicos (useTipsters, useBancas já têm)

// Interceptor de resposta para salvar cache, tratar rate limiting, erros e refresh token
api.interceptors.response.use(
  (response) => {
    const config = response.config;
    const cacheKey = (config as InternalAxiosRequestConfig & { __cacheKey?: string }).__cacheKey;
    
    // Salvar no cache se for GET e não tiver sido marcado para não cachear
    const headers = config.headers as Record<string, string> | undefined;
    if (cacheKey && shouldCache(config.url, config.method) && !headers?.['x-no-cache']) {
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
        headers: response.headers as Record<string, string>,
      });

      // Limpar cache antigo (manter apenas últimos 50 itens)
      if (cache.size > 50) {
        const entries = Array.from(cache.entries());
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        cache.clear();
        entries.slice(0, 50).forEach(([key, value]) => cache.set(key, value));
      }
    }

    return response;
  },
  async (error: AxiosError<{ retryAfter?: number; error?: string }>) => {
    if (!(error instanceof Error)) {
      return Promise.reject(new Error('Unknown error occurred'));
    }
    const config = error.config;

    // Retry automático para erros 5xx (apenas uma vez)
    if (
      error.response?.status !== undefined &&
      error.response.status >= 500 &&
      error.response.status < 600 &&
      config &&
      !(config as InternalAxiosRequestConfig & { __retryCount?: number }).__retryCount
    ) {
      (config as InternalAxiosRequestConfig & { __retryCount?: number }).__retryCount = 1;
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          api.request(config)
            .then(resolve)
            .catch(reject);
        }, 1000); // Aguardar 1 segundo antes de tentar novamente
      });
    }

    // Tratar rate limiting
    if (error.response?.status === 429) {
      const data = error.response.data as { retryAfter?: number; error?: string } | undefined;
      const retryAfter = data?.retryAfter ?? 60;
      const message = data?.error ?? 'Muitas requisições. Aguarde alguns minutos.';
      
      console.warn(`Rate limit atingido. Aguarde ${retryAfter} segundos.`);
      
      // Mostrar notificação ao usuário (se houver sistema de notificações)
      if (typeof window !== 'undefined') {
        // Sanitizar mensagem para prevenir XSS
        const sanitizedMessage = message.replace(/<[^>]*>/g, '');
        alert(`${sanitizedMessage}\n\nTente novamente em ${Math.ceil(retryAfter / 60)} minuto(s).`);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

