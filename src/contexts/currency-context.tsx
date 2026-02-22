"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface CurrencyContextValue {
    currency: string;
    setCurrency: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
    currency: "USD",
    setCurrency: () => { },
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = useState("USD");

    useEffect(() => {
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
                }
            }
        };
        fetchProfile();
    }, []);

    const setCurrency = (code: string) => {
        // Optimistic update — save previous value for rollback
        const previousCurrency = currency;
        setCurrencyState(code);

        const updateProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ currency: code })
                    .eq('id', user.id);

                if (error) {
                    // Rollback on failure
                    setCurrencyState(previousCurrency);
                    toast.error("Failed to save currency preference");
                }
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
