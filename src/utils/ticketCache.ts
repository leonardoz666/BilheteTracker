// Cache de tickets por hash de imagem (MD5) com TTL de 1 hora e LRU eviction
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
  private readonly maxSize: number;

  constructor(
    ttlMs: number = 1 * 60 * 60 * 1000, 
    parserVersion: string = PARSER_VERSION,
    maxSize: number = 100 // Máximo de 100 tickets em cache
  ) {
    this.ttlMs = ttlMs;
    this.parserVersion = parserVersion;
    this.maxSize = maxSize;
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
   * Implementa LRU: se o cache está cheio, remove a entrada mais antiga
   */
  set(imageHash: string, ticket: BilheteFinal): void {
    const key = this.generateCacheKey(imageHash);
    const expiresAt = Date.now() + this.ttlMs;
    
    // Se a chave já existe, delete primeiro para reordenar (LRU)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Se o cache atingiu o limite, remove a entrada mais antiga (primeira do Map)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    // Adiciona a nova entrada (vai para o final do Map)
    this.cache.set(key, { data: ticket, expiresAt });
  }

  /**
   * Recupera um ticket do cache se existir e não estiver expirado
   * Implementa LRU: move a entrada acessada para o final (marca como recente)
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

    // Move para o final do Map (marca como recentemente usado)
    this.cache.delete(key);
    this.cache.set(key, entry);

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

  /**
   * Retorna estatísticas do cache
   */
  stats(): { size: number; maxSize: number; utilizacao: string } {
    const size = this.cache.size;
    const utilizacao = ((size / this.maxSize) * 100).toFixed(1);
    return { size, maxSize: this.maxSize, utilizacao: `${utilizacao}%` };
  }
}

// Instância global do cache com TTL de 1 hora e limite de 100 entradas
export const globalTicketCache = new TicketCache(1 * 60 * 60 * 1000, PARSER_VERSION, 100);
