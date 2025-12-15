"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const semanticTicketLLM_1 = require("../pipeline/semanticTicketLLM");
const llmClient_1 = require("../utils/llmClient");
async function run() {
    const lines = ["1º Quarto", "Cada time bate 4+ escanteios"];
    const res = await (0, semanticTicketLLM_1.semanticTicketLLM)({ lines }, llmClient_1.defaultLlmClient);
    const aposta = res.apostasDetalhadas?.[0];
    console.log("=== Player + Período ===");
    console.log("aposta:", res.aposta);
    console.log("mercado:", res.mercado);
    console.log("detalhes:", JSON.stringify(res.apostasDetalhadas, null, 2));
    if (!aposta)
        throw new Error("Nenhuma aposta gerada");
    const condicoes = [
        aposta.tipo === "player_prop",
        /escanteios/i.test(aposta.estatistica || ""),
        /4\+/.test(aposta.condicao || ""),
        aposta.valor === 4,
        /1º\s*Quarto/i.test(aposta.periodo || ""),
    ];
    const ok = condicoes.every(Boolean);
    if (!ok) {
        throw new Error("Falhou validação de player + período");
    }
    console.log("✅ Pass: player_prop + período preservado");
}
if (require.main === module) {
    run().catch((e) => {
        console.error(e);
        process.exit(1);
    });
}
