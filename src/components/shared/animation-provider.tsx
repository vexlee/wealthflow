"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { PageTransition } from "./page-transition";

export function AnimationProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <AnimatePresence mode="wait">
            <PageTransition key={pathname}>
                {children}
            </PageTransition>
        </AnimatePresence>
    );
}
