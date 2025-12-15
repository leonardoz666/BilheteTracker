import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";
import { defaultLlmClient } from "../utils/llmClient";

export async function testAhTotal() {
  const cases = [
    { name: "AH -0.25 Juventus", lines: ["Handicap Asiático: Juventus -0.25"], expectStat: "Handicap Asiático" },
    { name: "Total 2.75", lines: ["Total de Gols - Mais de 2.75"], expectStat: "Gols" },
    { name: "Over 2.25", lines: ["Over 2.25"], expectStat: "Gols" },
    { name: "Dual Over picks same period", lines: ["Over 2.25", "Mais de 2.75"], expectStat: "Gols" },
    { name: "Over/Under conflict same period", lines: ["Over 2.5", "Under 2.5"], expectStat: "Gols" },
    { name: "HT vs 1º Tempo equivalence", lines: ["HT - Over 2.5", "1º Tempo - Mais de 2.75"], expectStat: "Gols" },
  ];

  for (const c of cases) {
    const res = await semanticTicketLLM({ lines: c.lines }, defaultLlmClient as any);
    const a = (res.apostasDetalhadas || [])[0] || {} as any;
    console.log("[ah_total]", c.name, a.tipo, a.estatistica, a.condicao, a.time);
  }
}

if (require.main === module) {
  testAhTotal();
}
