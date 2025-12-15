import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";
import { defaultLlmClient } from "../utils/llmClient";

async function runCase(name: string, lines: string[]) {
  const res = await semanticTicketLLM({ lines }, defaultLlmClient as any);
  console.log(`\n=== ${name} ===`);
  console.log("aposta:", res.aposta);
  console.log("mercado:", res.mercado);
  console.log("detalhes:", JSON.stringify(res.apostasDetalhadas, null, 2));
}

export async function runAll() {
  await runCase("BTTS simples", ["Ambas equipes marcam: Sim"]);
  await runCase("Cada time escanteios", ["Cada time bate 4+ escanteios"]);
  await runCase("Dupla Chance 1X", ["Dupla Chance: Juventus ou Empate"]);
  await runCase("AH Juventus -0.25", ["Handicap Asiático: Juventus -0.25"]);
  await runCase("Total de Gols Over 2.75", ["Total de Gols - Mais de 2.75"]);
  await runCase("BTTS & Over combo", ["Ambas equipes marcam: Sim & Total de 2.75 3.45", "Over 2.75"]);
  await runCase("Cada time dedupe", ["Cada time bate 4+ escanteios", "Escanteios - cada time 4+"]);
}

if (require.main === module) {
  runAll().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
