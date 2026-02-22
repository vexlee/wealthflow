import { useState, useEffect, useMemo, useRef } from "react";
import type { Wallet } from "@/types/database";

// Shared cache with keyed entries to prevent race conditions
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 1 minute

// Track in-flight requests to deduplicate concurrent fetches
let activeRequest: Promise<Record<string, Record<string, number>>> | null = null;
let activeRequestKey = "";

export function useCryptoPrices(wallets: Wallet[], baseCurrency: string) {
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const fetchPrices = async () => {
            if (!wallets || wallets.length === 0) return;

            const cryptoWallets = wallets.filter(w => w.type === "crypto");
            if (cryptoWallets.length === 0) return;

            const cryptoIds = Array.from(new Set(cryptoWallets.map(w => w.currency_code))).filter(Boolean);
            if (cryptoIds.length === 0) return;

            const vsCurrency = baseCurrency.toLowerCase();
            const now = Date.now();

            // Check cache — only use it if ALL needed entries exist and are fresh
            const cached: Record<string, number> = {};
            let allCached = true;
            for (const id of cryptoIds) {
                const key = `${id}-${vsCurrency}`;
                const entry = priceCache.get(key);
                if (entry && now - entry.timestamp < CACHE_DURATION) {
                    cached[id as string] = entry.price;
                } else {
                    allCached = false;
                    break;
                }
            }

            if (allCached) {
                setPrices(cached);
                setError(null);
                return;
            }

            // Build a request key to deduplicate concurrent fetches
            const requestKey = `${cryptoIds.sort().join(",")}-${vsCurrency}`;

            try {
                setLoading(true);
                setError(null);

                let data: Record<string, Record<string, number>>;

                // Reuse an in-flight request if it matches
                if (activeRequest && activeRequestKey === requestKey) {
                    data = await activeRequest;
                } else {
                    // Cancel previous in-flight request if it doesn't match
                    if (abortRef.current) {
                        abortRef.current.abort();
                    }
                    const controller = new AbortController();
                    abortRef.current = controller;

                    const fetchPromise = fetch(
                        `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoIds.join(",")}&vs_currencies=${vsCurrency}`,
                        { signal: controller.signal }
                    ).then(async (response) => {
                        if (!response.ok) throw new Error("Failed to fetch crypto prices");
                        return response.json();
                    });

                    activeRequest = fetchPromise;
                    activeRequestKey = requestKey;

                    data = await fetchPromise;

                    // Clear the active request reference so future fetches start fresh
                    activeRequest = null;
                    activeRequestKey = "";
                }

                const newPrices: Record<string, number> = {};
                const fetchTimestamp = Date.now();

                for (const id of cryptoIds) {
                    if (data[id as string] && data[id as string][vsCurrency]) {
                        const price = data[id as string][vsCurrency];
                        newPrices[id as string] = price;
                        // Update cache per-entry with individual timestamps
                        priceCache.set(`${id}-${vsCurrency}`, { price, timestamp: fetchTimestamp });
                    }
                }

                setPrices(newPrices);
            } catch (err: unknown) {
                // Don't treat aborted requests as errors
                if (err instanceof DOMException && err.name === "AbortError") return;

                const message = err instanceof Error ? err.message : "Failed to fetch crypto prices";
                const isRateLimit = message.includes("429") || message.includes("rate");
                setError(isRateLimit ? "Crypto prices temporarily unavailable (rate limited)" : message);

                // Clear active request on failure
                activeRequest = null;
                activeRequestKey = "";
            } finally {
                setLoading(false);
            }
        };

        fetchPrices();

        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
            }
        };
    }, [wallets, baseCurrency]);

    return { prices, loading, error };
}
