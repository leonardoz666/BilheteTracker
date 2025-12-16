import { normalizeOcr } from "../src/ocr/normalizeOcr";
import { extractMetadata } from "../src/pipeline/extractMetadata";

const ocrRaw = {
  kind: "parsedText" as const,
  payload: `Ambas equipes Marcam: Sim & Total de 2.75 3.45
Gols Mais/Menos: Mais de 3.5
R$5,50
R$ 18,98`
};

console.log('=== OCR RAW ===');
const normalizedOcr = normalizeOcr(ocrRaw);
console.log('Linhas normalizadas:');
normalizedOcr.lines.forEach((line, i) => console.log(`  ${i}: "${line}"`));

console.log('\n=== EXTRACT METADATA ===');
const metadata = extractMetadata(normalizedOcr.lines);

console.log('Resultado:');
console.log(`  odd: ${metadata.metadata.odd}`);
console.log(`  valorApostado: ${metadata.metadata.valorApostado}`);
console.log(`  retornoPotencial: ${metadata.metadata.retornoPotencial}`);

console.log('\n=== VALIDAÇÃO ===');
if (metadata.metadata.odd === 3.5) {
  console.log('✅ CORRETO: odd=3.5');
} else {
  console.log(`❌ ERRO: odd=${metadata.metadata.odd} (esperado 3.5)`);
}
