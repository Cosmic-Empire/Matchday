import { NextResponse } from 'next/server';
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

export async function POST() {
  try {
    for (const league of Object.keys(leagueMap)) {
      const code = leagueMap[league];

      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - 2);
      const to = new Date(today);
      to.setDate(today.getDate() + 5);

      const res = await fetch(
        `https://api.football-data.org/v4/competitions/${code}/matches?dateFrom=${from.toISOString().split('T')[0]}&dateTo=${to.toISOString().split('T')[0]}`,
        {
          headers: {
            'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY!,
          },
        }
      );

      const data = await res.json();
      const matches = data?.matches || [];

      const formatted = matches.map((m: any) => ({
        league,
        home_team: m.homeTeam.name,
        away_team: m.awayTeam.name,
        home_logo: m.homeTeam.crest,
        away_logo: m.awayTeam.crest,
        home_score: m.score.fullTime.home,
        away_score: m.score.fullTime.away,
        match_date: m.utcDate.split('T')[0],
        match_time: m.utcDate.split('T')[1]?.slice(0, 5),
        venue: m.venue || "TBD",
        status: m.status,
      }));

      await supabase.from('fixtures').delete().eq('league', league);
      const { error } = await supabase.from('fixtures').insert(formatted);
      if (error) console.error(`Insert error for ${league}:`, error);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// Temporary - remove after testing
export async function GET() {
  return POST();
}