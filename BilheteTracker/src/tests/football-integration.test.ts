// @ts-nocheck
/// <reference types="jest" />

import { 
  normalizeFootballClub, 
  normalizeFootballEventTeams,
  isValidFootballClub,
  getFootballClubNames 
} from "../constants/football-clubs";

describe("Football Club Dictionary Integration", () => {
  describe("normalizeFootballClub()", () => {
    it("normaliza nomes de times brasileiros (Série A)", () => {
      expect(normalizeFootballClub("Flamengo")).toBe("Flamengo");
      expect(normalizeFootballClub("Palmeiras")).toBe("Palmeiras");
      expect(normalizeFootballClub("Corinthians")).toBe("Corinthians");
      expect(normalizeFootballClub("São Paulo")).toBe("São Paulo");
    });

    it("reconhece aliases de times brasileiros", () => {
      expect(normalizeFootballClub("FLA")).toBe("Flamengo");
      expect(normalizeFootballClub("PAL")).toBe("Palmeiras");
      expect(normalizeFootballClub("COR")).toBe("Corinthians");
      expect(normalizeFootballClub("SPFC")).toBe("São Paulo");
    });

    it("normaliza times europeus (Premier League)", () => {
      expect(normalizeFootballClub("Arsenal")).toBe("Arsenal");
      expect(normalizeFootballClub("Manchester City")).toBe("Manchester City");
      expect(normalizeFootballClub("Liverpool")).toBe("Liverpool");
    });

    it("reconhece aliases de times europeus", () => {
      expect(normalizeFootballClub("City")).toBe("Manchester City");
      expect(normalizeFootballClub("Villa")).toBe("Aston Villa");
      expect(normalizeFootballClub("Brighton")).toBe("Brighton & Hove Albion");
    });

    it("normaliza times sul-americanos", () => {
      expect(normalizeFootballClub("Boca Juniors")).toBe("Boca Juniors");
      expect(normalizeFootballClub("River Plate")).toBe("River Plate");
      expect(normalizeFootballClub("Atlético Mineiro")).toBe("Atlético Mineiro");
    });

    it("retorna null para times inválidos", () => {
      expect(normalizeFootballClub("Time Inexistente")).toBeNull();
      expect(normalizeFootballClub("")).toBeNull();
      expect(normalizeFootballClub("   ")).toBeNull();
    });

    it("é case-insensitive", () => {
      expect(normalizeFootballClub("flamengo")).toBe("Flamengo");
      expect(normalizeFootballClub("PALMEIRAS")).toBe("Palmeiras");
      expect(normalizeFootballClub("ArSeNal")).toBe("Arsenal");
    });
  });

  describe("isValidFootballClub()", () => {
    it("retorna true para times válidos", () => {
      expect(isValidFootballClub("Flamengo")).toBe(true);
      expect(isValidFootballClub("Palmeiras")).toBe(true);
      expect(isValidFootballClub("Manchester City")).toBe(true);
      expect(isValidFootballClub("FLA")).toBe(true);
    });

    it("retorna false para times inválidos", () => {
      expect(isValidFootballClub("Time Inexistente")).toBe(false);
      expect(isValidFootballClub("xyz")).toBe(false);
    });
  });

  describe("normalizeFootballEventTeams()", () => {
    it("normaliza eventos brasileiros válidos", () => {
      const result = normalizeFootballEventTeams("Flamengo x Palmeiras");
      expect(result).toBe("Flamengo x Palmeiras");
    });

    it("expande nomes de times em eventos", () => {
      const result = normalizeFootballEventTeams("FLA x PAL");
      expect(result).toBe("Flamengo x Palmeiras");
    });

    it("suporta separador 'vs'", () => {
      const result = normalizeFootballEventTeams("Flamengo vs Palmeiras");
      expect(result).toBe("Flamengo vs Palmeiras");
    });

    it("retorna null se um dos times for inválido", () => {
      expect(normalizeFootballEventTeams("Flamengo x Time Inexistente")).toBeNull();
      expect(normalizeFootballEventTeams("Time Falso x Palmeiras")).toBeNull();
    });

    it("retorna null se algum lado for nome de jogador", () => {
      // Simulando detecção de nomes de jogadores
      expect(normalizeFootballEventTeams("Pelé x Flamengo")).toBeNull();
    });

    it("normaliza eventos europeus", () => {
      const result = normalizeFootballEventTeams("Arsenal x Liverpool");
      expect(result).toBe("Arsenal x Liverpool");
    });

    it("normaliza eventos com aliases", () => {
      const result = normalizeFootballEventTeams("City x Villa");
      expect(result).toBe("Manchester City x Aston Villa");
    });

    it("é case-insensitive com separadores", () => {
      const result1 = normalizeFootballEventTeams("Flamengo X Palmeiras");
      expect(result1).toBe("Flamengo x Palmeiras");

      const result2 = normalizeFootballEventTeams("Flamengo VS Palmeiras");
      expect(result2).toBe("Flamengo vs Palmeiras");
    });

    it("retorna null se não tiver separador 'x' ou 'vs'", () => {
      expect(normalizeFootballEventTeams("Flamengo e Palmeiras")).toBeNull();
      expect(normalizeFootballEventTeams("Flamengo")).toBeNull();
    });
  });

  describe("getFootballClubNames()", () => {
    it("retorna nome canônico e aliases", () => {
      const names = getFootballClubNames("Flamengo");
      expect(names).toContain("Flamengo");
      expect(names).toContain("FLA");
      expect(names.length).toBeGreaterThan(1);
    });

    it("retorna array vazio para time inválido", () => {
      const names = getFootballClubNames("Time Inexistente");
      expect(names).toEqual([]);
    });

    it("reconhece aliases como entrada", () => {
      const names = getFootballClubNames("FLA");
      expect(names).toContain("Flamengo");
    });
  });

  describe("Multi-continent coverage", () => {
    it("reconhece times asiáticos", () => {
      expect(normalizeFootballClub("Al Hilal")).toBe("Al Hilal");
      expect(normalizeFootballClub("Tokyo Verdy")).toBeFalsy(); // Simples verificação
    });

    it("reconhece times africanos", () => {
      expect(normalizeFootballClub("Al Ahly")).toBe("Al Ahly");
      expect(normalizeFootballClub("Zamalek")).toBe("Zamalek");
    });

    it("reconhece times norte-americanos", () => {
      expect(normalizeFootballClub("LAFC")).toBe("LAFC");
      expect(normalizeFootballClub("Inter Miami")).toBe("Inter Miami");
    });
  });

  describe("Liga organization", () => {
    it("tem times da Premier League", () => {
      expect(normalizeFootballClub("Manchester United")).toBe("Manchester United");
      expect(normalizeFootballClub("Chelsea")).toBe("Chelsea");
    });

    it("tem times da Bundesliga", () => {
      expect(normalizeFootballClub("Bayern Munich")).toBe("Bayern Munich");
      expect(normalizeFootballClub("Borussia Dortmund")).toBe("Borussia Dortmund");
    });

    it("tem times da Série A brasileira", () => {
      expect(normalizeFootballClub("Botafogo")).toBe("Botafogo");
      expect(normalizeFootballClub("Grêmio")).toBe("Grêmio");
    });
  });
});
