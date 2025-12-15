// @ts-nocheck
/// <reference types="jest" />
import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";
import { defaultLlmClient } from "../utils/llmClient";

describe("Period Decorator with Player Props", () => {
  // Suppress console logs during tests
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("1º Quarto - Nikola Jokic - Rebotes 1+", async () => {
    const lines = ["1º Quarto - Nikola Jokic - Rebotes 1+"];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    expect(result.apostasDetalhadas).toHaveLength(1);
    expect(result.apostasDetalhadas[0]).toMatchSnapshot();
  });

  test("2º Quarto - Nikola Jokic - Rebotes 1+", async () => {
    const lines = ["2º Quarto - Nikola Jokic - Rebotes 1+"];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    expect(result.apostasDetalhadas).toHaveLength(1);
    expect(result.apostasDetalhadas[0]).toMatchSnapshot();
  });

  test("HT → 1º Tempo - Nikola Jokic - Rebotes 1+", async () => {
    const lines = ["HT - Nikola Jokic - Rebotes 1+"];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    expect(result.apostasDetalhadas).toHaveLength(1);
    expect(result.apostasDetalhadas[0]).toMatchSnapshot();
  });

  test("1º Tempo - Nikola Jokic - Rebotes 1+", async () => {
    const lines = ["1º Tempo - Nikola Jokic - Rebotes 1+"];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    expect(result.apostasDetalhadas).toHaveLength(1);
    expect(result.apostasDetalhadas[0]).toMatchSnapshot();
  });

  test("2º Tempo - Nikola Jokic - Rebotes 1+", async () => {
    const lines = ["2º Tempo - Nikola Jokic - Rebotes 1+"];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    expect(result.apostasDetalhadas).toHaveLength(1);
    expect(result.apostasDetalhadas[0]).toMatchSnapshot();
  });

  test("FT → Jogo - Nikola Jokic - Rebotes 1+", async () => {
    const lines = ["FT - Nikola Jokic - Rebotes 1+"];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    expect(result.apostasDetalhadas).toHaveLength(1);
    expect(result.apostasDetalhadas[0]).toMatchSnapshot();
  });

  test("Intervalo → 1º Tempo - Nikola Jokic - Rebotes 1+", async () => {
    const lines = ["Intervalo - Nikola Jokic - Rebotes 1+"];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    expect(result.apostasDetalhadas).toHaveLength(1);
    expect(result.apostasDetalhadas[0]).toMatchSnapshot();
  });

  test("Cada time bate 4+ escanteios with 1º Quarto", async () => {
    const lines = ["1º Quarto", "Cada time bate 4+ escanteios"];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    expect(result.apostasDetalhadas).toHaveLength(1);
    expect(result.apostasDetalhadas[0]).toMatchSnapshot();
  });

  test("Handicap Asiático -0.25 without period", async () => {
    const lines = ["Handicap Asiático: Juventus -0.25"];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    expect(result.apostasDetalhadas).toHaveLength(1);
    expect(result.apostasDetalhadas[0]).toMatchSnapshot();
  });

  test("Total de Gols Over 2.75 with HT", async () => {
    const lines = ["HT", "Total de Gols - Mais de 2.75"];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    expect(result.apostasDetalhadas).toHaveLength(1);
    expect(result.apostasDetalhadas[0]).toMatchSnapshot();
  });

  test("Jokic multi-lines: 10+ AST, 10+ REB, 1º Quarto 1+ REB", async () => {
    const lines = [
      "Nikola Jokic - 10+ Assistências",
      "Nikola Jokic - 10+ Rebotes",
      "1º Quarto - Nikola Jokic - 1+ Rebotes",
    ];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    // Esperado: 3 player_props, sem match_prop duplicando
    expect(result.apostasDetalhadas.length).toBeGreaterThanOrEqual(3);
    const playerProps = result.apostasDetalhadas.filter((a) => a.tipo === "player_prop");
    const matchProps = result.apostasDetalhadas.filter((a) => a.tipo === "match_prop");
    expect(playerProps.length).toBeGreaterThanOrEqual(3);
    // Não deve existir match_prop equivalente a player_prop
    expect(matchProps.length).toBe(0);

    // Snapshot do conjunto final
    expect(result.apostasDetalhadas).toMatchSnapshot();
  });

  test("Jokic FT 2+ AST: reforça período Jogo e anti-duplicação", async () => {
    const lines = [
      "FT - Nikola Jokic - 2+ Assistências",
      "Nikola Jokic - 2+ Assistências",
    ];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    const playerProps = result.apostasDetalhadas.filter((a) => a.tipo === "player_prop");
    const matchProps = result.apostasDetalhadas.filter((a) => a.tipo === "match_prop");

    // Debug para entender estatistica/condicao/periodo retornados
    // eslint-disable-next-line no-console
    console.log("HT 20+ PTS playerProps:", playerProps);

    // Deve existir pelo menos 1 player_prop Assistências 2+ com período Jogo
    const hasFT = playerProps.some((p) => /assist/i.test(p.estatistica || "") && /2\+/.test(p.condicao || "") && /Jogo/i.test(p.periodo || ""));
    expect(hasFT).toBe(true);

    // Não deve existir match_prop equivalente
    expect(matchProps.length).toBe(0);

    expect(result.apostasDetalhadas).toMatchSnapshot();
  });

    test("Jokic HT 5+ AST: canonicaliza 1º Tempo e anti-duplicação", async () => {
      const lines = [
        "HT - Nikola Jokic - 5+ Assistências",
        "Nikola Jokic - 5+ Assistências",
      ];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    const playerProps = result.apostasDetalhadas.filter((a) => a.tipo === "player_prop");
    const matchProps = result.apostasDetalhadas.filter((a) => a.tipo === "match_prop");

    const hasHT = playerProps.some((p) => /1º Tempo/i.test(p.periodo || ""));
    expect(hasHT).toBe(true);

    expect(matchProps.length).toBe(0);

    expect(result.apostasDetalhadas).toMatchSnapshot();
  });

  test("Jokic Q2 5+ REB: decorador período Q2 e anti-duplicação", async () => {
    const lines = [
      "2º Quarto - Nikola Jokic - 5+ Rebotes",
      "Nikola Jokic - 5+ Rebotes",
    ];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    const playerProps = result.apostasDetalhadas.filter((a) => a.tipo === "player_prop");
    const matchProps = result.apostasDetalhadas.filter((a) => a.tipo === "match_prop");

    const hasQ2 = playerProps.some((p) => /rebotes/i.test(p.estatistica || "") && /5\+/.test(p.condicao || "") && /2º Quarto/i.test(p.periodo || ""));
    expect(hasQ2).toBe(true);

    expect(matchProps.length).toBe(0);

    expect(result.apostasDetalhadas).toMatchSnapshot();
  });

  test("Jokic FT 15+ PTS: período Jogo e anti-duplicação", async () => {
    const lines = [
      "FT - Nikola Jokic - 15+ Pontos",
      "Nikola Jokic - 15+ Pontos",
    ];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    const playerProps = result.apostasDetalhadas.filter((a) => a.tipo === "player_prop");
    const matchProps = result.apostasDetalhadas.filter((a) => a.tipo === "match_prop");

    expect(matchProps.length).toBe(0);

    expect(result.apostasDetalhadas).toMatchSnapshot();
  });

  test("Jokic HT 10+ PTS: período 1º Tempo e anti-duplicação", async () => {
    const lines = [
      "HT - Nikola Jokic - 10+ Pontos",
      "Nikola Jokic - 10+ Pontos",
    ];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    const playerProps = result.apostasDetalhadas.filter((a) => a.tipo === "player_prop");
    const matchProps = result.apostasDetalhadas.filter((a) => a.tipo === "match_prop");

    expect(matchProps.length).toBe(0);

    expect(result.apostasDetalhadas).toMatchSnapshot();
  });

  test("Jokic Q4 8+ PTS: período 4º Quarto e anti-duplicação", async () => {
    const lines = [
      "4º Quarto - Nikola Jokic - 8+ Pontos",
      "Nikola Jokic - 8+ Pontos",
    ];
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);

    const playerProps = result.apostasDetalhadas.filter((a) => a.tipo === "player_prop");
    const matchProps = result.apostasDetalhadas.filter((a) => a.tipo === "match_prop");

    expect(matchProps.length).toBe(0);

    expect(result.apostasDetalhadas).toMatchSnapshot();
  });
});
