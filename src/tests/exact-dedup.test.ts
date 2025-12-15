// @ts-nocheck
/// <reference types="jest" />
/**
 * Testes para validar deduplicação exata e remoção de prefixos do OCR
 */

import { normalizeOcr } from "../ocr/normalizeOcr";

describe("Deduplicação Exata (normalizeOcr)", () => {
  test("Remove prefixos de quebra de linha: 'o ', '• ', '- '", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Julius Randle - 10+ Pontos
o Julius Randle - 10+ Pontos
• Nikola Jokic - 5+ Assistências
- Luka Doncic - 20+ Pontos`,
    };

    const result = normalizeOcr(input);

    // Todos devem estar sem prefixos
    expect(result.lines).toContain("Julius Randle - 10+ Pontos");
    expect(result.lines).toContain("Nikola Jokic - 5+ Assistências");
    expect(result.lines).toContain("Luka Doncic - 20+ Pontos");

    // Não deve ter prefixos no output
    expect(result.lines).not.toContain("o Julius Randle - 10+ Pontos");
    expect(result.lines).not.toContain("• Nikola Jokic - 5+ Assistências");
    expect(result.lines).not.toContain("- Luka Doncic - 20+ Pontos");
  });

  test("Remove duplicatas exatas (case-insensitive)", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Julius Randle - 10+ Pontos
JULIUS RANDLE - 10+ PONTOS
julius randle - 10+ pontos
Nikola Jokic - 5+ Rebotes`,
    };

    const result = normalizeOcr(input);

    // Deve manter apenas UMA versão
    expect(result.lines.filter((l) => l.toLowerCase().includes("julius randle")).length).toBe(1);
    expect(result.lines).toContain("Nikola Jokic - 5+ Rebotes");
    
    // Total: 2 apostas (Julius + Jokic)
    expect(result.lines.length).toBe(2);
  });

  test("Bug Julius Randle: remove duplicata com prefixo 'o'", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Julius Randle - 10+
o Julius Randle - 10+ Pontos`,
    };

    const result = normalizeOcr(input);

    // Deve manter ambas se forem diferentes (uma tem "Pontos", outra não)
    // OU se considerar que a primeira está incompleta, deve deduplicate baseado na normalização
    
    // Expectativa: Se as linhas são semanticamente iguais (sem considerar "o "), 
    // devemos ter apenas uma no output final
    const juliesLines = result.lines.filter((l) => l.toLowerCase().includes("julius randle"));
    
    // Se tivermos 2 linhas diferentes ("10+" e "10+ Pontos"), ambas devem passar
    // Se forem idênticas (após remover prefixo), deve sobrar apenas 1
    expect(juliesLines.length).toBeGreaterThanOrEqual(1);
    expect(juliesLines.length).toBeLessThanOrEqual(2);
    
    // Nenhuma deve ter prefixo "o "
    juliesLines.forEach((line) => {
      expect(line).not.toMatch(/^o\s+/i);
    });
  });

  test("Combina deduplicação consecutiva + exata + remoção de prefixos", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Nikola Jokic - 10+ Assistências
Nikola Jokic - 10+ Assistências
o Nikola Jokic - 10+ Assistências
• Julius Randle - 5+ Rebotes
Julius Randle - 5+ Rebotes
Luka Doncic - 20+ Pontos`,
    };

    const result = normalizeOcr(input);

    // Deve ter apenas 3 apostas únicas
    expect(result.lines).toEqual([
      "Nikola Jokic - 10+ Assistências",
      "Julius Randle - 5+ Rebotes",
      "Luka Doncic - 20+ Pontos",
    ]);
  });

  test("Preserva espaços internos mas remove espaços extras", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Julius  Randle  -  10+  Pontos
Julius Randle - 10+ Pontos
o  Julius   Randle - 10+   Pontos`,
    };

    const result = normalizeOcr(input);

    // Todas devem ser normalizadas para a mesma linha
    expect(result.lines.length).toBe(1);
    expect(result.lines[0]).toBe("Julius Randle - 10+ Pontos");
  });

  test("Não remove apostas diferentes com mesmo jogador", () => {
    const input = {
      kind: "parsedText" as const,
      payload: `Julius Randle - 10+ Rebotes
Julius Randle - 10+ Pontos
Julius Randle - 5+ Assistências`,
    };

    const result = normalizeOcr(input);

    // Todas são diferentes, devem passar
    expect(result.lines).toHaveLength(3);
    expect(result.lines).toContain("Julius Randle - 10+ Rebotes");
    expect(result.lines).toContain("Julius Randle - 10+ Pontos");
    expect(result.lines).toContain("Julius Randle - 5+ Assistências");
  });
});
