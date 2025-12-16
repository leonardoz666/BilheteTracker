// @ts-nocheck
/// <reference types="jest" />
/**
 * Testes para validar que labels de UI isolados são removidos
 * pelo normalizeOcr (função isUILabelLine)
 */

import { normalizeOcr } from "../ocr/normalizeOcr";

describe("UI Labels Filter (normalizeOcr)", () => {
  test("Remove labels de UI isolados do BackTrack", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Nikola Jokic - 10+ Assistências
Assistências
Nikola Jokic - 10+ Rebotes
Rebotes
1º Quarto - Nikola Jokic - 1+ Rebotes
1º Quarto - Rebotes
Acompanhar
Resolvida
Aposta`,
    };

    const result = normalizeOcr(input);

    // Deve manter apenas as apostas, remover labels
    expect(result.lines).toContain("Nikola Jokic - 10+ Assistências");
    expect(result.lines).toContain("Nikola Jokic - 10+ Rebotes");
    expect(result.lines).toContain("1º Quarto - Nikola Jokic - 1+ Rebotes");

    // Deve remover labels isolados (exatamente iguais)
    expect(result.lines).not.toContain("Assistências");
    expect(result.lines).not.toContain("Rebotes");
    expect(result.lines).not.toContain("1º Quarto - Rebotes"); // Label isolado do BackTrack
    expect(result.lines).not.toContain("Acompanhar");
    expect(result.lines).not.toContain("Resolvida");
    expect(result.lines).not.toContain("Aposta");
  });

  test("Remove labels de períodos isolados", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Juventus x Milan
1º Tempo - Vencedor Juventus
1º Tempo
2º Tempo - Vencedor Milan`,
    };

    const result = normalizeOcr(input);

    // Deve manter apostas com períodos explícitos
    expect(result.lines).toContain("1º Tempo - Vencedor Juventus");
    expect(result.lines).toContain("2º Tempo - Vencedor Milan");

    // Deve remover período isolado
    expect(result.lines).not.toContain("1º Tempo");
  });

  test("Remove estatísticas isoladas (não labels de apostas)", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Neymar - 2+ Chutes
Chutes
Mbappé - 1+ Gol
Gols`,
    };

    const result = normalizeOcr(input);

    // Mantém apostas
    expect(result.lines).toContain("Neymar - 2+ Chutes");
    expect(result.lines).toContain("Mbappé - 1+ Gol");

    // Remove labels isolados
    expect(result.lines).not.toContain("Chutes");
    expect(result.lines).not.toContain("Gols");
  });

  test("Não remove estatísticas que fazem parte de apostas", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Giannis Antetokounmpo - 20+ Pontos
Jokic - 8+ Assistências`,
    };

    const result = normalizeOcr(input);

    // Mantém todas as linhas (não são labels isolados)
    expect(result.lines.length).toBe(2);
    expect(result.lines).toContain("Giannis Antetokounmpo - 20+ Pontos");
    expect(result.lines).toContain("Jokic - 8+ Assistências");
  });

  test("Remove múltiplos labels em sequência", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Cristiano Ronaldo - 2+ Gols
Gols
Chutes
Cartões
Passes
Ronaldo - 1+ Cartão`,
    };

    const result = normalizeOcr(input);

    // Mantém apostas
    expect(result.lines).toContain("Cristiano Ronaldo - 2+ Gols");
    expect(result.lines).toContain("Ronaldo - 1+ Cartão");

    // Remove todos os labels isolados
    expect(result.lines).not.toContain("Gols");
    expect(result.lines).not.toContain("Chutes");
    expect(result.lines).not.toContain("Cartões");
    expect(result.lines).not.toContain("Passes");
  });

  test("Combina filtro de labels com deduplicação", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Nikola Jokic - 10+ Rebotes
Nikola Jokic - 10+ Rebotes
Rebotes
Rebotes
Assistências`,
    };

    const result = normalizeOcr(input);

    // Deve ter exatamente 1 linha (aposta dedupada, labels removidos)
    expect(result.lines.length).toBe(1);
    expect(result.lines[0]).toBe("Nikola Jokic - 10+ Rebotes");
  });
});
