// @ts-nocheck
/// <reference types="jest" />

/**
 * Teste para validar parsing de eventos em linhas separadas
 * Cenário: "2 DEN Nuggets" + "HOU Rockets" (linhas separadas)
 */

import { extractMetadata } from "../pipeline/extractMetadata";

describe("extractEvento() - Linhas Separadas", () => {
  it("detecta evento NBA em linhas consecutivas com numerais", () => {
    const lines = [
      "01:594",
      "Minhas Apostas",
      "2 DEN Nuggets",
      "HOU Rockets",
      "Q4 00:23",
    ];

    const result = extractMetadata(lines);
    
    // Deve detectar evento normalizado
    expect(result.metadata.evento).toBe("Denver Nuggets x Houston Rockets");
  });

  it("detecta evento NBA em linhas separadas sem números", () => {
    const lines = [
      "Lakers",
      "Warriors",
      "Jogo",
    ];

    const result = extractMetadata(lines);
    
    expect(result.metadata.evento).toBe("Los Angeles Lakers x Golden State Warriors");
  });

  it("detecta evento de futebol em linhas separadas", () => {
    const lines = [
      "Flamengo",
      "Palmeiras",
      "Série A",
    ];

    const result = extractMetadata(lines);
    
    expect(result.metadata.evento).toBe("Flamengo x Palmeiras");
  });

  it("rejeita linhas separadas se uma for nome de jogador", () => {
    const lines = [
      "Nikola Jokic",
      "Denver Nuggets",
      "Jogo",
    ];

    const result = extractMetadata(lines);
    
    // Não deve detectar como evento válido
    expect(result.metadata.evento).toBeNull();
  });

  it("aceita linhas separadas com aliases de times", () => {
    const lines = [
      "City",
      "Villa",
      "Premier League",
    ];

    const result = extractMetadata(lines);
    
    // Deve normalizar usando aliases
    expect(result.metadata.evento).toBe("Manchester City x Aston Villa");
  });

  it("limpa numerais na frente de nomes de times", () => {
    const lines = [
      "1 Los Angeles Lakers",
      "2 Golden State Warriors",
      "NBA",
    ];

    const result = extractMetadata(lines);
    
    // Deve remover "1 " e "2 " antes de normalizar
    expect(result.metadata.evento).toBe("Los Angeles Lakers x Golden State Warriors");
  });

  it("prioriza eventos em linha única sobre linhas separadas", () => {
    const lines = [
      "Denver Nuggets x Houston Rockets",
      "Lakers",
      "Warriors",
    ];

    const result = extractMetadata(lines);
    
    // Deve pegar a primeira linha com " x "
    expect(result.metadata.evento).toBe("Denver Nuggets x Houston Rockets");
  });

  it("não detecta linhas separadas se nenhuma for time válido", () => {
    const lines = [
      "Texto aleatório",
      "Mais texto",
      "Jogo",
    ];

    const result = extractMetadata(lines);
    
    expect(result.metadata.evento).toBeNull();
  });

  it("detecta evento NBA com abreviações 2-3 caracteres", () => {
    const lines = [
      "DEN",
      "HOU",
      "Jogo",
    ];

    const result = extractMetadata(lines);
    
    // Deve normalizar abreviações
    expect(result.metadata.evento).toBe("Denver Nuggets x Houston Rockets");
  });

  it("não mistura times NBA com futebol", () => {
    const lines = [
      "Denver Nuggets",
      "Flamengo",
      "Evento",
    ];

    const result = extractMetadata(lines);
    
    // Não deveria criar evento misturando esportes
    expect(result.metadata.evento).toBeNull();
  });
});
