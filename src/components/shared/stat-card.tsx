"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    label: string;
    labelDesktop?: string;
    value: string;
    icon: LucideIcon;
    trend?: { value: string; positive: boolean };
    className?: string;
    iconColor?: string;
    compact?: boolean;
    theme?: "emerald" | "rose" | "indigo" | "amber" | "sky" | "violet" | "slate";
}

const themeStyles = {
    emerald: {
        bg: "bg-emerald-50/30 dark:bg-emerald-500/5",
        border: "border-emerald-200/50 dark:border-emerald-500/20",
        glow: "from-emerald-400/20",
        iconContainer: "bg-emerald-100/50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        label: "text-emerald-600/70 dark:text-emerald-400/50"
    },
    rose: {
        bg: "bg-rose-50/30 dark:bg-rose-500/5",
        border: "border-rose-200/50 dark:border-rose-500/20",
        glow: "from-rose-400/20",
        iconContainer: "bg-rose-100/50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
        label: "text-rose-600/70 dark:text-rose-400/50"
    },
    indigo: {
        bg: "bg-indigo-50/30 dark:bg-indigo-500/5",
        border: "border-indigo-200/50 dark:border-indigo-500/20",
        glow: "from-indigo-400/20",
        iconContainer: "bg-indigo-100/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
        label: "text-indigo-600/70 dark:text-indigo-400/50"
    },
    amber: {
        bg: "bg-amber-50/30 dark:bg-amber-500/5",
        border: "border-amber-200/50 dark:border-amber-500/20",
        glow: "from-amber-400/20",
        iconContainer: "bg-amber-100/50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
        label: "text-amber-600/70 dark:text-amber-400/50"
    },
    sky: {
        bg: "bg-sky-50/30 dark:bg-sky-500/5",
        border: "border-sky-200/50 dark:border-sky-500/20",
        glow: "from-sky-400/20",
        iconContainer: "bg-sky-100/50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400",
        label: "text-sky-600/70 dark:text-sky-400/50"
    },
    violet: {
        bg: "bg-violet-50/30 dark:bg-violet-500/5",
        border: "border-violet-200/50 dark:border-violet-500/20",
        glow: "from-violet-400/20",
        iconContainer: "bg-violet-100/50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
        label: "text-violet-600/70 dark:text-violet-400/50"
    },
    slate: {
        bg: "bg-white dark:bg-slate-900",
        border: "border-slate-200/80 dark:border-slate-800",
        glow: "from-slate-50/50 dark:from-slate-800/20",
        iconContainer: "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400",
        label: "text-slate-400 dark:text-slate-500"
    }
};

export function StatCard({
    label,
    labelDesktop,
    value,
    icon: Icon,
    trend,
    className,
    iconColor,
    compact,
    theme = "slate"
}: StatCardProps) {
    const style = themeStyles[theme];

    return (
        <Card className={cn(
            "group border rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden relative",
            style.bg,
            style.border,
            theme !== "slate" && "hover:shadow-violet-500/5",
            className
        )}>
            {/* Dynamic Hover Glow */}
            <div className={cn(
                "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none",
                style.glow
            )} />

            <CardContent className={cn("p-6", compact && "p-4 sm:p-6")}>
                <div className={cn("flex items-start justify-between gap-4", compact && "flex-col sm:flex-row")}>
                    <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className={cn(
                                "text-[10px] font-bold uppercase tracking-[0.1em] truncate",
                                style.label,
                                labelDesktop ? (compact ? "" : "sm:hidden") : ""
                            )}>
                                {label}
                            </p>
                            {labelDesktop && (
                                <p className={cn(
                                    "text-[10px] font-bold uppercase tracking-[0.1em] hidden sm:block truncate",
                                    style.label
                                )}>
                                    {labelDesktop}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <p className={cn(
                                "text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none",
                                compact && "text-lg sm:text-2xl"
                            )}>
                                {value}
                            </p>
                            {trend && (
                                <div className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold",
                                    trend.positive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-red-50 text-red-500 dark:bg-red-500/10"
                                )}>
                                    <span className="mr-0.5">{trend.positive ? "↑" : "↓"}</span>
                                    {trend.value}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={cn(
                        "shrink-0 p-3.5 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm group-hover:shadow-md",
                        style.iconContainer,
                        iconColor, // Allow override if needed
                        compact && "p-2 sm:p-3.5 hidden sm:flex"
                    )}>
                        <Icon className={cn("w-5 h-5", compact && "w-4 h-4 sm:w-5 sm:h-5")} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
