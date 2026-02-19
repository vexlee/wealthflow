"use client";

import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";
import type { Shortcut } from "@/hooks/use-keyboard-shortcuts";

interface KeyboardShortcutsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shortcuts: Shortcut[];
}

export function KeyboardShortcutsDialog({ open, onOpenChange, shortcuts }: KeyboardShortcutsDialogProps) {
    const globalShortcuts = shortcuts.filter((s) => s.global);
    const pageShortcuts = shortcuts.filter((s) => !s.global);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-sm shadow-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="w-5 h-5 text-violet-500" />
                        Keyboard Shortcuts
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    {pageShortcuts.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">This Page</p>
                            <div className="space-y-1">
                                {pageShortcuts.map((s) => (
                                    <ShortcutRow key={s.key} shortcut={s} />
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Navigation</p>
                        <div className="space-y-1">
                            {globalShortcuts.map((s) => (
                                <ShortcutRow key={s.key} shortcut={s} />
                            ))}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
    return (
        <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
            <span className="text-sm text-slate-600 dark:text-slate-400">{shortcut.description}</span>
            <kbd className="ml-3 shrink-0 px-2 py-0.5 text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700">
                {shortcut.label}
            </kbd>
        </div>
    );
}
