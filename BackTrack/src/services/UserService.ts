import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { log } from '../utils/logger.js';

interface UpdateUserData {
  nomeCompleto?: string;
  email?: string;
  telegramId?: string;
}

interface ChangePasswordData {
  senhaAtual: string;
  novaSenha: string;
}

export class UserService {
  /**
   * Busca usuário por ID
   */
  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        telegramId: true,
        plano: {
          select: {
            id: true,
            nome: true,
            preco: true,
            limiteApostasDiarias: true
          }
        },
        createdAt: true
      }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return user;
  }

  /**
   * Busca usuário por email
   */
  async getUserByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        plano: { select: { nome: true } }
      }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return user;
  }

  /**
   * Atualiza dados do usuário
   */
  async updateUser(userId: string, data: UpdateUserData) {
    // Verificar se o email já está em uso
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        throw new Error('Email já está em uso');
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        telegramId: true,
        plano: { select: { nome: true } }
      }
    });

    log.info({ userId }, 'User data updated');
    return user;
  }

  /**
   * Altera senha do usuário
   */
  async changePassword(userId: string, data: ChangePasswordData) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, senha: true }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar senha atual
    const validPassword = await bcrypt.compare(data.senhaAtual, user.senha);
    if (!validPassword) {
      throw new Error('Senha atual incorreta');
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(data.novaSenha, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { senha: hashedPassword }
    });

    log.info({ userId }, 'User password changed');
    return { success: true };
  }

  /**
   * Deleta um usuário e todos os dados relacionados
   */
  async deleteUser(userId: string) {
    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Deletar em transação (cascade deve cuidar dos relacionamentos)
    await prisma.$transaction(async (tx: any) => {
      // Prisma deve fazer cascade automaticamente se configurado no schema
      await tx.user.delete({
        where: { id: userId }
      });

      log.info({ userId }, 'User deleted');
    });

    return { success: true };
  }

  /**
   * Vincular Telegram ID ao usuário
   */
  async linkTelegramId(userId: string, telegramId: string) {
    // Verificar se o telegramId já está vinculado a outro usuário
    const existingUser = await prisma.user.findFirst({
      where: {
        telegramId,
        NOT: { id: userId }
      }
    });

    if (existingUser) {
      throw new Error('Este Telegram já está vinculado a outra conta');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { telegramId },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        telegramId: true
      }
    });

    log.info({ userId, telegramId }, 'Telegram ID linked to user');
    return user;
  }

  /**
   * Desvincular Telegram ID do usuário
   */
  async unlinkTelegramId(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { telegramId: null },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        telegramId: true
      }
    });

    log.info({ userId }, 'Telegram ID unlinked from user');
    return user;
  }

  /**
   * Busca estatísticas do usuário
   */
  async getUserStats(userId: string) {
    // Contar apostas através das bancas do usuário
    const bancas = await prisma.bankroll.findMany({
      where: { usuarioId: userId },
      include: { _count: { select: { apostas: true } } }
    });

    const apostasCount = bancas.reduce((sum, banca) => sum + banca._count.apostas, 0);
    const bancasCount = bancas.length;

    return {
      apostasCount,
      bancasCount
    };
  }
}
