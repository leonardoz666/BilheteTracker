/**
 * Dicionário de times de futebol para normalização de eventos de apostas.
 * Sempre consulte este dicionário e limpe o resto que não esteja aqui.
 * Cobertura: Principais ligas dos 6 continentes
 */

/**
 * Times de futebol ativos com cobertura de apostas
 * Organizados por continente, país e liga
 */
export const FOOTBALL_CLUBS_BY_REGION = {
  europe: {
    england: {
      "Premier League (Level 1)": [
        "Arsenal",
        "Aston Villa",
        "Bournemouth",
        "Brentford",
        "Brighton & Hove Albion",
        "Chelsea",
        "Crystal Palace",
        "Everton",
        "Fulham",
        "Liverpool",
        "Manchester City",
        "Manchester United",
        "Newcastle United",
        "Nottingham Forest",
        "Tottenham Hotspur",
        "West Ham United",
      ],
      "EFL Championship (Level 2)": [
        "Leeds United",
        "Leicester City",
        "Ipswich Town",
        "West Bromwich Albion",
        "Birmingham City",
        "Burnley",
        "Coventry City",
        "QPR",
        "Hull City",
        "Blackburn Rovers",
      ],
      "EFL League One (Level 3)": [
        "Portsmouth",
        "Bolton Wanderers",
        "Charlton Athletic",
        "Derby County",
        "Sunderland",
        "Oxford United",
      ],
      "EFL League Two (Level 4)": [
        "Bradford City",
        "Colchester United",
        "Harrogate Town",
        "Grimsby Town",
        "Forest Green Rovers",
      ],
    },
    italy: {
      "Serie A (Level 1)": [
        "Juventus",
        "AC Milan",
        "Inter Milan",
        "AS Roma",
        "Napoli",
        "Lazio",
        "Fiorentina",
        "Atalanta",
        "Torino",
        "Bologna",
      ],
      "Serie B (Level 2)": [
        "Lecce",
        "Parma",
        "Reggina",
        "Perugia",
        "Como",
      ],
    },
    cyprus: {
      "First Division": [
        "Pafos FC",
        "APOEL Nicosia",
        "Aris Limassol",
        "Omonia Nicosia",
        "AEL Limassol",
      ],
    },
    spain: {
      "La Liga (Level 1)": [
        "Real Madrid",
        "FC Barcelona",
        "Atlético Madrid",
        "Seville",
        "Valencia",
        "Real Sociedad",
        "Athletic Bilbao",
        "Villarreal",
      ],
      "Segunda División (Level 2)": [
        "Real Zaragoza",
        "Tenerife",
        "Málaga",
        "Real Oviedo",
      ],
    },
    france: {
      "Ligue 1 (Level 1)": [
        "Paris Saint-Germain",
        "Olympique Marseille",
        "Olympique Lyonnais",
        "AS Monaco",
        "RC Lens",
        "Stade Rennais",
        "AJ Auxerre",
      ],
      "Ligue 2 (Level 2)": [
        "Nantes",
        "Angers",
        "Toulouse",
      ],
    },
    portugal: {
      "Primeira Liga (Level 1)": [
        "SL Benfica",
        "Sporting CP",
        "FC Porto",
        "Braga",
        "Vitória Setúbal",
      ],
      "Segunda Liga (Level 2)": [
        "Rio Ave",
        "Arouca",
        "Estoril Praia",
      ],
    },
    netherlands: {
      "Eredivisie (Level 1)": [
        "Ajax Amsterdam",
        "PSV Eindhoven",
        "Feyenoord Rotterdam",
        "AZ Alkmaar",
        "FC Utrecht",
      ],
      "Eerste Divisie (Level 2)": [
        "Emmen",
        "Volendam",
        "Cambuur",
      ],
    },
    belgium: {
      "First Division A (Level 1)": [
        "Antwerp FC",
        "Union Saint-Gilloise",
        "Anderlecht",
        "Club Brugge",
      ],
    },
    germany: {
      "Bundesliga (Level 1)": [
        "Bayern Munich",
        "Borussia Dortmund",
        "RB Leipzig",
        "Bayer Leverkusen",
        "Eintracht Frankfurt",
        "Union Berlin",
      ],
      "2. Bundesliga (Level 2)": [
        "Hamburger SV",
        "Stuttgart",
        "Heidenheim",
        "Darmstadt 98",
      ],
      "3. Liga (Level 3)": [
        "Werder Bremen II",
        "Hallescher FC",
        "Jahn Regensburg",
        "VfL Osnabruck",
      ],
      "Regionalliga (Level 4)": [
        "TSV Havelse",
        "Lokomotive Leipzig",
        "MSV Duisburg",
        "SpVgg Bayreuth",
      ],
    },
    turkey: {
      "Süper Lig (Level 1)": [
        "Galatasaray",
        "Fenerbahce",
        "Besiktas",
        "Trabzonspor",
      ],
      "TFF 1. Lig (Level 2)": ["Samsunspor", "Bandirmaspor", "Sakaryaspor"],
      "TFF 2. Lig (Level 3)": ["1461 Trabzon", "Esenler Erokspor", "Istanbulspor"],
      "TFF 3. Lig (Level 4)": [
        "Bucaspor 1928",
        "Ankara Demirspor",
        "Kozanspor",
      ],
    },
  },
  south_america: {
    brazil: {
      "Série A": [
        "Flamengo",
        "Palmeiras",
        "Corinthians",
        "São Paulo",
        "Atlético Mineiro",
        "Internacional",
        "Botafogo",
        "Fluminense",
        "Vasco da Gama",
        "Grêmio",
      ],
      "Série B": [
        "Cuiabá",
        "Bahia",
        "Sport Recife",
        "Vila Nova",
        "Guarani",
        "CRB",
      ],
      "Série C (Third)": ["ABC", "Figueirense", "Paysandu", "Sampaio Corrêa"],
      "Série D (Fourth)": ["Campeonato Nacional Série D clubs — varies by season"],
    },
    argentina: {
      "Primera División": [
        "Boca Juniors",
        "River Plate",
        "Racing Club",
        "Independiente",
        "San Lorenzo",
        "Vélez Sársfield",
      ],
      "Primera Nacional (Level 2)": ["Quilmes", "Belgrano", "Tigre", "Sarmiento"],
      "Torneo Federal A (Level 3)": [
        "Gimnasia y Esgrima (MZ)",
        "Estudiantes (RC)",
        "Dálmine",
      ],
    },
  },
  north_america: {
    usa_canada: {
      "MLS (Level 1)": [
        "LAFC",
        "Inter Miami",
        "Seattle Sounders",
        "Atlanta United",
        "NYC FC",
        "Toronto FC",
      ],
      "USL Championship (Level 2)": [
        "Sacramento Republic FC",
        "Phoenix Rising FC",
        "Memphis 901 FC",
      ],
      "USL League One (Level 3)": ["Forward Madison", "Union Omaha"],
    },
    mexico: {
      "Liga MX (Level 1)": [
        "Club América",
        "Guadalajara",
        "Monterrey",
        "Cruz Azul",
      ],
      "Liga de Expansión MX (Level 2)": [
        "Atlético Morelia",
        "Tapatío",
        "Cancún FC",
      ],
    },
  },
  asia: {
    japan: {
      "J1 League (Level 1)": [
        "Kawasaki Frontale",
        "Urawa Red Diamonds",
        "Yokohama F. Marinos",
      ],
      "J2 League (Level 2)": [
        "Tokushima Vortis",
        "Kyoto Sanga",
        "Avispa Fukuoka",
      ],
      "J3 League (Level 3)": [
        "Nagano Parceiro",
        "Iwaki FC",
        "Blaublitz Akita",
      ],
      "Japan Football League (Level 4)": [
        "Honda FC",
        "Tochigi City FC",
        "Verspah Oita",
      ],
    },
    saudi_arabia: {
      "Saudi Pro League": ["Al Hilal", "Al Nassr", "Al Ittihad", "Al Ahli"],
      "First Division League (Level 2)": ["Al Riyadh", "Al Qadsiah", "Ohod"],
    },
    china: {
      "Chinese Super League": [
        "Beijing Guoan",
        "Shandong Taishan",
        "Guangzhou FC",
      ],
      "China League One": ["Qingdao Hainiu", "Henan SSLM"],
    },
  },
  africa: {
    south_africa: {
      "Premier Soccer League (Level 1)": [
        "Mamelodi Sundowns",
        "Orlando Pirates",
        "Kaizer Chiefs",
      ],
      "National First Division (Level 2)": ["Cape Town Spurs", "Maritzburg United"],
    },
    egypt: {
      "Egyptian Premier League": ["Al Ahly", "Zamalek", "Pyramids FC"],
      "Egyptian Second Division": ["El Gouna FC", "Ghazl El Mahalla"],
    },
    morocco: {
      "Botola Pro": [
        "Wydad Casablanca",
        "Raja Casablanca",
        "RS Berkane",
      ],
      "Botola 2": ["OC Khouribga", "IZK Khemisset"],
    },
  },
  oceania: {
    australia: {
      "A‑League Men": ["Sydney FC", "Melbourne City", "Brisbane Roar"],
    },
    ofc: {
      "OFC Champions League (regional)": [
        "Auckland City",
        "Team Wellington",
        "Hienghène Sport",
      ],
    },
  },
} as const;

/**
 * Flat list de todos os times para busca rápida
 */
export const ALL_FOOTBALL_CLUBS = Object.values(FOOTBALL_CLUBS_BY_REGION)
  .flatMap((continent) =>
    Object.values(continent).flatMap((country) =>
      Object.values(country).flat()
    )
  )
  .filter((club): club is string => typeof club === "string");

/**
 * Mapeamento de aliases para times de futebol
 * Inclui apelidos, abreviações e variações
 */
export const FOOTBALL_CLUB_ALIASES: Record<string, string> = {
  // Brasil - Série A
  "Flamengo RJ": "Flamengo",
  "Flamengo do Rio": "Flamengo",
  FLA: "Flamengo",
  Palmeiras: "Palmeiras",
  PAL: "Palmeiras",
  Corinthians: "Corinthians",
  COR: "Corinthians",
  SCCP: "Corinthians",
  "São Paulo": "São Paulo",
  "São Paulo FC": "São Paulo",
  SPFC: "São Paulo",
  "Atlético Mineiro": "Atlético Mineiro",
  Atlético: "Atlético Mineiro",
  CAM: "Atlético Mineiro",
  Internacional: "Internacional",
  INT: "Internacional",
  Botafogo: "Botafogo",
  BFC: "Botafogo",
  Fluminense: "Fluminense",
  FLU: "Fluminense",
  "Vasco da Gama": "Vasco da Gama",
  Vasco: "Vasco da Gama",
  VGD: "Vasco da Gama",
  Grêmio: "Grêmio",
  GRE: "Grêmio",

  // Argentina
  "Boca Juniors": "Boca Juniors",
  Boca: "Boca Juniors",
  "River Plate": "River Plate",
  River: "River Plate",
  Racing: "Racing Club",
  "Racing Club": "Racing Club",
  Independiente: "Independiente",
  "San Lorenzo": "San Lorenzo",
  "Vélez Sársfield": "Vélez Sársfield",
  Vélez: "Vélez Sársfield",

  // England - Premier League
  Arsenal: "Arsenal",
  "Aston Villa": "Aston Villa",
  Villa: "Aston Villa",
  Bournemouth: "Bournemouth",
  Brentford: "Brentford",
  "Brighton & Hove Albion": "Brighton & Hove Albion",
  Brighton: "Brighton & Hove Albion",
  Chelsea: "Chelsea",
  "Crystal Palace": "Crystal Palace",
  Palace: "Crystal Palace",
  Everton: "Everton",
  Fulham: "Fulham",
  Liverpool: "Liverpool",
  "Manchester City": "Manchester City",
  City: "Manchester City",
  "Manchester United": "Manchester United",
  "Man United": "Manchester United",
  United: "Manchester United",
  "Newcastle United": "Newcastle United",
  Newcastle: "Newcastle United",
  "Nottingham Forest": "Nottingham Forest",
  "Forest": "Nottingham Forest",
  Tottenham: "Tottenham Hotspur",
  "Tottenham Hotspur": "Tottenham Hotspur",
  "West Ham United": "West Ham United",
  "West Ham": "West Ham United",

  // Italy - Serie A
  Juventus: "Juventus",
  Juve: "Juventus",
  "AC Milan": "AC Milan",
  Milan: "AC Milan",
  "Inter Milan": "Inter Milan",
  Inter: "Inter Milan",
  "Inter de Milao": "Inter Milan",
  "Inter de Milão": "Inter Milan",
  "AS Roma": "AS Roma",
  Roma: "AS Roma",
  Napoli: "Napoli",
  Lazio: "Lazio",
  Fiorentina: "Fiorentina",
  Viola: "Fiorentina",
  Atalanta: "Atalanta",
  Torino: "Torino",
  Bologna: "Bologna",

  // Cyprus
  "Pafos FC": "Pafos FC",
  Pafos: "Pafos FC",
  Paphos: "Pafos FC",
  "APOEL Nicosia": "APOEL Nicosia",
  APOEL: "APOEL Nicosia",
  "Aris Limassol": "Aris Limassol",
  Aris: "Aris Limassol",
  "Omonia Nicosia": "Omonia Nicosia",
  Omonia: "Omonia Nicosia",
  "AEL Limassol": "AEL Limassol",

  // Germany - Bundesliga
  "Bayern Munich": "Bayern Munich",
  Bayern: "Bayern Munich",
  "Borussia Dortmund": "Borussia Dortmund",
  Dortmund: "Borussia Dortmund",
  BVB: "Borussia Dortmund",
  "RB Leipzig": "RB Leipzig",
  Leipzig: "RB Leipzig",
  "Bayer Leverkusen": "Bayer Leverkusen",
  Leverkusen: "Bayer Leverkusen",
  "Eintracht Frankfurt": "Eintracht Frankfurt",
  Frankfurt: "Eintracht Frankfurt",
  "Union Berlin": "Union Berlin",
  Union: "Union Berlin",

  // Turkey
  Galatasaray: "Galatasaray",
  Gala: "Galatasaray",
  Fenerbahce: "Fenerbahce",
  Fenerbahçe: "Fenerbahce",
  Besiktas: "Besiktas",
  Beşiktaş: "Besiktas",
  Trabzonspor: "Trabzonspor",
  Trabzon: "Trabzonspor",

  // USA/Canada - MLS
  LAFC: "LAFC",
  "Inter Miami": "Inter Miami",
  Miami: "Inter Miami",
  "Seattle Sounders": "Seattle Sounders",
  Seattle: "Seattle Sounders",
  "Atlanta United": "Atlanta United",
  Atlanta: "Atlanta United",
  "NYC FC": "NYC FC",
  "New York City": "NYC FC",
  "Toronto FC": "Toronto FC",
  Toronto: "Toronto FC",

  // Mexico
  "Club América": "Club América",
  América: "Club América",
  Guadalajara: "Guadalajara",
  Monterrey: "Monterrey",
  "Cruz Azul": "Cruz Azul",

  // Spain - La Liga
  "Real Madrid": "Real Madrid",
  Madrid: "Real Madrid",
  "FC Barcelona": "FC Barcelona",
  Barcelona: "FC Barcelona",
  Barça: "FC Barcelona",
  "Atlético Madrid": "Atlético Madri",
  Atletico: "Atlético Madrid",
  Seville: "Seville",
  Sevilla: "Seville",
  Valencia: "Valencia",
  "Real Sociedad": "Real Sociedad",
  Sociedad: "Real Sociedad",
  "Athletic Bilbao": "Athletic Bilbao",
  Athletic: "Athletic Bilbao",
  Villarreal: "Villarreal",

  // France - Ligue 1
  "Paris Saint-Germain": "Paris Saint-Germain",
  PSG: "Paris Saint-Germain",
  Paris: "Paris Saint-Germain",
  "Olympique Marseille": "Olympique Marseille",
  Marseille: "Olympique Marseille",
  OM: "Olympique Marseille",
  "Olympique Lyonnais": "Olympique Lyonnais",
  Lyon: "Olympique Lyonnais",
  "AS Monaco": "AS Monaco",
  Monaco: "AS Monaco",
  "RC Lens": "RC Lens",
  Lens: "RC Lens",
  "Stade Rennais": "Stade Rennais",
  Rennais: "Stade Rennais",
  "AJ Auxerre": "AJ Auxerre",
  Auxerre: "AJ Auxerre",

  // Portugal - Primeira Liga
  "SL Benfica": "SL Benfica",
  Benfica: "SL Benfica",
  "Sporting CP": "Sporting CP",
  Sporting: "Sporting CP",
  "FC Porto": "FC Porto",
  Porto: "FC Porto",
  Braga: "Braga",
  "Vitória Setúbal": "Vitória Setúbal",

  // Netherlands - Eredivisie
  "Ajax Amsterdam": "Ajax Amsterdam",
  Ajax: "Ajax Amsterdam",
  "PSV Eindhoven": "PSV Eindhoven",
  PSV: "PSV Eindhoven",
  "Feyenoord Rotterdam": "Feyenoord Rotterdam",
  Feyenoord: "Feyenoord Rotterdam",
  "AZ Alkmaar": "AZ Alkmaar",
  "FC Utrecht": "FC Utrecht",
  Utrecht: "FC Utrecht",

  // Belgium - First Division A
  "Antwerp FC": "Antwerp FC",
  Antwerp: "Antwerp FC",
  "Union Saint-Gilloise": "Union Saint-Gilloise",
  "Union SG": "Union Saint-Gilloise",
  Anderlecht: "Anderlecht",
  "Club Brugge": "Club Brugge",
  Brugge: "Club Brugge",

  // Japan
  "Kawasaki Frontale": "Kawasaki Frontale",
  Kawasaki: "Kawasaki Frontale",
  "Urawa Red Diamonds": "Urawa Red Diamonds",
  Urawa: "Urawa Red Diamonds",
  "Yokohama F. Marinos": "Yokohama F. Marinos",
  Yokohama: "Yokohama F. Marinos",

  // Saudi Arabia
  "Al Hilal": "Al Hilal",
  Hilal: "Al Hilal",
  "Al Nassr": "Al Nassr",
  Nassr: "Al Nassr",
  "Al Ittihad": "Al Ittihad",
  Ittihad: "Al Ittihad",
  "Al Ahli": "Al Ahli",
  Ahli: "Al Ahli",

  // China
  "Beijing Guoan": "Beijing Guoan",
  Beijing: "Beijing Guoan",
  "Shandong Taishan": "Shandong Taishan",
  Shandong: "Shandong Taishan",
  "Guangzhou FC": "Guangzhou FC",
  Guangzhou: "Guangzhou FC",

  // Africa
  "Mamelodi Sundowns": "Mamelodi Sundowns",
  Sundowns: "Mamelodi Sundowns",
  "Orlando Pirates": "Orlando Pirates",
  Pirates: "Orlando Pirates",
  "Kaizer Chiefs": "Kaizer Chiefs",
  Chiefs: "Kaizer Chiefs",
  "Al Ahly": "Al Ahly",
  Zamalek: "Zamalek",
  "Pyramids FC": "Pyramids FC",

  // Australia
  "Sydney FC": "Sydney FC",
  Sydney: "Sydney FC",
  "Melbourne City": "Melbourne City",
  Melbourne: "Melbourne City",
  "Brisbane Roar": "Brisbane Roar",
  Brisbane: "Brisbane Roar",
};

/**
 * Normaliza nome de time de futebol consultando dicionário
 * @param clubName Nome bruto do time
 * @returns Nome canônico do time ou null se não encontrado
 */
export function normalizeFootballClub(clubName: string): string | null {
  if (!clubName) return null;

  const trimmed = clubName.trim();

  // Busca exata (case-insensitive)
  const exactMatch = ALL_FOOTBALL_CLUBS.find(
    (club) => club.toLowerCase() === trimmed.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // Busca em aliases
  const aliasMatch = FOOTBALL_CLUB_ALIASES[trimmed];
  if (aliasMatch) return aliasMatch;

  // Busca case-insensitive em aliases
  const aliasKey = Object.keys(FOOTBALL_CLUB_ALIASES).find(
    (key) => key.toLowerCase() === trimmed.toLowerCase()
  );
  if (aliasKey) return FOOTBALL_CLUB_ALIASES[aliasKey];

  return null;
}

/**
 * Verifica se é um time de futebol válido do dicionário
 * @param clubName Nome do time
 * @returns true se time está no dicionário
 */
export function isValidFootballClub(clubName: string): boolean {
  return normalizeFootballClub(clubName) !== null;
}

/**
 * Retorna todos os nomes reconhecidos para um time (canônico + aliases)
 * @param canonicalName Nome canônico do time
 * @returns Array com todos os nomes/aliases
 */
export function getFootballClubNames(canonicalName: string): string[] {
  const canonical = normalizeFootballClub(canonicalName);
  if (!canonical) return [];

  const aliases = Object.entries(FOOTBALL_CLUB_ALIASES)
    .filter(([_, value]) => value === canonical)
    .map(([key]) => key);

  return [canonical, ...aliases];
}

/**
 * Normaliza evento de futebol validando ambos os times
 * @param eventStr String no formato "Time1 x Time2" ou "Time1 vs Time2"
 * @returns Evento normalizado com nomes canônicos ou null se inválido
 */
export function normalizeFootballEventTeams(eventStr: string): string | null {
  if (!eventStr) return null;

  // Tenta separar por "x" ou "vs" (case-insensitive)
  const xMatch = eventStr.match(/^(.+?)\s+x\s+(.+?)$/i);
  const vsMatch = eventStr.match(/^(.+?)\s+vs\s+(.+?)$/i);

  const match = xMatch || vsMatch;
  if (!match) return null;

  const [, team1Raw, team2Raw] = match;
  const team1Normalized = normalizeFootballClub(team1Raw.trim());
  const team2Normalized = normalizeFootballClub(team2Raw.trim());

  // Ambos times devem ser válidos
  if (!team1Normalized || !team2Normalized) {
    return null;
  }

  // Retorna evento normalizado com nomes canônicos
  const separator = xMatch ? " x " : " vs ";
  return `${team1Normalized}${separator}${team2Normalized}`;
}
