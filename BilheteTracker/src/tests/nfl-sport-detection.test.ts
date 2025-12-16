import { extractMetadata } from "../pipeline/extractMetadata";

describe("NFL Sport Detection", () => {
  test("Detecta 'Futebol Americano' quando evento contém times NFL", () => {
    const lines = [
      "Simples R$75,00",
      "ID: 8956985252",
      "Mais de 4.5",
      "[Stefon Diggs] Total de recepções",
      "New England Patriots x Buffalo Bills",
      "14/12/2025 15:00"
    ];

    const { metadata } = extractMetadata(lines);

    expect(metadata.esporte).toBe("Futebol Americano");
  });

  test("Detecta 'Futebol Americano' por aliases de times (ex.: Patriots, Bills)", () => {
    const lines = [
      "Simples R$100,00",
      "Patriots x Bills",
      "Josh Allen - Recepções Mais de 3.5"
    ];

    const { metadata } = extractMetadata(lines);

    expect(metadata.esporte).toBe("Futebol Americano");
  });

  test("Detecta 'Futebol Americano' por aliases de times (ex.: New England)", () => {
    const lines = [
      "Evento: New England x Buffalo",
      "Touchdowns Mais de 2.5"
    ];

    const { metadata } = extractMetadata(lines);

    expect(metadata.esporte).toBe("Futebol Americano");
  });

  test("Sem match de dicionário, esporte fica null", () => {
    const lines = [
      "Evento: Corrida de cavalos",
      "Vencedor: Cavalo Azul",
      "Odd 2.10"
    ];

    const { metadata } = extractMetadata(lines);

    expect(metadata.esporte).toBeNull();
  });

  test("Prioridade NBA sobre aliases NFL (Minnesota x Dallas)", () => {
    const lines = [
      "Minnesota Timberwolves x Dallas Mavericks",
      "Total de pontos Mais de 215.5"
    ];

    const { metadata } = extractMetadata(lines);

    expect(metadata.esporte).toBe("Basquete");
  });

  test("Alias fraco (cidade) sozinho não decide", () => {
    const lines = [
      "Dallas x Minnesota",
      "Jogo único"
    ];

    const { metadata } = extractMetadata(lines);

    expect(metadata.esporte).toBeNull();
  });

  test("MLB detecta time completo", () => {
    const lines = [
      "New York Yankees x Boston Red Sox",
      "Total de corridas Mais de 7.5"
    ];

    const { metadata } = extractMetadata(lines);

    expect(metadata.esporte).toBe("Beisebol");
  });
});
