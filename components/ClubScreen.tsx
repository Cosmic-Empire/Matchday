'use client';

import { useState, useEffect, useMemo } from 'react';

interface Club {
  name: string;      // official football-data name e.g. "Arsenal FC"
  badge: string;
  league: string;
}

interface Standing {
  id: string;
  rank: number;
  team: string;      // official football-data name e.g. "Arsenal FC"
  logo: string;
  points: number;
  played: number;
  won: number;
  drawn: number;     // confirmed: "drawn" not "draw"
  lost: number;
  gd: number;
  league: string;
}

interface Fixture {
  id: string;
  home: string;      // confirmed: "home" not "home_team"
  away: string;      // confirmed: "away" not "away_team"
  homeScore: number | null;
  awayScore: number | null;
  date: string;      // confirmed: "date" e.g. "Mon, 20 Apr 2026"
  time: string | null;
  venue: string;
  status: string;
}

const POPULAR_CLUB_NAMES = [
  'Arsenal FC',
  'Manchester City FC',
  'Manchester United FC',
  'Liverpool FC',
  'Chelsea FC',
  'Real Madrid CF',
  'FC Barcelona',
  'Club Atlético de Madrid',
  'FC Bayern München',
  'AC Milan',
  'FC Internazionale Milano',
  'Paris Saint-Germain FC',
];

const DISPLAY_NAMES: Record<string, string> = {
  'Arsenal FC': 'Arsenal',
  'Manchester City FC': 'Man City',
  'Manchester United FC': 'Man United',
  'Liverpool FC': 'Liverpool',
  'Chelsea FC': 'Chelsea',
  'Real Madrid CF': 'Real Madrid',
  'FC Barcelona': 'Barcelona',
  'Club Atlético de Madrid': 'Atletico Madrid',
  'FC Bayern München': 'Bayern Munich',
  'AC Milan': 'AC Milan',
  'FC Internazionale Milano': 'Inter Milan',
  'Paris Saint-Germain FC': 'PSG',
  'Tottenham Hotspur FC': 'Tottenham',
  'Newcastle United FC': 'Newcastle',
  'Aston Villa FC': 'Aston Villa',
  'West Ham United FC': 'West Ham',
  'Wolverhampton Wanderers FC': 'Wolves',
  'Brighton & Hove Albion FC': 'Brighton',
  'Leicester City FC': 'Leicester',
  'Crystal Palace FC': 'Crystal Palace',
  'Everton FC': 'Everton',
  'Fulham FC': 'Fulham',
  'Brentford FC': 'Brentford',
  'AFC Bournemouth': 'Bournemouth',
  'Nottingham Forest FC': 'Nott\'m Forest',
  'Borussia Dortmund': 'Dortmund',
  'Juventus FC': 'Juventus',
  'AS Roma': 'Roma',
  'SS Lazio': 'Lazio',
  'SSC Napoli': 'Napoli',
  'Sevilla FC': 'Sevilla',
  'Real Betis Balompié': 'Real Betis',
  'Villarreal CF': 'Villarreal',
  'Bayer 04 Leverkusen': 'Leverkusen',
  'RB Leipzig': 'RB Leipzig',
  'Eintracht Frankfurt': 'Frankfurt',
  'Olympique de Marseille': 'Marseille',
  'Olympique Lyonnais': 'Lyon',
  'AS Monaco FC': 'Monaco',
  'LOSC Lille': 'Lille',
};

function dn(officialName: string): string {
  return DISPLAY_NAMES[officialName] || officialName;
}

// Normalize for fuzzy search — strips accents, FC/CF etc.
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(fc|cf|ac|as|rc|sc|cd|afc|bfc|club)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Used for matching saved club name against fixture home/away
// Both sides are official football-data names so exact match first, then fuzzy
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

export default function ClubScreen() {
  const [savedClub, setSavedClub] = useState<Club | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allTeams, setAllTeams] = useState<Club[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [fixtures, setFixtures] = useState<{ upcoming: Fixture[]; recent: Fixture[] }>({ upcoming: [], recent: [] });
  const [standing, setStanding] = useState<Standing | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('matchday_club');
    if (saved) setSavedClub(JSON.parse(saved));
    fetchAllTeams();
  }, []);

  useEffect(() => {
    if (savedClub) fetchClubData();
  }, [savedClub]);

  const fetchAllTeams = async () => {
    setLoadingTeams(true);
    try {
      // Use your existing standings-all route
      const res = await fetch('/api/standings-all');
      const data: Standing[] = await res.json();
      const teams: Club[] = (Array.isArray(data) ? data : []).map(t => ({
        name: t.team,
        badge: t.logo || '',
        league: t.league || '',
      }));
      setAllTeams(teams);
    } catch (e) { console.error(e); }
    setLoadingTeams(false);
  };

  const popularClubs = useMemo(() =>
    POPULAR_CLUB_NAMES
      .map(name => allTeams.find(t => t.name === name))
      .filter(Boolean) as Club[],
    [allTeams]
  );

  // Instant client-side search from first character
  const searchResults = useMemo(() => {
    if (searchQuery.length === 0) return [];
    const q = normalize(searchQuery);
    return allTeams.filter(t =>
      normalize(t.name).includes(q) ||
      normalize(dn(t.name)).includes(q)
    ).slice(0, 8);
  }, [searchQuery, allTeams]);

  const fetchClubData = async () => {
    if (!savedClub) return;
    setLoadingData(true);
    try {
      // Fetch fixtures
      const gamesRes = await fetch(`/api/games?league=${encodeURIComponent(savedClub.league)}`);
      const gamesData = await gamesRes.json();

      const filterByClub = (games: Fixture[]) =>
        games.filter(g =>
          g.home && g.away && (
            clubNamesMatch(g.home, savedClub.name) ||
            clubNamesMatch(g.away, savedClub.name)
          )
        );

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

      // Fetch standings — confirmed shape: { table: Standing[] }
      const standingsRes = await fetch(`/api/standings?league=${encodeURIComponent(savedClub.league)}`);
      const standingsData = await standingsRes.json();
      const table: Standing[] = standingsData.table || [];
      const clubStanding = table.find(s => clubNamesMatch(s.team, savedClub.name)) || null;
      setStanding(clubStanding);

    } catch (e) { console.error(e); }
    setLoadingData(false);
  };

  const selectClub = (club: Club) => {
    setSavedClub(club);
    localStorage.setItem('matchday_club', JSON.stringify(club));
    setSearchQuery('');
  };

  const changeClub = () => {
    setSavedClub(null);
    localStorage.removeItem('matchday_club');
    setFixtures({ upcoming: [], recent: [] });
    setStanding(null);
  };

  const zone = standing
    ? getZoneInfo(standing.rank, savedClub?.league || '')
    : null;

  const Header = ({ showChange }: { showChange: boolean }) => (
    <>
      <div className="relative px-5 pt-14 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00FF87] flex items-center justify-center">
            <span className="text-black font-black text-sm tracking-tighter">MD</span>
          </div>
          <span className={`text-white font-bold text-xl tracking-tight transition-all duration-300 ${scrolled ? 'opacity-0' : 'opacity-100'}`}>
            Your Club
          </span>
        </div>
        {showChange && (
          <button onClick={changeClub}
            className="text-zinc-500 text-xs border border-zinc-800 px-3 py-1.5 rounded-full hover:border-zinc-600 transition-colors">
            Change
          </button>
        )}
      </div>
      <div className="fixed left-1/2 top-6 -translate-x-1/2 z-50">
        <span className={`px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-white text-sm font-bold transition-all duration-300 ${scrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
          Your Club
        </span>
      </div>
    </>
  );

  // ── No club selected ──────────────────────────────────────────────────────
  if (!savedClub) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Header showChange={false} />
        <div className={`px-5 pb-8 transition-all duration-300 ${scrolled ? 'mt-25' : 'mt-0'}`}>
          <p className="text-zinc-500 text-sm mb-5">Search for your club or pick from popular teams</p>

          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
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
                  {club.badge ? (
                    <img src={club.badge} alt={club.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                      <span className="text-zinc-400 text-xs font-bold">{dn(club.name).slice(0,2).toUpperCase()}</span>
                    </div>
                  )}
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
                      {club.badge ? (
                        <img src={club.badge} alt={club.name} className="w-10 h-10 object-contain" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                          <span className="text-zinc-400 text-xs font-bold">{dn(club.name).slice(0,2).toUpperCase()}</span>
                        </div>
                      )}
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

  // ── Club selected ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header showChange={true} />
      <div className={`px-5 pb-8 transition-all duration-300 ${scrolled ? 'mt-18' : 'mt-0'}`}>

        {/* Club header card */}
        <div className="rounded-2xl p-5 mb-6 border overflow-hidden relative"
          style={{ backgroundColor: '#111111', borderColor: '#00FF8740' }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl bg-[#00FF87]" />
          <div className="flex items-center gap-4 relative">
            {savedClub.badge ? (
              <img src={savedClub.badge} alt={savedClub.name} className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
                <span className="text-zinc-400 font-bold">{dn(savedClub.name).slice(0,2).toUpperCase()}</span>
              </div>
            )}
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
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
