"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Wallet,
    ArrowRight,
    Sparkles,
    PiggyBank,
    ArrowLeftRight,
    Check,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
    {
        icon: Sparkles,
        title: "Welcome to LatteLedger",
        description:
            "Your personal finance tracker. Let's get you set up in under a minute.",
    },
    {
        icon: Wallet,
        title: "Create Your First Wallet",
        description:
            "A wallet represents a bank account, cash, or any money source you want to track.",
    },
    {
        icon: ArrowLeftRight,
        title: "You're All Set!",
        description:
            "Start adding transactions and set budgets to take control of your finances.",
    },
];

const WALLET_ICONS = ["💵", "💳", "🏦", "💰", "🪙", "📱"];
const WALLET_COLORS = ["#F4B8A5", "#A9D1E1", "#D2A68D", "#FDF2E9", "#ef4444", "#10b981"];

interface OnboardingProps {
    onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
    const supabase = createClient();
    const [step, setStep] = useState(0);
    const [walletName, setWalletName] = useState("");
    const [walletIcon, setWalletIcon] = useState("💵");
    const [walletColor, setWalletColor] = useState("#F4B8A5");
    const [saving, setSaving] = useState(false);

    const handleCreateWallet = async () => {
        if (!walletName.trim()) {
            toast.error("Please enter a wallet name");
            return;
        }
        setSaving(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            toast.error("Authentication error");
            setSaving(false);
            return;
        }

        const { error } = await supabase.rpc("create_wallet_with_member", {
            p_name: walletName.trim(),
            p_type: "manual",
            p_currency_code: "USD",
            p_icon: walletIcon,
            p_color: walletColor,
            p_owner_id: user.id,
        });

        if (error) {
            toast.error("Failed to create wallet");
            setSaving(false);
            return;
        }

        toast.success("Wallet created!");
        setSaving(false);
        setStep(2);
    };

    const handleFinish = async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user) {
            await supabase
                .from("profiles")
                .update({ has_onboarded: true })
                .eq('id', user.id);
        }

        onComplete();
    };

    const currentStep = STEPS[step];
    const StepIcon = currentStep.icon;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Progress bar */}
                <div className="flex gap-1 px-6 pt-6">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step
                                ? "bg-violet-400"
                                : "bg-slate-200 dark:bg-slate-700"
                                }`}
                        />
                    ))}
                </div>

                <div className="p-8 text-center">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-violet-500/20">
                        <StepIcon className="w-8 h-8 text-white" />
                    </div>

                    {/* Title & Description */}
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        {currentStep.title}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                        {currentStep.description}
                    </p>

                    {/* Step 0: Welcome */}
                    {step === 0 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3 text-center mb-6">
                                {[
                                    { icon: Wallet, label: "Track Wallets" },
                                    { icon: ArrowLeftRight, label: "Log Transactions" },
                                    { icon: PiggyBank, label: "Set Budgets" },
                                ].map((feature) => (
                                    <div
                                        key={feature.label}
                                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                                    >
                                        <feature.icon className="w-5 h-5 text-violet-500 mx-auto mb-1.5" />
                                        <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                            {feature.label}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <Button
                                onClick={() => setStep(1)}
                                className="w-full bg-gradient-to-r from-violet-400 to-violet-600 border-none text-slate-900 shadow-lg shadow-violet-500/20"
                            >
                                Get Started
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                            <button
                                onClick={handleFinish}
                                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                Skip for now
                            </button>
                        </div>
                    )}

                    {/* Step 1: Create wallet */}
                    {step === 1 && (
                        <div className="space-y-5 text-left">
                            <div className="space-y-2">
                                <Label className="text-slate-600 dark:text-slate-400">
                                    Wallet Name
                                </Label>
                                <Input
                                    placeholder="e.g., Cash, Bank Account, Savings"
                                    value={walletName}
                                    onChange={(e) => setWalletName(e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-600 dark:text-slate-400">
                                    Icon
                                </Label>
                                <div className="flex gap-2">
                                    {WALLET_ICONS.map((ic) => (
                                        <button
                                            key={ic}
                                            onClick={() => setWalletIcon(ic)}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${walletIcon === ic
                                                ? "bg-violet-100 dark:bg-violet-500/20 ring-2 ring-violet-500 scale-110"
                                                : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                                                }`}
                                        >
                                            {ic}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-600 dark:text-slate-400">
                                    Color
                                </Label>
                                <div className="flex gap-2">
                                    {WALLET_COLORS.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => setWalletColor(c)}
                                            className={`w-8 h-8 rounded-full transition-all ${walletColor === c
                                                ? "ring-2 ring-slate-900 dark:ring-slate-100 scale-110"
                                                : "hover:scale-105"
                                                }`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(0)}
                                    className="flex-1 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleCreateWallet}
                                    disabled={saving || !walletName.trim()}
                                    className="flex-1 bg-gradient-to-r from-violet-400 to-violet-600 border-none text-slate-900 shadow-none font-bold"
                                >
                                    {saving ? "Creating..." : "Create Wallet"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Done */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                                <Check className="w-6 h-6 text-emerald-600" />
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Your wallet <span className="font-semibold text-slate-900 dark:text-slate-100">{walletIcon} {walletName}</span> is ready. Now go add your first transaction!
                            </p>
                            <Button
                                onClick={handleFinish}
                                className="w-full bg-gradient-to-r from-violet-400 to-violet-600 border-none text-slate-900 shadow-lg shadow-violet-500/20 font-bold"
                            >
                                Go to Dashboard
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
