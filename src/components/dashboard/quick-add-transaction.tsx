"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrency } from "@/contexts/currency-context";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Delete, ChevronRight, Check, Wallet, CalendarDays } from "lucide-react";
import type { Category, Wallet as WalletType } from "@/types/database";

interface QuickAddTransactionProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    wallets: (WalletType & { balance: number })[];
    categories: Category[];
    onSuccess: () => void;
}

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"] as const;

function formatDateLabel(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() === today.getTime()) return "Today";
    if (target.getTime() === yesterday.getTime()) return "Yesterday";
    return target.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function QuickAddTransaction({
    open,
    onOpenChange,
    wallets,
    categories,
    onSuccess,
}: QuickAddTransactionProps) {
    const router = useRouter();
    const supabase = createClient();
    const { currency } = useCurrency();

    const [type, setType] = useState<"expense" | "income">("expense");
    const [amountString, setAmountString] = useState("0");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [saving, setSaving] = useState(false);
    const [walletPickerOpen, setWalletPickerOpen] = useState(false);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [categoryMissing, setCategoryMissing] = useState(false);

    // Auto-select first wallet if none selected
    const activeWalletId = selectedWalletId || wallets[0]?.id || null;
    const activeWallet = wallets.find((w) => w.id === activeWalletId);

    const filteredCategories = useMemo(
        () => categories.filter((c) => c.type === type),
        [categories, type]
    );

    const amountNumber = parseFloat(amountString) || 0;

    const handleNumpadPress = (key: string) => {
        setCategoryMissing(false);

        if (key === "⌫") {
            setAmountString((prev) => {
                if (prev.length <= 1) return "0";
                return prev.slice(0, -1);
            });
            return;
        }

        if (key === ".") {
            setAmountString((prev) => {
                if (prev.includes(".")) return prev;
                return prev + ".";
            });
            return;
        }

        setAmountString((prev) => {
            // Enforce max 2 decimal places
            if (prev.includes(".")) {
                const [, decimal] = prev.split(".");
                if (decimal && decimal.length >= 2) return prev;
            }
            // Enforce max amount
            const next = prev === "0" ? key : prev + key;
            if (parseFloat(next) > 999999999.99) return prev;
            return next;
        });
    };

    const handleSave = async () => {
        if (amountNumber <= 0) {
            toast.error("Enter an amount");
            return;
        }
        if (!selectedCategoryId) {
            setCategoryMissing(true);
            toast.error("Select a category");
            return;
        }
        if (!activeWalletId) {
            toast.error("No wallet available");
            return;
        }

        setSaving(true);

        const dateStr = selectedDate.toISOString().split("T")[0];

        const { error } = await supabase.from("transactions").insert({
            amount: amountNumber,
            type,
            category_id: selectedCategoryId,
            wallet_id: activeWalletId,
            date: dateStr,
        });

        setSaving(false);

        if (error) {
            toast.error("Failed to save transaction");
            return;
        }

        const cat = categories.find((c) => c.id === selectedCategoryId);
        toast.success(
            `${type === "income" ? "+" : "-"}${formatCurrency(amountNumber, currency)} — ${cat?.name || "Transaction"} saved`
        );

        // Reset form
        setAmountString("0");
        setSelectedCategoryId(null);
        setType("expense");
        setSelectedDate(new Date());
        onOpenChange(false);
        onSuccess();
    };

    const handleMoreDetails = () => {
        const params = new URLSearchParams();
        params.set("new", "true");
        params.set("type", type);
        if (amountNumber > 0) params.set("amount", String(amountNumber));
        if (selectedCategoryId) params.set("category", selectedCategoryId);
        if (activeWalletId) params.set("wallet", activeWalletId);
        onOpenChange(false);
        router.push(`/transactions?${params.toString()}`);
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            // Reset on close
            setAmountString("0");
            setSelectedCategoryId(null);
            setCategoryMissing(false);
            setType("expense");
            setSelectedDate(new Date());
        }
        onOpenChange(nextOpen);
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent
                side="bottom"
                showCloseButton={false}
                className="rounded-t-3xl px-4 pb-8 pt-3 max-h-[92vh] overflow-y-auto"
            >
                <SheetDescription className="sr-only">Quick add a new transaction</SheetDescription>

                {/* Drag Handle */}
                <div className="flex justify-center mb-2">
                    <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <SheetTitle className="text-base font-bold text-slate-900 dark:text-white">
                        Quick Add
                    </SheetTitle>
                </div>

                {/* Type Toggle */}
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
                    <button
                        onClick={() => {
                            setType("expense");
                            setSelectedCategoryId(null);
                        }}
                        className={cn(
                            "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                            type === "expense"
                                ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm"
                                : "text-slate-500 dark:text-slate-400"
                        )}
                    >
                        Expense
                    </button>
                    <button
                        onClick={() => {
                            setType("income");
                            setSelectedCategoryId(null);
                        }}
                        className={cn(
                            "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                            type === "income"
                                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                : "text-slate-500 dark:text-slate-400"
                        )}
                    >
                        Income
                    </button>
                </div>

                {/* Amount Display */}
                <div className="text-center mb-4">
                    <p
                        className={cn(
                            "text-4xl font-black tabular-nums tracking-tight",
                            type === "expense"
                                ? "text-slate-900 dark:text-white"
                                : "text-emerald-600 dark:text-emerald-400"
                        )}
                    >
                        {formatCurrency(amountNumber, currency)}
                    </p>
                </div>

                {/* Custom Numpad */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {NUMPAD_KEYS.map((key) => (
                        <button
                            key={key}
                            onClick={() => handleNumpadPress(key)}
                            className={cn(
                                "min-h-12 rounded-xl text-lg font-semibold transition-all active:scale-95",
                                key === "⌫"
                                    ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 active:bg-slate-200 dark:active:bg-slate-700"
                            )}
                        >
                            {key === "⌫" ? <Delete className="w-5 h-5 mx-auto" /> : key}
                        </button>
                    ))}
                </div>

                {/* Category Grid */}
                <div className="mb-4">
                    <p className={cn(
                        "text-[11px] font-semibold uppercase tracking-wider mb-2",
                        categoryMissing ? "text-rose-500" : "text-slate-400"
                    )}>
                        Category {categoryMissing && "— required"}
                    </p>
                    <div className="grid grid-cols-4 gap-2 max-h-[120px] overflow-y-auto">
                        {filteredCategories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    setSelectedCategoryId(cat.id);
                                    setCategoryMissing(false);
                                }}
                                className={cn(
                                    "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                                    selectedCategoryId === cat.id
                                        ? "bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-500"
                                        : "bg-slate-50 dark:bg-slate-800 border-2 border-transparent"
                                )}
                            >
                                <span className="text-xl">{cat.icon || "📦"}</span>
                                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate w-full text-center leading-tight">
                                    {cat.name}
                                </span>
                            </button>
                        ))}
                        {filteredCategories.length === 0 && (
                            <p className="col-span-4 text-center text-xs text-slate-400 py-4">
                                No {type} categories found
                            </p>
                        )}
                    </div>
                </div>

                {/* Smart Defaults Bar */}
                <div className="flex gap-2 mb-4">
                    {/* Wallet Selector */}
                    <Popover open={walletPickerOpen} onOpenChange={setWalletPickerOpen}>
                        <PopoverTrigger asChild>
                            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 flex-1 min-w-0 truncate">
                                <Wallet className="w-4 h-4 text-violet-500 shrink-0" />
                                <span className="truncate">{activeWallet?.name || "Wallet"}</span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-1" align="start">
                            {wallets.map((w) => (
                                <button
                                    key={w.id}
                                    onClick={() => {
                                        setSelectedWalletId(w.id);
                                        setWalletPickerOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                                        w.id === activeWalletId
                                            ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    )}
                                >
                                    <span>{w.icon || "💵"}</span>
                                    <span className="flex-1 truncate">{w.name}</span>
                                    {w.id === activeWalletId && <Check className="w-4 h-4 text-violet-500" />}
                                </button>
                            ))}
                        </PopoverContent>
                    </Popover>

                    {/* Date Selector */}
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger asChild>
                            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">
                                <CalendarDays className="w-4 h-4 text-violet-500" />
                                <span>{formatDateLabel(selectedDate)}</span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2" align="end">
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => {
                                        setSelectedDate(new Date());
                                        setDatePickerOpen(false);
                                    }}
                                    className={cn(
                                        "px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors",
                                        formatDateLabel(selectedDate) === "Today"
                                            ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
                                            : "hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => {
                                        const y = new Date();
                                        y.setDate(y.getDate() - 1);
                                        setSelectedDate(y);
                                        setDatePickerOpen(false);
                                    }}
                                    className={cn(
                                        "px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors",
                                        formatDateLabel(selectedDate) === "Yesterday"
                                            ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
                                            : "hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                >
                                    Yesterday
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                <label className="px-3 py-2 text-sm font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left">
                                    Pick date...
                                    <input
                                        type="date"
                                        className="sr-only"
                                        max={new Date().toISOString().split("T")[0]}
                                        value={selectedDate.toISOString().split("T")[0]}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                setSelectedDate(new Date(e.target.value + "T12:00:00"));
                                                setDatePickerOpen(false);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Action Row */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleMoreDetails}
                        className="text-sm font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1 hover:underline"
                    >
                        More details
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 bg-gradient-to-r from-violet-500 to-violet-700 hover:from-violet-600 hover:to-violet-800 text-white font-semibold rounded-xl h-12"
                    >
                        {saving ? "Saving..." : "Save"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
