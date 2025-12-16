import { extractMetadata } from "../src/pipeline/extractMetadata";

/**
 * Teste: Verificar qual estratégia está capturando a odd
 */

function debugWhichStrategy() {
  console.log("🔍 DEBUG: Qual estratégia captura cada odd?\n");

  const testCases = [
    {
      name: "Teste 1: Odds juntadas + Aposta real",
      lines: [
        "Ambas equipes Marcam: Sim & Total de 2.75 3.45",
        "Gols Mais/Menos: Mais de 3.5",
        "R$5,50",
        "R$ 18,98",
      ],
      expected: 3.5,
    },
    {
      name: "Teste 2: Apenas odds juntadas",
      lines: ["Ambas equipes Marcam: Sim & Total de 2.75 3.45", "R$5,50", "R$ 18,98"],
      expected: 3.45,
    },
    {
      name: "Teste 3: Apenas aposta sem odds",
      lines: [
        "Gols Mais/Menos: Mais de 3.5",
        "R$5,50",
        "R$ 18,98",
      ],
      expected: 3.5,
    },
    {
      name: "Teste 4: Dois números isolados",
      lines: ["2.75 3.45", "R$5,50", "R$ 18,98"],
      expected: 3.45,
    },
  ];

  testCases.forEach(test => {
    const result = extractMetadata(test.lines);
    const passed = result.metadata.odd === test.expected;
    const status = passed ? "✅" : "❌";

    console.log(`${status} ${test.name}`);
    console.log(`   Linhas: ${test.lines.length} linhas`);
    console.log(`   Esperado: ${test.expected}`);
    console.log(`   Obtido:   ${result.metadata.odd}`);
    console.log();
  });
}

debugWhichStrategy();
