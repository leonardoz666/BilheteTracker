import express from 'express';
import { prisma } from '../lib/prisma.js';
import os from 'os';

const router: express.Router = express.Router();

/**
 * Health check básico - retorna 200 OK se o servidor está rodando
 */
router.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

/**
 * Health check detalhado - verifica banco de dados e recursos do sistema
 */
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();
  
  const checks = {
    server: { status: 'ok' },
    database: { status: 'unknown' as 'ok' | 'error' | 'unknown', responseTime: 0 },
    memory: { status: 'unknown' as 'ok' | 'warning' | 'critical', details: {} as any },
    uptime: process.uptime()
  };

  // Check database
  try {
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database.responseTime = Date.now() - dbStartTime;
    checks.database.status = 'ok';
  } catch (error) {
    checks.database.status = 'error';
  }

  // Check memory
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercent = (usedMemory / totalMemory) * 100;

  checks.memory.details = {
    total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
    used: `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
    free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
    usagePercent: `${memoryUsagePercent.toFixed(2)}%`
  };

  if (memoryUsagePercent > 90) {
    checks.memory.status = 'critical';
  } else if (memoryUsagePercent > 75) {
    checks.memory.status = 'warning';
  } else {
    checks.memory.status = 'ok';
  }

  const responseTime = Date.now() - startTime;
  const overallStatus = 
    checks.database.status === 'error' || checks.memory.status === 'critical' 
      ? 'unhealthy' 
      : checks.memory.status === 'warning' 
        ? 'degraded' 
        : 'healthy';

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    checks,
    system: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      nodeVersion: process.version
    }
  });
});

/**
 * Readiness check - verifica se o serviço está pronto para receber tráfego
 * Usado por load balancers e orquestradores (Kubernetes, etc)
 */
router.get('/ready', async (req, res) => {
  try {
    // Tentar query simples no banco
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({ 
      ready: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      ready: false,
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness check - verifica se o serviço está vivo
 * Usado por orquestradores para decidir se devem reiniciar o container
 */
router.get('/live', (req, res) => {
  res.status(200).json({ 
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;
