import { useCallback, useEffect, useState } from 'react';

interface UseChartContainerOptions {
  minHeight?: number;
  minWidth?: number;
}

interface ChartContainerDimensions {
  width: number;
  height: number;
}

/**
 * Observa o container de um gráfico e só libera o render quando ele possui dimensões válidas.
 * Evita warnings do Recharts quando o container está oculto ou com tamanho zero.
 */
export function useChartContainer(options: UseChartContainerOptions = {}) {
  const { minHeight = 120, minWidth = 120 } = options;
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [hasSize, setHasSize] = useState(false);
  const [dimensions, setDimensions] = useState<ChartContainerDimensions>({ width: 0, height: 0 });

  const containerRef = useCallback((element: HTMLDivElement | null) => {
    setNode(element);
    if (!element) {
      setHasSize(false);
      setDimensions({ width: 0, height: 0 });
    }
  }, []);

  useEffect(() => {
    const element = node;
    if (!element) {
      return undefined;
    }

    const applySize = (width: number, height: number) => {
      setDimensions({ width, height });
      setHasSize(width >= minWidth && height >= minHeight);
    };

    if (typeof window === 'undefined') {
      return undefined;
    }

    if (typeof ResizeObserver === 'undefined') {
      const updateSize = () => {
        const rect = element.getBoundingClientRect();
        applySize(rect.width ?? 0, rect.height ?? 0);
      };

      updateSize();
      window.addEventListener('resize', updateSize);

      return () => {
        window.removeEventListener('resize', updateSize);
      };
    }

    const initialRect = element.getBoundingClientRect();
    applySize(initialRect.width ?? 0, initialRect.height ?? 0);

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      applySize(width, height);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [node, minHeight, minWidth]);

  return { containerRef, hasSize, dimensions };
}

export type UseChartContainerResult = ReturnType<typeof useChartContainer>;
