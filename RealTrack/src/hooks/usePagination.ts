import { useMemo, useState } from 'react';

export function usePagination<T>(items: T[], perPage = 20) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, page, perPage]);

  return {
    page,
    totalPages,
    setPage,
    paginatedItems,
  };
}
