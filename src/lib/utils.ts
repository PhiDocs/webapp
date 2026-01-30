import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getShortDate(dateString: string | undefined | null) {
  if (!dateString) return '...';
  try {
    const date = new Date(dateString);
    // Add timezone offset to avoid a one-day shift
    const zonedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return zonedDate.toLocaleDateString('pt-BR');
  } catch (e) {
    return 'Data inválida';
  }
}
