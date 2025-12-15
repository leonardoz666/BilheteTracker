// @ts-nocheck
/// <reference types="jest" />

/**
 * 🔒 REGRA DE OURO: Evento NUNCA pode conter jogador
 * Evento = Time x Time (ou Competição/Partida genérica)
 * Jogador só existe dentro de aposta, nunca no evento
 */

import { extractMetadata } from "../pipeline/extractMetadata";

describe("Regra de Ouro: Evento = Time x Time (NUNCA jogador)", () => {
  describe("❌ REJEITA eventos com nomes de jogadores", () => {
    it("rejeita 'Jogador x Time'", () => {
      const lines = [
        "Nikola Jokic x Denver Nuggets",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ❌ Deve rejeitar (não é Time x Time)
      expect(result.metadata.evento).toBeNull();
    });

    it("rejeita 'Time x Jogador'", () => {
      const lines = [
        "Denver Nuggets x Nikola Jokic",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ❌ Deve rejeitar
      expect(result.metadata.evento).toBeNull();
    });

    it("rejeita 'Jogador x Jogador'", () => {
      const lines = [
        "Nikola Jokic x LeBron James",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ❌ Deve rejeitar
      expect(result.metadata.evento).toBeNull();
    });

    it("rejeita linhas de player prop com 'x' ou 'vs'", () => {
      const lines = [
        "Nikola Jokic - 10+ Assistências x Rebotes",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ❌ Deve rejeitar (é uma aposta, não evento)
      expect(result.metadata.evento).toBeNull();
    });

    it("rejeita linhas com estatísticas no 'evento'", () => {
      const lines = [
        "Nikola Jokic Assistências x Denver",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ❌ Deve rejeitar (contém estatística)
      expect(result.metadata.evento).toBeNull();
    });

    it("rejeita linhas com condições no 'evento'", () => {
      const lines = [
        "Denver x 10+ Pontos",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ❌ Deve rejeitar (contém condição de aposta)
      expect(result.metadata.evento).toBeNull();
    });

    it("rejeita linhas com períodos no 'evento'", () => {
      const lines = [
        "1º Quarto - Nikola Jokic x Denver",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ❌ Deve rejeitar (contém período + jogador)
      expect(result.metadata.evento).toBeNull();
    });
  });

  describe("✅ ACEITA apenas eventos Time x Time válidos", () => {
    it("aceita 'Time NBA x Time NBA'", () => {
      const lines = [
        "Denver Nuggets x Houston Rockets",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve aceitar (ambos times válidos)
      expect(result.metadata.evento).toBe("Denver Nuggets x Houston Rockets");
    });

    it("aceita 'Time Futebol x Time Futebol'", () => {
      const lines = [
        "Flamengo x Palmeiras",
        "Série A",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve aceitar
      expect(result.metadata.evento).toBe("Flamengo x Palmeiras");
    });

    it("aceita times em linhas separadas (ambos válidos)", () => {
      const lines = [
        "2 DEN Nuggets",
        "HOU Rockets",
        "Q4 00:23",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve aceitar (ambos times do dicionário)
      expect(result.metadata.evento).toBe("Denver Nuggets x Houston Rockets");
    });

    it("aceita times com aliases", () => {
      const lines = [
        "Lakers x Warriors",
        "NBA",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve aceitar e normalizar
      expect(result.metadata.evento).toBe("Los Angeles Lakers x Golden State Warriors");
    });
  });

  describe("🛡️ Blindagem contra fallback genérico", () => {
    it("NÃO aceita linha genérica sem times válidos do dicionário", () => {
      const lines = [
        "Time Inventado x Outro Time Falso",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ❌ Deve rejeitar (não são times do dicionário)
      expect(result.metadata.evento).toBeNull();
    });

    it("rejeita se apenas 1 lado for time válido", () => {
      const lines = [
        "Denver Nuggets x Time Inventado",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ❌ Deve rejeitar (um lado inválido)
      expect(result.metadata.evento).toBeNull();
    });

    it("rejeita linhas separadas se uma contiver jogador", () => {
      const lines = [
        "Nikola Jokic",
        "Denver Nuggets",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ❌ Deve rejeitar (primeira linha é jogador)
      expect(result.metadata.evento).toBeNull();
    });

    it("rejeita linhas separadas se nenhuma for time válido", () => {
      const lines = [
        "Texto qualquer",
        "Outro texto",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ❌ Deve rejeitar
      expect(result.metadata.evento).toBeNull();
    });
  });

  describe("🔍 Casos edge do mundo real", () => {
    it("caso real do usuário: DEN Nuggets + HOU Rockets ✅", () => {
      const lines = [
        "2 DEN Nuggets",
        "HOU Rockets",
        "Q4 00:23",
      ];

      const result = extractMetadata(lines);
      
      expect(result.metadata.evento).toBe("Denver Nuggets x Houston Rockets");
    });

    it("caso real bloqueado: Nikola Jokic x HOU Rockets ❌", () => {
      const lines = [
        "Nikola Jokic x HOU Rockets",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ❌ Deve rejeitar (jogador vs time)
      expect(result.metadata.evento).toBeNull();
    });

    it("não confunde player prop com evento", () => {
      const lines = [
        "Nikola Jokic - 10+ Assistências",
        "Denver Nuggets x Houston Rockets",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve pegar a segunda linha (Time x Time válido)
      expect(result.metadata.evento).toBe("Denver Nuggets x Houston Rockets");
    });
  });
});
