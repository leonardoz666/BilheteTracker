import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";
import { defaultLlmClient } from "../utils/llmClient";

async function run() {
  // Cobrir equivalência HT ↔ 1º Tempo e coercão para player_prop
  const lines = ["HT - Nikola Jokic - Rebotes 1+"]; // Linha consolidada para facilitar o parser
  const res = await semanticTicketLLM({ lines }, defaultLlmClient as any);
  const aposta = res.apostasDetalhadas?.[0];

  console.log("=== Player + HT (1º Tempo) ===");
  console.log("aposta:", res.aposta);
  console.log("mercado:", res.mercado);
  console.log("detalhes:", JSON.stringify(res.apostasDetalhadas, null, 2));

  if (!aposta) throw new Error("Nenhuma aposta gerada");
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
