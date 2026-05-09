'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTeamName } from '@/lib/formatTeamName';

const supabase = createClient();

// ─── Constants ────────────────────────────────────────────────────────────────
const POSITIONS = ['GK', 'DEF', 'MID', 'MID', 'FWD'] as const;
const POSITION_LABELS: Record<string, string> = {
  GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward',
};
const LEAGUES = ['All', 'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'];
const DAILY_COINS = 500;
const DAILY_FREE_PACK_COOLDOWN = 24 * 60 * 60 * 1000;

const PACKS = [
  {
    id: 'free_daily', name: 'Daily Pack', description: '3 players · refreshes every 24h',
    cost: 0, currency: 'coins' as const, size: 3,
    rarityWeights: { common: 70, rare: 25, epic: 5, legendary: 0 },
    gradient: 'linear-gradient(135deg,#0a2a1a 0%,#0f3320 100%)',
    icon: '🎁', accent: '#00FF87',
  },
  {
    id: 'standard', name: 'Standard Pack', description: '5 players · improved odds',
    cost: 1000, currency: 'coins' as const, size: 5,
    rarityWeights: { common: 50, rare: 35, epic: 14, legendary: 1 },
    gradient: 'linear-gradient(135deg,#0a0a2e 0%,#16213e 100%)',
    icon: '📦', accent: '#60a5fa',
  },
  {
    id: 'premium', name: 'Premium Pack', description: '5 players · guaranteed rare+',
    cost: 300, currency: 'gems' as const, size: 5,
    rarityWeights: { common: 0, rare: 55, epic: 35, legendary: 10 },
    gradient: 'linear-gradient(135deg,#2d1b4e 0%,#1a0a33 100%)',
    icon: '💜', accent: '#c084fc',
  },
  {
    id: 'elite', name: 'Elite Pack', description: '8 players · epic+ guaranteed',
    cost: 800, currency: 'gems' as const, size: 8,
    rarityWeights: { common: 0, rare: 0, epic: 70, legendary: 30 },
    gradient: 'linear-gradient(135deg,#2a1500 0%,#3d1f00 100%)',
    icon: '👑', accent: '#fbbf24',
  },
];

const RARITY_CONFIG = {
  common:    { label: 'Common',    color: '#a1a1aa', glow: '#a1a1aa22', border: '#a1a1aa33' },
  rare:      { label: 'Rare',      color: '#60a5fa', glow: '#60a5fa22', border: '#60a5fa44' },
  epic:      { label: 'Epic',      color: '#c084fc', glow: '#c084fc22', border: '#c084fc44' },
  legendary: { label: 'Legendary', color: '#fbbf24', glow: '#fbbf2422', border: '#fbbf2444' },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface Player {
  id: string; name: string; team: string; league: string;
  position: string; goals: number; assists: number; clean_sheets: number; points: number;
  image_url?: string; rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}
interface OwnedPlayer extends Player { ownedAt: number; quantity: number; }
interface Currency { coins: number; gems: number; }
interface LobbyMember { user_id: string; username: string; total_points: number; }

type RootScreen = 'landing' | 'team' | 'lobbies';
type TeamSubScreen = 'collection' | 'store' | 'packs';
type LobbyScreen = 'hub' | 'create' | 'join' | 'pick' | 'lobby';

// ─── Normalizers ──────────────────────────────────────────────────────────────
const normPos = (raw: string): string => {
  const r = (raw ?? '').trim().toUpperCase();
  if (['GK','GOALKEEPER','KEEPER','GOALIE'].includes(r)) return 'GK';
  if (['DEF','DEFENDER','CB','LB','RB','WB','CENTRE-BACK','CENTRE BACK','FULL BACK','FULLBACK'].includes(r)) return 'DEF';
  if (['MID','MIDFIELDER','CM','DM','AM','LM','RM','CAM','CDM','CENTRAL MIDFIELD','ATTACKING MID','DEFENSIVE MID'].includes(r)) return 'MID';
  if (['FWD','FORWARD','ST','CF','LW','RW','STRIKER','WINGER','CENTRE FORWARD','ATT'].includes(r)) return 'FWD';
  return r;
};
const normLeague = (raw: string): string => {
  const map: Record<string, string> = {
    'premier league':'Premier League','epl':'Premier League',
    'la liga':'La Liga','laliga':'La Liga','bundesliga':'Bundesliga',
    'serie a':'Serie A','seriea':'Serie A','serie_a':'Serie A',
    'ligue 1':'Ligue 1','ligue1':'Ligue 1','ligue_1':'Ligue 1',
  };
  return map[(raw ?? '').trim().toLowerCase()] ?? (raw ?? '').trim();
};
const normalizePlayer = (p: any): Player => ({
  ...p, position: normPos(p.position ?? ''), league: normLeague(p.league ?? ''),
});
const assignRarity = (p: any): Player => ({
  ...normalizePlayer(p),
  rarity: p.points >= 200 ? 'legendary' : p.points >= 150 ? 'epic' : p.points >= 80 ? 'rare' : 'common',
});

// ─── Themes ───────────────────────────────────────────────────────────────────
interface Theme { accent: string; cardBg: string; foil: string; tag: { bg: string; text: string; border: string }; sheetBg: string; }
const LEAGUE_THEME: Record<string, Theme> = {
  'Premier League': { accent: '#c084fc', cardBg: 'linear-gradient(160deg,#1a0533 0%,#2e0d5c 45%,#160a30 100%)', foil: 'linear-gradient(135deg,rgba(192,132,252,0.3) 0%,transparent 55%)', tag: { bg: 'rgba(110,0,255,0.2)', text: '#c084fc', border: 'rgba(192,132,252,0.35)' }, sheetBg: 'rgba(20,4,44,0.95)' },
  'La Liga':        { accent: '#fbbf24', cardBg: 'linear-gradient(160deg,#1c1200 0%,#3d2800 45%,#1a1000 100%)', foil: 'linear-gradient(135deg,rgba(251,191,36,0.25) 0%,transparent 55%)', tag: { bg: 'rgba(251,191,36,0.18)', text: '#fbbf24', border: 'rgba(251,191,36,0.35)' }, sheetBg: 'rgba(24,16,0,0.95)' },
  'Bundesliga':     { accent: '#f87171', cardBg: 'linear-gradient(160deg,#1e0202 0%,#3d0a0a 45%,#1a0000 100%)', foil: 'linear-gradient(135deg,rgba(248,113,113,0.25) 0%,transparent 55%)', tag: { bg: 'rgba(248,113,113,0.18)', text: '#f87171', border: 'rgba(248,113,113,0.35)' }, sheetBg: 'rgba(24,2,2,0.95)' },
  'Serie A':        { accent: '#60a5fa', cardBg: 'linear-gradient(160deg,#00081e 0%,#001540 45%,#000c1e 100%)', foil: 'linear-gradient(135deg,rgba(96,165,250,0.25) 0%,transparent 55%)', tag: { bg: 'rgba(96,165,250,0.18)', text: '#60a5fa', border: 'rgba(96,165,250,0.35)' }, sheetBg: 'rgba(0,6,24,0.95)' },
  'Ligue 1':        { accent: '#34d399', cardBg: 'linear-gradient(160deg,#001812 0%,#003d28 45%,#001510 100%)', foil: 'linear-gradient(135deg,rgba(52,211,153,0.25) 0%,transparent 55%)', tag: { bg: 'rgba(52,211,153,0.18)', text: '#34d399', border: 'rgba(52,211,153,0.35)' }, sheetBg: 'rgba(0,20,14,0.95)' },
};
const DEFAULT_THEME: Theme = { accent: '#00FF87', cardBg: 'linear-gradient(160deg,#0a1a12 0%,#0f2a1c 45%,#091510 100%)', foil: 'linear-gradient(135deg,rgba(0,255,135,0.2) 0%,transparent 55%)', tag: { bg: 'rgba(0,255,135,0.15)', text: '#00FF87', border: 'rgba(0,255,135,0.3)' }, sheetBg: 'rgba(8,8,8,0.95)' };
const getTheme = (league: string): Theme => LEAGUE_THEME[league] ?? DEFAULT_THEME;
const leagueAbbr = (l: string) => ({ 'Premier League':'EPL','La Liga':'LAL','Bundesliga':'BUN','Serie A':'SA','Ligue 1':'L1' }[l] ?? '—');

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS = {
  get: (key: string, fallback: any): any => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set: (key: string, val: unknown) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  del: (key: string) => { try { localStorage.removeItem(key); } catch {} },
};

// ─── Rarity roll ──────────────────────────────────────────────────────────────
function rollRarity(weights: Record<string, number>): 'common' | 'rare' | 'epic' | 'legendary' {
  const roll = Math.random() * 100; let cum = 0;
  for (const [r, w] of Object.entries(weights)) { cum += w; if (roll < cum) return r as any; }
  return 'common';
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function PlayerImage({ player, size = 48 }: { player: Player; size?: number }) {
  const t = getTheme(player.league);
  const [err, setErr] = useState(false);
  const src = !err && player.image_url
    ? player.image_url
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=111111&color=${t.accent.replace('#','')}&bold=true&size=80&font-size=0.38&rounded=true`;
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', background: `radial-gradient(circle,${t.accent}28 0%,transparent 70%)`, border: `1.5px solid ${t.accent}44`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src={src} alt={player.name} onError={() => setErr(true)} style={{ width: size - 2, height: size - 2, objectFit: 'cover', borderRadius: '50%' }} />
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{ fontSize: 11, fontWeight: 900, color: accent, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 7, fontWeight: 700, color: accent + '88', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ height: 158, borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', position: 'relative' }}>
      <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.06) 50%,transparent 100%)' }}
        animate={{ x: ['-100%','100%'] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'linear' }} />
    </div>
  );
}

function FifaCard({ player, onClick, index = 0, showRarity = false }: { player: Player; onClick?: () => void; index?: number; showRarity?: boolean }) {
  const t = getTheme(player.league);
  const rc = showRarity ? (RARITY_CONFIG[player.rarity ?? 'common']) : null;
  const parts = player.name.trim().split(' ');
  const displayName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
  const showCS = player.position === 'GK' || player.position === 'DEF';
  const borderColor = rc ? rc.border : `${t.accent}55`;
  const glowColor = rc ? rc.glow : `${t.accent}1e`;

  return (
    <motion.button onClick={onClick}
      initial={{ opacity: 0, scale: 0.9, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.018, 0.3), duration: 0.2, ease: 'easeOut' }}
      whileTap={{ scale: 0.91 }}
      style={{ height: 158, width: '100%', position: 'relative', outline: 'none', border: 'none', background: 'none', padding: 0, cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: t.cardBg, border: `1px solid ${borderColor}`, boxShadow: `0 4px 20px ${glowColor},inset 0 1px 0 ${t.accent}44` }}>
        <div style={{ position: 'absolute', inset: 0, background: t.foil, pointerEvents: 'none' }} />
        {rc && (rarity => rarity === 'epic' || rarity === 'legendary')(player.rarity) && (
          <motion.div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg,${rc.color}18 0%,transparent 60%)`, pointerEvents: 'none' }}
            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
        )}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${rc ? rc.color : t.accent}dd,transparent)` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 8px 0', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: t.accent, lineHeight: 1 }}>{player.points}</span>
            <span style={{ fontSize: 7.5, fontWeight: 900, color: t.accent+'bb', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{player.position}</span>
          </div>
          {showRarity && rc
            ? <span style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 5px', borderRadius: 4, background: rc.color + '22', color: rc.color, border: `1px solid ${rc.border}` }}>{rc.label}</span>
            : <span style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 5px', borderRadius: 4, background: t.tag.bg, color: t.tag.text, border: `1px solid ${t.tag.border}` }}>{leagueAbbr(player.league)}</span>
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 58, flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <PlayerImage player={player} size={48} />
        </div>
        <div style={{ flexShrink: 0, padding: '0 6px 3px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 9.5, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
          <div style={{ fontSize: 7.5, color: t.accent+'aa', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatTeamName(player.team)}</div>
        </div>
        <div style={{ marginTop: 'auto', flexShrink: 0, display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '5px 4px', borderTop: `1px solid ${t.accent}22`, background: `${t.accent}0d`, position: 'relative', zIndex: 1 }}>
          <MiniStat label="G" value={player.goals} accent={t.accent} />
          <div style={{ width: 1, height: 10, background: t.accent, opacity: 0.2 }} />
          <MiniStat label="A" value={player.assists} accent={t.accent} />
          {showCS && (<><div style={{ width: 1, height: 10, background: t.accent, opacity: 0.2 }} /><MiniStat label="CS" value={player.clean_sheets} accent={t.accent} /></>)}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${t.accent}66,transparent)` }} />
      </div>
    </motion.button>
  );
}

function SquadSlotCard({ player, position, onClick, disabled }: { player: Player | null; position: string; onClick?: () => void; disabled?: boolean }) {
  if (!player) {
    return (
      <motion.button onClick={onClick} disabled={disabled} whileTap={disabled ? undefined : { scale: 0.98 }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, border: '1.5px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.025)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, outline: 'none' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: '#71717a' }}>{position}</span>
        </div>
        <span style={{ color: '#52525b', fontSize: 14 }}>{POSITION_LABELS[position]} — tap to pick</span>
        {!disabled && <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" /></svg>}
      </motion.button>
    );
  }
  const t = getTheme(player.league);
  const parts = player.name.trim().split(' ');
  const displayName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
  const showCS = player.position === 'GK' || player.position === 'DEF';
  return (
    <motion.button onClick={!disabled ? onClick : undefined} whileTap={disabled ? undefined : { scale: 0.98 }}
      style={{ width: '100%', textAlign: 'left', position: 'relative', overflow: 'hidden', borderRadius: 16, background: t.cardBg, border: `1px solid ${t.accent}44`, boxShadow: `0 4px 16px ${t.accent}18`, outline: 'none', cursor: disabled ? 'default' : 'pointer' }}>
      <div style={{ position: 'absolute', inset: 0, background: t.foil, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${t.accent}99,transparent)` }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
        <PlayerImage player={player} size={42} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, minWidth: 34 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: t.accent, lineHeight: 1 }}>{player.points}</span>
          <span style={{ fontSize: 8, fontWeight: 900, color: t.accent+'aa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>pts</span>
          <span style={{ fontSize: 8, fontWeight: 900, color: t.accent, background: t.accent+'22', padding: '1px 5px', borderRadius: 4, marginTop: 2, textTransform: 'uppercase' }}>{position}</span>
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', margin: '4px 0', background: t.accent+'33' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 13, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{displayName}</p>
          <p style={{ color: '#a1a1aa', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatTeamName(player.team)}</p>
          <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 99, marginTop: 4, background: t.tag.bg, color: t.tag.text, border: `1px solid ${t.tag.border}` }}>{player.league}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <MiniStat label="G" value={player.goals} accent={t.accent} />
          <MiniStat label="A" value={player.assists} accent={t.accent} />
          {showCS && <MiniStat label="CS" value={player.clean_sheets} accent={t.accent} />}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${t.accent}44,transparent)` }} />
    </motion.button>
  );
}

function CodeBanner({ lobby, copyable, copied, onCopy }: { lobby: any; copyable?: boolean; copied: boolean; onCopy: () => void }) {
  if (!lobby) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '12px 16px', marginBottom: 16 }}>
      <div>
        <p style={{ color: '#71717a', fontSize: 11 }}>{copyable ? 'Invite friends' : 'Invite code'}</p>
        <p style={{ color: '#00FF87', fontWeight: 900, fontSize: 20, letterSpacing: '0.12em', marginTop: 2 }}>{lobby.code}</p>
      </div>
      {copyable && (
        <motion.button onClick={onCopy} whileTap={{ scale: 0.92 }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 14px', borderRadius: 99, border: copied ? '1px solid #00FF87' : '1px solid rgba(255,255,255,0.12)', background: copied ? 'rgba(0,255,135,0.08)' : 'rgba(255,255,255,0.05)', color: copied ? '#00FF87' : '#71717a', cursor: 'pointer', transition: 'all 0.2s' }}>
          <AnimatePresence mode="wait">
            {copied
              ? <motion.span key="ok" style={{ display: 'flex', alignItems: 'center', gap: 4 }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="#00FF87" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Copied!
                </motion.span>
              : <motion.span key="cp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Copy</motion.span>
            }
          </AnimatePresence>
        </motion.button>
      )}
    </div>
  );
}

function PlayerPickerModal({ pickingSlot, filteredPlayers, playerLoadState, playerSearch, leagueFilter, visibleRange, gridRef, onClose, onSelect, onSearchChange, onLeagueChange }: {
  pickingSlot: number; filteredPlayers: Player[]; playerLoadState: 'idle'|'loading'|'ready';
  playerSearch: string; leagueFilter: string; visibleRange: { start: number; end: number };
  gridRef: React.RefObject<HTMLDivElement | null>; onClose: () => void; onSelect: (p: Player) => void;
  onSearchChange: (v: string) => void; onLeagueChange: (v: string) => void;
}) {
  const modalTheme = leagueFilter !== 'All' ? getTheme(leagueFilter) : DEFAULT_THEME;
  return (
    <AnimatePresence>
      <motion.div key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        onClick={onClose}>
        <motion.div key="modal" initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }} exit={{ opacity: 0, scale: 0.92, y: 20, transition: { duration: 0.18 } }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 420, maxHeight: '82vh', display: 'flex', flexDirection: 'column', borderRadius: 24, background: modalTheme.sheetBg, backdropFilter: 'blur(32px) saturate(1.8)', WebkitBackdropFilter: 'blur(32px) saturate(1.8)', border: `1px solid ${modalTheme.accent}33`, boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)' }}>
          <div style={{ padding: '20px 20px 12px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0 }}>Pick {POSITION_LABELS[POSITIONS[pickingSlot]]}</p>
                <p style={{ color: '#71717a', fontSize: 11, marginTop: 3 }}>Top {filteredPlayers.length} · search to find more</p>
              </div>
              <button onClick={onClose} style={{ color: '#71717a', fontSize: 12, border: '1px solid rgba(255,255,255,0.12)', padding: '5px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', cursor: 'pointer' }}>Close</button>
            </div>
            <input type="text" value={playerSearch} onChange={e => onSearchChange(e.target.value)} placeholder="Search player or team…"
              style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '9px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LEAGUES.map(league => {
                const active = leagueFilter === league;
                const lc = LEAGUE_THEME[league]?.tag;
                return (
                  <button key={league} onClick={() => onLeagueChange(league)}
                    style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer', ...(active ? lc ? { background: lc.bg, color: lc.text, border: `1px solid ${lc.border}` } : { background: '#00FF87', color: '#000', border: '1px solid #00FF87' } : { background: 'rgba(255,255,255,0.07)', color: '#71717a', border: '1px solid rgba(255,255,255,0.1)' }) }}>
                    {league}
                  </button>
                );
              })}
            </div>
          </div>
          <div ref={gridRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: 14 }}>
            {playerLoadState === 'loading' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>{Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : filteredPlayers.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}><p style={{ color: '#71717a', fontSize: 14 }}>No players found</p></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, gridTemplateRows: `repeat(${Math.ceil(filteredPlayers.length / 3)}, 158px)` }}>
                {filteredPlayers.map((p, i) => {
                  const inView = i >= visibleRange.start && i < visibleRange.end;
                  return inView ? <FifaCard key={p.id} player={p} index={i} onClick={() => onSelect(p)} /> : <div key={p.id} style={{ height: 158, borderRadius: 16, background: 'rgba(255,255,255,0.02)' }} />;
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function LockedScreen() {
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '0 24px' }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, fontSize: 36 }}>⚽</div>
        <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Fantasy Football</h2>
        <p style={{ color: '#71717a', fontSize: 14, lineHeight: 1.6, margin: '0 0 32px' }}>Sign in to build your squad, open packs, and compete in private lobbies every gameweek.</p>
        <button onClick={signInWithGoogle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#fff', color: '#000', fontWeight: 600, fontSize: 14, padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Sign in with Google
        </button>
        <p style={{ color: '#52525b', fontSize: 12, marginTop: 16 }}>Free to sign up · No credit card required</p>
      </div>
    </div>
  );
}

// ─── Pack Open Modal ──────────────────────────────────────────────────────────
function PackOpenModal({ pack, pulledPlayers, onClose }: { pack: typeof PACKS[0]; pulledPlayers: Player[]; onClose: () => void }) {
  const [revealed, setRevealed] = useState<boolean[]>(new Array(pulledPlayers.length).fill(false));
  const [allRevealed, setAllRevealed] = useState(false);
  const revealNext = () => {
    const idx = revealed.findIndex(r => !r);
    if (idx === -1) return;
    const next = [...revealed]; next[idx] = true; setRevealed(next);
    if (next.every(Boolean)) setAllRevealed(true);
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 280 }} style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>{pack.icon}</div>
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>{pack.name} Opened!</p>
          <p style={{ color: '#71717a', fontSize: 12, marginTop: 4 }}>Tap cards to reveal · {pulledPlayers.length} players</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(pulledPlayers.length, 3)}, 1fr)`, gap: 10, marginBottom: 20 }}>
          {pulledPlayers.map((p, i) => (
            <div key={i} onClick={() => !revealed[i] && revealNext()} style={{ cursor: revealed[i] ? 'default' : 'pointer' }}>
              <AnimatePresence mode="wait">
                {revealed[i]
                  ? <motion.div key="card" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.3 }}><FifaCard player={p} showRarity /></motion.div>
                  : <motion.div key="back" whileTap={{ scale: 0.95 }} style={{ height: 158, borderRadius: 16, background: pack.gradient, border: `1.5px solid ${pack.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ fontSize: 32 }}>{pack.icon}</motion.span>
                    </motion.div>
                }
              </AnimatePresence>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!allRevealed && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setRevealed(new Array(pulledPlayers.length).fill(true)); setAllRevealed(true); }}
              style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
              Reveal All
            </motion.button>
          )}
          {allRevealed && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={onClose} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ flex: 1, padding: '14px', borderRadius: 14, background: '#00FF87', border: 'none', color: '#000', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Add to Collection →
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FantasyScreen() {
  const pb = 'calc(env(safe-area-inset-bottom,0px) + 120px)';
  const px = '20px';

  // ── Auth ────────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [rootScreen, setRootScreen] = useState<RootScreen>('landing');
  const [teamSubScreen, setTeamSubScreen] = useState<TeamSubScreen>('collection');
  const [lobbyScreen, setLobbyScreen] = useState<LobbyScreen>('hub');

  // ── Team / currency ─────────────────────────────────────────────────────────
  const [currency, setCurrencyState] = useState<Currency>({ coins: 2000, gems: 50 });
  const [ownedPlayers, setOwnedPlayers] = useState<OwnedPlayer[]>([]);
  const [canClaimDaily, setCanClaimDaily] = useState(false);
  const [canClaimFreePack, setCanClaimFreePack] = useState(false);
  const [freePackCooldown, setFreePackCooldown] = useState('');
  const [openingPack, setOpeningPack] = useState<typeof PACKS[0] | null>(null);
  const [pulledPlayers, setPulledPlayers] = useState<Player[]>([]);
  const [buyingPlayer, setBuyingPlayer] = useState<Player | null>(null);
  const [posFilter, setPosFilter] = useState('All');
  const [rarityFilter, setRarityFilter] = useState('All');
  const [storeSearch, setStoreSearch] = useState('');
  const [storeLeagueFilter, setStoreLeagueFilter] = useState('All');
  const [toast, setToast] = useState('');

  // ── Lobby ───────────────────────────────────────────────────────────────────
  const [hydrated, setHydrated] = useState(false);
  const [currentLobby, setCurrentLobby] = useState<any>(null);
  const [members, setMembers] = useState<LobbyMember[]>([]);
  const [mySquad, setMySquad] = useState<(Player | null)[]>([null, null, null, null, null]);
  const [squadSaved, setSquadSaved] = useState(false);
  const [lobbyName, setLobbyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [lobbyError, setLobbyError] = useState('');

  // ── Players (shared pool) ───────────────────────────────────────────────────
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [leagueFilter, setLeagueFilter] = useState('All');
  const [playerLoadState, setPlayerLoadState] = useState<'idle'|'loading'|'ready'>('idle');
  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 30 });
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null; setUser(u); setIsGuest(!u); setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || isGuest) return;
    // Load team data
    setCurrencyState(LS.get('team_currency', { coins: 2000, gems: 50 }));
    setOwnedPlayers(LS.get('team_owned_players', []));
    const lastDaily = LS.get('team_last_daily', 0);
    setCanClaimDaily(Date.now() - lastDaily > 24 * 60 * 60 * 1000);
    const lastFree = LS.get('team_last_free_pack', 0);
    const diff = Date.now() - lastFree;
    setCanClaimFreePack(diff > DAILY_FREE_PACK_COOLDOWN);
    if (diff < DAILY_FREE_PACK_COOLDOWN) {
      const h = Math.floor((DAILY_FREE_PACK_COOLDOWN - diff) / 3600000);
      const m = Math.floor(((DAILY_FREE_PACK_COOLDOWN - diff) % 3600000) / 60000);
      setFreePackCooldown(`${h}h ${m}m`);
    }
    // Restore lobby
    const savedLobby = LS.get('fantasy_lobby', null);
    const savedUsername = LS.get('fantasy_username', '');
    const savedLobbyScreen = LS.get('fantasy_lobby_screen', null);
    if (savedLobby) {
      setCurrentLobby(savedLobby);
      if (savedUsername) setUsername(savedUsername);
      if (savedLobbyScreen) setLobbyScreen(savedLobbyScreen);
      fetchLobbyData(savedLobby.id);
      fetchMySquad(savedLobby.id, user.id);
    } else {
      checkExistingLobby(user.id);
    }
    setHydrated(true);
  }, [user, isGuest]);

  // Persist lobby
  useEffect(() => {
    if (!hydrated) return;
    if (currentLobby) {
      LS.set('fantasy_lobby', currentLobby);
      LS.set('fantasy_username', username);
      LS.set('fantasy_lobby_screen', lobbyScreen === 'pick' || lobbyScreen === 'lobby' ? lobbyScreen : 'lobby');
    } else {
      LS.del('fantasy_lobby'); LS.del('fantasy_username'); LS.del('fantasy_lobby_screen');
    }
  }, [currentLobby, username, lobbyScreen, hydrated]);

  // Virtual scroll
  useEffect(() => {
    const el = gridRef.current; if (!el) return;
    const CARD_H = 168; const COLS = 3;
    const handle = () => {
      const s = el.scrollTop; const v = el.clientHeight;
      const sr = Math.max(0, Math.floor(s / CARD_H) - 1);
      const er = Math.ceil((s + v) / CARD_H) + 1;
      setVisibleRange({ start: sr * COLS, end: er * COLS });
    };
    el.addEventListener('scroll', handle, { passive: true }); handle();
    return () => el.removeEventListener('scroll', handle);
  }, [pickingSlot, filteredPlayers]);

  // Filter players for picker
  useEffect(() => {
    let f = [...players];
    if (leagueFilter !== 'All') f = f.filter(p => p.league === leagueFilter);
    if (playerSearch) { const q = playerSearch.toLowerCase(); f = f.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)); }
    if (pickingSlot !== null) { const want = POSITIONS[pickingSlot]; f = f.filter(p => p.position === want); }
    f.sort((a, b) => b.points - a.points);
    setFilteredPlayers(f.slice(0, (playerSearch || leagueFilter !== 'All') ? 200 : 50));
  }, [players, playerSearch, leagueFilter, pickingSlot]);

  // ── Team actions ────────────────────────────────────────────────────────────
  const saveCurrency = (c: Currency) => { setCurrencyState(c); LS.set('team_currency', c); };
  const saveOwned = (p: OwnedPlayer[]) => { setOwnedPlayers(p); LS.set('team_owned_players', p); };

  const claimDaily = () => {
    saveCurrency({ ...currency, coins: currency.coins + DAILY_COINS });
    LS.set('team_last_daily', Date.now()); setCanClaimDaily(false);
    showToast(`+${DAILY_COINS.toLocaleString()} coins! 🪙`);
  };

  const addToCollection = (newPlayers: Player[]) => {
    const updated = [...ownedPlayers];
    for (const p of newPlayers) {
      const ex = updated.find(o => o.id === p.id);
      if (ex) ex.quantity += 1;
      else updated.push({ ...p, ownedAt: Date.now(), quantity: 1 });
    }
    saveOwned(updated);
  };

  const openPack = (pack: typeof PACKS[0]) => {
    if (pack.id === 'free_daily') {
      if (!canClaimFreePack) return;
      LS.set('team_last_free_pack', Date.now()); setCanClaimFreePack(false);
    } else if (pack.currency === 'coins') {
      if (currency.coins < pack.cost) { showToast('Not enough coins 🪙'); return; }
      saveCurrency({ ...currency, coins: currency.coins - pack.cost });
    } else {
      if (currency.gems < pack.cost) { showToast('Not enough gems 💎'); return; }
      saveCurrency({ ...currency, gems: currency.gems - pack.cost });
    }
    const pool = players.length > 0 ? players : [];
    if (pool.length === 0) { showToast('Loading players, try again…'); return; }
    const pulled: Player[] = [];
    for (let i = 0; i < pack.size; i++) {
      const rarity = rollRarity(pack.rarityWeights);
      const rarityPool = pool.filter(p => {
        if (rarity === 'legendary') return p.points >= 200;
        if (rarity === 'epic') return p.points >= 150 && p.points < 200;
        if (rarity === 'rare') return p.points >= 80 && p.points < 150;
        return p.points < 80;
      });
      const src = rarityPool.length > 0 ? rarityPool : pool;
      pulled.push({ ...src[Math.floor(Math.random() * src.length)], rarity });
    }
    setPulledPlayers(pulled); setOpeningPack(pack);
  };

  const closePack = () => {
    addToCollection(pulledPlayers);
    showToast(`${pulledPlayers.length} players added! ✅`);
    setOpeningPack(null); setPulledPlayers([]);
  };

  const buyPlayer = () => {
    if (!buyingPlayer) return;
    const cost = ({ common: 500, rare: 1500, epic: 4000, legendary: 10000 } as Record<string, number>)[buyingPlayer.rarity ?? 'common'];
    if (currency.coins < cost) return;
    saveCurrency({ ...currency, coins: currency.coins - cost });
    addToCollection([buyingPlayer]);
    showToast(`${buyingPlayer.name.split(' ').slice(-1)[0]} added! ✅`);
    setBuyingPlayer(null);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  // ── Lobby actions ───────────────────────────────────────────────────────────
  const checkExistingLobby = async (userId: string) => {
    const { data } = await supabase.from('lobby_members').select('*, lobbies(*)').eq('user_id', userId).single();
    if (data) {
      setCurrentLobby(data.lobbies); setUsername(data.username);
      await fetchLobbyData(data.lobbies.id); await fetchMySquad(data.lobbies.id, userId);
      setLobbyScreen('lobby'); setRootScreen('lobbies');
    }
    setHydrated(true);
  };

  const fetchLobbyData = async (id: string) => {
    const { data } = await supabase.from('lobby_members').select('*').eq('lobby_id', id).order('total_points', { ascending: false });
    setMembers(data || []);
  };

  const fetchMySquad = async (lobbyId: string, userId: string) => {
    const { data } = await supabase.from('squads').select('*').eq('lobby_id', lobbyId).eq('user_id', userId).single();
    if (data?.player_ids?.length > 0) {
      const { data: pd } = await supabase.from('players').select('*').in('id', data.player_ids);
      if (pd) {
        const norm = pd.map(normalizePlayer);
        setMySquad(data.player_ids.map((id: string) => norm.find(p => p.id === id) || null));
        setSquadSaved(true);
      }
    }
  };

  const fetchPlayers = async () => {
    if (players.length > 0) { setPlayerLoadState('ready'); return; }
    const cached = localStorage.getItem('fantasy_players');
    const cachedAt = localStorage.getItem('fantasy_players_at');
    if (cached && cachedAt && Date.now() - Number(cachedAt) < 3600000) {
      setPlayers(JSON.parse(cached)); setPlayerLoadState('ready'); return;
    }
    setPlayerLoadState('loading');
    const PAGE = 1000; let all: any[] = []; let from = 0;
    while (true) {
      const { data, error } = await supabase.from('players').select('*').order('points', { ascending: false }).range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      all = all.concat(data); if (data.length < PAGE) break; from += PAGE;
    }
    const norm = all.map(normalizePlayer);
    localStorage.setItem('fantasy_players', JSON.stringify(norm));
    localStorage.setItem('fantasy_players_at', String(Date.now()));
    setPlayers(norm); setPlayerLoadState('ready');
  };

  const createLobby = async () => {
    if (!user || !lobbyName.trim() || !username.trim()) return;
    setLobbyLoading(true); setLobbyError('');
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: lobby, error: e } = await supabase.from('lobbies').insert({ name: lobbyName.trim(), code, created_by: user.id }).select().single();
    if (e || !lobby) { setLobbyError('Failed to create lobby'); setLobbyLoading(false); return; }
    const { error: me } = await supabase.from('lobby_members').insert({ lobby_id: lobby.id, user_id: user.id, username: username.trim() });
    if (me) { setLobbyError('Failed to join lobby'); setLobbyLoading(false); return; }
    setCurrentLobby(lobby); await fetchLobbyData(lobby.id); setLobbyLoading(false); setLobbyScreen('pick'); fetchPlayers();
  };

  const joinLobby = async () => {
    if (!user || !joinCode.trim() || !username.trim()) return;
    setLobbyLoading(true); setLobbyError('');
    const { data: lobby } = await supabase.from('lobbies').select('*').eq('code', joinCode.trim().toUpperCase()).single();
    if (!lobby) { setLobbyError('Lobby not found — check the code'); setLobbyLoading(false); return; }
    const { error: me } = await supabase.from('lobby_members').insert({ lobby_id: lobby.id, user_id: user.id, username: username.trim() });
    if (me) { setLobbyError('Could not join — already a member?'); setLobbyLoading(false); return; }
    setCurrentLobby(lobby); await fetchLobbyData(lobby.id); setLobbyLoading(false); setLobbyScreen('pick'); fetchPlayers();
  };

  const saveSquad = async () => {
    if (!user || !currentLobby || mySquad.some(p => p === null)) { setLobbyError('Pick all 5 players first'); return; }
    setLobbyLoading(true);
    const { error: e } = await supabase.from('squads').upsert({ lobby_id: currentLobby.id, user_id: user.id, player_ids: mySquad.map(p => p!.id) }, { onConflict: 'lobby_id,user_id' });
    if (e) setLobbyError('Failed to save squad');
    else { setSquadSaved(true); setLobbyScreen('lobby'); await fetchLobbyData(currentLobby.id); }
    setLobbyLoading(false);
  };

  const leaveLobby = async () => {
    if (!user || !currentLobby) return;
    await supabase.from('lobby_members').delete().eq('lobby_id', currentLobby.id).eq('user_id', user.id);
    await supabase.from('squads').delete().eq('lobby_id', currentLobby.id).eq('user_id', user.id);
    LS.del('fantasy_lobby'); LS.del('fantasy_username'); LS.del('fantasy_lobby_screen');
    setCurrentLobby(null); setMembers([]); setMySquad([null,null,null,null,null]);
    setSquadSaved(false); setLobbyScreen('hub'); setRootScreen('landing');
  };

  const openPicker = (slot: number) => {
    setPickingSlot(slot); setPlayerSearch(''); setLeagueFilter('All'); setVisibleRange({ start: 0, end: 30 }); fetchPlayers();
  };
  const closePicker = useCallback(() => setPickingSlot(null), []);
  const selectPlayer = (player: Player) => {
    if (pickingSlot === null) return;
    const sq = [...mySquad]; sq[pickingSlot] = player; setMySquad(sq); closePicker();
  };
  const copyCode = () => {
    if (!currentLobby) return;
    navigator.clipboard.writeText(currentLobby.code); setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filteredOwned = ownedPlayers.filter(p => {
    if (posFilter !== 'All' && p.position !== posFilter) return false;
    if (rarityFilter !== 'All' && p.rarity !== rarityFilter.toLowerCase()) return false;
    return true;
  }).sort((a, b) => b.points - a.points);

  const storePlayers = players.filter(p => {
    if (storeLeagueFilter !== 'All' && p.league !== storeLeagueFilter) return false;
    if (storeSearch) { const q = storeSearch.toLowerCase(); if (!p.name.toLowerCase().includes(q) && !p.team.toLowerCase().includes(q)) return false; }
    return true;
  }).map(p => assignRarity(p)).slice(0, 60);

  const isOwned = (id: string) => ownedPlayers.some(o => o.id === id);

  // ── Coming soon lock ─────────────────────────────────────────────────────────
return (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '0 24px', textAlign: 'center' }}>
    <div style={{ fontSize: 48, marginBottom: 20 }}>🚧</div>
    <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 26, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
      Coming Soon
    </h2>
    <p style={{ color: '#52525b', fontSize: 14, lineHeight: 1.6, maxWidth: 280, margin: '0 auto' }}>
      Fantasy Football is under construction. Check back soon.
    </p>
  </div>
);

// ── Render guards ─────────────────────────────────────────────────────────────
  // ── Render guards ────────────────────────────────────────────────────────────
  if (authLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #00FF87', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (isGuest) return <LockedScreen />;

  // ── Page header ──────────────────────────────────────────────────────────────
  const headerTitle =
    rootScreen === 'team' ? (teamSubScreen === 'collection' ? 'Collection' : teamSubScreen === 'store' ? 'Store' : 'Packs')
    : rootScreen === 'lobbies' ? (lobbyScreen === 'create' ? 'Create Lobby' : lobbyScreen === 'join' ? 'Join Lobby' : lobbyScreen === 'pick' ? 'Pick Squad' : lobbyScreen === 'lobby' ? (currentLobby?.name || 'Lobby') : 'Lobbies')
    : 'Fantasy';

  const showBack = rootScreen !== 'landing';

  const handleBack = () => {
    if (rootScreen === 'team') { setRootScreen('landing'); return; }
    if (rootScreen === 'lobbies') {
      if (lobbyScreen === 'hub') { setRootScreen('landing'); return; }
      if (lobbyScreen === 'create' || lobbyScreen === 'join') { setLobbyScreen('hub'); return; }
      if (lobbyScreen === 'pick' || lobbyScreen === 'lobby') { setLobbyScreen('hub'); return; }
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative' }}>
      {/* Header */}
      <div style={{ padding: '44px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#00FF87', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#000', fontWeight: 900, fontSize: 13, letterSpacing: '-0.04em' }}>MD</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>{headerTitle}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Currency pill always visible */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, padding: '4px 10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: 12 }}>🪙</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{currency.coins.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, padding: '4px 10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: 12 }}>💎</span>
              <span style={{ color: '#c084fc', fontWeight: 700, fontSize: 12 }}>{currency.gems}</span>
            </div>
          </div>
          {showBack
            ? <button onClick={handleBack} style={{ color: '#71717a', fontSize: 12, border: '1px solid rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: 99, background: 'none', cursor: 'pointer' }}>Back</button>
            : null
          }
          {rootScreen === 'lobbies' && lobbyScreen === 'lobby' && (
            <motion.button onClick={leaveLobby} whileHover={{ color: '#f87171', borderColor: '#f87171' }}
              style={{ color: '#71717a', fontSize: 12, border: '1px solid rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: 99, background: 'none', cursor: 'pointer' }}>Leave</motion.button>
          )}
          {canClaimDaily && (
            <motion.button whileTap={{ scale: 0.93 }} onClick={claimDaily}
              style={{ background: 'rgba(0,255,135,0.12)', border: '1px solid #00FF87', borderRadius: 99, padding: '4px 10px', color: '#00FF87', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
              +{DAILY_COINS.toLocaleString()}
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ══ LANDING ══ */}
        {rootScreen === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
            style={{ padding: `0 ${px} ${pb}` }}>
            {/* Hero */}
            <div style={{ borderRadius: 20, padding: 20, marginBottom: 16, background: 'linear-gradient(135deg,#0f2a1c 0%,#0a1a12 100%)', border: '1px solid rgba(0,255,135,0.15)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: '#00FF87', opacity: 0.07, filter: 'blur(50px)' }} />
              <p style={{ color: '#00FF87', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Fantasy Football</p>
              <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 900, lineHeight: 1.1, marginBottom: 8, letterSpacing: '-0.02em' }}>Build.<br />Collect.<br />Compete.</h2>
              <p style={{ color: '#71717a', fontSize: 13, lineHeight: 1.5 }}>Open packs, grow your collection, beat your mates every gameweek.</p>
            </div>

            {/* Two equal entry cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {/* My Team */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setRootScreen('team'); fetchPlayers(); }}
                style={{ borderRadius: 20, padding: '20px 16px', background: 'linear-gradient(135deg,#2d1b4e 0%,#1a0a33 100%)', border: '1px solid rgba(192,132,252,0.25)', cursor: 'pointer', outline: 'none', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: '#c084fc', opacity: 0.12, filter: 'blur(30px)' }} />
                <div style={{ fontSize: 28, marginBottom: 10 }}>⭐</div>
                <p style={{ color: '#c084fc', fontWeight: 900, fontSize: 15, marginBottom: 4 }}>My Team</p>
                <p style={{ color: '#71717a', fontSize: 11, lineHeight: 1.4 }}>Packs, store & collection</p>
                <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.25)', borderRadius: 99, padding: '3px 10px' }}>
                  <span style={{ color: '#c084fc', fontSize: 10, fontWeight: 700 }}>{ownedPlayers.length} players</span>
                </div>
              </motion.button>

              {/* Lobbies */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setRootScreen('lobbies')}
                style={{ borderRadius: 20, padding: '20px 16px', background: 'linear-gradient(135deg,#0f2a1c 0%,#091510 100%)', border: `1px solid ${currentLobby ? 'rgba(0,255,135,0.35)' : 'rgba(0,255,135,0.15)'}`, cursor: 'pointer', outline: 'none', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: '#00FF87', opacity: 0.1, filter: 'blur(30px)' }} />
                <div style={{ fontSize: 28, marginBottom: 10 }}>🏟️</div>
                <p style={{ color: '#00FF87', fontWeight: 900, fontSize: 15, marginBottom: 4 }}>Lobbies</p>
                <p style={{ color: '#71717a', fontSize: 11, lineHeight: 1.4 }}>Compete with friends</p>
                <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 4, background: currentLobby ? 'rgba(0,255,135,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${currentLobby ? 'rgba(0,255,135,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 99, padding: '3px 10px' }}>
                  <span style={{ color: currentLobby ? '#00FF87' : '#52525b', fontSize: 10, fontWeight: 700 }}>{currentLobby ? 'Active lobby' : 'No lobby'}</span>
                </div>
              </motion.button>
            </div>

            {/* Points guide */}
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>How points work</p>
              </div>
              {[{ label: 'Goal scored', pts: '+5 pts', color: '#00FF87' }, { label: 'Assist', pts: '+3 pts', color: '#60a5fa' }, { label: 'Clean sheet (GK/DEF)', pts: '+4 pts', color: '#a78bfa' }].map(({ label, pts, color }, i) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ color: '#a1a1aa', fontSize: 13 }}>{label}</span>
                  <span style={{ color, fontSize: 13, fontWeight: 700 }}>{pts}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ══ MY TEAM ══ */}
        {rootScreen === 'team' && (
          <motion.div key="team" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
            {/* Sub-nav */}
            <div style={{ display: 'flex', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 0 }}>
              {(['collection', 'store', 'packs'] as TeamSubScreen[]).map(tab => (
                <button key={tab} onClick={() => { setTeamSubScreen(tab); if (tab === 'store' || tab === 'packs') fetchPlayers(); }}
                  style={{ flex: 1, padding: '10px 4px', background: 'none', border: 'none', cursor: 'pointer', color: teamSubScreen === tab ? '#fff' : '#52525b', fontWeight: teamSubScreen === tab ? 700 : 500, fontSize: 13, textTransform: 'capitalize', borderBottom: `2px solid ${teamSubScreen === tab ? '#c084fc' : 'transparent'}`, transition: 'all 0.18s' }}>
                  {tab === 'collection' ? `Collection (${ownedPlayers.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Collection */}
            {teamSubScreen === 'collection' && (
              <div style={{ padding: `16px ${px} ${pb}` }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                  {['All','GK','DEF','MID','FWD'].map(f => (
                    <button key={f} onClick={() => setPosFilter(f)} style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: posFilter === f ? '#c084fc' : 'rgba(255,255,255,0.07)', color: posFilter === f ? '#000' : '#71717a', border: posFilter === f ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.1)' }}>{f}</button>
                  ))}
                  {['All','Common','Rare','Epic','Legendary'].map(f => (
                    <button key={f} onClick={() => setRarityFilter(f)} style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: rarityFilter === f ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)', color: rarityFilter === f ? '#fff' : '#52525b', border: rarityFilter === f ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.07)' }}>{f}</button>
                  ))}
                </div>
                {filteredOwned.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                    <p style={{ color: '#71717a', fontSize: 14, marginBottom: 6 }}>No players yet</p>
                    <p style={{ color: '#52525b', fontSize: 12, marginBottom: 16 }}>Open packs or buy from the store</p>
                    <motion.button whileTap={{ scale: 0.96 }} onClick={() => setTeamSubScreen('packs')} style={{ background: '#c084fc', color: '#000', fontWeight: 700, fontSize: 13, padding: '10px 24px', borderRadius: 99, border: 'none', cursor: 'pointer' }}>Open Packs</motion.button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {filteredOwned.map((p, i) => (
                      <motion.div key={p.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }} style={{ position: 'relative' }}>
                        <FifaCard player={p} showRarity />
                        {p.quantity > 1 && <div style={{ position: 'absolute', top: 6, left: 6, background: '#c084fc', color: '#000', fontWeight: 900, fontSize: 9, padding: '2px 6px', borderRadius: 99 }}>x{p.quantity}</div>}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Store */}
            {teamSubScreen === 'store' && (
              <div style={{ padding: `16px ${px} ${pb}` }}>
                <input type="text" value={storeSearch} onChange={e => setStoreSearch(e.target.value)} placeholder="Search player or team…"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '9px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                  {['All','Premier League','La Liga','Bundesliga','Serie A','Ligue 1'].map(l => (
                    <button key={l} onClick={() => setStoreLeagueFilter(l)} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: storeLeagueFilter === l ? '#c084fc' : 'rgba(255,255,255,0.07)', color: storeLeagueFilter === l ? '#000' : '#71717a', border: storeLeagueFilter === l ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.1)' }}>{l === 'All' ? 'All Leagues' : l}</button>
                  ))}
                </div>
                {playerLoadState === 'loading' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>{Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {storePlayers.map((p, i) => (
                      <motion.div key={p.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.015 }} style={{ position: 'relative' }}>
                        <FifaCard player={p} showRarity onClick={() => setBuyingPlayer(p)} />
                        {isOwned(p.id) && (
                          <div style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: '#00FF87', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                          <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: 99, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ fontSize: 9 }}>🪙</span>
                            <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>
                              {({ common:'500', rare:'1,500', epic:'4,000', legendary:'10,000' } as Record<string,string>)[p.rarity ?? 'common']}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Packs */}
            {teamSubScreen === 'packs' && (
              <div style={{ padding: `16px ${px} ${pb}`, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {PACKS.map((pack, i) => {
                  const isFree = pack.id === 'free_daily';
                  const locked = isFree && !canClaimFreePack;
                  return (
                    <motion.div key={pack.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                      <div style={{ borderRadius: 20, overflow: 'hidden', background: pack.gradient, border: `1px solid ${pack.accent}44`, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${pack.accent}cc,transparent)` }} />
                        <div style={{ padding: '18px 18px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ fontSize: 34, flexShrink: 0 }}>{pack.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: '#fff', fontWeight: 900, fontSize: 15 }}>{pack.name}</p>
                            <p style={{ color: '#a1a1aa', fontSize: 11, marginTop: 2 }}>{pack.description}</p>
                            <div style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                              {Object.entries(pack.rarityWeights).filter(([,w]) => w > 0).map(([r, w]) => (
                                <span key={r} style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: RARITY_CONFIG[r as keyof typeof RARITY_CONFIG].color + '22', color: RARITY_CONFIG[r as keyof typeof RARITY_CONFIG].color, border: `1px solid ${RARITY_CONFIG[r as keyof typeof RARITY_CONFIG].border}` }}>{r} {w}%</span>
                              ))}
                            </div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            {locked ? (
                              <div>
                                <p style={{ color: '#71717a', fontSize: 9, marginBottom: 3 }}>Next in</p>
                                <p style={{ color: pack.accent, fontWeight: 700, fontSize: 12 }}>{freePackCooldown}</p>
                              </div>
                            ) : (
                              <motion.button whileTap={{ scale: 0.93 }} onClick={() => openPack(pack)}
                                style={{ background: isFree ? pack.accent : pack.accent + '22', color: isFree ? '#000' : pack.accent, fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 12, border: isFree ? 'none' : `1px solid ${pack.accent}55`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                {isFree ? 'Free!' : <><span>{pack.currency === 'coins' ? '🪙' : '💎'}</span><span>{pack.cost.toLocaleString()}</span></>}
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ══ LOBBIES ══ */}
        {rootScreen === 'lobbies' && (
          <motion.div key="lobbies" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
            <AnimatePresence mode="wait">
              {/* Hub */}
              {lobbyScreen === 'hub' && (
                <motion.div key="hub" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                  style={{ padding: `8px ${px} ${pb}` }}>
                  {currentLobby ? (
                    <div style={{ marginBottom: 16, padding: 16, borderRadius: 16, background: 'rgba(0,255,135,0.06)', border: '1px solid rgba(0,255,135,0.2)' }}>
                      <p style={{ color: '#71717a', fontSize: 11, marginBottom: 4 }}>Active lobby</p>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{currentLobby.name}</p>
                      <p style={{ color: '#00FF87', fontWeight: 900, fontSize: 18, letterSpacing: '0.1em', marginTop: 4 }}>{currentLobby.code}</p>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setLobbyScreen('lobby')} style={{ marginTop: 10, width: '100%', background: '#00FF87', color: '#000', fontWeight: 700, fontSize: 14, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer' }}>
                        Go to Lobby →
                      </motion.button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setLobbyScreen('create')} style={{ width: '100%', background: '#00FF87', color: '#000', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer' }}>Create a Lobby</motion.button>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setLobbyScreen('join')} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 600, fontSize: 15, padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>Join with a Code</motion.button>
                    </div>
                  )}
                  <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <p style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>How it works</p>
                    </div>
                    {[{ icon: '🏟️', label: 'Private lobbies with friends' }, { icon: '⭐', label: 'Pick 5 players across Europe' }, { icon: '📈', label: 'Live points leaderboard' }].map(({ icon, label }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: 18 }}>{icon}</span>
                        <span style={{ color: '#a1a1aa', fontSize: 13 }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Create */}
              {lobbyScreen === 'create' && (
                <motion.div key="create" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                  style={{ padding: `16px ${px} ${pb}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[{ label: 'Lobby Name', val: lobbyName, set: setLobbyName, ph: 'e.g. Sunday League Lads' }, { label: 'Your Name', val: username, set: setUsername, ph: 'How your mates will see you' }].map(({ label, val, set, ph }) => (
                    <div key={label}>
                      <p style={{ color: '#71717a', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{label}</p>
                      <input type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '13px 16px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                  {lobbyError && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center' }}>{lobbyError}</p>}
                  <motion.button whileTap={{ scale: 0.97 }} onClick={createLobby} disabled={lobbyLoading || !lobbyName.trim() || !username.trim()} style={{ width: '100%', background: '#00FF87', color: '#000', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer', opacity: (lobbyLoading || !lobbyName.trim() || !username.trim()) ? 0.4 : 1 }}>{lobbyLoading ? 'Creating…' : 'Create Lobby'}</motion.button>
                </motion.div>
              )}

              {/* Join */}
              {lobbyScreen === 'join' && (
                <motion.div key="join" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                  style={{ padding: `16px ${px} ${pb}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[{ label: 'Lobby Code', val: joinCode, set: (v: string) => setJoinCode(v.toUpperCase()), ph: 'e.g. AB12CD', extra: { textTransform: 'uppercase' as const, letterSpacing: '0.1em' } }, { label: 'Your Name', val: username, set: setUsername, ph: 'How your mates will see you', extra: {} }].map(({ label, val, set, ph, extra }) => (
                    <div key={label}>
                      <p style={{ color: '#71717a', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{label}</p>
                      <input type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '13px 16px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', ...extra }} />
                    </div>
                  ))}
                  {lobbyError && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center' }}>{lobbyError}</p>}
                  <motion.button whileTap={{ scale: 0.97 }} onClick={joinLobby} disabled={lobbyLoading || !joinCode.trim() || !username.trim()} style={{ width: '100%', background: '#00FF87', color: '#000', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer', opacity: (lobbyLoading || !joinCode.trim() || !username.trim()) ? 0.4 : 1 }}>{lobbyLoading ? 'Joining…' : 'Join Lobby'}</motion.button>
                </motion.div>
              )}

              {/* Pick squad */}
              {lobbyScreen === 'pick' && (
                <motion.div key="pick" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                  style={{ padding: `8px ${px} ${pb}` }}>
                  <CodeBanner lobby={currentLobby} copied={copied} onCopy={copyCode} />
                  <p style={{ color: '#71717a', fontSize: 12, marginBottom: 14 }}>Tap a slot to pick. Locked once saved.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {POSITIONS.map((pos, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.18 }}>
                        <SquadSlotCard player={mySquad[i]} position={pos} disabled={squadSaved} onClick={() => { if (!squadSaved) openPicker(i); }} />
                      </motion.div>
                    ))}
                  </div>
                  {lobbyError && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>{lobbyError}</p>}
                  {!squadSaved
                    ? <motion.button whileTap={{ scale: 0.97 }} onClick={saveSquad} disabled={lobbyLoading || mySquad.some(p => p === null)} style={{ width: '100%', background: '#00FF87', color: '#000', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer', opacity: (lobbyLoading || mySquad.some(p => p === null)) ? 0.4 : 1 }}>{lobbyLoading ? 'Saving…' : 'Lock In Squad'}</motion.button>
                    : <motion.button whileTap={{ scale: 0.97 }} onClick={() => setLobbyScreen('lobby')} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 600, fontSize: 15, padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>View Lobby →</motion.button>
                  }
                </motion.div>
              )}

              {/* Lobby view */}
              {lobbyScreen === 'lobby' && (
                <motion.div key="lobby" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}
                  style={{ padding: `8px ${px} ${pb}` }}>
                  <CodeBanner lobby={currentLobby} copyable copied={copied} onCopy={copyCode} />
                  <p style={{ color: '#71717a', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Leaderboard</p>
                  <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 24, background: 'rgba(255,255,255,0.03)' }}>
                    {members.length === 0
                      ? <div style={{ padding: '24px 16px', textAlign: 'center' }}><p style={{ color: '#71717a', fontSize: 14 }}>No members yet</p></div>
                      : members.map((m, i) => {
                          const isMe = m.user_id === user?.id;
                          const rankColor = i === 0 ? '#00FF87' : i === 1 ? '#e4e4e7' : i === 2 ? '#d97706' : '#52525b';
                          return (
                            <motion.div key={m.user_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', background: isMe ? 'rgba(0,255,135,0.04)' : 'none' }}>
                              <span style={{ fontSize: 13, fontWeight: 900, width: 20, textAlign: 'center', color: rankColor }}>{i + 1}</span>
                              <div style={{ flex: 1 }}><p style={{ fontSize: 14, fontWeight: 600, color: isMe ? '#00FF87' : '#fff' }}>{m.username}{isMe && ' (you)'}</p></div>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{m.total_points} pts</span>
                            </motion.div>
                          );
                        })
                    }
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <p style={{ color: '#71717a', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>My Squad</p>
                    {squadSaved && <button onClick={() => setLobbyScreen('pick')} style={{ color: '#71717a', fontSize: 12, border: '1px solid rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 99, background: 'none', cursor: 'pointer' }}>Edit</button>}
                  </div>
                  {!squadSaved
                    ? <div style={{ borderRadius: 16, padding: '24px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <p style={{ color: '#71717a', fontSize: 14, marginBottom: 12 }}>You haven't picked your squad yet</p>
                        <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setLobbyScreen('pick'); fetchPlayers(); }} style={{ background: '#00FF87', color: '#000', fontWeight: 700, fontSize: 13, padding: '8px 20px', borderRadius: 99, border: 'none', cursor: 'pointer' }}>Pick Now</motion.button>
                      </div>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {mySquad.map((p, i) => p
                          ? <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                              <SquadSlotCard player={p} position={POSITIONS[i]} disabled />
                            </motion.div>
                          : null)}
                      </div>
                  }
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player picker modal */}
      {pickingSlot !== null && (
        <PlayerPickerModal
          pickingSlot={pickingSlot!} filteredPlayers={filteredPlayers} playerLoadState={playerLoadState}
          playerSearch={playerSearch} leagueFilter={leagueFilter} visibleRange={visibleRange} gridRef={gridRef}
          onClose={closePicker} onSelect={selectPlayer} onSearchChange={setPlayerSearch} onLeagueChange={setLeagueFilter}
        />
      )}

      {/* Pack opening modal */}
      <AnimatePresence>
        {openingPack && <PackOpenModal pack={openingPack!} pulledPlayers={pulledPlayers} onClose={closePack} />}
      </AnimatePresence>

      {/* Buy player modal */}
      <AnimatePresence>
        {buyingPlayer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBuyingPlayer(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 20px' }}>
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 430, background: 'rgba(12,12,12,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 20 }}>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ width: 110, flexShrink: 0 }}><FifaCard player={buyingPlayer!} showRarity /></div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ color: '#71717a', fontSize: 11, marginBottom: 4 }}>{buyingPlayer.league}</p>
                  <p style={{ color: '#fff', fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>{buyingPlayer.name}</p>
                  <p style={{ color: '#a1a1aa', fontSize: 12, marginTop: 4 }}>{formatTeamName(buyingPlayer.team)}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {[['G', buyingPlayer.goals], ['A', buyingPlayer.assists], ['CS', buyingPlayer.clean_sheets]].map(([l, v]) => (
                      <div key={String(l)} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '4px 8px', textAlign: 'center' }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{v}</div>
                        <div style={{ color: '#71717a', fontSize: 9, textTransform: 'uppercase' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {(() => {
                const cost = ({ common: 500, rare: 1500, epic: 4000, legendary: 10000 } as Record<string,number>)[buyingPlayer.rarity ?? 'common'];
                const canAfford = currency.coins >= cost;
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span style={{ color: '#71717a', fontSize: 13 }}>Price</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>🪙</span>
                        <span style={{ color: canAfford ? '#00FF87' : '#f87171', fontWeight: 900, fontSize: 18 }}>{cost.toLocaleString()}</span>
                      </div>
                    </div>
                    {!canAfford && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>Not enough coins</p>}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setBuyingPlayer(null)} style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#71717a', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
                      <motion.button whileTap={{ scale: 0.96 }} onClick={buyPlayer} disabled={!canAfford}
                        style={{ flex: 2, padding: '14px', borderRadius: 14, background: canAfford ? '#00FF87' : 'rgba(255,255,255,0.05)', border: 'none', color: canAfford ? '#000' : '#52525b', fontWeight: 700, fontSize: 14, cursor: canAfford ? 'pointer' : 'not-allowed' }}>
                        Buy Player
                      </motion.button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 99, padding: '10px 20px', color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', zIndex: 200, backdropFilter: 'blur(12px)' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}