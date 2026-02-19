"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    label: string;
    value: string;
    icon: LucideIcon;
    trend?: { value: string; positive: boolean };
    className?: string;
    iconColor?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className, iconColor = "text-violet-600" }: StatCardProps) {
    return (
        <Card className={cn("bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300", className)}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{value}</p>
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
                    <div className={cn("p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800", iconColor)}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
