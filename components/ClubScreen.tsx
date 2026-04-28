'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface Club {
  name: string;
  badge: string;
  league: string;
}

interface Standing {
  id: string;
  rank: number;
  team: string;
  logo: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gd: number;
  league: string;
}

interface Fixture {
  id: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  date: string;
  time: string | null;
  venue: string;
  status: string;
}

const POPULAR_CLUB_NAMES = [
  'Arsenal FC', 'Manchester City FC', 'Manchester United FC', 'Liverpool FC',
  'Chelsea FC', 'Real Madrid CF', 'FC Barcelona', 'Club Atlético de Madrid',
  'FC Bayern München', 'AC Milan', 'FC Internazionale Milano', 'Paris Saint-Germain FC',
];

const DISPLAY_NAMES: Record<string, string> = {
  'Arsenal FC': 'Arsenal', 'Manchester City FC': 'Man City', 'Manchester United FC': 'Man United',
  'Liverpool FC': 'Liverpool', 'Chelsea FC': 'Chelsea', 'Real Madrid CF': 'Real Madrid',
  'FC Barcelona': 'Barcelona', 'Club Atlético de Madrid': 'Atletico Madrid',
  'FC Bayern München': 'Bayern Munich', 'AC Milan': 'AC Milan',
  'FC Internazionale Milano': 'Inter Milan', 'Paris Saint-Germain FC': 'PSG',
  'Tottenham Hotspur FC': 'Tottenham', 'Newcastle United FC': 'Newcastle',
  'Aston Villa FC': 'Aston Villa', 'West Ham United FC': 'West Ham',
  'Wolverhampton Wanderers FC': 'Wolves', 'Brighton & Hove Albion FC': 'Brighton',
  'Leicester City FC': 'Leicester', 'Crystal Palace FC': 'Crystal Palace',
  'Everton FC': 'Everton', 'Fulham FC': 'Fulham', 'Brentford FC': 'Brentford',
  'AFC Bournemouth': 'Bournemouth', 'Nottingham Forest FC': "Nott'm Forest",
  'Borussia Dortmund': 'Dortmund', 'Juventus FC': 'Juventus', 'AS Roma': 'Roma',
  'SS Lazio': 'Lazio', 'SSC Napoli': 'Napoli', 'Sevilla FC': 'Sevilla',
  'Real Betis Balompié': 'Real Betis', 'Villarreal CF': 'Villarreal',
  'Bayer 04 Leverkusen': 'Leverkusen', 'RB Leipzig': 'RB Leipzig',
  'Eintracht Frankfurt': 'Frankfurt', 'Olympique de Marseille': 'Marseille',
  'Olympique Lyonnais': 'Lyon', 'AS Monaco FC': 'Monaco', 'LOSC Lille': 'Lille',
};

function dn(officialName: string): string {
  return DISPLAY_NAMES[officialName] || officialName;
}

function normalize(name: string): string {
  return name.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(fc|cf|ac|as|rc|sc|cd|afc|bfc|club)\b/g, '')
    .replace(/\s+/g, ' ').trim();
}

function clubNamesMatch(fixtureName: string, savedName: string): boolean {
  if (fixtureName === savedName) return true;
  const nf = normalize(fixtureName);
  const ns = normalize(savedName);
  return nf === ns || nf.includes(ns) || ns.includes(nf);
}

function getZoneInfo(rank: number, league: string): { label: string; color: string } | null {
  const totalTeams = league === 'Bundesliga' ? 18 : 20;
  if (rank <= 4) return { label: 'Champions League spot', color: '#3b82f6' };
  if (rank === 5) return { label: 'Europa League spot', color: '#f97316' };
  if (rank === 6) return { label: 'Conference League spot', color: '#a855f7' };
  if (rank > totalTeams - 3) return { label: 'Relegation zone', color: '#ef4444' };
  return null;
}

// ── Header — defined OUTSIDE ClubScreen so ref stays stable ──────────────────
function ClubHeader({ logoRef, showPill, showChange, onChangeClub }: {
  logoRef: React.RefObject<HTMLDivElement | null>;
  showPill: boolean;
  showChange: boolean;
  onChangeClub: () => void;
}) {
  return (
    <>
      <div className="relative px-5 pt-14 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div ref={logoRef} className="w-9 h-9 rounded-xl bg-[#00FF87] flex items-center justify-center">
            <span className="text-black font-black text-sm tracking-tighter">MD</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Your Club</span>
        </div>
        {showChange && (
          <button onClick={onChangeClub}
            className="text-zinc-500 text-xs border border-zinc-800 px-3 py-1.5 rounded-full hover:border-zinc-600 transition-colors">
            Change
          </button>
        )}
      </div>

      <AnimatePresence>
        {showPill && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="px-4 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
              <span className="text-white text-sm font-bold">Your Club</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Guest locked screen ───────────────────────────────────────────────────────
function LockedScreen() {
  const supabase = createClient();

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
          <span className="text-4xl">🏆</span>
        </div>
        <h2 className="text-white font-black text-2xl tracking-tight mb-2">Your Club</h2>
        <p className="text-zinc-500 text-sm leading-relaxed mb-8">
          Sign in to track your favourite club — standings, upcoming fixtures, and recent results all in one place.
        </p>
        <div className="w-full space-y-2 mb-8">
          {[
            { icon: '📊', label: 'Live league standings & position' },
            { icon: '📅', label: 'Upcoming fixtures & kick-off times' },
            { icon: '⚽', label: 'Recent results with scores' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl px-4 py-3 opacity-60">
              <span className="text-lg">{icon}</span>
              <span className="text-zinc-400 text-sm">{label}</span>
            </div>
          ))}
        </div>
        <button onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold text-sm px-4 py-4 rounded-2xl hover:bg-zinc-100 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
        <p className="text-zinc-600 text-xs mt-4">Free to sign up · No credit card required</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ClubScreen() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [savedClub, setSavedClub] = useState<Club | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allTeams, setAllTeams] = useState<Club[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [fixtures, setFixtures] = useState<{ upcoming: Fixture[]; recent: Fixture[] }>({ upcoming: [], recent: [] });
  const [standing, setStanding] = useState<Standing | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const logoRef = useRef<HTMLDivElement>(null);
  const [showPill, setShowPill] = useState(false);

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setIsGuest(true);
        setAuthLoading(false);
        return;
      }
      setIsGuest(false);
      setUserId(user.id);
      setAuthLoading(false);
    });
  }, []);

  // IntersectionObserver on logo — re-observe when savedClub changes (header re-renders)
  useEffect(() => {
    const el = logoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowPill(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [savedClub]);

  // Fetch club from Supabase once we have userId
  useEffect(() => {
    if (!userId) return;
    fetchAllTeams();
    loadClubFromSupabase();
  }, [userId]);

  useEffect(() => {
    if (savedClub) fetchClubData();
  }, [savedClub]);

  const loadClubFromSupabase = async () => {
    const { data } = await supabase.from('profiles').select('favorite_club').eq('id', userId).single();
    if (data?.favorite_club) setSavedClub(data.favorite_club as Club);
  };

  const saveClubToSupabase = async (club: Club) => {
    await supabase.from('profiles').upsert({ id: userId, favorite_club: club });
  };

  const removeClubFromSupabase = async () => {
    await supabase.from('profiles').upsert({ id: userId, favorite_club: null });
  };

  const fetchAllTeams = async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch('/api/standings-all');
      const data: Standing[] = await res.json();
      const teams: Club[] = (Array.isArray(data) ? data : []).map(t => ({
        name: t.team, badge: t.logo || '', league: t.league || '',
      }));
      setAllTeams(teams);
    } catch (e) { console.error(e); }
    setLoadingTeams(false);
  };

  const popularClubs = useMemo(() =>
    POPULAR_CLUB_NAMES.map(name => allTeams.find(t => t.name === name)).filter(Boolean) as Club[],
    [allTeams]
  );

  const searchResults = useMemo(() => {
    if (searchQuery.length === 0) return [];
    const q = normalize(searchQuery);
    return allTeams.filter(t =>
      normalize(t.name).includes(q) || normalize(dn(t.name)).includes(q)
    ).slice(0, 8);
  }, [searchQuery, allTeams]);

  const fetchClubData = async () => {
    if (!savedClub) return;
    setLoadingData(true);
    try {
      const gamesRes = await fetch(`/api/games?league=${encodeURIComponent(savedClub.league)}`);
      const gamesData = await gamesRes.json();

      const filterByClub = (games: Fixture[]) =>
        games.filter(g => g.home && g.away && (
          clubNamesMatch(g.home, savedClub.name) || clubNamesMatch(g.away, savedClub.name)
        ));

      setFixtures({
        upcoming: filterByClub([
          ...(gamesData.today || []).filter((g: Fixture) => g.status !== 'FINISHED'),
          ...(gamesData.upcoming || []),
        ]),
        recent: filterByClub([
          ...(gamesData.today || []).filter((g: Fixture) => g.status === 'FINISHED'),
          ...(gamesData.yesterday || []),
        ]),
      });

      const standingsRes = await fetch(`/api/standings?league=${encodeURIComponent(savedClub.league)}`);
      const standingsData = await standingsRes.json();
      const table: Standing[] = standingsData.table || [];
      setStanding(table.find(s => clubNamesMatch(s.team, savedClub.name)) || null);
    } catch (e) { console.error(e); }
    setLoadingData(false);
  };

  const selectClub = (club: Club) => {
    setSavedClub(club);
    saveClubToSupabase(club);
    setSearchQuery('');
  };

  const changeClub = () => {
    setSavedClub(null);
    removeClubFromSupabase();
    setFixtures({ upcoming: [], recent: [] });
    setStanding(null);
  };

  const zone = standing ? getZoneInfo(standing.rank, savedClub?.league || '') : null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isGuest) return <LockedScreen />;

  // ── No club selected ───────────────────────────────────────────────────────
  if (!savedClub) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <ClubHeader logoRef={logoRef} showPill={showPill} showChange={false} onChangeClub={changeClub} />
        <div className="px-5 pb-8">
          <p className="text-zinc-500 text-sm mb-5">Search for your club or pick from popular teams</p>

          <div className="relative mb-4">
            <input
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search any club..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 pl-11 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-[#00FF87]"
            />
            <svg className="absolute left-4 top-3.5" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#52525b" strokeWidth="1.5"/>
              <path d="M16.5 16.5L21 21" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>

          {searchResults.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
              {searchResults.map((club, i) => (
                <button key={club.name} onClick={() => selectClub(club)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  {club.badge
                    ? <img src={club.badge} alt={club.name} className="w-8 h-8 object-contain" />
                    : <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center"><span className="text-zinc-400 text-xs font-bold">{dn(club.name).slice(0,2).toUpperCase()}</span></div>
                  }
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm font-semibold">{dn(club.name)}</p>
                    <p className="text-zinc-500 text-xs">{club.league}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18L15 12L9 6" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              ))}
            </div>
          )}

          {searchQuery.length > 0 && searchResults.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-4 mb-6">No clubs found for &quot;{searchQuery}&quot;</p>
          )}

          {searchQuery.length === 0 && (
            <>
              <h3 className="text-white font-bold text-sm mb-3">Popular Clubs</h3>
              {loadingTeams ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {popularClubs.map(club => (
                    <button key={club.name} onClick={() => selectClub(club)}
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center gap-2 hover:border-zinc-600 transition-colors">
                      {club.badge
                        ? <img src={club.badge} alt={club.name} className="w-10 h-10 object-contain" />
                        : <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center"><span className="text-zinc-400 text-xs font-bold">{dn(club.name).slice(0,2).toUpperCase()}</span></div>
                      }
                      <span className="text-white text-[10px] font-semibold text-center leading-tight">{dn(club.name)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Club selected ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <ClubHeader logoRef={logoRef} showPill={showPill} showChange={true} onChangeClub={changeClub} />
      <div className="px-5 pb-8">

        <div className="rounded-2xl p-5 mb-6 border overflow-hidden relative"
          style={{ backgroundColor: '#111111', borderColor: '#00FF8740' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl bg-[#00FF87]" />
          <div className="flex items-center gap-4 relative">
            {savedClub.badge
              ? <img src={savedClub.badge} alt={savedClub.name} className="w-16 h-16 object-contain" />
              : <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center"><span className="text-zinc-400 font-bold">{dn(savedClub.name).slice(0,2).toUpperCase()}</span></div>
            }
            <div className="flex-1">
              <h2 className="text-white font-bold text-xl">{dn(savedClub.name)}</h2>
              <p className="text-zinc-500 text-sm">{savedClub.league}</p>
              {standing ? (
                <>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="font-bold text-sm text-white">#{standing.rank}</span>
                    <span className="text-zinc-600 text-xs">·</span>
                    <span className="text-zinc-400 text-xs">{standing.points} pts</span>
                    <span className="text-zinc-600 text-xs">·</span>
                    <span className="text-zinc-400 text-xs">{standing.played} played</span>
                    <span className="text-zinc-600 text-xs">·</span>
                    <span className="text-zinc-400 text-xs">{standing.won}W {standing.drawn}D {standing.lost}L</span>
                  </div>
                  {zone && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }} />
                      <span className="text-xs font-medium" style={{ color: zone.color }}>{zone.label}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-zinc-600 text-xs mt-1.5">No standings data</p>
              )}
            </div>
          </div>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <h3 className="text-white font-bold text-base mb-3">Upcoming</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
              {fixtures.upcoming.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-zinc-500 text-sm">No upcoming fixtures found</p>
                </div>
              ) : (
                fixtures.upcoming.map((f, i) => (
                  <div key={f.id} className="px-4 py-3"
                    style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-semibold flex-1">{dn(f.home)}</span>
                      <span className="text-zinc-500 text-xs px-3">vs</span>
                      <span className="text-white text-sm font-semibold flex-1 text-right">{dn(f.away)}</span>
                    </div>
                    <p className="text-zinc-600 text-xs mt-1">{f.date} · {f.venue}</p>
                  </div>
                ))
              )}
            </div>

            <h3 className="text-white font-bold text-base mb-3">Recent Results</h3>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-24">
              {fixtures.recent.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-zinc-500 text-sm">No recent results found</p>
                </div>
              ) : (
                fixtures.recent.map((f, i) => (
                  <div key={f.id} className="px-4 py-3"
                    style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-semibold flex-1">{dn(f.home)}</span>
                      <span className="text-white font-black text-base px-3">{f.homeScore} - {f.awayScore}</span>
                      <span className="text-white text-sm font-semibold flex-1 text-right">{dn(f.away)}</span>
                    </div>
                    <p className="text-zinc-600 text-xs mt-1">{f.date} · {f.venue}</p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}