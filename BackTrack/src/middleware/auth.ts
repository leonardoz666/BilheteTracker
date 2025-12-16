import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger.js';

// Estender interface Request para incluir user e userId
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        iat: number;
        exp: number;
      };
      userId?: string;
    }
  }
}

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  log.debug({ ip: req.ip, origin: req.headers.origin }, 'Authentication started');
  
  // Tentar obter o token do cookie primeiro (mais seguro)
  let token = req.cookies?.access_token;

  // Se não houver cookie, tentar obter do header Authorization
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // Fallback: query parameter (apenas para Telegram WebApp)
  if (!token && typeof req.query?.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    log.warn({ 
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      origin: req.headers.origin
    }, 'No token provided');
    return res.status(401).json({ error: "no_token" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    log.error('JWT_SECRET not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, secret) as {
      userId: string;
      iat: number;
      exp: number;
    };
    
    if (!decoded?.userId) {
      log.warn({ ip: req.ip }, 'Token missing userId');
      return res.status(403).json({ error: 'invalid' });
    }
    
    req.user = decoded;
    req.userId = decoded.userId;
    log.debug({ userId: decoded.userId }, 'Token validated');
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      log.warn({ ip: req.ip }, 'Token expired');
      return res.status(401).json({ error: "expired" });
    }

    if (err instanceof jwt.JsonWebTokenError) {
      log.warn({ ip: req.ip, error: err.message }, 'Invalid token');
      return res.status(401).json({ error: "invalid" });
    }

    log.error({ err, ip: req.ip }, 'Unexpected auth error');
    return res.status(401).json({ error: "invalid" });
  }
};

// Alias para compatibilidade
export const authenticateToken = authenticate;
