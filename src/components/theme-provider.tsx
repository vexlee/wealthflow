"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "system",
    setTheme: () => { },
    resolvedTheme: "light",
});

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("system");
    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem("wealthflow-theme") as Theme | null;
        if (stored) {
            setThemeState(stored);
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;

        const applyTheme = (resolved: "light" | "dark") => {
            if (resolved === "dark") {
                root.classList.add("dark");
            } else {
                root.classList.remove("dark");
            }
            setResolvedTheme(resolved);
        };

        if (theme === "system") {
            const media = window.matchMedia("(prefers-color-scheme: dark)");
            applyTheme(media.matches ? "dark" : "light");

            const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light");
            media.addEventListener("change", handler);
            return () => media.removeEventListener("change", handler);
        } else {
            applyTheme(theme);
        }
    }, [theme, mounted]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem("wealthflow-theme", newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
