import express from 'express';
import { z } from 'zod';
import { authenticate as authenticateToken, AuthRequest } from '../middleware/auth.js';
import { handleRouteError } from '../utils/errorHandler.js';

// DEPRECATED: Esta rota foi descontinuada.
// O bilhete-tracker agora é um repositório independente implantado como um microserviço.
// Use a rota /api/upload que chama o bilhete-tracker via HTTP em vez de importação direta.
// URL: process.env.BILHETE_TRACKER_URL (padrão: https://bilhete-tracker.onrender.com)
// 
// REMOVED: import { processBilheteFromImageUrl } from '../../../bilhete-tracker/dist/index.js';

const router: express.Router = express.Router();

const processBilheteSchema = z.object({
  imageUrl: z.string().url('URL de imagem inválida'),
  useMockLlm: z.boolean().optional(),
});

// POST /api/bilhetes/process-image
// Body: { imageUrl: string, useMockLlm?: boolean }
// - Chama OCR.space (engine 2)
// - Roda o pipeline bilhete-tracker
// - Retorna o BilheteFinal padronizado
router.post('/process-image', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { imageUrl, useMockLlm } = processBilheteSchema.parse(req.body);

    const bilheteFinal = await processBilheteFromImageUrl(imageUrl, {
      useMockLlm,
    });

    return res.json(bilheteFinal);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

export default router;
