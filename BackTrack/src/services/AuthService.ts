import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { log } from '../utils/logger.js';

interface RegisterData {
  nomeCompleto: string;
  email: string;
  senha: string;
}

interface LoginData {
  email: string;
  senha: string;
}

interface TokenPayload {
  userId: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface UserResponse {
  id: string;
  nomeCompleto: string;
  email: string;
  plano?: any;
}

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly REFRESH_SECRET: string;
  private readonly ACCESS_TOKEN_EXPIRY = '7d';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET!;
    this.REFRESH_SECRET = process.env.REFRESH_SECRET!;

    if (!this.JWT_SECRET || !this.REFRESH_SECRET) {
      throw new Error('JWT_SECRET and REFRESH_SECRET must be defined');
    }
  }

  /**
   * Registra um novo usuário com banca e tipster padrão
   */
  async register(data: RegisterData): Promise<{ user: UserResponse; token: string }> {
    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    // Buscar plano gratuito
    const freePlan = await prisma.plan.findUnique({
      where: { nome: 'Gratuito' }
    });

    if (!freePlan) {
      throw new Error('Plano padrão não encontrado. Execute o script de inicialização.');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.senha, 10);

    // Criar usuário, banca e tipster em transação
    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          nomeCompleto: data.nomeCompleto,
          email: data.email,
          senha: hashedPassword,
          planoId: freePlan.id
        }
      });

      const bancaPadrao = await tx.bankroll.create({
        data: {
          nome: 'Banca Principal',
          descricao: 'Banca padrão criada automaticamente',
          usuarioId: user.id,
          status: 'Ativa',
          ePadrao: true
        }
      });

      const tipsterPadrao = await tx.tipster.create({
        data: {
          nome: data.nomeCompleto.trim() || 'Tipster Padrão',
          usuarioId: user.id,
          ativo: true
        }
      });

      log.info(
        { userId: user.id, bancaId: bancaPadrao.id, tipsterId: tipsterPadrao.id },
        'Usuário, banca e tipster padrão criados'
      );

      return { user, bancaPadrao };
    });

    const token = this.generateAccessToken(result.user.id);

    return {
      token,
      user: {
        id: result.user.id,
        nomeCompleto: result.user.nomeCompleto,
        email: result.user.email
      }
    };
  }

  /**
   * Autentica um usuário e retorna tokens
   */
  async login(data: LoginData): Promise<{ tokens: AuthTokens; user: UserResponse }> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { plano: true }
    });

    if (!user) {
      log.warn({ email: data.email }, 'User not found');
      throw new Error('Credenciais inválidas');
    }

    const validPassword = await bcrypt.compare(data.senha, user.senha);
    if (!validPassword) {
      log.warn({ email: data.email }, 'Invalid password');
      throw new Error('Credenciais inválidas');
    }

    log.info({ userId: user.id }, 'User authenticated');

    const tokens = this.generateTokens(user.id);

    return {
      tokens,
      user: {
        id: user.id,
        nomeCompleto: user.nomeCompleto,
        email: user.email,
        plano: user.plano
      }
    };
  }

  /**
   * Login via Telegram Web App
   */
  async loginViaTelegram(initData: string): Promise<{ token: string; user: UserResponse }> {
    if (!initData || typeof initData !== 'string') {
      throw new Error('initData do Telegram não fornecido');
    }

    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    
    if (!userStr) {
      throw new Error('Dados do usuário não encontrados no initData');
    }

    const telegramUser = JSON.parse(userStr) as { 
      id: number; 
      first_name?: string; 
      last_name?: string; 
      username?: string 
    };
    const telegramId = String(telegramUser.id);

    const user = await prisma.user.findFirst({
      where: { telegramId },
      include: { plano: true }
    });

    if (!user) {
      throw new Error('Usuário não encontrado. Vincule sua conta do Telegram primeiro.');
    }

    const token = this.generateAccessToken(user.id);

    return {
      token,
      user: {
        id: user.id,
        nomeCompleto: user.nomeCompleto,
        email: user.email,
        plano: user.plano
      }
    };
  }

  /**
   * Verifica e renova tokens
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    if (!refreshToken) {
      throw new Error('Refresh token ausente');
    }

    const decoded = jwt.verify(refreshToken, this.REFRESH_SECRET) as TokenPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      log.warn({ userId: decoded.userId }, 'User not found for refresh token');
      throw new Error('Usuário inválido');
    }

    log.info({ userId: user.id }, 'Generating new tokens');
    return this.generateTokens(user.id);
  }

  /**
   * Verifica se o token é válido e retorna o usuário
   */
  async verifyToken(token: string): Promise<UserResponse> {
    if (!token) {
      throw new Error('Token não fornecido');
    }

    const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        nomeCompleto: true,
        email: true,
        plano: { select: { nome: true, id: true } }
      }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return user;
  }

  /**
   * Gera access token e refresh token
   */
  private generateTokens(userId: string): AuthTokens {
    const accessToken = jwt.sign(
      { userId },
      this.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId },
      this.REFRESH_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Gera apenas o access token
   */
  private generateAccessToken(userId: string): string {
    return jwt.sign(
      { userId },
      this.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );
  }
}
