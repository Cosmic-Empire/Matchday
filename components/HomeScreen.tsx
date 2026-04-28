'use client';

import { useState, useEffect, useRef} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTeamName } from '@/lib/formatTeamName';
import { useSettings } from "@/hooks/useSettings";
import { useMemo } from "react";
import { createClient } from '@/utils/supabase/client';

const LEAGUE_COLORS: Record<string, { bg: string; accent: string }> = {
  'Premier League': { bg: '#3d0066', accent: '#9b30ff' },
  'La Liga': { bg: '#8b1a00', accent: '#ff4d1a' },
  'Bundesliga': { bg: '#6b0000', accent: '#ff2222' },
  'Serie A': { bg: '#00156b', accent: '#2255ff' },
  'Ligue 1': { bg: '#000d2b', accent: '#3355aa' },
};

const LEAGUES = Object.keys(LEAGUE_COLORS);

interface Standing {
  rank: number;
  team: string;
  points: number;
  played: number;
}

interface LeagueData {
  name: string;
  table: Standing[];
}

export default function HomeScreen() {
  const supabase = createClient();
  const { settings, setSettings } = useSettings();

  const [standings, setStandings] = useState<LeagueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<LeagueData | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const subHeaderRef = useRef<HTMLDivElement | null>(null);
  const [showPill, setShowPill] = useState(false);

  const enabledLeagues = useMemo(() => {
    return LEAGUES.filter((league) => settings?.leagues?.[league]);
  }, [settings.leagues]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { setShowPill(!entry.isIntersecting); },
      { threshold: 0 }
    );
    if (subHeaderRef.current) observer.observe(subHeaderRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const results = await Promise.allSettled(
          enabledLeagues.map(async (league) => {
            const res = await fetch(`/api/standings?league=${encodeURIComponent(league)}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            return { name: league, table: data.table || [] };
          })
        );
        setStandings(results.map(r => r.status === 'fulfilled' ? r.value : { name: 'Unknown', table: [] }));
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [settings.leagues]);

  const handleSignOut = async () => {
    localStorage.removeItem('matchday_guest');
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] via-[#0B0B0F] to-[#07070A]">

      {/* HEADER */}
      <div className="px-5 pt-14 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00FF87] flex items-center justify-center">
              <span className="text-black font-black text-sm">MD</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Matchday</span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center"
          >
            ⚙️
          </button>
        </div>
        <div className="h-3" />
        <div ref={subHeaderRef} className="text-white text-lg font-semibold">
          League Standings
        </div>
      </div>

      {showPill && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-30"
        >
          <div className="px-4 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
            <span className="text-white text-sm font-medium">League Standings</span>
          </div>
        </motion.div>
      )}

      {/* CONTENT */}
      <div className="px-5 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
              <span className="text-zinc-500 text-sm">Loading standings...</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {standings.map((league) => {
              const { bg, accent } = LEAGUE_COLORS[league.name];
              return (
                <div
                  key={league.name}
                  onClick={() => setSelectedLeague(league)}
                  className="rounded-2xl overflow-hidden cursor-pointer shadow-lg border border-white/10"
                  style={{ background: `linear-gradient(135deg, ${bg}, ${accent}55)`, boxShadow: `0 10px 25px rgba(0,0,0,0.35)` }}
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-white font-bold text-sm">{league.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${accent}22`, color: accent }}>
                      2025/26
                    </span>
                  </div>
                  <div className="flex items-center px-4 py-2" style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
                    <span className="text-zinc-400 text-xs w-6">#</span>
                    <span className="text-zinc-400 text-xs flex-1">Team</span>
                    <span className="text-zinc-400 text-xs w-8 text-center">P</span>
                    <span className="text-zinc-400 text-xs w-8 text-center font-bold">PTS</span>
                  </div>
                  {league.table.length === 0 ? (
                    <div className="px-4 py-4 text-center">
                      <span className="text-zinc-500 text-xs">No data — run update</span>
                    </div>
                  ) : (
                    league.table.slice(0, 4).map((row, i) => (
                      <div
                        key={`${league.name}-${formatTeamName(row.team)}-${row.rank}`}
                        className="flex items-center px-4 py-2.5 hover:bg-white/5 transition"
                        style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                      >
                        <span className="text-zinc-400 text-xs w-6">{row.rank}</span>
                        <span className="text-white text-sm font-medium flex-1">{formatTeamName(row.team)}</span>
                        <span className="text-zinc-400 text-xs w-8 text-center">{row.played}</span>
                        <span className="text-white text-sm font-bold w-8 text-center">{row.points}</span>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {selectedLeague && (
          <div className="fixed inset-0 z-50" onClick={() => setSelectedLeague(null)}>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed top-10 left-1/2 -translate-x-1/2 w-[88%] max-w-sm rounded-3xl overflow-hidden max-h-[80vh] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl"
              initial={{ y: "20%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "20%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-white/30 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-4 pb-3">
                <span className="text-white font-bold text-lg">{selectedLeague.name}</span>
                <button onClick={() => setSelectedLeague(null)} className="text-white/70 text-sm">Close</button>
              </div>
              <div className="overflow-y-auto max-h-[70vh]">
                {selectedLeague.table.map((row) => (
                  <div
                    key={`${selectedLeague.name}-${formatTeamName(row.team)}-${row.rank}`}
                    className="flex items-center px-4 py-3 border-t border-white/10"
                  >
                    <span className="text-zinc-300 text-xs w-6">{row.rank}</span>
                    <span className="text-white text-sm flex-1 truncate">{formatTeamName(row.team)}</span>
                    <span className="text-zinc-300 text-xs w-10 text-center">{row.played}</span>
                    <span className="text-white font-bold text-sm w-10 text-center">{row.points}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
            />

            {/* Modal — sits between top safe area and just above the dock */}
            <motion.div
              className="fixed left-1/2 -translate-x-1/2 w-[88%] max-w-sm rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col"
              style={{ top: '40px', bottom: '100px' }}
              initial={{ y: "20%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "20%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle + header — fixed inside modal */}
              <div className="flex-shrink-0">
                <div className="w-full flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>
                <div className="px-4 pb-3 flex items-center justify-between">
                  <span className="text-white font-bold text-lg">Settings</span>
                  <button onClick={() => setShowSettings(false)} className="text-zinc-400 text-sm">Close</button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">

                {/* LEAGUES */}
                <div>
                  <p className="text-white font-semibold text-md mb-1">Leagues</p>
                  <p className="text-xs text-zinc-400 mb-3">Choose what appears on your home screen</p>
                  <div className="space-y-3">
                    {Object.keys(settings.leagues ?? {}).map((league) => {
                      const enabled = settings?.leagues?.[league];
                      return (
                        <div key={league} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                          <span className="text-white text-sm font-medium">{league}</span>
                          <button
                            onClick={() =>
                              setSettings(prev => ({
                                ...prev,
                                leagues: { ...(prev.leagues ?? {}), [league]: !(prev.leagues?.[league] ?? true) }
                              }))
                            }
                            className={`w-11 h-6 flex items-center rounded-full transition ${enabled ? "bg-[#00FF87]" : "bg-white/10"}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition ${enabled ? "translate-x-5" : "translate-x-1"}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-zinc-400 mt-3">More leagues coming soon!</p>
                </div>

                {/* DATA */}
                <div>
                  <p className="text-white font-semibold text-md mb-3">Data</p>
                  <div className="space-y-3">
                    <button
                      onClick={async () => {
                        const res = await fetch("/api/update", { method: "POST" });
                        if (res.status === 429) { alert("Please wait before refreshing data again."); return; }
                      }}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm py-2 rounded-xl hover:bg-white/10 transition"
                    >
                      Refresh Data
                    </button>
                    <button
                      onClick={() => { localStorage.removeItem("matchday-settings"); window.location.reload(); }}
                      className="w-full bg-red-500/10 border border-red-500/30 text-red-300 text-sm py-2 rounded-xl"
                    >
                      Reset Settings
                    </button>
                  </div>
                </div>

                {/* ACCOUNT — only for logged in users */}
                {isLoggedIn && (
                  <div>
                    <p className="text-white font-semibold text-md mb-3">Account</p>
                    <button
                      onClick={handleSignOut}
                      className="w-full bg-white/5 border border-white/10 text-zinc-400 text-sm py-2 rounded-xl hover:bg-white/10 hover:text-white transition"
                    >
                      Sign Out
                    </button>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}