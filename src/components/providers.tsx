"use client";

import { CurrencyProvider } from "@/contexts/currency-context";
import { PrivacyProvider } from "@/contexts/privacy-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <PrivacyProvider>
            <CurrencyProvider>
                {children}
            </CurrencyProvider>
        </PrivacyProvider>
    );
}
