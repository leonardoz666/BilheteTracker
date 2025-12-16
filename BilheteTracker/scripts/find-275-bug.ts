import { extractMetadata } from "../src/pipeline/extractMetadata";

/**
 * Teste final: Buscar o cenário exato onde 2.75 é capturado
 * 
 * Hipóteses:
 * 1. OCR retorna linhas sem "Mais de" e apenas "2.75"
 * 2. 2.75 fica isolado como valor numérico único na linha
 * 3. Fallback genérico o captura como valor apostado
 */

function findThe275Problem() {
  console.log("🔎 Buscando: Quando 2.75 é capturado como valor apostado?\n");

  const testCases = [
    {
      name: "Caso A: Números puros (sem labels)",
      lines: ["3.5", "2.75", "5.50", "18.98"],
      description: "OCR retorna só números",
    },
    {
      name: "Caso B: 'Mais de' juntado com número",
      lines: ["Maiside 3.5", "Maiside 2.75", "5.50", "18.98"],
      description: "OCR junta labels com números",
    },
    {
      name: "Caso C: Labels + números em linhas separate (parece OK)",
      lines: ["Mais de", "3.5", "Mais de", "2.75", "5.50", "18.98"],
      description: "Labels em linhas separadas",
    },
    {
      name: "Caso D: OCR junta múltiplos valores",
      lines: ["3.5 2.75 5.50 18.98"],
      description: "Tudo em uma linha",
    },
    {
      name: "Caso E: Linhas que parecem odds mas são valores",
      lines: [
        "2.75",     // ← OCR acredita que é valor apostado!
        "18.98",    // ← Retorno
      ],
      description: "Apenas 2 números sem contexto",
    },
    {
      name: "Caso F: Com label 'Aposta' antes",
      lines: [
        "Aposta",
        "2.75",     // ← Será capturado como valor apostado
        "Retorno",
        "18.98",
      ],
      description: "Label 'Aposta' seguido de 2.75",
    },
  ];

  testCases.forEach(test => {
    const result = extractMetadata(test.lines);
    
    console.log(`📝 ${test.name}`);
    console.log(`   ${test.description}`);
    console.log(`   Linhas: [${test.lines.map(l => `"${l}"`).join(", ")}]`);
    console.log(`   → valorApostado: ${result.metadata.valorApostado}`);
    console.log(`   → retorno: ${result.metadata.retornoPotencial}`);
    console.log(`   → odd: ${result.metadata.odd}`);
    
    if (result.metadata.valorApostado === 2.75) {
      console.log(`   ⚠️  ENCONTRADO: 2.75 foi capturado como valor apostado!`);
    }
    console.log();
  });
}

findThe275Problem();
