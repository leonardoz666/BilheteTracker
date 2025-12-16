// @ts-nocheck
import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/AuthService';

const prisma = new PrismaClient();
const authService = new AuthService();

describe('AuthService', () => {
  const testUser = {
    nomeCompleto: 'Test User',
    email: `test-${Date.now()}@example.com`,
    senha: 'senha123456'
  };

  let userId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Garantir que o plano gratuito existe
    const freePlanData: Prisma.PlanCreateInput = {
      nome: 'Gratuito',
      preco: 0,
      limiteApostasDiarias: 50
    };

    await prisma.plan.upsert({
      where: { nome: freePlanData.nome },
      update: {},
      create: freePlanData
    });
  });

  afterAll(async () => {
    // Limpar usuário de teste
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      const result = await authService.register(testUser);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(testUser.email);
      expect(result.user.nomeCompleto).toBe(testUser.nomeCompleto);
      expect(result.token).toBeTruthy();

      userId = result.user.id;
    });

    it('deve lançar erro ao tentar registrar email duplicado', async () => {
      await expect(authService.register(testUser)).rejects.toThrow('Email já cadastrado');
    });

    it('deve criar banca e tipster padrão automaticamente', async () => {
      const bankrolls = await prisma.bankroll.findMany({
        where: { usuarioId: userId }
      });

      const tipsters = await prisma.tipster.findMany({
        where: { usuarioId: userId }
      });

      expect(bankrolls.length).toBeGreaterThan(0);
      expect(tipsters.length).toBeGreaterThan(0);
      expect(bankrolls[0].nome).toBe('Banca Principal');
      expect(bankrolls[0].ePadrao).toBe(true);
    });
  });

  describe('login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const result = await authService.login({
        email: testUser.email,
        senha: testUser.senha
      });

      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('user');
      expect(result.tokens.accessToken).toBeTruthy();
      expect(result.tokens.refreshToken).toBeTruthy();
      expect(result.user.email).toBe(testUser.email);

      accessToken = result.tokens.accessToken;
      refreshToken = result.tokens.refreshToken;
    });

    it('deve lançar erro com email inválido', async () => {
      await expect(
        authService.login({
          email: 'naoexiste@example.com',
          senha: 'qualquersenha'
        })
      ).rejects.toThrow('Credenciais inválidas');
    });

    it('deve lançar erro com senha inválida', async () => {
      await expect(
        authService.login({
          email: testUser.email,
          senha: 'senhaerrada'
        })
      ).rejects.toThrow('Credenciais inválidas');
    });
  });

  describe('verifyToken', () => {
    it('deve verificar token válido', async () => {
      const user = await authService.verifyToken(accessToken);

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('nomeCompleto');
      expect(user).toHaveProperty('email');
      expect(user.email).toBe(testUser.email);
    });

    it('deve lançar erro com token inválido', async () => {
      await expect(authService.verifyToken('token-invalido')).rejects.toThrow();
    });

    it('deve lançar erro com token vazio', async () => {
      await expect(authService.verifyToken('')).rejects.toThrow('Token não fornecido');
    });
  });

  describe('refreshTokens', () => {
    it('deve renovar tokens com refresh token válido', async () => {
      const tokens = await authService.refreshTokens(refreshToken);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.accessToken).not.toBe(accessToken); // Novo token diferente
    });

    it('deve lançar erro com refresh token inválido', async () => {
      await expect(authService.refreshTokens('token-invalido')).rejects.toThrow();
    });

    it('deve lançar erro com refresh token vazio', async () => {
      await expect(authService.refreshTokens('')).rejects.toThrow('Refresh token ausente');
    });
  });
});
