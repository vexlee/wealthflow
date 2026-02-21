"use client";

import { useEffect, useState, useCallback } from "react";
import { useCurrency } from "@/contexts/currency-context";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, getBudgetProgressColor, cn } from "@/lib/utils";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, PiggyBank, Loader2, Trash2, ChevronLeft, ChevronRight, TrendingDown, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import type { Budget, Category, TransactionWithCategory } from "@/types/database";

export default function BudgetsPage() {
    const supabase = createClient();
    const { currency } = useCurrency();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [budgets, setBudgets] = useState<(Budget & { categories: Category | null; spent: number })[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Delete confirmation
    const [deleteBudgetId, setDeleteBudgetId] = useState<string | null>(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    // Form
    const [editId, setEditId] = useState<string | null>(null);
    const [categoryId, setCategoryId] = useState("");
    const [amount, setAmount] = useState("");

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const fetchData = useCallback(async () => {
        setLoading(true);
        const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const [{ data: budgetData }, { data: catData }, { data: txData }] = await Promise.all([
            supabase.from("budgets").select("*, categories(*)").eq("month", month).eq("year", year),
            supabase.from("categories").select("*").order("name"),
            supabase.from("transactions").select("*, categories(*)").eq("type", "expense").gte("date", monthStart).lte("date", monthEnd),
        ]);

        setCategories(catData || []);
        const monthTx = (txData || []) as TransactionWithCategory[];

        const budgetsWithSpent = (budgetData || []).map((b) => {
            const spent = monthTx
                .filter((t) => t.category_id === b.category_id)
                .reduce((sum, t) => sum + Number(t.amount), 0);
            return { ...b, spent };
        });
        setBudgets(budgetsWithSpent as (Budget & { categories: Category | null; spent: number })[]);
        setLoading(false);
    }, [supabase, month, year]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const prevMonth = () => {
        if (month === 1) { setMonth(12); setYear(year - 1); }
        else setMonth(month - 1);
    };
    const nextMonth = () => {
        if (month === 12) { setMonth(1); setYear(year + 1); }
        else setMonth(month + 1);
    };

    const resetForm = () => { setEditId(null); setCategoryId(""); setAmount(""); };

    const openCreate = () => { resetForm(); setDialogOpen(true); };
    const openEdit = (b: Budget & { categories: Category | null; spent: number }) => {
        setEditId(b.id);
        setCategoryId(b.category_id || "");
        setAmount(String(b.amount));
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!categoryId || !amount) return;
        setSaving(true);

        if (editId) {
            const { error } = await supabase.from("budgets").update({ category_id: categoryId, amount: parseFloat(amount) }).eq("id", editId);
            if (error) toast.error("Failed to update"); else toast.success("Budget updated");
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from("budgets").insert({
                category_id: categoryId,
                amount: parseFloat(amount),
                month, year,
                user_id: user?.id,
            });
            if (error) toast.error("Failed to create"); else toast.success("Budget created");
        }

        setSaving(false);
        setDialogOpen(false);
        resetForm();
        fetchData();
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("budgets").delete().eq("id", id);
        if (error) toast.error("Failed to delete"); else { toast.success("Budget deleted"); fetchData(); }
    };

    const confirmDelete = (id: string) => {
        setDeleteBudgetId(id);
        setConfirmDeleteOpen(true);
    };

    const executeDelete = () => {
        if (deleteBudgetId) {
            handleDelete(deleteBudgetId);
            setDeleteBudgetId(null);
            setDialogOpen(false);
        }
    };

    const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const remaining = totalBudget - totalSpent;

    if (loading) {
        return (
            <div className="p-4 lg:p-8 space-y-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />)}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Budgets</h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage your monthly spending limits</p>
                </div>
                <Button
                    onClick={openCreate}
                    className="h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold shadow-lg shadow-slate-200 dark:shadow-none transition-all duration-300 hover:scale-[1.02] px-6"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Set Budget
                </Button>
            </div>

            {/* Month Selector */}
            <div className="flex items-center justify-center p-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl w-fit mx-auto border border-slate-100 dark:border-slate-800">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="h-10 w-10 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-white dark:hover:bg-slate-700 shadow-none hover:shadow-sm">
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="text-sm font-black text-slate-900 dark:text-white min-w-[160px] text-center uppercase tracking-[0.1em]">
                    {monthNames[month - 1]} {year}
                </span>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="h-10 w-10 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-white dark:hover:bg-slate-700 shadow-none hover:shadow-sm">
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>

            {/* Stats */}
            {budgets.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard label="Total Budget" value={formatCurrency(totalBudget, currency)} icon={DollarSign} theme="indigo" />
                    <StatCard label="Total Spent" value={formatCurrency(totalSpent, currency)} icon={TrendingDown} theme="rose" />
                    <StatCard
                        label="Remaining"
                        value={formatCurrency(remaining, currency)}
                        icon={PiggyBank}
                        theme={remaining >= 0 ? "emerald" : "rose"}
                    />
                </div>
            )}

            {/* Budget Cards */}
            {budgets.length > 0 ? (
                <div className="space-y-3">
                    {budgets.map((b) => {
                        const percentage = Math.min((b.spent / Number(b.amount)) * 100, 100);
                        const isOver = b.spent > Number(b.amount);
                        const themeColor = "#7c3aed"; // Default theme color for budgets
                        return (
                            <Card
                                key={b.id}
                                className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2rem] shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden"
                                onClick={() => openEdit(b)}
                            >
                                {/* Dynamic Background Glow */}
                                <div
                                    className="absolute inset-0 opacity-[0.05] group-hover:opacity-[0.12] transition-opacity duration-700 pointer-events-none"
                                    style={{ background: `linear-gradient(135deg, ${themeColor}20, transparent 70%)` }}
                                />

                                {/* Side Accent Glow */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1.5 opacity-30 group-hover:opacity-60 transition-opacity duration-500"
                                    style={{ backgroundColor: isOver ? "#ef4444" : themeColor }}
                                />

                                <CardContent className="p-7 relative z-10">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-16 h-16 rounded-[2rem] flex items-center justify-center text-3xl shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                                                style={{
                                                    backgroundColor: `${isOver ? "#ef4444" : themeColor}15`,
                                                    color: isOver ? "#ef4444" : themeColor
                                                }}
                                            >
                                                {b.categories?.icon || "📦"}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1 pl-0.5">Category</p>
                                                <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none truncate">{b.categories?.name || "Budget"}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">Usage</p>
                                            <p className={`text-xl font-black tracking-tighter leading-none ${isOver ? "text-rose-500" : "text-slate-900 dark:text-white"}`}>
                                                {Math.round(percentage)}%
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-end justify-between font-black uppercase tracking-widest text-[10px]">
                                            <span className={isOver ? "text-rose-500" : "text-slate-500"}>{formatCurrency(b.spent, currency)} spent</span>
                                            <span className="text-slate-400/80">Limit: {formatCurrency(Number(b.amount), currency)}</span>
                                        </div>
                                        <div className="h-4 w-full bg-slate-50 dark:bg-slate-800/50 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800/50">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-1000",
                                                    getBudgetProgressColor(percentage)
                                                )}
                                                style={{
                                                    width: `${percentage}%`,
                                                    boxShadow: percentage > 10 ? `0 0 15px ${isOver ? "#ef4444" : themeColor}40` : "none"
                                                }}
                                            />
                                        </div>
                                        {isOver && (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20">
                                                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.1em]">
                                                    Over budget by {formatCurrency(b.spent - Number(b.amount), currency)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <EmptyState
                    icon={PiggyBank}
                    title="No budgets set"
                    description={`Set spending limits for ${monthNames[month - 1]} ${year}`}
                    actionLabel="Set Budget"
                    onAction={openCreate}
                />
            )}

            {/* Dialog */}
            <ResponsiveModal
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                title={editId ? "Edit Budget" : "Set Budget"}
                footer={
                    <>
                        {editId && (
                            <Button
                                variant="ghost"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 mr-auto"
                                onClick={() => confirmDelete(editId)}
                            >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            className="border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !categoryId || !amount}
                            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "Update" : "Create"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label className="text-slate-600">Category</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-h-52">
                                {categories
                                    .filter((c) => c.type === "expense" || c.type === null)
                                    .map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-600">Monthly Limit</Label>
                        <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-lg font-semibold"
                        />
                    </div>
                </div>
            </ResponsiveModal>

            {/* Delete Confirmation */}
            <ConfirmDelete
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                onConfirm={executeDelete}
                title="Delete Budget"
                description="This will remove this budget limit. Your transaction history will not be affected."
            />
        </div>
    );
}
