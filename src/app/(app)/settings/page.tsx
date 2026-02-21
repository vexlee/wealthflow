"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/contexts/currency-context";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    LogOut,
    Info,
    Shield,
    ChevronRight,
    User,
    Palette,
    Sun,
    Moon,
    Monitor,
    Tag,
    DollarSign,
    Mail,
} from "lucide-react";
import { toast } from "sonner";

const CURRENCIES = [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
];

export default function SettingsPage() {
    const router = useRouter();
    const supabase = createClient();
    const { theme, setTheme } = useTheme();
    const [userEmail, setUserEmail] = useState<string>("");
    const [userCreated, setUserCreated] = useState<string>("");
    const { currency, setCurrency } = useCurrency();
    const [currencyOpen, setCurrencyOpen] = useState(false);

    useEffect(() => {
        const getUser = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || "");
                if (user.created_at) {
                    setUserCreated(
                        new Date(user.created_at).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                        })
                    );
                }
            }
        };
        getUser();
    }, [supabase.auth]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        toast.success("Signed out successfully");
        router.push("/auth/login");
        router.refresh();
    };

    const handleCurrencyChange = (code: string) => {
        setCurrency(code);
        setCurrencyOpen(false);
        toast.success(`Currency set to ${code}`);
    };

    const initials = userEmail ? userEmail.substring(0, 2).toUpperCase() : "WF";
    const selectedCurrency = CURRENCIES.find((c) => c.code === currency);

    return (
        <div className="p-4 lg:p-8 space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Settings
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage your account and preferences
                </p>
            </div>

            {/* Profile */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                    <div className="flex items-center gap-4 py-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                            <span className="text-lg font-bold text-white">
                                {initials}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {userEmail || "Loading..."}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <p className="text-xs text-slate-400">
                                    {userCreated
                                        ? `Member since ${userCreated}`
                                        : "Loading..."}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Appearance */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Appearance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="py-2">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            Theme
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                { value: "light", icon: Sun, label: "Light" },
                                { value: "dark", icon: Moon, label: "Dark" },
                                { value: "system", icon: Monitor, label: "System" },
                            ] as const).map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setTheme(opt.value)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 ${theme === opt.value
                                        ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
                                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400"
                                        }`}
                                >
                                    <opt.icon className="w-5 h-5" />
                                    <span className="text-xs font-medium">
                                        {opt.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Preferences */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Preferences
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                    {/* Currency */}
                    <div className="py-2">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Default Currency
                        </p>
                        <div className="relative">
                            <button
                                onClick={() => setCurrencyOpen(!currencyOpen)}
                                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-left"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-lg font-semibold text-violet-600 dark:text-violet-400 w-8">
                                        {selectedCurrency?.symbol}
                                    </span>
                                    <span className="text-sm text-slate-700 dark:text-slate-300">
                                        {selectedCurrency?.name}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono">
                                        ({selectedCurrency?.code})
                                    </span>
                                </span>
                                <ChevronRight
                                    className={`w-4 h-4 text-slate-400 transition-transform ${currencyOpen ? "rotate-90" : ""
                                        }`}
                                />
                            </button>
                            {currencyOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                                    {CURRENCIES.map((c) => (
                                        <button
                                            key={c.code}
                                            onClick={() =>
                                                handleCurrencyChange(c.code)
                                            }
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors first:rounded-t-xl last:rounded-b-xl ${currency === c.code
                                                ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400"
                                                : "text-slate-700 dark:text-slate-300"
                                                }`}
                                        >
                                            <span className="text-base font-semibold w-8">
                                                {c.symbol}
                                            </span>
                                            <span className="text-sm">
                                                {c.name}
                                            </span>
                                            <span className="text-xs text-slate-400 font-mono ml-auto">
                                                {c.code}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Categories Link */}
                    <div className="pt-2">
                        <Link href="/categories">
                            <Button
                                variant="ghost"
                                className="w-full justify-between text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-4"
                            >
                                <span className="flex items-center gap-2">
                                    <Tag className="w-4 h-4" />
                                    Manage Categories
                                </span>
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Account */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Account
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                    <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="w-full justify-between text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 px-4"
                    >
                        <span className="flex items-center gap-2">
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </span>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </CardContent>
            </Card>

            {/* About */}
            <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        About
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                            App Version
                        </span>
                        <span className="text-sm text-slate-400 font-mono">
                            1.0.0
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                            Build
                        </span>
                        <span className="text-sm text-slate-400 font-mono">
                            MVP
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
