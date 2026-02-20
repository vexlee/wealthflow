"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface CurrencyContextValue {
    currency: string;
    setCurrency: (code: string) => void;
}

import { createClient } from "@/lib/supabase/client";

const CurrencyContext = createContext<CurrencyContextValue>({
    currency: "USD",
    setCurrency: () => { },
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = useState("USD");

    useEffect(() => {
        const saved = localStorage.getItem("wealthflow-currency");
        if (saved) setCurrencyState(saved);

        const fetchProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('currency')
                    .eq('id', user.id)
                    .single();

                if (profile && profile.currency) {
                    setCurrencyState(profile.currency);
                    localStorage.setItem("wealthflow-currency", profile.currency);
                }
            }
        };
        fetchProfile();
    }, []);

    const setCurrency = (code: string) => {
        setCurrencyState(code);
        localStorage.setItem("wealthflow-currency", code);

        const updateProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('profiles')
                    .upsert({ id: user.id, currency: code });
            }
        };
        updateProfile();
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    return useContext(CurrencyContext);
}
