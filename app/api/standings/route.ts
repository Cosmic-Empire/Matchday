import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') || 'Premier League';

  const { data, error } = await supabase
    .from('standings')
    .select('*')
    .eq('league', league)
    .order('rank', { ascending: true })
    .limit(10);

  if (error) {
    console.error('[standings] Supabase error:', error);
    return NextResponse.json({ table: [] });
  }

  return NextResponse.json({ table: data || [] });
}