import { normalizeOcr } from "../src/ocr/normalizeOcr";

const ocrRaw = {
  kind: "parsedText" as const,
  payload: `Ambas equipes Marcam: Sim & Total de 2.75 3.45
Gols Mais/Menos: Mais de 3.5
Super Odds Turbinadas
Inter de Milão - Liverpool
09/12/2025 17:00
Mais Detalhes V
Aposta
Ganhos Potenciais
MANTER
R$5,50
R$ 18,98
FECHAR`
};

console.log('=== ANTES ===');
console.log('Linha problemática: "Ambas equipes Marcam: Sim & Total de 2.75 3.45"');

const normalized = normalizeOcr(ocrRaw);

console.log('\n=== DEPOIS ===');
normalized.lines.forEach((line, i) => console.log(`${i}: "${line}"`));

console.log('\n=== VALIDAÇÃO ===');
if (normalized.lines.some(l => l.includes('Total de 2.75'))) {
  console.log('❌ ERRO: Ainda contém "Total de 2.75"');
} else {
  console.log('✅ CORRETO: "Total de 2.75" removido');
}

if (normalized.lines.some(l => l.includes('Gols Mais/Menos: Mais de 3.5'))) {
  console.log('✅ CORRETO: Mantém "Gols Mais/Menos: Mais de 3.5"');
} else {
  console.log('❌ ERRO: Perdeu "Gols Mais/Menos: Mais de 3.5"');
}

if (normalized.lines.some(l => l.includes('Ambas equipes Marcam: Sim'))) {
  console.log('✅ CORRETO: Mantém "Ambas equipes Marcam: Sim"');
} else {
  console.log('❌ ERRO: Perdeu "Ambas equipes Marcam: Sim"');
}
