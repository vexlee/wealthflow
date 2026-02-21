"use client";

import { useCurrency } from "@/contexts/currency-context";
import { formatCurrency } from "@/lib/utils";
import { StatCard } from "@/components/shared/stat-card";
import {
    TrendingUp,
    TrendingDown,
    ArrowLeftRight,
} from "lucide-react";

interface SummaryCardsProps {
    income: number;
    expenses: number;
}

export function SummaryCards({ income, expenses }: SummaryCardsProps) {
    const { currency } = useCurrency();
    const net = income - expenses;

    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <StatCard
                label="Income"
                labelDesktop="Total Income"
                value={formatCurrency(income, currency)}
                icon={TrendingUp}
                theme="emerald"
                compact
            />
            <StatCard
                label="Expenses"
                labelDesktop="Total Expenses"
                value={formatCurrency(expenses, currency)}
                icon={TrendingDown}
                theme="rose"
                compact
            />
            <StatCard
                label="Net"
                labelDesktop="Net Balance"
                value={formatCurrency(net, currency)}
                icon={ArrowLeftRight}
                theme={net >= 0 ? "emerald" : "rose"}
                compact
            />
        </div>
    );
}
