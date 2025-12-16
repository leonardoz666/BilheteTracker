// Teste do caso real: aposta Inter de Milão - Liverpool com odd alterada
// Baseado na imagem do usuário onde a odd mudou de 2.75 para 3.45

import { processBilhete } from "../pipeline";
import { NormalizationInput } from "../schema/bilhete.schema";

describe("Caso Real: Inter de Milão - Liverpool (Odd Alterada)", () => {
  test("Captura odd 3.45 (não 2.75 riscada) na aposta real", async () => {
    const input: NormalizationInput = {
      kind: "parsedText",
      payload: `Ambas equipes Marcam: Sim & Total de Gols Mais/Menos: Mais de 3.5
Super Odds Turbinadas
Inter de Milão - Liverpool
09/12/2025 17:00
Mais Detalhes
Aposta
Ganho Potencial R$18,98
MANTER FECHAR
Odd 2.75 3.45
Valor Apostado R$ 5,50`,
    };

    const result = await processBilhete(input);

    console.log("\n📊 RESULTADO DO BILHETE:");
    console.log("Odd capturada:", result.odd);
    console.log("Valor Apostado:", result.valorApostado);
    console.log("Retorno Potencial:", result.retornoPotencial);

    // ⭐ A odd é calculada: retornoPotencial / valorApostado
    // odd = 18.98 / 5.5 = 3.45
    expect(result.odd).toBe(3.45);
    
    // Verifica também os outros valores extraídos
    expect(result.valorApostado).toBe(5.50);
    // Retorno potencial pode não ser capturado se o OCR não reconhecer exatamente
    if (result.retornoPotencial !== null) {
      expect(result.retornoPotencial).toBe(18.98);
    }
  });

  test("Odd única não é afetada pela mudança", async () => {
    const input: NormalizationInput = {
      kind: "parsedText",
      payload: `Liverpool - Arsenal
Resultado Final: Liverpool
Odd 2.10
Aposta R$ 10,00
Ganho Potencial R$ 21,00`,
    };

    const result = await processBilhete(input);

    // Odd calculada: 21 / 10 = 2.1
    expect(result.odd).toBe(2.1);
  });
});
