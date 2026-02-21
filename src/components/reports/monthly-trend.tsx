"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useCurrency } from "@/contexts/currency-context";
import { usePrivacy } from "@/contexts/privacy-context";
import { eachDayOfInterval, startOfMonth, endOfMonth, format, isSameDay } from "date-fns";
import { formatCurrency } from "@/lib/utils";

const ResponsiveLine = dynamic(() => import("@nivo/line").then(m => m.ResponsiveLine), { ssr: false });

interface MonthlyTrendProps {
    transactions: any[];
    month: Date;
}

export function MonthlyTrend({ transactions, month }: MonthlyTrendProps) {
    const { currency } = useCurrency();
    const { isPrivacyMode } = usePrivacy();

    const _data = useMemo(() => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(monthStart);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

        const incomeData = days.map(day => {
            const dayIncome = transactions
                .filter(t => t.type === "income" && isSameDay(new Date(t.date), day))
                .reduce((sum, t) => sum + Number(t.amount), 0);
            return { x: format(day, "dd"), y: dayIncome, fullDate: format(day, "MMM dd") };
        });

        const expenseData = days.map(day => {
            const dayExpense = transactions
                .filter(t => t.type === "expense" && isSameDay(new Date(t.date), day))
                .reduce((sum, t) => sum + Number(t.amount), 0);
            return { x: format(day, "dd"), y: dayExpense, fullDate: format(day, "MMM dd") };
        });

        return [
            { id: "Income", data: incomeData, color: "oklch(0.65 0.15 160)" },
            { id: "Expenses", data: expenseData, color: "oklch(0.6 0.18 30)" }
        ];

    }, [transactions, month]);

    return (
        <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2rem] shadow-sm p-6 lg:p-8 flex flex-col h-[450px] hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/20 transition-all duration-500 overflow-hidden relative">
            {/* Subtle Gradient Glow */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-900/10 opacity-50 pointer-events-none" />

            <div className="relative z-10 mb-6">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Cash Flow Trend</h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Daily income vs expenses overview</p>
            </div>

            <div className={`flex-1 min-h-0 ${isPrivacyMode ? "blur-xl opacity-30 grayscale pointer-events-none" : ""}`}>
                {transactions.length > 0 ? (
                    <ResponsiveLine
                        data={_data}
                        margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                        xScale={{ type: "point" }}
                        yScale={{ type: "linear", min: 0, max: "auto", stacked: false, reverse: false }}
                        curve="monotoneX"
                        colors={{ datum: "color" }}
                        lineWidth={3}
                        pointSize={0}
                        enableGridX={false}
                        gridYValues={5}
                        axisTop={null}
                        axisRight={null}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 10,
                            format: (v) => formatCurrency(v as number, currency),
                        }}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 12,
                            tickRotation: 0,
                            legend: "Day of Month",
                            legendOffset: 34,
                            legendPosition: "middle"
                        }}
                        enableArea={true}
                        areaOpacity={0.1}
                        useMesh={true}
                        theme={{
                            text: { fill: "oklch(0.55 0.02 80)", fontSize: 11, fontWeight: 500 },
                            grid: { line: { stroke: "oklch(0.92 0.02 80)", strokeWidth: 1 } },
                            axis: {
                                domain: { line: { stroke: "transparent" } },
                                ticks: { text: { fill: "oklch(0.55 0.02 80)" } }
                            },
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
                        enableSlices="x"
                        sliceTooltip={({ slice }) => (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xl min-w-[140px]">
                                <div className="text-xs font-bold text-slate-500 mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                                    {(slice.points[0].data as any).fullDate}
                                </div>
                                {slice.points.map(point => (
                                    <div key={point.id} className="flex items-center justify-between gap-4 py-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: (point as any).serieColor || (point as any).seriesColor }} />
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{(point as any).serieId || (point as any).seriesId}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(point.data.y as number, currency)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        No transaction data for this month
                    </div>
                )}
            </div>
        </div>
    );
}
