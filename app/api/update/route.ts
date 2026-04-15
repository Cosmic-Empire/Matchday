import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const ip =
      req.headers.get("x-forwarded-for") ||
      "local";

    const now = Date.now();
    const lastRun = lastRunMap.get(ip) || 0;

    if (now - lastRun < COOLDOWN_MS) {
      return NextResponse.json(
        { error: "Rate limit: try again later" },
        { status: 429 }
      );
    }

    lastRunMap.set(ip, now);

    console.log("Updating standings from Football-Data.org...");

    for (const league of Object.keys(leagueMap)) {
      const code = leagueMap[league];

      const res = await fetch(
        `https://api.football-data.org/v4/competitions/${code}/standings`,
        {
          headers: {
            'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY!,
          },
        }
      );

      const data = await res.json();

      console.log("FULL RESPONSE FOR", league, data);

      const table =
        data?.standings?.find((s: any) => s.type === 'TOTAL')?.table;

      if (!table) {
        console.log(`No data for ${league}`);
        continue;
      }

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

      if (error) {
        console.error("Supabase insert error:", error);
      }
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}