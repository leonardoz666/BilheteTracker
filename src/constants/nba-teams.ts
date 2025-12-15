/**
 * Dicionário de times NBA para normalização de eventos de apostas.
 * Sempre consulte este dicionário e limpe o resto que não esteja aqui.
 */

/**
 * Times atuais da NBA (30 franquias)
 */
export const NBA_CURRENT_TEAMS = [
  // Conferência Leste
  "Atlanta Hawks",
  "Boston Celtics",
  "Brooklyn Nets",
  "Charlotte Hornets",
  "Chicago Bulls",
  "Cleveland Cavaliers",
  "Detroit Pistons",
  "Indiana Pacers",
  "Miami Heat",
  "Milwaukee Bucks",
  "New York Knicks",
  "Orlando Magic",
  "Philadelphia 76ers",
  "Toronto Raptors",
  "Washington Wizards",
  
  // Conferência Oeste
  "Dallas Mavericks",
  "Denver Nuggets",
  "Golden State Warriors",
  "Houston Rockets",
  "Los Angeles Clippers",
  "Los Angeles Lakers",
  "Memphis Grizzlies",
  "Minnesota Timberwolves",
  "New Orleans Pelicans",
  "Oklahoma City Thunder",
  "Phoenix Suns",
  "Portland Trail Blazers",
  "Sacramento Kings",
  "San Antonio Spurs",
  "Utah Jazz",
] as const;

/**
 * Mapeamento de nomes antigos/aliases para nomes atuais
 * Inclui mudanças de nome, cidade e variações comuns
 */
export const NBA_TEAM_ALIASES: Record<string, string> = {
  // Los Angeles Clippers
  "Buffalo Braves": "Los Angeles Clippers",
  "San Diego Clippers": "Los Angeles Clippers",
  "LA Clippers": "Los Angeles Clippers",
  "L.A. Clippers": "Los Angeles Clippers",
  
  // Oklahoma City Thunder
  "Seattle SuperSonics": "Oklahoma City Thunder",
  "Seattle Sonics": "Oklahoma City Thunder",
  "OKC Thunder": "Oklahoma City Thunder",
  
  // Charlotte Hornets
  "New Orleans Hornets": "Charlotte Hornets",
  "Charlotte Bobcats": "Charlotte Hornets",
  
  // Brooklyn Nets
  "New Jersey Nets": "Brooklyn Nets",
  "New York Nets": "Brooklyn Nets",
  
  // Memphis Grizzlies
  "Vancouver Grizzlies": "Memphis Grizzlies",
  
  // New Orleans Pelicans
  "New Orleans/Oklahoma City Hornets": "New Orleans Pelicans",
  
  // Sacramento Kings
  "Kansas City Kings": "Sacramento Kings",
  "Cincinnati Royals": "Sacramento Kings",
  
  // Golden State Warriors
  "San Francisco Warriors": "Golden State Warriors",
  "Philadelphia Warriors": "Golden State Warriors",
  "GS Warriors": "Golden State Warriors",
  "GSW": "Golden State Warriors",
  
  // Los Angeles Lakers
  "Minneapolis Lakers": "Los Angeles Lakers",
  "LA Lakers": "Los Angeles Lakers",
  "L.A. Lakers": "Los Angeles Lakers",
  
  // Atlanta Hawks
  "Milwaukee Hawks": "Atlanta Hawks",
  "St. Louis Hawks": "Atlanta Hawks",
  
  // Utah Jazz
  "New Orleans Jazz": "Utah Jazz",
  
  // Times da ABA que entraram na NBA (já com nome atual)
  "Denver Nuggets": "Denver Nuggets",
  "Indiana Pacers": "Indiana Pacers",
  "San Antonio Spurs": "San Antonio Spurs",
  
  // Variações comuns de abreviações (opcional, pode expandir)
  "76ers": "Philadelphia 76ers",
  "Sixers": "Philadelphia 76ers",
  "Philly": "Philadelphia 76ers",
  "Heat": "Miami Heat",
  "Bucks": "Milwaukee Bucks",
  "Knicks": "New York Knicks",
  "Magic": "Orlando Magic",
  "Raptors": "Toronto Raptors",
  "Wizards": "Washington Wizards",
  "Mavs": "Dallas Mavericks",
  "Nuggets": "Denver Nuggets",
  "Warriors": "Golden State Warriors",
  "Rockets": "Houston Rockets",
  "Clippers": "Los Angeles Clippers",
  "Lakers": "Los Angeles Lakers",
  "Grizzlies": "Memphis Grizzlies",
  "Timberwolves": "Minnesota Timberwolves",
  "T-Wolves": "Minnesota Timberwolves",
  "Pelicans": "New Orleans Pelicans",
  "Thunder": "Oklahoma City Thunder",
  "Suns": "Phoenix Suns",
  "Blazers": "Portland Trail Blazers",
  "Trail Blazers": "Portland Trail Blazers",
  "Kings": "Sacramento Kings",
  "Spurs": "San Antonio Spurs",
  "Jazz": "Utah Jazz",
  "Hawks": "Atlanta Hawks",
  "Celtics": "Boston Celtics",
  "Nets": "Brooklyn Nets",
  "Hornets": "Charlotte Hornets",
  "Bulls": "Chicago Bulls",
  "Cavs": "Cleveland Cavaliers",
  "Cavaliers": "Cleveland Cavaliers",
  "Pistons": "Detroit Pistons",
  "Pacers": "Indiana Pacers",
  
  // Abreviações 2-3 caracteres simples (ex: "DEN", "HOU")
  "ATL": "Atlanta Hawks",
  "BOS": "Boston Celtics",
  "BKN": "Brooklyn Nets",
  "CHA": "Charlotte Hornets",
  "CHI": "Chicago Bulls",
  "CLE": "Cleveland Cavaliers",
  "DAL": "Dallas Mavericks",
  "DEN": "Denver Nuggets",
  "DET": "Detroit Pistons",
  "HOU": "Houston Rockets",
  "LAC": "Los Angeles Clippers",
  "LAL": "Los Angeles Lakers",
  "MEM": "Memphis Grizzlies",
  "MIA": "Miami Heat",
  "MIL": "Milwaukee Bucks",
  "MIN": "Minnesota Timberwolves",
  "NOP": "New Orleans Pelicans",
  "NYK": "New York Knicks",
  "ORL": "Orlando Magic",
  "PHI": "Philadelphia 76ers",
  "PHX": "Phoenix Suns",
  "POR": "Portland Trail Blazers",
  "SAC": "Sacramento Kings",
  "SAS": "San Antonio Spurs",
  "TOR": "Toronto Raptors",
  "UTA": "Utah Jazz",
  "WAS": "Washington Wizards",
  
  // Abreviações 2-3 caracteres + nome completo (ex: "DEN Nuggets")
  "ATL Hawks": "Atlanta Hawks",
  "BOS Celtics": "Boston Celtics",
  "BKN Nets": "Brooklyn Nets",
  "CHA Hornets": "Charlotte Hornets",
  "CHI Bulls": "Chicago Bulls",
  "CLE Cavaliers": "Cleveland Cavaliers",
  "DAL Mavericks": "Dallas Mavericks",
  "DEN Nuggets": "Denver Nuggets",
  "DET Pistons": "Detroit Pistons",
  "GSW Warriors": "Golden State Warriors",
  "HOU Rockets": "Houston Rockets",
  "LAC Clippers": "Los Angeles Clippers",
  "LAL Lakers": "Los Angeles Lakers",
  "MEM Grizzlies": "Memphis Grizzlies",
  "MIA Heat": "Miami Heat",
  "MIL Bucks": "Milwaukee Bucks",
  "MIN Timberwolves": "Minnesota Timberwolves",
  "NOP Pelicans": "New Orleans Pelicans",
  "NYK Knicks": "New York Knicks",
  "ORL Magic": "Orlando Magic",
  "PHI 76ers": "Philadelphia 76ers",
  "PHX Suns": "Phoenix Suns",
  "POR Trail Blazers": "Portland Trail Blazers",
  "SAC Kings": "Sacramento Kings",
  "SAS Spurs": "San Antonio Spurs",
  "TOR Raptors": "Toronto Raptors",
  "UTA Jazz": "Utah Jazz",
  "WAS Wizards": "Washington Wizards",
  
  // Apelidos populares
  "Dubs": "Golden State Warriors",
  "The Bay": "Golden State Warriors",
  "Purple and Gold": "Los Angeles Lakers",
  "Lake Show": "Los Angeles Lakers",
  "Beantown": "Boston Celtics",
  "C's": "Boston Celtics",
  "The Process": "Philadelphia 76ers",
  "Splash Brothers": "Golden State Warriors",
  "Lob City": "Los Angeles Clippers",
  "Rip City": "Portland Trail Blazers",
  "The Big Three": "Miami Heat",
  "Greek Freak": "Milwaukee Bucks",
  "Windy City": "Chicago Bulls",
  "Mile High": "Denver Nuggets",
  "Space City": "Houston Rockets",
  "Big D": "Dallas Mavericks",
  "The 6": "Toronto Raptors",
  "Motor City": "Detroit Pistons",
  "Dubnation": "Golden State Warriors",
  "OKC": "Oklahoma City Thunder",
  "NOLA": "New Orleans Pelicans",
  "Sactown": "Sacramento Kings",
  "SLC": "Utah Jazz",
  "The Valley": "Phoenix Suns",
  "Clipper Nation": "Los Angeles Clippers",
  "Lakeshow": "Los Angeles Lakers",
};

/**
 * Times extintos - NÃO devem ser aceitos em apostas
 */
export const NBA_EXTINCT_TEAMS = [
  // NBA / BAA extintos
  "Anderson Packers",
  "Baltimore Bullets", // 1944–1954, não confundir com Wizards
  "Chicago Stags",
  "Cleveland Rebels",
  "Detroit Falcons",
  "Indianapolis Jets",
  "Pittsburgh Ironmen",
  "Providence Steamrollers",
  "Sheboygan Red Skins",
  "St. Louis Bombers",
  "Toronto Huskies",
  "Washington Capitols",
  
  // ABA extintos
  "Spirits of St. Louis",
  "Kentucky Colonels",
] as const;

/**
 * Normaliza o nome de um time NBA para o formato canônico
 * @param teamName - Nome do time a ser normalizado
 * @returns Nome canônico do time ou null se não for um time NBA válido
 */
export function normalizeNBATeam(teamName: string): string | null {
  if (!teamName) return null;
  
  const trimmed = teamName.trim();
  
  // Verifica se já é um nome atual válido
  if (NBA_CURRENT_TEAMS.includes(trimmed as any)) {
    return trimmed;
  }
  
  // Verifica se é um alias conhecido
  if (trimmed in NBA_TEAM_ALIASES) {
    return NBA_TEAM_ALIASES[trimmed];
  }
  
  // Busca case-insensitive
  const lowerInput = trimmed.toLowerCase();
  
  // Procura em times atuais
  const currentMatch = NBA_CURRENT_TEAMS.find(
    (team) => team.toLowerCase() === lowerInput
  );
  if (currentMatch) return currentMatch;
  
  // Procura em aliases
  const aliasKey = Object.keys(NBA_TEAM_ALIASES).find(
    (alias) => alias.toLowerCase() === lowerInput
  );
  if (aliasKey) return NBA_TEAM_ALIASES[aliasKey];
  
  // Verifica se é um time extinto (não deve ser aceito)
  const isExtinct = NBA_EXTINCT_TEAMS.some(
    (extinct) => extinct.toLowerCase() === lowerInput
  );
  if (isExtinct) {
    console.warn(`Time NBA extinto detectado: ${teamName}`);
    return null;
  }
  
  // Time não reconhecido
  return null;
}

/**
 * Verifica se um nome é um time NBA válido (atual)
 */
export function isValidNBATeam(teamName: string): boolean {
  return normalizeNBATeam(teamName) !== null;
}

/**
 * Lista todos os nomes válidos (atuais + aliases) para autocomplete/validação
 */
export function getAllNBATeamNames(): string[] {
  return [
    ...NBA_CURRENT_TEAMS,
    ...Object.keys(NBA_TEAM_ALIASES),
  ];
}
