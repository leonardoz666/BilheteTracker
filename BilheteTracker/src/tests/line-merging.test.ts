// @ts-nocheck
/// <reference types="jest" />
/**
 * Testes para validar merging de linhas quebradas do OCR.
 * Melhora qualidade do LLM ao reconstruir frases completas.
 */

import { normalizeOcr } from "../ocr/normalizeOcr";

describe("Merging de Linhas Quebradas (normalizeOcr)", () => {
  test("Mescla linhas com conector 'e' no final", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Cada time bate 4+ escanteios e
time recebe 1+ cartões`,
    };

    const result = normalizeOcr(input);

    // Deve mesclar em uma única linha
    expect(result.lines).toContain("Cada time bate 4+ escanteios e time recebe 1+ cartões");
    expect(result.lines).not.toContain("Cada time bate 4+ escanteios e");
    expect(result.lines).not.toContain("time recebe 1+ cartões");
  });

  test("Mescla condição + estatística (Mais de X.X + Estatística)", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Mais de 9.5
Escanteios FT O/U`,
    };

    const result = normalizeOcr(input);

    // Deve mesclar
    expect(result.lines).toContain("Mais de 9.5 Escanteios FT O/U");
    expect(result.lines).not.toContain("Mais de 9.5");
    expect(result.lines.filter((l) => l.includes("Escanteios")).length).toBe(1);
  });

  test("Mescla jogador + estatística (Julius Randle - 10+ + Rebotes)", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Julius Randle - 10+
Rebotes`,
    };

    const result = normalizeOcr(input);

    // Deve mesclar
    expect(result.lines).toContain("Julius Randle - 10+ Rebotes");
    expect(result.lines).not.toContain("Julius Randle - 10+");
    expect(result.lines).not.toContain("Rebotes");
  });

  test("Mescla linha terminando com dois pontos (:)", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Ambas equipes Marcam:
Sim`,
    };

    const result = normalizeOcr(input);

    // Deve mesclar
    expect(result.lines).toContain("Ambas equipes Marcam: Sim");
    expect(result.lines).not.toContain("Ambas equipes Marcam:");
  });

  test("Mescla linha terminando com 'ou'", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Juventus ou
Empate`,
    };

    const result = normalizeOcr(input);

    // Deve mesclar
    expect(result.lines).toContain("Juventus ou Empate");
    expect(result.lines).not.toContain("Juventus ou");
  });

  test("Mescla linha terminando com '&'", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Ambas Marcam: Sim &
Gols Mais de 2.5`,
    };

    const result = normalizeOcr(input);

    // Deve mesclar
    expect(result.lines).toContain("Ambas Marcam: Sim & Gols Mais de 2.5");
    expect(result.lines).not.toContain("Ambas Marcam: Sim &");
  });

  test("NÃO mescla linhas completas independentes", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Julius Randle - 10+ Rebotes
Nikola Jokic - 5+ Assistências
Luka Doncic - 20+ Pontos`,
    };

    const result = normalizeOcr(input);

    // Todas devem permanecer separadas (são apostas completas)
    expect(result.lines).toContain("Julius Randle - 10+ Rebotes");
    expect(result.lines).toContain("Nikola Jokic - 5+ Assistências");
    expect(result.lines).toContain("Luka Doncic - 20+ Pontos");
    expect(result.lines.length).toBe(3);
  });

  test("Combina merging + deduplicação + prefixos", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Cada time bate 4+ escanteios e
time recebe 1+ cartões
o Cada time bate 4+ escanteios e time recebe 1+ cartões`,
    };

    const result = normalizeOcr(input);

    // Deve mesclar as duas primeiras linhas
    // E depois deduplicate com a terceira (que tem prefixo "o ")
    expect(result.lines).toEqual([
      "Cada time bate 4+ escanteios e time recebe 1+ cartões"
    ]);
  });

  test("Mescla múltiplas quebras em sequência", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Mais de 10.5
Escanteios
Mais de 2.5
Gols`,
    };

    const result = normalizeOcr(input);

    // Deve mesclar em 2 apostas
    expect(result.lines).toContain("Mais de 10.5 Escanteios");
    expect(result.lines).toContain("Mais de 2.5 Gols");
    expect(result.lines.length).toBe(2);
  });

  test("Bug Case 2: Cada time escanteios + cartões", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Cada time bate 4+ escanteios e cada
time recebe 1+ cartões`,
    };

    const result = normalizeOcr(input);

    // Deve mesclar em uma única linha
    expect(result.lines.length).toBe(1);
    expect(result.lines[0]).toContain("Cada time");
    expect(result.lines[0]).toContain("escanteios");
    expect(result.lines[0]).toContain("cartões");
  });

  test("Bug Case 3: Escanteios Mais de 9.5", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Mais de 9.5
Escanteios FT O/U`,
    };

    const result = normalizeOcr(input);

    // Deve mesclar
    expect(result.lines.length).toBe(1);
    expect(result.lines[0]).toBe("Mais de 9.5 Escanteios FT O/U");
  });

  test("Bug Case Stefon Diggs: Condição + Estatística NFL", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Mais de 4.5
[Stefon Diggs] Total de recepções`,
    };

    const result = normalizeOcr(input);

    // Deve mesclar
    expect(result.lines.length).toBe(1);
    expect(result.lines[0]).toBe("Mais de 4.5 [Stefon Diggs] Total de recepções");
  });

  test("Mescla com padrão [Jogador] - Estatística", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Mais de 10.5
[Travis Kelce] Total de Yards`,
    };

    const result = normalizeOcr(input);

    // Deve reconhecer [Jogador] como continuação
    expect(result.lines.length).toBe(1);
    expect(result.lines[0]).toContain("Travis Kelce");
    expect(result.lines[0]).toContain("Total de Yards");
  });
});
