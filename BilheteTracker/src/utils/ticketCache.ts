import crypto from "crypto";
import { BilheteFinal } from "../schema/bilhete.schema";

// Versão do parser - incrementar quando houver mudanças no parsing
const PARSER_VERSION = "v1";

// TTL padrão: 1 hora (em milissegundos)
const DEFAULT_TTL = 60 * 60 * 1000;

interface CacheEntry {
  result: BilheteFinal;
  timestamp: number;
}

// Cache in-memory simples
const cache = new Map<string, CacheEntry>();

/**
 * Gera hash SHA-256 para uma URL ou conteúdo de imagem
 */
export function hashImage(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Gera chave de cache com versão do parser e hash da imagem
 */
function getCacheKey(imageHash: string): string {
  return `ticket:${PARSER_VERSION}:${imageHash}`;
}

/**
 * Busca resultado no cache
 * @param imageUrl URL da imagem ou identificador
 * @returns Resultado cacheado ou undefined se não existir ou expirado
 */
export function getCachedTicket(imageUrl: string): BilheteFinal | undefined {
  const hash = hashImage(imageUrl);
  const key = getCacheKey(hash);
  const entry = cache.get(key);

  if (!entry) {
    return undefined;
  }

  const now = Date.now();
  const age = now - entry.timestamp;

  if (age > DEFAULT_TTL) {
    // Cache expirado
    cache.delete(key);
    return undefined;
  }

  console.log(`✅ Cache hit para ticket (hash: ${hash.substring(0, 8)}..., age: ${Math.floor(age / 1000)}s)`);
  return entry.result;
}

/**
 * Salva resultado no cache
 * @param imageUrl URL da imagem ou identificador
 * @param result Resultado do processamento do bilhete
 */
export function setCachedTicket(imageUrl: string, result: BilheteFinal): void {
  const hash = hashImage(imageUrl);
  const key = getCacheKey(hash);

  cache.set(key, {
    result,
    timestamp: Date.now(),
  });

  console.log(`💾 Cache set para ticket (hash: ${hash.substring(0, 8)}..., apostas: ${result.aposta.length})`);
}

/**
 * Limpa entradas expiradas do cache (manutenção periódica)
 */
export function cleanExpiredCache(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > DEFAULT_TTL) {
      cache.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cache cleanup: ${cleaned} entradas removidas`);
  }
}

// Limpa cache expirado a cada 10 minutos
setInterval(cleanExpiredCache, 10 * 60 * 1000);
