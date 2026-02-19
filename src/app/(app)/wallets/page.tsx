"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Wallet, Loader2, Trash2, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { toast } from "sonner";
import { formatDateShort } from "@/lib/utils";
import type { Wallet as WalletType, Transaction } from "@/types/database";

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
    const w = 64, h = 24, pad = 2;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg width={w} height={h} className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

const ICONS = ["💵", "💳", "🏦", "💰", "🪙", "📱", "💎", "🏠", "🚗", "✈️"];
const COLORS = ["#7c3aed", "#0891b2", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#f97316", "#6366f1"];

export default function WalletsPage() {
    const supabase = createClient();
    const [wallets, setWallets] = useState<(WalletType & { balance: number; lastTx: Transaction | null; sparkline: number[] })[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editWallet, setEditWallet] = useState<WalletType | null>(null);

    // Undo delete
    const pendingDeleteRef = useRef<{ id: string; timer: NodeJS.Timeout } | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [type, setType] = useState("manual");
    const [currency, setCurrency] = useState("USD");
    const [icon, setIcon] = useState("💵");
    const [color, setColor] = useState("#7c3aed");

    const fetchWallets = useCallback(async () => {
        setLoading(true);
        const { data: walletsData } = await supabase.from("wallets").select("*");
        const { data: allTx } = await supabase.from("transactions").select("*").order("date", { ascending: false });

        const walletBalances = (walletsData || []).map((w) => {
            const txs = (allTx || []).filter((t) => t.wallet_id === w.id);
            const balance = txs.reduce((sum, t) => {
                return t.type === "income" ? sum + Number(t.amount) : sum - Number(t.amount);
            }, 0);

            // Last transaction
            const lastTx = txs[0] || null;

            // Sparkline: running balance over last 7 transactions (oldest→newest)
            const recentTxs = txs.slice(0, 7).reverse();
            let runBal = 0;
            const sparkline = recentTxs.map((t) => {
                runBal += t.type === "income" ? Number(t.amount) : -Number(t.amount);
                return runBal;
            });

            return { ...w, balance, lastTx, sparkline };
        });
        setWallets(walletBalances);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchWallets();
    }, [fetchWallets]);

    const resetForm = () => {
        setName("");
        setType("manual");
        setCurrency("USD");
        setIcon("💵");
        setColor("#7c3aed");
        setEditWallet(null);
    };

    const openCreate = () => {
        resetForm();
        setDialogOpen(true);
    };

    const openEdit = (wallet: WalletType) => {
        setEditWallet(wallet);
        setName(wallet.name);
        setType(wallet.type || "manual");
        setCurrency(wallet.currency_code || "USD");
        setIcon(wallet.icon || "💵");
        setColor(wallet.color || "#7c3aed");
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);

        if (editWallet) {
            const { error } = await supabase
                .from("wallets")
                .update({ name, type, currency_code: currency, icon, color })
                .eq("id", editWallet.id);

            if (error) {
                toast.error("Failed to update wallet");
            } else {
                toast.success("Wallet updated");
            }
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: wallet, error } = await supabase
                .from("wallets")
                .insert({ name, type, currency_code: currency, icon, color, owner_id: user?.id })
                .select()
                .single();

            if (error) {
                toast.error("Failed to create wallet");
            } else {
                // Add user as owner in wallet_members
                if (wallet && user) {
                    await supabase.from("wallet_members").insert({
                        wallet_id: wallet.id,
                        user_id: user.id,
                        role: "owner",
                    });
                }
                toast.success("Wallet created");
            }
        }

        setSaving(false);
        setDialogOpen(false);
        resetForm();
        fetchWallets();
    };

    const handleDeleteWithUndo = (walletId: string) => {
        // Cancel any pending delete
        if (pendingDeleteRef.current) {
            clearTimeout(pendingDeleteRef.current.timer);
            pendingDeleteRef.current = null;
        }

        const deletedWallet = wallets.find((w) => w.id === walletId);
        if (!deletedWallet) return;

        // Optimistically remove
        setWallets((prev) => prev.filter((w) => w.id !== walletId));
        setDialogOpen(false);

        // Schedule DB delete after 5 seconds
        const timer = setTimeout(async () => {
            pendingDeleteRef.current = null;
            const { error } = await supabase.from("wallets").delete().eq("id", walletId);
            if (error) {
                setWallets((prev) => [...prev, deletedWallet]);
                toast.error("Failed to delete wallet");
            }
        }, 5000);

        pendingDeleteRef.current = { id: walletId, timer };

        toast("Wallet deleted", {
            action: {
                label: "Undo",
                onClick: () => {
                    if (pendingDeleteRef.current?.id === walletId) {
                        clearTimeout(pendingDeleteRef.current.timer);
                        pendingDeleteRef.current = null;
                    }
                    setWallets((prev) => [...prev, deletedWallet]);
                    toast.success("Wallet restored");
                },
            },
            duration: 5000,
        });
    };

    const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

    if (loading) {
        return (
            <div className="p-6 lg:p-8 space-y-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-32 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                        ))}
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
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Wallets</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Total Balance: <span className="text-slate-900 dark:text-slate-100 font-semibold">{formatCurrency(totalBalance)}</span>
                    </p>
                </div>
                <Button
                    onClick={openCreate}
                    className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white shadow-lg shadow-violet-500/20"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Wallet
                </Button>
            </div>

            {/* Wallet Grid */}
            {wallets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wallets.map((wallet) => (
                        <Card
                            key={wallet.id}
                            className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden group hover:shadow-md transition-all duration-300 cursor-pointer"
                            onClick={() => openEdit(wallet)}
                        >
                            <CardContent className="p-6 relative">
                                <div
                                    className="absolute inset-0 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity"
                                    style={{ background: `linear-gradient(135deg, ${wallet.color || "#7c3aed"}, transparent)` }}
                                />
                                <div className="relative">
                                    <div className="flex items-center justify-between mb-4">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm"
                                            style={{ backgroundColor: `${wallet.color || "#7c3aed"}12`, boxShadow: `0 2px 8px ${wallet.color || "#7c3aed"}08` }}
                                        >
                                            {wallet.icon || "💵"}
                                        </div>
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            {wallet.type || "manual"}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{wallet.name}</p>
                                    <div className="flex items-end justify-between gap-3">
                                        <p className={`text-2xl font-bold tracking-tight ${wallet.balance >= 0 ? "text-slate-900 dark:text-slate-100" : "text-red-500"}`}>
                                            {formatCurrency(wallet.balance, wallet.currency_code || "USD")}
                                        </p>
                                        {wallet.sparkline.length >= 2 && (
                                            <MiniSparkline data={wallet.sparkline} color={wallet.color || "#7c3aed"} />
                                        )}
                                    </div>
                                    {wallet.lastTx && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
                                            {wallet.lastTx.type === "income" ? (
                                                <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                                            ) : (
                                                <ArrowUpRight className="w-3 h-3 text-red-400" />
                                            )}
                                            <span className="truncate">
                                                {wallet.lastTx.merchant_name || "Transaction"} · {formatCurrency(Number(wallet.lastTx.amount))}
                                            </span>
                                            <span className="ml-auto shrink-0">{wallet.lastTx.date ? formatDateShort(wallet.lastTx.date) : ""}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={Wallet}
                    title="No wallets yet"
                    description="Create your first wallet to start tracking your finances"
                    actionLabel="Create Wallet"
                    onAction={openCreate}
                />
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-md shadow-xl">
                    <DialogHeader>
                        <DialogTitle>{editWallet ? "Edit Wallet" : "Create Wallet"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-slate-600">Wallet Name</Label>
                            <Input
                                placeholder="e.g., Cash, Bank Account"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-600">Type</Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                        <SelectItem value="manual">Manual</SelectItem>
                                        <SelectItem value="bank">Bank</SelectItem>
                                        <SelectItem value="crypto">Crypto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Currency</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                        <SelectItem value="EUR">EUR (€)</SelectItem>
                                        <SelectItem value="GBP">GBP (£)</SelectItem>
                                        <SelectItem value="MYR">MYR (RM)</SelectItem>
                                        <SelectItem value="SGD">SGD (S$)</SelectItem>
                                        <SelectItem value="JPY">JPY (¥)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-600">Icon</Label>
                            <div className="flex flex-wrap gap-2">
                                {ICONS.map((ic) => (
                                    <button
                                        key={ic}
                                        onClick={() => setIcon(ic)}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${icon === ic
                                            ? "bg-violet-100 ring-2 ring-violet-500 scale-110"
                                            : "bg-slate-50 hover:bg-slate-100 border border-slate-200"
                                            }`}
                                    >
                                        {ic}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-600">Color</Label>
                            <div className="flex flex-wrap gap-2">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full transition-all ${color === c ? "ring-2 ring-slate-900 scale-110" : "hover:scale-105"
                                            }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        {editWallet && (
                            <Button
                                variant="ghost"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 mr-auto"
                                onClick={() => handleDeleteWithUndo(editWallet.id)}
                            >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                            </Button>
                        )}
                        <DialogClose asChild>
                            <Button variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !name.trim()}
                            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editWallet ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
