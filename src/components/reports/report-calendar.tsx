"use client";

import { useState } from "react";
import { useCurrency } from "@/contexts/currency-context";
import { formatCurrency } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isSameMonth,
    isToday,
} from "date-fns";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { X } from "lucide-react";

interface ReportCalendarProps {
    transactions: any[];
    month: Date;
}

export function ReportCalendar({ transactions, month }: ReportCalendarProps) {
    const { currency } = useCurrency();
    const isMobile = useMediaQuery("(max-width: 640px)");
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const weekDaysMobile = ["S", "M", "T", "W", "T", "F", "S"];
    const weekDaysDesktop = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const getDayTransactions = (day: Date) => {
        const year = day.getFullYear();
        const m = String(day.getMonth() + 1).padStart(2, "0");
        const date = String(day.getDate()).padStart(2, "0");
        const dayStr = `${year}-${m}-${date}`;
        return transactions.filter(tx => tx.date && tx.date.startsWith(dayStr));
    };

    const getDayTotals = (day: Date) => {
        const dayTxs = getDayTransactions(day);
        let income = 0;
        let expense = 0;
        dayTxs.forEach(tx => {
            const amount = Number(tx.amount);
            if (tx.type === "income") income += amount;
            else if (tx.type === "expense") expense += amount;
        });
        return { income, expense, net: income - expense, hasActivity: income > 0 || expense > 0, transactions: dayTxs };
    };

    const selectedDayData = selectedDay ? getDayTotals(selectedDay) : null;

    if (isMobile) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/20 transition-all duration-500 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-900/10 opacity-50 pointer-events-none" />

                <div className="p-5 border-b border-slate-100 dark:border-slate-800 relative z-10">
                    <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">Daily Breakdown</h2>
                </div>

                <div className="p-5 relative z-10">
                    {/* Compact week day header */}
                    <div className="grid grid-cols-7 mb-2">
                        {weekDaysMobile.map((day, i) => (
                            <div key={`${day}-${i}`} className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Compact calendar grid — tappable cells */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, idx) => {
                            const { income, expense, hasActivity } = getDayTotals(day);
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const isCurrentDay = isToday(day);
                            const isSelected = selectedDay && day.toDateString() === selectedDay.toDateString();

                            return (
                                <button
                                    key={day.toString() + idx}
                                    type="button"
                                    onClick={() => {
                                        if (isCurrentMonth) {
                                            setSelectedDay(isSelected ? null : day);
                                        }
                                    }}
                                    className={cn(
                                        "aspect-square flex flex-col items-center justify-center rounded-xl transition-all duration-300 relative",
                                        !isCurrentMonth && "opacity-20",
                                        isCurrentMonth && "active:scale-90",
                                        isSelected && "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105 z-20",
                                        isCurrentDay && !isSelected && "bg-indigo-50 dark:bg-indigo-500/10",
                                        !isSelected && isCurrentMonth && "hover:bg-slate-50 dark:hover:bg-slate-800"
                                    )}
                                >
                                    <span className={cn(
                                        "text-xs font-black",
                                        isCurrentDay && !isSelected ? "text-indigo-600 dark:text-indigo-400" : "",
                                        !isSelected && !isCurrentDay && "text-slate-600 dark:text-slate-400"
                                    )}>
                                        {format(day, "d")}
                                    </span>

                                    {/* Activity dots */}
                                    {hasActivity && isCurrentMonth && (
                                        <div className="flex items-center gap-[3px] mt-1">
                                            {income > 0 && (
                                                <span className={cn(
                                                    "w-[4px] h-[4px] rounded-full",
                                                    isSelected ? "bg-white" : "bg-emerald-500"
                                                )} />
                                            )}
                                            {expense > 0 && (
                                                <span className={cn(
                                                    "w-[4px] h-[4px] rounded-full",
                                                    isSelected ? "bg-indigo-200" : "bg-rose-400"
                                                )} />
                                            )}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Dot legend */}
                    <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Income</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-400 shadow-sm" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expense</span>
                        </div>
                    </div>
                </div>

                {/* Selected day detail panel */}
                {selectedDay && selectedDayData && (
                    <div className="mt-auto border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 animate-in slide-in-from-bottom duration-300">
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                    {format(selectedDay, "EEEE, MMM d")}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDay(null)}
                                    className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {selectedDayData.hasActivity ? (
                                <div className="space-y-4">
                                    {/* Day summary */}
                                    <div className="flex items-center gap-3">
                                        {selectedDayData.income > 0 && (
                                            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-800">
                                                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Income</p>
                                                <p className="text-sm font-black text-emerald-600 tabular-nums">+{formatCurrency(selectedDayData.income, currency)}</p>
                                            </div>
                                        )}
                                        {selectedDayData.expense > 0 && (
                                            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-800">
                                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Expense</p>
                                                <p className="text-sm font-black text-rose-500 tabular-nums">-{formatCurrency(selectedDayData.expense, currency)}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Transaction list */}
                                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                        {selectedDayData.transactions.map((tx: any, i: number) => (
                                            <div key={i} className="group flex items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight truncate leading-none mb-1">
                                                        {tx.name || tx.categories?.name || "Transaction"}
                                                        {tx.isForecast && (
                                                            <span className="ml-1.5 text-[10px] font-bold text-amber-500 uppercase">(Forecast)</span>
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tx.categories?.name || "Uncategorized"}</p>
                                                </div>
                                                <span className={cn(
                                                    "text-sm font-black tabular-nums tracking-tight",
                                                    tx.type === "income" ? "text-emerald-600" : "text-rose-500"
                                                )}>
                                                    {tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount), currency)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-sm font-medium text-slate-400">No transactions on this day</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Desktop: full calendar grid with amounts
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/20 transition-all duration-500 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-900/10 opacity-50 pointer-events-none" />

            <div className="p-6 border-b border-slate-100 dark:border-slate-800 relative z-10">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Daily Breakdown</h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Financial calendar overview</p>
            </div>

            <div className="p-6 flex-1 relative z-10">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 mb-4">
                    {weekDaysDesktop.map(day => (
                        <div key={day} className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-3">
                    {days.map((day, idx) => {
                        const { income, expense, net, hasActivity } = getDayTotals(day);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isCurrentDay = isToday(day);

                        const dayContent = (
                            <div
                                key={day.toString() + idx}
                                className={cn(
                                    "min-h-[120px] p-3 rounded-2xl border transition-all duration-300 flex flex-col group/day",
                                    !isCurrentMonth
                                        ? "bg-slate-50/30 dark:bg-slate-900/10 border-transparent text-slate-300 dark:text-slate-700"
                                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm",
                                    isCurrentDay && "border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/20 dark:bg-indigo-500/5",
                                    hasActivity && isCurrentMonth && "hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1"
                                )}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={cn(
                                        "text-xs font-black w-7 h-7 flex items-center justify-center rounded-xl transition-all duration-500",
                                        isCurrentDay
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                                            : "bg-slate-50 dark:bg-slate-800 group-hover/day:bg-indigo-50 dark:group-hover/day:bg-indigo-900/30 group-hover/day:text-indigo-600"
                                    )}>
                                        {format(day, "d")}
                                    </span>
                                </div>

                                {hasActivity && isCurrentMonth && (
                                    <div className="mt-auto space-y-1 flex flex-col">
                                        {income > 0 && (
                                            <div className="flex items-center justify-between gap-1 overflow-hidden">
                                                <div className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                                                <span className="text-[10px] font-black text-emerald-600 tabular-nums truncate">
                                                    +{formatCurrency(income, currency)}
                                                </span>
                                            </div>
                                        )}
                                        {expense > 0 && (
                                            <div className="flex items-center justify-between gap-1 overflow-hidden">
                                                <div className="w-1 h-1 rounded-full bg-rose-400 shrink-0" />
                                                <span className="text-[10px] font-black text-rose-500 tabular-nums truncate">
                                                    -{formatCurrency(expense, currency)}
                                                </span>
                                            </div>
                                        )}
                                        {(income > 0 && expense > 0) && (
                                            <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                                                <p className={cn(
                                                    "text-[10px] font-black tabular-nums text-right truncate",
                                                    net >= 0 ? "text-emerald-600" : "text-rose-500"
                                                )}>
                                                    {net > 0 ? "+" : ""}{formatCurrency(net, currency)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );

                        if (hasActivity && isCurrentMonth) {
                            return (
                                <TooltipProvider key={day.toString() + idx} delayDuration={300}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            {dayContent}
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-2xl max-w-[320px] w-full animate-in fade-in zoom-in-95 duration-200">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                                    <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                                        {format(day, "MMMM d, yyyy")}
                                                    </span>
                                                    <span className={cn(
                                                        "text-sm font-black tabular-nums tracking-tight",
                                                        net >= 0 ? "text-emerald-600" : "text-rose-500"
                                                    )}>
                                                        {net > 0 ? "+" : ""}{formatCurrency(net, currency)}
                                                    </span>
                                                </div>
                                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {getDayTransactions(day).map((tx: any, i: number) => (
                                                        <div key={i} className="flex justify-between items-start gap-4 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-black text-slate-900 dark:text-white truncate tracking-tight">
                                                                    {tx.name || tx.categories?.name || "Transaction"}
                                                                </p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                                    {tx.categories?.name || "Uncategorized"}
                                                                </p>
                                                            </div>
                                                            <span className={cn(
                                                                "text-[11px] font-black tabular-nums tracking-tight",
                                                                tx.type === "income" ? "text-emerald-600" : "text-slate-900 dark:text-white"
                                                            )}>
                                                                {tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount), currency)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            );
                        }

                        return dayContent;
                    })}
                </div>
            </div>
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: oklch(0.88 0.02 80);
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: oklch(0.35 0.02 240);
                }
            `}</style>
        </div>
    );
}
