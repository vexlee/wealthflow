"use client";

import { Button } from "@/components/ui/button";
import { usePrivacy } from "@/contexts/privacy-context";
import { Eye, EyeOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function PrivacyToggle() {
    const { isPrivacyMode, togglePrivacyMode } = usePrivacy();

    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePrivacyMode}
                        className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                    >
                        {isPrivacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        <span className="sr-only">Toggle Privacy Mode</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isPrivacyMode ? "Show details" : "Hide details"}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
