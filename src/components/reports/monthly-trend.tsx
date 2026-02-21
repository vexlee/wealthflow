"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useCurrency } from "@/contexts/currency-context";
import { usePrivacy } from "@/contexts/privacy-context";
import { eachDayOfInterval, startOfMonth, endOfMonth, format, isSameDay } from "date-fns";

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
            return { x: format(day, "MMM dd"), y: dayIncome };
        });

        const expenseData = days.map(day => {
            const dayExpense = transactions
                .filter(t => t.type === "expense" && isSameDay(new Date(t.date), day))
                .reduce((sum, t) => sum + Number(t.amount), 0);
            return { x: format(day, "MMM dd"), y: dayExpense };
        });

        return [
            { id: "Income", data: incomeData },
            { id: "Expenses", data: expenseData }
        ];

    }, [transactions, month]);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm p-4 flex flex-col h-96">
            <h2 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4">Income vs Expenses Trend</h2>

            <div className={`flex-1 min-h-[300px] ${isPrivacyMode ? "blur-md opacity-50 transition-all" : ""}`}>
                {transactions.length > 0 ? (
                    <ResponsiveLine
                        data={_data}
                        margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                        xScale={{ type: "point" }}
                        yScale={{ type: "linear", min: 0, max: "auto", stacked: false, reverse: false }}
                        curve="monotoneX"
                        colors={["#10b981", "#ef4444"]}
                        lineWidth={2}
                        pointSize={0}
                        enableGridX={false}
                        gridYValues={5}
                        axisTop={null}
                        axisRight={null}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 8,
                            format: (v) => `$${v}`, // Optional: adjust currency symbol if needed or omit
                        }}
                        axisBottom={{
                            tickSize: 0,
                            tickPadding: 8,
                            tickRotation: -45,
                            tickValues: "every 5 days" as unknown as undefined,
                        }}
                        enableArea={true}
                        areaOpacity={0.08}
                        useMesh={true}
                        theme={{
                            text: { fill: "#64748b" },
                            grid: { line: { stroke: "#e2e8f0" } },
                            axis: { ticks: { text: { fill: "#64748b", fontSize: 10 } } },
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
                        legends={[
                            {
                                anchor: "top-right",
                                direction: "row",
                                itemWidth: 80,
                                itemHeight: 20,
                                itemTextColor: "#64748b",
                                symbolSize: 10,
                                symbolShape: "circle",
                                translateX: 0,
                                translateY: -20,
                            },
                        ]}
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
