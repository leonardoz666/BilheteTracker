import { extractMetadata } from '../src/pipeline/extractMetadata';

// Cenário: Odds grudadas + Aposta real em próxima linha
const scenario1 = [
  'Ambas equipes Marcam: Sim & Total de 2.75 3.45',
  'Gols Mais/Menos: Mais de 3.5',
  'Retorno: 150.00'
];

console.log('=== CENÁRIO 1: Odds grudadas + Aposta real ===');
console.log('Input:', scenario1);

const result1 = extractMetadata(scenario1);
console.log('\nResult:');
console.log(`  odd: ${result1.metadata.odd}`);
console.log('');
console.log(`Expected: odd=3.5 (não 3.45)`);
console.log(`Actual: odd=${result1.metadata.odd}`);
console.log(`Status: ${result1.metadata.odd === 3.5 ? '✅' : '❌'}`);

// Cenário 2: Apenas "Mais de X.XX" sem odds grudadas
const scenario2 = [
  'Gols Mais/Menos: Mais de 3.5',
  'Retorno: 100.00'
];

console.log('\n=== CENÁRIO 2: Apenas Aposta real (sem odds) ===');
console.log('Input:', scenario2);

const result2 = extractMetadata(scenario2);
console.log('\nResult:');
console.log(`  odd: ${result2.metadata.odd}`);
console.log('');
console.log(`Expected: odd=3.5`);
console.log(`Actual: odd=${result2.metadata.odd}`);
console.log(`Status: ${result2.metadata.odd === 3.5 ? '✅' : '❌'}`);

// Cenário 3: Dois números isolados (real odds)
const scenario3 = [
  '2.75 3.45',
  'Retorno: 100.00'
];

console.log('\n=== CENÁRIO 3: Dois números isolados (real odds) ===');
console.log('Input:', scenario3);

const result3 = extractMetadata(scenario3);
console.log('\nResult:');
console.log(`  odd: ${result3.metadata.odd}`);
console.log('');
console.log(`Expected: odd=3.45 (segunda odd)`);
console.log(`Actual: odd=${result3.metadata.odd}`);
console.log(`Status: ${result3.metadata.odd === 3.45 ? '✅' : '❌'}`);
