"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDelete } from "@/components/shared/confirm-delete";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Tag, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/types/database";

const CATEGORY_ICONS = [
    "🍔", "🛒", "🏠", "🚗", "💊", "🎬", "📚", "💼",
    "✈️", "👗", "💪", "🎮", "🎵", "📱", "🐾", "🎁",
    "💰", "📦", "🔧", "⚡", "💳", "🏦", "📊", "🎯",
];

const CategoryGrid = ({ items, label, openEdit }: { items: Category[]; label: string; openEdit: (cat: Category) => void }) => (
    <div>
        <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400">
                {label}
            </Badge>
            <span className="text-xs text-slate-400">{items.length} categories</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((cat) => (
                <Card
                    key={cat.id}
                    className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => openEdit(cat)}
                >
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                            {cat.icon || "📦"}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{cat.name}</p>
                            {cat.is_default && (
                                <p className="text-[10px] text-slate-400">Default</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
);

export default function CategoriesPage() {
    const supabase = createClient();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Delete confirmation
    const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    // Form state
    const [editCategory, setEditCategory] = useState<Category | null>(null);
    const [name, setName] = useState("");
    const [icon, setIcon] = useState("📦");
    const [type, setType] = useState<"expense" | "income">("expense");

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from("categories").select("*").order("type").order("name");
        setCategories(data || []);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const resetForm = () => {
        setEditCategory(null);
        setName("");
        setIcon("📦");
        setType("expense");
    };

    const openCreate = () => {
        resetForm();
        setDialogOpen(true);
    };

    const openEdit = (cat: Category) => {
        setEditCategory(cat);
        setName(cat.name);
        setIcon(cat.icon || "📦");
        setType((cat.type as "expense" | "income") || "expense");
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);

        if (editCategory) {
            const { error } = await supabase
                .from("categories")
                .update({ name: name.trim(), icon, type })
                .eq("id", editCategory.id);

            if (error) toast.error("Failed to update category");
            else toast.success("Category updated");
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase.from("categories").insert({
                name: name.trim(),
                icon,
                type,
                user_id: user?.id,
                is_default: false,
            });

            if (error) toast.error("Failed to create category");
            else toast.success("Category created");
        }

        setSaving(false);
        setDialogOpen(false);
        resetForm();
        fetchCategories();
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("categories").delete().eq("id", id);
        if (error) toast.error("Cannot delete — category may be in use");
        else {
            toast.success("Category deleted");
            fetchCategories();
        }
    };

    const confirmDelete = (id: string) => {
        setDeleteCategoryId(id);
        setConfirmDeleteOpen(true);
    };

    const executeDelete = () => {
        if (deleteCategoryId) {
            handleDelete(deleteCategoryId);
            setDeleteCategoryId(null);
            setDialogOpen(false);
        }
    };

    const expenseCategories = categories.filter((c) => c.type === "expense" || c.type === null);
    const incomeCategories = categories.filter((c) => c.type === "income");

    if (loading) {
        return (
            <div className="p-6 lg:p-8 space-y-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Categories</h1>
                    <p className="text-sm text-slate-500 mt-1">Organize your transactions with categories</p>
                </div>
                <Button
                    onClick={openCreate}
                    className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white shadow-lg shadow-violet-500/20"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                </Button>
            </div>

            {categories.length > 0 ? (
                <div className="space-y-8">
                    {expenseCategories.length > 0 && (
                        <CategoryGrid items={expenseCategories} label="Expense" openEdit={openEdit} />
                    )}
                    {incomeCategories.length > 0 && (
                        <CategoryGrid items={incomeCategories} label="Income" openEdit={openEdit} />
                    )}
                </div>
            ) : (
                <EmptyState
                    icon={Tag}
                    title="No categories yet"
                    description="Create categories to organize your transactions"
                    actionLabel="Add Category"
                    onAction={openCreate}
                />
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-w-md shadow-xl">
                    <DialogHeader>
                        <DialogTitle>{editCategory ? "Edit Category" : "Create Category"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Name</Label>
                            <Input
                                placeholder="e.g., Food & Drink"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                            />
                        </div>

                        {/* Type toggle */}
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Type</Label>
                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                <button
                                    onClick={() => setType("expense")}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                                        type === "expense"
                                            ? "bg-white dark:bg-slate-700 text-red-500 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    )}
                                >
                                    Expense
                                </button>
                                <button
                                    onClick={() => setType("income")}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                                        type === "income"
                                            ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    )}
                                >
                                    Income
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Icon</Label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORY_ICONS.map((ic) => (
                                    <button
                                        key={ic}
                                        onClick={() => setIcon(ic)}
                                        className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all",
                                            icon === ic
                                                ? "bg-violet-100 dark:bg-violet-500/20 ring-2 ring-violet-500 scale-110"
                                                : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                                        )}
                                    >
                                        {ic}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2">
                        {editCategory && !editCategory.is_default && (
                            <Button
                                variant="ghost"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 mr-auto"
                                onClick={() => confirmDelete(editCategory.id)}
                            >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                            </Button>
                        )}
                        <DialogClose asChild>
                            <Button variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !name.trim()}
                            className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editCategory ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDelete
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                onConfirm={executeDelete}
                title="Delete Category"
                description="This will delete this category. Transactions using it will become uncategorized. This cannot be undone."
            />
        </div>
    );
}
