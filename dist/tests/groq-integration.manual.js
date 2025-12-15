"use strict";
// @ts-nocheck
/// <reference types="jest" />
/**
 * Testes de integração com Groq LLM real
 *
 * ⚠️ AVISO: Estes testes chamam API Groq real!
 * - Requerem GROQ_API_KEY válida no .env
 * - Respeitar rate limit: 3 requisições por minuto
 * - Execute manualmente com: pnpm test -- groq-integration
 * - Não são executados automaticamente (skip por padrão)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const semanticTicketLLM_1 = require("../pipeline/semanticTicketLLM");
const groqLlmClient_1 = require("../utils/groqLlmClient");
describe("Groq LLM Integration Tests", () => {
    const apiKey = process.env.GROQ_API_KEY;
    // Skip todos testes se GROQ_API_KEY não configurada
    if (!apiKey) {
        console.warn("⚠️ GROQ_API_KEY não encontrada. Pulando testes de integração com Groq.");
    }
    // Helper para delay respeitando rate limit (3 req/min = 20s entre requisições)
    const delayBetweenTests = async (ms = 21000) => {
        console.log(`⏳ Aguardando ${ms / 1000}s para respeitar rate limit Groq...`);
        await new Promise(resolve => setTimeout(resolve, ms));
    };
    beforeEach(() => {
        jest.spyOn(console, "log").mockImplementation(() => { });
        jest.spyOn(console, "error").mockImplementation(() => { });
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    test(apiKey ? "Groq real: Juventus x Pafos (Total Gols + Francisco Conceição)" : "SKIP: Groq não configurado", async () => {
        if (!apiKey) {
            console.warn("Pulando teste: GROQ_API_KEY não configurada");
            return;
        }
        const groqClient = new groqLlmClient_1.GroqLlmClient({ apiKey });
        const lines = [
            "Juventus x Pafos",
            "© Vencedor do 1° Tempo - Juventus",
            "• Total Gols - Mais de 2.5",
            "• Francisco Conceição (JUV) - Chutar a Gol",
        ];
        jest.restoreAllMocks();
        const result = await (0, semanticTicketLLM_1.semanticTicketLLM)({ lines }, groqClient);
        console.log("\n=== APOSTAS EXTRAÍDAS (Groq Real) ===");
        result.apostasDetalhadas.forEach((a, i) => {
            console.log(`${i + 1}. tipo=${a.tipo}, jogador=${a.jogador}, ` +
                `estatistica=${a.estatistica}, condicao=${a.condicao}`);
        });
        // Validações
        const totalGols = result.apostasDetalhadas.find((a) => a.estatistica === "Gols" && a.tipo === "match_prop");
        expect(totalGols).toBeDefined();
        expect(totalGols?.condicao).toContain("2.5");
        const francisco = result.apostasDetalhadas.find((a) => a.jogador?.includes("Francisco") && a.tipo === "player_prop");
        expect(francisco).toBeDefined();
        expect(francisco?.estatistica).toMatch(/chut|gol/i);
        await delayBetweenTests();
    });
    test(apiKey ? "Groq real: Jokic - Múltiplas estatísticas" : "SKIP: Groq não configurado", async () => {
        if (!apiKey) {
            console.warn("Pulando teste: GROQ_API_KEY não configurada");
            return;
        }
        const groqClient = new groqLlmClient_1.GroqLlmClient({ apiKey });
        const lines = [
            "Nikola Jokic - 10+ Assistências",
            "Nikola Jokic - 15+ Pontos",
            "1º Quarto - Nikola Jokic - 5+ Rebotes",
        ];
        jest.restoreAllMocks();
        const result = await (0, semanticTicketLLM_1.semanticTicketLLM)({ lines }, groqClient);
        console.log("\n=== APOSTAS EXTRAÍDAS (Jokic) ===");
        result.apostasDetalhadas.forEach((a, i) => {
            console.log(`${i + 1}. tipo=${a.tipo}, jogador=${a.jogador}, ` +
                `estatistica=${a.estatistica}, condicao=${a.condicao}, periodo=${a.periodo}`);
        });
        expect(result.apostasDetalhadas.length).toBeGreaterThan(0);
        // Todas apostas devem ter Jokic como jogador
        result.apostasDetalhadas.forEach((a) => {
            expect(a.jogador).toContain("Jokic");
        });
        await delayBetweenTests();
    });
    test(apiKey ? "Groq real: BTTS - Both Teams to Score" : "SKIP: Groq não configurado", async () => {
        if (!apiKey) {
            console.warn("Pulando teste: GROQ_API_KEY não configurada");
            return;
        }
        const groqClient = new groqLlmClient_1.GroqLlmClient({ apiKey });
        const lines = [
            "Manchester City x Liverpool",
            "Ambos marcam - Sim",
            "Vencedor - Manchester City",
        ];
        jest.restoreAllMocks();
        const result = await (0, semanticTicketLLM_1.semanticTicketLLM)({ lines }, groqClient);
        console.log("\n=== APOSTAS EXTRAÍDAS (BTTS) ===");
        result.apostasDetalhadas.forEach((a, i) => {
            console.log(`${i + 1}. tipo=${a.tipo}, condicao=${a.condicao}, ` +
                `estatistica=${a.estatistica}`);
        });
        // Deve ter alguma aposta relacionada a ambos times marcarem
        const btts = result.apostasDetalhadas.find((a) => a.estatistica?.toLowerCase().includes("gol") ||
            a.condicao?.toLowerCase().includes("ambos"));
        expect(btts).toBeDefined();
        await delayBetweenTests();
    });
});
