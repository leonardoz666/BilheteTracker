// Teste para odds alteradas (riscadas)
// Quando a odd muda, a casa de apostas mostra "2.75 3.45" (antiga riscada + nova)
// ⭐ PORÉM quando há uma linha de aposta explícita (ex: "Mais de 3.5"),
// o sistema prioriza isso porque é a condição REAL da aposta

import { normalizeOcr } from "../ocr/normalizeOcr";
import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";
import { MockLlmClient } from "../utils/llmClient";

describe("Odds alteradas (riscadas)", () => {
  const defaultLlmClient = new MockLlmClient();

  test("Captura a nova odd quando há duas odds na mesma linha", async () => {
    const lines = [
      "Ambas equipes Marcam: Sim & Total de Gols Mais/Menos: Mais de 3.5",
      "Super Odds Turbinadas",
      "Inter de Milão - Liverpool",
      "09/12/2025 17:00",
      "Odd 2.75 3.45", // Odd antiga riscada + nova
      "Valor apostado R$ 5,50",
      "Ganho Potencial R$ 18,98",
    ];

    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    // ⭐ Odd é calculada: retornoPotencial / valorApostado
    // odd = 18.98 / 5.5 = 3.45
    expect(result.odd).toBe(3.45);
  });

  test("Captura odd única normalmente", async () => {
    const lines = [
      "Julius Randle - 10+ Pontos",
      "Odd 2.50",
      "Valor apostado R$ 10,00",
      "Ganho Potencial R$ 25,00", // 25 / 10 = 2.5
    ];

    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    // odd = 25 / 10 = 2.5
    expect(result.odd).toBe(2.5);
  });

  test("Funciona com 'Cotação' em vez de 'Odd'", async () => {
    const lines = [
      "Luka Doncic - 20+ Pontos",
      "Cotação: 1.95 2.10", // Odd mudou de 1.95 para 2.10
      "Aposta R$ 20,00",
      "Ganho Potencial R$ 42,00", // 42 / 20 = 2.1
    ];

    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    // odd = 42 / 20 = 2.1
    expect(result.odd).toBe(2.1);
  });

  test("Ignora valores não-odds na mesma linha", async () => {
    const lines = [
      "Giannis - 25+ Pontos",
      "Cotação 3.20", // Apenas uma odd
      "Aposta R$ 5,00",
      "Ganho Potencial R$ 16,00", // 16 / 5 = 3.2
    ];

    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    // odd = 16 / 5 = 3.2
    expect(result.odd).toBe(3.2);
  });
});
