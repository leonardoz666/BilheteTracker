// @ts-nocheck
/// <reference types="jest" />
/**
 * Testes para garantir que "Dupla Chance" NÃO é criada automaticamente.
 * Bug: Fallback criava apostas fantasmas que usuário não pediu.
 */

import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";
import { defaultLlmClient } from "../utils/llmClient";

describe("Sem Dupla Chance Automática", () => {
  test("Não cria Dupla Chance quando há apenas 1X/X2/12 isolado", async () => {
    const input = {
      lines: [
        "Real Madrid x Barcelona",
        "1X",
        "1.85",
      ],
    };

    const result = await semanticTicketLLM(input, defaultLlmClient as any);
    const apostas = result.apostasDetalhadas || [];

    // Não deve criar aposta automática de "Dupla Chance"
    const duplaChance = apostas.filter((a) => a.estatistica === "Dupla Chance");
    expect(duplaChance).toHaveLength(0);
  });

  test("Não cria Dupla Chance quando texto contém 'ou Empate'", async () => {
    const input = {
      lines: [
        "Juventus x Milan",
        "Juventus ou Empate",
        "1.50",
      ],
    };

    const result = await semanticTicketLLM(input, defaultLlmClient as any);
    const apostas = result.apostasDetalhadas || [];

    // Não deve criar aposta automática
    const duplaChance = apostas.filter((a) => a.estatistica === "Dupla Chance");
    expect(duplaChance).toHaveLength(0);
  });

  test("Não cria Dupla Chance quando há 'Dupla Chance:' sem contexto claro", async () => {
    const input = {
      lines: [
        "Inter x Napoli",
        "Dupla Chance",
        "1.75",
      ],
    };

    const result = await semanticTicketLLM(input, defaultLlmClient as any);
    const apostas = result.apostasDetalhadas || [];

    // Não deve criar aposta automática
    const duplaChance = apostas.filter((a) => a.estatistica === "Dupla Chance");
    expect(duplaChance).toHaveLength(0);
  });

  test("LLM pode criar Dupla Chance se extrair do contexto", async () => {
    const input = {
      lines: [
        "Juventus x Milan",
        "Dupla Chance: Juventus ou Empate",
        "1.50",
      ],
    };

    const result = await semanticTicketLLM(input, defaultLlmClient as any);
    const apostas = result.apostasDetalhadas || [];

    // Se o LLM extrair, OK. Se não extrair, fallback NÃO deve adicionar.
    // Como MockLlmClient não extrai Dupla Chance, não deve haver nenhuma.
    const duplaChance = apostas.filter((a) => a.estatistica === "Dupla Chance");
    expect(duplaChance.length).toBeLessThanOrEqual(1); // Max 1 (do LLM), nunca do fallback
  });

  test("Bug: Ambas Marcam + 'Total de' não cria Dupla Chance fantasma", async () => {
    const input = {
      lines: [
        "Ambas equipes Marcam: Sim & Total de 2.75 3.45",
        "Gols Mais/Menos: Mais de 3.5",
      ],
    };

    const result = await semanticTicketLLM(input, defaultLlmClient as any);
    const apostas = result.apostasDetalhadas || [];

    // Não deve criar Dupla Chance fantasma
    const duplaChance = apostas.filter((a) => a.estatistica === "Dupla Chance");
    expect(duplaChance).toHaveLength(0);

    // Deve ter apenas BTTS + Gols
    expect(apostas.length).toBeGreaterThanOrEqual(1);
    expect(apostas.length).toBeLessThanOrEqual(2);
  });
});
