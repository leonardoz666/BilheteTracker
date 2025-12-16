// @ts-nocheck
import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { UserService } from '../services/UserService';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const userService = new UserService();

describe('UserService', () => {
  let testUserId: string;
  const testEmail = `user-${Date.now()}@example.com`;

  beforeAll(async () => {
    // Criar usuário de teste
    const freePlanData: Prisma.PlanCreateInput = {
      nome: 'Gratuito',
      preco: 0,
      limiteApostasDiarias: 50
    };

    const freePlan = await prisma.plan.upsert({
      where: { nome: freePlanData.nome },
      update: {},
      create: freePlanData
    });

    const hashedPassword = await bcrypt.hash('senha123', 10);
    const user = await prisma.user.create({
      data: {
        nomeCompleto: 'Test User Service',
        email: testEmail,
        senha: hashedPassword,
        planoId: freePlan.id
      }
    });

    testUserId = user.id;

    // Criar banca e aposta de teste para stats
    await prisma.bankroll.create({
      data: {
        nome: 'Banca Teste',
        usuarioId: testUserId,
        status: 'Ativa',
        ePadrao: true
      }
    });
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('getUserById', () => {
    it('deve retornar usuário por ID', async () => {
      const user = await userService.getUserById(testUserId);

      expect(user).toHaveProperty('id', testUserId);
      expect(user).toHaveProperty('email', testEmail);
      expect(user).toHaveProperty('nomeCompleto');
      expect(user).toHaveProperty('plano');
    });

    it('deve lançar erro para ID inexistente', async () => {
      await expect(
        userService.getUserById('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Usuário não encontrado');
    });
  });

  describe('getUserByEmail', () => {
    it('deve retornar usuário por email', async () => {
      const user = await userService.getUserByEmail(testEmail);

      expect(user).toHaveProperty('id', testUserId);
      expect(user).toHaveProperty('email', testEmail);
    });

    it('deve lançar erro para email inexistente', async () => {
      await expect(
        userService.getUserByEmail('naoexiste@example.com')
      ).rejects.toThrow('Usuário não encontrado');
    });
  });

  describe('updateUser', () => {
    it('deve atualizar nome do usuário', async () => {
      const novoNome = 'Nome Atualizado';
      const user = await userService.updateUser(testUserId, {
        nomeCompleto: novoNome
      });

      expect(user.nomeCompleto).toBe(novoNome);
    });

    it('deve lançar erro ao tentar email já em uso', async () => {
      // Criar outro usuário
      const freePlan = await prisma.plan.findUnique({ where: { nome: 'Gratuito' } });
      const hashedPassword = await bcrypt.hash('senha123', 10);
      const otherUser = await prisma.user.create({
        data: {
          nomeCompleto: 'Outro Usuario',
          email: `outro-${Date.now()}@example.com`,
          senha: hashedPassword,
          planoId: freePlan!.id
        }
      });

      await expect(
        userService.updateUser(testUserId, { email: otherUser.email })
      ).rejects.toThrow('Email já está em uso');

      // Limpar
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('changePassword', () => {
    it('deve alterar senha com senha atual correta', async () => {
      const result = await userService.changePassword(testUserId, {
        senhaAtual: 'senha123',
        novaSenha: 'novasenha456'
      });

      expect(result.success).toBe(true);

      // Verificar se nova senha funciona
      const user = await prisma.user.findUnique({ where: { id: testUserId } });
      const valid = await bcrypt.compare('novasenha456', user!.senha);
      expect(valid).toBe(true);
    });

    it('deve lançar erro com senha atual incorreta', async () => {
      await expect(
        userService.changePassword(testUserId, {
          senhaAtual: 'senhaerrada',
          novaSenha: 'novasenha789'
        })
      ).rejects.toThrow('Senha atual incorreta');
    });
  });

  describe('linkTelegramId', () => {
    const telegramId = '123456789';

    it('deve vincular Telegram ID ao usuário', async () => {
      const user = await userService.linkTelegramId(testUserId, telegramId);

      expect(user.telegramId).toBe(telegramId);
    });

    it('deve lançar erro ao tentar vincular ID já em uso', async () => {
      // Criar outro usuário
      const freePlan = await prisma.plan.findUnique({ where: { nome: 'Gratuito' } });
      const hashedPassword = await bcrypt.hash('senha123', 10);
      const otherUser = await prisma.user.create({
        data: {
          nomeCompleto: 'Outro Usuario 2',
          email: `outro2-${Date.now()}@example.com`,
          senha: hashedPassword,
          planoId: freePlan!.id
        }
      });

      await expect(
        userService.linkTelegramId(otherUser.id, telegramId)
      ).rejects.toThrow('Este Telegram já está vinculado a outra conta');

      // Limpar
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('unlinkTelegramId', () => {
    it('deve desvincular Telegram ID', async () => {
      const user = await userService.unlinkTelegramId(testUserId);

      expect(user.telegramId).toBeNull();
    });
  });

  describe('getUserStats', () => {
    it('deve retornar estatísticas do usuário', async () => {
      const stats = await userService.getUserStats(testUserId);

      expect(stats).toHaveProperty('apostasCount');
      expect(stats).toHaveProperty('bancasCount');
      expect(typeof stats.apostasCount).toBe('number');
      expect(typeof stats.bancasCount).toBe('number');
      expect(stats.bancasCount).toBeGreaterThan(0); // Criamos 1 banca
    });
  });
});
