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
    maskedValue?: string;
    isPrivacyDelayed?: boolean;
    disablePrivacy?: boolean;
    chartData?: number[];
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
        bg: "bg-violet-50/50 dark:bg-violet-500/5",
        border: "border-violet-200/50 dark:border-violet-500/20",
        glow: "from-violet-400/20",
        iconContainer: "bg-violet-100/50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
        label: "text-violet-600/70 dark:text-violet-400/50"
    },
    slate: {
        bg: "bg-white dark:bg-slate-900",
        border: "border-slate-200/80 dark:border-slate-800",
        glow: "from-slate-100/50 dark:from-slate-800/20",
        iconContainer: "bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400",
        label: "text-slate-400 dark:text-slate-500"
    }
};

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { usePrivacy } from "@/contexts/privacy-context";

export function StatCard({
    label,
    labelDesktop,
    value,
    maskedValue,
    icon: Icon,
    trend,
    className,
    iconColor,
    compact,
    theme = "slate",
    isPrivacyDelayed = false,
    disablePrivacy = false,
    chartData
}: StatCardProps) {
    const style = themeStyles[theme];
    const { isPrivacyMode } = usePrivacy();

    // Always default to true (privacy view) on initial mount for security, unless disabled
    const [isFlipped, setIsFlipped] = useState(!disablePrivacy);
    const hasInteracted = useRef(false);
    const previousPrivacyMode = useRef(isPrivacyMode);

    // Only sync with global privacy mode if it actually changes (toggled by user), 
    // never on the initial load sync from context.
    useEffect(() => {
        if (!disablePrivacy && previousPrivacyMode.current !== isPrivacyMode) {
            setIsFlipped(isPrivacyMode);
            previousPrivacyMode.current = isPrivacyMode;
        }
    }, [isPrivacyMode, disablePrivacy]);

    const handleFlip = () => {
        if (disablePrivacy) return;
        hasInteracted.current = true;
        setIsFlipped(!isFlipped);
    };

    const cardVariants = {
        hidden: { opacity: 0, scale: 0.95, y: 10 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
            }
        }
    };

    const renderCardContent = (isBack: boolean = false) => (
        <Card className={cn(
            "group border rounded-2xl sm:rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden relative h-full w-full",
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

            {isBack ? (
                <CardContent className={cn("p-4 sm:p-6 flex flex-col items-center justify-center h-full min-h-[120px] sm:min-h-[140px] text-center gap-3", compact && "p-3 sm:p-6")}>
                    <div className={cn(
                        "p-2.5 sm:p-3 rounded-2xl transition-all duration-500 opacity-60",
                        style.iconContainer,
                        iconColor
                    )}>
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <p className={cn(
                        "text-xs sm:text-sm font-bold uppercase tracking-[0.15em] opacity-80",
                        style.label
                    )}>
                        {labelDesktop || label}
                    </p>
                    <div className="w-8 h-1 rounded-full bg-slate-200/50 dark:bg-slate-700/50 mt-1" />
                </CardContent>
            ) : (
                <CardContent className={cn("p-4 sm:p-6", compact && "p-3 sm:p-6 flex items-center justify-center h-full")}>
                    {/* Sparkline Overlay for background feel */}
                    {chartData && chartData.length > 1 && !compact && (
                        <div className="absolute bottom-0 right-0 left-0 h-12 opacity-[0.08] dark:opacity-[0.12] pointer-events-none">
                            <svg viewBox="0 0 100 40" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                                <motion.path
                                    d={(() => {
                                        const min = Math.min(...chartData);
                                        const max = Math.max(...chartData);
                                        const range = max - min || 1;
                                        return chartData.map((val, i) => {
                                            const x = (i / (chartData.length - 1)) * 100;
                                            const y = 40 - ((val - min) / range) * 35 - 2;
                                            return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                                        }).join(" ");
                                    })()}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                />
                            </svg>
                        </div>
                    )}

                    <div className={cn(
                        "flex items-start justify-between gap-3 sm:gap-4 w-full",
                        compact && "flex-col items-center justify-center text-center sm:flex-row sm:items-start sm:justify-between sm:text-left"
                    )}>
                        <div className={cn("space-y-2 sm:space-y-3 flex-1 min-w-0", compact && "flex flex-col items-center sm:block")}>
                            <div className="flex items-center gap-2">
                                <p className={cn(
                                    "text-[11px] sm:text-xs font-bold uppercase tracking-[0.1em] truncate",
                                    style.label,
                                    labelDesktop ? (compact ? "" : "sm:hidden") : ""
                                )}>
                                    {label}
                                </p>
                                {labelDesktop && (
                                    <p className={cn(
                                        "text-[11px] sm:text-xs font-bold uppercase tracking-[0.1em] hidden sm:block truncate",
                                        style.label
                                    )}>
                                        {labelDesktop}
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center space-x-2">
                                <motion.p
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2, duration: 0.5 }}
                                    className={cn(
                                        "text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none",
                                        compact && "text-2xl sm:text-3xl"
                                    )}
                                >
                                    {value}
                                </motion.p>

                                {chartData && chartData.length > 1 && (
                                    <div className="flex items-center h-8 ml-1">
                                        <svg viewBox="0 0 60 24" className="w-12 sm:w-16 h-6 overflow-visible">
                                            <motion.path
                                                d={(() => {
                                                    const min = Math.min(...chartData);
                                                    const max = Math.max(...chartData);
                                                    const range = max - min || 1;
                                                    return chartData.map((val, i) => {
                                                        const x = (i / (chartData.length - 1)) * 60;
                                                        const y = 24 - ((val - min) / range) * 20 - 2;
                                                        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                                                    }).join(" ");
                                                })()}
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className={cn(
                                                    theme === "emerald" ? "text-emerald-500" :
                                                        theme === "rose" ? "text-rose-500" :
                                                            theme === "indigo" ? "text-indigo-500" :
                                                                theme === "amber" ? "text-amber-500" :
                                                                    theme === "sky" ? "text-sky-500" :
                                                                        theme === "violet" ? "text-violet-500" :
                                                                            "text-slate-400"
                                                )}
                                                initial={{ pathLength: 0, opacity: 0 }}
                                                animate={{ pathLength: 1, opacity: 1 }}
                                                transition={{ duration: 1, delay: 0.4 }}
                                            />
                                        </svg>
                                    </div>
                                )}
                                {trend && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3, duration: 0.4 }}
                                        className={cn(
                                            "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold",
                                            trend.positive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-red-50 text-red-500 dark:bg-red-500/10"
                                        )}
                                    >
                                        <span className="mr-0.5">{trend.positive ? "↑" : "↓"}</span>
                                        {trend.value}
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        <div className={cn(
                            "shrink-0 p-3 sm:p-3.5 rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm group-hover:shadow-md",
                            style.iconContainer,
                            iconColor,
                            compact ? "p-2 sm:p-3.5 hidden sm:flex" : "hidden sm:flex"
                        )}>
                            <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5")} />
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );

    return (
        <div
            className={cn("perspective-1000 h-full w-full", !disablePrivacy && "cursor-pointer")}
            onClick={handleFlip}
            style={{ perspective: "1000px" }}
        >
            <motion.div
                variants={cardVariants}
                className={cn("relative w-full h-full min-h-[140px]", compact && "min-h-[100px] sm:min-h-[140px]")}
                style={{
                    transformStyle: "preserve-3d",
                    transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
                initial={{ rotateY: isFlipped ? 180 : 0 }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
            >
                {/* Front Side */}
                <div
                    className="absolute inset-0 w-full h-full"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    {renderCardContent(false)}
                </div>

                {/* Back Side (Privacy) */}
                <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)"
                    }}
                >
                    {renderCardContent(true)}
                </div>

                {/* Invisible structural content to give parent height */}
                <div className="opacity-0 pointer-events-none w-full h-full">
                    {renderCardContent(false)}
                </div>
            </motion.div>
        </div>
    );
}
