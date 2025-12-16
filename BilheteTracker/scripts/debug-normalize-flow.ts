import { normalizeOcr } from "../src/ocr/normalizeOcr";

const ocrRaw = {
  kind: "parsedText" as const,
  payload: `Ambas equipes Marcam: Sim & Total de 2.75 3.45
Gols Mais/Menos: Mais de 3.5
R$5,50
R$ 18,98`
};

console.log('=== ANTES DO NORMALIZE ===');
const rawLines = ocrRaw.payload.split(/\r?\n/);
rawLines.forEach((line, i) => console.log(`  ${i}: "${line}"`));

console.log('\n=== DEPOIS DO NORMALIZE ===');
const normalized = normalizeOcr(ocrRaw);
normalized.lines.forEach((line, i) => console.log(`  ${i}: "${line}"`));
