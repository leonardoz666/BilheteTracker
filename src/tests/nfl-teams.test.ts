// @ts-nocheck
/// <reference types="jest" />
/**
 * Testes para validar o dicionário de times NFL
 */

import {
  NFL_CURRENT_TEAMS,
  NFL_TEAM_ALIASES,
  NFL_ABBREVIATIONS,
  normalizeNFLTeam,
  findOtherFootballTeam,
} from "../constants/nfl-teams";

describe("Dicionário de Times NFL", () => {
  test("Contém os 32 times atuais da NFL", () => {
    expect(NFL_CURRENT_TEAMS.length).toBe(32);
  });

  test("Todos os times atuais têm nomes únicos", () => {
    const teamSet = new Set(NFL_CURRENT_TEAMS);
    expect(teamSet.size).toBe(NFL_CURRENT_TEAMS.length);
  });

  test("Normaliza nomes completos", () => {
    expect(normalizeNFLTeam("Kansas City Chiefs")).toBe("Kansas City Chiefs");
    expect(normalizeNFLTeam("Buffalo Bills")).toBe("Buffalo Bills");
    expect(normalizeNFLTeam("New York Giants")).toBe("New York Giants");
  });

  test("Normaliza case-insensitive", () => {
    expect(normalizeNFLTeam("kansas city chiefs")).toBe("Kansas City Chiefs");
    expect(normalizeNFLTeam("BUFFALO BILLS")).toBe("Buffalo Bills");
  });

  test("Normaliza aliases comuns", () => {
    expect(normalizeNFLTeam("KC")).toBe("Kansas City Chiefs");
    expect(normalizeNFLTeam("KC Chiefs")).toBe("Kansas City Chiefs");
    expect(normalizeNFLTeam("BUF")).toBe("Buffalo Bills");
    expect(normalizeNFLTeam("DAL")).toBe("Dallas Cowboys");
  });

  test("Normaliza nomes antigos (relocação)", () => {
    expect(normalizeNFLTeam("Oakland Raiders")).toBe("Las Vegas Raiders");
    expect(normalizeNFLTeam("St. Louis Rams")).toBe("Los Angeles Rams");
    expect(normalizeNFLTeam("Washington Redskins")).toBe("Washington Commanders");
  });

  test("Normaliza variações comuns", () => {
    expect(normalizeNFLTeam("Chiefs")).toBe("Kansas City Chiefs");
    expect(normalizeNFLTeam("Cowboys")).toBe("Dallas Cowboys");
    expect(normalizeNFLTeam("49ers")).toBe("San Francisco 49ers");
    expect(normalizeNFLTeam("Packers")).toBe("Green Bay Packers");
  });

  test("Retorna undefined para times inválidos", () => {
    expect(normalizeNFLTeam("Fake Team")).toBeUndefined();
    expect(normalizeNFLTeam("")).toBeUndefined();
    expect(normalizeNFLTeam("XYZ")).toBeUndefined();
  });

  test("Normaliza abreviações oficiais", () => {
    expect(normalizeNFLTeam("GB")).toBe("Green Bay Packers");
    expect(normalizeNFLTeam("SF")).toBe("San Francisco 49ers");
    expect(normalizeNFLTeam("TB")).toBe("Tampa Bay Buccaneers");
    expect(normalizeNFLTeam("NE")).toBe("New England Patriots");
  });

  test("Encontra times de outras ligas", () => {
    // CFL
    expect(findOtherFootballTeam("Toronto Argonauts")).toBeDefined();
    expect(findOtherFootballTeam("Toronto Argonauts")?.league).toBe("CFL");

    // UFL
    expect(findOtherFootballTeam("Arlington Renegades")).toBeDefined();
    expect(findOtherFootballTeam("Arlington Renegades")?.league).toBe("UFL");

    // ELF
    expect(findOtherFootballTeam("Berlin Thunder")).toBeDefined();
    expect(findOtherFootballTeam("Berlin Thunder")?.league).toBe("ELF");
  });

  test("Não encontra times NFL em findOtherFootballTeam", () => {
    expect(findOtherFootballTeam("Kansas City Chiefs")).toBeUndefined();
    expect(findOtherFootballTeam("Buffalo Bills")).toBeUndefined();
  });

  test("Validar cobertura de siglas comuns", () => {
    const siglasComuns = ["KC", "DAL", "GB", "SF", "NE", "BUF", "NYJ", "NYG", "PHI"];
    
    siglasComuns.forEach(sigla => {
      expect(normalizeNFLTeam(sigla)).toBeDefined();
    });
  });

  test("Todas as conferências estão representadas", () => {
    const afcEast = ["Buffalo Bills", "Miami Dolphins", "New England Patriots", "New York Jets"];
    const nfcWest = ["Arizona Cardinals", "Los Angeles Rams", "San Francisco 49ers", "Seattle Seahawks"];

    afcEast.forEach(team => {
      expect(NFL_CURRENT_TEAMS).toContain(team);
    });

    nfcWest.forEach(team => {
      expect(NFL_CURRENT_TEAMS).toContain(team);
    });
  });
});
