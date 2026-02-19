import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">{description}</p>
            {actionLabel && onAction && (
                <Button
                    onClick={onAction}
                    className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white shadow-lg shadow-violet-500/20"
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
