"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Loader2, Wallet } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push("/dashboard");
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-400/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
            </div>

            <Card className="w-full max-w-md relative z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50 rounded-[2rem] shadow-2xl shadow-violet-500/10 group overflow-hidden">
                {/* Subtle Hover Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                <CardHeader className="text-center space-y-4 pt-8">
                    <div className="mx-auto w-16 h-16 rounded-[2rem] bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-xl shadow-violet-500/20 transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 overflow-hidden p-2.5">
                        <img src="/favicon.ico" alt="LatteLedger Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Welcome back</CardTitle>
                        <CardDescription className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2">
                            Sign in to your LatteLedger account
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-2xl focus:border-violet-500 focus:ring-violet-500/20 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-2xl focus:border-violet-500 focus:ring-violet-500/20 transition-all"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="h-12 w-full bg-gradient-to-r from-violet-400 to-violet-600 border-none text-slate-900 rounded-2xl shadow-xl shadow-violet-500/10 transition-all duration-300 font-bold tracking-tight"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>
                    <div className="mt-6 text-center">
                        <p className="text-slate-500 text-sm">
                            Don&apos;t have an account?{" "}
                            <Link href="/auth/signup" className="text-violet-600 hover:text-violet-500 transition-colors font-medium">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
