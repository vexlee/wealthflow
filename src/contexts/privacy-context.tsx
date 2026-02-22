"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface PrivacyContextType {
    isPrivacyMode: boolean;
    togglePrivacyMode: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
    const [isPrivacyMode, setIsPrivacyMode] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Fetch from Supabase
        const fetchProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_privacy_mode')
                    .eq('id', user.id)
                    .single();

                if (profile && profile.is_privacy_mode !== null) {
                    setIsPrivacyMode(profile.is_privacy_mode);
                }
            }
            // Mark loaded after attempt
            setIsLoaded(true);
        };
        fetchProfile();
    }, []);

    const togglePrivacyMode = () => {
        const previousValue = isPrivacyMode;
        const newValue = !previousValue;

        // Optimistic update
        setIsPrivacyMode(newValue);

        // Sync with Supabase
        const updateProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ is_privacy_mode: newValue })
                    .eq('id', user.id);

                if (error) {
                    // Rollback on failure
                    setIsPrivacyMode(previousValue);
                    toast.error("Failed to save privacy preference");
                }
            }
        };
        updateProfile();
    };

    return (
        <PrivacyContext.Provider value={{ isPrivacyMode, togglePrivacyMode }}>
            {children}
        </PrivacyContext.Provider>
    );
}

export function usePrivacy() {
    const context = useContext(PrivacyContext);
    if (context === undefined) {
        throw new Error("usePrivacy must be used within a PrivacyProvider");
    }
    return context;
}
