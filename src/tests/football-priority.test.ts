// @ts-nocheck
/// <reference types="jest" />
import { extractMetadata } from "../pipeline/extractMetadata";

describe("Football Priority Over Other Sports", () => {
  describe("✅ Hard gate: keywords + clube reconhecido", () => {
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

    test("Flamengo reconhecido + gols = Futebol", () => {
      const lines = [
        "Flamengo vence",
        "Total de gols Mais de 2.5",
        "Odd 1.85"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });
  });

  describe("✅ Hard gate: keywords + padrão x/versus (sem clube reconhecido)", () => {
    test("Time desconhecido x outro desconhecido + escanteios = Futebol", () => {
      const lines = [
        "Clube ABC x Clube XYZ",
        "Escanteios Mais de 8.5",
        "Odd 1.90"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("Padrão 'vs' com keywords = Futebol", () => {
      const lines = [
        "Time A vs Time B",
        "Ambas marcam Sim",
        "Odd 2.10"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });
  });

  describe("❌ Sem evidência positiva: scorer decide", () => {
    test("Keywords de futebol genéricas SEM clube/versus → não curto-circuita", () => {
      const lines = [
        "Escanteios Mais de 9.5",
        "Cartões amarelos",
        "Odd 2.50"
      ];

      const { metadata } = extractMetadata(lines);
      // Sem clube ou versus, não tem certeza → null ou outro esporte se houver
      expect(metadata.esporte).toBeNull();
    });

    test("'Gols' genérico sem clube/versus → scorer decide (pode detectar outro esporte)", () => {
      const lines = [
        "Total de gols no campeonato",
        "Mais de 100.5",
        "Odd 1.50"
      ];

      const { metadata } = extractMetadata(lines);
      // Pode ser null OU outro esporte se houver aliases
      // O importante é que NÃO faz curto-circuito para futebol
      expect(metadata.esporte).not.toBe("Futebol");
    });
  });

  describe("✅ Prioridade correta com times reconhecidos", () => {
    test("Real Madrid x Barcelona + gols = Futebol", () => {
      const lines = [
        "Real Madrid x Barcelona",
        "Total de Gols Mais de 2.5",
        "Odd 1.70"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("Chelsea x Arsenal + ambas marcam = Futebol", () => {
      const lines = [
        "Chelsea x Arsenal",
        "Ambas marcam: Sim",
        "Odd 1.95"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("Bayern x Dortmund + keywords múltiplas = Futebol", () => {
      const lines = [
        "Bayern x Dortmund",
        "Placar exato 2-1",
        "Escanteios mais de 8.5",
        "Odd 3.50"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("Liverpool x Manchester City + keywords = Futebol", () => {
      const lines = [
        "Liverpool x Manchester City",
        "Gols Mais de 3.5",
        "Ambas Marcam Sim",
        "Odd 2.10"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("PSG x Lyon + escanteios = Futebol", () => {
      const lines = [
        "PSG x Lyon",
        "Escanteios + Cartões",
        "Mais de 10.5 escanteios",
        "Odd 1.75"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("Manchester United x Tottenham + keywords português = Futebol", () => {
      const lines = [
        "Manchester United x Tottenham",
        "Total de gols: Mais de 2.5",
        "Ambas marcam: Sim",
        "Odd 2.00"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol");
    });

    test("Atlético de Madrid reconhecido + gols = Futebol", () => {
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

  describe("⚖️ Scorer decide quando não há gate de futebol", () => {
    test("NBA tem prioridade com times reconhecidos", () => {
      const lines = [
        "Lakers x Warriors",
        "Total Mais de 220.5",
        "Odd 1.90"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Basquete");
    });

    test("NFL reconhecido sem keywords ambíguas", () => {
      const lines = [
        "Kansas City Chiefs x Buffalo Bills",
        "Total de pontos Mais de 50.5",
        "Odd 1.85"
      ];

      const { metadata } = extractMetadata(lines);
      expect(metadata.esporte).toBe("Futebol Americano");
    });

    test("🔴 CASO CRÍTICO: Minnesota x Dallas com 'gols' → NFL (não futebol)", () => {
      const lines = [
        "Minnesota Timberwolves x Dallas Mavericks",
        "Total de gols Mais de 225.5",  // OCR errado: "gols" em vez de "pontos"
        "Odd 1.95"
      ];

      const { metadata } = extractMetadata(lines);
      // ✅ Com a Opção 1: keywords + sem clube futebol + sem versus = scorer decide
      // NBA tem score alto (2 times reconhecidos) → ganha
      expect(metadata.esporte).toBe("Basquete");
    });

    test("🔴 CASO CRÍTICO: 'Gols' ambíguo sem times/versus → scorer não assume futebol", () => {
      const lines = [
        "Recepções e Gols",  // Keywords ambíguas
        "Mais de 5.5",
        "Odd 2.10"
      ];

      const { metadata } = extractMetadata(lines);
      // Sem clube, sem versus → não curto-circuita para futebol
      expect(metadata.esporte).not.toBe("Futebol");
    });
  });
});
