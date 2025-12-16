import { extractMetadata } from "../src/pipeline/extractMetadata";

/**
 * Teste: Simulando cenários onde OCR pode juntar linhas
 * e fazer "2.75" parecer um valor apostado
 */

function testFragmentedOcr275() {
  console.log("🧪 Teste: OCR Fragmentado com 2.75\n");

  const testCases = [
    {
      name: "Caso 1: Dados bem-separados (normal)",
      lines: [
        "Mais de 2.75",
        "R$ 5.50",
        "R$ 18.98",
      ],
      expectedValor: 5.5,
      expectedOdd: 3.45,
    },
    {
      name: "Caso 2: Dados juntos (2.75 depois de número)",
      lines: [
        "3.5 2.75",        // OCR juntou linhas
        "R$ 5.50",
        "R$ 18.98",
      ],
      expectedValor: 5.5,  // Deveria ser 5.5, não 2.75
      expectedOdd: 3.45,
    },
    {
      name: "Caso 3: Sem R$ prefix (apenas número)",
      lines: [
        "Mais de",
        "2.75",             // Sem R$
        "5.50",             // Sem R$
        "18.98",            // Sem R$
      ],
      expectedValor: null, // Nenhum com R$ - problema!
      expectedOdd: null,
    },
    {
      name: "Caso 4: Números isolados (pior caso)",
      lines: [
        "2.75",
        "5.50",
        "18.98",
      ],
      expectedValor: 5.5,  // Problema: 2.75 pode ser capturado!
      expectedOdd: null,
    },
  ];

  testCases.forEach(testCase => {
    console.log(`\n📝 ${testCase.name}`);
    console.log(`   Linhas: [${testCase.lines.map(l => `"${l}"`).join(", ")}]`);

    const result = extractMetadata(testCase.lines);

    console.log(`   ✓ valorApostado: ${result.metadata.valorApostado}`);
    console.log(`   ✓ odd: ${result.metadata.odd}`);
    console.log(`   ✓ retorno: ${result.metadata.retornoPotencial}`);

    if (result.metadata.valorApostado === 2.75) {
      console.log(`   ⚠️  AVISO: 2.75 foi capturado como valor apostado!`);
    }
  });
}

testFragmentedOcr275();
