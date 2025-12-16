// Cache de tickets por hash de imagem (MD5) com TTL de 1 hora
// Reduz processamento redundante de imagens duplicadas

import { BilheteFinal } from "../schema/bilhete.schema";
import crypto from "crypto";

export type CacheEntry<T> = {
  data: T;
  expiresAt: number; // epoch ms
};

export class TicketCache {
  private cache = new Map<string, CacheEntry<BilheteFinal>>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 1 * 60 * 60 * 1000) {
    // Default: 1 hora
    this.ttlMs = ttlMs;
  }

  /**
   * Gera hash MD5 de um buffer de imagem
   */
  static hashImageBuffer(buffer: Buffer): string {
    return crypto.createHash("md5").update(buffer).digest("hex");
  }

  /**
   * Armazena um ticket no cache com a chave (hash)
   */
  set(hash: string, ticket: BilheteFinal): void {
    const expiresAt = Date.now() + this.ttlMs;
    this.cache.set(hash, { data: ticket, expiresAt });
  }

  /**
   * Recupera um ticket do cache se existir e não estiver expirado
   */
  get(hash: string): BilheteFinal | null {
    const entry = this.cache.get(hash);
    if (!entry) {
      return null;
    }

    // Verifica se expirou
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(hash);
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
