"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDeleteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
}

export function ConfirmDelete({
    open,
    onOpenChange,
    onConfirm,
    title = "Are you sure?",
    description = "This action cannot be undone. This will permanently delete this item.",
}: ConfirmDeleteProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="bg-white border-slate-200 shadow-xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-slate-900">{title}</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-500">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="border-slate-200 text-slate-600 hover:bg-slate-50">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-red-500 text-white hover:bg-red-600 shadow-sm"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
