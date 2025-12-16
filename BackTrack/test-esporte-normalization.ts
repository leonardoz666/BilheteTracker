// Teste da lógica de normalização do BackTrack
const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;

const normalizeEsporteKey = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(EMOJI_REGEX, '')
    .replace(/[^a-z0-9\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ALIAS_MAP_DATA: Array<[string, string]> = [
  ['soccer', 'Futebol'],
  ['futebol', 'Futebol'],
  ['football', 'Futebol Americano'],
  ['american football', 'Futebol Americano'],
  ['futebol americano', 'Futebol Americano'],
];

const ESPORTE_ALIAS_MAP = ALIAS_MAP_DATA.reduce((acc, [alias, destino]) => {
  acc[normalizeEsporteKey(alias)] = destino;
  return acc;
}, {} as Record<string, string>);

console.log('🔍 Testando normalização do BackTrack:\n');

const testCases = [
  'Futebol Americano',
  'Futebol Americano 🏈',
  'futebol americano',
  'Futebol',
  'futebol'
];

for (const test of testCases) {
  const normalized = normalizeEsporteKey(test);
  const aliasResult = ESPORTE_ALIAS_MAP[normalized];
  console.log(`Input: "${test}"`);
  console.log(`  Normalized key: "${normalized}"`);
  console.log(`  Alias map result: "${aliasResult}"`);
  console.log();
}

console.log('📋 Mapa completo de aliases:');
console.log(ESPORTE_ALIAS_MAP);
