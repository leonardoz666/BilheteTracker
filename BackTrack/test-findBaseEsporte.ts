// Teste completo da função findBaseEsporte do BackTrack
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

const BASE_ESPORTES = [
  'Futebol Americano',
  'Futebol',
  'Basquete',
  'Tênis',
];

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

const findBaseEsporte = (value: string): string | null => {
  if (!value) return null;
  const normalized = normalizeEsporteKey(value);
  if (!normalized) return null;

  // STEP 1: Check alias map
  if (ESPORTE_ALIAS_MAP[normalized]) {
    console.log(`  ✅ Found in alias map: "${ESPORTE_ALIAS_MAP[normalized]}"`);
    return ESPORTE_ALIAS_MAP[normalized];
  }

  // STEP 2: Check exact match
  const exact = BASE_ESPORTES.find((esporte) => normalizeEsporteKey(esporte) === normalized);
  if (exact) {
    console.log(`  ✅ Found exact match: "${exact}"`);
    return exact;
  }

  // STEP 3: Check partial match (PROBLEMA PODE ESTAR AQUI!)
  const partial = BASE_ESPORTES.find((esporte) => {
    const esporteKey = normalizeEsporteKey(esporte);
    const matches = esporteKey.includes(normalized) || normalized.includes(esporteKey);
    if (matches) {
      console.log(`  ⚠️ Partial match: normalized="${normalized}" includes esporteKey="${esporteKey}" = ${normalized.includes(esporteKey)}`);
      console.log(`  ⚠️ Partial match: esporteKey="${esporteKey}" includes normalized="${normalized}" = ${esporteKey.includes(normalized)}`);
    }
    return matches;
  });

  if (partial) {
    console.log(`  ⚠️ Found partial match: "${partial}"`);
  }

  return partial ?? null;
};

console.log('🔍 Testando findBaseEsporte do BackTrack:\n');

const testCases = [
  'Futebol Americano',
  'Futebol Americano 🏈',
  'Futebol',
  'futebol americano',
];

for (const test of testCases) {
  console.log(`\nInput: "${test}"`);
  const result = findBaseEsporte(test);
  console.log(`  ➡️ Final result: "${result}"\n`);
}
