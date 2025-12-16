export const dashboardStats = [
  { label: 'Apostas Concluídas', value: 0, helper: '0 de 0 apostas totais', icon: '🎯' },
  { label: 'Total Investido', value: 'R$ 0,00', helper: 'Stake total das apostas', icon: '💰' },
  { label: 'Lucro Total', value: 'R$ 0,00', helper: 'Resultado líquido + banca inicial', icon: '📈' },
  { label: 'ROI', value: '0,0%', helper: 'Retorno sobre investimento', icon: '📊' }
];

export const lucroAcumulado = Array.from({ length: 12 }).map((_, index) => ({
  month: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][index],
  lucro: 0,
  acumulado: 0
}));

export const lucroPorTipster = [
  { tipster: 'Tipster 1', lucro: 0 },
  { tipster: 'Tipster 2', lucro: 0 },
  { tipster: 'Tipster 3', lucro: 0 },
  { tipster: 'Tipster 4', lucro: 0 }
];

export interface BancoStats {
  views: {
    hoje: number;
    semana: number;
    mes: number;
    total: number;
  };
  infoLink: {
    url: string;
    criadoEm: string;
  };
  engajamento: {
    taxaVisitantes: number;
    mediaVisualizacoesDia: number;
    ultimaAtividade: string;
  };
}

export interface Transacao {
  id: string;
  data: string;
  tipo: string;
  casa: string;
  valor: string;
  observacao: string;
}

export interface Aposta {
  id: string;
  data: string;
  esporte: string;
  partida: string;
  mercado: string;
  stake: string;
  status: string;
  retorno: string;
}

export interface Banco {
  id: string;
  nome: string;
  descricao: string;
  status: string;
  padrao: boolean;
  cor?: string;
  visualizacoes: number;
  visitantes: number;
  ultimaVisualizacao: string;
  criadoEm: string;
  stats: BancoStats;
}

export const bancos: Banco[] = [
  {
    id: '019a9057-2c4c-7064-ae34-4b7489691ccd',
    nome: 'Padrão',
    descricao: 'Banca padrão gerada pelo sistema',
    status: 'Ativa',
    padrao: true,
    visualizacoes: 0,
    visitantes: 0,
    ultimaVisualizacao: 'Nunca',
    criadoEm: '17/11/2025 às 02:43:43',
    stats: {
      views: { hoje: 0, semana: 0, mes: 0, total: 0 },
      infoLink: {
        url: 'https://dashboard.sharktrack.app/banca/padrao',
        criadoEm: '17/11/2025 às 02:43:43'
      },
      engajamento: {
        taxaVisitantes: 0,
        mediaVisualizacoesDia: 0,
        ultimaAtividade: 'Nunca'
      }
    }
  }
];

export const transacoes: Transacao[] = [];

export const apostas: Aposta[] = [];

