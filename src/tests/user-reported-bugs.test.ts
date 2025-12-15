// @ts-nocheck
/// <reference types="jest" />
import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";
import { defaultLlmClient } from "../utils/llmClient";

describe("Debug: Erros reportados pelo usuário", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Delay entre testes para respeitar rate limit do Groq (3 req/min)
  const delayBetweenTests = async () => {
    await new Promise(resolve => setTimeout(resolve, 21000)); // 21 segundos
  };

  test.skip("Juventus: deve retornar Total Gols e não Francisco Conceição - Gols", async () => {
    const lines = [
      "Juventus x Pafos",
      "Vencedor do 1° Tempo - Juventus",
      "Total Gols - Mais de 2.5",
      "Francisco Conceição (JUV) - Chutar a Gol"
    ];
    
    // Restore console to see output
    jest.restoreAllMocks();
    
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    console.log("\n=== APOSTAS DETECTADAS ===");
    result.apostasDetalhadas.forEach((a, i) => {
      console.log(`${i+1}. tipo=${a.tipo}, jogador=${a.jogador}, estatistica=${a.estatistica}, condicao=${a.condicao}`);
    });
    
    // Deve ter Total Gols como match_prop
    const totalGols = result.apostasDetalhadas.find(a => 
      a.estatistica === "Gols" && a.tipo === "match_prop"
    );
    expect(totalGols).toBeDefined();
    expect(totalGols?.condicao).toContain("2.5");
    
    // NÃO deve ter "Francisco Conceição - Gols" como player_prop
    const invalidGols = result.apostasDetalhadas.find(a =>
      a.jogador?.includes("Francisco") && a.estatistica === "Gols"
    );
    expect(invalidGols).toBeUndefined();
    
    // DEVE ter a aposta do Francisco Conceição com Chutes/Chutar
    const franciscoChutes = result.apostasDetalhadas.find(a =>
      a.jogador?.includes("Francisco") && (
        a.estatistica?.toLowerCase().includes("chut") ||
        a.estatistica?.toLowerCase().includes("gol")
      )
    );
    expect(franciscoChutes).toBeDefined();
    expect(franciscoChutes?.tipo).toBe("player_prop");

    // Aguardar antes do próximo teste (rate limit)
    await delayBetweenTests();
  });

  test.skip("Jokic: NÃO deve criar aposta 'Jogador - Rebotes'", async () => {
    const lines = [
      "Nikola Jokic - 10+ Assistências",
      "Nikola Jokic - 10+ Rebotes",
      "1º Quarto - Nikola Jokic - 1+ Rebotes"
    ];
    
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    console.log("\n=== APOSTAS DETECTADAS ===");
    result.apostasDetalhadas.forEach((a, i) => {
      console.log(`${i+1}. tipo=${a.tipo}, jogador=${a.jogador}, estatistica=${a.estatistica}, condicao=${a.condicao}, periodo=${a.periodo}`);
    });
    
    // Deve ter exatamente 3 apostas
    expect(result.apostasDetalhadas.length).toBe(3);
    
    // NÃO deve ter aposta com jogador = "Jogador"
    const invalidAposta = result.apostasDetalhadas.find(a =>
      a.jogador === "Jogador"
    );
    expect(invalidAposta).toBeUndefined();

    // Aguardar antes do próximo teste (rate limit)
    await delayBetweenTests();
  });

  test("Jokic: rejeita 'Jogador - Rebotes' como inválido", async () => {
    const lines = [
      "Nikola Jokic - 10+ Assistências",
      "Nikola Jokic - 10+ Rebotes",
      "1º Quarto - Nikola Jokic - 1+ Rebotes",
      "Jogador - Rebotes"  // ❌ Inválido - placeholder genérico
    ];
    
    jest.restoreAllMocks();
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    console.log("\n=== APOSTAS DETECTADAS ===");
    result.apostasDetalhadas.forEach((a, i) => {
      console.log(`${i+1}. tipo=${a.tipo}, jogador=${a.jogador}, estatistica=${a.estatistica}, condicao=${a.condicao}`);
    });
    
    // NÃO deve ter aposta com jogador = "Jogador"
    const invalidAposta = result.apostasDetalhadas.find(a =>
      a.jogador === "Jogador" || a.jogador?.includes("Jogador")
    );
    expect(invalidAposta).toBeUndefined();
    
    // Deve ter exatamente 3 apostas (sem o "Jogador - Rebotes" inválido)
    expect(result.apostasDetalhadas.length).toBe(3);
    
    // Todas apostas válidas devem ter Jokic
    result.apostasDetalhadas.forEach(a => {
      if (a.jogador) {
        expect(a.jogador).toContain("Jokic");
      }
    });
  });

  test("BackTrack: rejeita 'Período - Estatística' sem jogador (labels de UI)", async () => {
    // Caso real do BackTrack: linha vem como "1º Quarto - Rebotes" (label de UI)
    // NÃO deve ser parseada como aposta válida
    const lines = [
      "Nikola Jokic - 10+ Assistências",
      "Assistências",  // Label UI separado
      "Nikola Jokic - 10+ Rebotes",
      "Rebotes",  // Label UI separado
      "1º Quarto - Nikola Jokic - 1+ Rebotes",
      "1º Quarto - Rebotes"  // ❌ Label UI do BackTrack (período + estatística, SEM jogador)
    ];
    
    jest.restoreAllMocks();
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    console.log("\n=== APOSTAS DETECTADAS (BackTrack) ===");
    result.apostasDetalhadas.forEach((a, i) => {
      console.log(`${i+1}. tipo=${a.tipo}, jogador=${a.jogador}, estatistica=${a.estatistica}, condicao=${a.condicao}, periodo=${a.periodo}`);
    });
    
    // NÃO pode ter apostas com jogador=null (labels de UI)
    const invalidApostas = result.apostasDetalhadas.filter(a =>
      a.tipo === "player_prop" && (!a.jogador || a.jogador.trim().length === 0)
    );
    expect(invalidApostas).toHaveLength(0);
    
    // Deve ter exatamente 3 apostas válidas (Jokic com 3 stats)
    expect(result.apostasDetalhadas.length).toBe(3);
    
    // Todas apostas devem ter jogador = Jokic
    result.apostasDetalhadas.forEach(a => {
      expect(a.jogador).toContain("Jokic");
    });
  });
});