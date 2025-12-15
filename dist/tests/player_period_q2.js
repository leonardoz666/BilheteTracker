"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const semanticTicketLLM_1 = require("../pipeline/semanticTicketLLM");
const llmClient_1 = require("../utils/llmClient");
async function run() {
    const lines = ["2º Quarto - Nikola Jokic - Rebotes 1+"]; // Deve mapear para 2º Quarto
    const res = await (0, semanticTicketLLM_1.semanticTicketLLM)({ lines }, llmClient_1.defaultLlmClient);
    const aposta = res.apostasDetalhadas?.[0];
    console.log("=== Player + 2º Quarto ===");
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
        /2º\s*Quarto/i.test(aposta.periodo || ""),
    ];
    const ok = condicoes.every(Boolean);
    if (!ok) {
        throw new Error("Falhou validação de player + 2º Quarto");
    }
    console.log("✅ Pass: player_prop + período 2º Quarto");
}
if (require.main === module) {
    run().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
