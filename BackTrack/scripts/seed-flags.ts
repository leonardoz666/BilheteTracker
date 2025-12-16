/**
 * Script para criar feature flags padrão
 * 
 * Uso:
 *   npm run seed:flags
 *   ou
 *   tsx scripts/seed-flags.ts
 */

import { prisma } from '../src/lib/prisma';
import { log } from '../src/utils/logger';

async function seedDefaultFlags() {
  try {
    log.info('🚩 Iniciando seed de feature flags...');

    const client = prisma as any;

    // Flags padrão do sistema
    const defaultFlags: Array<{
      key: string;
      name: string;
      description: string;
      enabled: boolean;
      rollout: number;
    }> = [
      {
        key: 'new-chart-design',
        name: 'Novo Design de Gráficos',
        description: 'Interface modernizada para gráficos de análise de apostas',
        enabled: true,
        rollout: 10 // 10% dos usuários
      },
      {
        key: 'telegram-notifications',
        name: 'Notificações Telegram',
        description: 'Sistema de alertas e notificações via Telegram',
        enabled: true,
        rollout: 100 // 100% dos usuários
      },
      {
        key: 'advanced-filters',
        name: 'Filtros Avançados',
        description: 'Filtros avançados para busca de apostas',
        enabled: true,
        rollout: 50 // 50% dos usuários
      },
      {
        key: 'ai-tips',
        name: 'Dicas com IA',
        description: 'Sugestões de apostas geradas por IA (Groq)',
        enabled: false,
        rollout: 0 // Desabilitado por padrão
      },
      {
        key: 'dark-mode',
        name: 'Modo Escuro',
        description: 'Tema escuro para a interface',
        enabled: false,
        rollout: 0
      },
      {
        key: 'mobile-app',
        name: 'Aplicativo Mobile',
        description: 'Versão mobile nativa do aplicativo',
        enabled: false,
        rollout: 0
      }
    ];

    // Processar cada flag
    for (const flagData of defaultFlags) {
      const existing = await client.featureFlag.findUnique({
        where: { key: flagData.key }
      });

      if (existing) {
        log.info(`  ↳ Flag '${flagData.key}' já existe`);
      } else {
        const created = await client.featureFlag.create({
          data: {
            ...flagData,
            userIds: []
          }
        });
        
        log.info(`  ✅ Flag '${created.key}' criada com sucesso`);
      }
    }

    log.info('✅ Seed de feature flags concluído!');
    
    // Listar todas as flags criadas
    const allFlags = await client.featureFlag.findMany();
    log.info(`📊 Total de ${allFlags.length} flags no sistema`);
    
    allFlags.forEach((flag: any) => {
      log.info(`   - ${flag.key}: ${flag.enabled ? '🟢' : '🔴'} (rollout: ${flag.rollout}%)`);
    });

  } catch (error) {
    log.error(error, '❌ Erro ao fazer seed de feature flags');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDefaultFlags().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { seedDefaultFlags };
