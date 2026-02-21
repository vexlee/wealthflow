"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>([]);
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

        if (selectedWalletIds.length > 0) {
            query = query.in("wallet_id", selectedWalletIds);
        }

        const { data: monthTx, error } = await query;

        let recurringTxQuery = supabase
            .from("recurring_transactions")
            .select("*, categories(*)")
            .eq("is_active", true);

        if (selectedWalletIds.length > 0) {
            recurringTxQuery = recurringTxQuery.in("wallet_id", selectedWalletIds);
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
    }, [supabase, currentMonth, selectedWalletIds]);

    useEffect(() => {
        fetchReportsData();
    }, [fetchReportsData]);

    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <FileBarChart className="w-8 h-8 text-indigo-600" />
                        Reports
                    </h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                        Analyze your financial performance and trends
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-5 h-12 font-bold shadow-sm hover:shadow-md transition-all text-slate-900 dark:text-white"
                            >
                                {selectedWalletIds.length === 0
                                    ? "All Accounts"
                                    : selectedWalletIds.length === 1
                                        ? wallets.find(w => w.id === selectedWalletIds[0])?.name || "1 account"
                                        : `${selectedWalletIds.length} accounts`}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl p-2">
                            <DropdownMenuCheckboxItem
                                checked={selectedWalletIds.length === 0}
                                onCheckedChange={() => setSelectedWalletIds([])}
                                className="rounded-xl focus:bg-slate-50 dark:focus:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer font-bold"
                            >
                                All Accounts
                            </DropdownMenuCheckboxItem>
                            {wallets.map((wallet) => (
                                <DropdownMenuCheckboxItem
                                    key={wallet.id}
                                    checked={selectedWalletIds.includes(wallet.id)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setSelectedWalletIds([...selectedWalletIds, wallet.id]);
                                        } else {
                                            setSelectedWalletIds(selectedWalletIds.filter(id => id !== wallet.id));
                                        }
                                    }}
                                    className="rounded-xl focus:bg-slate-50 dark:focus:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer font-bold"
                                >
                                    {wallet.name}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1 shadow-sm h-12">
                        <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-10 w-10 text-slate-600 hover:text-slate-900 rounded-xl">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <span className="text-sm font-black min-w-[120px] text-center text-slate-900 dark:text-white uppercase tracking-widest">
                            {format(currentMonth, "MMM yyyy")}
                        </span>
                        <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-10 w-10 text-slate-600 hover:text-slate-900 rounded-xl">
                            <ChevronRight className="w-5 h-5" />
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
