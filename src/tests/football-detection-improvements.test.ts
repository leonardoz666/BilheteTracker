// @ts-nocheck
/// <reference types="jest" />

import { extractMetadata } from "../pipeline/extractMetadata";
import { normalizeFootballClub } from "../constants/football-clubs";

describe("Football Detection Improvements", () => {
  describe("Require positive football evidence", () => {
    test("Detecta futebol com time + keywords (gols)", () => {
      const lines = [
        "Flamengo x Palmeiras",
        "Total de gols: Mais de 2.5",
        "Odd 1.85"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("Detecta futebol com time + keywords (escanteios)", () => {
      const lines = [
        "Arsenal x Liverpool",
        "Escanteios FT O/U 9.5",
        "Odd 1.90"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("NÃO detecta futebol sem keywords mesmo com time válido", () => {
      const lines = [
        "Real Madrid",
        "Vencedor do campeonato",
        "Odd 3.50"
      ];

      const { metadata } = extractMetadata(lines);
      // Sem keywords de futebol, não detecta
      expect(metadata.esporte).toBeNull();
    });
  });

  describe("Gate football detection on keywords", () => {
    test("Aceita com keyword 'placar'", () => {
      const lines = [
        "Barcelona x Sevilla",
        "Placar exato 2-1",
        "Odd 8.50"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("Aceita com keyword 'cartões'", () => {
      const lines = [
        "Chelsea x Manchester City",
        "Cartões amarelos Mais de 3.5",
        "Odd 2.10"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("Aceita com keyword 'chutes'", () => {
      const lines = [
        "Bayern x Dortmund",
        "Chutes a gol Mais de 15.5",
        "Odd 1.75"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("Aceita com keyword 'defesas'", () => {
      const lines = [
        "PSG x Lyon",
        "Defesas do goleiro Mais de 4.5",
        "Odd 1.95"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });
  });

  describe("Prefer football sport detection", () => {
    test("Prioriza NBA quando há times NBA válidos", () => {
      const lines = [
        "Lakers x Warriors",
        "Total de pontos Mais de 220.5",
        "Odd 1.90"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Basquete");
    });

    test("Detecta futebol mesmo com palavras ambíguas", () => {
      const lines = [
        "City x United",
        "Total de gols Mais de 2.5",
        "Odd 1.85"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });
  });

  describe("Football aliases for Inter de Milão and Pafos", () => {
    test("Reconhece 'Inter de Milão' como alias", () => {
      expect(normalizeFootballClub("Inter de Milão")).toBe("Inter Milan");
    });

    test("Reconhece 'Inter Milano' como alias", () => {
      expect(normalizeFootballClub("Inter Milano")).toBe("Inter Milan");
    });

    test("Reconhece 'Inter' como alias (já existia)", () => {
      expect(normalizeFootballClub("Inter")).toBe("Inter Milan");
    });

    test("Reconhece 'Pafos' como alias", () => {
      expect(normalizeFootballClub("Pafos")).toBe("Pafos FC");
    });

    test("Reconhece 'Pafos FC'", () => {
      expect(normalizeFootballClub("Pafos FC")).toBe("Pafos FC");
    });

    test("Detecta evento com Inter de Milão", () => {
      const lines = [
        "Inter de Milão x Juventus",
        "Total de gols Mais de 2.5",
        "Odd 1.90"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("Detecta evento com Pafos", () => {
      const lines = [
        "Pafos x APOEL",
        "Resultado final: Pafos",
        "Placar final",
        "Odd 2.20"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });
  });

  describe("Tweak sport inference", () => {
    test("Não confunde times de futebol com NBA (City vs palavra-chave)", () => {
      const lines = [
        "Manchester City x Arsenal",
        "Ambas marcam: Sim",
        "Gols",
        "Odd 1.75"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("Keywords fortes evitam falsos positivos", () => {
      const lines = [
        "Flamengo",
        "Estatísticas gerais",
        "Análise de desempenho"
      ];

      const { metadata } = extractMetadata(lines);
      // Sem keyword forte de futebol
      expect(metadata.esporte).toBeNull();
    });

    test("Combina múltiplas keywords de futebol", () => {
      const lines = [
        "Real Madrid x Barcelona",
        "Gols, escanteios e faltas",
        "Mais de 8.5 escanteios",
        "Odd 1.85"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });
  });

  describe("Edge cases", () => {
    test("Não detecta futebol apenas com keywords sem times", () => {
      const lines = [
        "Total de gols no campeonato",
        "Mais de 2.5 por jogo",
        "Odd 1.50"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBeNull();
    });

    test("Times de outras ligas têm prioridade sobre futebol sem keywords", () => {
      const lines = [
        "Lakers x Celtics",
        "Vencedor",
        "Odd 2.10"
      ];

      const { metadata } = extractMetadata(lines);
      // NBA tem prioridade por ter score mais alto
      expect(metadata.esporte).toBe("Basquete");
    });

    test("Múltiplos times de futebol com keywords", () => {
      const lines = [
        "Simples",
        "Flamengo x Corinthians",
        "Palmeiras x São Paulo",
        "Gols Mais de 2.5 em cada",
        "Odd 3.50"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });
  });
});
