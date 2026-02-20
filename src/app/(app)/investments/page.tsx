"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRightLeft, TrendingUp, Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useCurrency } from "@/contexts/currency-context";
import { useCryptoPrices } from "@/hooks/use-crypto-prices";
import { usePrivacy } from "@/contexts/privacy-context";
import { SUPPORTED_CRYPTOS } from "@/lib/crypto";
import type { Wallet, TransactionWithCategory } from "@/types/database";
import { formatCurrency, cn } from "@/lib/utils";

type WalletWithBalance = Wallet & { balance: number };

export default function InvestmentsPage() {
    const supabase = createClient();
    const { currency } = useCurrency();
    const { isPrivacyMode } = usePrivacy();

    const [wallets, setWallets] = useState<WalletWithBalance[]>([]);
    const [cryptoWallets, setCryptoWallets] = useState<WalletWithBalance[]>([]);
    const [fiatWallets, setFiatWallets] = useState<WalletWithBalance[]>([]);
    const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const { prices } = useCryptoPrices(cryptoWallets, currency || "USD");

    // Trade Modal State
    const [tradeOpen, setTradeOpen] = useState(false);
    const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
    const [fiatWalletId, setFiatWalletId] = useState("");
    const [cryptoWalletId, setCryptoWalletId] = useState("");
    const [fiatAmount, setFiatAmount] = useState("");
    const [cryptoAmount, setCryptoAmount] = useState("");
    const [tradeDate, setTradeDate] = useState(new Date().toISOString().split("T")[0]);
    const [tradeNote, setTradeNote] = useState("");
    const [tradeSaving, setTradeSaving] = useState(false);

    // Set Balance Modal State
    const [balanceOpen, setBalanceOpen] = useState(false);
    const [balanceWalletId, setBalanceWalletId] = useState("");
    const [newBalanceAmount, setNewBalanceAmount] = useState("");
    const [balanceSaving, setBalanceSaving] = useState(false);

    useEffect(() => {
        if (!tradeOpen) return;
        if (fiatWallets.length > 0 && !fiatWalletId) setFiatWalletId(fiatWallets[0].id);
        if (cryptoWallets.length > 0 && !cryptoWalletId) setCryptoWalletId(cryptoWallets[0].id);
    }, [tradeOpen, fiatWallets, cryptoWallets, fiatWalletId, cryptoWalletId]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [{ data: txData }, { data: walletData }, { data: allTxsData }] = await Promise.all([
            supabase.from("transactions").select("*, categories(*), wallets!inner(*)").eq("wallets.type", "crypto").order("date", { ascending: false }).limit(50),
            supabase.from("wallets").select("*"),
            supabase.from("transactions").select("wallet_id, amount, type")
        ]);

        const txArr = (txData || []) as TransactionWithCategory[];
        const allTxs = allTxsData || [];

        const wArr: WalletWithBalance[] = (walletData || []).map(w => {
            const txs = allTxs.filter(t => t.wallet_id === w.id);
            const balance = txs.reduce((sum, t) => t.type === "income" ? sum + Number(t.amount) : sum - Number(t.amount), 0);
            return { ...w, balance };
        });

        setTransactions(txArr);
        setWallets(wArr);
        setCryptoWallets(wArr.filter(w => w.type === "crypto"));
        setFiatWallets(wArr.filter(w => w.type !== "crypto"));
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalCryptoValue = useMemo(() => {
        return cryptoWallets.reduce((sum, w) => {
            const price = prices[w.currency_code || ""] || 0;
            return sum + (w.balance * price);
        }, 0);
    }, [cryptoWallets, prices]);

    const maskValue = (value: string | number, isCurrency = true) => {
        if (isPrivacyMode) return "••••••";
        return isCurrency ? formatCurrency(Number(value), currency) : String(value);
    };

    const handleTradeSubmit = async () => {
        if (!fiatWalletId || !cryptoWalletId || !fiatAmount || !cryptoAmount) {
            toast.error("Please fill in all required fields");
            return;
        }

        setTradeSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const fiatNum = parseFloat(fiatAmount);
        const cryptoNum = parseFloat(cryptoAmount);
        const tradeRef = `trade:${crypto.randomUUID().slice(0, 8)}`;

        const fiatWallet = fiatWallets.find(w => w.id === fiatWalletId);
        const cryptoWallet = cryptoWallets.find(w => w.id === cryptoWalletId);
        const cryptoSymbol = SUPPORTED_CRYPTOS.find(c => c.id === cryptoWallet?.currency_code)?.symbol || cryptoWallet?.currency_code;

        if (tradeType === "buy") {
            const { error: fiatError } = await supabase.from("transactions").insert({
                user_id: user?.id,
                wallet_id: fiatWalletId,
                amount: fiatNum,
                type: "expense",
                date: tradeDate,
                note: `Bought ${cryptoNum} ${cryptoSymbol} - ${tradeNote} (${tradeRef})`,
            });
            const { error: cryptoError } = await supabase.from("transactions").insert({
                user_id: user?.id,
                wallet_id: cryptoWalletId,
                amount: cryptoNum,
                type: "income",
                date: tradeDate,
                note: `Spent ${fiatNum} ${fiatWallet?.currency_code} - ${tradeNote} (${tradeRef})`,
            });

            if (fiatError || cryptoError) toast.error("Failed to record trade.");
            else toast.success("Bought Crypto successfully.");
        } else {
            const { error: cryptoError } = await supabase.from("transactions").insert({
                user_id: user?.id,
                wallet_id: cryptoWalletId,
                amount: cryptoNum,
                type: "expense",
                date: tradeDate,
                note: `Sold ${cryptoNum} ${cryptoSymbol} - ${tradeNote} (${tradeRef})`,
            });
            const { error: fiatError } = await supabase.from("transactions").insert({
                user_id: user?.id,
                wallet_id: fiatWalletId,
                amount: fiatNum,
                type: "income",
                date: tradeDate,
                note: `Received ${fiatNum} ${fiatWallet?.currency_code} - ${tradeNote} (${tradeRef})`,
            });

            if (fiatError || cryptoError) toast.error("Failed to record trade.");
            else toast.success("Sold Crypto successfully.");
        }

        setTradeSaving(false);
        setTradeOpen(false);
        setFiatAmount("");
        setCryptoAmount("");
        setTradeNote("");
        fetchData();
    };

    const handleBalanceSubmit = async () => {
        if (!balanceWalletId || !newBalanceAmount) {
            toast.error("Please fill in all required fields");
            return;
        }

        setBalanceSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const targetBalance = parseFloat(newBalanceAmount);

        const cryptoWallet = cryptoWallets.find(w => w.id === balanceWalletId);
        if (!cryptoWallet) return;

        const difference = targetBalance - cryptoWallet.balance;

        if (difference === 0) {
            toast.success("Balance is already accurate.");
            setBalanceOpen(false);
            setBalanceSaving(false);
            return;
        }

        const type = difference > 0 ? "income" : "expense";
        const absDifference = Math.abs(difference);
        const cryptoSymbol = SUPPORTED_CRYPTOS.find(c => c.id === cryptoWallet.currency_code)?.symbol || cryptoWallet.currency_code;

        const { error } = await supabase.from("transactions").insert({
            user_id: user?.id,
            wallet_id: balanceWalletId,
            amount: absDifference,
            type: type,
            date: new Date().toISOString().split("T")[0],
            note: `System Adjustment: Set balance directly to ${targetBalance} ${cryptoSymbol}`,
        });

        if (error) {
            toast.error("Failed to update balance.");
        } else {
            toast.success("Balance updated successfully.");
            setBalanceOpen(false);
            setNewBalanceAmount("");
            fetchData();
        }
        setBalanceSaving(false);
    };

    if (loading) return <div className="p-8"><div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>;

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                        Investments
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Track and trade your cryptocurrency portfolio
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => { setTradeType("buy"); setTradeOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-28 rounded-xl shadow-lg shadow-emerald-600/20">
                        <ArrowDownToLine className="w-4 h-4 mr-2" /> Buy
                    </Button>
                    <Button onClick={() => { setTradeType("sell"); setTradeOpen(true); }} className="bg-rose-600 hover:bg-rose-700 text-white min-w-28 rounded-xl shadow-lg shadow-rose-600/20">
                        <ArrowUpFromLine className="w-4 h-4 mr-2" /> Sell
                    </Button>
                </div>
            </div>

            {/* Overview Card */}
            <Card className="bg-gradient-to-br from-violet-600 to-indigo-700 overflow-hidden relative border-0 shadow-xl shadow-violet-500/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/3" />
                <CardContent className="p-6 relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <p className="text-violet-100 font-medium mb-1 flex items-center gap-2">
                            Total Investment Value
                        </p>
                        <h2 className="text-4xl font-extrabold text-white tracking-tight">
                            {maskValue(totalCryptoValue)}
                        </h2>
                    </div>
                </CardContent>
            </Card>

            {/* Crypto Wallets Grid */}
            <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-4">Crypto Holdings</h3>
                {cryptoWallets.length === 0 ? (
                    <div className="text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
                        No crypto wallets found. Please create one on the Wallets page to start trading.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cryptoWallets.map(wallet => {
                            const price = prices[wallet.currency_code || ""] || 0;
                            const fiatVal = wallet.balance * price;
                            const symbol = SUPPORTED_CRYPTOS.find(c => c.id === wallet.currency_code)?.symbol || wallet.currency_code;
                            return (
                                <Card key={wallet.id} className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                                    <div className="p-5 flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: `${wallet.color}15`, color: wallet.color || "#7c3aed" }}>
                                            {wallet.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 capitalize">{wallet.name}</p>
                                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                                                {isPrivacyMode ? "••••••" : `${wallet.balance} ${symbol}`}
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1 mb-3">≈ {maskValue(fiatVal)}</p>
                                            <Button
                                                variant="outline"
                                                className="w-full text-xs h-8 border-slate-200 dark:border-slate-700"
                                                onClick={() => {
                                                    setBalanceWalletId(wallet.id);
                                                    setNewBalanceAmount(wallet.balance.toString());
                                                    setBalanceOpen(true);
                                                }}
                                            >
                                                Adjust Balance
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Recent Crypto Transactions */}
            <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-4">Recent Trades</h3>
                <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
                    {transactions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No recent trades found.</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {transactions.map(tx => (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
                                            tx.type === "income" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20" : "bg-rose-100 text-rose-600 dark:bg-rose-500/20"
                                        )}>
                                            {tx.type === "income" ? <ArrowDownToLine className="w-5 h-5" /> : <ArrowUpFromLine className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs cursor-default" title={tx.note || "Trade"}>
                                                {tx.note || (tx.type === "income" ? "Bought Crypto" : "Sold Crypto")}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(tx.date || "").toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            "text-sm font-bold",
                                            tx.type === "income" ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {tx.type === "income" ? "+" : "-"}{tx.amount}
                                        </p>
                                        <p className="text-[10px] text-slate-400">Tokens</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Trade Modal */}
            <Dialog open={tradeOpen} onOpenChange={setTradeOpen}>
                <DialogContent className="sm:max-w-[450px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            {tradeType === "buy" ? <ArrowDownToLine className="text-emerald-500 w-5 h-5" /> : <ArrowUpFromLine className="text-rose-500 w-5 h-5" />}
                            {tradeType === "buy" ? "Buy Crypto" : "Sell Crypto"}
                        </DialogTitle>
                        <DialogDescription>
                            Record a {tradeType} transaction between your fiat and crypto wallets.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{tradeType === "buy" ? "From (Fiat Account)" : "Deposit To (Fiat)"}</Label>
                                <Select value={fiatWalletId} onValueChange={setFiatWalletId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Fiat Wallet" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fiatWallets.map(w => (
                                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{tradeType === "buy" ? "Fiat Amount Spent" : "Fiat Received"}</Label>
                                <Input type="number" step="0.01" value={fiatAmount} onChange={(e) => setFiatAmount(e.target.value)} placeholder="0.00" />
                            </div>
                        </div>

                        <div className="flex justify-center -my-2 opacity-50"><ArrowRightLeft className="w-5 h-5" /></div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{tradeType === "buy" ? "To (Crypto Account)" : "Withdraw Crypto From"}</Label>
                                <Select value={cryptoWalletId} onValueChange={setCryptoWalletId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Crypto Wallet" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cryptoWallets.map(w => (
                                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{tradeType === "buy" ? "Crypto Received" : "Crypto Amount Sold"}</Label>
                                <Input type="number" step="any" value={cryptoAmount} onChange={(e) => setCryptoAmount(e.target.value)} placeholder="0.00" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Note (Optional)</Label>
                            <Input placeholder="e.g. Bought via Coinbase" value={tradeNote} onChange={(e) => setTradeNote(e.target.value)} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTradeOpen(false)}>Cancel</Button>
                        <Button onClick={handleTradeSubmit} disabled={tradeSaving || !fiatWalletId || !cryptoWalletId || !fiatAmount || !cryptoAmount} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                            {tradeSaving ? "Saving..." : "Confirm Trade"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Adjust Balance Modal */}
            <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Adjust Crypto Balance</DialogTitle>
                        <DialogDescription>
                            Directly set the true token balance for this wallet. This will create an adjustment transaction to correct the amount.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>New Token Balance</Label>
                            <Input
                                type="number"
                                step="any"
                                value={newBalanceAmount}
                                onChange={(e) => setNewBalanceAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBalanceOpen(false)}>Cancel</Button>
                        <Button onClick={handleBalanceSubmit} disabled={balanceSaving || !newBalanceAmount} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                            {balanceSaving ? "Saving..." : "Update Balance"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
