// @ts-nocheck
/// <reference types="jest" />
import { extractMetadata } from "../pipeline/extractMetadata";

describe("Football Priority Over Other Sports", () => {
  test("PSV Eindhoven x Atlético de Madrid com Escanteios = Futebol", () => {
    const lines = [
      "PSV Eindhoven vs Atlético de Madrid",
      "Escanteios - Mais de 9.5",
      "Odd 1.85"
    ];

    const { metadata } = extractMetadata(lines);
    expect(metadata.esporte).toBe("Futebol");
  });

  test("Inter de Milão x Liverpool com Ambas Marcam = Futebol", () => {
    const lines = [
      "Inter de Milão x Liverpool",
      "Ambas Marcam - Sim / Total de Gols - Mais de 3.5",
      "R$ 5,50"
    ];

    const { metadata } = extractMetadata(lines);
    expect(metadata.esporte).toBe("Futebol");
  });

  test("Prioriza futebol quando há 'gols' + times de futebol", () => {
    const lines = [
      "Real Madrid x Barcelona",
      "Total de Gols Mais de 2.5",
      "Odd 1.70"
    ];

    const { metadata } = extractMetadata(lines);
    expect(metadata.esporte).toBe("Futebol");
  });

  test("Detecta 'ambas marcam' como keyword forte de futebol", () => {
    const lines = [
      "Chelsea x Arsenal",
      "Ambas marcam: Sim",
      "Odd 1.95"
    ];

    const { metadata } = extractMetadata(lines);
    expect(metadata.esporte).toBe("Futebol");
  });

  test("Keywords de futebol sobrepõem aliases fracos de outras ligas", () => {
    const lines = [
      "Bayern x Dortmund",
      "Placar exato 2-1",
      "Escanteios mais de 8.5",
      "Odd 3.50"
    ];

    const { metadata } = extractMetadata(lines);
    expect(metadata.esporte).toBe("Futebol");
  });

  test("Sem keywords de futebol, NBA tem prioridade quando há times NBA", () => {
    const lines = [
      "Lakers x Warriors",
      "Total Mais de 220.5",
      "Odd 1.90"
    ];

    const { metadata } = extractMetadata(lines);
    expect(metadata.esporte).toBe("Basquete");
  });

  test("Liverpool x Manchester City com keywords = Futebol", () => {
    const lines = [
      "Liverpool x Manchester City",
      "Gols Mais de 3.5",
      "Ambas Marcam Sim",
      "Odd 2.10"
    ];

    const { metadata } = extractMetadata(lines);
    expect(metadata.esporte).toBe("Futebol");
  });

  test("PSG x Lyon com múltiplas keywords de futebol", () => {
    const lines = [
      "PSG x Lyon",
      "Escanteios + Cartões",
      "Mais de 10.5 escanteios",
      "Odd 1.75"
    ];

    const { metadata } = extractMetadata(lines);
    expect(metadata.esporte).toBe("Futebol");
  });

  test("Times europeus com keywords de futebol em português", () => {
    const lines = [
      "Manchester United x Tottenham",
      "Total de gols: Mais de 2.5",
      "Ambas marcam: Sim",
      "Odd 2.00"
    ];

    const { metadata } = extractMetadata(lines);
    expect(metadata.esporte).toBe("Futebol");
  });

  test("Atlético de Madrid reconhecido corretamente", () => {
    const lines = [
      "Atlético de Madrid x Sevilla",
      "Placar final",
      "Gols Mais de 1.5",
      "Odd 1.60"
    ];

    const { metadata } = extractMetadata(lines);
    expect(metadata.esporte).toBe("Futebol");
  });
});
