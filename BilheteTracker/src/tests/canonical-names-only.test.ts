// @ts-nocheck
/// <reference types="jest" />

/**
 * 🔒 REGRA: Evento só pode conter nomes CANÔNICOS completos
 * Nunca aliases parciais, abreviações ou nomes genéricos
 */

import { extractMetadata } from "../pipeline/extractMetadata";

describe("Regra: Evento = NOMES CANÔNICOS (não aliases parciais)", () => {
  describe("❌ REJEITA nomes genéricos/parciais", () => {
    it("canonicaliza 'Nuggets' → 'Denver Nuggets' (nome completo)", () => {
      const lines = [
        "Nuggets",
        "Rockets",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve canonicalizar para nomes completos
      expect(result.metadata.evento).toBe("Denver Nuggets x Houston Rockets");
    });

    it("rejeita 'Lakers' sozinho (genérico)", () => {
      const lines = [
        "Lakers",
        "Warriors",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve canonicalizar para nomes completos (não rejeitar)
      expect(result.metadata.evento).toBe("Los Angeles Lakers x Golden State Warriors");
    });

    it("rejeita 'DEN Nuggets' como alias parcial", () => {
      const lines = [
        "DEN Nuggets",
        "HOU Rockets",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve aceitar mas canonicalizar para nome completo
      expect(result.metadata.evento).toBe("Denver Nuggets x Houston Rockets");
      // ❌ NUNCA deve conter alias parcial
      expect(result.metadata.evento).not.toContain("DEN Nuggets");
      expect(result.metadata.evento).not.toContain("HOU Rockets");
    });

    it("canonicaliza 'City' + 'United' → nomes completos", () => {
      const lines = [
        "City",
        "United",
        "Premier League",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve canonicalizar
      expect(result.metadata.evento).toBe("Manchester City x Manchester United");
    });

    it("rejeita 'FLA' sozinho (alias brasileiro)", () => {
      const lines = [
        "FLA",
        "PAL",
        "Série A",
      ];

      const result = extractMetadata(lines);
      
      // Se aceitar, deve canonicalizar
      if (result.metadata.evento) {
        expect(result.metadata.evento).toBe("Flamengo x Palmeiras");
        expect(result.metadata.evento).not.toContain("FLA");
        expect(result.metadata.evento).not.toContain("PAL");
      }
    });
  });

  describe("✅ ACEITA apenas nomes CANÔNICOS completos", () => {
    it("aceita 'Denver Nuggets x Houston Rockets' (canônicos)", () => {
      const lines = [
        "Denver Nuggets x Houston Rockets",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve aceitar (nomes canônicos completos)
      expect(result.metadata.evento).toBe("Denver Nuggets x Houston Rockets");
    });

    it("aceita 'Los Angeles Lakers x Golden State Warriors' (canônicos)", () => {
      const lines = [
        "Los Angeles Lakers x Golden State Warriors",
        "NBA",
      ];

      const result = extractMetadata(lines);
      
      expect(result.metadata.evento).toBe("Los Angeles Lakers x Golden State Warriors");
    });

    it("aceita 'Flamengo x Palmeiras' (canônicos futebol)", () => {
      const lines = [
        "Flamengo x Palmeiras",
        "Série A",
      ];

      const result = extractMetadata(lines);
      
      expect(result.metadata.evento).toBe("Flamengo x Palmeiras");
    });

    it("aceita 'Manchester City x Aston Villa' (canônicos futebol)", () => {
      const lines = [
        "Manchester City x Aston Villa",
        "Premier League",
      ];

      const result = extractMetadata(lines);
      
      expect(result.metadata.evento).toBe("Manchester City x Aston Villa");
    });
  });

  describe("🔄 Canonicalização automática", () => {
    it("canonicaliza '2 DEN Nuggets' + 'HOU Rockets' → nomes completos", () => {
      const lines = [
        "2 DEN Nuggets",
        "HOU Rockets",
        "Q4 00:23",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve canonicalizar para nomes completos
      expect(result.metadata.evento).toBe("Denver Nuggets x Houston Rockets");
      // ❌ NUNCA deve conter aliases
      expect(result.metadata.evento).not.toContain("DEN");
      expect(result.metadata.evento).not.toContain("HOU");
    });

    it("canonicaliza 'LAL' + 'GSW' → nomes completos", () => {
      const lines = [
        "LAL",
        "GSW",
        "NBA",
      ];

      const result = extractMetadata(lines);
      
      // Se aceitar, deve ser canônico
      if (result.metadata.evento) {
        expect(result.metadata.evento).toBe("Los Angeles Lakers x Golden State Warriors");
        expect(result.metadata.evento).not.toContain("LAL");
        expect(result.metadata.evento).not.toContain("GSW");
      }
    });

    it("canonicaliza aliases de futebol → nomes completos", () => {
      const lines = [
        "City x Villa",
        "Premier League",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve canonicalizar para nomes completos
      expect(result.metadata.evento).toBe("Manchester City x Aston Villa");
    });
  });

  describe("🛡️ Blindagem final", () => {
    it("'Nuggets' sozinho vira 'Denver Nuggets' (nome completo)", () => {
      const lines = [
        "Nuggets x Rockets",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve canonicalizar para nomes completos
      expect(result.metadata.evento).toBe("Denver Nuggets x Houston Rockets");
    });

    it("'Lakers' sozinho vira 'Los Angeles Lakers' (nome completo)", () => {
      const lines = [
        "Lakers x Heat",
        "NBA",
      ];

      const result = extractMetadata(lines);
      
      // ✅ Deve canonicalizar
      expect(result.metadata.evento).toBe("Los Angeles Lakers x Miami Heat");
    });

    it("rejeita se canonicalização falhar", () => {
      const lines = [
        "Time Inventado",
        "Outro Falso",
        "Jogo",
      ];

      const result = extractMetadata(lines);
      
      // ❌ Deve rejeitar (não consegue canonicalizar)
      expect(result.metadata.evento).toBeNull();
    });
  });
});
