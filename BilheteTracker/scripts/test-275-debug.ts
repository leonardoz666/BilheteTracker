import { extractMetadata } from "../src/pipeline/extractMetadata";
import { normalizeOcr } from "../src/ocr/normalizeOcr";

/**
 * Teste com dados reais do usuário:
 * "Aposta: Gols Mais/Menos - Mais de 3.5 / Ambas Marcam - Sim / Total Gols - Mais de 2.75"
 * 
 * Problema: 2.75 está sendo capturado como valor apostado
 * Esperado: 2.75 é a linha de gols (odd), não é valor apostado
 */

function testDebugOddCapture275() {
  console.log("🧪 Teste: Por que 2.75 está sendo capturado como aposta?\n");

  // Simulando o OCR normalizado com a aposta do usuário
  const normalizedLines = [
    "Gols Mais/Menos",
    "Mais de 3.5",
    "Ambas Marcam",
    "Sim",
    "Total Gols",
    "Mais de 2.75",
    "R$ 5.50",        // ← Valor apostado real
    "Retorno Potencial",
    "R$ 18.98",       // ← Retorno
  ];

  console.log("📋 Linhas OCR normalizadas:");
  normalizedLines.forEach((line, i) => {
    console.log(`  ${i}: "${line}"`);
  });
  console.log();

  // Extrair metadados
  const result = extractMetadata(normalizedLines);

  console.log("📊 Metadados Extraídos:");
  console.log(`  valorApostado: ${result.metadata.valorApostado} (❌ INCORRETO se for 2.75! Deveria ser 5.50)`);
  console.log(`  retornoPotencial: ${result.metadata.retornoPotencial}`);
  console.log(`  odd: ${result.metadata.odd}`);
  console.log();

  console.log("🔍 ANÁLISE:");
  if (result.metadata.valorApostado === 2.75) {
    console.log("❌ PROBLEMA CONFIRMADO: 2.75 foi capturado como valor apostado!");
    console.log("   Causa: 2.75 é linha de gols (odd), não é R$ apostado");
    console.log("   Solução: Padrão deve rejeitar valores sem 'R$' no contexto de 'mais de X.XX'");
  } else if (result.metadata.valorApostado === 5.5) {
    console.log("✅ Valor apostado correto");
  } else {
    console.log(`❓ Valor inesperado: ${result.metadata.valorApostado}`);
  }

  console.log();
  console.log("💡 CENÁRIOS A TESTAR:");
  console.log("  1. 'Mais de 3.5' não deveria ser capturado");
  console.log("  2. 'Mais de 2.75' não deveria ser capturado");
  console.log("  3. Apenas 'R$ 5.50' deveria ser capturado como valor apostado");
}

testDebugOddCapture275();
