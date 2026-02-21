"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/contexts/currency-context";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Settings</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                    Manage your account and preferences
                </p>
            </div>

            {/* Profile */}
            <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <User className="w-3 h-3" />
                        Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-7 pt-2">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-700 flex items-center justify-center shadow-xl shadow-indigo-500/20 text-2xl font-black text-white">
                            {initials}
                        </div>
                        <div className="min-w-0 space-y-1">
                            <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                                {userEmail || "Loading..."}
                            </p>
                            <div className="flex items-center gap-2">
                                <Mail className="w-3 h-3 text-slate-400" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {userCreated ? `Since ${userCreated}` : "Loading..."}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Appearance */}
            <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Palette className="w-3 h-3" />
                        Appearance
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-7 pt-2">
                    <div className="grid grid-cols-3 gap-3">
                        {([
                            { value: "light", icon: Sun, label: "Light" },
                            { value: "dark", icon: Moon, label: "Dark" },
                            { value: "system", icon: Monitor, label: "System" },
                        ] as const).map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setTheme(opt.value)}
                                className={cn(
                                    "group flex flex-col items-center gap-3 p-4 rounded-[1.5rem] border-2 transition-all duration-300",
                                    theme === opt.value
                                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 shadow-lg shadow-indigo-500/10"
                                        : "border-slate-50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/20 text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                                )}
                            >
                                <opt.icon className={cn(
                                    "w-6 h-6 transition-transform duration-500 group-hover:scale-110",
                                    theme === opt.value ? "text-indigo-600" : "text-slate-400"
                                )} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {opt.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Preferences */}
            <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <DollarSign className="w-3 h-3" />
                        Preferences
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-7 pt-2 space-y-6">
                    <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                            Default Currency
                        </p>
                        <div className="relative">
                            <button
                                onClick={() => setCurrencyOpen(!currencyOpen)}
                                className="w-full flex items-center justify-between p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 hover:border-indigo-600 transition-all duration-300 shadow-sm"
                            >
                                <span className="flex items-center gap-4">
                                    <span className="text-2xl font-black text-indigo-600 w-8">
                                        {selectedCurrency?.symbol}
                                    </span>
                                    <div className="flex flex-col leading-none">
                                        <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                            {selectedCurrency?.name}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            {selectedCurrency?.code}
                                        </span>
                                    </div>
                                </span>
                                <ChevronRight
                                    className={cn(
                                        "w-5 h-5 text-slate-400 transition-transform duration-300",
                                        currencyOpen ? "rotate-90" : ""
                                    )}
                                />
                            </button>
                            {currencyOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] shadow-2xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-300">
                                    {CURRENCIES.map((c) => (
                                        <button
                                            key={c.code}
                                            onClick={() => handleCurrencyChange(c.code)}
                                            className={cn(
                                                "w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all",
                                                currency === c.code
                                                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600"
                                                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            <span className="text-xl font-black w-8">
                                                {c.symbol}
                                            </span>
                                            <div className="flex flex-col leading-none">
                                                <span className="text-sm font-bold">
                                                    {c.name}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                    {c.code}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-2">
                        <Link href="/categories" className="block w-full">
                            <Button
                                variant="ghost"
                                className="w-full justify-between h-12 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-5 group"
                            >
                                <span className="flex items-center gap-3 font-bold text-sm tracking-tight">
                                    <Tag className="w-4 h-4 text-indigo-600 transition-transform group-hover:rotate-12" />
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
