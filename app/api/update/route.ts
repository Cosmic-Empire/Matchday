import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST() {
  try {
    console.log('Updating all leagues...');

    const month = new Date().getMonth();
    const season = month >= 7
      ? new Date().getFullYear()
      : new Date().getFullYear() - 1;

      const leagueMap: Record<string, number> = {
  'Premier League': 39,
  'La Liga': 140,
  'Bundesliga': 78,
  'Serie A': 135,
  'Ligue 1': 61,
};

    for (const league of Object.keys(leagueMap)) {
      const leagueId = leagueMap[league];

      const res = await fetch(
        `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
        {
          headers: {
            'x-apisports-key': process.env.FOOTBALL_API_KEY!,
          },
        }
      );

      
      console.log("SEASON USED:", season);

const data = await res.json();

console.log("API RAW:", JSON.stringify(data, null, 2));

const table = data.response?.[0]?.league?.standings?.[0];

      if (!table) continue;

      await supabase.from('standings').delete().eq('league', league);

      const rows = table.slice(0, 10).map((team: any) => ({
        league,
        rank: team.rank,
        team: team.team.name,
        logo: team.team.logo,
        points: team.points,
        played: team.all.played,
        won: team.all.win,
        drawn: team.all.draw,
        lost: team.all.lose,
        gd: team.goalsDiff,
      }));

      await supabase.from('standings').insert(rows);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}