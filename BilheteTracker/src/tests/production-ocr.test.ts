// @ts-nocheck
/// <reference types="jest" />
import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";
import { defaultLlmClient } from "../utils/llmClient";

describe("Production OCR Cases", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("Juventus x Pafos OCR: não deve gerar 'Total Gols' como player_prop", async () => {
    const lines = [
      "Juventus x Pafos",
      "© Vencedor do 1° Tempo - Juventus",
      "• Total Gols - Mais de 25",
      "• Francisco Conceição (JUV) - Chutar a Gol",
      "Cotação total",
      "Aposta",
      "GANHO POTENCIAL",
      "2.80",
      "R$ 5,00",
      "R$ 14,00"
    ];
    
    // Restore console to see output
    jest.restoreAllMocks();
    
    const result = await semanticTicketLLM({ lines }, defaultLlmClient as any);
    
    console.log("\n=== APOSTAS DETECTADAS ===");
    result.apostasDetalhadas.forEach((a, i) => {
      console.log(`${i+1}. tipo=${a.tipo}, jogador=${a.jogador}, estatistica=${a.estatistica}, condicao=${a.condicao}`);
    });
    
    // Deve ter 3 apostas válidas
    expect(result.apostasDetalhadas.length).toBeGreaterThanOrEqual(3);
    
    // Deve ter "Total Gols" como match_prop (NOT player_prop com jogador="Total")
    const gols = result.apostasDetalhadas.find(a => 
      (a.estatistica === "Total Gols" || a.estatistica === "Gols") && a.tipo === "match_prop"
    );
    expect(gols).toBeDefined();
    expect(gols?.condicao).toBeDefined();
    
    // NÃO deve ter "Total" como jogador
    const totalAsJogador = result.apostasDetalhadas.find(a =>
      a.jogador && a.jogador.toLowerCase().includes("total")
    );
    expect(totalAsJogador).toBeUndefined();
    
    // Deve ter Francisco Conceição como player_prop
    const francisco = result.apostasDetalhadas.find(a =>
      a.jogador?.includes("Francisco") && a.tipo === "player_prop"
    );
    expect(francisco).toBeDefined();
    expect(francisco?.estatistica).toBe("Chutar a Gol");
  });
});
