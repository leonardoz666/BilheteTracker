"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const semanticTicketLLM_1 = require("../pipeline/semanticTicketLLM");
const llmClient_1 = require("../utils/llmClient");
async function run() {
    // Cobrir equivalência HT ↔ 1º Tempo e coercão para player_prop
    const lines = ["HT - Nikola Jokic - Rebotes 1+"]; // Linha consolidada para facilitar o parser
    const res = await (0, semanticTicketLLM_1.semanticTicketLLM)({ lines }, llmClient_1.defaultLlmClient);
    const aposta = res.apostasDetalhadas?.[0];
    console.log("=== Player + HT (1º Tempo) ===");
    console.log("aposta:", res.aposta);
    console.log("mercado:", res.mercado);
    console.log("detalhes:", JSON.stringify(res.apostasDetalhadas, null, 2));
    if (!aposta)
        throw new Error("Nenhuma aposta gerada");
    const condicoes = [
        aposta.tipo === "player_prop",
        /nikola jokic/i.test(aposta.jogador || ""),
        /rebotes/i.test(aposta.estatistica || ""),
        /1\+/.test(aposta.condicao || ""),
        aposta.valor === 1,
        /1º\s*Tempo/i.test(aposta.periodo || ""),
    ];
    const ok = condicoes.every(Boolean);
    if (!ok) {
        throw new Error("Falhou validação de player + HT → 1º Tempo");
    }
    console.log("✅ Pass: player_prop + HT mapeado para 1º Tempo");
}
if (require.main === module) {
    run().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
