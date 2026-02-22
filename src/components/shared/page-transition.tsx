"use client";

import { motion } from "framer-motion";

interface PageTransitionProps {
    children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1], // Custom cubic-bezier for a more premium feel
            }}
            className="w-full h-full"
        >
            {children}
        </motion.div>
    );
}
