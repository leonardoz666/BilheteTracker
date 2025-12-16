/**
 * Utilitários de formatação compartilhados
 * Centraliza funções de formatação usadas em múltiplos componentes
 */

/**
 * Formata um valor numérico como moeda brasileira (BRL)
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Formata um valor numérico como percentual
 */
export const formatPercent = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

/**
 * Formata um número com separadores de milhar
 */
export const formatNumber = (value: number, maximumFractionDigits = 0): string => {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits }).format(value);
};

/**
 * Formata uma data no formato brasileiro (dd/mm/yyyy)
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return typeof dateString === 'string' ? dateString : '—';
  }
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formata uma data com horário no formato brasileiro
 */
export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return typeof dateString === 'string' ? dateString : '—';
  }
  return date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

/**
 * Extrai o primeiro nome de um nome completo
 */
export const getFirstName = (nomeCompleto: string): string => {
  return nomeCompleto.split(' ')[0] || nomeCompleto;
};

/**
 * Converte uma data ISO (YYYY-MM-DD) para formato de exibição (dd/mm/yyyy)
 */
export const formatDateDisplay = (iso: string): string => {
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('-');
  if (!yyyy || !mm || !dd) return '';
  return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
};

/**
 * Converte uma data no formato de exibição (dd/mm/yyyy) para ISO (YYYY-MM-DD)
 */
export const normalizeDisplayToISO = (value: string): string | null => {
  if (!value) return null;
  const parts = value
    .replace(/[^0-9/]/g, '')
    .split('/')
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length !== 3) return null;

  const [day, month, year] = parts;

  if (year.length !== 4) return null;

  const dd = day.padStart(2, '0').slice(0, 2);
  const mm = month.padStart(2, '0').slice(0, 2);
  const yyyy = year;

  const iso = `${yyyy}-${mm}-${dd}`;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return iso;
};

/**
 * Retorna a data de hoje no formato ISO (YYYY-MM-DD)
 */
export const getTodayDateISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Converte uma data para formato ISO (YYYY-MM-DD)
 */
export const toISODate = (value: string): string => {
  if (!value) return getTodayDateISO();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getTodayDateISO();
  return date.toISOString().split('T')[0];
};

