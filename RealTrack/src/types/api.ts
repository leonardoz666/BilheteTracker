export interface ApiPlan {
  id: string;
  nome: string;
  preco: number;
  limiteApostasDiarias: number;
}

export interface ApiBankroll {
  id: string;
  usuarioId?: string;
  nome: string;
  descricao?: string | null;
  cor?: string | null;
  status: string;
  ePadrao: boolean;
  criadoEm: string;
}

export interface ApiBet {
  id: string;
  bancaId: string;
  esporte: string;
  evento: string;
  aposta: string;
  mercados?: string[];
  torneio?: string | null;
  pais?: string | null;
  mercado: string;
  tipoAposta: string;
  valorApostado: number;
  odd: number;
  bonus: number;
  dataEvento: string;
  tipster?: string | null;
  status: string;
  casaDeAposta: string;
  retornoObtido?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiBetWithBank extends ApiBet {
  banca?: {
    id: string;
    nome: string;
  };
}

export interface ApiBetSummary {
  totalApostas: number;
  totalInvestido: number;
  resultadoApostas: number;
  taxaAcerto: number;
  apostasGanhas: number;
  apostasPerdidas: number;
  apostasPendentes: number;
  apostasVoid: number;
  apostasConcluidas: number;
}

export interface ApiFinancialTransaction {
  id: string;
  bancaId: string;
  tipo: 'Depósito' | 'Saque';
  casaDeAposta: string;
  valor: number;
  dataTransacao: string;
  observacao?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiFinancialTransactionWithBank extends ApiFinancialTransaction {
  banca?: {
    id: string;
    nome: string;
  };
}

export interface ApiFinancialSummary {
  totalDepositado: number;
  totalSacado: number;
  saldoAtual: number;
  totalTransacoes: number;
  totalDepositos: number;
  totalSaques: number;
  resultadoApostas: number;
  apostasPendentes: number;
  valorApostasPendentes: number;
  apostasConcluidas: number;
  porCasa: Record<
    string,
    {
      depositos: number;
      saques: number;
      saldo: number;
      apostas: number;
      resultado: number;
    }
  >;
}

export interface ApiProfileResponse {
  id: string;
  nomeCompleto: string;
  email: string;
  membroDesde: string;
  statusConta: string;
  updatedAt: string;
  telegramId?: string | null;
  telegramUsername?: string | null;
  promoExpiresAt?: string | null;
  plano: ApiPlan;
  fotoPerfil?: string | null;
}

export interface ApiPlanConsumption {
  plano: {
    nome: string;
    limiteDiario: number;
  };
  consumo: {
    apostasHoje: number;
    limite: number;
    porcentagem: number;
    proximoReset: string | null;
  };
}

export interface ApiTipster {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface ApiUploadTicketResponse {
  success: boolean;
  data?: {
    casaDeAposta?: string;
    tipster?: string;
    esporte?: string;
    evento?: string;
    aposta?: string;
    mercados?: string[];
    torneio?: string;
    pais?: string;
    mercado?: string;
    tipoAposta?: string;
    valorApostado?: number;
    odd?: number;
    dataEvento?: string;
    status?: string;
  };
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  error?: string | { path?: string[]; message?: string }[];
  message?: string;
}

export interface ApiError {
  response?: {
    data?: ApiErrorResponse;
  };
  message?: string;
}

