'use client';

import { useState, useEffect } from 'react';

interface Fixture {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  venue: string;
  league: string;
}

interface TeamCrest {
  home: string | null;
  away: string | null;
}

const TEMPLATES = [
  { id: 'photo', name: 'Stadium Photo', description: 'Auto-fetched stadium background' },
  { id: 'gradient', name: 'Custom Gradient', description: 'Pick your own colors' },
];

const LEAGUES = ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'];

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return dateStr; }
}

function shortenTeamName(name: string): string {
  const shortcuts: Record<string, string> = {
    'Manchester City': 'Man City',
    'Manchester United': 'Man Utd',
    'Tottenham Hotspur': 'Spurs',
    'Newcastle United': 'Newcastle',
    'West Ham United': 'West Ham',
    'Wolverhampton Wanderers': 'Wolves',
    'Nottingham Forest': "Nott'm Forest",
    'Brighton & Hove Albion': 'Brighton',
    'Leicester City': 'Leicester',
    'Aston Villa': 'Aston Villa',
    'Borussia Dortmund': 'Dortmund',
    'Bayer Leverkusen': 'Leverkusen',
    'Atletico Madrid': 'Atletico',
    'Athletic Club': 'Athletic',
    'Paris Saint-Germain': 'PSG',
    'Internazionale': 'Inter Milan',
  };
  return shortcuts[name] || name;
}

// Sample dominant color brightness from hex
function isColorLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

// Make accent color more vibrant from dominant color
function makeAccent(hex: string): string {
  if (!hex || hex.length < 7) return '#00FF87';
  try {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    // Boost saturation
    const max = Math.max(r, g, b);
    if (max === 0) return '#00FF87';
    r = Math.min(255, Math.round((r / max) * 255));
    g = Math.min(255, Math.round((g / max) * 255));
    b = Math.min(255, Math.round((b / max) * 255));
    // If too gray/dark, fall back to green
    if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) return '#00FF87';
    return `rgb(${r},${g},${b})`;
  } catch { return '#00FF87'; }
}

async function fetchCrest(teamName: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(teamName)}`
    );
    const data = await res.json();
    const teams = data.teams || data.results;
    if (teams && teams.length > 0) {
      // Filter to soccer teams only to avoid getting basketball etc
      const soccerTeam = teams.find((t: any) => t.strSport === 'Soccer') || teams[0];
      return soccerTeam.strBadge || soccerTeam.strLogo || null;
    }
  } catch (e) {
    console.error('Crest fetch failed:', e);
  }
  return null;
}

export default function CreateScreen() {
  const [step, setStep] = useState<'pick' | 'template' | 'preview'>('pick');
  const [selectedLeague, setSelectedLeague] = useState('Premier League');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoCredit, setPhotoCredit] = useState<string>('');
  const [photoColor, setPhotoColor] = useState<string>('#00FF87');
  const [fetchingPhoto, setFetchingPhoto] = useState(false);
  const [crests, setCrests] = useState<TeamCrest>({ home: null, away: null });
  const [gradientStart, setGradientStart] = useState('#0a0a0a');
const [gradientEnd, setGradientEnd] = useState('#1a1a2e');

  useEffect(() => { fetchFixtures(); }, [selectedLeague]);

  useEffect(() => {
    if (selectedFixture && selectedTemplate.id === 'photo') {
      fetchPhoto();
      fetchCrests();
    } else if (selectedFixture) {
      fetchCrests();
    }
  }, [selectedFixture, selectedTemplate]);

  const fetchFixtures = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/games?league=${encodeURIComponent(selectedLeague)}`);
      const data = await res.json();
      const results = [...(data.yesterday || [])].filter(
        (f: Fixture) => f.home_score !== null && f.away_score !== null
      );
      setFixtures(results);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchPhoto = async () => {
    if (!selectedFixture) return;
    setFetchingPhoto(true);
    try {
      const query = selectedFixture.venue || `${selectedFixture.home_team} football`;
      const res = await fetch(`/api/photo?query=${encodeURIComponent(query + ' stadium')}`);
      const data = await res.json();
      setPhotoUrl(data.url || null);
      setPhotoCredit(data.credit || '');
      if (data.color) setPhotoColor(makeAccent(data.color));
    } catch (e) { console.error(e); }
    setFetchingPhoto(false);
  };

  const fetchCrests = async () => {
    if (!selectedFixture) return;
    const [home, away] = await Promise.all([
      fetchCrest(selectedFixture.home_team),
      fetchCrest(selectedFixture.away_team),
    ]);
    setCrests({ home, away });
  };

  const getAccent = () => {
  if (selectedTemplate.id === 'photo') return photoColor;
  return '#00FF87';
};

  const downloadCard = async () => {
    if (!selectedFixture) return;
    setDownloading(true);

    try {
      // Load fonts before drawing
      await document.fonts.load('bold 48px "Bebas Neue"');
      await document.fonts.load('400 28px "DM Sans"');

      const SIZE = 1080;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d')!;
      const accent = getAccent();

      // --- BACKGROUND ---
      if (selectedTemplate.id === 'photo' && photoUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = photoUrl;
        });
        const scale = Math.max(SIZE / img.width, SIZE / img.height);
        const x = (SIZE - img.width * scale) / 2;
        const y = (SIZE - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        const topGrad = ctx.createLinearGradient(0, 0, 0, SIZE * 0.5);
        topGrad.addColorStop(0, 'rgba(0,0,0,0.4)');
        topGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, SIZE, SIZE * 0.5);
        const bottomGrad = ctx.createLinearGradient(0, SIZE * 0.4, 0, SIZE);
        bottomGrad.addColorStop(0, 'rgba(0,0,0,0)');
        bottomGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(0, SIZE * 0.4, SIZE, SIZE * 0.6);
      } else {
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, gradientStart);
  grad.addColorStop(1, gradientEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

      const PAD = 44;

      // --- TOP ACCENT BAR (85% width, centered, slightly down) ---
      const barW = SIZE * 0.85;
      const barX = (SIZE - barW) / 2;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(barX, 32, barW, 5, 3);
      ctx.fill();

      // --- LEAGUE PILL ---
      ctx.font = 'bold 28px "DM Sans", sans-serif';
      const leagueText = selectedFixture.league || selectedLeague;
      const pillW = ctx.measureText(leagueText).width + 48;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.roundRect(PAD, 80, pillW, 52, 26);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.textAlign = 'left';
      ctx.fillText(leagueText, PAD + 24, 114);

      // --- VENUE (Bebas Neue) ---
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = 'italic bold 36px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(selectedFixture.venue, PAD, 190);

      // --- DATE (DM Sans) ---
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '28px "DM Sans", sans-serif';
      ctx.fillText(formatDate(selectedFixture.match_date), PAD, 230);

      // --- CRESTS + SCORE SECTION (moved down) ---
      const homeX = SIZE * 0.2;
      const awayX = SIZE * 0.8;
      const crestY = SIZE * 0.75;
      const crestSize = 100;

      const loadImg = (url: string): Promise<HTMLImageElement | null> =>
        new Promise(resolve => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        });

      // Draw crests
      if (crests.home) {
        const img = await loadImg(`/api/crest?url=${encodeURIComponent(crests.home)}`);
        if (img) ctx.drawImage(img, homeX - crestSize/2, crestY - crestSize/2, crestSize, crestSize);
      }
      if (crests.away) {
        const img = await loadImg(`/api/crest?url=${encodeURIComponent(crests.away)}`);
        if (img) ctx.drawImage(img, awayX - crestSize/2, crestY - crestSize/2, crestSize, crestSize);
      }

      // Team names (DM Sans, smaller)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(shortenTeamName(selectedFixture.home_team).toUpperCase(), homeX, crestY + crestSize/2 + 44);
      ctx.fillText(shortenTeamName(selectedFixture.away_team).toUpperCase(), awayX, crestY + crestSize/2 + 44);

      // Score (Bebas Neue, big)
      const scoreY = crestY + 80;
      ctx.font = '200px "Bebas Neue", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${selectedFixture.home_score}`, SIZE/2 - 50, scoreY);
      ctx.textAlign = 'left';
      ctx.fillText(`${selectedFixture.away_score}`, SIZE/2 + 50, scoreY);

// FT centered between scores
const ftY = scoreY - 60;

// pill background (transparent grey)
ctx.fillStyle = isColorLight(photoColor)
  ? 'rgba(0,0,0,0.35)'
  : 'rgba(255,255,255,0.12)';
ctx.beginPath();
ctx.roundRect(SIZE/2 - 28, ftY - 20, 56, 34, 17);
ctx.fill();

// optional: subtle border for extra polish
ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
ctx.lineWidth = 1;
ctx.stroke();

// text
ctx.fillStyle = accent; // keep FT text using accent (looks clean)
ctx.font = 'bold 22px "DM Sans", sans-serif';
ctx.textAlign = 'center';
ctx.fillText('FT', SIZE/2, ftY + 2);

      // --- DIVIDER ---
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, SIZE - 90);
      ctx.lineTo(SIZE - PAD, SIZE - 90);
      ctx.stroke();

      // --- MATCHDAY BRANDING (MD logo LEFT of text) ---
      const brandY = SIZE - 52;
      const brandTotalW = 24 + 8 + ctx.measureText('Matchday').width;
      const brandStartX = SIZE/2 - brandTotalW/2;

      // MD box
      ctx.fillStyle = '#00FF87';
      ctx.beginPath();
      ctx.roundRect(brandStartX, brandY - 18, 24, 24, 4);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 11px "DM Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('MD', brandStartX + 3, brandY - 1);

      // Matchday text
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = 'bold 28px "DM Sans", sans-serif';
      ctx.fillText('Matchday', brandStartX + 32, brandY);

      // Photo credit
      if (selectedTemplate.id === 'photo' && photoCredit) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '20px "DM Sans", sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Photo: ${photoCredit} / Unsplash`, SIZE - 24, SIZE - 24);
      }

      const link = document.createElement('a');
      link.download = `matchday-${selectedFixture.home_team}-vs-${selectedFixture.away_team}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

    } catch (e) {
      console.error('Download failed:', e);
    }
    setDownloading(false);
  };

  const accent = getAccent();

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#00FF87] flex items-center justify-center">
            <span className="text-black font-black text-sm tracking-tighter">MD</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Create</span>
        </div>
        {step !== 'pick' && (
          <button onClick={() => setStep(step === 'preview' ? 'template' : 'pick')}
            className="text-zinc-400 text-sm font-medium">← Back</button>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 px-5 mb-6">
        {['pick', 'template', 'preview'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === s ? 'bg-[#00FF87] text-black' :
              ['pick','template','preview'].indexOf(step) > i ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-600'
            }`}>{i + 1}</div>
            {i < 2 && <div className={`w-8 h-0.5 rounded ${['pick','template','preview'].indexOf(step) > i ? 'bg-[#00FF87]' : 'bg-zinc-800'}`} />}
          </div>
        ))}
        <span className="text-zinc-500 text-xs ml-2">
          {step === 'pick' ? 'Pick a match' : step === 'template' ? 'Choose style' : 'Preview & download'}
        </span>
      </div>

      <div className="px-5 pb-8">
        {/* Step 1 */}
        {step === 'pick' && (
          <div>
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
              {LEAGUES.map(league => (
                <button key={league} onClick={() => setSelectedLeague(league)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    selectedLeague === league ? 'bg-[#00FF87] text-black' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}>{league}</button>
              ))}
            </div>
            <h3 className="text-white font-bold text-base mb-3">Recent Results</h3>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : fixtures.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                <p className="text-zinc-500 text-sm">No recent results for {selectedLeague}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {fixtures.map(fixture => (
                  <button key={fixture.id}
                    onClick={() => { setSelectedFixture(fixture); setStep('template'); }}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left hover:border-zinc-600 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-zinc-500 text-xs">{formatDate(fixture.match_date)}</span>
                      <span className="text-zinc-500 text-xs">{fixture.venue}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold text-sm flex-1">{shortenTeamName(fixture.home_team)}</span>
                      <span className="text-white font-black text-xl mx-4">{fixture.home_score} - {fixture.away_score}</span>
                      <span className="text-white font-semibold text-sm flex-1 text-right">{shortenTeamName(fixture.away_team)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

 {/* Step 2 */}
{step === 'template' && selectedFixture && (
  <div>
    <h3 className="text-white font-bold text-base mb-4">Choose a style</h3>
    <div className="flex flex-col gap-3 mb-6">
      {TEMPLATES.map(template => (
        <button key={template.id} onClick={() => setSelectedTemplate(template)}
          className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
            selectedTemplate.id === template.id ? 'border-[#00FF87] bg-zinc-900' : 'border-zinc-800 bg-zinc-900'
          }`}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: template.id === 'photo'
                ? 'linear-gradient(135deg, #1a3a5c, #2d6a9f)'
                : `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
            }}>
            <span className="text-lg">{template.id === 'photo' ? '📸' : '🎨'}</span>
          </div>
          <div className="flex-1 text-left">
            <p className="text-white font-semibold text-sm">{template.name}</p>
            <p className="text-zinc-500 text-xs">{template.description}</p>
          </div>
          {selectedTemplate.id === template.id && (
            <div className="w-5 h-5 bg-[#00FF87] rounded-full flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="black" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>

    {/* Color pickers — only show when gradient is selected */}
    {selectedTemplate.id === 'gradient' && (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
        <p className="text-white font-semibold text-sm mb-4">Choose your colors</p>
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-zinc-500 text-xs mb-2">Start color</p>
            <div className="relative">
              <input
                type="color"
                value={gradientStart}
                onChange={e => setGradientStart(e.target.value)}
                className="w-full h-12 rounded-xl cursor-pointer border-0"
                style={{ padding: '2px' }}
              />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-zinc-500 text-xs mb-2">End color</p>
            <div className="relative">
              <input
                type="color"
                value={gradientEnd}
                onChange={e => setGradientEnd(e.target.value)}
                className="w-full h-12 rounded-xl cursor-pointer border-0"
                style={{ padding: '2px' }}
              />
            </div>
          </div>
        </div>
        {/* Live mini preview */}
        <div className="mt-4 h-16 rounded-xl"
          style={{ background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` }} />
      </div>
    )}

    <button onClick={() => setStep('preview')}
      className="w-full bg-[#00FF87] text-black font-bold py-4 rounded-2xl text-sm">
      Preview Card →
    </button>
  </div>
)}

        {/* Step 3 */}
        {step === 'preview' && selectedFixture && (
          <div>
            <h3 className="text-white font-bold text-base mb-4">Your card</h3>

            <div id="card-preview" className="relative aspect-square rounded-2xl overflow-hidden mb-4 bg-zinc-900">
              {/* Background */}
              {selectedTemplate.id === 'photo' && (
                fetchingPhoto ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : photoUrl ? (
                  <img src={photoUrl} alt="Stadium" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
                )
              )}
              {selectedTemplate.id !== 'photo' && (
  <div className="absolute inset-0" style={{
    background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
  }} />
)}

              {selectedTemplate.id === 'photo' && (
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85" />
              )}

              {/* Content */}
              <div className="absolute inset-0 flex flex-col p-4">
                <div className="w-full h-0.5 rounded-full mb-3" style={{ backgroundColor: accent }} />

                {/* League pill */}
                <div className="self-start px-2.5 py-1 rounded-full border text-[10px] font-bold mb-1.5"
                  style={{ borderColor: accent, color: accent, backgroundColor: 'rgba(0,0,0,0.45)' }}>
                  {selectedFixture.league || selectedLeague}
                </div>

                {/* Venue */}
                <p className="text-white/85 font-bold italic text-xs mb-0.5">{selectedFixture.venue}</p>

                {/* Date */}
                <p className="text-white/55 text-[10px] mb-auto">{formatDate(selectedFixture.match_date)}</p>

                {/* Crests + Score */}
                <div className="flex items-center justify-between mb-2 px-2">
                  <div className="flex flex-col items-center gap-1">
                    {crests.home ? (
                      <img src={crests.home} alt="home" className="w-10 h-10 object-contain" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">{selectedFixture.home_team.slice(0,3).toUpperCase()}</span>
                      </div>
                    )}
                    <span className="text-white font-black text-[10px] uppercase text-center leading-tight max-w-[60px]">
                      {shortenTeamName(selectedFixture.home_team)}
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-black text-4xl">{selectedFixture.home_score}</span>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ color: accent, backgroundColor: 'rgba(0,0,0,0.4)' }}>FT</span>
                      </div>
                      <span className="text-white font-black text-4xl">{selectedFixture.away_score}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    {crests.away ? (
                      <img src={crests.away} alt="away" className="w-10 h-10 object-contain" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">{selectedFixture.away_team.slice(0,3).toUpperCase()}</span>
                      </div>
                    )}
                    <span className="text-white font-black text-[10px] uppercase text-center leading-tight max-w-[60px]">
                      {shortenTeamName(selectedFixture.away_team)}
                    </span>
                  </div>
                </div>

                <div className="w-full h-px bg-white/10 mb-2" />

                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-[#00FF87] flex items-center justify-center">
                    <span className="text-black font-black text-[6px]">MD</span>
                  </div>
                  <span className="text-white/35 text-[9px] font-semibold">Matchday</span>
                </div>
              </div>
            </div>

            {photoCredit && selectedTemplate.id === 'photo' && (
              <p className="text-zinc-600 text-xs text-center mb-3">Photo by {photoCredit} on Unsplash</p>
            )}

            <button onClick={downloadCard} disabled={downloading || fetchingPhoto}
  className="w-full bg-[#00FF87] text-black font-bold py-4 rounded-2xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {downloading ? (
                <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Generating...</>
              ) : '↓ Download Card'}
            </button>
            <p className="text-zinc-600 text-xs text-center mt-3">Saved as PNG · 1080×1080px</p>
          </div>
        )}
      </div>
    </div>
  );
}