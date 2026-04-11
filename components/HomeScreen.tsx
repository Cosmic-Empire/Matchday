'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

console.log("HOME SCREEN RENDERED");


const LEAGUE_COLORS: Record<string, { bg: string; accent: string }> = {
  'Premier League': { bg: '#3d0066', accent: '#9b30ff' },
  'La Liga':        { bg: '#8b1a00', accent: '#ff4d1a' },
  'Bundesliga':     { bg: '#6b0000', accent: '#ff2222' },
  'Serie A':        { bg: '#00156b', accent: '#2255ff' },
  'Ligue 1':        { bg: '#000d2b', accent: '#3355aa' },
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
  const [standings, setStandings] = useState<LeagueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<LeagueData | null>(null);

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
  const fetchAll = async () => {
    try {
      const results = await Promise.allSettled(
        LEAGUES.map(async (league) => {
          const res = await fetch(`/api/standings?league=${encodeURIComponent(league)}`);

          if (!res.ok) {
            throw new Error(`Failed for ${league}`);
          }

          const data = await res.json();

          return { name: league, table: data.table || [] };
        })
      );

      const formatted = results.map(result =>
        result.status === 'fulfilled'
          ? result.value
          : { name: 'Unknown', table: [] }
      );

      setStandings(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false); // 🔥 THIS guarantees your UI unfreezes
    }
  };

  fetchAll();
}, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] via-[#0B0B0F] to-[#07070A]">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-14 pb-4 bg-[#0A0A0A]/60 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00FF87] flex items-center justify-center">
            <span className="text-black font-black text-sm tracking-tighter">MD</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Matchday</span>
        </div>
        {/* Settings icon — placeholder for now */}
        <button
  onClick={() => setShowSettings(true)}
  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center shadow-md"
>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#71717a" strokeWidth="1.5"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="#71717a" strokeWidth="1.5"/>
          </svg>
        </button>
      </div>

      <div className="px-5 pb-8">
        <h2 className="text-white font-bold text-lg mb-4">League Standings</h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
              <span className="text-zinc-500 text-sm">Loading standings...</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {standings.map(league => {
              const { bg, accent } = LEAGUE_COLORS[league.name];
              return (
               <div
  key={league.name}
  onClick={() => setSelectedLeague(league)}
  className="rounded-2xl overflow-hidden cursor-pointer shadow-lg border border-white/10"
style={{
  background: `linear-gradient(135deg, ${bg}, ${accent}55)`,
  boxShadow: `0 10px 25px rgba(0,0,0,0.35)`,
}}
>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-white font-bold text-sm">{league.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
  backgroundColor: `${accent}22`,
  color: accent,
  boxShadow: "none",
}}>
                      2025/26
                    </span>
                  </div>
                  <div className="flex items-center px-4 py-2" style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}>
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
                      <div key={row.team} className="flex items-center px-4 py-2.5 hover:bg-white/5 transition"
                        style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                        <span className="text-zinc-400 text-xs w-6">{row.rank}</span>
                        <span className="text-white text-sm font-medium flex-1">{row.team}</span>
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

      <AnimatePresence>
  {selectedLeague && (
    <div
      className="fixed inset-0 z-50"
      onClick={() => setSelectedLeague(null)}
    >
      {/* Background blur */}
      <motion.div
       className="fixed inset-0 bg-black/60 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Mobile sheet */}
      <motion.div
  className="fixed top-10 left-1/2 -translate-x-1/2 w-[88%] max-w-sm rounded-3xl overflow-hidden max-h-[80vh] bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl"
  initial={{ y: "20%", opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ y: "20%", opacity: 0 }}
  transition={{ type: "spring", damping: 25, stiffness: 300 }}
  onClick={(e) => e.stopPropagation()}
>
        {/* drag handle */}
        <div className="w-full flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-white font-bold text-lg">
            {selectedLeague.name}
          </span>

          <button
            onClick={() => setSelectedLeague(null)}
            className="text-white/70 text-sm"
          >
            Close
          </button>
        </div>

        {/* Table header */}
        <div className="flex items-center px-4 py-2 bg-black/30">
          <span className="text-xs text-zinc-400 w-6">#</span>
          <span className="text-xs text-zinc-400 flex-1">Team</span>
          <span className="text-xs text-zinc-400 w-10 text-center">P</span>
          <span className="text-xs text-zinc-400 w-10 text-center">PTS</span>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[70vh]">
          {selectedLeague.table.map((row) => (
            <div
              key={row.team}
              className="flex items-center px-4 py-3 border-t border-white/10"
            >
              <span className="text-zinc-300 text-xs w-6">
                {row.rank}
              </span>

              <span className="text-white text-sm flex-1 truncate">
                {row.team}
              </span>

              <span className="text-zinc-300 text-xs w-10 text-center">
                {row.played}
              </span>

              <span className="text-white font-bold text-sm w-10 text-center">
                {row.points}
              </span>
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
      
      {/* Background blur */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowSettings(false)}
      />

      {/* Settings panel */}
      <motion.div
        className="fixed top-10 left-1/2 -translate-x-1/2 w-[88%] max-w-sm rounded-3xl overflow-hidden bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl"
        initial={{ y: "20%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "20%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* Handle */}
        <div className="w-full flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <span className="text-white font-bold text-lg">Settings</span>

          <button
            onClick={() => setShowSettings(false)}
            className="text-zinc-400 text-sm"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-6 space-y-4">

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md hover:bg-white/10 transition">
            <p className="text-sm text-white">Default League</p>
            <p className="text-xs text-zinc-400">Premier League</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md hover:bg-white/10 transition">
            <p className="text-sm text-white">Compact Mode</p>
            <p className="text-xs text-zinc-400">Top 4 standings view</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md hover:bg-white/10 transition">
            <p className="text-sm text-white">Data Refresh</p>
            <p className="text-xs text-zinc-400">Auto-updating enabled</p>
          </div>

        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
  </div>
)}