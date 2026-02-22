"use client";

import { useEffect, useState, useCallback } from "react";
import { useCurrency } from "@/contexts/currency-context";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";
import { StatCard } from "@/components/shared/stat-card";
import { TrendingDown, DollarSign } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    RefreshCw, Loader2, Trash2, AlertCircle, CheckCircle2, PauseCircle, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import type { RecurringTransactionWithCategory, Wallet, Category } from "@/types/database";

function getNextMonthLabel(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function RecurringPage() {
    const supabase = createClient();
    const { currency } = useCurrency();
    const [recurring, setRecurring] = useState<RecurringTransactionWithCategory[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Edit dialog state
    const [editItem, setEditItem] = useState<RecurringTransactionWithCategory | null>(null);
    const [editMerchant, setEditMerchant] = useState("");
    const [editAmount, setEditAmount] = useState("");
    const [editType, setEditType] = useState("expense");
    const [editCategoryId, setEditCategoryId] = useState<string>("");
    const [editWalletId, setEditWalletId] = useState<string>("");
    const [editDayOfMonth, setEditDayOfMonth] = useState("1");
    const [editNote, setEditNote] = useState("");
    const [editIsInstalment, setEditIsInstalment] = useState(false);
    const [editTotalInstalments, setEditTotalInstalments] = useState("");
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [{ data: recData }, { data: walletData }, { data: catData }] = await Promise.all([
            supabase
                .from("recurring_transactions")
                .select("*, categories(*)")
                .order("created_at", { ascending: false }),
            supabase.from("wallets").select("*"),
            supabase.from("categories").select("*").order("name"),
        ]);
        setRecurring((recData || []) as RecurringTransactionWithCategory[]);
        setWallets(walletData || []);
        setCategories(catData || []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleToggle = async (id: string, currentActive: boolean) => {
        setToggling(id);
        const { error } = await supabase
            .from("recurring_transactions")
            .update({ is_active: !currentActive })
            .eq("id", id);
        if (error) {
            toast.error("Failed to update");
        } else {
            setRecurring((prev) =>
                prev.map((r) => r.id === id ? { ...r, is_active: !currentActive } : r)
            );
            toast.success(currentActive ? "Paused recurring schedule" : "Resumed recurring schedule");
        }
        setToggling(null);
    };

    const openEdit = (item: RecurringTransactionWithCategory) => {
        setEditItem(item);
        setEditMerchant(item.merchant_name || "");
        setEditAmount(String(item.amount));
        setEditType(item.type);
        setEditCategoryId(item.category_id || "");
        setEditWalletId(item.wallet_id || "");
        setEditDayOfMonth(String(item.day_of_month));
        setEditNote(item.note || "");
        setEditIsInstalment(item.total_instalments !== null);
        setEditTotalInstalments(item.total_instalments !== null ? String(item.total_instalments) : "");
    };

    const handleSave = async () => {
        if (!editItem || !editAmount || Number(editAmount) <= 0) return;

        const totalInstalments = editIsInstalment ? parseInt(editTotalInstalments) || 0 : null;
        if (editIsInstalment) {
            if (!totalInstalments || totalInstalments < 1) {
                toast.error("Total months must be at least 1");
                return;
            }
            if (totalInstalments < editItem.instalments_paid) {
                toast.error(`Total months can't be less than months already paid (${editItem.instalments_paid})`);
                return;
            }
        }

        setSaving(true);

        const day = Math.min(Math.max(parseInt(editDayOfMonth) || 1, 1), 28);
        const now = new Date();
        const nextRun = now.getDate() < day
            ? new Date(now.getFullYear(), now.getMonth(), day)
            : new Date(now.getFullYear(), now.getMonth() + 1, day);
        const nextRunDate = nextRun.toISOString().split("T")[0];

        // If switching from instalment (completed) back to forever or a new total, reactivate
        const wasCompleted = editItem.total_instalments !== null &&
            editItem.instalments_paid >= editItem.total_instalments;
        const isActive = wasCompleted
            ? (totalInstalments === null || totalInstalments > editItem.instalments_paid)
            : editItem.is_active;

        const { error } = await supabase
            .from("recurring_transactions")
            .update({
                merchant_name: editMerchant.trim() || null,
                amount: Number(editAmount),
                type: editType,
                category_id: editCategoryId || null,
                wallet_id: editWalletId || null,
                day_of_month: day,
                next_run_date: nextRunDate,
                note: editNote.trim() || null,
                total_instalments: totalInstalments,
                is_active: isActive,
            })
            .eq("id", editItem.id);

        if (error) {
            toast.error("Failed to update recurring schedule");
        } else {
            toast.success("Recurring schedule updated");
            setEditItem(null);
            fetchData();
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        setDeleting(true);
        const { error } = await supabase
            .from("recurring_transactions")
            .delete()
            .eq("id", confirmDeleteId);
        if (error) {
            toast.error("Failed to delete");
        } else {
            setRecurring((prev) => prev.filter((r) => r.id !== confirmDeleteId));
            toast.success("Recurring schedule deleted");
        }
        setDeleting(false);
        setConfirmDeleteId(null);
    };

    const active = recurring.filter((r) => r.is_active);
    const inactive = recurring.filter((r) => !r.is_active);

    if (loading) {
        return (
            <div className="p-4 lg:p-8 space-y-4">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    const RecurringCard = ({ item }: { item: RecurringTransactionWithCategory }) => {
        const wallet = wallets.find((w) => w.id === item.wallet_id);
        const isInstalment = item.total_instalments !== null;
        const progress = isInstalment
            ? Math.min((item.instalments_paid / (item.total_instalments ?? 1)) * 100, 100)
            : null;
        const remaining = isInstalment
            ? (item.total_instalments ?? 0) - item.instalments_paid
            : null;
        const themeColor = item.type === "income" ? "#10b981" : "#ef4444";

        return (
            <Card className={cn(
                "group relative bg-white dark:bg-slate-900 border rounded-2xl sm:rounded-[2rem] shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden",
                item.is_active
                    ? "border-slate-200/80 dark:border-slate-800"
                    : "border-slate-200/40 dark:border-slate-800/60 opacity-60"
            )}>
                {/* Vibrant Background Glow */}
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none"
                    style={{ background: `linear-gradient(135deg, ${themeColor}20, transparent 70%)` }}
                />

                {/* Side Accent Glow */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 opacity-30 group-hover:opacity-60 transition-opacity duration-500"
                    style={{ backgroundColor: themeColor }}
                />

                <CardContent className="p-4 sm:p-7 relative z-10">
                    <div className="flex items-start gap-3 sm:gap-4">
                        {/* Icon */}
                        <div
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-[2rem] flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                            style={{
                                backgroundColor: `${themeColor}15`,
                                color: themeColor
                            }}
                        >
                            {item.categories?.icon || (item.type === "income" ? "💰" : "📦")}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none truncate">
                                    {item.merchant_name || item.categories?.name || "Recurring"}
                                </p>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-[9px] sm:text-[10px] font-black uppercase tracking-tighter px-1.5 sm:px-2 py-0 sm:py-0.5 rounded-full shrink-0",
                                        item.type === "income"
                                            ? "border-emerald-100 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20"
                                            : "border-red-100 bg-red-50 text-red-500 dark:bg-red-500/10 dark:border-red-500/20"
                                    )}
                                >
                                    {item.type}
                                </Badge>
                                {isInstalment && (
                                    <Badge variant="outline" className="text-[9px] sm:text-[10px] font-black uppercase tracking-tighter px-1.5 sm:px-2 py-0 sm:py-0.5 rounded-full border-violet-100 bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:border-violet-500/20 shrink-0">
                                        Instalment
                                    </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 sm:mb-4">
                                <span className="truncate">{item.categories?.name || "Uncategorized"}</span>
                                {wallet && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                                        <span className="truncate">{wallet.icon} {wallet.name}</span>
                                    </>
                                )}
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                                <span className="shrink-0">Day {item.day_of_month}</span>
                            </div>

                            {/* Amount and Next Run */}
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
                                <div>
                                    <p className={cn(
                                        "text-xl sm:text-2xl font-black tabular-nums tracking-tight leading-none",
                                        item.type === "income" ? "text-emerald-600" : "text-slate-900 dark:text-white"
                                    )}>
                                        {item.type === "income" ? "+" : "-"}{formatCurrency(Number(item.amount), currency)}
                                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 ml-1">/ mo</span>
                                    </p>

                                    {item.is_active ? (
                                        <p className="mt-2 sm:mt-3 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] sm:tracking-[0.15em] flex items-center gap-1 sm:gap-1.5">
                                            <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 animate-[spin_4s_linear_infinite]" />
                                            Next Run: {getNextMonthLabel(item.next_run_date)}
                                        </p>
                                    ) : (
                                        <div className="mt-2 sm:mt-3 flex items-center gap-1.5">
                                            {isInstalment && item.instalments_paid >= (item.total_instalments ?? 0) ? (
                                                <Badge variant="outline" className="text-[8px] sm:text-[9px] font-black uppercase border-emerald-100 bg-emerald-50 text-emerald-600 px-1.5 sm:px-2 py-0 rounded-full">
                                                    Completed
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[8px] sm:text-[9px] font-black uppercase border-slate-100 bg-slate-50 text-slate-400 px-1.5 sm:px-2 py-0 rounded-full">
                                                    Paused
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <button
                                        onClick={() => openEdit(item)}
                                        className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 shadow-sm"
                                        title="Edit"
                                    >
                                        <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleToggle(item.id, item.is_active)}
                                        disabled={toggling === item.id}
                                        className={cn(
                                            "p-2 sm:p-2.5 rounded-xl transition-all duration-300 shadow-sm",
                                            item.is_active
                                                ? "bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/10"
                                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10"
                                        )}
                                        title={item.is_active ? "Pause" : "Resume"}
                                    >
                                        {toggling === item.id ? (
                                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                        ) : item.is_active ? (
                                            <PauseCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        ) : (
                                            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setConfirmDeleteId(item.id)}
                                        className="p-2 sm:p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 transition-all duration-300 shadow-sm"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Instalment progress */}
                            {isInstalment && progress !== null && (
                                <div className="mt-4 sm:mt-5 space-y-1.5 sm:space-y-2">
                                    <div className="flex justify-between text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <span>{item.instalments_paid} / {item.total_instalments} paid</span>
                                        <span>{remaining} left</span>
                                    </div>
                                    <div className="h-1.5 sm:h-2 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800">
                                        <div
                                            className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full transition-all duration-1000"
                                            style={{ width: `${progress}%`, boxShadow: `0 0 10px rgba(124, 58, 237, 0.3)` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Recurring</h1>
                    <p className="text-[11px] sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                        {recurring.length} scheduled {recurring.length === 1 ? "entry" : "entries"}
                    </p>
                </div>
            </div>

            {/* Stats */}
            {recurring.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <StatCard
                        label="Active Schedules"
                        value={String(active.length)}
                        icon={RefreshCw}
                        theme="violet"
                        compact
                        disablePrivacy={true}
                    />
                    <StatCard
                        label="Monthly Outflow"
                        value={formatCurrency(
                            active
                                .filter((r) => r.type === "expense")
                                .reduce((s, r) => s + Number(r.amount), 0),
                            currency
                        )}
                        icon={TrendingDown}
                        theme="rose"
                        compact
                        disablePrivacy={true}
                    />
                    <StatCard
                        label="Monthly Inflow"
                        value={formatCurrency(
                            active
                                .filter((r) => r.type === "income")
                                .reduce((s, r) => s + Number(r.amount), 0),
                            currency
                        )}
                        icon={DollarSign}
                        theme="emerald"
                        compact
                        disablePrivacy={true}
                    />
                </div>
            )}

            {recurring.length === 0 ? (
                <EmptyState
                    icon={RefreshCw}
                    title="No recurring schedules"
                    description="Add a recurring transaction from the Transactions page"
                    actionLabel="Go to Transactions"
                    onAction={() => (window.location.href = "/transactions")}
                />
            ) : (
                <div className="space-y-6">
                    {/* Active */}
                    {active.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Active ({active.length})</h2>
                            </div>
                            {active.map((item) => (
                                <RecurringCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}

                    {/* Inactive / Completed */}
                    {inactive.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <PauseCircle className="w-4 h-4 text-slate-400" />
                                <h2 className="text-sm font-semibold text-slate-400">Inactive / Completed ({inactive.length})</h2>
                            </div>
                            {inactive.map((item) => (
                                <RecurringCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
                <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-md shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-4 h-4 text-violet-500" />
                            Edit Recurring Schedule
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Type */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 dark:text-slate-400">Type</Label>
                            <Select value={editType} onValueChange={setEditType}>
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                    <SelectItem value="expense">Expense</SelectItem>
                                    <SelectItem value="income">Income</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Merchant / Label */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 dark:text-slate-400">Name / Merchant</Label>
                            <Input
                                value={editMerchant}
                                onChange={(e) => setEditMerchant(e.target.value)}
                                placeholder="e.g. Netflix, Salary"
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            />
                        </div>

                        {/* Amount */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 dark:text-slate-400">Amount</Label>
                            <Input
                                type="number"
                                inputMode="decimal"
                                min="0.01"
                                step="0.01"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                placeholder="0.00"
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 dark:text-slate-400">Category</Label>
                            <Select value={editCategoryId || "none"} onValueChange={(v) => setEditCategoryId(v === "none" ? "" : v)}>
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                    <SelectItem value="none">No category</SelectItem>
                                    {categories
                                        .filter((c) => !c.type || c.type === editType)
                                        .map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.icon} {c.name}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Wallet */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 dark:text-slate-400">Wallet</Label>
                            <Select value={editWalletId || "none"} onValueChange={(v) => setEditWalletId(v === "none" ? "" : v)}>
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    <SelectValue placeholder="Select wallet" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                    <SelectItem value="none">No wallet</SelectItem>
                                    {wallets.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.icon} {w.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Day of Month */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 dark:text-slate-400">Day of Month (1–28)</Label>
                            <Input
                                type="number"
                                inputMode="decimal"
                                min="1"
                                max="28"
                                value={editDayOfMonth}
                                onChange={(e) => setEditDayOfMonth(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            />
                        </div>

                        {/* Schedule Type */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 dark:text-slate-400">Schedule Type</Label>
                            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setEditIsInstalment(false)}
                                    className={cn(
                                        "flex-1 py-2 text-sm font-medium transition-colors",
                                        !editIsInstalment
                                            ? "bg-violet-600 text-white"
                                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    )}
                                >
                                    Forever
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditIsInstalment(true)}
                                    className={cn(
                                        "flex-1 py-2 text-sm font-medium transition-colors",
                                        editIsInstalment
                                            ? "bg-violet-600 text-white"
                                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    )}
                                >
                                    Instalment
                                </button>
                            </div>
                        </div>

                        {/* Total Instalments (shown only when Instalment is selected) */}
                        {editIsInstalment && (
                            <div className="space-y-1.5">
                                <Label className="text-slate-600 dark:text-slate-400">Total Months</Label>
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    min={editItem ? Math.max(1, editItem.instalments_paid) : 1}
                                    step="1"
                                    value={editTotalInstalments}
                                    onChange={(e) => setEditTotalInstalments(e.target.value)}
                                    placeholder="e.g. 12"
                                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                />
                                {editItem && editItem.instalments_paid > 0 && (
                                    <p className="text-[11px] text-slate-400">
                                        {editItem.instalments_paid} month{editItem.instalments_paid !== 1 ? "s" : ""} already paid — total must be at least {editItem.instalments_paid + 1}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Note */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-600 dark:text-slate-400">Note (optional)</Label>
                            <Input
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                placeholder="Add a note..."
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" className="border-slate-200 dark:border-slate-700">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !editAmount || Number(editAmount) <= 0}
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Dialog */}
            <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
                <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-sm shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-500">
                            <AlertCircle className="w-5 h-5" />
                            Delete Recurring Schedule
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
                        This will permanently delete this recurring schedule. Past transactions will not be affected. Are you sure?
                    </p>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" className="border-slate-200 dark:border-slate-700">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
