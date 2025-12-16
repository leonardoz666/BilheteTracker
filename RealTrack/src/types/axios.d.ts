import 'axios';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    __cacheKey?: string;
    __retryCount?: number;
  }
}
