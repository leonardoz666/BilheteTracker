import { normalizeOcr } from "../src/ocr/normalizeOcr";

const ocrRaw = {
  kind: "parsedText" as const,
  payload: `Ambas equipes Marcam: Sim & Total de 2.75 3.45
Gols Mais/Menos: Mais de 3.5
R$5,50
R$ 18,98`
};

console.log('=== STRUCTURE OF normalizeOcr() RESULT ===');
const normalized = normalizeOcr(ocrRaw);
console.log('Keys:', Object.keys(normalized));
console.log('\nFull result:');
console.log(JSON.stringify(normalized, null, 2));
