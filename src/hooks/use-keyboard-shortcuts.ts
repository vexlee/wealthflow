"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface Shortcut {
    key: string;
    label: string;
    description: string;
    action: () => void;
    global?: boolean;
}

export function useKeyboardShortcuts(pageShortcuts: Shortcut[] = []) {
    const router = useRouter();
    const pathname = usePathname();
    const [helpOpen, setHelpOpen] = useState(false);

    const globalShortcuts: Shortcut[] = [
        { key: "g d", label: "G then D", description: "Go to Dashboard", action: () => router.push("/dashboard"), global: true },
        { key: "g w", label: "G then W", description: "Go to Wallets", action: () => router.push("/wallets"), global: true },
        { key: "g t", label: "G then T", description: "Go to Transactions", action: () => router.push("/transactions"), global: true },
        { key: "g b", label: "G then B", description: "Go to Budgets", action: () => router.push("/budgets"), global: true },
        { key: "g s", label: "G then S", description: "Go to Settings", action: () => router.push("/settings"), global: true },
        { key: "?", label: "?", description: "Show keyboard shortcuts", action: () => setHelpOpen(true), global: true },
    ];

    const allShortcuts = [...globalShortcuts, ...pageShortcuts];

    useEffect(() => {
        let pendingPrefix: string | null = null;
        let prefixTimeout: ReturnType<typeof setTimeout> | null = null;

        const handler = (e: KeyboardEvent) => {
            // Don't trigger shortcuts when typing in inputs/textareas/selects
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.tagName === "SELECT" ||
                target.isContentEditable
            ) {
                return;
            }

            // Don't trigger when modifier keys are held (except shift for ?)
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            const key = e.key.toLowerCase();

            // Handle "g" prefix sequences
            if (pendingPrefix === "g") {
                pendingPrefix = null;
                if (prefixTimeout) clearTimeout(prefixTimeout);

                const combo = `g ${key}`;
                const match = allShortcuts.find((s) => s.key === combo);
                if (match) {
                    e.preventDefault();
                    match.action();
                    return;
                }
            }

            // Start "g" prefix
            if (key === "g") {
                pendingPrefix = "g";
                if (prefixTimeout) clearTimeout(prefixTimeout);
                prefixTimeout = setTimeout(() => { pendingPrefix = null; }, 500);
                return;
            }

            // Single-key shortcuts
            const match = allShortcuts.find((s) => s.key === key && !s.key.includes(" "));
            if (match) {
                e.preventDefault();
                match.action();
            }
        };

        window.addEventListener("keydown", handler);
        return () => {
            window.removeEventListener("keydown", handler);
            if (prefixTimeout) clearTimeout(prefixTimeout);
        };
    }, [allShortcuts]);

    return { helpOpen, setHelpOpen, allShortcuts };
}
