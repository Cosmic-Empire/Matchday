'use client';

import { useState, useEffect } from 'react';

interface Club {
  id: string;
  name: string;
  badge: string;
  league: string;
  country: string;
  color1?: string;
  color2?: string;
}

interface Standing {
  rank: number;
  team: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gd: number;
}

interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  match_time: string;
  venue: string;
  status: string;
}

// Popular club names only — badges fetched live so they're always correct
const POPULAR_CLUB_NAMES = [
  'Arsenal', 'Manchester City', 'Liverpool', 'Chelsea',
  'Real Madrid', 'Barcelona', 'Bayern Munich', 'PSG',
  'Manchester United', 'Juventus', 'Borussia Dortmund', 'AC Milan',
];

const NAME_ALIASES: Record<string, string> = {
  'man city': 'Manchester City',
  'man utd': 'Manchester United',
  'man united': 'Manchester United',
  'spurs': 'Tottenham Hotspur',
  'tottenham': 'Tottenham Hotspur',
  'barca': 'Barcelona',
  'fcb': 'Barcelona',
  'psg': 'Paris Saint-Germain',
  'inter': 'Internazionale',
  'inter milan': 'Internazionale',
  'atletico': 'Atletico Madrid',
  'atleti': 'Atletico Madrid',
  'dortmund': 'Borussia Dortmund',
  'bvb': 'Borussia Dortmund',
  'juve': 'Juventus',
  'wolves': 'Wolverhampton Wanderers',
  'newcastle': 'Newcastle United',
  'west ham': 'West Ham United',
  'leicester': 'Leicester City',
  'brighton': 'Brighton & Hove Albion',
  'villa': 'Aston Villa',
  'ac milan': 'AC Milan',
  'milan': 'AC Milan',
};

function resolveSearchQuery(query: string): string {
  const lower = query.toLowerCase().trim();
  return NAME_ALIASES[lower] || query;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  } catch { return dateStr; }
}

function getRankColor(rank: number, league: string): string {
  if (rank <= 4) return '#3b82f6';
  if (rank <= 6) return '#f97316';
  const totalTeams = league === 'Bundesliga' ? 18 : 20;
  if (rank > totalTeams - 3) return '#ef4444';
  return '#00FF87';
}

function getRankLabel(rank: number, league: string): string {
  if (rank <= 4) return 'UCL';
  if (rank <= 6) return 'UEL';
  const totalTeams = league === 'Bundesliga' ? 18 : 20;
  if (rank > totalTeams - 3) return 'REL';
  return '';
}

async function fetchClubByName(name: string): Promise<Club | null> {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(name)}`
    );
    const data = await res.json();
    const teams = (data.teams || []).filter((t: any) => t.strSport === 'Soccer');
    if (teams.length === 0) return null;
    // Find exact match first
    const exact = teams.find((t: any) => t.strTeam.toLowerCase() === name.toLowerCase()) || teams[0];
    return {
      id: exact.idTeam,
      name: exact.strTeam,
      badge: exact.strBadge || '',
      league: exact.strLeague || '',
      country: exact.strCountry || '',
      color1: exact.strColour1 || '',
      color2: exact.strColour2 || '',
    };
  } catch { return null; }
}

async function searchClubs(query: string): Promise<Club[]> {
  const resolved = resolveSearchQuery(query);
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(resolved)}`
    );
    const data = await res.json();
    const teams = data.teams || [];
    return teams
      .filter((t: any) => t.strSport === 'Soccer')
      .slice(0, 6)
      .map((t: any) => ({
        id: t.idTeam,
        name: t.strTeam,
        badge: t.strBadge || '',
        league: t.strLeague || '',
        country: t.strCountry || '',
        color1: t.strColour1 || '',
        color2: t.strColour2 || '',
      }));
  } catch { return []; }
}

export default function ClubScreen() {
  const [savedClub, setSavedClub] = useState<Club | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Club[]>([]);
  const [searching, setSearching] = useState(false);
  const [popularClubs, setPopularClubs] = useState<Club[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [fixtures, setFixtures] = useState<{ upcoming: Fixture[]; recent: Fixture[] }>({ upcoming: [], recent: [] });
  const [standing, setStanding] = useState<Standing | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const [scrolled, setScrolled] = useState(false);

useEffect(() => {
  const handleScroll = () => {
    setScrolled(window.scrollY > 40);
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

  useEffect(() => {
    const saved = localStorage.getItem('matchday_club');
    if (saved) setSavedClub(JSON.parse(saved));
    fetchPopularClubs();
  }, []);

  useEffect(() => {
    if (savedClub) fetchClubData();
  }, [savedClub]);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchClubs(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPopularClubs = async () => {
    setLoadingPopular(true);
    const clubs = await Promise.all(
      POPULAR_CLUB_NAMES.map(name => fetchClubByName(name))
    );
    setPopularClubs(clubs.filter(Boolean) as Club[]);
    setLoadingPopular(false);
  };

  const fetchClubData = async () => {
    if (!savedClub) return;
    setLoadingData(true);
    try {
      const leagueMap: Record<string, string> = {
        'English Premier League': 'Premier League',
        'Premier League': 'Premier League',
        'Spanish La Liga': 'La Liga',
        'La Liga': 'La Liga',
        'German Bundesliga': 'Bundesliga',
        'Bundesliga': 'Bundesliga',
        'Italian Serie A': 'Serie A',
        'Serie A': 'Serie A',
        'French Ligue 1': 'Ligue 1',
        'Ligue 1': 'Ligue 1',
      };
      const league = leagueMap[savedClub.league] || savedClub.league;

      const res = await fetch(`/api/games?league=${encodeURIComponent(league)}`);
      const data = await res.json();

      const clubName = savedClub.name.toLowerCase();
      const filterByClub = (games: Fixture[]) =>
        games.filter(g =>
          g.home_team.toLowerCase().includes(clubName) ||
          g.away_team.toLowerCase().includes(clubName) ||
          clubName.includes(g.home_team.toLowerCase()) ||
          clubName.includes(g.away_team.toLowerCase())
        );

      setFixtures({
        upcoming: filterByClub(data.upcoming || []),
        recent: filterByClub(data.yesterday || []),
      });

      const standingsRes = await fetch(`/api/standings?league=${encodeURIComponent(league)}`);
      const standingsData = await standingsRes.json();
      const clubStanding = (standingsData.table || []).find((s: Standing) =>
        s.team.toLowerCase().includes(clubName) ||
        clubName.includes(s.team.toLowerCase())
      );
      setStanding(clubStanding || null);
    } catch (e) { console.error(e); }
    setLoadingData(false);
  };

  const selectClub = (club: Club) => {
    setSavedClub(club);
    localStorage.setItem('matchday_club', JSON.stringify(club));
    setSearchQuery('');
    setSearchResults([]);
  };

  const changeClub = () => {
    setSavedClub(null);
    localStorage.removeItem('matchday_club');
    setFixtures({ upcoming: [], recent: [] });
    setStanding(null);
  };

  // No club selected
  if (!savedClub) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
       <div className="relative px-5 pt-14 pb-2 flex items-center justify-between">

  {/* LEFT */}
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-[#00FF87] flex items-center justify-center">
      <span className="text-black font-black text-sm tracking-tighter">MD</span>
    </div>

    <span
      className={`text-white font-bold text-xl tracking-tight transition-all duration-300 ${
        scrolled ? 'opacity-0' : 'opacity-100'
      }`}
    >
      Your Club
    </span>
  </div>

  {/* RIGHT */}
  {savedClub && (
    <button
      onClick={changeClub}
      className="text-zinc-500 text-xs border border-zinc-800 px-3 py-1.5 rounded-full hover:border-zinc-600 transition-colors"
    >
      Change
    </button>
  )}
</div>

<div className="fixed left-1/2 top-6 -translate-x-1/2 z-50">
  <span
    className={`px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-white text-sm font-bold transition-all duration-300 ${
      scrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
    }`}
  >
    Your Club
  </span>
</div>

        <div className={`px-5 pb-8 transition-all duration-300 ${scrolled ? 'mt-25' : 'mt-0'}`}>
          <p className="text-zinc-500 text-sm mb-5">Search for your club or pick from popular teams</p>

          {/* Search */}
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

          {searching && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
              {searchResults.map((club, i) => (
                <button key={club.id} onClick={() => selectClub(club)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors"
                  style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  {club.badge ? (
                    <img src={club.badge} alt={club.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                      <span className="text-zinc-400 text-xs font-bold">{club.name.slice(0,2).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="text-white text-sm font-semibold">{club.name}</p>
                    <p className="text-zinc-500 text-xs">{club.league} · {club.country}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18L15 12L9 6" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-4 mb-6">No clubs found for "{searchQuery}"</p>
          )}

          {/* Popular clubs grid */}
          {searchQuery.length === 0 && (
            <>
              <h3 className="text-white font-bold text-sm mb-3">Popular Clubs</h3>
              {loadingPopular ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {popularClubs.map(club => (
                    <button key={club.id} onClick={() => selectClub(club)}
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center gap-2 hover:border-zinc-600 transition-colors">
                      {club.badge ? (
                        <img src={club.badge} alt={club.name} className="w-10 h-10 object-contain" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                          <span className="text-zinc-400 text-xs font-bold">{club.name.slice(0,2).toUpperCase()}</span>
                        </div>
                      )}
                      <span className="text-white text-[10px] font-semibold text-center leading-tight">{club.name}</span>
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

  // Club selected page
  const leagueMap: Record<string, string> = {
    'English Premier League': 'Premier League',
    'Spanish La Liga': 'La Liga',
    'German Bundesliga': 'Bundesliga',
    'Italian Serie A': 'Serie A',
    'French Ligue 1': 'Ligue 1',
  };
  const mappedLeague = leagueMap[savedClub.league] || savedClub.league;
  const rankColor = standing ? getRankColor(standing.rank, mappedLeague) : '#00FF87';
  const rankLabel = standing ? getRankLabel(standing.rank, mappedLeague) : '';
  const clubColor = savedClub.color1 && savedClub.color1.startsWith('#') ? savedClub.color1 : '#00FF87';

  return (


    <div className="min-h-screen bg-[#0A0A0A]">
     <div className="relative px-5 pt-14 pb-2 flex items-center justify-between">

  {/* LEFT */}
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-[#00FF87] flex items-center justify-center">
      <span className="text-black font-black text-sm tracking-tighter">MD</span>
    </div>

    <span
      className={`text-white font-bold text-xl tracking-tight transition-all duration-300 ${
        scrolled ? 'opacity-0' : 'opacity-100'
      }`}
    >
      Your Club
    </span>
  </div>

  {/* RIGHT */}
  {savedClub && (
    <button
      onClick={changeClub}
      className="text-zinc-500 text-xs border border-zinc-800 px-3 py-1.5 rounded-full hover:border-zinc-600 transition-colors"
    >
      Change
    </button>
  )}
</div>

<div className="fixed left-1/2 top-6 -translate-x-1/2 z-50">
  <span
    className={`px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-white text-sm font-bold transition-all duration-300 ${
      scrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
    }`}
  >
    Your Club
  </span>
</div>

      <div className={`px-5 pb-8 transition-all duration-300 ${scrolled ? 'mt-18' : 'mt-0'}`}>
        {/* Club header card with color accent */}
        <div className="rounded-2xl p-5 mb-6 border overflow-hidden relative"
          style={{ backgroundColor: '#111111', borderColor: `${clubColor}40` }}>
          {/* Subtle color wash in top right */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl"
            style={{ backgroundColor: clubColor }} />
          <div className="flex items-center gap-4 relative">
            {savedClub.badge ? (
              <img src={savedClub.badge} alt={savedClub.name} className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
                <span className="text-zinc-400 font-bold">{savedClub.name.slice(0,2).toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-white font-bold text-xl">{savedClub.name}</h2>
              <p className="text-zinc-500 text-sm">{savedClub.league}</p>
              {standing && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm" style={{ color: rankColor }}>#{standing.rank}</span>
                    {rankLabel && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: `${rankColor}22`, color: rankColor }}>
                        {rankLabel}
                      </span>
                    )}
                  </div>
                  <span className="text-zinc-600 text-xs">·</span>
                  <span className="text-zinc-400 text-xs">{standing.points} pts</span>
                  <span className="text-zinc-600 text-xs">·</span>
                  <span className="text-zinc-400 text-xs">{standing.played} played</span>
                  <span className="text-zinc-600 text-xs">·</span>
                  <span className="text-zinc-400 text-xs">{standing.won}W {standing.drawn}D {standing.lost}L</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: clubColor, borderTopColor: 'transparent' }} />
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
                      <span className="text-white text-sm font-semibold flex-1">{f.home_team}</span>
                      <span className="text-zinc-500 text-xs px-3">vs</span>
                      <span className="text-white text-sm font-semibold flex-1 text-right">{f.away_team}</span>
                    </div>
                    <p className="text-zinc-600 text-xs mt-1">{formatDate(f.match_date)} · {f.venue}</p>
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
                      <span className="text-white text-sm font-semibold flex-1">{f.home_team}</span>
                      <span className="text-white font-black text-base px-3">{f.home_score} - {f.away_score}</span>
                      <span className="text-white text-sm font-semibold flex-1 text-right">{f.away_team}</span>
                    </div>
                    <p className="text-zinc-600 text-xs mt-1">{formatDate(f.match_date)} · {f.venue}</p>
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