/**
 * Otimizações de queries avançadas para Prisma
 * 
 * Este módulo fornece helpers para:
 * - Pagination cursor-based eficiente
 * - Queries otimizadas com $queryRaw
 * - Agregações complexas
 * - Prevenção de N+1 queries
 */

import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';
import { getCached } from '../lib/cache.js';

/**
 * Interface para pagination cursor-based
 */
export interface CursorPaginationOptions {
  cursor?: string; // ID do último item da página anterior
  take?: number;   // Quantidade de itens por página (padrão: 50)
  orderBy?: 'asc' | 'desc'; // Direção da ordenação (padrão: desc)
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null; // null se não houver mais páginas
  hasMore: boolean;
}

/**
 * Busca apostas com cursor pagination otimizada
 * 
 * Usa o índice @@index([bancaId, dataJogo(sort: Desc)])
 * Evita OFFSET/LIMIT que são lentos em grandes datasets
 */
export async function getApostasPaginated(
  bancaId: string,
  options: CursorPaginationOptions = {}
): Promise<PaginatedResult<any>> {
  const { cursor, take = 50, orderBy = 'desc' } = options;

  const apostas = await prisma.bet.findMany({
    where: { bancaId },
    take: take + 1, // Pega 1 a mais para saber se há próxima página
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // Pula o cursor
    }),
    orderBy: { dataJogo: orderBy },
  });

  const hasMore = apostas.length > take;
  const data = hasMore ? apostas.slice(0, -1) : apostas;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor, hasMore };
}

/**
 * Busca transações com cursor pagination otimizada
 * 
 * Usa o índice @@index([bancaId, dataTransacao(sort: Desc)])
 */
export async function getTransacoesPaginated(
  bancaId: string,
  options: CursorPaginationOptions = {}
): Promise<PaginatedResult<any>> {
  const { cursor, take = 50, orderBy = 'desc' } = options;

  const transacoes = await prisma.financialTransaction.findMany({
    where: { bancaId },
    take: take + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    orderBy: { dataTransacao: orderBy },
  });

  const hasMore = transacoes.length > take;
  const data = hasMore ? transacoes.slice(0, -1) : transacoes;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor, hasMore };
}

/**
 * Estatísticas agregadas de apostas por esporte
 * 
 * Usa query raw para GROUP BY eficiente com índice
 */
export async function getApostasStatsByEsporte(
  bancaId: string
): Promise<Array<{
  esporte: string;
  total: number;
  ganhas: number;
  perdidas: number;
  pendentes: number;
  valorTotal: number;
  lucro: number;
}>> {
  const cacheKey = `banca:${bancaId}:stats:esporte`;

  const result = await getCached(cacheKey, () => prisma.$queryRaw<Array<{
    esporte: string;
    total: bigint;
    ganhas: bigint;
    perdidas: bigint;
    pendentes: bigint;
    valorTotal: Prisma.Decimal;
    lucro: Prisma.Decimal;
  }>>`
    SELECT 
      esporte,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'Green' OR status = 'Vencida') as ganhas,
      COUNT(*) FILTER (WHERE status = 'Red' OR status = 'Perdida') as perdidas,
      COUNT(*) FILTER (WHERE status = 'Pendente') as pendentes,
      SUM("valorApostado") as "valorTotal",
      SUM(COALESCE("retornoObtido", 0) - "valorApostado") as lucro
    FROM bets
    WHERE "bancaId" = ${bancaId}::uuid
    GROUP BY esporte
    ORDER BY total DESC
  `, 300);

  return result.map(row => ({
    esporte: row.esporte,
    total: Number(row.total),
    ganhas: Number(row.ganhas),
    perdidas: Number(row.perdidas),
    pendentes: Number(row.pendentes),
    valorTotal: Number(row.valorTotal),
    lucro: Number(row.lucro),
  }));
}

/**
 * Estatísticas agregadas de apostas por período
 * 
 * Agrupa apostas por dia/semana/mês usando date_trunc
 */
export async function getApostasStatsByPeriodo(
  bancaId: string,
  periodo: 'day' | 'week' | 'month' = 'day',
  limite: number = 30
): Promise<Array<{
  data: Date;
  total: number;
  ganhas: number;
  perdidas: number;
  valorTotal: number;
  lucro: number;
}>> {
  const result = await prisma.$queryRaw<Array<{
    data: Date;
    total: bigint;
    ganhas: bigint;
    perdidas: bigint;
    valorTotal: Prisma.Decimal;
    lucro: Prisma.Decimal;
  }>>`
    SELECT 
      date_trunc(${periodo}, "dataJogo") as data,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'Green' OR status = 'Vencida') as ganhas,
      COUNT(*) FILTER (WHERE status = 'Red' OR status = 'Perdida') as perdidas,
      SUM("valorApostado") as "valorTotal",
      SUM(COALESCE("retornoObtido", 0) - "valorApostado") as lucro
    FROM bets
    WHERE "bancaId" = ${bancaId}::uuid
    GROUP BY date_trunc(${periodo}, "dataJogo")
    ORDER BY data DESC
    LIMIT ${limite}
  `;

  return result.map(row => ({
    data: new Date(row.data),
    total: Number(row.total),
    ganhas: Number(row.ganhas),
    perdidas: Number(row.perdidas),
    valorTotal: Number(row.valorTotal),
    lucro: Number(row.lucro),
  }));
}

/**
 * Dashboard completo com estatísticas agregadas
 * 
 * Usa uma única query complexa para evitar múltiplas roundtrips
 */
export async function getDashboardStats(userId: string): Promise<{
  totalBancas: number;
  totalApostas: number;
  apostasGanhas: number;
  apostasPerdidas: number;
  apostasPendentes: number;
  valorTotalApostado: number;
  lucroTotal: number;
  roi: number;
}> {
  const result = await prisma.$queryRaw<Array<{
    totalBancas: bigint;
    totalApostas: bigint;
    apostasGanhas: bigint;
    apostasPerdidas: bigint;
    apostasPendentes: bigint;
    valorTotalApostado: Prisma.Decimal;
    lucroTotal: Prisma.Decimal;
  }>>`
    WITH user_bancas AS (
      SELECT id FROM bankrolls WHERE "usuarioId" = ${userId}::uuid
    )
    SELECT 
      (SELECT COUNT(*) FROM user_bancas) as "totalBancas",
      COUNT(b.id) as "totalApostas",
      COUNT(b.id) FILTER (WHERE b.status = 'Green' OR b.status = 'Vencida') as "apostasGanhas",
      COUNT(b.id) FILTER (WHERE b.status = 'Red' OR b.status = 'Perdida') as "apostasPerdidas",
      COUNT(b.id) FILTER (WHERE b.status = 'Pendente') as "apostasPendentes",
      COALESCE(SUM(b."valorApostado"), 0) as "valorTotalApostado",
      COALESCE(SUM(b."retornoObtido" - b."valorApostado"), 0) as "lucroTotal"
    FROM bets b
    WHERE b."bancaId" IN (SELECT id FROM user_bancas)
  `;

  const row = result[0];
  const valorTotal = Number(row.valorTotalApostado);
  const lucro = Number(row.lucroTotal);

  return {
    totalBancas: Number(row.totalBancas),
    totalApostas: Number(row.totalApostas),
    apostasGanhas: Number(row.apostasGanhas),
    apostasPerdidas: Number(row.apostasPerdidas),
    apostasPendentes: Number(row.apostasPendentes),
    valorTotalApostado: valorTotal,
    lucroTotal: lucro,
    roi: valorTotal > 0 ? (lucro / valorTotal) * 100 : 0,
  };
}

/**
 * Busca apostas com filtros complexos otimizada
 * 
 * Usa índices compostos para filtros combinados
 */
export async function getApostasFiltered(
  bancaId: string,
  filters: {
    status?: string[];
    esporte?: string;
    dataInicio?: Date;
    dataFim?: Date;
    tipster?: string;
  },
  pagination: CursorPaginationOptions = {}
): Promise<PaginatedResult<any>> {
  const { cursor, take = 50, orderBy = 'desc' } = pagination;
  const { status, esporte, dataInicio, dataFim, tipster } = filters;

  const where: any = { bancaId };

  if (status && status.length > 0) {
    where.status = { in: status };
  }

  if (esporte) {
    where.esporte = esporte;
  }

  if (dataInicio || dataFim) {
    where.dataJogo = {};
    if (dataInicio) where.dataJogo.gte = dataInicio;
    if (dataFim) where.dataJogo.lte = dataFim;
  }

  if (tipster) {
    where.tipster = tipster;
  }

  const apostas = await prisma.bet.findMany({
    where,
    take: take + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    orderBy: { dataJogo: orderBy },
  });

  const hasMore = apostas.length > take;
  const data = hasMore ? apostas.slice(0, -1) : apostas;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor, hasMore };
}

/**
 * Busca tipsters com suas estatísticas agregadas
 * 
 * Evita N+1 queries usando LEFT JOIN
 */
export async function getTipstersWithStats(userId: string): Promise<Array<{
  id: string;
  nome: string;
  ativo: boolean;
  totalApostas: number;
  apostasGanhas: number;
  taxaAcerto: number;
  lucro: number;
}>> {
  const result = await prisma.$queryRaw<Array<{
    id: string;
    nome: string;
    ativo: boolean;
    totalApostas: bigint;
    apostasGanhas: bigint;
    lucro: Prisma.Decimal;
  }>>`
    SELECT 
      t.id,
      t.nome,
      t.ativo,
      COALESCE(COUNT(b.id), 0) as "totalApostas",
      COALESCE(COUNT(b.id) FILTER (WHERE b.status = 'Green' OR b.status = 'Vencida'), 0) as "apostasGanhas",
      COALESCE(SUM(b."retornoObtido" - b."valorApostado"), 0) as lucro
    FROM tipsters t
    LEFT JOIN bets b ON b.tipster = t.nome 
      AND b."bancaId" IN (SELECT id FROM bankrolls WHERE "usuarioId" = ${userId}::uuid)
    WHERE t."usuarioId" = ${userId}::uuid
    GROUP BY t.id, t.nome, t.ativo
    ORDER BY "totalApostas" DESC
  `;

  return result.map(row => {
    const total = Number(row.totalApostas);
    const ganhas = Number(row.apostasGanhas);

    return {
      id: row.id,
      nome: row.nome,
      ativo: row.ativo,
      totalApostas: total,
      apostasGanhas: ganhas,
      taxaAcerto: total > 0 ? (ganhas / total) * 100 : 0,
      lucro: Number(row.lucro),
    };
  });
}
