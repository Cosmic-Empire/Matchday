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
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') || 'Premier League';

  const today = getDateStr(0);
  const yesterday = getDateStr(-1);

  const [todayRes, upcomingRes, yesterdayRes] = await Promise.all([
    supabase.from('fixtures').select('*').eq('league', league).eq('match_date', today),
    supabase.from('fixtures').select('*').eq('league', league).eq('status', 'upcoming').gte('match_date', today).order('match_date').limit(10),
    supabase.from('fixtures').select('*').eq('league', league).eq('match_date', yesterday),
  ]);

  // If yesterday empty, get last 5 results
  let yesterdayData = yesterdayRes.data || [];
  if (yesterdayData.length === 0) {
    const { data } = await supabase
      .from('fixtures')
      .select('*')
      .eq('league', league)
      .eq('status', 'finished')
      .lt('match_date', today)
      .order('match_date', { ascending: false })
      .limit(5);
    yesterdayData = data || [];
  }

  return NextResponse.json({
    today: todayRes.data || [],
    upcoming: upcomingRes.data || [],
    yesterday: yesterdayData,
  });
}