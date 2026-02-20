"use client";

import { useEffect, useState, useCallback } from "react";
import { useCurrency } from "@/contexts/currency-context";
import { usePrivacy } from "@/contexts/privacy-context";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateShort, getDaysRemainingInMonth, getBudgetProgressColor } from "@/lib/utils";
import { StatCard } from "@/components/shared/stat-card";
import { PrivacyToggle } from "@/components/shared/privacy-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    ArrowLeftRight,
    ArrowRight,
    PiggyBank,
    DollarSign,
    Settings2,
} from "lucide-react";
import { Onboarding } from "@/components/shared/onboarding";
import { CustomizeDashboardModal, DashboardSectionConfig, DEFAULT_DASHBOARD_CONFIG } from "@/components/dashboard/customize-modal";
import { MetricsSettingsModal, DashboardMetricsConfig, DEFAULT_METRICS_CONFIG } from "@/components/dashboard/metrics-settings-modal";
import { Button } from "@/components/ui/button";
import { useCryptoPrices } from "@/hooks/use-crypto-prices";
import { useMediaQuery } from "@/hooks/use-media-query";
import { SUPPORTED_CRYPTOS } from "@/lib/crypto";
import type { TransactionWithCategory, Wallet as WalletType, Budget, Category } from "@/types/database";

// Dynamic imports for Nivo charts to avoid SSR issues
import dynamic from "next/dynamic";
const ResponsivePie = dynamic(() => import("@nivo/pie").then((m) => m.ResponsivePie), { ssr: false });
const ResponsiveLine = dynamic(() => import("@nivo/line").then((m) => m.ResponsiveLine), { ssr: false });

export default function DashboardPage() {
    const supabase = createClient();
    const { currency } = useCurrency();
    const { isPrivacyMode } = usePrivacy();
    const [wallets, setWallets] = useState<(WalletType & { balance: number })[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<TransactionWithCategory[]>([]);
    const [budgets, setBudgets] = useState<(Budget & { categories: Category | null; spent?: number })[]>([]);
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [monthlyExpenses, setMonthlyExpenses] = useState(0);
    const [allTransactions, setAllTransactions] = useState<TransactionWithCategory[]>([]);
    const [monthTransactions, setMonthTransactions] = useState<TransactionWithCategory[]>([]);
    const [spendingByCategory, setSpendingByCategory] = useState<{ id: string; label: string; value: number; color: string }[]>([]);
    const [cashFlowData, setCashFlowData] = useState<{ id: string; data: { x: string; y: number }[] }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const isMobile = useMediaQuery("(max-width: 640px)");

    // Layout customization state
    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
    const [layoutConfig, setLayoutConfig] = useState<DashboardSectionConfig[]>([]);
    const [isLayoutLoaded, setIsLayoutLoaded] = useState(false);

    // Metrics customization state
    const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
    const [metricsConfig, setMetricsConfig] = useState<DashboardMetricsConfig>(DEFAULT_METRICS_CONFIG);

    // Initialize layout and metrics from localStorage and Supabase
    useEffect(() => {
        const loadInitialConfigs = async () => {
            // First try local storage for immediate load
            const savedLayout = localStorage.getItem("wealthflow-dashboard-layout");
            if (savedLayout) {
                try {
                    setLayoutConfig(JSON.parse(savedLayout));
                } catch (e) {
                    console.error("Failed to parse saved layout:", e);
                    setLayoutConfig(DEFAULT_DASHBOARD_CONFIG);
                }
            } else {
                setLayoutConfig(DEFAULT_DASHBOARD_CONFIG);
            }

            const savedMetrics = localStorage.getItem("wealthflow-dashboard-metrics");
            if (savedMetrics) {
                try {
                    setMetricsConfig(JSON.parse(savedMetrics));
                } catch (e) {
                    console.error("Failed to parse saved metrics:", e);
                    setMetricsConfig(DEFAULT_METRICS_CONFIG);
                }
            } else {
                setMetricsConfig(DEFAULT_METRICS_CONFIG);
            }
            setIsLayoutLoaded(true);

            // Fetch from Supabase and override if available
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('dashboard_layout, dashboard_metrics')
                        .eq('id', user.id)
                        .single();

                    if (profile) {
                        if (profile.dashboard_layout) {
                            const layout = profile.dashboard_layout as unknown as DashboardSectionConfig[];
                            setLayoutConfig(layout);
                            localStorage.setItem("wealthflow-dashboard-layout", JSON.stringify(layout));
                        }
                        if (profile.dashboard_metrics) {
                            const metrics = profile.dashboard_metrics as unknown as DashboardMetricsConfig;
                            setMetricsConfig(metrics);
                            localStorage.setItem("wealthflow-dashboard-metrics", JSON.stringify(metrics));
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch dashboard configs from Supabase", error);
            }
        };

        loadInitialConfigs();
    }, [supabase]);

    const handleSaveLayout = async (newConfig: DashboardSectionConfig[]) => {
        setLayoutConfig(newConfig);
        localStorage.setItem("wealthflow-dashboard-layout", JSON.stringify(newConfig));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').upsert({ id: user.id, dashboard_layout: newConfig as any });
        }
    };

    const handleSaveMetrics = async (newConfig: DashboardMetricsConfig) => {
        setMetricsConfig(newConfig);
        localStorage.setItem("wealthflow-dashboard-metrics", JSON.stringify(newConfig));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('profiles').upsert({ id: user.id, dashboard_metrics: newConfig as any });
        }
    };

    const isSectionVisible = (id: string) => {
        const section = layoutConfig.find(c => c.id === id);
        return section ? section.visible : false;
    };

    const categoryColors = [
        "#7c3aed", "#0891b2", "#f59e0b", "#ef4444", "#10b981",
        "#f97316", "#ec4899", "#6366f1", "#14b8a6", "#a855f7",
    ];

    const { prices } = useCryptoPrices(wallets, currency);

    useEffect(() => {
        if (!allTransactions.length && !monthTransactions.length && !wallets.length && !budgets.length) return;

        const getFiatAmount = (amount: number | string, walletId: string | null) => {
            const wallet = wallets.find(w => w.id === walletId);
            if (wallet?.type === "crypto") {
                const price = prices[wallet.currency_code || ""] || 0;
                return Number(amount) * price;
            }
            return Number(amount);
        };

        const income = monthTransactions
            .filter((t) => t.type === "income" && (metricsConfig.incomeWalletIds.length === 0 || metricsConfig.incomeWalletIds.includes(t.wallet_id || "")))
            .reduce((sum, t) => sum + getFiatAmount(t.amount, t.wallet_id), 0);
        const expenses = monthTransactions
            .filter((t) => t.type === "expense" && (metricsConfig.expenseWalletIds.length === 0 || metricsConfig.expenseWalletIds.includes(t.wallet_id || "")))
            .reduce((sum, t) => sum + getFiatAmount(t.amount, t.wallet_id), 0);

        setMonthlyIncome(income);
        setMonthlyExpenses(expenses);

        const categoryMap = new Map<string, { name: string; total: number }>();
        monthTransactions
            .filter((t) => t.type === "expense")
            .forEach((t) => {
                const catName = t.categories?.name || "Uncategorized";
                const existing = categoryMap.get(catName) || { name: catName, total: 0 };
                existing.total += getFiatAmount(t.amount, t.wallet_id);
                categoryMap.set(catName, existing);
            });

        const pieData = Array.from(categoryMap.entries())
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 8)
            .map(([key, val], i) => ({
                id: key,
                label: val.name,
                value: Math.round(val.total * 100) / 100,
                color: categoryColors[i % categoryColors.length],
            }));
        setSpendingByCategory(pieData);

        const last30 = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last30.push(d.toISOString().split("T")[0]);
        }

        const incomeData = last30.map((dateStr) => {
            const dayIncome = allTransactions
                .filter((t) => t.date === dateStr && t.type === "income")
                .reduce((sum, t) => sum + getFiatAmount(t.amount, t.wallet_id), 0);
            return { x: dateStr.slice(5), y: Math.round(dayIncome) };
        });

        const expenseData = last30.map((dateStr) => {
            const dayExpense = allTransactions
                .filter((t) => t.date === dateStr && t.type === "expense")
                .reduce((sum, t) => sum + getFiatAmount(t.amount, t.wallet_id), 0);
            return { x: dateStr.slice(5), y: Math.round(dayExpense) };
        });

        setCashFlowData([
            { id: "Income", data: incomeData },
            { id: "Expenses", data: expenseData },
        ]);

        const budgetsWithSpent = budgets.map((b) => {
            const spent = monthTransactions
                .filter((t) => t.type === "expense" && t.category_id === b.category_id)
                .reduce((sum, t) => sum + getFiatAmount(t.amount, t.wallet_id), 0);
            return { ...b, spent };
        });

        // Use functional state update to prevent infinite loops from budgets updating
        setBudgets(prev => {
            if (JSON.stringify(prev) === JSON.stringify(budgetsWithSpent)) return prev;
            return budgetsWithSpent;
        });

    }, [wallets, monthTransactions, allTransactions, metricsConfig, prices]); // Removed budgets to avoid loop

    const fetchData = useCallback(async () => {
        setLoading(true);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
        const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(new Date(currentYear, currentMonth, 0).getDate()).padStart(2, "0")}`;

        // Fetch wallets
        const { data: walletsData } = await supabase.from("wallets").select("*");

        // Fetch all transactions for wallet balances
        const { data: allTx } = await supabase.from("transactions").select("*");

        // Compute wallet balances
        const walletBalances = (walletsData || []).map((w) => {
            const txs = (allTx || []).filter((t) => t.wallet_id === w.id);
            const balance = txs.reduce((sum, t) => {
                return t.type === "income" ? sum + Number(t.amount) : sum - Number(t.amount);
            }, 0);
            return { ...w, balance };
        });
        setWallets(walletBalances);

        // Fetch this month's transactions
        const { data: monthTx } = await supabase
            .from("transactions")
            .select("*, categories(*)")
            .gte("date", monthStart)
            .lte("date", monthEnd)
            .order("date", { ascending: false });

        const monthTransactions = (monthTx || []) as TransactionWithCategory[];
        setMonthTransactions(monthTransactions);
        setAllTransactions((allTx || []) as TransactionWithCategory[]);
        setRecentTransactions(monthTransactions.slice(0, 8));

        const { data: budgetData } = await supabase
            .from("budgets")
            .select("*, categories(*)")
            .eq("month", currentMonth)
            .eq("year", currentYear);

        setBudgets((budgetData || []) as (Budget & { categories: Category | null })[]);

        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Show onboarding for first-time users
    useEffect(() => {
        if (!loading && wallets.length === 0) {
            const onboarded = localStorage.getItem("wealthflow-onboarded");
            if (!onboarded) {
                setShowOnboarding(true);
            }
        }
    }, [loading, wallets.length]);

    const netWorth = wallets.reduce((sum, w) => {
        let wBalance = w.balance;
        if (w.type === "crypto") {
            const price = prices[w.currency_code || ""] || 0;
            wBalance = w.balance * price;
        }
        return sum + wBalance;
    }, 0);

    const daysLeft = getDaysRemainingInMonth();
    const dailySuggested = daysLeft > 0
        ? (budgets.reduce((sum, b) => sum + (Number(b.amount) - (b.spent || 0)), 0)) / daysLeft
        : 0;

    const maskValue = (value: string | number, isCurrency = true) => {
        if (isPrivacyMode) {
            return "••••••";
        }
        return isCurrency ? formatCurrency(Number(value), currency) : String(value);
    };

    if (loading || !isLayoutLoaded) {
        return (
            <div className="p-4 lg:p-8 space-y-6">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="h-80 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                        <div className="h-80 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    // 4. Calculate span based on size
    const getSpanClass = (size?: "small" | "medium" | "large" | "full") => {
        switch (size) {
            case "small":
                return "col-span-12 md:col-span-4"; // Full on mobile, 1/3 on desktop
            case "medium":
                return "col-span-12 lg:col-span-6"; // Full on mobile, 1/2 on desktop
            case "large":
                return "col-span-12 lg:col-span-8"; // Full on mobile, 2/3 on desktop
            case "full":
            default:
                return "col-span-12";
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1">Your financial overview at a glance</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden sm:flex text-slate-600 dark:text-slate-300"
                            onClick={() => setIsMetricsModalOpen(true)}
                        >
                            <Settings2 className="w-4 h-4 mr-2 text-violet-500" />
                            Data Filters
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="sm:hidden text-slate-600 dark:text-slate-300"
                            onClick={() => setIsMetricsModalOpen(true)}
                        >
                            <Settings2 className="w-4 h-4 text-violet-500" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="hidden sm:flex text-slate-600 dark:text-slate-300"
                            onClick={() => setIsCustomizeModalOpen(true)}
                        >
                            <Settings2 className="w-4 h-4 mr-2" />
                            Layout
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="sm:hidden text-slate-600 dark:text-slate-300"
                            onClick={() => setIsCustomizeModalOpen(true)}
                        >
                            <Settings2 className="w-4 h-4" />
                        </Button>
                        <PrivacyToggle />
                    </div>
                </div>
            </div>

            {/* Dynamic Layout Engine */}
            <div className="grid grid-cols-12 gap-6">
                {layoutConfig.map((section, index) => {
                    if (!section.visible) return null;

                    const spanClass = getSpanClass(section.size);
                    const sectionStyle = { order: index };

                    switch (section.id) {
                        case "stat-cards":
                            return (
                                <div key={section.id} style={sectionStyle} className={`${spanClass} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4`}>
                                    {metricsConfig.visibleCards.netWorth && (
                                        <StatCard
                                            label="Net Worth"
                                            value={maskValue(netWorth)}
                                            icon={DollarSign}
                                            iconColor="text-violet-600"
                                        />
                                    )}
                                    {metricsConfig.visibleCards.income && (
                                        <StatCard
                                            label="Monthly Income"
                                            value={maskValue(monthlyIncome)}
                                            icon={TrendingUp}
                                            iconColor="text-emerald-600"
                                        />
                                    )}
                                    {metricsConfig.visibleCards.expenses && (
                                        <StatCard
                                            label="Monthly Expenses"
                                            value={maskValue(monthlyExpenses)}
                                            icon={TrendingDown}
                                            iconColor="text-red-500"
                                        />
                                    )}
                                    {metricsConfig.visibleCards.balance && (
                                        <StatCard
                                            label="Monthly Balance"
                                            value={maskValue(monthlyIncome - monthlyExpenses)}
                                            icon={ArrowLeftRight}
                                            iconColor={monthlyIncome - monthlyExpenses >= 0 ? "text-emerald-600" : "text-red-500"}
                                        />
                                    )}
                                    {metricsConfig.visibleCards.dailyBudget && (
                                        <StatCard
                                            label="Daily Budget"
                                            value={dailySuggested > 0 ? maskValue(dailySuggested) : "—"}
                                            icon={PiggyBank}
                                            iconColor="text-amber-500"
                                        />
                                    )}
                                </div>
                            );

                        case "spending-distribution":
                            return (
                                <div key={section.id} style={sectionStyle} className={spanClass}>
                                    <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm h-full flex flex-col">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Spending by Category</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`h-72 ${isPrivacyMode ? "blur-sm opacity-50" : ""}`}>
                                                {spendingByCategory.length > 0 ? (
                                                    <div className="h-full flex flex-col">
                                                        <div className="flex-1 min-h-0">
                                                            <ResponsivePie
                                                                data={spendingByCategory}
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
                                                            <div className="mt-4 grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-1">
                                                                {spendingByCategory.map((category) => (
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
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                                        No expenses this month yet
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            );

                        case "cash-flow":
                            return (
                                <div key={section.id} style={sectionStyle} className={spanClass}>
                                    <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm h-full flex flex-col">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Cash Flow (Last 30 Days)</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className={`h-72 ${isPrivacyMode ? "blur-sm opacity-50" : ""}`}>
                                                {cashFlowData.length > 0 ? (
                                                    <ResponsiveLine
                                                        data={cashFlowData}
                                                        margin={{ top: 20, right: 20, bottom: 40, left: 50 }}
                                                        xScale={{ type: "point" }}
                                                        yScale={{ type: "linear", min: 0, max: "auto" }}
                                                        curve="monotoneX"
                                                        colors={["#10b981", "#ef4444"]}
                                                        lineWidth={2}
                                                        pointSize={0}
                                                        enableGridX={false}
                                                        gridYValues={5}
                                                        axisLeft={{
                                                            tickSize: 0,
                                                            tickPadding: 8,
                                                            format: (v) => `$${v}`,
                                                        }}
                                                        axisBottom={{
                                                            tickSize: 0,
                                                            tickPadding: 8,
                                                            tickRotation: -45,
                                                            tickValues: "every 5 days" as unknown as undefined,
                                                        }}
                                                        enableArea={true}
                                                        areaOpacity={0.08}
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
                                                            },
                                                        ]}
                                                    />
                                                ) : (
                                                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                                        No transaction data available
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            );

                        case "recent-transactions":
                            return (
                                <div key={section.id} style={sectionStyle} className={spanClass}>
                                    <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm h-full flex flex-col">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Recent Transactions</CardTitle>
                                                <Link
                                                    href="/transactions"
                                                    className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors"
                                                >
                                                    View All
                                                    <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-1">
                                            {recentTransactions.length > 0 ? (
                                                recentTransactions.map((tx) => (
                                                    <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-lg active:bg-slate-100 dark:active:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer sm:cursor-default">
                                                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base">
                                                            {tx.categories?.icon || "📦"}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                                                {tx.merchant_name || tx.categories?.name || "Transaction"}
                                                            </p>
                                                            <p className="text-[11px] text-slate-400">{tx.date ? formatDateShort(tx.date) : ""}</p>
                                                        </div>
                                                        <span className={`text-sm font-semibold tabular-nums ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                                                            {tx.type === "income" ? "+" : "-"}{maskValue(Number(tx.amount))}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="py-8 text-center text-slate-400 text-sm">No transactions yet</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            );

                        case "budget-overview":
                            return (
                                <div key={section.id} style={sectionStyle} className={spanClass}>
                                    <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm h-full flex flex-col">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Budget Overview</CardTitle>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500">
                                                        {daysLeft} days left
                                                    </Badge>
                                                    <Link
                                                        href="/budgets"
                                                        className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors"
                                                    >
                                                        View All
                                                        <ArrowRight className="w-3 h-3" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {budgets.length > 0 ? (
                                                budgets.map((b) => {
                                                    const spentAmount = b.spent || 0;
                                                    const percentage = Math.min((spentAmount / Number(b.amount)) * 100, 100);
                                                    const isOver = spentAmount > Number(b.amount);
                                                    return (
                                                        <div key={b.id} className="space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-base">{b.categories?.icon || "📦"}</span>
                                                                    <span className="text-sm text-slate-800 dark:text-slate-200">{b.categories?.name || "Budget"}</span>
                                                                </div>
                                                                <span className={`text-xs font-medium ${isOver ? "text-red-500" : "text-slate-500"}`}>
                                                                    {maskValue(b.spent || 0)} / {maskValue(Number(b.amount))}
                                                                </span>
                                                            </div>
                                                            <Progress
                                                                value={percentage}
                                                                className="h-1.5 bg-slate-100 dark:bg-slate-800"
                                                                indicatorClassName={getBudgetProgressColor(percentage)}
                                                            />
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="py-8 text-center text-slate-400 text-sm">No budgets set for this month</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            );

                        case "wallets":
                            return wallets.length > 0 ? (
                                <div key={section.id} style={sectionStyle} className={`${spanClass} flex flex-col`}>
                                    <div className="flex items-center justify-between mb-3 mt-2">
                                        <h2 className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                            <Wallet className="w-4 h-4" />
                                            Your Wallets
                                        </h2>
                                        <Link
                                            href="/wallets"
                                            className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors"
                                        >
                                            View All
                                            <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
                                        {wallets.map((wallet) => (
                                            <Card key={wallet.id} className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                                                <CardContent className="p-5 relative">
                                                    <div
                                                        className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity"
                                                        style={{ background: `linear-gradient(135deg, ${wallet.color || "#7c3aed"}, transparent)` }}
                                                    />
                                                    <div className="relative flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                                            style={{ backgroundColor: `${wallet.color || "#7c3aed"}15` }}
                                                        >
                                                            {wallet.icon || "💵"}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">{wallet.name}</p>
                                                            <div className={`text-lg font-bold ${wallet.balance >= 0 ? "text-slate-900 dark:text-slate-100" : "text-red-500"}`}>
                                                                {wallet.type === "crypto" ? (
                                                                    <div className="flex flex-col mt-0.5">
                                                                        <span className="text-base leading-none">{wallet.balance} {SUPPORTED_CRYPTOS.find(c => c.id === wallet.currency_code)?.symbol || wallet.currency_code}</span>
                                                                        <span className="text-[11px] font-medium text-slate-400 mt-1">≈ {formatCurrency(wallet.balance * (prices[wallet.currency_code || ""] || 0), currency)}</span>
                                                                    </div>
                                                                ) : maskValue(wallet.balance)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ) : null;

                        default:
                            return null;
                    }
                })}
            </div>

            {/* Onboarding */}
            {showOnboarding && (
                <Onboarding
                    onComplete={() => {
                        setShowOnboarding(false);
                        fetchData();
                    }}
                />
            )}

            <CustomizeDashboardModal
                open={isCustomizeModalOpen}
                onOpenChange={setIsCustomizeModalOpen}
                config={layoutConfig}
                onSave={handleSaveLayout}
            />
            <MetricsSettingsModal
                open={isMetricsModalOpen}
                onOpenChange={setIsMetricsModalOpen}
                config={metricsConfig}
                onSave={handleSaveMetrics}
                wallets={wallets}
            />
        </div>
    );
}
