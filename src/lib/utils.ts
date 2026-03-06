import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { format, parseISO } from "date-fns";

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
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d");
}

export function toISODateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
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
  return format(new Date(2000, month - 1, 1), "MMMM");
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

/**
 * Returns true if the transaction is an internal transfer between wallets.
 * Transfers are identified by the "transfer:" prefix in the note field.
 */
export function isTransfer(tx: { note?: string | null }): boolean {
  return !!tx.note?.startsWith("transfer:");
}

/**
 * Calculates the next occurrence of a recurring transaction based on the target day of the month.
 * If the target day doesn't exist in a month (e.g., 31st in February), it returns the last day of that month.
 */
export function getNextRecurringDate(day: number, startFrom: Date = new Date()): Date {
  const targetDay = Math.min(31, Math.max(1, day));

  // We want the time to be 00:00:00 to avoid comparison issues
  const baseDate = new Date(startFrom.getFullYear(), startFrom.getMonth(), startFrom.getDate());

  const currentYear = baseDate.getFullYear();
  const currentMonth = baseDate.getMonth(); // 0-indexed

  // Try current month first
  let dateInCurrentMonth = new Date(currentYear, currentMonth, targetDay);

  // If the month rolled over (e.g. Feb 30 -> Mar 2), it means the target day exceeds 
  // the days in this month. Snap it to the last day of the current month.
  if (dateInCurrentMonth.getMonth() !== currentMonth) {
    dateInCurrentMonth = new Date(currentYear, currentMonth + 1, 0);
  }

  // If this date is in the future, return it
  if (dateInCurrentMonth > baseDate) {
    return dateInCurrentMonth;
  }

  // Otherwise, move to the next month
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonth = (currentMonth + 1) % 12;

  let dateInNextMonth = new Date(nextMonthYear, nextMonth, targetDay);

  // Handle rollover for the next month
  if (dateInNextMonth.getMonth() !== nextMonth) {
    dateInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0);
  }

  return dateInNextMonth;
}
