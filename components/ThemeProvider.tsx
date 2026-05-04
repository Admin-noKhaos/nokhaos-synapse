'use client';

// Reads accent + theme prefs from localStorage and applies them on mount.
// Exposes a tiny context so children can read/write the prefs.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ACCENTS, type AccentKey, applyAccent, applyTheme, DEFAULT_ACCENT, DEFAULT_THEME, type ThemeMode } from '@/lib/theme';

const KEY = 'synapse_theme_v1';

type Prefs = { accent: AccentKey; mode: ThemeMode };

const Ctx = createContext<{
  prefs: Prefs;
  setAccent: (k: AccentKey) => void;
  setMode: (m: ThemeMode) => void;
  toggleMode: () => void;
} | null>(null);

function readPrefs(): Prefs {
  if (typeof window === 'undefined') return { accent: DEFAULT_ACCENT, mode: DEFAULT_THEME };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return {
        accent: (p.accent && p.accent in ACCENTS ? p.accent : DEFAULT_ACCENT) as AccentKey,
        mode: p.mode === 'light' ? 'light' : 'dark',
      };
    }
  } catch {}
  return { accent: DEFAULT_ACCENT, mode: DEFAULT_THEME };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>({ accent: DEFAULT_ACCENT, mode: DEFAULT_THEME });

  // Initial read happens client-side; apply immediately
  useEffect(() => {
    const p = readPrefs();
    setPrefs(p);
    applyAccent(p.accent);
    applyTheme(p.mode);
  }, []);

  const setAccent = useCallback((accent: AccentKey) => {
    setPrefs((p) => {
      const next = { ...p, accent };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      applyAccent(accent);
      return next;
    });
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setPrefs((p) => {
      const next = { ...p, mode };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      applyTheme(mode);
      return next;
    });
  }, []);

  const toggleMode = useCallback(() => {
    setPrefs((p) => {
      const mode: ThemeMode = p.mode === 'dark' ? 'light' : 'dark';
      const next = { ...p, mode };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      applyTheme(mode);
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ prefs, setAccent, setMode, toggleMode }}>{children}</Ctx.Provider>
  );
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme outside ThemeProvider');
  return v;
}
