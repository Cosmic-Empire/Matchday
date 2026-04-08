import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LEAGUES = ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'];

async function askOllama(prompt: string): Promise<string> {
  try {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3', prompt, stream: false }),
    });
    const data = await res.json();
    return data.response?.trim() || '';
  } catch (e) {
    console.error('Ollama error:', e);
    return '';
  }
}

function extractJson(raw: string): any[] {
  // Remove markdown
  let cleaned = raw.replace(/```json|```/g, '').trim();
  
  // Find the JSON array boundaries
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  
  if (start === -1 || end === -1 || end <= start) return [];
  
  cleaned = cleaned.substring(start, end + 1);
  
  // Try parsing directly first
  try {
    return JSON.parse(cleaned);
  } catch {
    // If that fails, try to extract individual objects
    try {
      const objects: any[] = [];
      const objRegex = /\{[^{}]*\}/g;
      const matches = cleaned.match(objRegex);
      if (matches) {
        for (const match of matches) {
          try {
            objects.push(JSON.parse(match));
          } catch {}
        }
      }
      return objects;
    } catch {
      return [];
    }
  }
}

async function updateStandings(league: string) {
 const prompt = `Return ONLY a JSON array of top 10 teams in ${league} 2025-2026 standings. No text before or after.
Format: [{"rank":1,"team":"TeamName","points":70,"played":30,"won":21,"drawn":7,"lost":2,"gd":35}]`;

  const raw = await askOllama(prompt);
  const standings = extractJson(raw);

  if (standings.length === 0) {
    console.log(`No standings data for ${league}`);
    return;
  }

  await supabase.from('standings').delete().eq('league', league);
  const rows = standings.slice(0, 4).map((s: any) => ({
    league, rank: s.rank, team: s.team, logo: '',
    points: s.points || 0, played: s.played || 0,
    won: s.won || 0, drawn: s.drawn || 0,
    lost: s.lost || 0, gd: s.gd || 0,
  }));

  const { error } = await supabase.from('standings').insert(rows);
  if (error) console.error(`standings error for ${league}:`, error);
  else console.log(`Updated standings for ${league}`);
}

async function updateFixtures(league: string) {
  const today = new Date().toISOString().split('T')[0];
  
  const prompt = `Return ONLY a JSON array of 8 ${league} matches (mix of upcoming and recent results) for 2025-2026 season. No text before or after.
Format: [{"home_team":"Team A","away_team":"Team B","home_score":null,"away_score":null,"match_date":"2026-04-10","match_time":"20:00","venue":"Stadium Name","status":"upcoming"}]
Use null for scores of upcoming matches. Today is ${today}.`;

  const raw = await askOllama(prompt);
  const fixtures = extractJson(raw);

  if (fixtures.length === 0) {
    console.log(`No fixtures data for ${league}`);
    return;
  }

  await supabase.from('fixtures').delete().eq('league', league);
  const rows = fixtures.map((f: any) => ({
    league,
    home_team: f.home_team || 'TBD',
    away_team: f.away_team || 'TBD',
    home_logo: '', away_logo: '',
    home_score: f.home_score ?? null,
    away_score: f.away_score ?? null,
    match_date: f.match_date || today,
    match_time: f.match_time || '00:00',
    venue: f.venue || '',
    status: f.status || 'upcoming',
  }));

  const { error } = await supabase.from('fixtures').insert(rows);
  if (error) console.error(`fixtures error for ${league}:`, error);
  else console.log(`Updated fixtures for ${league}`);
}

export async function POST(request: NextRequest) {
  console.log('[update] Starting data update...');
  for (const league of LEAGUES) {
    await updateStandings(league);
    await updateFixtures(league);
  }
  return NextResponse.json({ success: true, message: 'Data updated!' });
}