'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Theme ────────────────────────────────────────────────────────────────────
const B  = '#3b82f6';
const BB = '#60a5fa';
const BD = 'rgba(59,130,246,0.12)';
const BR = 'rgba(96,165,250,0.22)';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Team { name: string; flag: string; score: number | null }
interface Match { top: Team; bot: Team; label?: string }

interface GroupTeam {
  name: string; flag: string;
  played: number; won: number; drawn: number; lost: number; pts: number;
}
interface Group { id: string; teams: GroupTeam[] }

// ─── Bracket data (left half mirrors right half → center Final) ───────────────
// Structure: R32 (8 matches per side) → R16 (4) → QF (2) → SF (1) → Final
// Left side feeds into Final from left, Right side from right.

const mkTBD = (label?: string): Match => ({
  top: { name: 'TBD', flag: '🏳️', score: null },
  bot: { name: 'TBD', flag: '🏳️', score: null },
  label,
});

// Left bracket: 8 R32 → 4 R16 → 2 QF → 1 SF → Final
const LEFT_R32: Match[] = [
  { top: { name: '1A', flag: '🇺🇸', score: null }, bot: { name: '2B', flag: '🇲🇽', score: null }, label: 'R32' },
  { top: { name: '1C', flag: '🇫🇷', score: null }, bot: { name: '2D', flag: '🇩🇪', score: null }, label: 'R32' },
  { top: { name: '1E', flag: '🇧🇪', score: null }, bot: { name: '2F', flag: '🇮🇹', score: null }, label: 'R32' },
  { top: { name: '1G', flag: '🇨🇭', score: null }, bot: { name: '2H', flag: '🇹🇷', score: null }, label: 'R32' },
  { top: { name: '1I', flag: '🇨🇱', score: null }, bot: { name: '2J', flag: '🇵🇪', score: null }, label: 'R32' },
  { top: { name: '1K', flag: '🇭🇺', score: null }, bot: { name: '2L', flag: '🇿🇦', score: null }, label: 'R32' },
  { top: { name: '1B', flag: '🇪🇸', score: null }, bot: { name: '2A', flag: '🇨🇦', score: null }, label: 'R32' },
  { top: { name: '1D', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', score: null }, bot: { name: '2C', flag: '🇦🇷', score: null }, label: 'R32' },
];
const LEFT_R16: Match[] = [mkTBD('R16'), mkTBD('R16'), mkTBD('R16'), mkTBD('R16')];
const LEFT_QF:  Match[] = [mkTBD('QF'),  mkTBD('QF')];
const LEFT_SF:  Match[] = [mkTBD('SF')];

// Right bracket: mirror
const RIGHT_R32: Match[] = [
  { top: { name: '1F', flag: '🇩🇰', score: null }, bot: { name: '2E', flag: '🇺🇾', score: null }, label: 'R32' },
  { top: { name: '1H', flag: '🇺🇦', score: null }, bot: { name: '2G', flag: '🇸🇦', score: null }, label: 'R32' },
  { top: { name: '1J', flag: '🇶🇦', score: null }, bot: { name: '2I', flag: '🇪🇬', score: null }, label: 'R32' },
  { top: { name: '1L', flag: '🇻🇪', score: null }, bot: { name: '2K', flag: '🇨🇿', score: null }, label: 'R32' },
  { top: { name: '1A', flag: '🇲🇦', score: null }, bot: { name: '2B', flag: '🇯🇵', score: null }, label: 'R32' },
  { top: { name: '1C', flag: '🇸🇳', score: null }, bot: { name: '2D', flag: '🇨🇴', score: null }, label: 'R32' },
  { top: { name: '1E', flag: '🇳🇬', score: null }, bot: { name: '2F', flag: '🇰🇷', score: null }, label: 'R32' },
  { top: { name: '1G', flag: '🇬🇭', score: null }, bot: { name: '2H', flag: '🇮🇷', score: null }, label: 'R32' },
];
const RIGHT_R16: Match[] = [mkTBD('R16'), mkTBD('R16'), mkTBD('R16'), mkTBD('R16')];
const RIGHT_QF:  Match[] = [mkTBD('QF'),  mkTBD('QF')];
const RIGHT_SF:  Match[] = [mkTBD('SF')];

const FINAL: Match = mkTBD('FINAL');

// ─── Groups ───────────────────────────────────────────────────────────────────
const GROUPS: Group[] = [
  { id: 'A', teams: [
    { name: 'USA',        flag: '🇺🇸', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Mexico',     flag: '🇲🇽', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Canada',     flag: '🇨🇦', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Morocco',    flag: '🇲🇦', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
  ]},
  { id: 'B', teams: [
    { name: 'Spain',      flag: '🇪🇸', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Brazil',     flag: '🇧🇷', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Japan',      flag: '🇯🇵', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Croatia',    flag: '🇭🇷', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
  ]},
  { id: 'C', teams: [
    { name: 'France',     flag: '🇫🇷', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Argentina',  flag: '🇦🇷', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Portugal',   flag: '🇵🇹', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Senegal',    flag: '🇸🇳', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
  ]},
  { id: 'D', teams: [
    { name: 'England',    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Germany',    flag: '🇩🇪', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Netherlands',flag: '🇳🇱', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Colombia',   flag: '🇨🇴', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
  ]},
  { id: 'E', teams: [
    { name: 'Belgium',    flag: '🇧🇪', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Uruguay',    flag: '🇺🇾', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Nigeria',    flag: '🇳🇬', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Australia',  flag: '🇦🇺', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
  ]},
  { id: 'F', teams: [
    { name: 'Italy',      flag: '🇮🇹', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Denmark',    flag: '🇩🇰', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Ecuador',    flag: '🇪🇨', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'South Korea',flag: '🇰🇷', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
  ]},
  { id: 'G', teams: [
    { name: 'Switzerland',flag: '🇨🇭', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Serbia',     flag: '🇷🇸', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Saudi Arabia',flag:'🇸🇦', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Ghana',      flag: '🇬🇭', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
  ]},
  { id: 'H', teams: [
    { name: 'Turkey',     flag: '🇹🇷', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Ukraine',    flag: '🇺🇦', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Ivory Coast',flag: '🇨🇮', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Iran',       flag: '🇮🇷', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
  ]},
  { id: 'I', teams: [
    { name: 'Chile',      flag: '🇨🇱', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Cameroon',   flag: '🇨🇲', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Poland',     flag: '🇵🇱', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Egypt',      flag: '🇪🇬', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
  ]},
  { id: 'J', teams: [
    { name: 'Peru',       flag: '🇵🇪', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Algeria',    flag: '🇩🇿', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Qatar',      flag: '🇶🇦', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'New Zealand',flag: '🇳🇿', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
  ]},
  { id: 'K', teams: [
    { name: 'Hungary',    flag: '🇭🇺', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Austria',    flag: '🇦🇹', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Paraguay',   flag: '🇵🇾', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Czechia',    flag: '🇨🇿', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
  ]},
  { id: 'L', teams: [
    { name: 'South Africa',flag:'🇿🇦', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Venezuela',  flag: '🇻🇪', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Indonesia',  flag: '🇮🇩', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
    { name: 'Slovenia',   flag: '🇸🇮', played: 0, won: 0, drawn: 0, lost: 0, pts: 0 },
  ]},
];

// ─── Bracket match slot ───────────────────────────────────────────────────────
// side: 'left' teams read L→R (name on left, score on right)
//       'right' teams read R→L (score on left, name on right)
function MatchSlot({ match, side, compact = false }: { match: Match; side: 'left' | 'right'; compact?: boolean }) {
  const tbd = match.top.score === null;
  const h = compact ? 28 : 32;
  const fs = compact ? 9 : 10;
  const flagSz = compact ? 12 : 14;

  const row = (team: Team, winner: boolean) => {
    const nameColor = tbd ? '#71717a' : winner ? '#fff' : '#52525b';
    if (side === 'left') return (
      <div style={{ display: 'flex', alignItems: 'center', height: h, padding: '0 8px', gap: 5 }}>
        <span style={{ fontSize: flagSz, flexShrink: 0 }}>{team.flag}</span>
        <span style={{ flex: 1, color: nameColor, fontSize: fs, fontWeight: winner ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{team.name}</span>
        <span style={{ color: tbd ? '#3f3f46' : winner ? BB : '#52525b', fontSize: fs + 1, fontWeight: 900, minWidth: 14, textAlign: 'right' }}>
          {tbd ? '–' : team.score}
        </span>
      </div>
    );
    return (
      <div style={{ display: 'flex', alignItems: 'center', height: h, padding: '0 8px', gap: 5 }}>
        <span style={{ color: tbd ? '#3f3f46' : winner ? BB : '#52525b', fontSize: fs + 1, fontWeight: 900, minWidth: 14, textAlign: 'left' }}>
          {tbd ? '–' : team.score}
        </span>
        <span style={{ flex: 1, color: nameColor, fontSize: fs, fontWeight: winner ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{team.name}</span>
        <span style={{ fontSize: flagSz, flexShrink: 0 }}>{team.flag}</span>
      </div>
    );
  };

  const topWins = !tbd && match.top.score !== null && match.bot.score !== null && match.top.score > match.bot.score;
  const botWins = !tbd && match.top.score !== null && match.bot.score !== null && match.bot.score > match.top.score;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid rgba(96,165,250,0.18)`,
      borderRadius: 8,
      overflow: 'hidden',
      minWidth: compact ? 90 : 110,
      maxWidth: compact ? 110 : 130,
    }}>
      {row(match.top, topWins)}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
      {row(match.bot, botWins)}
    </div>
  );
}

// ─── One column of matches ────────────────────────────────────────────────────
function MatchColumn({ matches, side, rowHeight, compact }: {
  matches: Match[];
  side: 'left' | 'right';
  rowHeight: number;
  compact?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', height: '100%' }}>
      {matches.map((m, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MatchSlot match={m} side={side} compact={compact} />
        </div>
      ))}
    </div>
  );
}

// ─── SVG connector lines ──────────────────────────────────────────────────────
// Draws bracket lines between columns for one side
function BracketLines({ matches, side, totalHeight, colW }: {
  matches: number; // number of match pairs to connect
  side: 'left' | 'right';
  totalHeight: number;
  colW: number;
}) {
  const strokeColor = 'rgba(59,130,246,0.35)';
  const segH = totalHeight / matches;
  const lines: React.ReactNode[] = [];

  for (let i = 0; i < matches / 2; i++) {
    const y1 = segH * (i * 2) + segH / 2;
    const y2 = segH * (i * 2 + 1) + segH / 2;
    const ymid = (y1 + y2) / 2;

    if (side === 'left') {
      // horizontal out from right edge of each match, vertical join, horizontal to next col
      lines.push(
        <g key={i}>
          <line x1={0} y1={y1} x2={colW * 0.5} y2={y1} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={0} y1={y2} x2={colW * 0.5} y2={y2} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={colW * 0.5} y1={y1} x2={colW * 0.5} y2={y2} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={colW * 0.5} y1={ymid} x2={colW} y2={ymid} stroke={strokeColor} strokeWidth={1.5} />
        </g>
      );
    } else {
      lines.push(
        <g key={i}>
          <line x1={colW} y1={y1} x2={colW * 0.5} y2={y1} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={colW} y1={y2} x2={colW * 0.5} y2={y2} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={colW * 0.5} y1={y1} x2={colW * 0.5} y2={y2} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={colW * 0.5} y1={ymid} x2={0} y2={ymid} stroke={strokeColor} strokeWidth={1.5} />
        </g>
      );
    }
  }

  return (
    <svg width={colW} height={totalHeight} style={{ flexShrink: 0, overflow: 'visible' }}>
      {lines}
    </svg>
  );
}

// ─── Full visual bracket ──────────────────────────────────────────────────────
function VisualBracket() {
  // Heights: each R32 match slot = 70px, gaps included
  const totalH = 800;
  const lineW  = 18;
  const colW32 = 110;
  const colW16 = 105;
  const colQF  = 100;
  const colSF  = 95;

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: 8, paddingTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', height: totalH, minWidth: 660, padding: '0 12px', gap: 0 }}>

        {/* LEFT: R32 */}
        <div style={{ width: colW32, height: totalH, flexShrink: 0 }}>
          <MatchColumn matches={LEFT_R32} side="left" rowHeight={totalH / LEFT_R32.length} />
        </div>

        {/* connector L R32→R16 */}
        <BracketLines matches={LEFT_R32.length} side="left" totalHeight={totalH} colW={lineW} />

        {/* LEFT: R16 */}
        <div style={{ width: colW16, height: totalH, flexShrink: 0 }}>
          <MatchColumn matches={LEFT_R16} side="left" rowHeight={totalH / LEFT_R16.length} compact />
        </div>

        {/* connector L R16→QF */}
        <BracketLines matches={LEFT_R16.length} side="left" totalHeight={totalH} colW={lineW} />

        {/* LEFT: QF */}
        <div style={{ width: colQF, height: totalH, flexShrink: 0 }}>
          <MatchColumn matches={LEFT_QF} side="left" rowHeight={totalH / LEFT_QF.length} compact />
        </div>

        {/* connector L QF→SF */}
        <BracketLines matches={LEFT_QF.length} side="left" totalHeight={totalH} colW={lineW} />

        {/* LEFT: SF */}
        <div style={{ width: colSF, height: totalH, flexShrink: 0 }}>
          <MatchColumn matches={LEFT_SF} side="left" rowHeight={totalH / LEFT_SF.length} compact />
        </div>

        {/* connector L SF→Final */}
        <svg width={lineW} height={totalH} style={{ flexShrink: 0, overflow: 'visible' }}>
          <line x1={0} y1={totalH / 2} x2={lineW} y2={totalH / 2} stroke="rgba(59,130,246,0.5)" strokeWidth={1.5} />
        </svg>

        {/* FINAL center */}
        <div style={{
          flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          padding: '0 6px',
        }}>
          <span style={{ fontSize: 22 }}>🏆</span>
          <MatchSlot match={FINAL} side="left" />
          <span style={{ color: B, fontSize: 8, fontWeight: 800, letterSpacing: '0.12em' }}>FINAL</span>
          <span style={{ color: '#3f3f46', fontSize: 8 }}>Jul 19 · MetLife</span>
        </div>

        {/* connector Final→R SF */}
        <svg width={lineW} height={totalH} style={{ flexShrink: 0, overflow: 'visible' }}>
          <line x1={0} y1={totalH / 2} x2={lineW} y2={totalH / 2} stroke="rgba(59,130,246,0.5)" strokeWidth={1.5} />
        </svg>

        {/* RIGHT: SF */}
        <div style={{ width: colSF, height: totalH, flexShrink: 0 }}>
          <MatchColumn matches={RIGHT_SF} side="right" rowHeight={totalH / RIGHT_SF.length} compact />
        </div>

        {/* connector R SF→QF */}
        <BracketLines matches={RIGHT_SF.length} side="right" totalHeight={totalH} colW={lineW} />

        {/* RIGHT: QF */}
        <div style={{ width: colQF, height: totalH, flexShrink: 0 }}>
          <MatchColumn matches={RIGHT_QF} side="right" rowHeight={totalH / RIGHT_QF.length} compact />
        </div>

        {/* connector R QF→R16 */}
        <BracketLines matches={RIGHT_QF.length} side="right" totalHeight={totalH} colW={lineW} />

        {/* RIGHT: R16 */}
        <div style={{ width: colW16, height: totalH, flexShrink: 0 }}>
          <MatchColumn matches={RIGHT_R16} side="right" rowHeight={totalH / RIGHT_R16.length} compact />
        </div>

        {/* connector R R16→R32 */}
        <BracketLines matches={RIGHT_R16.length} side="right" totalHeight={totalH} colW={lineW} />

        {/* RIGHT: R32 */}
        <div style={{ width: colW32, height: totalH, flexShrink: 0 }}>
          <MatchColumn matches={RIGHT_R32} side="right" rowHeight={totalH / RIGHT_R32.length} />
        </div>

      </div>
    </div>
  );
}

// ─── Group card ───────────────────────────────────────────────────────────────
function GroupCard({ group, index }: { group: Group; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      style={{
        borderRadius: 16, overflow: 'hidden', marginBottom: 10,
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.025)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px', background: BD, borderBottom: `1px solid ${BR}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: B, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 10 }}>{group.id}</span>
          </div>
          <span style={{ color: '#e4e4e7', fontWeight: 700, fontSize: 13 }}>Group {group.id}</span>
        </div>
        <span style={{ color: '#3f3f46', fontSize: 9, fontWeight: 600, letterSpacing: '0.08em' }}>TOP 2 ADVANCE</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 26px 26px 26px 30px', padding: '5px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {['Team','P','W','D','Pts'].map((h, i) => (
          <span key={h} style={{ color: '#3f3f46', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i > 0 ? 'center' : 'left' }}>{h}</span>
        ))}
      </div>

      {group.teams.map((team, i) => (
        <div key={team.name + i} style={{
          display: 'grid', gridTemplateColumns: '1fr 26px 26px 26px 30px',
          padding: '9px 14px', alignItems: 'center',
          borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          background: i < 2 ? 'rgba(59,130,246,0.03)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 2, height: 16, borderRadius: 1, flexShrink: 0, background: i < 2 ? B : 'transparent', opacity: 0.5 }} />
            <span style={{ fontSize: 15 }}>{team.flag}</span>
            <span style={{ color: '#d4d4d8', fontSize: 12, fontWeight: 600 }}>{team.name}</span>
          </div>
          {[team.played, team.won, team.drawn, team.pts].map((v, j) => (
            <span key={j} style={{ color: j === 3 ? '#fff' : '#71717a', fontSize: j === 3 ? 13 : 12, fontWeight: j === 3 ? 900 : 400, textAlign: 'center' }}>{v}</span>
          ))}
        </div>
      ))}
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FIFAWCScreen({ onClose }: { onClose?: () => void }) {
  const daysUntil = Math.max(0, Math.ceil(
    (new Date('2026-06-11').getTime() - Date.now()) / 86400000
  ));

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#020818 0%,#050e2a 40%,#030a1c 100%)',
      maxWidth: 430,
      margin: '0 auto',
    }}>
      {/* bg glow */}
      <div style={{
        position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 280, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse at top,rgba(59,130,246,0.13) 0%,transparent 65%)',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Hero ── */}
        {/* ── Hero ── */}
<div style={{ padding: '52px 20px 16px' }}>

  {/* Close button */}
  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
    {onClose && (
      <button onClick={onClose} style={{
        color: '#71717a', fontSize: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '5px 14px', borderRadius: 99,
        background: 'rgba(255,255,255,0.05)', cursor: 'pointer',
      }}>Close</button>
    )}
  </div>

  {/* existing trophy + countdown row stays here unchanged */}
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>🏆</span>
                <div>
                  <p style={{ color: BB, fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>FIFA World Cup</p>
                  <p style={{ color: '#fff', fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>2026</p>
                </div>
              </div>
              <p style={{ color: '#52525b', fontSize: 12, margin: '0 0 2px' }}>USA · Canada · Mexico</p>
              <p style={{ color: '#3f3f46', fontSize: 11, margin: 0 }}>11 Jun – 19 Jul · 48 teams</p>
            </div>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: BD, border: `1px solid ${BR}`,
              borderRadius: 14, padding: '10px 16px', flexShrink: 0,
            }}>
              <span style={{ color: BB, fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{daysUntil}</span>
              <span style={{ color: B, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', marginTop: 3 }}>DAYS</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['New York','Los Angeles','Dallas','Miami','Toronto','Mexico City'].map(city => (
              <span key={city} style={{ fontSize: 10, color: '#52525b', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 99, padding: '2px 8px' }}>{city}</span>
            ))}
          </div>
        </div>

        {/* ── Section: Bracket ── */}
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ color: BB, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Knockout Bracket</span>
            <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Round legend */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {['R32','R16','QF','SF','Final'].map(r => (
              <span key={r} style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: BD, color: BB, border: `1px solid ${BR}` }}>{r}</span>
            ))}
          </div>

          <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${BR}`, background: 'rgba(5,14,42,0.8)' }}>
            <VisualBracket />
          </div>

          <p style={{ color: '#3f3f46', fontSize: 10, textAlign: 'center', marginTop: 8 }}>
            Scroll horizontally · bracket fills after group stage
          </p>
        </div>

        {/* ── Section: Groups ── */}
        <div style={{ padding: '0 20px', paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 120px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ color: BB, fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Group Stage</span>
            <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: B, opacity: 0.5 }} />
            <span style={{ color: '#52525b', fontSize: 11 }}>Blue bar = advancing to knockout stage</span>
          </div>

          {GROUPS.map((g, i) => <GroupCard key={g.id} group={g} index={i} />)}
        </div>

      </div>
    </div>
  );
}