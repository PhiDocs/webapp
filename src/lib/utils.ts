import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getShortDate(dateString: string | undefined | null) {
  if (!dateString) return '...';
  try {
    const date = new Date(dateString);
    // Adiciona o offset do fuso horário para evitar problemas de um dia a menos
    const zonedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return zonedDate.toLocaleDateString('pt-BR');
  } catch (e) {
    return 'Data inválida';
  }
}
