"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Plus, ArrowLeftRight, Loader2, Trash2, ArrowDownLeft, ArrowUpRight, Search, Filter, Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { KeyboardShortcutsDialog } from "@/components/shared/keyboard-shortcuts-dialog";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { TransactionWithCategory, Wallet, Category } from "@/types/database";

export default function TransactionsPage() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Delete confirmation
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    // Filters
    const [filterType, setFilterType] = useState<string>("all");
    const [filterWallet, setFilterWallet] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Form state
    const [editId, setEditId] = useState<string | null>(null);
    const [amount, setAmount] = useState("");
    const [type, setType] = useState<"income" | "expense">("expense");
    const [walletId, setWalletId] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [merchantName, setMerchantName] = useState("");
    const [note, setNote] = useState("");

    // Transfer state
    const [transferOpen, setTransferOpen] = useState(false);
    const [transferFrom, setTransferFrom] = useState("");
    const [transferTo, setTransferTo] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
    const [transferNote, setTransferNote] = useState("");
    const [transferSaving, setTransferSaving] = useState(false);

    // Keyboard shortcuts
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { helpOpen, setHelpOpen, allShortcuts } = useKeyboardShortcuts([
        { key: "n", label: "N", description: "New transaction", action: () => openCreate() },
        { key: "t", label: "T", description: "Transfer between wallets", action: () => { if (wallets.length >= 2) openTransfer(); } },
        { key: "/", label: "/", description: "Focus search", action: () => searchInputRef.current?.focus() },
    ]);

    // Pagination
    const PAGE_SIZE = 30;
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async (loadMore = false) => {
        if (loadMore) {
            setLoadingMore(true);
            const offset = transactions.length;
            const { data: txData } = await supabase
                .from("transactions").select("*, categories(*)")
                .order("date", { ascending: false }).range(offset, offset + PAGE_SIZE - 1);
            const newTx = (txData || []) as TransactionWithCategory[];
            setHasMore(newTx.length === PAGE_SIZE);
            setTransactions((prev) => [...prev, ...newTx]);
            setLoadingMore(false);
        }
    }, [supabase, transactions.length]);

    // Initial fetch
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            const [{ data: txData }, { data: walletData }, { data: catData }] = await Promise.all([
                supabase.from("transactions").select("*, categories(*)").order("date", { ascending: false }).range(0, PAGE_SIZE - 1),
                supabase.from("wallets").select("*"),
                supabase.from("categories").select("*").order("name"),
            ]);
            const txArr = (txData || []) as TransactionWithCategory[];
            setTransactions(txArr);
            setHasMore(txArr.length === PAGE_SIZE);
            setWallets(walletData || []);
            setCategories(catData || []);
            setLoading(false);
        };
        init();
    }, [supabase]);

    // Auto-open dialog from FAB (?new=true)
    useEffect(() => {
        if (searchParams.get("new") === "true" && !loading) {
            openCreate();
            // Clean URL without refresh
            window.history.replaceState(null, "", "/transactions");
        }
    }, [loading, searchParams]);

    // Infinite scroll observer
    useEffect(() => {
        if (!loadMoreRef.current || !hasMore || loadingMore) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    fetchData(true);
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, fetchData]);

    // Refresh helper (used after add/edit/delete/transfer)
    const refreshData = useCallback(async () => {
        setLoading(true);
        const [{ data: txData }, { data: walletData }] = await Promise.all([
            supabase.from("transactions").select("*, categories(*)").order("date", { ascending: false }).range(0, PAGE_SIZE - 1),
            supabase.from("wallets").select("*"),
        ]);
        const txArr = (txData || []) as TransactionWithCategory[];
        setTransactions(txArr);
        setHasMore(txArr.length === PAGE_SIZE);
        setWallets(walletData || []);
        setLoading(false);
    }, [supabase]);

    const resetForm = () => {
        setEditId(null);
        setAmount("");
        setType("expense");
        setWalletId(wallets[0]?.id || "");
        setCategoryId("");
        setDate(new Date().toISOString().split("T")[0]);
        setMerchantName("");
        setNote("");
    };

    const openCreate = () => {
        resetForm();
        setDialogOpen(true);
    };

    const openEdit = (tx: TransactionWithCategory) => {
        setEditId(tx.id);
        setAmount(String(tx.amount));
        setType(tx.type as "income" | "expense");
        setWalletId(tx.wallet_id || "");
        setCategoryId(tx.category_id || "");
        setDate(tx.date || new Date().toISOString().split("T")[0]);
        setMerchantName(tx.merchant_name || "");
        setNote(tx.note || "");
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!amount || !walletId) return;
        setSaving(true);

        const txData = {
            amount: parseFloat(amount),
            type,
            wallet_id: walletId,
            category_id: categoryId || null,
            date,
            merchant_name: merchantName || null,
            note: note || null,
        };

        if (editId) {
            const { error } = await supabase.from("transactions").update(txData).eq("id", editId);
            if (error) toast.error("Failed to update transaction");
            else toast.success("Transaction updated");
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from("transactions").insert({ ...txData, user_id: user?.id });
            if (error) toast.error("Failed to add transaction");
            else toast.success("Transaction added");
        }

        setSaving(false);
        setDialogOpen(false);
        resetForm();
        refreshData();
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("transactions").delete().eq("id", id);
        if (error) toast.error("Failed to delete");
        else {
            toast.success("Transaction deleted");
            refreshData();
        }
    };

    const confirmDelete = (id: string) => {
        setDeleteId(id);
        setConfirmDeleteOpen(true);
    };

    const executeDelete = () => {
        if (deleteId) {
            handleDelete(deleteId);
            setDeleteId(null);
            setDialogOpen(false);
        }
    };

    // Transfer
    const openTransfer = () => {
        setTransferFrom(wallets[0]?.id || "");
        setTransferTo(wallets[1]?.id || "");
        setTransferAmount("");
        setTransferDate(new Date().toISOString().split("T")[0]);
        setTransferNote("");
        setTransferOpen(true);
    };

    const handleTransfer = async () => {
        if (!transferFrom || !transferTo || !transferAmount || transferFrom === transferTo) {
            if (transferFrom === transferTo) toast.error("Source and destination must be different");
            return;
        }
        setTransferSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        const fromWallet = wallets.find((w) => w.id === transferFrom);
        const toWallet = wallets.find((w) => w.id === transferTo);
        const transferRef = `transfer:${crypto.randomUUID().slice(0, 8)}`;
        const amt = parseFloat(transferAmount);

        const { error: err1 } = await supabase.from("transactions").insert({
            amount: amt,
            type: "expense",
            wallet_id: transferFrom,
            date: transferDate,
            merchant_name: `Transfer to ${toWallet?.name || "wallet"}`,
            note: transferNote ? `${transferRef} | ${transferNote}` : transferRef,
            user_id: user?.id,
        });

        const { error: err2 } = await supabase.from("transactions").insert({
            amount: amt,
            type: "income",
            wallet_id: transferTo,
            date: transferDate,
            merchant_name: `Transfer from ${fromWallet?.name || "wallet"}`,
            note: transferNote ? `${transferRef} | ${transferNote}` : transferRef,
            user_id: user?.id,
        });

        if (err1 || err2) toast.error("Transfer failed");
        else toast.success("Transfer completed");

        setTransferSaving(false);
        setTransferOpen(false);
        refreshData();
    };

    // Filter transactions
    const filtered = transactions.filter((tx) => {
        if (filterType === "transfer") {
            if (!tx.note?.startsWith("transfer:")) return false;
        } else if (filterType !== "all" && tx.type !== filterType) return false;
        if (filterWallet !== "all" && tx.wallet_id !== filterWallet) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesMerchant = tx.merchant_name?.toLowerCase().includes(q);
            const matchesCategory = tx.categories?.name?.toLowerCase().includes(q);
            const matchesNote = tx.note?.toLowerCase().includes(q);
            if (!matchesMerchant && !matchesCategory && !matchesNote) return false;
        }
        return true;
    });

    // Group by date
    const grouped = filtered.reduce((acc, tx) => {
        const dateKey = tx.date || "Unknown";
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(tx);
        return acc;
    }, {} as Record<string, TransactionWithCategory[]>);

    const filteredCategories = categories.filter((c) =>
        c.type === type || c.type === null
    );

    if (loading) {
        return (
            <div className="p-6 lg:p-8 space-y-4">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Transactions</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{filtered.length} transactions</p>
                </div>
                <div className="flex gap-2">
                    {wallets.length >= 2 && (
                        <Button
                            onClick={openTransfer}
                            variant="outline"
                            className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            <Repeat className="w-4 h-4 mr-2" />
                            Transfer
                        </Button>
                    )}
                    <Button
                        onClick={openCreate}
                        className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white shadow-lg shadow-violet-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Transaction
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        ref={searchInputRef}
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm"
                    />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[130px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-sm">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="transfer">Transfers</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={filterWallet} onValueChange={setFilterWallet}>
                    <SelectTrigger className="w-[150px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-sm">
                        <SelectValue placeholder="Wallet" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        <SelectItem value="all">All Wallets</SelectItem>
                        {wallets.map((w) => (
                            <SelectItem key={w.id} value={w.id}>{w.icon} {w.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Transaction List */}
            {Object.keys(grouped).length > 0 ? (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([dateKey, txs]) => (
                        <div key={dateKey}>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                                {formatDate(dateKey)}
                            </p>
                            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                                <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
                                    {txs.map((tx) => (
                                        <div
                                            key={tx.id}
                                            onClick={() => openEdit(tx)}
                                            className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
                                                tx.note?.startsWith("transfer:") ? "bg-blue-50 dark:bg-blue-500/10" : "bg-slate-100 dark:bg-slate-800"
                                            )}>
                                                {tx.note?.startsWith("transfer:") ? <Repeat className="w-5 h-5 text-blue-500" /> : tx.categories?.icon || (tx.type === "income" ? "💰" : "📦")}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                                        {tx.merchant_name || tx.categories?.name || "Transaction"}
                                                    </p>
                                                    {tx.status === "pending" && (
                                                        <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-600 px-1.5 py-0">
                                                            Pending
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-400 truncate">
                                                    {tx.categories?.name || "Uncategorized"} • {wallets.find((w) => w.id === tx.wallet_id)?.name || ""}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className={cn(
                                                    "text-sm font-semibold tabular-nums",
                                                    tx.note?.startsWith("transfer:") ? "text-blue-500" : tx.type === "income" ? "text-emerald-600" : "text-red-500"
                                                )}>
                                                    {tx.note?.startsWith("transfer:") ? "" : tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    ))}

                    {/* Infinite scroll sentinel */}
                    {hasMore && !searchQuery && filterType === "all" && filterWallet === "all" && (
                        <div ref={loadMoreRef} className="flex justify-center py-6">
                            {loadingMore ? (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading more...
                                </div>
                            ) : (
                                <Button
                                    variant="ghost"
                                    onClick={() => fetchData(true)}
                                    className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                >
                                    Load more transactions
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <EmptyState
                    icon={ArrowLeftRight}
                    title="No transactions found"
                    description="Add your first transaction or adjust your filters"
                    actionLabel="Add Transaction"
                    onAction={openCreate}
                />
            )}

            {/* Add/Edit Transaction — responsive modal (Sheet on mobile, Dialog on desktop) */}
            <ResponsiveModal
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                title={editId ? "Edit Transaction" : "Add Transaction"}
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
                        <Button variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !amount || !walletId}
                            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "Update" : "Add"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4 py-2">
                    {/* Type toggle */}
                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <button
                            onClick={() => setType("expense")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                                type === "expense" ? "bg-white dark:bg-slate-700 text-red-500 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <ArrowUpRight className="w-4 h-4" />
                            Expense
                        </button>
                        <button
                            onClick={() => setType("income")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                                type === "income" ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <ArrowDownLeft className="w-4 h-4" />
                            Income
                        </button>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-600 dark:text-slate-400">Amount</Label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-lg font-semibold"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Wallet</Label>
                            <Select value={walletId} onValueChange={setWalletId}>
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                    {wallets.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>{w.icon} {w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Category</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-h-52">
                                    {filteredCategories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-600 dark:text-slate-400">Date</Label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-600 dark:text-slate-400">Merchant / Payee</Label>
                        <Input
                            placeholder="e.g., Starbucks, Amazon"
                            value={merchantName}
                            onChange={(e) => setMerchantName(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-600 dark:text-slate-400">Note</Label>
                        <Input
                            placeholder="Optional note..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                        />
                    </div>
                </div>
            </ResponsiveModal>

            {/* Transfer Dialog */}
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-md shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Repeat className="w-5 h-5 text-blue-500" />
                            Transfer Between Wallets
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">From Wallet</Label>
                            <Select value={transferFrom} onValueChange={setTransferFrom}>
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                                    <SelectValue placeholder="Source wallet" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                    {wallets.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>{w.icon} {w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-center">
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                <ArrowDownLeft className="w-4 h-4 text-blue-500" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">To Wallet</Label>
                            <Select value={transferTo} onValueChange={setTransferTo}>
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                                    <SelectValue placeholder="Destination wallet" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                    {wallets.filter((w) => w.id !== transferFrom).map((w) => (
                                        <SelectItem key={w.id} value={w.id}>{w.icon} {w.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Amount</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={transferAmount}
                                onChange={(e) => setTransferAmount(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-lg font-semibold"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Date</Label>
                            <Input
                                type="date"
                                value={transferDate}
                                onChange={(e) => setTransferDate(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Note (optional)</Label>
                            <Input
                                placeholder="e.g., Moving savings..."
                                value={transferNote}
                                onChange={(e) => setTransferNote(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={handleTransfer}
                            disabled={transferSaving || !transferFrom || !transferTo || !transferAmount || transferFrom === transferTo}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white"
                        >
                            {transferSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Transfer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDelete
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                onConfirm={executeDelete}
                title="Delete Transaction"
                description="This will permanently remove this transaction and update your wallet balance. This action cannot be undone."
            />

            {/* Keyboard Shortcuts Help */}
            <KeyboardShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} shortcuts={allShortcuts} />
        </div>
    );
}
