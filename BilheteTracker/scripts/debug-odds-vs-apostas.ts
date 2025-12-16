import { extractMetadata } from "../src/pipeline/extractMetadata";

/**
 * Teste: OCR que junta odds com aposta na mesma linha
 * 
 * Cenário real do usuário:
 * "Ambas equipes Marcam: Sim & Total de 2.75 3.45"
 * "Gols Mais/Menos: Mais de 3.5"
 * 
 * Problema: Sistema captura "Mais de 2.75" como aposta
 * Correto: Deveria capturar "Mais de 3.5" como aposta
 * 
 * 2.75 e 3.45 são odds (cotações), não apostas!
 */

function debugOddVsAposta() {
  console.log("🔍 DEBUG: Odds vs Apostas\n");

  const lines = [
    "Ambas equipes Marcam: Sim & Total de 2.75 3.45",  // Odds juntadas
    "Gols Mais/Menos: Mais de 3.5",                    // Aposta real
    "R$5,50",
    "R$ 18,98",
  ];

  console.log("📋 Linhas OCR:");
  lines.forEach((line, i) => console.log(`  ${i}: "${line}"`));

  const result = extractMetadata(lines);

  console.log("\n📊 Resultado:");
  console.log(`  Linha 0: "${lines[0]}"`);
  console.log(`    → 2.75 é ODD (cotação), não aposta!`);
  console.log(`    → 3.45 é ODD (cotação), não aposta!`);
  console.log();
  console.log(`  Linha 1: "${lines[1]}"`);
  console.log(`    → 3.5 é APOSTA REAL!`);
  console.log();
  console.log(`  Sistema capturou: odd=${result.metadata.odd}`);
  console.log();

  if (result.metadata.odd === 2.75) {
    console.log("❌ PROBLEMA: Sistema capturou 2.75 (primeira odd)");
    console.log("   Esperado: Capturar 3.5 (a aposta real)");
  } else if (result.metadata.odd === 3.45) {
    console.log("⚠️ PARCIAL: Sistema capturou 3.45 (segunda odd)");
    console.log("   Esperado: Capturar 3.5 (a aposta real)");
  } else if (result.metadata.odd === 3.5) {
    console.log("✅ CORRETO: Sistema capturou 3.5 (aposta real)");
  }
}

debugOddVsAposta();
