// Debug simples para testar extractOdd diretamente
import * as fs from 'fs';
import * as path from 'path';

// Simular a função extractOdd copiando o código
function parseNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const normalized = text.replace(/[^0-9.,-]/g, "").replace(/,/g, ".");
  const value = parseFloat(normalized);
  return Number.isNaN(value) ? null : value;
}

function extractOdd_DEBUG(lines: string[]) {
  const labels = [/\bodd\b/i, /cota[cç][aã]o/i, /cota\b/i, /criar\s+aposta/i];
  const numberRe = /\d+[.,]\d+/g;
  
  const isValidOdd = (val: number | null): boolean => {
    if (val === null) return false;
    return val >= 1.01 && val <= 50.00;
  };
  
  const looksLikeNBAScore = (line: string): boolean => {
    const scoreMatch = line.match(/\b([A-Z]{3})\s+(\d{2,3})\b/);
    if (!scoreMatch) return false;
    const points = parseInt(scoreMatch[2], 10);
    return points >= 70;
  };
  
  console.log('\n--- extractOdd DEBUG START ---');
  
  // BLOCO 1: Procura "Mais de X.XX" / "Menos de X.XX"
  console.log('\n[BLOCO 1] Procurando "Mais de X.XX" / "Menos de X.XX"');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(`  Linha ${i}: "${line}"`);
    const betConditionPattern = /(Mais de|Menos de|Over|Under|Acima de|Abaixo de|>=|<=|>|<)\s+(\d{1,3}[.,]\d{1,2})/i;
    const match = line.match(betConditionPattern);
    if (match) {
      const val = parseNumber(match[2]);
      console.log(`    ✓ Match! Operador="${match[1]}", Valor="${match[2]}", Parseado=${val}`);
      if (isValidOdd(val)) {
        console.log(`    ✅ FOUND via BLOCO 1: ${val}`);
        return { value: val, consumedIdx: i };
      }
    } else {
      console.log(`    ✗ Sem match de condição`);
    }
  }
  
  // BLOCO 2: Procura linhas com label explícito
  console.log('\n[BLOCO 2] Procurando linhas com label explícito');
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    const hasLabel = labels.some((re) => re.test(lower));
    console.log(`  Linha ${i}: hasLabel=${hasLabel}`);
    if (!hasLabel) continue;
    
    const matches = Array.from(lines[i].matchAll(numberRe));
    if (matches.length > 0) {
      const validOdds = matches.filter(m => {
        const val = parseNumber(m[0]);
        return isValidOdd(val);
      });
      
      if (validOdds.length > 0) {
        const lastMatch = validOdds[validOdds.length - 1];
        const oddValue = parseNumber(lastMatch[0]);
        console.log(`    ✅ FOUND via BLOCO 2: ${oddValue}`);
        return { value: oddValue, consumedIdx: i };
      }
    }
  }
  
  // BLOCO 3: Dois números decimais
  console.log('\n[BLOCO 3] Procurando "X.XX Y.YY"');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const twoOddsPattern = /^(\d+[.,]\d+)\s+(\d+[.,]\d+)$/;
    const match = line.match(twoOddsPattern);
    if (match) {
      const val1 = parseNumber(match[1]);
      const val2 = parseNumber(match[2]);
      console.log(`  Linha ${i}: val1=${val1}, val2=${val2}`);
      
      if (isValidOdd(val1) && isValidOdd(val2)) {
        console.log(`    ✅ FOUND via BLOCO 3: ${val2}`);
        return { value: val2, consumedIdx: i };
      }
    }
  }
  
  // BLOCO 4: Fallback agressivo
  console.log('\n[BLOCO 4] Fallback agressivo');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (/\b(odd|cota[çc][aã]o|cota|retorno|ganho|valor\s+apostado|aposta\s*r?\$)/i.test(line)) {
      console.log(`  Linha ${i}: Metadados, skip`);
      continue;
    }
    
    if (line.trim().length < 15) {
      console.log(`  Linha ${i}: Muito curta, skip`);
      continue;
    }
    
    if (/(Mais de|Menos de|Over|Under|Acima de|Abaixo de)\s+\d{1,3}[.,]\d{1,2}$/i.test(line)) {
      console.log(`  Linha ${i}: Termina com condição válida, skip`);
      continue;
    }
    
    const numbersAtEnd = line.match(/(\d+[.,]\d+)(?:\s+(\d+[.,]\d+))?$/);
    if (numbersAtEnd) {
      console.log(`  Linha ${i}: Found numbers at end`);
      if (numbersAtEnd[2]) {
        const val1 = parseNumber(numbersAtEnd[1]);
        const val2 = parseNumber(numbersAtEnd[2]);
        if (isValidOdd(val1) && isValidOdd(val2)) {
          const hasRealBetFollowing = lines.slice(i + 1).some(nextLine =>
            /(Mais de|Menos de|Over|Under)\s+\d{1,3}[.,]\d{1,2}/i.test(nextLine)
          );
          console.log(`    val1=${val1}, val2=${val2}, hasRealBetFollowing=${hasRealBetFollowing}`);
          
          if (!hasRealBetFollowing) {
            console.log(`    ✅ FOUND via BLOCO 4 (2 números): ${val2}`);
            return { value: val2, consumedIdx: i };
          }
          console.log(`    ✗ Ignored, há apostas reais seguindo`);
          continue;
        }
      }
    }
  }
  
  console.log('\n--- extractOdd DEBUG END (NULL) ---');
  return { value: null, consumedIdx: null };
}

// TEST
const lines = [
  'Ambas equipes Marcam: Sim & Total de 2.75 3.45',
  'Gols Mais/Menos: Mais de 3.5',
  'R$5,50',
  'R$ 18,98',
];

console.log('=== INPUT LINES ===');
lines.forEach((line, i) => console.log(`${i}: "${line}"`));

const result = extractOdd_DEBUG(lines);
console.log(`\n=== RESULT ===`);
console.log(`value: ${result.value}`);
console.log(`consumedIdx: ${result.consumedIdx}`);
