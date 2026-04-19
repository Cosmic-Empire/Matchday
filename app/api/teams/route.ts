import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  // Pull all teams from standings — they already have name + logo from football-data
  const { data, error } = await supabase
    .from('standings')
    .select('team, logo, league')
    .order('league');

  if (error) return NextResponse.json({ error }, { status: 500 });

  // Deduplicate by team name (shouldn't be dupes but just in case)
  const seen = new Set<string>();
  const teams = (data || []).filter(row => {
    if (seen.has(row.team)) return false;
    seen.add(row.team);
    return true;
  });

  return NextResponse.json({ teams });
}