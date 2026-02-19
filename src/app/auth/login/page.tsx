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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50 p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-200/40 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-300/30 rounded-full blur-3xl" />
            </div>

            <Card className="w-full max-w-md relative z-10 bg-white/90 backdrop-blur-xl border-slate-200 shadow-2xl shadow-violet-500/5">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/25">
                        <Wallet className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-slate-900">Welcome back</CardTitle>
                        <CardDescription className="text-slate-500 mt-1">
                            Sign in to your WealthFlow account
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
                            <Label htmlFor="email" className="text-slate-600">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-600">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-violet-500/20"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white shadow-lg shadow-violet-500/25 transition-all duration-200"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
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
