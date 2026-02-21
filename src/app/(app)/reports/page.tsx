"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SummaryCards } from "@/components/reports/summary-cards";
import { ReportCalendar } from "@/components/reports/report-calendar";
import { CategoryBreakdown } from "@/components/reports/category-breakdown";
import { MonthlyTrend } from "@/components/reports/monthly-trend";
import type { Wallet } from "@/types/database";

export default function ReportsPage() {
    const supabase = createClient();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [transactions, setTransactions] = useState<any[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [selectedWalletId, setSelectedWalletId] = useState<string>("all");
    const [loading, setLoading] = useState(true);
    const [income, setIncome] = useState(0);
    const [expenses, setExpenses] = useState(0);

    const fetchReportsData = useCallback(async () => {
        setLoading(true);
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
        const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;

        const { data: walletsData } = await supabase.from("wallets").select("*");
        if (walletsData) {
            setWallets(walletsData);
        }

        let query = supabase
            .from("transactions")
            .select("*, categories(*)")
            .gte("date", monthStart)
            .lte("date", monthEnd)
            .order("date", { ascending: false });

        if (selectedWalletId !== "all") {
            query = query.eq("wallet_id", selectedWalletId);
        }

        const { data: monthTx, error } = await query;

        let recurringTxQuery = supabase
            .from("recurring_transactions")
            .select("*, categories(*)")
            .eq("is_active", true);

        if (selectedWalletId !== "all") {
            recurringTxQuery = recurringTxQuery.eq("wallet_id", selectedWalletId);
        }

        const { data: recurringData } = await recurringTxQuery;

        if (!error && monthTx) {
            let allTransactions = [...monthTx];
            const today = new Date();

            // Only project future recurring transactions if we are viewing the current month or a future month
            if (recurringData && (currentMonth.getFullYear() > today.getFullYear() || (currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() >= today.getMonth()))) {
                // Collect recurring IDs that already have a real transaction this month to avoid duplicates
                const recurringIdsWithRealTx = new Set(
                    monthTx.filter((tx: any) => tx.recurring_id).map((tx: any) => tx.recurring_id)
                );

                recurringData.forEach(recur => {
                    const recurDay = recur.day_of_month;

                    // Skip if a real transaction for this recurring already exists this month
                    if (recurringIdsWithRealTx.has(recur.id)) {
                        return;
                    }

                    // Skip if instalment-based and all instalments are already paid
                    if (recur.total_instalments !== null && recur.instalments_paid >= recur.total_instalments) {
                        return;
                    }

                    // For future months, estimate if instalments would still be active
                    if (recur.total_instalments !== null) {
                        const monthsAhead = (year - today.getFullYear()) * 12 + (currentMonth.getMonth() - today.getMonth());
                        const projectedPaid = recur.instalments_paid + monthsAhead;
                        if (projectedPaid >= recur.total_instalments) {
                            return;
                        }
                    }

                    // Skip if the recurring date has already passed in the current month
                    if (currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth() && recurDay <= today.getDate()) {
                        return;
                    }

                    // Create a mock transaction object to inject into the reports data
                    const forecastedTx = {
                        id: `forecast-${recur.id}-${month}-${recurDay}`,
                        amount: recur.amount,
                        type: recur.type,
                        date: `${year}-${String(month).padStart(2, "0")}-${String(recurDay).padStart(2, "0")}`,
                        name: `${recur.merchant_name || 'Recurring'} (Forecast)`,
                        merchant_name: recur.merchant_name,
                        categories: recur.categories,
                        wallet_id: recur.wallet_id,
                        status: "forecast",
                        isForecast: true,
                        category_id: recur.category_id,
                        created_at: null,
                        note: null,
                        recurring_id: recur.id,
                        user_id: recur.user_id,
                    };

                    allTransactions.push(forecastedTx);
                });
            }

            // Ensure chronological order
            allTransactions.sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateB - dateA;
            });

            setTransactions(allTransactions);

            let totalIncome = 0;
            let totalExpenses = 0;

            allTransactions.forEach((tx: any) => {
                const amount = Number(tx.amount);
                if (tx.type === "income") {
                    totalIncome += amount;
                } else if (tx.type === "expense") {
                    totalExpenses += amount;
                }
            });

            setIncome(totalIncome);
            setExpenses(totalExpenses);
        } else {
            console.error("Failed to fetch reports transactions", error);
        }

        setLoading(false);
    }, [supabase, currentMonth, selectedWalletId]);

    useEffect(() => {
        fetchReportsData();
    }, [fetchReportsData]);

    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div className="flex items-center gap-2">
                    <FileBarChart className="w-5 h-5 sm:w-6 sm:h-6 text-violet-600 shrink-0" />
                    <div>
                        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                            Reports
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                        <SelectTrigger className="w-[120px] sm:w-[140px] h-9 sm:h-10 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm text-xs sm:text-sm font-medium focus:ring-violet-500 text-slate-800 dark:text-slate-200">
                            <SelectValue placeholder="All Accounts" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-lg">
                            <SelectItem value="all" className="focus:bg-slate-50 dark:focus:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer">
                                All Accounts
                            </SelectItem>
                            {wallets.map((wallet) => (
                                <SelectItem key={wallet.id} value={wallet.id} className="focus:bg-slate-50 dark:focus:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer">
                                    {wallet.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1 sm:gap-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-0.5 sm:p-1 shadow-sm">
                        <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-xs sm:text-sm font-semibold min-w-[100px] sm:min-w-[120px] text-center text-slate-800 dark:text-slate-200">
                            {format(currentMonth, "MMM yyyy")}
                        </span>
                        <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-20 sm:h-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                        ))}
                    </div>
                    <div className="h-72 sm:h-96 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                </div>
            ) : (
                <div className="space-y-4 sm:space-y-6">
                    <SummaryCards income={income} expenses={expenses} />

                    <ReportCalendar transactions={transactions} month={currentMonth} />

                    <CategoryBreakdown transactions={transactions} />

                    <MonthlyTrend transactions={transactions} month={currentMonth} />
                </div>
            )}
        </div>
    );
}
