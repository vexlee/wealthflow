"use client";

import { useState, useMemo } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/currency-context";
import { Wallet, RecurringTransaction } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format, addMonths } from "date-fns";
import { CreditCard, Wallet as WalletIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface RecurringExpensesCardViewProps {
    wallets: Wallet[];
    recurringTransactions: any[];
    actualTransactions: any[];
    currentMonth: Date;
    onTransactionPaid: () => void;
}

export function RecurringExpensesCardView({
    wallets,
    recurringTransactions,
    actualTransactions,
    currentMonth,
    onTransactionPaid,
}: RecurringExpensesCardViewProps) {
    const { currency } = useCurrency();
    const supabase = createClient();

    const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter recurring expenses and calculate remaining balances
    const recurringData = useMemo(() => {
        const walletTotals: Record<string, number> = {};
        const walletRecurringTxs: Record<string, any[]> = {};

        // Only look at current or past months if projected, but user wants to see current month unpaid things.
        const today = new Date();
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // If viewing a future month, maybe not show due yet? We'll show it for the viewed month.

        recurringTransactions.forEach((recur) => {
            if (recur.type !== "expense") return;

            const recurWalletId = recur.wallet_id;
            if (!recurWalletId) return;

            const nextRunDate = new Date(recur.next_run_date);
            const nextRunMonthValue = nextRunDate.getFullYear() * 12 + nextRunDate.getMonth();
            const targetMonthValue = year * 12 + month;

            let remainingBalance = Number(recur.amount);

            if (nextRunMonthValue > targetMonthValue) {
                // Advanced past the target month -> paid
                remainingBalance = 0;
            } else {
                // If not advanced, subtract any payments made specifically to this recurring ID *in this viewed month*
                // This covers partial payments that haven't advanced the next_run_date yet
                const paidAmountThisMonth = actualTransactions
                    .filter(tx => tx.recurring_id === recur.id && tx.type === "expense")
                    .reduce((sum, tx) => sum + Number(tx.amount), 0);
                remainingBalance -= paidAmountThisMonth;
            }

            if (!walletTotals[recurWalletId]) {
                walletTotals[recurWalletId] = 0;
                walletRecurringTxs[recurWalletId] = [];
            }

            if (remainingBalance > 0.01) {
                walletTotals[recurWalletId] += remainingBalance;
            }

            // Always add to the list so users can see paid items
            walletRecurringTxs[recurWalletId].push({
                ...recur,
                remainingBalance: Math.max(0, remainingBalance),
                paymentAmount: remainingBalance > 0 ? remainingBalance.toString() : "0.00",
                sourceWalletId: recurWalletId,
                selected: remainingBalance <= 0.01,
                isPaid: remainingBalance <= 0.01,
            });
        });

        return { walletTotals, walletRecurringTxs };
    }, [recurringTransactions, actualTransactions, currentMonth]);

    // Active items in modal
    const [modalItems, setModalItems] = useState<any[]>([]);

    const handleCardClick = (walletId: string) => {
        setSelectedWalletId(walletId);
        // Deep copy the items so we can edit them
        setModalItems(JSON.parse(JSON.stringify(recurringData.walletRecurringTxs[walletId])));
        setIsModalOpen(true);
    };

    const updateModalItem = (index: number, field: string, value: any) => {
        const newItems = [...modalItems];
        newItems[index][field] = value;
        setModalItems(newItems);
    };

    const handleConfirmPayment = async () => {
        const selectedItems = modalItems.filter(item => item.selected && !item.isPaid);
        if (selectedItems.length === 0) {
            toast.error("Please select at least one transaction to pay");
            return;
        }

        setIsSubmitting(true);
        try {
            const todayStr = format(new Date(), "yyyy-MM-dd");
            const nextMonth = addMonths(currentMonth, 1);
            const nextMonthStr = format(nextMonth, "yyyy-MM-dd");

            for (const item of selectedItems) {
                const payAmount = parseFloat(item.paymentAmount);
                if (isNaN(payAmount) || payAmount <= 0) {
                    toast.error(`Invalid payment amount for ${item.merchant_name || 'transaction'}`);
                    setIsSubmitting(false);
                    return;
                }

                if (payAmount > item.remainingBalance + 0.01) {
                    toast.error(`Payment amount exceeds remaining balance for ${item.merchant_name || 'transaction'}`);
                    setIsSubmitting(false);
                    return;
                }

                // 1. Create the Transaction
                const { error: txError } = await supabase.from("transactions").insert({
                    amount: payAmount,
                    type: "expense",
                    date: todayStr,
                    wallet_id: item.sourceWalletId,
                    category_id: item.category_id,
                    merchant_name: item.merchant_name,
                    recurring_id: item.id,
                    status: "posted",
                    user_id: item.user_id,
                    note: "Paid recurring expense",
                });

                if (txError) throw txError;

                // Advance next_run_date for the recurring transaction
                const currentNextRun = new Date(item.next_run_date);
                const newNextRun = addMonths(currentNextRun, 1);

                const updates: any = {
                    next_run_date: format(newNextRun, "yyyy-MM-dd"),
                };
                if (item.total_instalments !== null) {
                    updates.instalments_paid = item.instalments_paid + 1;
                    if (updates.instalments_paid >= item.total_instalments) {
                        updates.is_active = false;
                    }
                }

                const { error: recurUpdateError } = await supabase
                    .from("recurring_transactions")
                    .update(updates)
                    .eq("id", item.id);

                if (recurUpdateError) throw recurUpdateError;

                // 2. Handle carry forward if amount is less than remaining balance
                const carryForwardBalance = item.remainingBalance - payAmount;
                if (carryForwardBalance > 0.01) {
                    // Create a one-off recurring transaction for next month
                    const { error: recurError } = await supabase.from("recurring_transactions").insert({
                        amount: carryForwardBalance,
                        type: "expense",
                        wallet_id: item.wallet_id, // original wallet
                        category_id: item.category_id,
                        merchant_name: `${item.merchant_name || 'Recurring'} (Carried Forward)`,
                        user_id: item.user_id,
                        day_of_month: Math.min(item.day_of_month, 28),
                        next_run_date: nextMonthStr,
                        total_instalments: 1,
                        instalments_paid: 0,
                        is_active: true,
                        note: "Carried forward balance",
                    });

                    if (recurError) throw recurError;
                }
            }

            toast.success("Payments confirmed");
            setIsModalOpen(false);
            onTransactionPaid();
        } catch (error: any) {
            console.error("Payment error:", error);
            toast.error(error.message || "Failed to process payments");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show wallets that have overdue amounts
    const activeWallets = wallets
        .filter(wallet => recurringData.walletRecurringTxs[wallet.id] && recurringData.walletRecurringTxs[wallet.id].length > 0)
        .map(wallet => ({
            ...wallet,
            totalDue: recurringData.walletTotals[wallet.id] || 0
        }))
        .filter(wallet => wallet.totalDue > 0);

    if (activeWallets.length === 0) return null;

    return (
        <div className="space-y-4 sm:space-y-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight px-2 sm:px-0">
                Recurring Expenses Due
            </h2>
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:snap-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {activeWallets.map(wallet => (
                    <button
                        key={wallet.id}
                        onClick={() => handleCardClick(wallet.id)}
                        className={cn(
                            "w-[260px] sm:w-auto shrink-0 snap-start sm:snap-none bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-xl transition-all duration-300 text-left group relative overflow-hidden flex flex-col items-start",
                            wallet.totalDue > 0
                                ? "border-slate-200/80 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/50"
                                : "border-emerald-200/50 dark:border-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-800/50"
                        )}
                    >
                        <div className={cn(
                            "absolute top-0 right-0 w-24 h-24 bg-gradient-to-br to-transparent opacity-50 pointer-events-none transition-opacity group-hover:opacity-100",
                            wallet.totalDue > 0 ? "from-rose-50 dark:from-rose-900/10" : "from-emerald-50 dark:from-emerald-900/10"
                        )} />

                        <div className="flex items-center gap-3 w-full mb-4 relative z-10">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-xl sm:text-2xl group-hover:scale-110 transition-transform duration-300 shrink-0">
                                {wallet.icon || "💳"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">{wallet.name}</h3>
                                <p className="text-[10px] sm:text-xs font-medium text-slate-500 truncate">{recurringData.walletRecurringTxs[wallet.id]?.length || 0} transactions {wallet.totalDue > 0 ? "due" : "tracked"}</p>
                            </div>
                        </div>

                        <div className="mt-auto w-full relative z-10">
                            <p className={cn("text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1", wallet.totalDue > 0 ? "text-rose-500" : "text-emerald-500")}>
                                {wallet.totalDue > 0 ? "Total Due" : "All Paid"}
                            </p>
                            <p className={cn("text-lg sm:text-2xl font-black tabular-nums truncate", wallet.totalDue > 0 ? "text-rose-600 dark:text-rose-500" : "text-emerald-600 dark:text-emerald-500")}>
                                {wallet.totalDue > 0 ? `-${formatCurrency(wallet.totalDue, currency)}` : formatCurrency(0, currency)}
                            </p>
                        </div>
                    </button>
                ))}
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-0 shadow-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                        <DialogTitle className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                            Pay Recurring Expenses
                        </DialogTitle>
                        <p className="text-sm font-medium text-slate-500 mt-2">
                            Select the transactions you want to pay. Unpaid balances will carry forward to next month.
                        </p>
                    </div>

                    <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                        {modalItems.map((item, index) => (
                            <div key={item.id} className={cn("p-4 rounded-2xl border bg-slate-50/50 dark:bg-slate-800/20 space-y-3", item.isPaid ? "opacity-60 border-indigo-100 dark:border-indigo-900/30" : "border-slate-100 dark:border-slate-800")}>
                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id={`check-${item.id}`}
                                        checked={item.selected}
                                        onCheckedChange={(checked) => updateModalItem(index, 'selected', checked === true)}
                                        disabled={item.isPaid}
                                        className={cn("mt-1", item.isPaid && "opacity-100 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600")}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <label htmlFor={`check-${item.id}`} className={cn("text-sm font-bold block", item.isPaid ? "text-slate-500 cursor-default line-through" : "text-slate-900 dark:text-white cursor-pointer")}>
                                            {item.merchant_name || item.categories?.name || 'Recurring Transaction'}
                                        </label>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                                            {item.isPaid ? "Paid in full" : `Remaining: ${formatCurrency(item.remainingBalance, currency)}`}
                                        </p>
                                    </div>
                                </div>

                                {item.selected && !item.isPaid && (
                                    <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment Amount</label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                max={item.remainingBalance}
                                                value={item.paymentAmount}
                                                onChange={(e) => updateModalItem(index, 'paymentAmount', e.target.value)}
                                                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 font-medium h-9"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Source Account</label>
                                            <Select
                                                value={item.sourceWalletId}
                                                onValueChange={(val) => updateModalItem(index, 'sourceWalletId', val)}
                                            >
                                                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9 font-medium">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {wallets.map(w => (
                                                        <SelectItem key={w.id} value={w.id}>
                                                            <div className="flex items-center gap-2">
                                                                <span>{w.icon || "💳"}</span>
                                                                <span>{w.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsModalOpen(false)}
                            className="font-bold rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmPayment}
                            disabled={!modalItems.some(i => i.selected && !i.isPaid) || isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30"
                        >
                            {isSubmitting ? "Processing..." : "Confirm Payment"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
