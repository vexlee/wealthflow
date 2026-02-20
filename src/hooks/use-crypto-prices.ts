import { useState, useEffect, useMemo } from "react";
import type { Wallet } from "@/types/database";

// Simple cache to avoid spamming the free CoinGecko API
let globalPricesCache: Record<string, number> = {};
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

export function useCryptoPrices(wallets: Wallet[], baseCurrency: string) {
    const [prices, setPrices] = useState<Record<string, number>>(globalPricesCache);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchPrices = async () => {
            if (!wallets || wallets.length === 0) return;

            const cryptoWallets = wallets.filter(w => w.type === "crypto");
            if (cryptoWallets.length === 0) return;

            const cryptoIds = Array.from(new Set(cryptoWallets.map(w => w.currency_code))).filter(Boolean);
            if (cryptoIds.length === 0) return;

            const vsCurrency = baseCurrency.toLowerCase();
            const now = Date.now();

            if (now - lastFetchTime < CACHE_DURATION && Object.keys(globalPricesCache).length > 0) {
                // Check if we have all needed IDs for the current base currency
                let hasAll = true;
                for (const id of cryptoIds) {
                    if (!globalPricesCache[`${id}-${vsCurrency}`]) {
                        hasAll = false;
                        break;
                    }
                }
                if (hasAll) {
                    setPrices(globalPricesCache);
                    return;
                }
            }

            try {
                setLoading(true);
                const response = await fetch(
                    `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds.join(",")}&vs_currencies=${vsCurrency}`
                );

                if (!response.ok) throw new Error("Failed to fetch crypto prices");

                const data = await response.json();

                const newPrices: Record<string, number> = { ...globalPricesCache };

                for (const id of cryptoIds) {
                    if (data[id as string] && data[id as string][vsCurrency]) {
                        newPrices[`${id}-${vsCurrency}`] = data[id as string][vsCurrency];
                    }
                }

                globalPricesCache = newPrices;
                lastFetchTime = now;
                setPrices(newPrices);
            } catch (error) {
                // Rate limits or CORS issues can throw Failed to fetch
                console.warn("Error fetching crypto prices (possibly rate limited):", error);

                // Update fetch time so we don't spam the API on failure
                lastFetchTime = now;
            } finally {
                setLoading(false);
            }
        };

        fetchPrices();
    }, [wallets, baseCurrency]);

    // Format output: return { "bitcoin": 65000, "ethereum": 3500 } based on the current base currency
    const currentPrices = useMemo(() => {
        const result: Record<string, number> = {};
        const vsCurrency = baseCurrency.toLowerCase();

        for (const key in prices) {
            if (key.endsWith(`-${vsCurrency}`)) {
                const id = key.replace(`-${vsCurrency}`, "");
                result[id] = prices[key];
            }
        }
        return result;
    }, [prices, baseCurrency]);

    return { prices: currentPrices, loading };
}
