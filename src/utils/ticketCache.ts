// Cache de tickets por hash de imagem (MD5) com TTL de 1 hora
// Reduz processamento redundante de imagens duplicadas
// Chave de cache: ticket:{parserVersion}:{imageHash}

import { BilheteFinal } from "../schema/bilhete.schema";
import crypto from "crypto";

// Versão do parser - incrementar quando a lógica de parsing mudar
// Isso garante que caches antigos não sejam servidos após atualizações
export const PARSER_VERSION = "1.0.0";

export type CacheEntry<T> = {
  data: T;
  expiresAt: number; // epoch ms
};

export class TicketCache {
  private cache = new Map<string, CacheEntry<BilheteFinal>>();
  private readonly ttlMs: number;
  private readonly parserVersion: string;

  constructor(ttlMs: number = 1 * 60 * 60 * 1000, parserVersion: string = PARSER_VERSION) {
    // Default: 1 hora
    this.ttlMs = ttlMs;
    this.parserVersion = parserVersion;
  }

  /**
   * Gera hash MD5 de um buffer de imagem (baseado no CONTEÚDO, não na URL)
   */
  static hashImageBuffer(buffer: Buffer): string {
    return crypto.createHash("md5").update(buffer).digest("hex");
  }

  /**
   * Gera chave de cache: ticket:{parserVersion}:{imageHash}
   * Isso garante que mudanças no parser invalidem o cache automaticamente
   */
  private generateCacheKey(imageHash: string): string {
    return `ticket:${this.parserVersion}:${imageHash}`;
  }

  /**
   * Armazena um ticket no cache com a chave (parserVersion + imageHash)
   */
  set(imageHash: string, ticket: BilheteFinal): void {
    const key = this.generateCacheKey(imageHash);
    const expiresAt = Date.now() + this.ttlMs;
    this.cache.set(key, { data: ticket, expiresAt });
  }

  /**
   * Recupera um ticket do cache se existir e não estiver expirado
   */
  get(imageHash: string): BilheteFinal | null {
    const key = this.generateCacheKey(imageHash);
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Verifica se expirou
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Limpa entradas expiradas do cache
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpa entradas de versões antigas do parser
   */
  cleanOldVersions(): void {
    const currentVersionPrefix = `ticket:${this.parserVersion}:`;
    for (const key of this.cache.keys()) {
      if (!key.startsWith(currentVersionPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Retorna o tamanho do cache
   */
  size(): number {
    return this.cache.size;
  }
}

// Instância global do cache com TTL de 1 hora
export const globalTicketCache = new TicketCache(1 * 60 * 60 * 1000);
