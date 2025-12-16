import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";
import { defaultLlmClient } from "../utils/llmClient";

export async function testResultadoCluster() {
  const cases = [
    { name: "Dupla Chance Juventus/Empate", lines: ["Dupla Chance: Juventus ou Empate"], expectStat: "Dupla Chance" },
    { name: "Empate Anula Inter", lines: ["Empate Anula - Inter"], expectStat: "Empate Anula" },
    { name: "Winner Juventus", lines: ["Vencedor - Juventus"], expectType: "winner" },
  ];

  for (const c of cases) {
    const res = await semanticTicketLLM({ lines: c.lines }, defaultLlmClient as any);
    const a = (res.apostasDetalhadas || [])[0] || {} as any;
    console.log("[resultado]", c.name, a.tipo, a.estatistica, a.condicao, a.time);
  }
}

describe("Resultado cluster smoke", () => {
  test("processa casos sem erro", async () => {
    await testResultadoCluster();
  });
});

if (require.main === module) {
  testResultadoCluster();
}
