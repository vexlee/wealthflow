"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useCurrency } from "@/contexts/currency-context";
import { useCryptoPrices } from "@/hooks/use-crypto-prices";
import { SUPPORTED_CRYPTOS } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveModal } from "@/components/shared/responsive-modal";
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
    const { currency } = useCurrency();
    const [wallets, setWallets] = useState<(WalletType & { balance: number; lastTx: Transaction | null; sparkline: number[] })[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editWallet, setEditWallet] = useState<WalletType | null>(null);

    const { prices } = useCryptoPrices(wallets, currency);

    // Undo delete
    const pendingDeleteRef = useRef<{ id: string; timer: NodeJS.Timeout } | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [type, setType] = useState("manual");
    const [walletCurrency, setWalletCurrency] = useState("USD");
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
        setWalletCurrency("USD");
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
        setWalletCurrency(wallet.currency_code || "USD");
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
                .update({ name, type, currency_code: walletCurrency, icon, color })
                .eq("id", editWallet.id);

            if (error) {
                toast.error("Failed to update wallet");
            } else {
                toast.success("Wallet updated");
            }
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.rpc("create_wallet_with_member", {
                p_name: name,
                p_type: type,
                p_currency_code: walletCurrency,
                p_icon: icon,
                p_color: color,
                p_owner_id: user?.id ?? "",
            });

            if (error) {
                toast.error("Failed to create wallet");
            } else {
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

    const totalBalance = wallets.reduce((sum, w) => {
        let wBalance = w.balance;
        if (w.type === "crypto") {
            const price = prices[w.currency_code || ""] || 0;
            wBalance = w.balance * price;
        }
        return sum + wBalance;
    }, 0);

    if (loading) {
        return (
            <div className="p-4 lg:p-8 space-y-6">
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
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Wallets</h1>
                    <p className="text-[11px] sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                        Total Balance: <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(totalBalance, currency)}</span>
                    </p>
                </div>
                <Button
                    onClick={openCreate}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-2xl px-5 sm:px-6 h-11 sm:h-12 text-sm sm:text-base font-bold shadow-lg shadow-slate-200 dark:shadow-none transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                    Add Wallet
                </Button>
            </div>

            {/* Wallet Grid */}
            {wallets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {wallets.map((wallet) => (
                        <Card
                            key={wallet.id}
                            className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-[2rem] shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer overflow-hidden"
                            onClick={() => openEdit(wallet)}
                        >
                            {/* Dynamic Background Glow */}
                            <div
                                className="absolute inset-0 opacity-[0.05] group-hover:opacity-[0.12] transition-opacity duration-700 pointer-events-none"
                                style={{ background: `linear-gradient(135deg, ${wallet.color || "#7c3aed"}20, transparent 70%)` }}
                            />

                            {/* Side Accent Glow */}
                            <div
                                className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 opacity-30 group-hover:opacity-60 transition-opacity duration-500"
                                style={{ backgroundColor: wallet.color || "#7c3aed" }}
                            />

                            <CardContent className="p-5 sm:p-7 relative z-10">
                                <div className="flex items-start justify-between mb-4 sm:mb-6">
                                    <div
                                        className="w-12 h-12 sm:w-16 h-16 rounded-xl sm:rounded-[2rem] flex items-center justify-center text-2xl sm:text-3xl shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                                        style={{
                                            backgroundColor: `${wallet.color || "#7c3aed"}15`,
                                            color: wallet.color || "#7c3aed"
                                        }}
                                    >
                                        {wallet.icon || "💵"}
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span
                                            className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] font-black px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border shadow-sm transition-colors duration-500"
                                            style={{
                                                backgroundColor: `${wallet.color || "#7c3aed"}10`,
                                                borderColor: `${wallet.color || "#7c3aed"}30`,
                                                color: wallet.color || "#7c3aed"
                                            }}
                                        >
                                            {wallet.type || "manual"}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-0.5 sm:space-y-1 mb-4 sm:mb-6">
                                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">{wallet.name}</p>
                                    <div className={`text-2xl sm:text-3xl font-black tracking-tighter leading-none ${wallet.balance >= 0 ? "text-slate-900 dark:text-white" : "text-rose-500"}`}>
                                        {wallet.type === "crypto" ? (
                                            <div className="flex flex-col gap-1 sm:gap-1.5">
                                                <div className="flex items-baseline gap-1.5 sm:gap-2">
                                                    <span>{wallet.balance}</span>
                                                    <span className="text-xs sm:text-sm font-black text-slate-400 uppercase">{SUPPORTED_CRYPTOS.find(c => c.id === wallet.currency_code)?.symbol || wallet.currency_code}</span>
                                                </div>
                                                <span className="text-[10px] sm:text-[11px] font-black text-slate-500/80 bg-slate-50 dark:bg-slate-800/50 w-fit px-2 py-0.5 sm:py-1 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                    ≈ {formatCurrency(wallet.balance * (prices[wallet.currency_code || ""] || 0), currency)}
                                                </span>
                                            </div>
                                        ) : (
                                            formatCurrency(wallet.balance, wallet.currency_code || "USD")
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                    <div className="flex-1 min-w-0">
                                        {wallet.lastTx && (
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-1.5 rounded-xl transition-colors duration-500",
                                                    wallet.lastTx.type === "income"
                                                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 group-hover:bg-emerald-100/50"
                                                        : "bg-rose-50 text-rose-500 dark:bg-rose-500/10 group-hover:bg-rose-100/50"
                                                )}>
                                                    {wallet.lastTx.type === "income" ? (
                                                        <ArrowDownLeft className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                        Recent · {wallet.lastTx.date ? formatDateShort(wallet.lastTx.date) : ""}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                                                        {wallet.lastTx.merchant_name || "Transaction"}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {wallet.sparkline.length >= 2 && (
                                        <div className="pl-4">
                                            <MiniSparkline data={wallet.sparkline} color={wallet.color || "#7c3aed"} />
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
            <ResponsiveModal
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                title={editWallet ? "Edit Wallet" : "Create Wallet"}
                footer={
                    <>
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
                        <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            className="border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !name.trim()}
                            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editWallet ? "Update" : "Create"}
                        </Button>
                    </>
                }
            >
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
                            <Select value={type} onValueChange={(val) => {
                                setType(val);
                                if (val === "crypto") setWalletCurrency("bitcoin");
                                else setWalletCurrency(currency || "USD");
                            }}>
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
                            <Label className="text-slate-600">{type === "crypto" ? "Crypto Coin" : "Currency"}</Label>
                            <Select value={walletCurrency} onValueChange={setWalletCurrency}>
                                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                                    {type === "crypto" ? (
                                        SUPPORTED_CRYPTOS.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name} ({c.symbol})</SelectItem>
                                        ))
                                    ) : (
                                        <>
                                            <SelectItem value="USD">USD ($)</SelectItem>
                                            <SelectItem value="EUR">EUR (€)</SelectItem>
                                            <SelectItem value="GBP">GBP (£)</SelectItem>
                                            <SelectItem value="MYR">MYR (RM)</SelectItem>
                                            <SelectItem value="SGD">SGD (S$)</SelectItem>
                                            <SelectItem value="JPY">JPY (¥)</SelectItem>
                                        </>
                                    )}
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
            </ResponsiveModal>

        </div>
    );
}
