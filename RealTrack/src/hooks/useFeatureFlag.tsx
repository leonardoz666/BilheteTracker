/**
 * Feature Flags Hook - Frontend
 * 
 * Hook React para usar feature flags no RealTrack
 * Busca flags do backend e cacheia localmente
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';

interface FeatureFlags {
  [key: string]: boolean;
}

interface FeatureFlagContextValue {
  flags: FeatureFlags;
  isLoading: boolean;
  isEnabled: (flagKey: string) => boolean;
  refresh: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

/**
 * Provider de Feature Flags
 * Coloque no topo da árvore de componentes (em App.tsx)
 */
export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlags = async () => {
    try {
      const response = await axios.get('/api/feature-flags/user', {
        withCredentials: true
      });
      setFlags(response.data);
      
      // Cachear no localStorage por 5 minutos
      localStorage.setItem('feature-flags', JSON.stringify(response.data));
      localStorage.setItem('feature-flags-timestamp', Date.now().toString());
    } catch (error) {
      console.error('Erro ao buscar feature flags:', error);
      
      // Usar cache se disponível
      const cached = localStorage.getItem('feature-flags');
      if (cached) {
        setFlags(JSON.parse(cached));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Verificar cache primeiro
    const cached = localStorage.getItem('feature-flags');
    const timestamp = localStorage.getItem('feature-flags-timestamp');
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      // Cache válido por 5 minutos
      if (age < 5 * 60 * 1000) {
        setFlags(JSON.parse(cached));
        setIsLoading(false);
        return;
      }
    }

    // Cache inválido ou inexistente, buscar do servidor
    fetchFlags();
  }, []);

  const isEnabled = (flagKey: string): boolean => {
    return flags[flagKey] ?? false;
  };

  const refresh = async () => {
    setIsLoading(true);
    await fetchFlags();
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, isLoading, isEnabled, refresh }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Hook para usar feature flags
 * 
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { isEnabled } = useFeatureFlag();
 *   
 *   if (isEnabled('new-chart-design')) {
 *     return <NewChart />;
 *   }
 *   return <OldChart />;
 * }
 * ```
 */
export function useFeatureFlag() {
  const context = useContext(FeatureFlagContext);
  
  if (!context) {
    throw new Error('useFeatureFlag deve ser usado dentro de FeatureFlagProvider');
  }
  
  return context;
}

/**
 * Componente condicional baseado em flag
 * 
 * @example
 * ```tsx
 * <FeatureFlag flag="new-dashboard">
 *   <NewDashboard />
 * </FeatureFlag>
 * 
 * // Com fallback
 * <FeatureFlag flag="new-dashboard" fallback={<OldDashboard />}>
 *   <NewDashboard />
 * </FeatureFlag>
 * ```
 */
export function FeatureFlag({
  flag,
  children,
  fallback = null
}: {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isEnabled } = useFeatureFlag();
  
  return isEnabled(flag) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hook simples para verificar uma flag específica
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const showNewFeature = useFlag('new-feature');
 *   
 *   return showNewFeature ? <NewFeature /> : null;
 * }
 * ```
 */
export function useFlag(flagKey: string): boolean {
  const { isEnabled } = useFeatureFlag();
  return isEnabled(flagKey);
}
