import { semanticTicketLLM } from "../pipeline/semanticTicketLLM";

describe("NFL Stat Normalization", () => {
  test("Detecta Recepções com condição", async () => {
    const bilhete = `Josh Allen - Recepções Mais de 3.5`;

    const result = await semanticTicketLLM({ lines: bilhete.split("\n") });

    expect(result.apostasDetalhadas.length).toBeGreaterThan(0);
    const aposta = result.apostasDetalhadas[0];

    // ✅ Deveria reconhecer como "Recepções", NÃO "Gols"
    expect(aposta.estatistica).toBe("Recepções");
    expect(aposta.jogador).toBe("Josh Allen");
    expect(aposta.condicao).toContain("3.5");
    expect(aposta.tipo).toBe("player_prop");
  });

  test("Detecta Touchdowns", async () => {
    const bilhete = `Kyler Murray - Touchdowns Mais de 1.5`;

    const result = await semanticTicketLLM({ lines: bilhete.split("\n") });
    
    expect(result.apostasDetalhadas.length).toBeGreaterThan(0);
    const aposta = result.apostasDetalhadas[0];

    expect(aposta.estatistica).toBe("Touchdowns");
    expect(aposta.jogador).toBe("Kyler Murray");
  });
});
