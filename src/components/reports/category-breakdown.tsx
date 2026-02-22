"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useCurrency } from "@/contexts/currency-context";
import { usePrivacy } from "@/contexts/privacy-context";
import { formatCurrency } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

const ResponsivePie = dynamic(() => import("@nivo/pie").then(m => m.ResponsivePie), { ssr: false });

// Premium color palette for the chart
const CATEGORY_COLORS = [
    "oklch(0.65 0.12 210)", // Ocean Blue (Primary)
    "oklch(0.7 0.15 40)",    // Warm Apricot
    "oklch(0.75 0.12 80)",   // Sand
    "oklch(0.7 0.1 160)",    // Tropical Teal
    "oklch(0.65 0.15 60)",   // Earthy Ginger
    "oklch(0.6 0.12 280)",   // Deep Shell
    "oklch(0.8 0.1 120)",    // Soft Lime
    "oklch(0.55 0.18 30)",   // Sunset Red
    "oklch(0.65 0.1 200)",   // Sky Blue
    "oklch(0.45 0.12 250)",  // Deep Sea
];

interface CategoryBreakdownProps {
    transactions: any[];
}

export function CategoryBreakdown({ transactions }: CategoryBreakdownProps) {
    const { currency } = useCurrency();
    const { isPrivacyMode } = usePrivacy();
    const isMobile = useMediaQuery("(max-width: 1024px)");
    const [activeId, setActiveId] = useState<string | null>(null);

    const { data: _data, total: totalExpenses } = useMemo(() => {
        const expenseTxs = transactions.filter(t => t.type === "expense");
        const categoryMap = new Map<string, { name: string; total: number }>();
        let total = 0;

        expenseTxs.forEach(t => {
            const catName = t.categories?.name || "Uncategorized";
            const current = categoryMap.get(catName) || { name: catName, total: 0 };
            const amount = Number(t.amount);
            current.total += amount;
            total += amount;
            categoryMap.set(catName, current);
        });

        const data = Array.from(categoryMap.entries())
            .sort((a, b) => b[1].total - a[1].total)
            .map(([_, val], i) => ({
                id: val.name,
                label: val.name,
                value: val.total,
                percentage: total > 0 ? (val.total / total) * 100 : 0,
                color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
            }));

        return { data, total };
    }, [transactions]);

    const maskValue = (value: number) => {
        if (isPrivacyMode) return "••••••";
        return formatCurrency(value, currency);
    };

    if (_data.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm p-8 h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400">
                <p className="text-sm font-medium">No expenses to display for this period</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-[2rem] shadow-sm p-5 sm:p-6 lg:p-8 h-full flex flex-col hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/20 transition-all duration-500 overflow-hidden relative">
            {/* Subtle Gradient Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-900/10 opacity-50 pointer-events-none" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">Spending Analytics</h2>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5 sm:mt-1">Breakdown by expense category</p>
                    </div>
                    {!isPrivacyMode && (
                        <div className="text-right">
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Total Spent</p>
                            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{maskValue(totalExpenses)}</p>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col lg:flex-row items-center gap-6 sm:gap-8 lg:gap-12 min-h-0">
                    {/* Donut Chart */}
                    <div className="relative w-full aspect-square max-w-[260px] sm:max-w-[320px] lg:max-w-none lg:h-[360px] lg:flex-1">
                        <div className={`w-full h-full ${isPrivacyMode ? "blur-xl opacity-30 grayscale pointer-events-none" : ""}`}>
                            <ResponsivePie
                                data={_data}
                                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                                innerRadius={0.7}
                                padAngle={1.5}
                                cornerRadius={8}
                                activeOuterRadiusOffset={8}
                                colors={{ datum: "data.color" }}
                                enableArcLinkLabels={false}
                                enableArcLabels={false}
                                animate={true}
                                motionConfig="gentle"
                                borderWidth={0}
                                theme={{
                                    tooltip: {
                                        container: {
                                            background: "oklch(0.99 0.005 80)",
                                            color: "oklch(0.25 0.02 80)",
                                            borderRadius: "16px",
                                            border: "1px solid oklch(0.88 0.02 80)",
                                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                            padding: "12px",
                                            fontSize: "12px",
                                            fontWeight: 600
                                        },
                                    },
                                }}
                                onMouseEnter={(_data) => setActiveId(_data.id as string)}
                                onMouseLeave={() => setActiveId(null)}
                            />
                        </div>

                        {/* Centered Total Info */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center px-4 truncate w-full">
                                {activeId || "All Expenses"}
                            </span>
                            <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 sm:mt-1">
                                {activeId
                                    ? `${_data.find(d => d.id === activeId)?.percentage.toFixed(1)}%`
                                    : maskValue(totalExpenses)
                                }
                            </span>
                        </div>
                    </div>

                    {/* Custom Styled Legend */}
                    <div className="w-full lg:w-96 flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {_data.map((item) => (
                            <div
                                key={item.id}
                                className={`group flex items-center gap-4 p-3 rounded-2xl transition-all cursor-default ${activeId === item.id
                                    ? "bg-slate-50 dark:bg-slate-800/50 translate-x-1"
                                    : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                                    }`}
                                onMouseEnter={() => setActiveId(item.id)}
                                onMouseLeave={() => setActiveId(null)}
                            >
                                <div
                                    className="w-4 h-4 rounded-full shrink-0 shadow-sm transition-transform group-hover:scale-110"
                                    style={{ backgroundColor: item.color }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {item.label}
                                        </span>
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                            {maskValue(item.value)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700 ease-out"
                                                style={{
                                                    width: `${item.percentage}%`,
                                                    backgroundColor: item.color,
                                                    opacity: activeId && activeId !== item.id ? 0.3 : 1
                                                }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 w-8 text-right">
                                            {item.percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
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
        </div>
    );
}
