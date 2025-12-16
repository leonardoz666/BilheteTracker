// Constantes de cores
export const DEFAULT_BANK_COLOR = '#2563eb';

export const BANK_COLOR_PALETTE = [
  '#2563eb', // Azul
  '#0ea5e9', // Ciano
  '#f97316', // Laranja
  '#ef4444', // Vermelho
  '#8b5cf6', // Roxo
  '#fb923c', // Laranja claro
  '#22c55e'  // Verde
];

// Valida se uma cor é válida (não vazia e é string)
export const isValidColor = (color: string | null | undefined): boolean => {
  return !!(color && typeof color === 'string' && color.trim() !== '');
};

// Normaliza uma cor (retorna cor válida ou padrão)
export const normalizeColor = (color: string | null | undefined, defaultColor: string = DEFAULT_BANK_COLOR): string => {
  return isValidColor(color) ? color!.trim() : defaultColor;
};

// Converte cor HEX para RGB
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Cria variações de cor a partir de uma cor HEX
export const createColorVariations = (hexColor: string) => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return null;

  return {
    base: hexColor,
    lighter: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
    light: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
    medium: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
    dark: `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`
  };
};

// Aplica variações de cor como variáveis CSS
export const applyColorTheme = (hexColor: string | null | undefined) => {
  const root = document.documentElement;
  const normalizedColor = normalizeColor(hexColor);
  const variations = createColorVariations(normalizedColor);

  if (variations) {
    // Aplicar variáveis da banca (APENAS para elementos específicos da banca)
    root.style.setProperty('--bank-color', variations.base);
    root.style.setProperty('--bank-color-light', variations.lighter);
    root.style.setProperty('--bank-color-medium', variations.light);
    root.style.setProperty('--bank-color-accent', variations.medium);
    root.style.setProperty('--bank-color-dark', variations.dark);
    
    // IMPORTANTE: NÃO alterar variáveis de background - elas devem permanecer estáticas
    // NÃO alterar: --bg, --bg-primary, --bg-secondary, --surface, --sidebar-bg
    // NÃO alterar cor secundária - ela deve permanecer fixa
    // NÃO alterar sombras - elas devem permanecer fixas
  } else {
    // Reset para cores padrão
    root.style.removeProperty('--bank-color');
    root.style.removeProperty('--bank-color-light');
    root.style.removeProperty('--bank-color-medium');
    root.style.removeProperty('--bank-color-accent');
    root.style.removeProperty('--bank-color-dark');
  }
};

