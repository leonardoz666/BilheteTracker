import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";
import { defaultLlmClient } from "../utils/llmClient";

async function run() {
  const lines = ["FT - Nikola Jokic - Rebotes 1+"]; // FT deve mapear para Jogo
  const res = await semanticTicketLLM({ lines }, defaultLlmClient as any);
  const aposta = res.apostasDetalhadas?.[0];

  console.log("=== Player + FT (Jogo) ===");
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
    /Jogo/i.test(aposta.periodo || ""),
  ];
  const ok = condicoes.every(Boolean);
  if (!ok) {
    throw new Error("Falhou validação de player + FT → Jogo");
  }
  console.log("✅ Pass: player_prop + FT mapeado para Jogo");
}

if (require.main === module) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
