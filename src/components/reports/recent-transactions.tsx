"use client";

import { useCurrency } from "@/contexts/currency-context";
import { usePrivacy } from "@/contexts/privacy-context";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface RecentTransactionsProps {
    transactions: any[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
    const { currency } = useCurrency();
    const { isPrivacyMode } = usePrivacy();

    const maskValue = (value: string | number, isCurrency = true) => {
        if (isPrivacyMode) {
            return "••••••";
        }
        return isCurrency ? formatCurrency(Number(value), currency) : String(value);
    };

    // Filter out forecast transactions for recent transactions view
    const realTransactions = transactions.filter(tx => !tx.isForecast);
    const recentTransactions = realTransactions.slice(0, 8);

    return (
        <Card className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-[2rem] shadow-sm flex flex-col hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/20 transition-all duration-500 overflow-hidden relative min-h-[350px] sm:min-h-[450px]">
            {/* Subtle Gradient Glow */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-900/10 opacity-50 pointer-events-none" />

            <CardHeader className="pb-4 relative z-10 p-4 sm:p-6 lg:p-8 border-b-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">Recent Transactions</CardTitle>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5 sm:mt-1">Latest updates</p>
                    </div>
                    <Link
                        href="/transactions"
                        className="text-[11px] font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-all hover:gap-1.5 relative z-20"
                    >
                        View All
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="space-y-1.5 flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8 relative z-10">
                <div className={`${isPrivacyMode ? "blur-xl opacity-30 grayscale pointer-events-none" : ""}`}>
                    {recentTransactions.length > 0 ? (
                        recentTransactions.map((tx) => (
                            <div key={tx.id} className="flex items-center gap-3 p-3 rounded-2xl active:bg-slate-100 dark:active:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer sm:cursor-default relative z-20">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shadow-inner">
                                    {tx.categories?.icon || "📦"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {tx.merchant_name || tx.categories?.name || "Transaction"}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-400">{tx.date ? format(new Date(tx.date), "MMM d, yyyy") : ""}</p>
                                </div>
                                <span className={`text-sm sm:text-base font-black tabular-nums ${tx.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                                    {tx.type === "income" ? "+" : "-"}{maskValue(Number(tx.amount))}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center text-slate-400 text-sm font-medium">No transactions yet</div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
