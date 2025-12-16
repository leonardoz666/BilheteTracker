/**
 * Feature Flag Service
 * 
 * Sistema simples e gratuito de feature flags usando PostgreSQL
 * Permite:
 * - Ligar/desligar features sem deploy
 * - Rollout gradual (ex: 20% dos usuários)
 * - Whitelist de usuários específicos
 * - Zero custo (usa banco próprio)
 */

import { prisma } from '../lib/prisma.js';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout: number; // 0-100
  userIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Prisma typing helper to ensure FeatureFlag delegate is available even when tooling caches lag
// Cast to any to make the featureFlag delegate accessible even if tooling lags behind generated types
const featureFlagClient = prisma as any;

export class FeatureFlagService {
  /**
   * Verifica se uma feature está habilitada para um usuário
   */
  async isEnabled(flagKey: string, userId?: string): Promise<boolean> {
    const flag = await featureFlagClient.featureFlag.findUnique({
      where: { key: flagKey }
    });

    // Flag não existe = desabilitada
    if (!flag) {
      return false;
    }

    // Flag globalmente desabilitada
    if (!flag.enabled) {
      return false;
    }

    // Usuário específico na whitelist
    if (userId && flag.userIds.includes(userId)) {
      return true;
    }

    // Rollout 100% = todos têm acesso
    if (flag.rollout === 100) {
      return true;
    }

    // Rollout 0% = ninguém tem acesso
    if (flag.rollout === 0) {
      return false;
    }

    // Rollout percentual (consistente por userId)
    if (userId) {
      return this.isUserInRollout(userId, flag.rollout);
    }

    // Sem userId = assume desabilitado (por segurança)
    return false;
  }

  /**
   * Determina se usuário está no percentual de rollout
   * Usa hash do userId para distribuição consistente
   */
  private isUserInRollout(userId: string, rolloutPercentage: number): boolean {
    // Hash simples do userId para número entre 0-99
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    const bucket = Math.abs(hash) % 100;
    
    return bucket < rolloutPercentage;
  }

  /**
   * Cria nova feature flag
   */
  async createFlag(data: {
    key: string;
    name: string;
    description?: string;
    enabled?: boolean;
    rollout?: number;
  }): Promise<FeatureFlag> {
    return featureFlagClient.featureFlag.create({
      data: {
        key: data.key,
        name: data.name,
        description: data.description,
        enabled: data.enabled ?? false,
        rollout: data.rollout ?? 100,
        userIds: []
      }
    });
  }

  /**
   * Atualiza feature flag
   */
  async updateFlag(
    flagKey: string,
    data: {
      name?: string;
      description?: string;
      enabled?: boolean;
      rollout?: number;
      userIds?: string[];
    }
  ): Promise<FeatureFlag> {
    return featureFlagClient.featureFlag.update({
      where: { key: flagKey },
      data
    });
  }

  /**
   * Liga uma flag (100% dos usuários)
   */
  async enableFlag(flagKey: string): Promise<FeatureFlag> {
    return this.updateFlag(flagKey, { enabled: true, rollout: 100 });
  }

  /**
   * Desliga uma flag
   */
  async disableFlag(flagKey: string): Promise<FeatureFlag> {
    return this.updateFlag(flagKey, { enabled: false });
  }

  /**
   * Define rollout percentual (ex: 25 = 25% dos usuários)
   */
  async setRollout(flagKey: string, percentage: number): Promise<FeatureFlag> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout deve estar entre 0 e 100');
    }
    return this.updateFlag(flagKey, { enabled: true, rollout: percentage });
  }

  /**
   * Adiciona usuário à whitelist
   */
  async addUserToWhitelist(flagKey: string, userId: string): Promise<FeatureFlag> {
    const flag = await featureFlagClient.featureFlag.findUnique({
      where: { key: flagKey }
    });

    if (!flag) {
      throw new Error(`Flag ${flagKey} não encontrada`);
    }

    const userIds = [...new Set([...flag.userIds, userId])]; // Remove duplicatas

    return this.updateFlag(flagKey, { userIds });
  }

  /**
   * Remove usuário da whitelist
   */
  async removeUserFromWhitelist(flagKey: string, userId: string): Promise<FeatureFlag> {
    const flag = await featureFlagClient.featureFlag.findUnique({
      where: { key: flagKey }
    });

    if (!flag) {
      throw new Error(`Flag ${flagKey} não encontrada`);
    }

    const userIds = flag.userIds.filter((id: string) => id !== userId);

    return this.updateFlag(flagKey, { userIds });
  }

  /**
   * Lista todas as flags
   */
  async listFlags(): Promise<FeatureFlag[]> {
    return featureFlagClient.featureFlag.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Busca flag por key
   */
  async getFlag(flagKey: string): Promise<FeatureFlag | null> {
    return featureFlagClient.featureFlag.findUnique({
      where: { key: flagKey }
    });
  }

  /**
   * Deleta flag
   */
  async deleteFlag(flagKey: string): Promise<void> {
    await featureFlagClient.featureFlag.delete({
      where: { key: flagKey }
    });
  }

  /**
   * Retorna status de múltiplas flags para um usuário
   * Útil para enviar todas as flags de uma vez ao frontend
   */
  async getUserFlags(userId: string): Promise<Record<string, boolean>> {
    const flags = await this.listFlags();
    const result: Record<string, boolean> = {};

    for (const flag of flags) {
      result[flag.key] = await this.isEnabled(flag.key, userId);
    }

    return result;
  }

  /**
   * Cria flags padrão do sistema (rodar no init)
   */
  async seedDefaultFlags(): Promise<void> {
    const defaults = [
      {
        key: 'new-chart-design',
        name: 'Novo Design de Gráficos',
        description: 'Layout redesenhado dos gráficos de análise',
        enabled: false,
        rollout: 0
      },
      {
        key: 'telegram-notifications',
        name: 'Notificações Telegram',
        description: 'Alertas de apostas via Telegram',
        enabled: true,
        rollout: 100
      },
      {
        key: 'advanced-filters',
        name: 'Filtros Avançados',
        description: 'Filtros adicionais na listagem de apostas',
        enabled: false,
        rollout: 50
      },
      {
        key: 'ai-tips',
        name: 'Dicas com IA',
        description: 'Sugestões de apostas geradas por IA',
        enabled: false,
        rollout: 10
      }
    ];

    for (const flag of defaults) {
      const existing = await this.getFlag(flag.key);
      if (!existing) {
        await this.createFlag(flag);
      }
    }
  }
}
