"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useCurrency } from "@/contexts/currency-context";
import { usePrivacy } from "@/contexts/privacy-context";
import { formatCurrency } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

const ResponsivePie = dynamic(() => import("@nivo/pie").then(m => m.ResponsivePie), { ssr: false });

const CATEGORY_COLORS = [
    "#7c3aed", "#0891b2", "#f59e0b", "#ef4444", "#10b981",
    "#f97316", "#ec4899", "#6366f1", "#14b8a6", "#a855f7",
];

interface CategoryBreakdownProps {
    transactions: any[];
}

export function CategoryBreakdown({ transactions }: CategoryBreakdownProps) {
    const { currency } = useCurrency();
    const { isPrivacyMode } = usePrivacy();
    const isMobile = useMediaQuery("(max-width: 640px)");

    const _data = useMemo(() => {
        const expenseTxs = transactions.filter(t => t.type === "expense");
        const categoryMap = new Map<string, { name: string; total: number }>();

        expenseTxs.forEach(t => {
            const catName = t.categories?.name || "Uncategorized";
            const current = categoryMap.get(catName) || { name: catName, total: 0 };
            current.total += Number(t.amount);
            categoryMap.set(catName, current);
        });

        return Array.from(categoryMap.entries())
            .sort((a, b) => b[1].total - a[1].total)
            .map(([_, val], i) => ({
                id: val.name,
                label: val.name,
                value: val.total,
                color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
            }));
    }, [transactions]);

    const maskValue = (value: number) => {
        if (isPrivacyMode) return "••••••";
        return formatCurrency(value, currency);
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm p-4 h-full flex flex-col">
            <h2 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4">Category Breakdown (Expenses)</h2>

            <div className={`flex-1 min-h-[300px] flex flex-col ${isPrivacyMode ? "blur-md opacity-50 transition-all" : ""}`}>
                {_data.length > 0 ? (
                    <>
                        <div className="flex-1 min-h-0">
                            <ResponsivePie
                                data={_data}
                                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                innerRadius={0.6}
                                padAngle={2}
                                cornerRadius={4}
                                colors={{ datum: "data.color" }}
                                borderWidth={0}
                                enableArcLabels={false}
                                enableArcLinkLabels={!isMobile}
                                arcLinkLabelsTextColor="#475569"
                                arcLinkLabelsColor={{ from: "color" }}
                                arcLinkLabelsThickness={2}
                                arcLinkLabelsDiagonalLength={12}
                                arcLinkLabelsStraightLength={8}
                                theme={{
                                    text: { fill: "#475569" },
                                    tooltip: {
                                        container: {
                                            background: "#ffffff",
                                            color: "#1e293b",
                                            borderRadius: "8px",
                                            border: "1px solid #e2e8f0",
                                            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                        },
                                    },
                                }}
                            />
                        </div>
                        {isMobile && (
                            <div className="mt-4 grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                                {_data.map((category) => (
                                    <div key={category.id} className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: category.color }}
                                        />
                                        <span className="text-xs text-slate-600 dark:text-slate-400 truncate flex-1">
                                            {category.label}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            {maskValue(category.value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        No expenses to show context
                    </div>
                )}
            </div>
        </div>
    );
}
