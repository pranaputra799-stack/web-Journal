"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

// The theme lives on <html data-theme>, which is an external store. Reading it
// through useSyncExternalStore keeps React in sync without a setState inside an
// effect, and without a hydration mismatch.

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem("theme", next);
    } catch {
      // Private mode can refuse storage. The theme still applies for this visit.
    }
    for (const listener of listeners) listener();
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="flex h-8 w-8 items-center justify-center text-muted hover:text-paper hover:bg-raised rounded"
        title={`Tema: ${theme === "dark" ? "gelap" : "terang"} (klik untuk ubah)`}
        aria-label={`Ganti ke tema ${theme === "dark" ? "terang" : "gelap"}`}
      >
        {theme === "dark" ? (
          // Moon icon
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : (
          // Sun icon
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="num text-xs text-muted hover:text-paper"
      aria-label={`Ganti ke tema ${theme === "dark" ? "terang" : "gelap"}`}
    >
      {theme === "dark" ? "Tema: gelap" : "Tema: terang"}
    </button>
  );
}
