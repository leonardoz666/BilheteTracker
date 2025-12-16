"use strict";
/**
 * Dicionário de times NFL para normalização de eventos de apostas.
 * Sempre consulte este dicionário e limpe o resto que não esteja aqui.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OTHER_FOOTBALL_LEAGUES = exports.NFL_ABBREVIATIONS = exports.NFL_TEAM_ALIASES = exports.NFL_CURRENT_TEAMS = void 0;
exports.normalizeNFLTeam = normalizeNFLTeam;
exports.findOtherFootballTeam = findOtherFootballTeam;
/**
 * Times atuais da NFL (32 franquias)
 */
exports.NFL_CURRENT_TEAMS = [
    // AFC East
    "Buffalo Bills",
    "Miami Dolphins",
    "New England Patriots",
    "New York Jets",
    // AFC North
    "Baltimore Ravens",
    "Cincinnati Bengals",
    "Cleveland Browns",
    "Pittsburgh Steelers",
    // AFC South
    "Houston Texans",
    "Indianapolis Colts",
    "Jacksonville Jaguars",
    "Tennessee Titans",
    // AFC West
    "Denver Broncos",
    "Kansas City Chiefs",
    "Las Vegas Raiders",
    "Los Angeles Chargers",
    // NFC East
    "Dallas Cowboys",
    "New York Giants",
    "Philadelphia Eagles",
    "Washington Commanders",
    // NFC North
    "Chicago Bears",
    "Detroit Lions",
    "Green Bay Packers",
    "Minnesota Vikings",
    // NFC South
    "Atlanta Falcons",
    "Carolina Panthers",
    "New Orleans Saints",
    "Tampa Bay Buccaneers",
    // NFC West
    "Arizona Cardinals",
    "Los Angeles Rams",
    "San Francisco 49ers",
    "Seattle Seahawks",
];
/**
 * Mapeamento de nomes antigos/aliases e variações comuns para nomes atuais
 * Inclui mudanças de nome, siglas e variações
 */
exports.NFL_TEAM_ALIASES = {
    // Buffalo Bills
    "Buffalo": "Buffalo Bills",
    "Bills": "Buffalo Bills",
    "BUF": "Buffalo Bills",
    // Miami Dolphins
    "Miami": "Miami Dolphins",
    "Dolphins": "Miami Dolphins",
    "MIA": "Miami Dolphins",
    // New England Patriots
    "New England": "New England Patriots",
    "Patriots": "New England Patriots",
    "NE": "New England Patriots",
    "NE Patriots": "New England Patriots",
    // New York Jets
    "Jets": "New York Jets",
    "NYJ": "New York Jets",
    "NY Jets": "New York Jets",
    // Baltimore Ravens
    "Baltimore": "Baltimore Ravens",
    "Ravens": "Baltimore Ravens",
    "BAL": "Baltimore Ravens",
    // Cincinnati Bengals
    "Cincinnati": "Cincinnati Bengals",
    "Bengals": "Cincinnati Bengals",
    "CIN": "Cincinnati Bengals",
    // Cleveland Browns
    "Cleveland": "Cleveland Browns",
    "Browns": "Cleveland Browns",
    "CLE": "Cleveland Browns",
    // Pittsburgh Steelers
    "Pittsburgh": "Pittsburgh Steelers",
    "Steelers": "Pittsburgh Steelers",
    "PIT": "Pittsburgh Steelers",
    // Houston Texans
    "Houston": "Houston Texans",
    "Texans": "Houston Texans",
    "HOU": "Houston Texans",
    // Indianapolis Colts
    "Indianapolis": "Indianapolis Colts",
    "Colts": "Indianapolis Colts",
    "IND": "Indianapolis Colts",
    // Jacksonville Jaguars
    "Jacksonville": "Jacksonville Jaguars",
    "Jaguars": "Jacksonville Jaguars",
    "JAX": "Jacksonville Jaguars",
    // Tennessee Titans
    "Tennessee": "Tennessee Titans",
    "Titans": "Tennessee Titans",
    "TEN": "Tennessee Titans",
    // Denver Broncos
    "Denver": "Denver Broncos",
    "Broncos": "Denver Broncos",
    "DEN": "Denver Broncos",
    // Kansas City Chiefs
    "Kansas City": "Kansas City Chiefs",
    "Chiefs": "Kansas City Chiefs",
    "KC": "Kansas City Chiefs",
    "KC Chiefs": "Kansas City Chiefs",
    // Las Vegas Raiders
    "Las Vegas": "Las Vegas Raiders",
    "Raiders": "Las Vegas Raiders",
    "LV": "Las Vegas Raiders",
    "Oakland Raiders": "Las Vegas Raiders",
    "Oakland": "Las Vegas Raiders",
    // Los Angeles Chargers
    "Los Angeles Chargers": "Los Angeles Chargers",
    "Chargers": "Los Angeles Chargers",
    "LA Chargers": "Los Angeles Chargers",
    "L.A. Chargers": "Los Angeles Chargers",
    "LAC": "Los Angeles Chargers",
    "San Diego Chargers": "Los Angeles Chargers",
    // Dallas Cowboys
    "Dallas": "Dallas Cowboys",
    "Cowboys": "Dallas Cowboys",
    "DAL": "Dallas Cowboys",
    // New York Giants
    "Giants": "New York Giants",
    "NYG": "New York Giants",
    "NY Giants": "New York Giants",
    // Philadelphia Eagles
    "Philadelphia": "Philadelphia Eagles",
    "Eagles": "Philadelphia Eagles",
    "PHI": "Philadelphia Eagles",
    // Washington Commanders
    "Washington": "Washington Commanders",
    "Commanders": "Washington Commanders",
    "WAS": "Washington Commanders",
    "Washington Football Team": "Washington Commanders",
    "Washington Redskins": "Washington Commanders",
    // Chicago Bears
    "Chicago": "Chicago Bears",
    "Bears": "Chicago Bears",
    "CHI": "Chicago Bears",
    // Detroit Lions
    "Detroit": "Detroit Lions",
    "Lions": "Detroit Lions",
    "DET": "Detroit Lions",
    // Green Bay Packers
    "Green Bay": "Green Bay Packers",
    "Packers": "Green Bay Packers",
    "GB": "Green Bay Packers",
    "GB Packers": "Green Bay Packers",
    // Minnesota Vikings
    "Minnesota": "Minnesota Vikings",
    "Vikings": "Minnesota Vikings",
    "MIN": "Minnesota Vikings",
    // Atlanta Falcons
    "Atlanta": "Atlanta Falcons",
    "Falcons": "Atlanta Falcons",
    "ATL": "Atlanta Falcons",
    // Carolina Panthers
    "Carolina": "Carolina Panthers",
    "Panthers": "Carolina Panthers",
    "CAR": "Carolina Panthers",
    // New Orleans Saints
    "New Orleans": "New Orleans Saints",
    "Saints": "New Orleans Saints",
    "NO": "New Orleans Saints",
    "NOR": "New Orleans Saints",
    // Tampa Bay Buccaneers
    "Tampa Bay": "Tampa Bay Buccaneers",
    "Buccaneers": "Tampa Bay Buccaneers",
    "TB": "Tampa Bay Buccaneers",
    "Bucs": "Tampa Bay Buccaneers",
    // Arizona Cardinals
    "Arizona": "Arizona Cardinals",
    "Cardinals": "Arizona Cardinals",
    "ARI": "Arizona Cardinals",
    "St. Louis Cardinals": "Arizona Cardinals",
    // Los Angeles Rams
    "Los Angeles Rams": "Los Angeles Rams",
    "Rams": "Los Angeles Rams",
    "LA Rams": "Los Angeles Rams",
    "L.A. Rams": "Los Angeles Rams",
    "LAR": "Los Angeles Rams",
    "St. Louis Rams": "Los Angeles Rams",
    // San Francisco 49ers
    "San Francisco": "San Francisco 49ers",
    "49ers": "San Francisco 49ers",
    "SF": "San Francisco 49ers",
    "SFO": "San Francisco 49ers",
    // Seattle Seahawks
    "Seattle": "Seattle Seahawks",
    "Seahawks": "Seattle Seahawks",
    "SEA": "Seattle Seahawks",
    // Variações comuns e erros de OCR
    "POR Trail Blazers": "Portland Trail Blazers", // Erro comum no OCR
    "Pats": "New England Patriots",
    "Niners": "San Francisco 49ers",
    "The Pack": "Green Bay Packers",
    "G-Men": "New York Giants",
    "Birds": "Philadelphia Eagles",
    "Fish": "Miami Dolphins",
};
/**
 * Siglas oficiais e comuns para times NFL
 */
exports.NFL_ABBREVIATIONS = {
    // AFC East
    "BUF": "Buffalo Bills",
    "MIA": "Miami Dolphins",
    "NE": "New England Patriots",
    "NYJ": "New York Jets",
    // AFC North
    "BAL": "Baltimore Ravens",
    "CIN": "Cincinnati Bengals",
    "CLE": "Cleveland Browns",
    "PIT": "Pittsburgh Steelers",
    // AFC South
    "HOU": "Houston Texans",
    "IND": "Indianapolis Colts",
    "JAX": "Jacksonville Jaguars",
    "TEN": "Tennessee Titans",
    // AFC West
    "DEN": "Denver Broncos",
    "KC": "Kansas City Chiefs",
    "LV": "Las Vegas Raiders",
    "LAC": "Los Angeles Chargers",
    // NFC East
    "DAL": "Dallas Cowboys",
    "NYG": "New York Giants",
    "PHI": "Philadelphia Eagles",
    "WAS": "Washington Commanders",
    // NFC North
    "CHI": "Chicago Bears",
    "DET": "Detroit Lions",
    "GB": "Green Bay Packers",
    "MIN": "Minnesota Vikings",
    // NFC South
    "ATL": "Atlanta Falcons",
    "CAR": "Carolina Panthers",
    "NO": "New Orleans Saints",
    "TB": "Tampa Bay Buccaneers",
    // NFC West
    "ARI": "Arizona Cardinals",
    "LAR": "Los Angeles Rams",
    "SF": "San Francisco 49ers",
    "SEA": "Seattle Seahawks",
    // Variações
    "GSW": "Golden State Warriors", // Não é NFL, mas adicionado para segurança
};
/**
 * Ligas alternativas e times internacionais
 */
exports.OTHER_FOOTBALL_LEAGUES = {
    // CFL - Canadian Football League
    CFL: [
        "BC Lions",
        "Calgary Stampeders",
        "Edmonton Elks",
        "Saskatchewan Roughriders",
        "Winnipeg Blue Bombers",
        "Hamilton Tiger-Cats",
        "Toronto Argonauts",
        "Ottawa Redblacks",
        "Montreal Alouettes",
    ],
    // UFL - United Football League (2024 - merger de XFL + USFL)
    UFL: [
        "Arlington Renegades",
        "Birmingham Stallions",
        "DC Defenders",
        "Houston Roughnecks",
        "Memphis Showboats",
        "Michigan Panthers",
        "San Antonio Brahmas",
        "St. Louis Battlehawks",
    ],
    // ELF - European League of Football
    ELF: [
        // Alemanha
        "Berlin Thunder",
        "Cologne Centurions",
        "Frankfurt Galaxy",
        "Hamburg Sea Devils",
        "Munich Ravens",
        "Rhein Fire",
        "Stuttgart Surge",
        // Áustria
        "Vienna Vikings",
        "Tirol Raiders",
        // França
        "Paris Musketeers",
        // Espanha
        "Madrid Bravos",
        // Itália
        "Milano Seamen",
        // Suíça
        "Helvetic Mercenaries",
        // Hungria
        "Fehérvár Enthroners",
        // República Tcheca
        "Prague Lions",
    ],
};
/**
 * Função auxiliar para normalizar nome de time NFL
 * @param teamName Nome do time ou sigla
 * @returns Nome completo do time ou undefined se não encontrado
 */
function normalizeNFLTeam(teamName) {
    if (!teamName)
        return undefined;
    const normalized = teamName.trim().toLowerCase();
    // 1. Verificar em times atuais (case-insensitive)
    for (const team of exports.NFL_CURRENT_TEAMS) {
        if (team.toLowerCase() === normalized) {
            return team;
        }
    }
    // 2. Verificar em aliases
    for (const [alias, official] of Object.entries(exports.NFL_TEAM_ALIASES)) {
        if (alias.toLowerCase() === normalized) {
            return official;
        }
    }
    // 3. Verificar em siglas
    for (const [abbrev, official] of Object.entries(exports.NFL_ABBREVIATIONS)) {
        if (abbrev.toLowerCase() === normalized) {
            return official;
        }
    }
    return undefined;
}
/**
 * Função auxiliar para verificar se um time existe em qualquer liga alternativa
 * @param teamName Nome do time
 * @returns Liga e nome do time se encontrado, ou undefined
 */
function findOtherFootballTeam(teamName) {
    if (!teamName)
        return undefined;
    const normalized = teamName.trim().toLowerCase();
    for (const [league, teams] of Object.entries(exports.OTHER_FOOTBALL_LEAGUES)) {
        for (const team of teams) {
            if (team.toLowerCase() === normalized) {
                return { league, team };
            }
        }
    }
    return undefined;
}
exports.default = {
    NFL_CURRENT_TEAMS: exports.NFL_CURRENT_TEAMS,
    NFL_TEAM_ALIASES: exports.NFL_TEAM_ALIASES,
    NFL_ABBREVIATIONS: exports.NFL_ABBREVIATIONS,
    OTHER_FOOTBALL_LEAGUES: exports.OTHER_FOOTBALL_LEAGUES,
    normalizeNFLTeam,
    findOtherFootballTeam,
};
