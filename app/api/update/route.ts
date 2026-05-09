import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { venueMap } from '@/lib/venueMap'; // ← adjust path if needed

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const leagueMap: Record<string, string> = {
  'Premier League': 'PL',
  'La Liga': 'PD',
  'Bundesliga': 'BL1',
  'Serie A': 'SA',
  'Ligue 1': 'FL1',
};

const lastRunMap = new Map<string, number>();
const COOLDOWN_MS = 1000 * 60 * 60;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "local";
    const now = Date.now();
    const lastRun = lastRunMap.get(ip) || 0;

    if (now - lastRun < COOLDOWN_MS) {
      return NextResponse.json({ error: "Rate limit: try again later" }, { status: 429 });
    }

    lastRunMap.set(ip, now);

    for (const league of Object.keys(leagueMap)) {
      const code = leagueMap[league];

      // ── Standings ──────────────────────────────────────────
      const standingsRes = await fetch(
        `https://api.football-data.org/v4/competitions/${code}/standings`,
        { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! } }
      );
      const standingsData = await standingsRes.json();
      const table = standingsData?.standings?.find((s: any) => s.type === 'TOTAL')?.table;

      if (table) {
        await supabase.from('standings').delete().eq('league', league);
        const rows = table.slice(0, 10).map((team: any) => ({
          league,
          rank: team.position,
          team: team.team.name,
          logo: team.team.crest,
          points: team.points,
          played: team.playedGames,
          won: team.won,
          drawn: team.draw,
          lost: team.lost,
          gd: team.goalDifference,
        }));
        const { error } = await supabase.from('standings').insert(rows);
        if (error) console.error("Standings insert error:", error);
        else console.log(`✅ Inserted ${rows.length} standings rows for ${league}`);
      }

      // ── Matches ────────────────────────────────────────────
      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 2);
      const to = new Date(today);
      to.setDate(today.getDate() + 5);

      const matchRes = await fetch(
        `https://api.football-data.org/v4/competitions/${code}/matches` +
        `?dateFrom=${from.toISOString().split('T')[0]}` +
        `&dateTo=${to.toISOString().split('T')[0]}`,
        { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! } }
      );
      const matchData = await matchRes.json();
      const matches = matchData?.matches || [];

      const formattedMatches = matches
        .filter((m: any) => m.homeTeam?.name && m.awayTeam?.name)
        .map((m: any) => ({
          league,
          home_team: m.homeTeam.name,
          away_team: m.awayTeam.name,
          home_score: m.score?.fullTime?.home ?? null,
          away_score: m.score?.fullTime?.away ?? null,
          status: m.status,
          match_date: m.utcDate,
          // ← Look up venue by home team name, fall back to null
          venue: venueMap[m.homeTeam.name] ?? null,
        }));

      await supabase.from('fixtures').delete().eq('league', league);
      const { error: matchError } = await supabase.from('fixtures').insert(formattedMatches);
      if (matchError) console.error("Match insert error:", matchError);
      else console.log(`✅ Inserted ${formattedMatches.length} fixtures for ${league}`);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  return POST(new Request('http://localhost:3000/api/update', { method: 'POST' }) as any);
}