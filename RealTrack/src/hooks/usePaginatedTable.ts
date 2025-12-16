/**
 * Hook genérico para tabelas paginadas
 * 
 * Fornece funcionalidade de paginação, ordenação e seleção
 * para uso com qualquer tipo de dado tabular.
 */

import { useState, useCallback, useMemo } from 'react';

// ============================================
// Tipos
// ============================================

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
  key: keyof T | null;
  direction: SortDirection;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

export interface UsePaginatedTableOptions<T> {
  data: T[];
  initialPageSize?: number;
  initialSortKey?: keyof T;
  initialSortDirection?: SortDirection;
  getRowId?: (row: T) => string;
}

export interface UsePaginatedTableResult<T> {
  // Dados paginados
  paginatedData: T[];
  
  // Paginação
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  
  // Ordenação
  sortConfig: SortConfig<T>;
  handleSort: (key: keyof T) => void;
  setSortConfig: (config: SortConfig<T>) => void;
  
  // Seleção
  selectedRows: Set<string>;
  isRowSelected: (row: T) => boolean;
  toggleRowSelection: (row: T) => void;
  toggleAllSelection: () => void;
  clearSelection: () => void;
  selectAll: () => void;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  selectedCount: number;
  
  // Info
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ============================================
// Helpers
// ============================================

/**
 * Compara dois valores para ordenação
 */
function compareValues<T>(a: T, b: T, key: keyof T, direction: SortDirection): number {
  const aValue = a[key];
  const bValue = b[key];
  
  // Tratar valores nulos/undefined
  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return direction === 'asc' ? 1 : -1;
  if (bValue == null) return direction === 'asc' ? -1 : 1;
  
  // Comparar strings
  if (typeof aValue === 'string' && typeof bValue === 'string') {
    const comparison = aValue.localeCompare(bValue, 'pt-BR', { sensitivity: 'base' });
    return direction === 'asc' ? comparison : -comparison;
  }
  
  // Comparar números
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return direction === 'asc' ? aValue - bValue : bValue - aValue;
  }
  
  // Comparar datas
  if (aValue instanceof Date && bValue instanceof Date) {
    return direction === 'asc' 
      ? aValue.getTime() - bValue.getTime() 
      : bValue.getTime() - aValue.getTime();
  }
  
  // Comparar como strings
  const aStr = String(aValue);
  const bStr = String(bValue);
  const comparison = aStr.localeCompare(bStr, 'pt-BR');
  return direction === 'asc' ? comparison : -comparison;
}

/**
 * Default row ID getter
 */
const defaultGetRowId = (row: { id?: string }): string => {
  return row.id ?? String(Math.random());
};

// ============================================
// Hook Principal
// ============================================

export function usePaginatedTable<T extends { id?: string }>(
  options: UsePaginatedTableOptions<T>
): UsePaginatedTableResult<T> {
  const {
    data,
    initialPageSize = 10,
    initialSortKey = null,
    initialSortDirection = 'asc',
    getRowId = defaultGetRowId,
  } = options;
  
  // Estados de paginação
  const [pageState, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  
  // Estado de ordenação
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: initialSortKey,
    direction: initialSortDirection,
  });
  
  // Estado de seleção
  const [selectedRows, setSelectedRows] = useState<Set<string>>(() => new Set());
  
  // Dados ordenados
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => 
      compareValues(a, b, sortConfig.key!, sortConfig.direction)
    );
  }, [data, sortConfig]);
  
  // Cálculos de paginação
  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const clampPage = useCallback(
    (value: number) => {
      if (!Number.isFinite(value) || value < 1) {
        return 1;
      }
      return Math.min(value, totalPages);
    },
    [totalPages]
  );

  const page = clampPage(pageState);

  const setPage = useCallback(
    (value: number | ((prev: number) => number)) => {
      setPageState((prev) => {
        const base = clampPage(prev);
        const nextValue = typeof value === 'function' ? value(base) : value;
        return clampPage(nextValue);
      });
    },
    [clampPage]
  );
  
  // Dados paginados
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, page, pageSize]);
  
  // Índices de exibição
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalItems);
  
  // Navegação
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  // Handlers de paginação
  const nextPage = useCallback(() => {
    if (hasNextPage) setPage((p: number) => p + 1);
  }, [hasNextPage, setPage]);
  
  const prevPage = useCallback(() => {
    if (hasPrevPage) setPage((p: number) => p - 1);
  }, [hasPrevPage, setPage]);
  
  const goToFirstPage = useCallback(() => {
    setPage(1);
  }, [setPage]);
  
  const goToLastPage = useCallback(() => {
    setPage(totalPages);
  }, [setPage, totalPages]);
  
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1); // Resetar para primeira página ao mudar tamanho
  }, [setPage]);
  
  // Handlers de ordenação
  const handleSort = useCallback((key: keyof T) => {
    setSortConfig((current: SortConfig<T>) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);
  
  // Handlers de seleção
  const isRowSelected = useCallback((row: T): boolean => {
    return selectedRows.has(getRowId(row));
  }, [selectedRows, getRowId]);
  
  const toggleRowSelection = useCallback((row: T) => {
    const rowId = getRowId(row);
    setSelectedRows((current: Set<string>) => {
      const newSet = new Set(current);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, [getRowId]);
  
  const toggleAllSelection = useCallback(() => {
    const currentPageIds = paginatedData.map(getRowId);
    const allSelected = currentPageIds.every((id: string) => selectedRows.has(id));
    
    setSelectedRows((current: Set<string>) => {
      const newSet = new Set(current);
      if (allSelected) {
        currentPageIds.forEach((id: string) => newSet.delete(id));
      } else {
        currentPageIds.forEach((id: string) => newSet.add(id));
      }
      return newSet;
    });
  }, [paginatedData, selectedRows, getRowId]);
  
  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);
  
  const selectAll = useCallback(() => {
    const allIds = data.map(getRowId);
    setSelectedRows(new Set(allIds));
  }, [data, getRowId]);
  
  // Estados de seleção calculados
  const isAllSelected = useMemo(() => {
    if (paginatedData.length === 0) return false;
    return paginatedData.every((row: T) => selectedRows.has(getRowId(row)));
  }, [paginatedData, selectedRows, getRowId]);
  
  const isSomeSelected = useMemo(() => {
    if (paginatedData.length === 0) return false;
    const someSelected = paginatedData.some((row: T) => selectedRows.has(getRowId(row)));
    return someSelected && !isAllSelected;
  }, [paginatedData, selectedRows, getRowId, isAllSelected]);
  
  const selectedCount = selectedRows.size;
  
  return {
    // Dados paginados
    paginatedData,
    
    // Paginação
    page,
    pageSize,
    totalPages,
    totalItems,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    goToFirstPage,
    goToLastPage,
    
    // Ordenação
    sortConfig,
    handleSort,
    setSortConfig,
    
    // Seleção
    selectedRows,
    isRowSelected,
    toggleRowSelection,
    toggleAllSelection,
    clearSelection,
    selectAll,
    isAllSelected,
    isSomeSelected,
    selectedCount,
    
    // Info
    startIndex,
    endIndex,
    hasNextPage,
    hasPrevPage,
  };
}

export default usePaginatedTable;
