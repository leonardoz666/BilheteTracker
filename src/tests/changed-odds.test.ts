// Teste para odds alteradas (riscadas)
// Quando a odd muda, a casa de apostas mostra "2.75 3.45" (antiga riscada + nova)
// O sistema deve capturar a ÚLTIMA odd (a nova)

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

    // Deve capturar a odd 3.45 (nova), não 2.75 (riscada)
    expect(result.odd).toBe(3.45);
  });

  test("Captura odd única normalmente", async () => {
    const lines = [
      "Julius Randle - 10+ Pontos",
      "Odd 2.50",
      "Valor apostado R$ 10,00",
    ];

    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    // Deve capturar a única odd disponível
    expect(result.odd).toBe(2.50);
  });

  test("Funciona com 'Cotação' em vez de 'Odd'", async () => {
    const lines = [
      "Luka Doncic - 20+ Pontos",
      "Cotação: 1.95 2.10", // Odd mudou de 1.95 para 2.10
      "Aposta R$ 20,00",
    ];

    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    // Deve capturar a última odd (2.10)
    expect(result.odd).toBe(2.10);
  });

  test("Ignora valores não-odds na mesma linha", async () => {
    const lines = [
      "Giannis - 25+ Pontos",
      "Cotação 3.20", // Apenas uma odd
      "Aposta R$ 5,00",
    ];

    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    expect(result.odd).toBe(3.20);
  });
});
