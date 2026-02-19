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

export default function SignUpPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50 p-4">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-200/40 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-300/30 rounded-full blur-3xl" />
                </div>
                <Card className="w-full max-w-md relative z-10 bg-white/90 backdrop-blur-xl border-slate-200 shadow-2xl shadow-violet-500/5">
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                            <ArrowRight className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold text-slate-900">Check your email</CardTitle>
                            <CardDescription className="text-slate-500 mt-2">
                                We&apos;ve sent a verification link to <span className="text-violet-600 font-medium">{email}</span>. Click the link to activate your account.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => router.push("/auth/login")}
                            variant="outline"
                            className="w-full border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                            Back to Sign In
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-violet-50 p-4">
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
                        <CardTitle className="text-2xl font-bold text-slate-900">Create account</CardTitle>
                        <CardDescription className="text-slate-500 mt-1">
                            Start managing your finances with WealthFlow
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignUp} className="space-y-4">
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
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-slate-600">Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
                                    Create Account
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>
                    <div className="mt-6 text-center">
                        <p className="text-slate-500 text-sm">
                            Already have an account?{" "}
                            <Link href="/auth/login" className="text-violet-600 hover:text-violet-500 transition-colors font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
