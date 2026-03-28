import { useState, useCallback } from "react";

export type NavMode = "create" | "work";

const STORAGE_KEY = "thrivein-nav-mode";

export function useNavMode() {
  const [mode, setModeState] = useState<NavMode>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as NavMode) || "create";
    } catch {
      return "create";
    }
  });

  const setMode = useCallback((m: NavMode) => {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}
  }, []);

  const toggle = useCallback(() => {
    setMode(mode === "create" ? "work" : "create");
  }, [mode, setMode]);

  return { mode, setMode, toggle };
}
