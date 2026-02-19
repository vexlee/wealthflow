"use client";

import { useEffect, useState, useCallback } from "react";
import { useCurrency } from "@/contexts/currency-context";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, getBudgetProgressColor } from "@/lib/utils";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
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
            <div className="p-6 lg:p-8 space-y-6">
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
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Budgets</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your monthly spending limits</p>
                </div>
                <Button
                    onClick={openCreate}
                    className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white shadow-lg shadow-violet-500/20"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Set Budget
                </Button>
            </div>

            {/* Month Selector */}
            <div className="flex items-center justify-center gap-4">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <span className="text-lg font-semibold text-slate-800 dark:text-slate-200 min-w-[180px] text-center">
                    {monthNames[month - 1]} {year}
                </span>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>

            {/* Stats */}
            {budgets.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatCard label="Total Budget" value={formatCurrency(totalBudget, currency)} icon={DollarSign} iconColor="text-violet-600" />
                    <StatCard label="Total Spent" value={formatCurrency(totalSpent, currency)} icon={TrendingDown} iconColor="text-red-500" />
                    <StatCard
                        label="Remaining"
                        value={formatCurrency(remaining, currency)}
                        icon={PiggyBank}
                        iconColor={remaining >= 0 ? "text-emerald-600" : "text-red-500"}
                    />
                </div>
            )}

            {/* Budget Cards */}
            {budgets.length > 0 ? (
                <div className="space-y-3">
                    {budgets.map((b) => {
                        const percentage = Math.min((b.spent / Number(b.amount)) * 100, 100);
                        const isOver = b.spent > Number(b.amount);
                        return (
                            <Card
                                key={b.id}
                                className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                onClick={() => openEdit(b)}
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">
                                            {b.categories?.icon || "📦"}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{b.categories?.name || "Budget"}</p>
                                            <p className={`text-xs ${isOver ? "text-red-500 font-medium" : "text-slate-400"}`}>
                                                {formatCurrency(b.spent, currency)} of {formatCurrency(Number(b.amount), currency)}
                                            </p>
                                        </div>
                                        <span className={`text-lg font-bold ${isOver ? "text-red-500" : "text-slate-800 dark:text-slate-200"}`}>
                                            {Math.round(percentage)}%
                                        </span>
                                    </div>
                                    <Progress
                                        value={percentage}
                                        className="h-2 bg-slate-100 dark:bg-slate-800"
                                        indicatorClassName={getBudgetProgressColor(percentage)}
                                    />
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
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-md shadow-xl">
                    <DialogHeader>
                        <DialogTitle>{editId ? "Edit Budget" : "Set Budget"}</DialogTitle>
                    </DialogHeader>
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
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-lg font-semibold"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
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
                        <DialogClose asChild>
                            <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !categoryId || !amount}
                            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
