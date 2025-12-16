/**
 * Sistema de autenticação com httpOnly cookies
 * Não usa localStorage para maior segurança
 */

import { useState, useEffect } from 'react';

interface AuthChangeEvent {
  isAuthenticated: boolean;
}

type AuthListener = (event: AuthChangeEvent) => void;

const DEFAULT_API_URL = 'http://localhost:3001/api';

const authListeners = new Set<AuthListener>();

const notifyAuthListeners = (isAuthenticated: boolean): void => {
  authListeners.forEach((listener) => {
    try {
      listener({ isAuthenticated });
    } catch (error) {
      console.error('Auth listener error:', error);
    }
  });
};

const subscribeToAuthChanges = (listener: AuthListener): (() => void) => {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
};

const resolveApiBaseUrl = (): string => {
  const envUrl = typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : undefined;
  return (envUrl && envUrl.length > 0 ? envUrl : DEFAULT_API_URL).replace(/\/$/, '');
};

/**
 * Verifica autenticação via endpoint do backend
 * Backend valida o httpOnly cookie automaticamente
 */
const checkAuth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${resolveApiBaseUrl()}/auth/me`, {
      method: 'GET',
      credentials: 'include', // Envia httpOnly cookies
    });
    return response.ok;
  } catch {
    return false;
  }
};

const logout = async (): Promise<void> => {
  try {
    await fetch(`${resolveApiBaseUrl()}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    notifyAuthListeners(false);
  }
};

/**
 * Gerencia autenticação usando httpOnly cookies.
 * Tokens são gerenciados automaticamente pelo navegador.
 */
export const AuthManager = {
  checkAuth,
  logout,
  subscribe: subscribeToAuthChanges,
} as const;

/**
 * Hook para gerenciar autenticação em componentes React
 * Usa httpOnly cookies - tokens gerenciados automaticamente
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const authenticated = await AuthManager.checkAuth();
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    };

    verifyAuth();
  }, []);

  useEffect(() => {
    const unsubscribe = AuthManager.subscribe(({ isAuthenticated }) => {
      setIsAuthenticated(isAuthenticated);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await AuthManager.logout();
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    isLoading,
    logout: handleLogout,
  };
}
