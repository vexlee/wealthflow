"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    LayoutDashboard,
    Wallet,
    ArrowLeftRight,
    PiggyBank,
    Settings,
    LogOut,
    Menu,
    ChevronRight,
    Keyboard,
    Plus,
    RefreshCw,
} from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsDialog } from "@/components/shared/keyboard-shortcuts-dialog";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/wallets", icon: Wallet, label: "Wallets" },
    { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
    { href: "/recurring", icon: RefreshCw, label: "Recurring" },
    { href: "/budgets", icon: PiggyBank, label: "Budgets" },
    { href: "/settings", icon: Settings, label: "Settings" },
];

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
    return (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 pb-4">
                <Link href="/dashboard" className="flex items-center gap-3 group" onClick={onNavigate}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
                        <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">WealthFlow</h1>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Finance Tracker</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-1">
                <p className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Menu</p>
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                                isActive
                                    ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 shadow-sm"
                                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                        >
                            <item.icon className={cn(
                                "w-[18px] h-[18px] transition-colors",
                                isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                            )} />
                            <span>{item.label}</span>
                            {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-violet-400" />}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom gradient line */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent mx-4" />
        </div>
    );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [userEmail, setUserEmail] = useState<string>("");
    const [mobileOpen, setMobileOpen] = useState(false);
    const { helpOpen, setHelpOpen, allShortcuts } = useKeyboardShortcuts();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
            }
        };
        getUser();
    }, [supabase.auth]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/auth/login");
        router.refresh();
    };

    const initials = userEmail
        ? userEmail.substring(0, 2).toUpperCase()
        : "WF";

    return (
        <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950 flex">
                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl fixed inset-y-0 left-0 z-30 shadow-sm">
                        <SidebarContent pathname={pathname} />

                        {/* User section */}
                        <div className="p-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
                                        <Avatar className="w-8 h-8 border border-slate-200 dark:border-slate-700">
                                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-violet-700 text-white text-xs font-semibold">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-800 dark:text-slate-200 truncate">{userEmail || "Loading..."}</p>
                                            <p className="text-[11px] text-slate-400">Free Plan</p>
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem>
                                        <Settings className="w-4 h-4 mr-2" />
                                        Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleSignOut} className="text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-500/10">
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Sign Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </aside>

                    {/* Mobile Header */}
                    <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between px-4 h-14">
                            <div className="flex items-center gap-3">
                                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200">
                                            <Menu className="w-5 h-5" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-72 p-0">
                                        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                                        <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
                                    </SheetContent>
                                </Sheet>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
                                        <Wallet className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-slate-900 dark:text-slate-100 font-semibold">WealthFlow</span>
                                </div>
                            </div>
                            <Avatar className="w-8 h-8 border border-slate-200 dark:border-slate-700">
                                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-violet-700 text-white text-xs font-semibold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>

                    {/* Main Content */}
                    <main className="flex-1 lg:ml-64">
                        <div className="pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
                            {children}
                        </div>
                    </main>

                    {/* Mobile FAB - Quick Add Transaction */}
                    <Link
                        href="/transactions?new=true"
                        className="lg:hidden fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center active:scale-95 transition-transform hover:shadow-violet-500/50"
                    >
                        <Plus className="w-6 h-6" />
                    </Link>

                    {/* Mobile Bottom Nav */}
                    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-around h-16 px-2 pb-safe">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[52px]",
                                            isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-400 dark:text-slate-500"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "w-5 h-5 transition-all",
                                            isActive && "drop-shadow-[0_0_8px_rgba(124,58,237,0.4)]"
                                        )} />
                                        <span className="text-[10px] font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Keyboard Shortcuts Help */}
                    <KeyboardShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} shortcuts={allShortcuts} />
                </div>
    );
}
