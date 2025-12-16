import { extractMetadata } from "../src/pipeline/extractMetadata";

/**
 * Teste: Reproduzir exatamente o problema do usuário
 * "2.75 está sendo capturado como aposta"
 */

function debugUser275Problem() {
  console.log("🔍 REPRODUZINDO PROBLEMA DO USUÁRIO\n");

  // Simulando OCR que sai dessa forma
  const lines = [
    "Gols Mais/Menos",
    "Mais de 3.5",
    "Ambas Marcam",  
    "Sim",
    "Total Gols",
    "Mais de 2.75",
    "5.50",           // ← Sem R$ (OCR perdeu)
    "Retorno",
    "18.98",          // ← Sem R$ (OCR perdeu)
  ];

  console.log("📋 Linhas OCR fragmentadas (sem R$):");
  lines.forEach((line, i) => console.log(`  ${i}: "${line}"`));

  const result = extractMetadata(lines);

  console.log("\n📊 Resultado:");
  console.log(`  valorApostado: ${result.metadata.valorApostado}`);
  console.log(`  odd: ${result.metadata.odd}`);
  console.log(`  retorno: ${result.metadata.retornoPotencial}`);

  if (result.metadata.valorApostado === 2.75) {
    console.log("\n❌ PROBLEMA: 2.75 foi capturado como valor apostado!");
  }

  // Cenário alternativo: onde 2.75 fica sozinho
  console.log("\n---\n");

  const lines2 = [
    "Total Gols",
    "Mais de 2.75",
    "Aposta",
    "R$ 5.50",
    "Retorno Potencial", 
    "R$ 18.98",
  ];

  console.log("📋 Cenário 2: Label 'Aposta' seguido de R$:");
  lines2.forEach((line, i) => console.log(`  ${i}: "${line}"`));

  const result2 = extractMetadata(lines2);

  console.log("\n📊 Resultado:");
  console.log(`  valorApostado: ${result2.metadata.valorApostado}`);
  console.log(`  odd: ${result2.metadata.odd}`);
  console.log(`  retorno: ${result2.metadata.retornoPotencial}`);
}

debugUser275Problem();
