"use client";

import { useCurrency } from "@/contexts/currency-context";
import { formatCurrency } from "@/lib/utils";
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isSameMonth,
    isToday,
    isSameDay
} from "date-fns";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReportCalendarProps {
    transactions: any[];
    month: Date;
}

export function ReportCalendar({ transactions, month }: ReportCalendarProps) {
    const { currency } = useCurrency();

    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const getDayTransactions = (day: Date) => {
        const year = day.getFullYear();
        const month = String(day.getMonth() + 1).padStart(2, "0");
        const date = String(day.getDate()).padStart(2, "0");
        const dayStr = `${year}-${month}-${date}`;

        return transactions.filter(tx => tx.date && tx.date.startsWith(dayStr));
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-800">
                <h2 className="text-sm font-medium text-slate-800 dark:text-slate-200">Daily Breakdown</h2>
            </div>

            <div className="p-4 flex-1">
                {/* Calendar Header */}
                <div className="grid grid-cols-7 mb-2">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 lg:gap-2">
                    {days.map((day, idx) => {
                        const dayTxs = getDayTransactions(day);

                        let income = 0;
                        let expense = 0;

                        dayTxs.forEach(tx => {
                            const amount = Number(tx.amount);
                            if (tx.type === "income") income += amount;
                            else if (tx.type === "expense") expense += amount;
                        });

                        const net = income - expense;
                        const hasActivity = income > 0 || expense > 0;

                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isCurrentDay = isToday(day);

                        const dayContent = (
                            <div
                                key={day.toString() + idx}
                                className={cn(
                                    "min-h-[80px] sm:min-h-[100px] p-1.5 sm:p-2 rounded-lg border flex flex-col transition-colors",
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
                                    <div className="mt-auto space-y-1 flex flex-col text-[10px] sm:text-xs">
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
                                                    {dayTxs.map((tx: any, i: number) => (
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
