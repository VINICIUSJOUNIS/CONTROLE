import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usados pelo modulo de Analise de Credito (/credito) - equivalentes as
// funcoes de @/lib/format.ts, mantidos sob nomes proprios para nao exigir
// reescrever os imports das paginas desse modulo.
export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function formatDays(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} dias`;
}
