import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function getDaysRemainingInMonth(): number {
  const now = new Date();
  const lastDay = getDaysInMonth(now.getMonth() + 1, now.getFullYear());
  return lastDay - now.getDate();
}

export function getMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
  });
}

/**
 * Returns a Tailwind class for budget progress indicator color
 * based on spending percentage: green → amber → red
 */
export function getBudgetProgressColor(percentage: number): string {
  if (percentage >= 100) return "bg-red-500";
  if (percentage >= 75) return "bg-amber-500";
  if (percentage >= 50) return "bg-amber-400";
  return "bg-emerald-500";
}
