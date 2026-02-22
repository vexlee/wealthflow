"use client";

import { motion } from "framer-motion";

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
import { toast } from "sonner";
import { Onboarding } from "@/components/shared/onboarding";
import { CustomizeDashboardModal, DashboardSectionConfig, DEFAULT_DASHBOARD_CONFIG } from "@/components/dashboard/customize-modal";
import { MetricsSettingsModal, DashboardMetricsConfig, DEFAULT_METRICS_CONFIG } from "@/components/dashboard/metrics-settings-modal";
import { QuickAddTransaction } from "@/components/dashboard/quick-add-transaction";
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
    const [metricTrends, setMetricTrends] = useState<{
        netWorth: number[];
        income: number[];
        expenses: number[];
        balance: number[];
        dailyBudget: number[];
    }>({
        netWorth: [],
        income: [],
        expenses: [],
        balance: [],
        dailyBudget: []
    });
    const [loading, setLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const isMobile = useMediaQuery("(max-width: 640px)");

    // Layout customization state
    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
    const [layoutConfig, setLayoutConfig] = useState<DashboardSectionConfig[]>(DEFAULT_DASHBOARD_CONFIG);
    const [isLayoutLoaded, setIsLayoutLoaded] = useState(false);

    // Metrics customization state
    const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
    const [metricsConfig, setMetricsConfig] = useState<DashboardMetricsConfig>(DEFAULT_METRICS_CONFIG);

    // Onboarding config
    const [hasOnboarded, setHasOnboarded] = useState(true);

    // Initialize layout and metrics from Supabase directly
    useEffect(() => {
        const loadConfigs = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('dashboard_layout, dashboard_metrics, has_onboarded')
                        .eq('id', user.id)
                        .single();

                    if (profile) {
                        if (profile.dashboard_layout) {
                            setLayoutConfig(profile.dashboard_layout as unknown as DashboardSectionConfig[]);
                        }
                        if (profile.dashboard_metrics) {
                            setMetricsConfig(profile.dashboard_metrics as unknown as DashboardMetricsConfig);
                        }
                        setHasOnboarded(!!profile.has_onboarded);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch dashboard configs from Supabase", error);
            } finally {
                setIsLayoutLoaded(true);
            }
        };

        loadConfigs();
    }, [supabase]);

    const handleSaveLayout = async (newConfig: DashboardSectionConfig[]) => {
        setLayoutConfig(newConfig);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase.from('profiles').update({ dashboard_layout: newConfig as any }).eq('id', user.id);
            if (error) {
                toast.error("Failed to save dashboard layout preferences");
            }
        }
    };

    const handleSaveMetrics = async (newConfig: DashboardMetricsConfig) => {
        setMetricsConfig(newConfig);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { error } = await supabase.from('profiles').update({ dashboard_metrics: newConfig as any }).eq('id', user.id);
            if (error) {
                toast.error("Failed to save dashboard metrics preferences");
            }
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

        // Calculate Sparkline Trends
        const netWorthHistory: number[] = [];
        let runningNetWorth = netWorth;

        // Group all transactions by date for faster lookup
        const txByDate = allTransactions.reduce((acc, t) => {
            const txDate = t.date || "unknown";
            if (!acc[txDate]) acc[txDate] = [];
            acc[txDate].push(t);
            return acc;
        }, {} as Record<string, TransactionWithCategory[]>);

        // Calculate net worth backwards
        [...last30].reverse().forEach((dateStr) => {
            netWorthHistory.unshift(runningNetWorth);
            const dayTxs = txByDate[dateStr] || [];
            dayTxs.forEach(t => {
                const amount = getFiatAmount(t.amount, t.wallet_id);
                runningNetWorth -= (t.type === 'income' ? amount : -amount);
            });
        });

        // Daily Balance Trend (Cumulative for the last 30 days)
        let runningBalance = 0;
        const balanceHistory = last30.map(dateStr => {
            const dayTxs = txByDate[dateStr] || [];
            const dayNet = dayTxs.reduce((sum, t) => {
                const amount = getFiatAmount(t.amount, t.wallet_id);
                return sum + (t.type === 'income' ? amount : -amount);
            }, 0);
            runningBalance += dayNet;
            return runningBalance;
        });

        // Daily Budget Trend (Spent per day)
        const budgetHistory = last30.map(dateStr => {
            const dayTxs = txByDate[dateStr] || [];
            return dayTxs
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + getFiatAmount(t.amount, t.wallet_id), 0);
        });

        setMetricTrends({
            netWorth: netWorthHistory,
            income: incomeData.map(d => d.y),
            expenses: expenseData.map(d => d.y),
            balance: balanceHistory,
            dailyBudget: budgetHistory
        });

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

        // Fetch categories for quick-add
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: cats } = await supabase
                .from("categories")
                .select("*")
                .or(`user_id.eq.${user.id},is_default.eq.true`)
                .order("name");
            setAllCategories((cats || []) as Category[]);
        }

        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Show onboarding for first-time users
    useEffect(() => {
        if (!loading && isLayoutLoaded && wallets.length === 0 && !hasOnboarded) {
            setShowOnboarding(true);
        }
    }, [loading, isLayoutLoaded, wallets.length, hasOnboarded]);

    // Listen for FAB quick-add event
    useEffect(() => {
        const handler = () => setQuickAddOpen(true);
        window.addEventListener("open-quick-add", handler);
        return () => window.removeEventListener("open-quick-add", handler);
    }, []);

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
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
                        <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">Your financial overview at a glance</p>
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
            <motion.div
                className="grid grid-cols-12 gap-4 sm:gap-6"
                variants={{
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: {
                            staggerChildren: 0.1
                        }
                    }
                }}
                initial="hidden"
                animate="visible"
            >
                {layoutConfig.map((section, index) => {
                    if (!section.visible) return null;

                    const spanClass = getSpanClass(section.size);
                    const sectionStyle = { order: index };

                    return (
                        <motion.div
                            key={section.id}
                            variants={{
                                hidden: { opacity: 0, y: 20 },
                                visible: {
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                        duration: 0.5,
                                        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
                                    },
                                },
                            }}
                            className={spanClass}
                            style={sectionStyle}
                        >
                            {(() => {
                                switch (section.id) {
                                    case "stat-cards":
                                        return (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                                                {metricsConfig.visibleCards.netWorth && (
                                                    <StatCard
                                                        label="Net Worth"
                                                        value={formatCurrency(netWorth, currency)}
                                                        maskedValue={maskValue(netWorth)}
                                                        icon={DollarSign}
                                                        theme="indigo"
                                                        chartData={metricTrends.netWorth}
                                                    />
                                                )}
                                                {metricsConfig.visibleCards.income && (
                                                    <StatCard
                                                        label="Monthly Income"
                                                        value={formatCurrency(monthlyIncome, currency)}
                                                        maskedValue={maskValue(monthlyIncome)}
                                                        icon={TrendingUp}
                                                        theme="emerald"
                                                        chartData={metricTrends.income}
                                                    />
                                                )}
                                                {metricsConfig.visibleCards.expenses && (
                                                    <StatCard
                                                        label="Monthly Expenses"
                                                        value={formatCurrency(monthlyExpenses, currency)}
                                                        maskedValue={maskValue(monthlyExpenses)}
                                                        icon={TrendingDown}
                                                        theme="rose"
                                                        chartData={metricTrends.expenses}
                                                    />
                                                )}
                                                {metricsConfig.visibleCards.balance && (
                                                    <StatCard
                                                        label="Monthly Balance"
                                                        value={formatCurrency(monthlyIncome - monthlyExpenses, currency)}
                                                        maskedValue={maskValue(monthlyIncome - monthlyExpenses)}
                                                        icon={ArrowLeftRight}
                                                        theme={monthlyIncome - monthlyExpenses >= 0 ? "emerald" : "rose"}
                                                        chartData={metricTrends.balance}
                                                    />
                                                )}
                                                {metricsConfig.visibleCards.dailyBudget && (
                                                    <StatCard
                                                        label="Daily Budget"
                                                        value={dailySuggested > 0 ? formatCurrency(dailySuggested, currency) : "—"}
                                                        maskedValue={dailySuggested > 0 ? maskValue(dailySuggested) : "—"}
                                                        icon={PiggyBank}
                                                        theme="amber"
                                                        chartData={metricTrends.dailyBudget}
                                                    />
                                                )}
                                            </div>
                                        );

                                    case "spending-distribution":
                                        return (
                                            <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm h-full flex flex-col">
                                                <CardHeader className="pb-0">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Spending Analytics</CardTitle>
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">By Category</p>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-2 sm:pt-4 px-4 sm:px-6">
                                                    <div className={`${isPrivacyMode ? "blur-sm opacity-50" : ""}`}>
                                                        {spendingByCategory.length > 0 ? (
                                                            <div className="space-y-2.5 sm:space-y-4">
                                                                {spendingByCategory.map((category) => {
                                                                    const percentage = monthlyExpenses > 0 ? (category.value / monthlyExpenses) * 100 : 0;
                                                                    return (
                                                                        <div key={category.id} className="group">
                                                                            <div className="flex items-center justify-between mb-1.5">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div
                                                                                        className="w-2 h-2 rounded-full"
                                                                                        style={{ backgroundColor: category.color }}
                                                                                    />
                                                                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                                                                                        {category.label}
                                                                                    </span>
                                                                                </div>
                                                                                <span className="text-[11px] font-black text-slate-900 dark:text-white">
                                                                                    {percentage.toFixed(1)}%
                                                                                </span>
                                                                            </div>
                                                                            <div className="h-2.5 w-full bg-slate-50 dark:bg-slate-800/50 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className="h-full rounded-full transition-all duration-1000 group-hover:opacity-80"
                                                                                    style={{
                                                                                        width: `${percentage}%`,
                                                                                        backgroundColor: category.color,
                                                                                        boxShadow: `0 0 10px ${category.color}30`
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
                                                                No expenses this month yet
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );

                                    case "cash-flow":
                                        return (
                                            <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm h-full flex flex-col">
                                                <CardHeader className="pb-0">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Cash Flow</CardTitle>
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Last 30 Days</p>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-2 sm:pt-4 px-2 sm:px-6">
                                                    <div className={`h-60 sm:h-72 ${isPrivacyMode ? "blur-sm opacity-50" : ""}`}>
                                                        {cashFlowData.length > 0 ? (
                                                            <ResponsiveLine
                                                                data={cashFlowData}
                                                                margin={{ top: 10, right: 10, bottom: 40, left: 45 }}
                                                                xScale={{ type: "point" }}
                                                                yScale={{ type: "linear", min: 0, max: "auto" }}
                                                                curve="monotoneX"
                                                                colors={["oklch(0.65 0.15 160)", "oklch(0.6 0.18 30)"]}
                                                                lineWidth={3}
                                                                pointSize={0}
                                                                enableGridX={false}
                                                                gridYValues={4}
                                                                axisLeft={{
                                                                    tickSize: 0,
                                                                    tickPadding: 10,
                                                                    format: (v) => formatCurrency(v as number, currency),
                                                                }}
                                                                axisBottom={{
                                                                    tickSize: 0,
                                                                    tickPadding: 12,
                                                                    tickRotation: 0,
                                                                    tickValues: "every 10 days" as unknown as undefined,
                                                                }}
                                                                enableArea={true}
                                                                areaOpacity={0.1}
                                                                theme={{
                                                                    text: { fill: "oklch(0.55 0.02 80)", fontSize: 10, fontWeight: 500 },
                                                                    grid: { line: { stroke: "oklch(0.92 0.02 80)", strokeWidth: 1 } },
                                                                    axis: {
                                                                        domain: { line: { stroke: "transparent" } },
                                                                        ticks: { text: { fill: "oklch(0.55 0.02 80)" } }
                                                                    },
                                                                    tooltip: {
                                                                        container: {
                                                                            background: "oklch(0.99 0.005 80)",
                                                                            color: "oklch(0.25 0.02 80)",
                                                                            borderRadius: "12px",
                                                                            border: "1px solid oklch(0.88 0.02 80)",
                                                                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                                                                            padding: "10px",
                                                                            fontSize: "11px",
                                                                            fontWeight: 600
                                                                        },
                                                                    },
                                                                }}
                                                                enableSlices="x"
                                                            />
                                                        ) : (
                                                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                                                No transaction data available
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );

                                    case "recent-transactions":
                                        return (
                                            <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm h-full flex flex-col">
                                                <CardHeader className="pb-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Recent Transactions</CardTitle>
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Latest updates</p>
                                                        </div>
                                                        <Link
                                                            href="/transactions"
                                                            className="text-[11px] font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-all hover:gap-1.5"
                                                        >
                                                            View All
                                                            <ArrowRight className="w-3 h-3" />
                                                        </Link>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-1.5">
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
                                        );

                                    case "budget-overview":
                                        return (
                                            <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm h-full flex flex-col">
                                                <CardHeader className="pb-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">Budget Status</CardTitle>
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Performance tracking</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <Badge variant="outline" className="text-[9px] font-bold border-slate-200 rounded-full py-0 px-2 text-slate-400 uppercase tracking-wider">
                                                                {daysLeft} days left
                                                            </Badge>
                                                            <Link
                                                                href="/budgets"
                                                                className="text-[11px] font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-all hover:gap-1.5"
                                                            >
                                                                View All
                                                                <ArrowRight className="w-3 h-3" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-5">
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
                                        );

                                    case "wallets":
                                        return wallets.length > 0 ? (
                                            <div className="flex flex-col">
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
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 flex-1">
                                                    {wallets.map((wallet) => (
                                                        <Card key={wallet.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-[2rem] shadow-sm overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative">
                                                            <CardContent className="p-4 sm:p-6">
                                                                {/* Background Glow */}
                                                                <div
                                                                    className="absolute inset-0 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-700"
                                                                    style={{ background: `linear-gradient(135deg, ${wallet.color || "#7c3aed"}, transparent 60%)` }}
                                                                />

                                                                {/* Side border glow */}
                                                                <div
                                                                    className="absolute left-0 top-0 bottom-0 w-1 opacity-20"
                                                                    style={{ backgroundColor: wallet.color || "#7c3aed" }}
                                                                />

                                                                <div className="relative flex items-center gap-4">
                                                                    <div
                                                                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-transform group-hover:scale-110 group-hover:rotate-3 duration-500"
                                                                        style={{ backgroundColor: `${wallet.color || "#7c3aed"}20` }}
                                                                    >
                                                                        {wallet.icon || "💵"}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1.5">{wallet.name}</p>
                                                                        <div className={`text-xl font-black tracking-tight leading-none ${wallet.balance >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500"}`}>
                                                                            {wallet.type === "crypto" ? (
                                                                                <div className="flex flex-col gap-1">
                                                                                    <span className="text-lg">{wallet.balance} {SUPPORTED_CRYPTOS.find(c => c.id === wallet.currency_code)?.symbol || wallet.currency_code}</span>
                                                                                    <span className="text-[10px] font-bold text-slate-400">≈ {formatCurrency(wallet.balance * (prices[wallet.currency_code || ""] || 0), currency)}</span>
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
                            })()}
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Onboarding */}
            {
                showOnboarding && (
                    <Onboarding
                        onComplete={() => {
                            setShowOnboarding(false);
                            fetchData();
                        }}
                    />
                )
            }

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

            <QuickAddTransaction
                open={quickAddOpen}
                onOpenChange={setQuickAddOpen}
                wallets={wallets}
                categories={allCategories}
                onSuccess={fetchData}
            />
        </div >
    );
}
