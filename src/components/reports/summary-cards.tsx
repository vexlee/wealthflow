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
    forecastIncome?: number;
    forecastExpenses?: number;
}

export function SummaryCards({ income, expenses, forecastIncome = 0, forecastExpenses = 0 }: SummaryCardsProps) {
    const { currency } = useCurrency();
    const net = income - expenses;
    const hasForecast = forecastIncome > 0 || forecastExpenses > 0;
    const projectedNet = (income + forecastIncome) - (expenses + forecastExpenses);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
                label="Income"
                labelDesktop="Total Income"
                value={formatCurrency(income, currency)}
                subtitle={forecastIncome > 0 ? `+${formatCurrency(forecastIncome, currency)} projected` : undefined}
                icon={TrendingUp}
                theme="emerald"
                compact
                disablePrivacy={true}
            />
            <StatCard
                label="Expenses"
                labelDesktop="Total Expenses"
                value={formatCurrency(expenses, currency)}
                subtitle={forecastExpenses > 0 ? `+${formatCurrency(forecastExpenses, currency)} projected` : undefined}
                icon={TrendingDown}
                theme="rose"
                compact
                disablePrivacy={true}
            />
            <StatCard
                label="Net"
                labelDesktop="Net Balance"
                value={formatCurrency(net, currency)}
                subtitle={hasForecast ? `${formatCurrency(projectedNet, currency)} projected` : undefined}
                icon={ArrowLeftRight}
                theme={net >= 0 ? "emerald" : "rose"}
                compact
                disablePrivacy={true}
            />
        </div>
    );
}
