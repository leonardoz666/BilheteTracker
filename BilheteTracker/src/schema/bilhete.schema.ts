// Tipos principais do sistema de rastreamento de bilhetes
// Este arquivo define:
// - Estrutura mínima da resposta do OCR.space (engine 2)
// - Tipos de metadados do bilhete
// - Estrutura das apostas semânticas retornadas pela etapa LLM
// - Saída final do pipeline

export type OcrSpaceOverlayLine = {
  LineText: string;
  // Outras propriedades (Left, Top, etc) existem no OCR.space,
  // mas NÃO são usadas neste projeto de propósito.
};

export type OcrSpaceTextOverlay = {
  Lines?: OcrSpaceOverlayLine[];
};

export type OcrSpaceParsedResult = {
  ParsedText?: string | null;
  TextOverlay?: OcrSpaceTextOverlay | null;
};

export type OcrSpaceResponse = {
  ParsedResults?: OcrSpaceParsedResult[];
  IsErroredOnProcessing?: boolean;
  // OCRExitCode valores (conforme documentação OCR.space):
  // 1 = Parsed Successfully (Sucesso!)
  // 2 = Parsed Partially (Sucesso parcial, alguns erros)
  // 3 = All pages failed parsing (Falha total)
  // 4 = Error occurred when attempting to parse (Erro fatal)
  OCRExitCode?: number;
  // Pode ser string única ou array de strings, dependendo do erro
  ErrorMessage?: string | string[] | null;
};

// Entrada genérica para normalização de OCR.
// Permite trabalhar tanto com o JSON completo do OCR.space
// quanto com formatos já simplificados (ParsedText/Lines).
export type NormalizationInput =
  | { kind: "ocrSpace"; payload: OcrSpaceResponse }
  | { kind: "parsedText"; payload: string }
  | { kind: "overlayLines"; payload: string[] };

export type NormalizedOcr = {
  // Linhas de texto limpas, sem botões, odds duplicadas
  // ou textos institucionais.
  lines: string[];
};

// Metadados extraídos localmente (sem LLM)
export type BilheteMetadata = {
  esporte: string | null;
  torneio: string | null;
  evento: string | null;
  valorApostado: number | null;
  odd: number | null;
  retornoPotencial: number | null;
  tipo: "Simples" | "Multipla" | "Pré" | "Ao vivo" | null;
  data: string | null; // ISO-8601 ou string bruta normalizada
  bonus: number | null;
};

export type TipoApostaSemantica = "player_prop" | "team_prop" | "match_prop" | "winner";

export type PeriodoAposta =
  | "Jogo"
  | "1º Quarto"
  | "2º Quarto"
  | "1º Tempo"
  | "2º Tempo"
  | null;

export type NivelConfianca = "alta" | "media" | "baixa";

export type ApostaSemantica = {
  tipo: TipoApostaSemantica;
  jogador: string | null;
  estatistica: string; // Ex: "Ressaltos", "Assistências"
  condicao: string; // Ex: "7+", ">= 5", "Duplo-duplo"
  valor: number | null; // Valor numérico quando claramente identificável
  time: string | null; // Nome do time em apostas do tipo "winner"/"moneyline"
  timeAbrev: string | null; // Abreviação do time, ex.: "DAL"
  periodo: PeriodoAposta;
  confianca: NivelConfianca;
};

export type ResultadoSemanticoLLM = {
  apostas: ApostaSemantica[];
};

// Saída final padronizada do sistema
export type BilheteFinal = {
  esporte: string | null;
  torneio: string | null;
  evento: string | null;
  aposta: string; // Texto padronizado, reconstruído do zero
  mercado: string; // Derivado apenas de estatistica + periodo
  valorApostado: number | null;
  odd: number | null;
  retornoPotencial: number | null;
  tipo: "Simples" | "Multipla" | "Pré" | "Ao vivo" | null;
  data: string | null;
  bonus: number | null;
  apostasDetalhadas: ApostaSemantica[];
};
