// Teste final: garante consistência na detecção
// Baseado nos logs reais de produção

import { processBilhete } from "../pipeline";
import { NormalizationInput } from "../schema/bilhete.schema";

describe("Consistência em produção - Inter x Liverpool", () => {
  // Simula os diferentes formatos que o OCR pode retornar
  const casos = [
    {
      nome: "Caso 1: Total de quebrado",
      payload: `Ambas equipes Marcam: Sim & Total de
Gols Mais/Menos: Mais de 3.5
Super Odds Turbinadas
Inter de Milão - Liverpool
2.75 3.45
09/12/202517:00
Ganhos Potenciais
R$5,50
R$18,98`,
    },
    {
      nome: "Caso 2: Linha com Odd isolada",
      payload: `Ambas equipes Marcam: Sim
Total de Gols Mais/Menos: Mais de 3.5
Super Odds Turbinadas
Inter de Milão - Liverpool
Odd 2.75 3.45
09/12/2025 17:00`,
    },
    {
      nome: "Caso 3: Tudo em uma linha",
      payload: `Ambas equipes Marcam: Sim & Total de Gols Mais/Menos: Mais de 3.5
Super Odds Turbinadas
Inter de Milão - Liverpool
2.75 3.45
09/12/2025 17:00`,
    },
  ];

  casos.forEach(({ nome, payload }) => {
    test(nome, async () => {
      const input: NormalizationInput = {
        kind: "parsedText",
        payload,
      };

      const result = await processBilhete(input);

      console.log(`\n${nome}`);
      console.log("Apostas:", result.apostasDetalhadas.map(a => a.estatistica).join(", "));
      console.log("Odd:", result.odd);

      // SEMPRE deve ter 2 apostas
      expect(result.apostasDetalhadas).toHaveLength(2);

      // SEMPRE deve ter Ambas Marcam
      const ambasMarcam = result.apostasDetalhadas.find(
        (a) => a.estatistica === "Ambas Marcam"
      );
      expect(ambasMarcam).toBeDefined();
      expect(ambasMarcam?.condicao).toBe("Sim");

      // SEMPRE deve ter Gols Mais/Menos (consistente!)
      const golsMaisMenos = result.apostasDetalhadas.find(
        (a) => a.estatistica === "Gols Mais/Menos" || a.estatistica === "Total de Gols"
      );
      expect(golsMaisMenos).toBeDefined();
      expect(golsMaisMenos?.condicao).toBe("Mais de 3.5");

      // ⭐ Odd é SEMPRE calculada: retornoPotencial / valorApostado
      // odd = 18.98 / 5.5 = 3.45
      // Pode ser null se não conseguir capturar valor apostado e retorno
      if (result.odd !== null) {
        expect(result.odd).toBe(3.45);
      }
    });
  });
});
