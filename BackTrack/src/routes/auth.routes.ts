import express from 'express';
import { z } from 'zod';
import { sensitiveRateLimiter } from '../middleware/rateLimiter.js';
import { log } from '../utils/logger.js';
import { handleRouteError } from '../utils/errorHandler.js';
import { AuthService } from '../services/AuthService.js';

const router: express.Router = express.Router();
const authService = new AuthService();

const registerSchema = z.object({
  nomeCompleto: z.string().min(3).max(100, 'Nome muito longo'),
  email: z.string().email().max(255, 'Email muito longo'),
  senha: z.string().min(6).max(100, 'Senha muito longa')
});

const loginSchema = z.object({
  email: z.string().email().max(255, 'Email muito longo'),
  senha: z.string().max(100, 'Senha muito longa')
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     tags:
 *       - Auth
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
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@example.com
 *               senha:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 100
 *                 example: senha123
 *     responses:
 *       200:
 *         description: Usuário registrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 tokens:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email já cadastrado
 *       429:
 *         description: Rate limit excedido (5 req/15min)
 */
router.post('/register', sensitiveRateLimiter, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.json(result);
  } catch (error) {
    log.error(error, 'Erro ao registrar usuário');
    handleRouteError(error, res);
  }
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Autenticar usuário
 *     description: Retorna tokens JWT e define cookies httpOnly
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@example.com
 *               senha:
 *                 type: string
 *                 example: senha123
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: access_token=jwt...; HttpOnly; Secure; SameSite=None
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                   description: Access token JWT
 *                 refreshToken:
 *                   type: string
 *                   description: Refresh token JWT
 *                 expiresAt:
 *                   type: number
 *                   description: Timestamp de expiração (ms)
 *       401:
 *         description: Credenciais inválidas
 *       429:
 *         description: Rate limit excedido
 */
router.post('/login', sensitiveRateLimiter, async (req, res) => {
  try {
    log.info({ origin: req.headers.origin }, 'Login request received');
    
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data);

    // Configurações de cookies para cross-domain
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: "/"
    };

    log.debug({ origin: req.headers.origin }, 'Setting authentication cookies');

    // Definir cookies httpOnly
    res.cookie("access_token", result.tokens.accessToken, cookieOptions);
    res.cookie("refresh_token", result.tokens.refreshToken, cookieOptions);
    
    // TEMPORÁRIO: Retornar tokens no body para usar com localStorage
    res.json({ 
      success: true,
      token: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    log.error(error, 'Erro ao fazer login');
    handleRouteError(error, res);
  }
});

// Logout
router.post('/logout', (req, res) => {
  const cookieOptions = {
    path: "/",
    secure: true,
    sameSite: "none" as const,
    httpOnly: true
  };

  res.clearCookie("access_token", cookieOptions);
  res.clearCookie("refresh_token", cookieOptions);
  res.json({ success: true });
});

// Check authentication (para frontend verificar httpOnly cookies)
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.access_token;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await authService.verifyToken(token);
    res.json({ authenticated: true, user });
  } catch (err) {
    log.warn({ error: String(err) }, 'Auth check failed');
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Refresh Token
router.post('/refresh', async (req, res) => {
  try {
    log.debug('Refresh token request received');
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      log.warn({ ip: req.ip }, 'Refresh token absent');
      return res.status(401).json({ error: 'Refresh token ausente' });
    }

    const tokens = await authService.refreshTokens(refreshToken);

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/"
    };

    res.cookie("access_token", tokens.accessToken, cookieOptions);
    res.cookie("refresh_token", tokens.refreshToken, cookieOptions);

    log.debug('Tokens refreshed successfully');
    res.json({ success: true });

  } catch (err) {
    log.warn({ error: String(err) }, 'Refresh token verification failed');
    return res.status(401).json({ error: 'Refresh inválido' });
  }
});

// Login via Telegram Web App
router.post('/telegram', async (req, res) => {
  try {
    const { initData } = req.body;
    const result = await authService.loginViaTelegram(initData);
    res.json(result);
  } catch (error) {
    log.error(error, 'Erro ao fazer login via Telegram');
    handleRouteError(error, res);
  }
});

export default router;
