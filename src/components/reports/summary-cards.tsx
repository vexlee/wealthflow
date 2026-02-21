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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
                label="Total Income"
                value={formatCurrency(income, currency)}
                icon={TrendingUp}
                iconColor="text-emerald-600"
            />
            <StatCard
                label="Total Expenses"
                value={formatCurrency(expenses, currency)}
                icon={TrendingDown}
                iconColor="text-red-500"
            />
            <StatCard
                label="Net Balance"
                value={formatCurrency(net, currency)}
                icon={ArrowLeftRight}
                iconColor={net >= 0 ? "text-emerald-600" : "text-red-500"}
            />
        </div>
    );
}
