import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";
import { defaultLlmClient } from "../utils/llmClient";

async function run() {
  const lines = ["1º Quarto", "Cada time bate 4+ escanteios"];
  const res = await semanticTicketLLM({ lines }, defaultLlmClient as any);
  const aposta = res.apostasDetalhadas?.[0];

  console.log("=== Player + Período ===");
  console.log("aposta:", res.aposta);
  console.log("mercado:", res.mercado);
  console.log("detalhes:", JSON.stringify(res.apostasDetalhadas, null, 2));

  if (!aposta) throw new Error("Nenhuma aposta gerada");
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
