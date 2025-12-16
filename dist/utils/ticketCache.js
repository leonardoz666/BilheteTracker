"use strict";
// Cache de tickets por hash de imagem (MD5) com TTL de 1 hora e LRU eviction
// Reduz processamento redundante de imagens duplicadas
// Chave de cache: ticket:{parserVersion}:{imageHash}
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalTicketCache = exports.TicketCache = exports.PARSER_VERSION = void 0;
const crypto_1 = __importDefault(require("crypto"));
// Versão do parser - incrementar quando a lógica de parsing mudar
// Isso garante que caches antigos não sejam servidos após atualizações
exports.PARSER_VERSION = "1.0.0";
class TicketCache {
    constructor(ttlMs = 1 * 60 * 60 * 1000, parserVersion = exports.PARSER_VERSION, maxSize = 100 // Máximo de 100 tickets em cache
    ) {
        this.cache = new Map();
        this.ttlMs = ttlMs;
        this.parserVersion = parserVersion;
        this.maxSize = maxSize;
    }
    /**
     * Gera hash MD5 de um buffer de imagem (baseado no CONTEÚDO, não na URL)
     */
    static hashImageBuffer(buffer) {
        return crypto_1.default.createHash("md5").update(buffer).digest("hex");
    }
    /**
     * Gera chave de cache: ticket:{parserVersion}:{imageHash}
     * Isso garante que mudanças no parser invalidem o cache automaticamente
     */
    generateCacheKey(imageHash) {
        return `ticket:${this.parserVersion}:${imageHash}`;
    }
    /**
     * Armazena um ticket no cache com a chave (parserVersion + imageHash)
     * Implementa LRU: se o cache está cheio, remove a entrada mais antiga
     */
    set(imageHash, ticket) {
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
    get(imageHash) {
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
    cleanExpired() {
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
    cleanOldVersions() {
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
    clear() {
        this.cache.clear();
    }
    /**
     * Retorna o tamanho do cache
     */
    size() {
        return this.cache.size;
    }
    /**
     * Retorna estatísticas do cache
     */
    stats() {
        const size = this.cache.size;
        const utilizacao = ((size / this.maxSize) * 100).toFixed(1);
        return { size, maxSize: this.maxSize, utilizacao: `${utilizacao}%` };
    }
}
exports.TicketCache = TicketCache;
// Instância global do cache com TTL de 1 hora e limite de 100 entradas
exports.globalTicketCache = new TicketCache(1 * 60 * 60 * 1000, exports.PARSER_VERSION, 100);
