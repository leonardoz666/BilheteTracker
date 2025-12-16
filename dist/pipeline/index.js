"use strict";
// Pipeline completo de processamento de bilhetes
//
// Etapas:
// 1) Normalização OCR (local)
// 2) Extração de Metadados (local)
// 2.5) Extração de linhas de apostas brutas (local)
// 3) Parser Semântico de Apostas (LLM)
// 4) Formatter Final do Bilhete (local)
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBilhete = processBilhete;
exports.processBilheteWithClient = processBilheteWithClient;
const normalizeOcr_1 = require("../ocr/normalizeOcr");
const semanticTicketLLM_1 = require("./semanticTicketLLM");
const DEBUG = process.env.DEBUG_BILHETE === '1';
// Pipeline simplificado: o normalizeOcr prepara as linhas e o
// semanticTicketLLM se torna o INTÉRPRETE principal (LLM-first),
// com fallback interno para regex + parser de apostas quando
// necessário.
async function processBilhete(input) {
    const normalized = (0, normalizeOcr_1.normalizeOcr)(input);
    // Log de diagnóstico para inspecionar exatamente o que o normalizeOcr
    // está entregando para o restante do pipeline.
    if (DEBUG) {
        console.log("🧪 NORMALIZED LINES ↓↓↓");
        normalized.lines.forEach((l, i) => {
            console.log(i, JSON.stringify(l));
        });
    }
    return (0, semanticTicketLLM_1.semanticTicketLLM)({ lines: normalized.lines });
}
// Variante que permite injetar um cliente LLM específico
// (por exemplo, um cliente real Groq em produção), mantendo a
// mesma arquitetura LLM-first.
async function processBilheteWithClient(input, client) {
    const normalized = (0, normalizeOcr_1.normalizeOcr)(input);
    if (DEBUG) {
        console.log("🧪 NORMALIZED LINES (with client) ↓↓↓");
        normalized.lines.forEach((l, i) => {
            console.log(i, JSON.stringify(l));
        });
    }
    return (0, semanticTicketLLM_1.semanticTicketLLM)({ lines: normalized.lines }, client);
}
__exportStar(require("../schema/bilhete.schema"), exports);
