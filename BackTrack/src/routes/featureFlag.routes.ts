import express from 'express';
import { authenticate as authenticateToken, AuthRequest } from '../middleware/auth.js';
import { handleRouteError } from '../utils/errorHandler.js';
import { FeatureFlagService } from '../services/FeatureFlagService.js';
import { z } from 'zod';

const router: express.Router = express.Router();
const flagService = new FeatureFlagService();

// Validação de admin (apenas para rotas de admin)
// TODO: Adicionar campo isAdmin no User e verificar aqui
const requireAdmin = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  // Por enquanto, qualquer usuário autenticado pode gerenciar flags
  // Você pode adicionar lógica de permissão aqui
  next();
};

/**
 * @openapi
 * /api/feature-flags:
 *   get:
 *     summary: Listar todas as feature flags
 *     tags:
 *       - Feature Flags
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de feature flags
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   key:
 *                     type: string
 *                   name:
 *                     type: string
 *                   enabled:
 *                     type: boolean
 *                   rollout:
 *                     type: number
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const flags = await flagService.listFlags();
    res.json(flags);
  } catch (error) {
    handleRouteError(error, res);
  }
});

/**
 * @openapi
 * /api/feature-flags/user:
 *   get:
 *     summary: Obter flags habilitadas para o usuário logado
 *     description: Retorna objeto com chave=flag, valor=enabled
 *     tags:
 *       - Feature Flags
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Flags do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 new-chart-design: false
 *                 telegram-notifications: true
 *                 advanced-filters: true
 */
router.get('/user', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const flags = await flagService.getUserFlags(userId);
    res.json(flags);
  } catch (error) {
    handleRouteError(error, res);
  }
});

/**
 * @openapi
 * /api/feature-flags/check/{key}:
 *   get:
 *     summary: Verificar se flag está habilitada para usuário
 *     tags:
 *       - Feature Flags
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: new-chart-design
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 */
router.get('/check/:key', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { key } = req.params;
    const userId = req.userId!;
    const enabled = await flagService.isEnabled(key, userId);
    res.json({ enabled });
  } catch (error) {
    handleRouteError(error, res);
  }
});

const createFlagSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(false),
  rollout: z.number().min(0).max(100).default(100)
});

/**
 * @openapi
 * /api/feature-flags:
 *   post:
 *     summary: Criar nova feature flag (Admin)
 *     tags:
 *       - Feature Flags
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - name
 *             properties:
 *               key:
 *                 type: string
 *                 example: new-dashboard
 *               name:
 *                 type: string
 *                 example: Novo Dashboard
 *               description:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *                 default: false
 *               rollout:
 *                 type: number
 *                 default: 100
 *     responses:
 *       201:
 *         description: Flag criada
 */
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const data = createFlagSchema.parse(req.body);
    const flag = await flagService.createFlag(data);
    res.status(201).json(flag);
  } catch (error) {
    handleRouteError(error, res);
  }
});

const updateFlagSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  rollout: z.number().min(0).max(100).optional()
});

/**
 * @openapi
 * /api/feature-flags/{key}:
 *   patch:
 *     summary: Atualizar feature flag (Admin)
 *     tags:
 *       - Feature Flags
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               rollout:
 *                 type: number
 *     responses:
 *       200:
 *         description: Flag atualizada
 */
router.patch('/:key', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { key } = req.params;
    const data = updateFlagSchema.parse(req.body);
    const flag = await flagService.updateFlag(key, data);
    res.json(flag);
  } catch (error) {
    handleRouteError(error, res);
  }
});

/**
 * @openapi
 * /api/feature-flags/{key}/enable:
 *   post:
 *     summary: Ligar flag para 100% (Admin)
 *     tags:
 *       - Feature Flags
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Flag ligada
 */
router.post('/:key/enable', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { key } = req.params;
    const flag = await flagService.enableFlag(key);
    res.json(flag);
  } catch (error) {
    handleRouteError(error, res);
  }
});

/**
 * @openapi
 * /api/feature-flags/{key}/disable:
 *   post:
 *     summary: Desligar flag (Admin)
 *     tags:
 *       - Feature Flags
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Flag desligada
 */
router.post('/:key/disable', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { key } = req.params;
    const flag = await flagService.disableFlag(key);
    res.json(flag);
  } catch (error) {
    handleRouteError(error, res);
  }
});

const rolloutSchema = z.object({
  percentage: z.number().min(0).max(100)
});

/**
 * @openapi
 * /api/feature-flags/{key}/rollout:
 *   post:
 *     summary: Definir rollout percentual (Admin)
 *     tags:
 *       - Feature Flags
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               percentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 25
 *     responses:
 *       200:
 *         description: Rollout configurado
 */
router.post('/:key/rollout', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { key } = req.params;
    const { percentage } = rolloutSchema.parse(req.body);
    const flag = await flagService.setRollout(key, percentage);
    res.json(flag);
  } catch (error) {
    handleRouteError(error, res);
  }
});

/**
 * @openapi
 * /api/feature-flags/{key}:
 *   delete:
 *     summary: Deletar feature flag (Admin)
 *     tags:
 *       - Feature Flags
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Flag deletada
 */
router.delete('/:key', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { key } = req.params;
    await flagService.deleteFlag(key);
    res.status(204).send();
  } catch (error) {
    handleRouteError(error, res);
  }
});

export default router;
