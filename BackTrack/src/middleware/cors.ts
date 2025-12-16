import cors, { CorsOptions } from 'cors';
import { log } from '../utils/logger.js';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';
const isDevelopment = !isProduction;
const alwaysIncludeDevOrigins = process.env.ALLOW_DEV_ORIGINS !== 'false';

const DEFAULT_DEV_ORIGINS = (
  process.env.DEV_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Lista de origens permitidas em produção
// Pode ser configurada via variável de ambiente separada por vírgulas
// Exemplo: ALLOWED_ORIGINS=http://localhost:5173,https://app.exemplo.com
const getAllowedOrigins = (): string[] | null => {
  if (isDevelopment) {
    // Em desenvolvimento permitir qualquer origem
    return null;
  }

  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  
  // Origens padrão em produção (Vercel, Render, etc)
  const DEFAULT_PROD_ORIGINS = [
    // Vercel
    'https://realtrack.vercel.app',
    'https://realtrack-git-*.vercel.app', // Preview branches
    // Render
    'https://realtrack.onrender.com',
    'https://*.onrender.com', // Múltiplos subdomínios no Render
    // Local para testes
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
  ];

  const originsSet = new Set(DEFAULT_PROD_ORIGINS);

  if (allowedOriginsEnv) {
    allowedOriginsEnv
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
      .forEach((origin) => originsSet.add(origin));
  }

  if (alwaysIncludeDevOrigins) {
    DEFAULT_DEV_ORIGINS.forEach((origin) => originsSet.add(origin));
  }

  const origins = [...originsSet];
  log.info({ origins }, 'CORS configurado com lista branca');
  return origins;
};

const allowedOrigins = getAllowedOrigins();

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    log.debug({ origin }, 'CORS request received');
    
    // Se allowedOrigins é null, permitir qualquer origem
    if (allowedOrigins === null) {
      log.debug('Allowing any origin (dev mode)');
      return callback(null, true);
    }

    // Se não há origin (ex: requisições de mesma origem, Postman), permitir
    if (!origin) {
      log.debug('Allowing request without origin (same-origin or tool)');
      return callback(null, true);
    }

    // Verificar se a origem está na lista branca (com suporte a wildcards)
    const isAllowed = allowedOrigins.some((allowedOrigin) => {
      // Permitir wildcards (ex: https://*.onrender.com)
      if (allowedOrigin.includes('*')) {
        const regex = new RegExp(
          '^' + allowedOrigin.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'
        );
        return regex.test(origin);
      }
      return origin === allowedOrigin;
    });

    if (isAllowed) {
      log.debug({ origin }, 'Origin allowed');
      callback(null, true);
    } else {
      log.warn({ origin, allowedOrigins }, 'Origin blocked by CORS');
      callback(new Error('Não permitido por CORS'));
    }
  },
  credentials: true, // Permitir cookies/credenciais
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['RateLimit-Remaining', 'RateLimit-Reset', 'RateLimit-Limit', 'Set-Cookie']
};

export const corsMiddleware = cors(corsOptions);

