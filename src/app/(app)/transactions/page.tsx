"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useCurrency } from "@/contexts/currency-context";
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
    Plus, ArrowLeftRight, Loader2, Trash2, ArrowDownLeft, ArrowUpRight, Search, Repeat,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { KeyboardShortcutsDialog } from "@/components/shared/keyboard-shortcuts-dialog";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { TransactionWithCategory, Wallet, Category } from "@/types/database";

function TransactionsContent() {
    const supabase = createClient();
    const { currency } = useCurrency();
    const searchParams = useSearchParams();
    const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Undo delete
    const pendingDeleteRef = useRef<{ id: string; timer: NodeJS.Timeout } | null>(null);

    // Filters
    const [filterType, setFilterType] = useState<string>("all");
    const [filterWallet, setFilterWallet] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [filtersLoaded, setFiltersLoaded] = useState(false);

    // Form state
    const [editId, setEditId] = useState<string | null>(null);
    const [amount, setAmount] = useState("");
    const [type, setType] = useState<"income" | "expense">("expense");
    const [walletId, setWalletId] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [merchantName, setMerchantName] = useState("");
    const [note, setNote] = useState("");

    // Recurring form state
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringType, setRecurringType] = useState<"monthly" | "instalments">("monthly");
    const [numInstalments, setNumInstalments] = useState("3");

    // Transfer state
    const [transferOpen, setTransferOpen] = useState(false);
    const [transferFrom, setTransferFrom] = useState("");
    const [transferTo, setTransferTo] = useState("");
    const [transferAmount, setTransferAmount] = useState("");
    const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
    const [transferNote, setTransferNote] = useState("");
    const [transferSaving, setTransferSaving] = useState(false);

    function resetForm() {
        setEditId(null);
        setAmount("");
        setType("expense");
        setWalletId(wallets[0]?.id || "");
        setCategoryId("");
        setDate(new Date().toISOString().split("T")[0]);
        setMerchantName("");
        setNote("");
        setIsRecurring(false);
        setRecurringType("monthly");
        setNumInstalments("3");
    }

    function openCreate() {
        resetForm();
        setDialogOpen(true);
    }

    function openTransfer() {
        setTransferFrom(wallets[0]?.id || "");
        setTransferTo(wallets[1]?.id || "");
        setTransferAmount("");
        setTransferDate(new Date().toISOString().split("T")[0]);
        setTransferNote("");
        setTransferOpen(true);
    }

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
                .from("transactions").select("*, categories(*), wallets!inner(*)")
                .neq("wallets.type", "crypto")
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
                supabase.from("transactions").select("*, categories(*), wallets!inner(*)").neq("wallets.type", "crypto").order("date", { ascending: false }).range(0, PAGE_SIZE - 1),
                supabase.from("wallets").select("*").neq("type", "crypto"),
                supabase.from("categories").select("*").order("name"),
            ]);
            const txArr = (txData || []) as TransactionWithCategory[];
            setTransactions(txArr);
            setHasMore(txArr.length === PAGE_SIZE);
            setWallets(walletData || []);
            setCategories(catData || []);

            // 1. Fetch filters from Supabase profiles on load
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("transaction_filters")
                    .eq("id", user.id)
                    .single();

                if (profile && profile.transaction_filters) {
                    const filters = profile.transaction_filters as any;
                    if (filters.filterType) setFilterType(filters.filterType);
                    if (filters.filterWallet) setFilterWallet(filters.filterWallet);
                }
            }

            setFiltersLoaded(true);
            setLoading(false);
        };
        init();
    }, [supabase]);

    // 2. Persist filters back to Supabase when they change using debouncing
    useEffect(() => {
        if (!filtersLoaded) return; // Don't persist initial load

        const timer = setTimeout(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const currentFilters = { filterType, filterWallet };
                await supabase
                    .from("profiles")
                    .upsert({ id: user.id, transaction_filters: currentFilters as any });
            }
        }, 1000); // 1 second debounce

        return () => clearTimeout(timer);
    }, [filterType, filterWallet, filtersLoaded, supabase]);

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
            supabase.from("transactions").select("*, categories(*), wallets!inner(*)").neq("wallets.type", "crypto").order("date", { ascending: false }).range(0, PAGE_SIZE - 1),
            supabase.from("wallets").select("*").neq("type", "crypto"),
        ]);
        const txArr = (txData || []) as TransactionWithCategory[];
        setTransactions(txArr);
        setHasMore(txArr.length === PAGE_SIZE);
        setWallets(walletData || []);
        setLoading(false);
    }, [supabase]);



    const openEdit = (tx: TransactionWithCategory) => {
        setEditId(tx.id);
        setAmount(String(tx.amount));
        setType(tx.type as "income" | "expense");
        setWalletId(tx.wallet_id || "");
        setCategoryId(tx.category_id || "");
        setDate(tx.date || new Date().toISOString().split("T")[0]);
        setMerchantName(tx.merchant_name || "");
        setNote(tx.note || "");
        // Recurring toggle disabled when editing existing transactions
        setIsRecurring(false);
        setRecurringType("monthly");
        setNumInstalments("3");
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

            if (isRecurring) {
                // Derive day of month from the chosen date
                const selectedDate = new Date(date + "T00:00:00");
                const dayOfMonth = selectedDate.getDate();
                const totalInstalments = recurringType === "instalments" ? parseInt(numInstalments) : null;

                // Calculate next run date as the following month since the first payment is created now
                const nextMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, dayOfMonth);
                const nextRunDate = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-${String(nextMonth.getDate()).padStart(2, "0")}`;

                // 1. Create the recurring template
                const { data: recurringData, error: recurringError } = await supabase
                    .from("recurring_transactions")
                    .insert({
                        user_id: user?.id,
                        wallet_id: walletId,
                        category_id: categoryId || null,
                        amount: parseFloat(amount),
                        type,
                        day_of_month: dayOfMonth,
                        merchant_name: merchantName || null,
                        note: note || null,
                        is_active: true,
                        next_run_date: nextRunDate,
                        total_instalments: totalInstalments,
                        instalments_paid: 1,
                    })
                    .select()
                    .single();

                if (recurringError || !recurringData) {
                    toast.error("Failed to create recurring schedule");
                    setSaving(false);
                    return;
                }

                // 2. Insert the first transaction linked to the recurring template
                const { error: txError } = await supabase.from("transactions").insert({
                    ...txData,
                    user_id: user?.id,
                    recurring_id: recurringData.id,
                });

                if (txError) toast.error("Failed to add transaction");
                else {
                    const modeLabel = recurringType === "instalments"
                        ? `${numInstalments}-month instalment`
                        : "monthly recurring";
                    toast.success(`Transaction added as ${modeLabel}`);
                }
            } else {
                const { error } = await supabase.from("transactions").insert({ ...txData, user_id: user?.id });
                if (error) toast.error("Failed to add transaction");
                else toast.success("Transaction added");
            }
        }

        setSaving(false);
        setDialogOpen(false);
        resetForm();
        refreshData();
    };

    const handleDeleteWithUndo = (id: string) => {
        // Cancel any pending delete
        if (pendingDeleteRef.current) {
            clearTimeout(pendingDeleteRef.current.timer);
            pendingDeleteRef.current = null;
        }

        // Snapshot the item for potential restore
        const deletedTx = transactions.find((tx) => tx.id === id);
        if (!deletedTx) return;

        // Optimistically remove from local state
        setTransactions((prev) => prev.filter((tx) => tx.id !== id));
        setDialogOpen(false);

        // Schedule the actual DB delete after 5 seconds
        const timer = setTimeout(async () => {
            pendingDeleteRef.current = null;
            const { error } = await supabase.from("transactions").delete().eq("id", id);
            if (error) {
                // Restore on failure
                setTransactions((prev) => [deletedTx, ...prev].sort((a, b) =>
                    (b.date || "").localeCompare(a.date || "")
                ));
                toast.error("Failed to delete transaction");
            }
        }, 5000);

        pendingDeleteRef.current = { id, timer };

        // Show undo toast
        toast("Transaction deleted", {
            action: {
                label: "Undo",
                onClick: () => {
                    if (pendingDeleteRef.current?.id === id) {
                        clearTimeout(pendingDeleteRef.current.timer);
                        pendingDeleteRef.current = null;
                    }
                    // Restore the item
                    setTransactions((prev) => [deletedTx, ...prev].sort((a, b) =>
                        (b.date || "").localeCompare(a.date || "")
                    ));
                    toast.success("Transaction restored");
                },
            },
            duration: 5000,
        });
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
            <div className="p-4 lg:p-8 space-y-4">
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
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Transactions</h1>
                    <p className="text-[11px] sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">{filtered.length} transactions total</p>
                </div>
                <div className="flex items-center gap-2">
                    {wallets.length >= 2 && (
                        <Button
                            onClick={openTransfer}
                            variant="outline"
                            className="h-10 sm:h-11 rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold transition-all duration-300 px-4 sm:px-5"
                        >
                            <Repeat className="w-4 h-4 mr-1.5 sm:mr-2" />
                            Transfer
                        </Button>
                    )}
                    <Button
                        onClick={openCreate}
                        className="h-10 sm:h-11 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-sm font-bold shadow-lg shadow-slate-200 dark:shadow-none transition-all duration-300 hover:scale-[1.02] px-4 sm:px-5"
                    >
                        <Plus className="w-4 h-4 mr-1.5 sm:mr-2" />
                        Add New
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 dark:group-focus-within:text-white transition-colors" />
                    <Input
                        ref={searchInputRef}
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-11 h-11 sm:h-12 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-sm placeholder:text-slate-400 shadow-sm focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="h-11 sm:h-12 flex-1 sm:min-w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-xs sm:text-sm font-bold shadow-sm">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800">
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="transfer">Transfers</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filterWallet} onValueChange={setFilterWallet}>
                        <SelectTrigger className="h-11 sm:h-12 flex-1 sm:min-w-[160px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white text-xs sm:text-sm font-bold shadow-sm">
                            <SelectValue placeholder="All Wallets" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800">
                            <SelectItem value="all">All Wallets</SelectItem>
                            {wallets.map((w) => (
                                <SelectItem key={w.id} value={w.id}>{w.icon} {w.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Transaction List */}
            {Object.keys(grouped).length > 0 ? (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([dateKey, txs]) => (
                        <div key={dateKey} className="group/date space-y-3">
                            <div className="flex items-center gap-3 px-1">
                                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800/50" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    {formatDate(dateKey)}
                                </p>
                                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800/50" />
                            </div>
                            <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/20 transition-all duration-500 overflow-hidden">
                                <CardContent className="p-0 divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {txs.map((tx) => (
                                        <div
                                            key={tx.id}
                                            onClick={() => openEdit(tx)}
                                            className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300 cursor-pointer active:scale-[0.995]"
                                        >
                                            <div className={cn(
                                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl shrink-0 transition-transform duration-500 group-hover:scale-110 shadow-sm",
                                                tx.note?.startsWith("transfer:") ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10" : "bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400"
                                            )}>
                                                {tx.note?.startsWith("transfer:")
                                                    ? <Repeat className="w-5 h-5" />
                                                    : <span className="filter grayscale group-hover:grayscale-0 transition-all duration-300">{tx.categories?.icon || (tx.type === "income" ? "💰" : "📦")}</span>
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                        {tx.merchant_name || tx.categories?.name || "Transaction"}
                                                    </p>
                                                    {tx.recurring_id && (
                                                        <div className="bg-violet-50 dark:bg-violet-500/10 p-1 rounded-md" title="Recurring">
                                                            <RefreshCw className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                        {tx.categories?.name || "Uncategorized"}
                                                    </span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                                                    <span className="text-[10px] font-bold text-slate-500/80 uppercase tracking-tighter">
                                                        {wallets.find((w) => w.id === tx.wallet_id)?.name || ""}
                                                    </span>
                                                    {tx.status === "pending" && (
                                                        <Badge variant="outline" className="text-[8px] border-amber-200 bg-amber-50 text-amber-600 px-1.5 py-0 font-black uppercase rounded-full">
                                                            Pending
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={cn(
                                                    "text-xs sm:text-sm font-black tabular-nums tracking-tight",
                                                    tx.note?.startsWith("transfer:") ? "text-blue-600" : tx.type === "income" ? "text-emerald-600" : "text-slate-900 dark:text-white"
                                                )}>
                                                    {tx.note?.startsWith("transfer:") ? "" : tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount), currency)}
                                                </p>
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
                                onClick={() => handleDeleteWithUndo(editId)}
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
                            inputMode="decimal"
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

                    {/* Recurring Toggle — only for new transactions */}
                    {!editId && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsRecurring((v) => !v)}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                                    isRecurring
                                        ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-500/10"
                                        : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center",
                                        isRecurring ? "bg-violet-100 dark:bg-violet-500/20" : "bg-slate-200 dark:bg-slate-700"
                                    )}>
                                        <RefreshCw className={cn("w-4 h-4", isRecurring ? "text-violet-600 dark:text-violet-400" : "text-slate-400")} />
                                    </div>
                                    <div className="text-left">
                                        <p className={cn("text-sm font-medium", isRecurring ? "text-violet-700 dark:text-violet-300" : "text-slate-600 dark:text-slate-400")}>
                                            Make Recurring
                                        </p>
                                        <p className="text-[11px] text-slate-400">Repeat automatically each month</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-10 h-5 rounded-full transition-colors relative flex items-center",
                                    isRecurring ? "bg-violet-500" : "bg-slate-300 dark:bg-slate-600"
                                )}>
                                    <span className={cn(
                                        "absolute w-4 h-4 bg-white rounded-full shadow transition-all",
                                        isRecurring ? "left-5" : "left-0.5"
                                    )} />
                                </div>
                            </button>

                            {/* Recurring options */}
                            {isRecurring && (
                                <div className="mt-3 space-y-3 px-1">
                                    {/* Mode selector */}
                                    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setRecurringType("monthly")}
                                            className={cn(
                                                "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all",
                                                recurringType === "monthly"
                                                    ? "bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm"
                                                    : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            🔁 Monthly (forever)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRecurringType("instalments")}
                                            className={cn(
                                                "flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all",
                                                recurringType === "instalments"
                                                    ? "bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm"
                                                    : "text-slate-500 hover:text-slate-700"
                                            )}
                                        >
                                            📅 Instalment
                                        </button>
                                    </div>

                                    {/* Instalment count */}
                                    {recurringType === "instalments" && (
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-slate-500 dark:text-slate-400">Number of months</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    inputMode="decimal"
                                                    min="2"
                                                    max="60"
                                                    value={numInstalments}
                                                    onChange={(e) => setNumInstalments(e.target.value)}
                                                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 w-24 text-center font-semibold"
                                                />
                                                <span className="text-sm text-slate-500">month{parseInt(numInstalments) !== 1 ? "s" : ""}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                                Repeats on day {date ? new Date(date + "T00:00:00").getDate() : "—"} of each month for {numInstalments} months
                                            </p>
                                        </div>
                                    )}

                                    {recurringType === "monthly" && (
                                        <p className="text-[11px] text-slate-400 px-1">
                                            Repeats on day {date ? new Date(date + "T00:00:00").getDate() : "—"} of each month indefinitely
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ResponsiveModal>

            {/* Transfer Dialog */}
            <ResponsiveModal
                open={transferOpen}
                onOpenChange={setTransferOpen}
                title={
                    <span className="flex items-center gap-2">
                        <Repeat className="w-5 h-5 text-blue-500" />
                        Transfer Between Wallets
                    </span>
                }
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setTransferOpen(false)}
                            className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleTransfer}
                            disabled={transferSaving || !transferFrom || !transferTo || !transferAmount || transferFrom === transferTo}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white"
                        >
                            {transferSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Transfer"}
                        </Button>
                    </>
                }
            >
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
                            inputMode="decimal"
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
            </ResponsiveModal>

            {/* Keyboard Shortcuts Help */}
            <KeyboardShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} shortcuts={allShortcuts} />
        </div>
    );
}

export default function TransactionsPage() {
    return (
        <Suspense fallback={
            <div className="p-4 lg:p-8 space-y-4">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    ))}
                </div>
            </div>
        }>
            <TransactionsContent />
        </Suspense>
    );
}
