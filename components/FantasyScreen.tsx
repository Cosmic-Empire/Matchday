'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTeamName } from '@/lib/formatTeamName';

const supabase = createClient();

const POSITIONS = ['GK', 'DEF', 'MID', 'MID', 'FWD'] as const;
const POSITION_LABELS: Record<string, string> = {
  GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward',
};
const LEAGUES = ['All', 'Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'];

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
    'premier league': 'Premier League', 'epl': 'Premier League',
    'la liga': 'La Liga', 'laliga': 'La Liga',
    'bundesliga': 'Bundesliga',
    'serie a': 'Serie A', 'seriea': 'Serie A', 'serie_a': 'Serie A',
    'ligue 1': 'Ligue 1', 'ligue1': 'Ligue 1', 'ligue_1': 'Ligue 1',
  };
  return map[(raw ?? '').trim().toLowerCase()] ?? (raw ?? '').trim();
};

const normalizePlayer = (p: any): Player => ({
  ...p,
  position: normPos(p.position ?? ''),
  league: normLeague(p.league ?? ''),
});

interface Theme {
  accent: string; cardBg: string; foil: string;
  tag: { bg: string; text: string; border: string };
  sheetBg: string;
}
const LEAGUE_THEME: Record<string, Theme> = {
  'Premier League': {
    accent: '#c084fc',
    cardBg: 'linear-gradient(160deg,#1a0533 0%,#2e0d5c 45%,#160a30 100%)',
    foil: 'linear-gradient(135deg,rgba(192,132,252,0.3) 0%,transparent 55%)',
    tag: { bg: 'rgba(110,0,255,0.2)', text: '#c084fc', border: 'rgba(192,132,252,0.35)' },
    sheetBg: 'rgba(20,4,44,0.95)',
  },
  'La Liga': {
    accent: '#fbbf24',
    cardBg: 'linear-gradient(160deg,#1c1200 0%,#3d2800 45%,#1a1000 100%)',
    foil: 'linear-gradient(135deg,rgba(251,191,36,0.25) 0%,transparent 55%)',
    tag: { bg: 'rgba(251,191,36,0.18)', text: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
    sheetBg: 'rgba(24,16,0,0.95)',
  },
  'Bundesliga': {
    accent: '#f87171',
    cardBg: 'linear-gradient(160deg,#1e0202 0%,#3d0a0a 45%,#1a0000 100%)',
    foil: 'linear-gradient(135deg,rgba(248,113,113,0.25) 0%,transparent 55%)',
    tag: { bg: 'rgba(248,113,113,0.18)', text: '#f87171', border: 'rgba(248,113,113,0.35)' },
    sheetBg: 'rgba(24,2,2,0.95)',
  },
  'Serie A': {
    accent: '#60a5fa',
    cardBg: 'linear-gradient(160deg,#00081e 0%,#001540 45%,#000c1e 100%)',
    foil: 'linear-gradient(135deg,rgba(96,165,250,0.25) 0%,transparent 55%)',
    tag: { bg: 'rgba(96,165,250,0.18)', text: '#60a5fa', border: 'rgba(96,165,250,0.35)' },
    sheetBg: 'rgba(0,6,24,0.95)',
  },
  'Ligue 1': {
    accent: '#34d399',
    cardBg: 'linear-gradient(160deg,#001812 0%,#003d28 45%,#001510 100%)',
    foil: 'linear-gradient(135deg,rgba(52,211,153,0.25) 0%,transparent 55%)',
    tag: { bg: 'rgba(52,211,153,0.18)', text: '#34d399', border: 'rgba(52,211,153,0.35)' },
    sheetBg: 'rgba(0,20,14,0.95)',
  },
};
const DEFAULT_THEME: Theme = {
  accent: '#00FF87',
  cardBg: 'linear-gradient(160deg,#0a1a12 0%,#0f2a1c 45%,#091510 100%)',
  foil: 'linear-gradient(135deg,rgba(0,255,135,0.2) 0%,transparent 55%)',
  tag: { bg: 'rgba(0,255,135,0.15)', text: '#00FF87', border: 'rgba(0,255,135,0.3)' },
  sheetBg: 'rgba(8,8,8,0.95)',
};
const getTheme = (league: string): Theme => LEAGUE_THEME[league] ?? DEFAULT_THEME;
const leagueAbbr = (l: string) =>
  ({ 'Premier League':'EPL','La Liga':'LAL','Bundesliga':'BUN','Serie A':'SA','Ligue 1':'L1' }[l] ?? '—');

interface Player {
  id: string; name: string; team: string; league: string;
  position: string; goals: number; assists: number; clean_sheets: number; points: number;
  image_url?: string;
}
interface LobbyMember { user_id: string; username: string; total_points: number; }
type Screen = 'landing' | 'create' | 'join' | 'pick' | 'lobby';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.14 } },
};
const pillVariants = {
  hidden:  { opacity: 0, y: -8, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: 'easeOut' as any } },
  exit:    { opacity: 0, y: -8, scale: 0.9, transition: { duration: 0.12 } },
};

function PlayerImage({ player, size = 48 }: { player: Player; size?: number }) {
  const t = getTheme(player.league);
  const [err, setErr] = useState(false);
  const src = !err && player.image_url
    ? player.image_url
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=111111&color=${t.accent.replace('#','')}&bold=true&size=80&font-size=0.38&rounded=true`;
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%',
      background: `radial-gradient(circle,${t.accent}28 0%,transparent 70%)`,
      border: `1.5px solid ${t.accent}44`, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src={src} alt={player.name} onError={() => setErr(true)}
        style={{ width: size - 2, height: size - 2, objectFit: 'cover', borderRadius: '50%' }} />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ height: 158, borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', position: 'relative' }}>
      <motion.div style={{ position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.06) 50%,transparent 100%)' }}
        animate={{ x: ['-100%','100%'] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: 'linear' }} />
      <div style={{ padding: 8 }}>
        <div style={{ width: 28, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginBottom: 4 }} />
        <div style={{ width: 18, height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div style={{ position: 'absolute', bottom: 38, left: '50%', transform: 'translateX(-50%)',
        width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ position: 'absolute', bottom: 22, left: 8, right: 8, height: 9, borderRadius: 4, background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ position: 'absolute', bottom: 8, left: 16, right: 16, height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
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

function FifaCard26({ player, onClick, index = 0 }: { player: Player; onClick?: () => void; index?: number }) {
  const t = getTheme(player.league);
  const parts = player.name.trim().split(' ');
  const displayName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
  const showCS = player.position === 'GK' || player.position === 'DEF';
  return (
    <motion.button onClick={onClick}
      initial={{ opacity: 0, scale: 0.9, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.018, 0.3), duration: 0.2, ease: 'easeOut' }}
      whileTap={{ scale: 0.91 }}
      style={{ height: 158, width: '100%', position: 'relative', outline: 'none', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        background: t.cardBg, border: `1px solid ${t.accent}55`,
        boxShadow: `0 4px 20px ${t.accent}1e,inset 0 1px 0 ${t.accent}44` }}>
        <div style={{ position: 'absolute', inset: 0, background: t.foil, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${t.accent}dd,transparent)` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 8px 0', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: t.accent, lineHeight: 1 }}>{player.points}</span>
            <span style={{ fontSize: 7.5, fontWeight: 900, color: t.accent+'bb', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{player.position}</span>
          </div>
          <span style={{ fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 5px', borderRadius: 4, background: t.tag.bg, color: t.tag.text, border: `1px solid ${t.tag.border}` }}>
            {leagueAbbr(player.league)}
          </span>
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

function SquadSlotCard({ player, position, onClick, disabled }: {
  player: Player | null; position: string; onClick?: () => void; disabled?: boolean;
}) {
  if (!player) {
    return (
      <motion.button onClick={onClick} disabled={disabled} whileTap={disabled ? undefined : { scale: 0.98 }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, border: '1.5px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.025)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, outline: 'none' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: '#71717a' }}>{position}</span>
        </div>
        <span style={{ color: '#52525b', fontSize: 14 }}>{POSITION_LABELS[position]} — tap to pick</span>
        {!disabled && (
          <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
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

function AppHeader({ screen, pageTitle, logoRef, onBack, onLeave }: {
  screen: Screen; pageTitle: string;
  logoRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void; onLeave: () => void;
}) {
  return (
    <div style={{ padding: '44px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div ref={logoRef} style={{ width: 36, height: 36, borderRadius: 10, background: '#00FF87', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#000', fontWeight: 900, fontSize: 13, letterSpacing: '-0.04em' }}>MD</span>
        </div>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>{pageTitle}</span>
      </div>
      {(screen === 'create' || screen === 'join') && (
        <button onClick={onBack} style={{ color: '#71717a', fontSize: 12, border: '1px solid rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: 99, background: 'none', cursor: 'pointer' }}>Back</button>
      )}
      {screen === 'lobby' && (
        <motion.button onClick={onLeave} whileHover={{ color: '#f87171', borderColor: '#f87171' }}
          style={{ color: '#71717a', fontSize: 12, border: '1px solid rgba(255,255,255,0.1)', padding: '5px 12px', borderRadius: 99, background: 'none', cursor: 'pointer' }}>Leave</motion.button>
      )}
    </div>
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

function LockedScreen() {
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '0 24px' }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, fontSize: 36 }}>👥</div>
        <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 24, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Fantasy Football</h2>
        <p style={{ color: '#71717a', fontSize: 14, lineHeight: 1.6, margin: '0 0 32px' }}>
          Sign in to create a private lobby, pick your squad of 5, and compete with your mates every gameweek.
        </p>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
          {[{ icon: '🏟️', label: 'Private lobbies with friends' }, { icon: '⭐', label: 'Pick 5 players across Europe' }, { icon: '📈', label: 'Live points leaderboard' }].map(({ icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '12px 16px', opacity: 0.6 }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ color: '#a1a1aa', fontSize: 14 }}>{label}</span>
            </div>
          ))}
        </div>
        <button onClick={signInWithGoogle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#fff', color: '#000', fontWeight: 600, fontSize: 14, padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
        <p style={{ color: '#52525b', fontSize: 12, marginTop: 16 }}>Free to sign up · No credit card required</p>
      </div>
    </div>
  );
}

// ─── Player Picker Modal ───────────────────────────────────────────────────────
function PlayerPickerModal({ pickingSlot, filteredPlayers, playerLoadState, playerSearch, leagueFilter, visibleRange, gridRef, onClose, onSelect, onSearchChange, onLeagueChange }: {
  pickingSlot: number;
  filteredPlayers: Player[];
  playerLoadState: 'idle' | 'loading' | 'ready';
  playerSearch: string;
  leagueFilter: string;
  visibleRange: { start: number; end: number };
  gridRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onSelect: (p: Player) => void;
  onSearchChange: (v: string) => void;
  onLeagueChange: (v: string) => void;
}) {
  const modalTheme = leagueFilter !== 'All' ? getTheme(leagueFilter) : DEFAULT_THEME;

  return (
    <AnimatePresence>
      <motion.div
        key="scrim"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        onClick={onClose}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }}
          exit={{ opacity: 0, scale: 0.92, y: 20, transition: { duration: 0.18 } }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 420,
            maxHeight: '82vh',
            display: 'flex', flexDirection: 'column',
            borderRadius: 24,
            background: modalTheme.sheetBg,
            backdropFilter: 'blur(32px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
            border: `1px solid ${modalTheme.accent}33`,
            boxShadow: `0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)`,
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px 20px 12px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 17, margin: 0 }}>Pick {POSITION_LABELS[POSITIONS[pickingSlot]]}</p>
                <p style={{ color: '#71717a', fontSize: 11, marginTop: 3 }}>Top {filteredPlayers.length} · search to find more</p>
              </div>
              <button onClick={onClose}
                style={{ color: '#71717a', fontSize: 12, border: '1px solid rgba(255,255,255,0.12)', padding: '5px 12px', borderRadius: 99, background: 'rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                Close
              </button>
            </div>

            {/* Search */}
            <input
              type="text" value={playerSearch} onChange={e => onSearchChange(e.target.value)}
              placeholder="Search player or team…"
              style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '9px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />

            {/* League chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LEAGUES.map(league => {
                const active = leagueFilter === league;
                const lc = LEAGUE_THEME[league]?.tag;
                return (
                  <button key={league} onClick={() => onLeagueChange(league)}
                    style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      ...(active
                        ? lc ? { background: lc.bg, color: lc.text, border: `1px solid ${lc.border}` }
                             : { background: '#00FF87', color: '#000', border: '1px solid #00FF87' }
                        : { background: 'rgba(255,255,255,0.07)', color: '#71717a', border: '1px solid rgba(255,255,255,0.1)' }
                      ) }}>
                    {league}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card grid — scrollable */}
          <div
            ref={gridRef}
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: 14 }}
          >
            {playerLoadState === 'loading' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredPlayers.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <p style={{ color: '#71717a', fontSize: 14 }}>No players found</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, gridTemplateRows: `repeat(${Math.ceil(filteredPlayers.length / 3)}, 158px)` }}>
                {filteredPlayers.map((p, i) => {
                  const inView = i >= visibleRange.start && i < visibleRange.end;
                  return inView
                    ? <FifaCard26 key={p.id} player={p} index={i} onClick={() => onSelect(p)} />
                    : <div key={p.id} style={{ height: 158, borderRadius: 16, background: 'rgba(255,255,255,0.02)' }} />;
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function FantasyScreen() {
  const logoRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showPill, setShowPill] = useState(false);
  const [screen, setScreen] = useState<Screen>('landing');
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [lobbyName, setLobbyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [username, setUsername] = useState('');
  const [currentLobby, setCurrentLobby] = useState<any>(null);
  const [members, setMembers] = useState<LobbyMember[]>([]);
  const [mySquad, setMySquad] = useState<(Player | null)[]>([null, null, null, null, null]);
  const [squadSaved, setSquadSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [pickingSlot, setPickingSlot] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [playerSearch, setPlayerSearch] = useState('');
  const [leagueFilter, setLeagueFilter] = useState('All');
  const [playerLoadState, setPlayerLoadState] = useState<'idle'|'loading'|'ready'>('idle');
  const gridRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 30 });

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const CARD_H = 158 + 10;
    const COLS = 3;
    const handleScroll = () => {
      const scrollTop = el.scrollTop;
      const viewH = el.clientHeight;
      const startRow = Math.max(0, Math.floor(scrollTop / CARD_H) - 1);
      const endRow = Math.ceil((scrollTop + viewH) / CARD_H) + 1;
      setVisibleRange({ start: startRow * COLS, end: endRow * COLS });
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => el.removeEventListener('scroll', handleScroll);
  }, [pickingSlot, filteredPlayers]);

  useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    const u = session?.user ?? null;
    setUser(u);
    setIsGuest(!u);
    setAuthLoading(false);
  });
}, []);

  useEffect(() => {
    setShowPill(false);
    const el = logoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setShowPill(!entry.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [screen]);

  const openPicker = (slot: number) => {
    setPickingSlot(slot);
    setPlayerSearch('');
    setLeagueFilter('All');
    setVisibleRange({ start: 0, end: 30 });
    fetchPlayers();
  };

  const closePicker = useCallback(() => setPickingSlot(null), []);

  useEffect(() => { if (user && !isGuest) checkExistingLobby(); }, [user, isGuest]);

  useEffect(() => {
    let f = [...players];
    if (leagueFilter !== 'All') f = f.filter(p => p.league === leagueFilter);
    if (playerSearch) {
      const q = playerSearch.toLowerCase();
      f = f.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    }
    if (pickingSlot !== null) {
      const want = POSITIONS[pickingSlot];
      f = f.filter(p => p.position === want);
    }
    f.sort((a, b) => b.points - a.points);
    const limit = (playerSearch || leagueFilter !== 'All') ? 200 : 50;
    setFilteredPlayers(f.slice(0, limit));
  }, [players, playerSearch, leagueFilter, pickingSlot]);

  const checkExistingLobby = async () => {
    const { data } = await supabase.from('lobby_members').select('*, lobbies(*)').eq('user_id', user.id).single();
    if (data) {
      setCurrentLobby(data.lobbies); setUsername(data.username);
      await fetchLobbyData(data.lobbies.id); await fetchMySquad(data.lobbies.id); setScreen('lobby');
    }
  };

  const fetchLobbyData = async (id: string) => {
    const { data } = await supabase.from('lobby_members').select('*').eq('lobby_id', id).order('total_points', { ascending: false });
    setMembers(data || []);
  };

  const fetchMySquad = async (lobbyId: string) => {
    const { data } = await supabase.from('squads').select('*').eq('lobby_id', lobbyId).eq('user_id', user.id).single();
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
    const ONE_HOUR = 1000 * 60 * 60;
    if (cached && cachedAt && Date.now() - Number(cachedAt) < ONE_HOUR) {
      setPlayers(JSON.parse(cached)); setPlayerLoadState('ready'); return;
    }
    setPlayerLoadState('loading');
    const PAGE = 1000; let allPlayers: any[] = []; let from = 0;
    while (true) {
      const { data, error } = await supabase.from('players').select('*').order('points', { ascending: false }).range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      allPlayers = allPlayers.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    const normalized = allPlayers.map(normalizePlayer);
    localStorage.setItem('fantasy_players', JSON.stringify(normalized));
    localStorage.setItem('fantasy_players_at', String(Date.now()));
    setPlayers(normalized); setPlayerLoadState('ready');
  };

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const createLobby = async () => {
    if (!user || !lobbyName.trim() || !username.trim()) return;
    setLoading(true); setError('');
    const code = generateCode();
    const { data: lobby, error: e } = await supabase.from('lobbies').insert({ name: lobbyName.trim(), code, created_by: user.id }).select().single();
    if (e || !lobby) { setError('Failed to create lobby'); setLoading(false); return; }
    const { error: me } = await supabase.from('lobby_members').insert({ lobby_id: lobby.id, user_id: user.id, username: username.trim() });
    if (me) { setError('Failed to join lobby'); setLoading(false); return; }
    setCurrentLobby(lobby); await fetchLobbyData(lobby.id); setLoading(false); setScreen('pick'); fetchPlayers();
  };

  const joinLobby = async () => {
    if (!user || !joinCode.trim() || !username.trim()) return;
    setLoading(true); setError('');
    const { data: lobby } = await supabase.from('lobbies').select('*').eq('code', joinCode.trim().toUpperCase()).single();
    if (!lobby) { setError('Lobby not found — check the code'); setLoading(false); return; }
    const { error: me } = await supabase.from('lobby_members').insert({ lobby_id: lobby.id, user_id: user.id, username: username.trim() });
    if (me) { setError('Could not join — you may already be in this lobby'); setLoading(false); return; }
    setCurrentLobby(lobby); await fetchLobbyData(lobby.id); setLoading(false); setScreen('pick'); fetchPlayers();
  };

  const selectPlayer = (player: Player) => {
    if (pickingSlot === null) return;
    const sq = [...mySquad]; sq[pickingSlot] = player; setMySquad(sq);
    closePicker();
  };

  const saveSquad = async () => {
    if (!user || !currentLobby) return;
    if (mySquad.some(p => p === null)) { setError('Pick all 5 players first'); return; }
    setLoading(true);
    const { error: e } = await supabase.from('squads').upsert(
      { lobby_id: currentLobby.id, user_id: user.id, player_ids: mySquad.map(p => p!.id) },
      { onConflict: 'lobby_id,user_id' }
    );
    if (e) setError('Failed to save squad');
    else { setSquadSaved(true); setScreen('lobby'); await fetchLobbyData(currentLobby.id); }
    setLoading(false);
  };

  const leaveLobby = async () => {
    if (!user || !currentLobby) return;
    await supabase.from('lobby_members').delete().eq('lobby_id', currentLobby.id).eq('user_id', user.id);
    await supabase.from('squads').delete().eq('lobby_id', currentLobby.id).eq('user_id', user.id);
    setCurrentLobby(null); setMembers([]); setMySquad([null,null,null,null,null]); setSquadSaved(false); setScreen('landing');
  };

  const copyCode = () => {
    if (!currentLobby) return;
    navigator.clipboard.writeText(currentLobby.code);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = useCallback(() => { setScreen('landing'); setError(''); }, []);

  const pageTitle = screen === 'create' ? 'Create Lobby' : screen === 'join' ? 'Join Lobby' :
    screen === 'pick' ? 'Pick Your Squad' : screen === 'lobby' ? (currentLobby?.name || 'Lobby') : 'Fantasy';

  const pb = 'calc(env(safe-area-inset-bottom,0px) + 120px)';
  const px = '20px';

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #00FF87', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isGuest) return <LockedScreen />;

  const renderContent = () => {
    switch (screen) {
      case 'landing': return (
        <div style={{ padding: `8px ${px} ${pb}` }}>
          <div style={{ borderRadius: 20, padding: 20, marginBottom: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: '#00FF87', opacity: 0.08, filter: 'blur(40px)' }} />
            <p style={{ color: '#00FF87', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>5-A-Side Fantasy</p>
            <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 900, lineHeight: 1.15, marginBottom: 8 }}>Pick 5.<br />Beat your mates.</h2>
            <p style={{ color: '#71717a', fontSize: 14, lineHeight: 1.5 }}>Private lobby, squad of 5, compete every gameweek.</p>
          </div>
          <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>How points work</p>
            </div>
            {[{ label: 'Goal scored', pts: '+5 pts', color: '#00FF87' }, { label: 'Assist', pts: '+3 pts', color: '#60a5fa' }, { label: 'Clean sheet (GK/DEF)', pts: '+4 pts', color: '#a78bfa' }]
              .map(({ label, pts, color }, i) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ color: '#a1a1aa', fontSize: 13 }}>{label}</span>
                  <span style={{ color, fontSize: 13, fontWeight: 700 }}>{pts}</span>
                </div>
              ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScreen('create')} style={{ width: '100%', background: '#00FF87', color: '#000', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer' }}>Create a Lobby</motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScreen('join')} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 600, fontSize: 15, padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>Join with a Code</motion.button>
          </div>
        </div>
      );

      case 'create': return (
        <div style={{ padding: `16px ${px} ${pb}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[{ label: 'Lobby Name', val: lobbyName, set: setLobbyName, ph: 'e.g. Sunday League Lads' }, { label: 'Your Name', val: username, set: setUsername, ph: 'How your mates will see you' }]
            .map(({ label, val, set, ph }) => (
              <div key={label}>
                <p style={{ color: '#71717a', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{label}</p>
                <input type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '13px 16px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          {error && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center' }}>{error}</p>}
          <motion.button whileTap={{ scale: 0.97 }} onClick={createLobby} disabled={loading || !lobbyName.trim() || !username.trim()} style={{ width: '100%', background: '#00FF87', color: '#000', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer', opacity: (loading || !lobbyName.trim() || !username.trim()) ? 0.4 : 1 }}>{loading ? 'Creating…' : 'Create Lobby'}</motion.button>
        </div>
      );

      case 'join': return (
        <div style={{ padding: `16px ${px} ${pb}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[{ label: 'Lobby Code', val: joinCode, set: (v: string) => setJoinCode(v.toUpperCase()), ph: 'e.g. AB12CD', extra: { textTransform: 'uppercase' as const, letterSpacing: '0.1em' } }, { label: 'Your Name', val: username, set: setUsername, ph: 'How your mates will see you', extra: {} }]
            .map(({ label, val, set, ph, extra }) => (
              <div key={label}>
                <p style={{ color: '#71717a', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{label}</p>
                <input type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '13px 16px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', ...extra }} />
              </div>
            ))}
          {error && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center' }}>{error}</p>}
          <motion.button whileTap={{ scale: 0.97 }} onClick={joinLobby} disabled={loading || !joinCode.trim() || !username.trim()} style={{ width: '100%', background: '#00FF87', color: '#000', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer', opacity: (loading || !joinCode.trim() || !username.trim()) ? 0.4 : 1 }}>{loading ? 'Joining…' : 'Join Lobby'}</motion.button>
        </div>
      );

      case 'pick': return (
        <div style={{ padding: `8px ${px} ${pb}` }}>
          <CodeBanner lobby={currentLobby} copied={copied} onCopy={copyCode} />
          <p style={{ color: '#71717a', fontSize: 12, marginBottom: 14 }}>Tap a slot to pick. Locked once saved.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {POSITIONS.map((pos, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.18 }}>
                <SquadSlotCard player={mySquad[i]} position={pos} disabled={squadSaved} onClick={() => { if (!squadSaved) openPicker(i); }} />
              </motion.div>
            ))}
          </div>
          {error && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>{error}</p>}
          {!squadSaved
            ? <motion.button whileTap={{ scale: 0.97 }} onClick={saveSquad} disabled={loading || mySquad.some(p => p === null)} style={{ width: '100%', background: '#00FF87', color: '#000', fontWeight: 700, fontSize: 15, padding: '16px', borderRadius: 16, border: 'none', cursor: 'pointer', opacity: (loading || mySquad.some(p => p === null)) ? 0.4 : 1 }}>{loading ? 'Saving…' : 'Lock In Squad'}</motion.button>
            : <motion.button whileTap={{ scale: 0.97 }} onClick={() => setScreen('lobby')} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 600, fontSize: 15, padding: '16px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>View Lobby →</motion.button>
          }
        </div>
      );

      case 'lobby': return (
        <div style={{ padding: `8px ${px} ${pb}` }}>
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
            {squadSaved && <button onClick={() => setScreen('pick')} style={{ color: '#71717a', fontSize: 12, border: '1px solid rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 99, background: 'none', cursor: 'pointer' }}>Edit</button>}
          </div>
          {!squadSaved
            ? <div style={{ borderRadius: 16, padding: '24px 16px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ color: '#71717a', fontSize: 14, marginBottom: 12 }}>You haven't picked your squad yet</p>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setScreen('pick'); fetchPlayers(); }} style={{ background: '#00FF87', color: '#000', fontWeight: 700, fontSize: 13, padding: '8px 20px', borderRadius: 99, border: 'none', cursor: 'pointer' }}>Pick Now</motion.button>
              </div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mySquad.map((p, i) => p
                  ? <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <SquadSlotCard player={p} position={POSITIONS[i]} disabled />
                    </motion.div>
                  : null)}
              </div>
          }
        </div>
      );
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <AppHeader screen={screen} pageTitle={pageTitle} logoRef={logoRef} onBack={handleBack} onLeave={leaveLobby} />

      <div ref={scrollRef} style={{ position: 'relative' }}>
        <AnimatePresence mode="wait">
          <motion.div key={screen} variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ minHeight: '100%' }}>
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPill && (
          <motion.div key="pill" variants={pillVariants} initial="hidden" animate="visible" exit="exit"
            style={{ position: 'fixed', top: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 60, pointerEvents: 'none' }}>
            <div style={{ padding: '7px 18px', borderRadius: 99, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{pageTitle}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Centered glass player picker modal */}
      {pickingSlot !== null && (
        <PlayerPickerModal
          pickingSlot={pickingSlot}
          filteredPlayers={filteredPlayers}
          playerLoadState={playerLoadState}
          playerSearch={playerSearch}
          leagueFilter={leagueFilter}
          visibleRange={visibleRange}
          gridRef={gridRef}
          onClose={closePicker}
          onSelect={selectPlayer}
          onSearchChange={setPlayerSearch}
          onLeagueChange={setLeagueFilter}
        />
      )}
    </div>
  );
}