import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const league = searchParams.get("league");

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('league', league);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const now = new Date();

  const result = {
    today: [] as any[],
    upcoming: [] as any[],
    yesterday: [] as any[],
  };

  data.forEach((m: any) => {
    const matchDate = new Date(m.utcDate);

    if (m.status === "LIVE") {
      result.today.push(m);
    } else if (matchDate.toDateString() === now.toDateString()) {
      result.today.push(m);
    } else if (matchDate > now) {
      result.upcoming.push({
        ...m,
        date: matchDate.toDateString(),
        time: matchDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      });
    } else {
      result.yesterday.push(m);
    }
  });

  return NextResponse.json(result);
}