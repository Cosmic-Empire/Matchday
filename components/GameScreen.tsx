'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';


const LEAGUES = ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'];

// Realistic fallback game data
const FALLBACK_GAMES: Record<string, {
  today: { home: string; away: string; homeScore?: number; awayScore?: number; time: string; venue: string }[];
  upcoming: { home: string; away: string; time: string; date: string; venue: string }[];
  yesterday: { home: string; away: string; homeScore: number; awayScore: number; venue: string }[];
}> = {
  'Premier League': {
    today: [],
    upcoming: [
      { home: 'West Ham', away: 'Wolves', time: '7:00 PM', date: 'Thu, Apr 10', venue: 'London Stadium' },
      { home: 'Brighton', away: 'Brentford', time: '7:30 PM', date: 'Thu, Apr 10', venue: 'Amex Stadium' },
    ],
    yesterday: [
      { home: 'Arsenal', away: 'Chelsea', homeScore: 2, awayScore: 1, venue: 'Emirates Stadium' },
      { home: 'Liverpool', away: 'Man City', homeScore: 3, awayScore: 1, venue: 'Anfield' },
    ],
  },
  'La Liga': {
    today: [
      { home: 'Barcelona', away: 'Sevilla', time: '9:00 PM', venue: 'Camp Nou' },
    ],
    upcoming: [
      { home: 'Real Madrid', away: 'Atletico', time: '9:00 PM', date: 'Sat, Apr 12', venue: 'Bernabeu' },
    ],
    yesterday: [
      { home: 'Villarreal', away: 'Valencia', homeScore: 1, awayScore: 1, venue: 'Estadio de la Ceramica' },
    ],
  },
  'Bundesliga': {
    today: [],
    upcoming: [
      { home: 'Bayern Munich', away: 'Dortmund', time: '6:30 PM', date: 'Sat, Apr 12', venue: 'Allianz Arena' },
    ],
    yesterday: [
      { home: 'Bayer Leverkusen', away: 'RB Leipzig', homeScore: 2, awayScore: 0, venue: 'BayArena' },
    ],
  },
  'Serie A': {
    today: [],
    upcoming: [
      { home: 'Inter Milan', away: 'Juventus', time: '8:45 PM', date: 'Sun, Apr 13', venue: 'San Siro' },
    ],
    yesterday: [
      { home: 'Napoli', away: 'Roma', homeScore: 3, awayScore: 2, venue: 'Diego Armando Maradona' },
    ],
  },
  'Ligue 1': {
    today: [],
    upcoming: [
      { home: 'PSG', away: 'Marseille', time: '9:00 PM', date: 'Sun, Apr 13', venue: 'Parc des Princes' },
    ],
    yesterday: [
      { home: 'Lyon', away: 'Monaco', homeScore: 1, awayScore: 2, venue: 'Groupama Stadium' },
    ],
  },
};

export default function GamesScreen() {
  const [selectedLeague, setSelectedLeague] = useState('Premier League');
  const [showLeaguePicker, setShowLeaguePicker] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const games = FALLBACK_GAMES[selectedLeague] ?? { today: [], upcoming: [], yesterday: [] };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0A0A] via-[#0B0B0F] to-[#07070A]">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4 backdrop-blur-xl bg-black/30 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00FF87] flex items-center justify-center">
            <span className="text-black font-black text-sm tracking-tighter">MD</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Games</span>
        </div>

        {/* League selector */}
        <div className="relative">
          <button
            onClick={(e) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

  setDropdownPos({
    top: rect.bottom + 8,
    left: rect.left + rect.width / 2,
  });

  setShowLeaguePicker(!showLeaguePicker);
}}
            className="flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-md rounded-xl px-3 py-2 shadow-md hover:bg-white/10 transition"
          >
            <span className="text-white text-sm font-semibold">{selectedLeague}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={`transition-transform ${showLeaguePicker ? 'rotate-180' : ''}`}>
              <path d="M2 4L6 8L10 4" stroke="#00FF87" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Dropdown */}
          {showLeaguePicker &&
  typeof window !== 'undefined' &&
  createPortal(
    <div className="fixed" style={{ top: dropdownPos.top, left: dropdownPos.left, transform: 'translateX(-50%)', width: '13rem', background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.35)', zIndex: 9999 }}>
      {LEAGUES.map(league => (
        <button
          key={league}
          onClick={() => {
            setSelectedLeague(league);
            setShowLeaguePicker(false);
          }}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
        >
          <span className="text-white text-sm">{league}</span>

          {league === selectedLeague && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 7L5.5 10.5L12 3.5"
                stroke="#00FF87"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      ))}
    </div>,
    document.body
  )
}
        </div>
      </div>

      <div className="px-5 pb-8 flex flex-col gap-6">

        {/* TODAY */}
        <Section title="Today" accent="#00FF87">
          {games.today.length === 0 ? (
            <EmptyState message={`No ${selectedLeague} games today`} />
          ) : (
            games.today.map((g, i) => (
              <GameCard key={i}
                {...g}
                center={g.homeScore != null ? `${g.homeScore} - ${g.awayScore}` : g.time}
                sub={g.venue}
                isLive={g.homeScore != null}
              />
            ))
          )}
        </Section>

        {/* UPCOMING */}
        <Section title="Upcoming" accent="#60a5fa">
          {games.upcoming.length === 0 ? (
            <EmptyState message={`No upcoming ${selectedLeague} fixtures`} />
          ) : (
            games.upcoming.map((g, i) => (
              <GameCard key={i}
                {...g}
                center="vs"
                sub={`${g.date} · ${g.time}`}
              />
            ))
          )}
        </Section>

        {/* YESTERDAY */}
        <Section title="Yesterday" accent="#a78bfa">
          {games.yesterday.length === 0 ? (
            <EmptyState message={`No ${selectedLeague} results yesterday`} />
          ) : (
            games.yesterday.map((g, i) => (
              <GameCard key={i}
                {...g}
                center="FT"
                sub={g.venue}
              />
            ))
          )}
        </Section>

      </div>
    </div>
  );
}

/* ---------------- UI COMPONENTS ---------------- */

function Section({ title, accent, children }: {
  title: string; accent: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 rounded-full" style={{ backgroundColor: accent }} />
        <h2 className="text-white font-bold text-lg">{title}</h2>
      </div>

      <div className="rounded-2xl overflow-hidden bg-white/5 backdrop-blur-2xl border border-white/10 shadow-lg divide-y divide-white/10">
        {children}
      </div>
    </div>
  );
}

function GameCard({ home, away, homeScore, awayScore, center, sub, isLive }: any) {
  return (
    <div className="px-4 py-4 hover:bg-white/5 transition">
      <div className="flex items-center">

        <div className="flex-1 flex flex-col items-start gap-1">
          {homeScore != null && (
            <span className="text-white font-black text-3xl leading-none">{homeScore}</span>
          )}
          <span className="text-zinc-300 text-xs">{home}</span>
        </div>

        <div className="flex flex-col items-center px-4 min-w-[80px]">
          {isLive ? (
            <div className="flex items-center gap-1.5 bg-red-500/20 px-2 py-0.5 rounded-full mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-[10px] font-bold">LIVE</span>
            </div>
          ) : (
            <span className="text-zinc-400 text-sm font-semibold">{center}</span>
          )}
          {sub && <span className="text-zinc-500 text-[10px] mt-0.5">{sub}</span>}
        </div>

        <div className="flex-1 flex flex-col items-end gap-1">
          {awayScore != null && (
            <span className="text-white font-black text-3xl leading-none">{awayScore}</span>
          )}
          <span className="text-zinc-300 text-xs text-right">{away}</span>
        </div>

      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-zinc-500 text-sm">{message}</p>
    </div>
  );
}