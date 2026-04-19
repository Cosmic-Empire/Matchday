import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function getDateStr(offset: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const league = searchParams.get('league') || 'Premier League';

    const now = new Date();

const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);

const startOfTomorrow = new Date();
startOfTomorrow.setDate(startOfToday.getDate() + 1);
startOfTomorrow.setHours(0, 0, 0, 0);

const startOfWeekAhead = new Date();
startOfWeekAhead.setDate(startOfToday.getDate() + 7);
startOfWeekAhead.setHours(0, 0, 0, 0);

    // 🔥 Better queries
    const [todayRes, upcomingRes, yesterdayRes] = await Promise.all([
      
      // ✅ TODAY (range, not eq)
      supabase
        .from('fixtures')
        .select('*')
        .eq('league', league)
        .gte('match_date', startOfToday.toISOString())
.lt('match_date', startOfTomorrow.toISOString()),

      // ✅ UPCOMING (just future, no status dependency)
      supabase
        .from('fixtures')
        .select('*')
        .eq('league', league)
        .gte('match_date', startOfTomorrow.toISOString())
.lt('match_date', startOfWeekAhead.toISOString())
        .order('match_date')
        .limit(10),

      // ✅ YESTERDAY (range, not eq)
      supabase
        .from('fixtures')
        .select('*')
        .eq('league', league)
        .lt('match_date', startOfToday.toISOString())
.order('match_date', { ascending: false })
.limit(10)
    ]);

    // 🔁 fallback if yesterday empty
    let yesterdayData = yesterdayRes.data || [];

    if (yesterdayData.length === 0) {
      const { data } = await supabase
        .from('fixtures')
        .select('*')
        .eq('league', league)
        .lt('match_date', startOfToday.toISOString())
        .order('match_date', { ascending: false })
        .limit(5);

      yesterdayData = data || [];
    }

    // 🎯 FORMAT FOR FRONTEND
  function formatGame(g: any) {
  const [year, month, day] = g.match_date.split('-').map(Number);
  const dateObj = new Date(Date.UTC(year, month - 1, day));

  return {
    id: g.id,
    league: g.league,
    home: g.home_team,
    away: g.away_team,
    homeLogo: g.home_logo,
    awayLogo: g.away_logo,
    homeScore: g.home_score,
    awayScore: g.away_score,
    venue: g.venue || "TBD",
    time: g.match_time,
    date: dateObj.toUTCString().slice(0, 16),
    status: g.status,
  };
}

    return NextResponse.json({
      today: (todayRes.data || []).map(formatGame),
      upcoming: (upcomingRes.data || []).map(formatGame),
      yesterday: (yesterdayData || []).map(formatGame),
    });

  } catch (err) {
    console.error("GET /api/games error:", err);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}