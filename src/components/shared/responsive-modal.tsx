"use client";

import { useEffect, useState } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from "@/components/ui/sheet";

interface ResponsiveModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);
    return isMobile;
}

export function ResponsiveModal({ open, onOpenChange, title, children, footer, className }: ResponsiveModalProps) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="bottom"
                    className={`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-t-2xl max-h-[90vh] overflow-y-auto ${className || ""}`}
                >
                    <SheetHeader className="pb-2">
                        <SheetTitle>{title}</SheetTitle>
                    </SheetHeader>
                    {children}
                    {footer && (
                        <div className="flex gap-2 justify-end pt-4 pb-2">
                            {footer}
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-md shadow-xl ${className || ""}`}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                {children}
                {footer && (
                    <DialogFooter className="flex gap-2">
                        {footer}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

// Re-export close components for convenience
export { DialogClose, SheetClose };
