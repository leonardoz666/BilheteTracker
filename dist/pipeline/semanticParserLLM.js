"use strict";
// Etapa 3: Parser Semântico de Apostas (LLM)
//
// Esta etapa recebe APENAS as linhas que representam apostas
// (sem odds, valores ou textos institucionais) e delega a
// interpretação semântica para um LLM. Neste projeto, usamos
// um cliente mock (MockLlmClient) para permitir execução local
// sem dependência da API real.
Object.defineProperty(exports, "__esModule", { value: true });
exports.semanticParserLLM = semanticParserLLM;
const llmClient_1 = require("../utils/llmClient");
async function semanticParserLLM(betLines, client = llmClient_1.defaultLlmClient) {
    // Garantimos aqui que NENHUM metadado financeiro ou institucional
    // seja enviado à IA: somente linhas previamente classificadas
    // como apostas pela etapa de extração.
    const cleaned = betLines.map((l) => l.trim()).filter((l) => !!l);
    return client.callSemanticParser(cleaned);
}
