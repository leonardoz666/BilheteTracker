import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { perfilService } from '../services/api';
import { AuthManager } from '../lib/auth';
import { eventBus } from '../utils/eventBus';

export interface Perfil {
  id: string;
  nomeCompleto: string;
  email: string;
  membroDesde: string;
  statusConta: string;
  updatedAt: string;
  telegramId?: string;
  telegramUsername?: string;
  plano: {
    id: string;
    nome: string;
    preco: number;
    limiteApostasDiarias: number;
  };
  fotoPerfil?: string | null;
}

interface PerfilContextType {
  perfil: Perfil | null;
  loading: boolean;
  erro: string | null;
  atualizarPerfil: () => Promise<void>;
}

const PerfilContext = createContext<PerfilContextType | undefined>(undefined);

export const usePerfil = () => {
  const ctx = useContext(PerfilContext);
  if (!ctx) throw new Error('usePerfil deve ser usado dentro do PerfilProvider');
  return ctx;
};

export const PerfilProvider = ({ children }: { children: ReactNode }) => {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Memoizar função para evitar re-criação e re-renders desnecessários
  const atualizarPerfil = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const data = await perfilService.get();
      setPerfil(data);
    } catch (err: unknown) {
      // Não mostrar erro se for 401 (não autenticado) - isso é normal em algumas páginas
      const apiError = err as { response?: { status?: number } };
      if (apiError.response?.status !== 401) {
        setErro('Erro ao carregar perfil');
        console.warn('Erro ao carregar perfil:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Só carregar perfil se estiver autenticado e não estiver em /telegram/*
    const checkAndLoadPerfil = async () => {
      const isAuthenticated = await AuthManager.checkAuth();
      if (isAuthenticated && !window.location.pathname.startsWith('/telegram/')) {
        void atualizarPerfil();
      } else {
        setLoading(false);
      }
    };
    void checkAndLoadPerfil();
  }, [atualizarPerfil]);

  useEffect(() => {
    const unsubscribe = AuthManager.subscribe(({ isAuthenticated }) => {
      if (isAuthenticated && !window.location.pathname.startsWith('/telegram/')) {
        void atualizarPerfil();
        return;
      }

      setPerfil(null);
      setLoading(false);
    });

    return unsubscribe;
  }, [atualizarPerfil]);

  useEffect(() => {
    const unsubscribe = eventBus.on('profile:updated', () => {
      void atualizarPerfil();
    });

    return unsubscribe;
  }, [atualizarPerfil]);

  // Memoizar valor do contexto para evitar re-renders quando valores não mudam
  const contextValue = useMemo(
    () => ({ perfil, loading, erro, atualizarPerfil }),
    [perfil, loading, erro, atualizarPerfil]
  );

  return (
    <PerfilContext.Provider value={contextValue}>
      {children}
    </PerfilContext.Provider>
  );
};
