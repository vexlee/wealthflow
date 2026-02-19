"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface PrivacyContextType {
    isPrivacyMode: boolean;
    togglePrivacyMode: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
    const [isPrivacyMode, setIsPrivacyMode] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Load from local storage first for immediate UI feedback
        const storedPrivacy = localStorage.getItem("wealthflow-privacy-mode");
        if (storedPrivacy) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsPrivacyMode(storedPrivacy === "true");
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoaded(true);

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
                    // Sync local storage to match cloud
                    localStorage.setItem("wealthflow-privacy-mode", String(profile.is_privacy_mode));
                }
            }
        };
        fetchProfile();
    }, []);

    const togglePrivacyMode = () => {
        setIsPrivacyMode((prev) => {
            const newValue = !prev;
            localStorage.setItem("wealthflow-privacy-mode", String(newValue));

            // Sync with Supabase
            const updateProfile = async () => {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase
                        .from('profiles')
                        .upsert({ id: user.id, is_privacy_mode: newValue });
                }
            };
            updateProfile();

            return newValue;
        });
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
