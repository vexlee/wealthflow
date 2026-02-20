"use client";

import React, { useState, useEffect } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { GripVertical, Eye, EyeOff, Scaling } from "lucide-react";

export type DashboardSectionId = "stat-cards" | "spending-distribution" | "cash-flow" | "recent-transactions" | "budget-overview" | "wallets";

export type DashboardSectionSize = "small" | "medium" | "large" | "full";

export interface DashboardSectionConfig {
    id: DashboardSectionId;
    title: string;
    visible: boolean;
    size: DashboardSectionSize;
}

export const DEFAULT_DASHBOARD_CONFIG: DashboardSectionConfig[] = [
    { id: "stat-cards", title: "Key Metrics", visible: true, size: "full" },
    { id: "spending-distribution", title: "Spending Distribution", visible: true, size: "medium" },
    { id: "cash-flow", title: "Cash Flow", visible: true, size: "medium" },
    { id: "recent-transactions", title: "Recent Transactions", visible: true, size: "medium" },
    { id: "budget-overview", title: "Budget Overview", visible: true, size: "medium" },
    { id: "wallets", title: "Your Wallets", visible: true, size: "full" },
];

interface CustomizeDashboardModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    config: DashboardSectionConfig[];
    onSave: (config: DashboardSectionConfig[]) => void;
}

interface SortableItemProps {
    item: DashboardSectionConfig;
    onToggle: (id: DashboardSectionId) => void;
    onChangeSize: (id: DashboardSectionId, size: DashboardSectionSize) => void;
}

function SortableItem({ item, onToggle, onChangeSize }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center justify-between p-3 mb-2 bg-white dark:bg-slate-900 border rounded-lg transition-colors ${isDragging ? "border-violet-500 shadow-md opacity-90" : "border-slate-200 dark:border-slate-800"
                }`}
        >
            <div className="flex items-center gap-3">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label="Drag to reorder"
                >
                    <GripVertical className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2">
                    {item.visible ? (
                        <Eye className="w-4 h-4 text-emerald-500" />
                    ) : (
                        <EyeOff className="w-4 h-4 text-slate-400" />
                    )}
                    <span className={`text-sm font-medium ${item.visible ? "text-slate-700 dark:text-slate-200" : "text-slate-400 line-through"}`}>
                        {item.title}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Select
                    value={item.size}
                    onValueChange={(value: DashboardSectionSize) => onChangeSize(item.id, value)}
                    disabled={!item.visible}
                >
                    <SelectTrigger className="h-8 w-[100px] text-xs">
                        <div className="flex items-center gap-1.5">
                            <Scaling className="w-3 h-3 text-slate-400" />
                            <SelectValue placeholder="Size" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="small" className="text-xs">Small (1/3)</SelectItem>
                        <SelectItem value="medium" className="text-xs">Medium (1/2)</SelectItem>
                        <SelectItem value="large" className="text-xs">Large (2/3)</SelectItem>
                        <SelectItem value="full" className="text-xs">Full Width</SelectItem>
                    </SelectContent>
                </Select>
                <Switch
                    checked={item.visible}
                    onCheckedChange={() => onToggle(item.id)}
                    aria-label={`Toggle ${item.title}`}
                />
            </div>
        </div>
    );
}

export function CustomizeDashboardModal({ open, onOpenChange, config, onSave }: CustomizeDashboardModalProps) {
    const [localConfig, setLocalConfig] = useState<DashboardSectionConfig[]>([]);

    useEffect(() => {
        if (open && config.length > 0) {
            setLocalConfig([...config]);
        }
    }, [open, config]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setLocalConfig((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleToggle = (id: DashboardSectionId) => {
        setLocalConfig((items) =>
            items.map((item) =>
                item.id === id ? { ...item, visible: !item.visible } : item
            )
        );
    };

    const handleChangeSize = (id: DashboardSectionId, size: DashboardSectionSize) => {
        setLocalConfig((items) =>
            items.map((item) =>
                item.id === id ? { ...item, size } : item
            )
        );
    };

    const handleSave = () => {
        onSave(localConfig);
        onOpenChange(false);
    };

    const handleReset = () => {
        setLocalConfig([...DEFAULT_DASHBOARD_CONFIG]);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Customize Dashboard</DialogTitle>
                    <DialogDescription>
                        Drag to reorder sections or toggle visibility to personalize your dashboard.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={localConfig.map((c) => c.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="max-h-[60vh] overflow-y-auto px-1 hide-scrollbar">
                                {localConfig.map((item) => (
                                    <SortableItem
                                        key={item.id}
                                        item={item}
                                        onToggle={handleToggle}
                                        onChangeSize={handleChangeSize}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
                    <Button variant="ghost" onClick={handleReset} className="w-full sm:w-auto">
                        Reset to Default
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
                            Cancel
                        </Button>
                        <Button onClick={handleSave} className="flex-1 sm:flex-none bg-violet-600 hover:bg-violet-700 text-white">
                            Save Layout
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
