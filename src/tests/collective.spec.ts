import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";
import { defaultLlmClient } from "../utils/llmClient";

export async function testCollective() {
  const cases = [
    { name: "BTTS Sim", lines: ["Ambas Marcam: Sim"], expectType: "match_prop", expectStat: "Ambas Marcam" },
    { name: "Ambas equipes → cada time", lines: ["Ambas equipes recebem 1+ cartões"], expectType: "team_prop", expectTime: "cada time" },
    { name: "Cada time escanteios", lines: ["Cada time bate 4+ escanteios"], expectType: "team_prop", expectTime: "cada time" },
  ];

  for (const c of cases) {
    const res = await semanticTicketLLM({ lines: c.lines }, defaultLlmClient as any);
    const a = (res.apostasDetalhadas || [])[0] || {} as any;
    console.log("[collective]", c.name, a.tipo, a.estatistica, a.condicao, a.time);
  }
}

if (require.main === module) {
  testCollective();
}
