"use client";

import { useEffect, useState } from "react";

const DEFAULT_LEAGUES = {
  "Premier League": true,
  "La Liga": true,
  "Bundesliga": true,
  "Serie A": true,
  "Ligue 1": true,
};

type Settings = {
  leagues: Record<string, boolean>;
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => ({
    leagues: DEFAULT_LEAGUES,
  }));

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("matchday-settings");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        setSettings({
          leagues: {
            ...DEFAULT_LEAGUES,
            ...(parsed.leagues ?? {}),
          },
        });
      } catch {
        setSettings({ leagues: DEFAULT_LEAGUES });
      }
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem("matchday-settings", JSON.stringify(settings));
  }, [settings, loaded]);

  return { settings, setSettings };
}