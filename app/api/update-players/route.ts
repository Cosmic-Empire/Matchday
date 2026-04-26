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

// Map football-data positions to our simplified positions
function mapPosition(pos: string | null): string {
  if (!pos) return 'MID'; // default unknown to MID rather than dropping them
  const p = pos.toLowerCase();
  if (p.includes('goalkeeper') || p.includes('keeper')) return 'GK';
  if (p.includes('defence') || p.includes('defender') || p.includes('back')) return 'DEF';
  if (p.includes('midfield')) return 'MID';
  if (p.includes('offence') || p.includes('forward') || p.includes('winger') || p.includes('striker') || p.includes('attack')) return 'FWD';
  return 'MID'; // default anything else to MID
}

const lastRunMap = new Map<string, number>();
const COOLDOWN_MS = 1000 * 60 * 60;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const now = Date.now();
    const lastRun = lastRunMap.get(ip) || 0;

    if (now - lastRun < COOLDOWN_MS) {
      return NextResponse.json({ error: 'Rate limit: try again later' }, { status: 429 });
    }

    lastRunMap.set(ip, now);

    const allPlayers: any[] = [];

    for (const league of Object.keys(leagueMap)) {
      const code = leagueMap[league];

      // Fetch all teams in the competition with their squads
      const teamsRes = await fetch(
        `https://api.football-data.org/v4/competitions/${code}/teams`,
        { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY! } }
      );
      const teamsData = await teamsRes.json();
      const teams = teamsData?.teams || [];

      for (const team of teams) {
        const squad = team.squad || [];
        for (const player of squad) {
          allPlayers.push({
            id: String(player.id),
            name: player.name,
            team: team.name,
            team_id: String(team.id),
            league,
            position: mapPosition(player.position),
            goals: 0,
            assists: 0,
            clean_sheets: 0,
            points: 0,
          });
        }
      }
    }

    if (allPlayers.length === 0) {
      return NextResponse.json({ error: 'No players found' }, { status: 500 });
    }

    // Clear and re-insert all players
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .neq('id', '0'); // delete all rows

    if (deleteError) console.error('Delete error:', deleteError);

    // Insert in batches of 500 to avoid payload limits
    const batchSize = 500;
    for (let i = 0; i < allPlayers.length; i += batchSize) {
      const batch = allPlayers.slice(i, i + batchSize);
      const { error } = await supabase.from('players').insert(batch);
      if (error) console.error(`Insert error (batch ${i}):`, error);
    }

    return NextResponse.json({ success: true, count: allPlayers.length });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  return POST(new Request('http://localhost:3000/api/update-players', { method: 'POST' }) as any);
}