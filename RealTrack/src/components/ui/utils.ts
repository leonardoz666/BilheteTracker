import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Always keep at least one literal Tailwind utility per branch when composing
// classes so the purge step can detect them. Dynamic fragments should only
// append to those literals (see docs/tailwind-dynamic-classes.md).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
