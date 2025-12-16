import type { Prisma } from '@prisma/client';

declare module '@prisma/client' {
  namespace Prisma {
    interface FeatureFlagDelegate<TArgs = unknown> {
      findUnique(args: unknown): Promise<FeatureFlag | null>;
      create(args: unknown): Promise<FeatureFlag>;
      update(args: unknown): Promise<FeatureFlag>;
      findMany(args?: unknown): Promise<FeatureFlag[]>;
      delete(args: unknown): Promise<FeatureFlag>;
    }
  }

  interface FeatureFlag {
    id: string;
    key: string;
    name: string;
    description: string | null;
    enabled: boolean;
    rollout: number;
    userIds: string[];
    createdAt: Date;
    updatedAt: Date;
  }

  interface PrismaClient {
    featureFlag: Prisma.FeatureFlagDelegate;
  }
}
