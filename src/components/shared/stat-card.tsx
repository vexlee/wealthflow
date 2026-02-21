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
}

export function StatCard({ label, labelDesktop, value, icon: Icon, trend, className, iconColor = "text-violet-600", compact }: StatCardProps) {
    return (
        <Card className={cn("bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300", className)}>
            <CardContent className={cn("p-5", compact && "p-3 sm:p-5")}>
                <div className={cn("flex items-start justify-between", compact && "flex-col gap-2 sm:flex-row")}>
                    <div className={cn("space-y-2", compact && "space-y-1 sm:space-y-2")}>
                        {labelDesktop ? (
                            <>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider sm:hidden">{label}</p>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:block">{labelDesktop}</p>
                            </>
                        ) : (
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
                        )}
                        <p className={cn("text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight", compact && "text-base sm:text-2xl")}>{value}</p>
                        {trend && (
                            <p className={cn(
                                "text-xs font-medium flex items-center gap-1",
                                trend.positive ? "text-emerald-600" : "text-red-500"
                            )}>
                                <span>{trend.positive ? "↑" : "↓"}</span>
                                {trend.value}
                            </p>
                        )}
                    </div>
                    <div className={cn("p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800", iconColor, compact && "p-1.5 sm:p-2.5 hidden sm:block")}>
                        <Icon className={cn("w-5 h-5", compact && "w-4 h-4 sm:w-5 sm:h-5")} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
