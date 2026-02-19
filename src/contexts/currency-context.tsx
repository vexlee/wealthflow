"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface CurrencyContextValue {
    currency: string;
    setCurrency: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
    currency: "USD",
    setCurrency: () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [currency, setCurrencyState] = useState("USD");

    useEffect(() => {
        const saved = localStorage.getItem("wealthflow-currency");
        if (saved) setCurrencyState(saved);
    }, []);

    const setCurrency = (code: string) => {
        setCurrencyState(code);
        localStorage.setItem("wealthflow-currency", code);
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
