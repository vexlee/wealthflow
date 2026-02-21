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
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="p-3 border-b border-slate-200/80 dark:border-slate-800">
                    <h2 className="text-sm font-medium text-slate-800 dark:text-slate-200">Daily Breakdown</h2>
                </div>

                <div className="p-3">
                    {/* Compact week day header */}
                    <div className="grid grid-cols-7 mb-1">
                        {weekDaysMobile.map((day, i) => (
                            <div key={`${day}-${i}`} className="text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Compact calendar grid — tappable cells */}
                    <div className="grid grid-cols-7 gap-[2px]">
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
                                        "aspect-square flex flex-col items-center justify-center rounded-lg transition-colors relative",
                                        !isCurrentMonth && "opacity-30",
                                        isCurrentMonth && "active:scale-95",
                                        isSelected && "bg-violet-100 dark:bg-violet-500/20 ring-1 ring-violet-400 dark:ring-violet-500",
                                        isCurrentDay && !isSelected && "bg-violet-50 dark:bg-violet-500/10",
                                    )}
                                >
                                    <span className={cn(
                                        "text-xs font-medium leading-none",
                                        isCurrentDay ? "text-violet-600 dark:text-violet-400 font-bold" : "text-slate-700 dark:text-slate-300",
                                        !isCurrentMonth && "text-slate-400 dark:text-slate-600"
                                    )}>
                                        {format(day, "d")}
                                    </span>

                                    {/* Activity dots */}
                                    {hasActivity && isCurrentMonth && (
                                        <div className="flex items-center gap-[3px] mt-1">
                                            {income > 0 && (
                                                <span className="w-[5px] h-[5px] rounded-full bg-emerald-500" />
                                            )}
                                            {expense > 0 && (
                                                <span className="w-[5px] h-[5px] rounded-full bg-red-400" />
                                            )}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Dot legend */}
                    <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] text-slate-500">Income</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-400" />
                            <span className="text-[10px] text-slate-500">Expense</span>
                        </div>
                    </div>
                </div>

                {/* Selected day detail panel */}
                {selectedDay && selectedDayData && (
                    <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="p-3">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    {format(selectedDay, "EEEE, MMM d")}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedDay(null)}
                                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {selectedDayData.hasActivity ? (
                                <>
                                    {/* Day summary */}
                                    <div className="flex items-center gap-3 mb-3">
                                        {selectedDayData.income > 0 && (
                                            <div className="flex-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-3 py-2 text-center">
                                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase">Income</p>
                                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">+{formatCurrency(selectedDayData.income, currency)}</p>
                                            </div>
                                        )}
                                        {selectedDayData.expense > 0 && (
                                            <div className="flex-1 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2 text-center">
                                                <p className="text-[10px] text-red-500 dark:text-red-400 font-medium uppercase">Expense</p>
                                                <p className="text-sm font-bold text-red-600 dark:text-red-300">-{formatCurrency(selectedDayData.expense, currency)}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Transaction list */}
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {selectedDayData.transactions.map((tx: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900/50">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                                                        {tx.name || tx.categories?.name || "Transaction"}
                                                        {tx.isForecast && (
                                                            <span className="ml-1 text-[10px] text-amber-500 font-normal">(Forecast)</span>
                                                        )}
                                                    </p>
                                                    {tx.categories?.name && tx.name && (
                                                        <p className="text-xs text-slate-400 truncate">{tx.categories.name}</p>
                                                    )}
                                                </div>
                                                <span className={cn(
                                                    "text-sm font-semibold whitespace-nowrap",
                                                    tx.type === "income" ? "text-emerald-600" : "text-red-500"
                                                )}>
                                                    {tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount), currency)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p className="text-sm text-slate-400 text-center py-4">No transactions on this day</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Desktop: full calendar grid with amounts
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-800">
                <h2 className="text-sm font-medium text-slate-800 dark:text-slate-200">Daily Breakdown</h2>
            </div>

            <div className="p-4 flex-1">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 mb-2">
                    {weekDaysDesktop.map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                    {days.map((day, idx) => {
                        const { income, expense, net, hasActivity } = getDayTotals(day);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isCurrentDay = isToday(day);

                        const dayContent = (
                            <div
                                key={day.toString() + idx}
                                className={cn(
                                    "min-h-[100px] p-2 rounded-lg border flex flex-col transition-colors",
                                    !isCurrentMonth
                                        ? "bg-slate-50/50 dark:bg-slate-900/30 border-transparent text-slate-400 dark:text-slate-600"
                                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300",
                                    isCurrentDay && "border-violet-200 dark:border-violet-500/30 bg-violet-50/30 dark:bg-violet-500/5",
                                    hasActivity && isCurrentMonth && "hover:border-slate-300 dark:hover:border-slate-700"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={cn(
                                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                        isCurrentDay
                                            ? "bg-violet-600 text-white"
                                            : "text-inherit"
                                    )}>
                                        {format(day, "d")}
                                    </span>
                                </div>

                                {hasActivity && isCurrentMonth && (
                                    <div className="mt-auto space-y-1 flex flex-col text-xs">
                                        {income > 0 && expense > 0 ? (
                                            <>
                                                <span className="text-emerald-600 font-medium truncate" title={`Income: +${formatCurrency(income, currency)}`}>
                                                    In: +{formatCurrency(income, currency)}
                                                </span>
                                                <span className="text-red-500 font-medium truncate" title={`Expense: -${formatCurrency(expense, currency)}`}>
                                                    Out: -{formatCurrency(expense, currency)}
                                                </span>
                                                <div className="w-full h-px bg-slate-100 dark:bg-slate-800 my-0.5" />
                                                <span className={cn(
                                                    "font-semibold truncate",
                                                    net >= 0 ? "text-emerald-600" : "text-red-500"
                                                )} title={`Net: ${net > 0 ? "+" : ""}${formatCurrency(net, currency)}`}>
                                                    {net > 0 ? "+" : ""}{formatCurrency(net, currency)}
                                                </span>
                                            </>
                                        ) : income > 0 ? (
                                            <span className="text-emerald-600 font-semibold truncate" title={`Income: +${formatCurrency(income, currency)}`}>
                                                +{formatCurrency(income, currency)}
                                            </span>
                                        ) : (
                                            <span className="text-red-500 font-semibold truncate" title={`Expense: -${formatCurrency(expense, currency)}`}>
                                                -{formatCurrency(expense, currency)}
                                            </span>
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
                                        <TooltipContent className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 shadow-xl max-w-[280px] w-full">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                        {format(day, "MMM d, yyyy")}
                                                    </span>
                                                    <span className={cn(
                                                        "text-sm font-semibold",
                                                        net >= 0 ? "text-emerald-600" : "text-red-500"
                                                    )}>
                                                        {net > 0 ? "+" : ""}{formatCurrency(net, currency)}
                                                    </span>
                                                </div>
                                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                                    {getDayTransactions(day).map((tx: any, i: number) => (
                                                        <div key={i} className="flex justify-between items-start gap-4 text-sm">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                                                    {tx.name || tx.categories?.name || "Transaction"}
                                                                </p>
                                                                {tx.categories?.name && tx.name && (
                                                                    <p className="text-xs text-slate-500 truncate">
                                                                        {tx.categories.name}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className={cn(
                                                                "font-medium whitespace-nowrap",
                                                                tx.type === "income" ? "text-emerald-600" : "text-slate-900 dark:text-slate-100"
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
        </div>
    );
}
