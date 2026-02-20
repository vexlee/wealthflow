"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, TrendingUp, TrendingDown, ArrowLeftRight, PiggyBank, Settings2 } from "lucide-react";
import type { Wallet as WalletType } from "@/types/database";

export interface DashboardMetricsConfig {
    visibleCards: {
        netWorth: boolean;
        income: boolean;
        expenses: boolean;
        balance: boolean;
        dailyBudget: boolean;
    };
    incomeWalletIds: string[]; // empty means all
    expenseWalletIds: string[]; // empty means all
}

export const DEFAULT_METRICS_CONFIG: DashboardMetricsConfig = {
    visibleCards: {
        netWorth: true,
        income: true,
        expenses: true,
        balance: true,
        dailyBudget: true,
    },
    incomeWalletIds: [],
    expenseWalletIds: [],
};

interface MetricsSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    config: DashboardMetricsConfig;
    onSave: (config: DashboardMetricsConfig) => void;
    wallets: WalletType[];
}

export function MetricsSettingsModal({ open, onOpenChange, config, onSave, wallets }: MetricsSettingsModalProps) {
    const [localConfig, setLocalConfig] = useState<DashboardMetricsConfig>(DEFAULT_METRICS_CONFIG);

    useEffect(() => {
        if (open) {
            setLocalConfig({ ...config });
        }
    }, [open, config]);

    const handleToggleCard = (card: keyof DashboardMetricsConfig["visibleCards"]) => {
        setLocalConfig((prev) => ({
            ...prev,
            visibleCards: {
                ...prev.visibleCards,
                [card]: !prev.visibleCards[card],
            },
        }));
    };

    const handleToggleWallet = (type: "incomeWalletIds" | "expenseWalletIds", walletId: string) => {
        setLocalConfig((prev) => {
            const currentIds = prev[type];
            if (currentIds.includes(walletId)) {
                return { ...prev, [type]: currentIds.filter((id) => id !== walletId) };
            } else {
                return { ...prev, [type]: [...currentIds, walletId] };
            }
        });
    };

    const handleSelectAllWallets = (type: "incomeWalletIds" | "expenseWalletIds") => {
        setLocalConfig((prev) => ({ ...prev, [type]: [] })); // empty array means all wallets
    };

    const handleSave = () => {
        onSave(localConfig);
        onOpenChange(false);
    };

    const handleReset = () => {
        setLocalConfig({ ...DEFAULT_METRICS_CONFIG });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Metrics Settings</DialogTitle>
                    <DialogDescription>
                        Customize which stat cards are visible and filter the data sources used for calculations.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Visible Cards Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Visible Cards</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-violet-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Net Worth</span>
                                </div>
                                <Switch
                                    checked={localConfig.visibleCards.netWorth}
                                    onCheckedChange={() => handleToggleCard("netWorth")}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Monthly Income</span>
                                </div>
                                <Switch
                                    checked={localConfig.visibleCards.income}
                                    onCheckedChange={() => handleToggleCard("income")}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Monthly Expenses</span>
                                </div>
                                <Switch
                                    checked={localConfig.visibleCards.expenses}
                                    onCheckedChange={() => handleToggleCard("expenses")}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Monthly Balance</span>
                                </div>
                                <Switch
                                    checked={localConfig.visibleCards.balance}
                                    onCheckedChange={() => handleToggleCard("balance")}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <PiggyBank className="w-4 h-4 text-amber-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Daily Budget</span>
                                </div>
                                <Switch
                                    checked={localConfig.visibleCards.dailyBudget}
                                    onCheckedChange={() => handleToggleCard("dailyBudget")}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Income Data Sources */}
                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Income Sources</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                            Select which wallets contribute to your Monthly Income calculation.
                        </p>
                        <div className="space-y-3 pl-2">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="income-all"
                                    checked={localConfig.incomeWalletIds.length === 0}
                                    onCheckedChange={() => handleSelectAllWallets("incomeWalletIds")}
                                />
                                <label htmlFor="income-all" className="text-sm font-medium cursor-pointer">All Wallets</label>
                            </div>
                            {wallets.map((w) => (
                                <div key={`income-${w.id}`} className="flex items-center gap-2 ml-4">
                                    <Checkbox
                                        id={`income-${w.id}`}
                                        checked={localConfig.incomeWalletIds.length === 0 || localConfig.incomeWalletIds.includes(w.id)}
                                        onCheckedChange={() => {
                                            if (localConfig.incomeWalletIds.length === 0) {
                                                // If 'All' was selected, switch to specific selection (all except this one)
                                                setLocalConfig((prev) => ({
                                                    ...prev,
                                                    incomeWalletIds: wallets.filter((wallet) => wallet.id !== w.id).map((wallet) => wallet.id)
                                                }));
                                            } else {
                                                handleToggleWallet("incomeWalletIds", w.id);
                                            }
                                        }}
                                    />
                                    <label htmlFor={`income-${w.id}`} className="text-sm font-medium cursor-pointer flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                        <span>{w.icon}</span> {w.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Expense Data Sources */}
                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Expense Sources</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                            Select which wallets contribute to your Monthly Expenses calculation.
                        </p>
                        <div className="space-y-3 pl-2">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="expense-all"
                                    checked={localConfig.expenseWalletIds.length === 0}
                                    onCheckedChange={() => handleSelectAllWallets("expenseWalletIds")}
                                />
                                <label htmlFor="expense-all" className="text-sm font-medium cursor-pointer">All Wallets</label>
                            </div>
                            {wallets.map((w) => (
                                <div key={`expense-${w.id}`} className="flex items-center gap-2 ml-4">
                                    <Checkbox
                                        id={`expense-${w.id}`}
                                        checked={localConfig.expenseWalletIds.length === 0 || localConfig.expenseWalletIds.includes(w.id)}
                                        onCheckedChange={() => {
                                            if (localConfig.expenseWalletIds.length === 0) {
                                                // If 'All' was selected, switch to specific selection (all except this one)
                                                setLocalConfig((prev) => ({
                                                    ...prev,
                                                    expenseWalletIds: wallets.filter((wallet) => wallet.id !== w.id).map((wallet) => wallet.id)
                                                }));
                                            } else {
                                                handleToggleWallet("expenseWalletIds", w.id);
                                            }
                                        }}
                                    />
                                    <label htmlFor={`expense-${w.id}`} className="text-sm font-medium cursor-pointer flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                        <span>{w.icon}</span> {w.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                    <Button variant="ghost" onClick={handleReset} className="w-full sm:w-auto">
                        Reset Data Sources
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} className="flex-1 sm:flex-none bg-violet-600 hover:bg-violet-700 text-white">
                            Save Settings
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
