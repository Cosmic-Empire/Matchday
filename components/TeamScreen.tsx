'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTeamName } from '@/lib/formatTeamName';

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────
interface Player {
  id: string; name: string; team: string; league: string;
  position: string; goals: number; assists: number; clean_sheets: number; points: number;
  image_url?: string; rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

interface OwnedPlayer extends Player {
  ownedAt: number; quantity: number;
}

interface Currency { coins: number; gems: number; }

interface Pack {
  id: string; name: string; description: string;
  cost: number; currency: 'coins' | 'gems';
  size: number; rarityWeights: Record<string, number>;
  gradient: string; icon: string; accent: string;
}

type SubScreen = 'collection' | 'store' | 'packs';

// ─── Constants ────────────────────────────────────────────────────────────────
const DAILY_COINS = 500;
const DAILY_FREE_PACK_COOLDOWN = 24 * 60 * 60 * 1000;

const PACKS: Pack[] = [
  {
    id: 'free_daily', name: 'Daily Pack', description: '3 random players, refreshes every 24h',
    cost: 0, currency: 'coins', size: 3,
    rarityWeights: { common: 70, rare: 25, epic: 5, legendary: 0 },
    gradient: 'linear-gradient(135deg,#1a2a1a 0%,#0f3320 100%)',
    icon: '🎁', accent: '#00FF87',
  },
  {
    id: 'standard', name: 'Standard Pack', description: '5 players with improved odds',
    cost: 1000, currency: 'coins', size: 5,
    rarityWeights: { common: 50, rare: 35, epic: 14, legendary: 1 },
    gradient: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 100%)',
    icon: '📦', accent: '#60a5fa',
  },
  {
    id: 'premium', name: 'Premium Pack', description: '5 players, guaranteed rare+',
    cost: 300, currency: 'gems', size: 5,
    rarityWeights: { common: 0, rare: 55, epic: 35, legendary: 10 },
    gradient: 'linear-gradient(135deg,#2d1b4e 0%,#1a0a33 100%)',
    icon: '💜', accent: '#c084fc',
  },
  {
    id: 'elite', name: 'Elite Pack', description: '8 players, epic+ guaranteed',
    cost: 800, currency: 'gems', size: 8,
    rarityWeights: { common: 0, rare: 0, epic: 70, legendary: 30 },
    gradient: 'linear-gradient(135deg,#2a1500 0%,#3d1f00 100%)',
    icon: '👑', accent: '#fbbf24',
  },
];

const RARITY_CONFIG = {
  common:    { label: 'Common',    color: '#a1a1aa', glow: '#a1a1aa33', border: '#a1a1aa44' },
  rare:      { label: 'Rare',      color: '#60a5fa', glow: '#60a5fa33', border: '#60a5fa55' },
  epic:      { label: 'Epic',      color: '#c084fc', glow: '#c084fc33', border: '#c084fc55' },
  legendary: { label: 'Legendary', color: '#fbbf24', glow: '#fbbf2433', border: '#fbbf2455' },
};

const LEAGUE_THEME: Record<string, { accent: string; cardBg: string }> = {
  'Premier League': { accent: '#c084fc', cardBg: 'linear-gradient(160deg,#1a0533 0%,#2e0d5c 100%)' },
  'La Liga':        { accent: '#fbbf24', cardBg: 'linear-gradient(160deg,#1c1200 0%,#3d2800 100%)' },
  'Bundesliga':     { accent: '#f87171', cardBg: 'linear-gradient(160deg,#1e0202 0%,#3d0a0a 100%)' },
  'Serie A':        { accent: '#60a5fa', cardBg: 'linear-gradient(160deg,#00081e 0%,#001540 100%)' },
  'Ligue 1':        { accent: '#34d399', cardBg: 'linear-gradient(160deg,#001812 0%,#003d28 100%)' },
};
const DEFAULT_THEME = { accent: '#00FF87', cardBg: 'linear-gradient(160deg,#0a1a12 0%,#0f2a1c 100%)' };
const getTheme = (league: string) => LEAGUE_THEME[league] ?? DEFAULT_THEME;

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
    'la liga':'La Liga','laliga':'La Liga',
    'bundesliga':'Bundesliga',
    'serie a':'Serie A','seriea':'Serie A','serie_a':'Serie A',
    'ligue 1':'Ligue 1','ligue1':'Ligue 1','ligue_1':'Ligue 1',
  };
  return map[(raw ?? '').trim().toLowerCase()] ?? (raw ?? '').trim();
};

// ─── Storage helpers ───────────────────────────────────────────────────────────
const LS = {
  get: (key: string, fallback: any): any => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set: (key: string, val: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  },
};

const getCurrency = (): Currency => LS.get('team_currency', { coins: 2000, gems: 50 });
const setCurrency = (c: Currency) => LS.set('team_currency', c);
const getOwned = (): OwnedPlayer[] => LS.get('team_owned_players', []);
const setOwned = (p: OwnedPlayer[]) => LS.set('team_owned_players', p);
const getLastDaily = (): number => LS.get('team_last_daily', 0);
const saveLastDaily = (t: number) => LS.set('team_last_daily', t);
const getLastFreePack = (): number => LS.get('team_last_free_pack', 0);
const saveLastFreePack = (t: number) => LS.set('team_last_free_pack', t);

// ─── Rarity roll ──────────────────────────────────────────────────────────────
function rollRarity(weights: Record<string, number>): 'common' | 'rare' | 'epic' | 'legendary' {
  const roll = Math.random() * 100;
  let cum = 0;
  for (const [rarity, weight] of Object.entries(weights)) {
    cum += weight;
    if (roll < cum) return rarity as any;
  }
  return 'common';
}

function assignRarity(player: Player, weights: Record<string, number>): Player {
  return { ...player, rarity: rollRarity(weights) };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function CurrencyBar({ coins, gems, onDailyClaim, canClaim }: {
  coins: number; gems: number; onDailyClaim: () => void; canClaim: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <span style={{ fontSize: 14 }}>🪙</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{coins.toLocaleString()}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <span style={{ fontSize: 14 }}>💎</span>
        <span style={{ color: '#c084fc', fontWeight: 700, fontSize: 13 }}>{gems}</span>
      </div>
      {canClaim && (
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={onDailyClaim}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,255,135,0.12)', border: '1px solid #00FF87', borderRadius: 99, padding: '5px 12px', color: '#00FF87', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
          <span>+{DAILY_COINS.toLocaleString()}</span>
          <span>Daily</span>
        </motion.button>
      )}
    </div>
  );
}

function PlayerCard({ player, owned, onClick }: { player: Player; owned?: boolean; onClick?: () => void }) {
  const t = getTheme(player.league);
  const rarity = player.rarity ?? 'common';
  const rc = RARITY_CONFIG[rarity];
  const parts = player.name.trim().split(' ');
  const displayName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
  const [imgErr, setImgErr] = useState(false);
  const imgSrc = !imgErr && player.image_url
    ? player.image_url
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=111111&color=${t.accent.replace('#','')}&bold=true&size=80&font-size=0.38&rounded=true`;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ width: '100%', height: 170, position: 'relative', border: 'none', background: 'none', padding: 0, cursor: onClick ? 'pointer' : 'default', outline: 'none' }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden',
        background: t.cardBg,
        border: `1.5px solid ${rc.border}`,
        boxShadow: `0 4px 24px ${rc.glow}, inset 0 1px 0 ${t.accent}33`,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Rarity shimmer */}
        {(rarity === 'epic' || rarity === 'legendary') && (
          <motion.div
            style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${rc.color}18 0%, transparent 60%)`, pointerEvents: 'none' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${rc.color}cc,transparent)` }} />

        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 8px 0', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: t.accent, lineHeight: 1 }}>{player.points}</div>
            <div style={{ fontSize: 7, fontWeight: 900, color: t.accent + 'bb', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 1 }}>{normPos(player.position)}</div>
          </div>
          <div style={{ fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: rc.color + '22', color: rc.color, border: `1px solid ${rc.border}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {rc.label}
          </div>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, position: 'relative', zIndex: 1 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${rc.color}55`, overflow: 'hidden', background: `radial-gradient(circle,${t.accent}22 0%,transparent 70%)` }}>
            <img src={imgSrc} alt={player.name} onError={() => setImgErr(true)} style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: '50%' }} />
          </div>
          {owned && (
            <div style={{ position: 'absolute', top: 0, right: 8, width: 16, height: 16, borderRadius: '50%', background: '#00FF87', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M5 13L9 17L19 7" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          )}
        </div>

        {/* Name */}
        <div style={{ padding: '0 6px 4px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 9.5, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
          <div style={{ fontSize: 7.5, color: t.accent + 'aa', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatTeamName(player.team)}</div>
        </div>

        {/* Stats footer */}
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '5px 4px', borderTop: `1px solid ${rc.color}22`, background: rc.color + '0d', position: 'relative', zIndex: 1 }}>
          {[['G', player.goals], ['A', player.assists], ['CS', player.clean_sheets]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: t.accent }}>{v}</span>
              <span style={{ fontSize: 7, fontWeight: 700, color: t.accent + '88', textTransform: 'uppercase' }}>{l}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${rc.color}66,transparent)` }} />
      </div>
    </motion.button>
  );
}

function PackOpenModal({ pack, pulledPlayers, onClose }: {
  pack: Pack; pulledPlayers: Player[]; onClose: () => void;
}) {
  const [revealed, setRevealed] = useState<boolean[]>(new Array(pulledPlayers.length).fill(false));
  const [allRevealed, setAllRevealed] = useState(false);

  const revealNext = () => {
    const nextIdx = revealed.findIndex(r => !r);
    if (nextIdx === -1) return;
    const next = [...revealed];
    next[nextIdx] = true;
    setRevealed(next);
    if (next.every(Boolean)) setAllRevealed(true);
  };

  const revealAll = () => {
    setRevealed(new Array(pulledPlayers.length).fill(true));
    setAllRevealed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>

      <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 280 }}
        style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{pack.icon}</div>
          <p style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>{pack.name} Opened!</p>
          <p style={{ color: '#71717a', fontSize: 12, marginTop: 4 }}>Tap cards to reveal • {pulledPlayers.length} players</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(pulledPlayers.length, 3)}, 1fr)`, gap: 10, marginBottom: 20 }}>
          {pulledPlayers.map((p, i) => (
            <motion.div key={i} onClick={() => !revealed[i] && revealNext()}
              style={{ cursor: revealed[i] ? 'default' : 'pointer' }}>
              <AnimatePresence mode="wait">
                {revealed[i] ? (
                  <motion.div key="card" initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
                    <PlayerCard player={p} />
                  </motion.div>
                ) : (
                  <motion.div key="back"
                    whileTap={{ scale: 0.95 }}
                    style={{ height: 170, borderRadius: 16, background: pack.gradient, border: `1.5px solid ${pack.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <span style={{ fontSize: 32 }}>{pack.icon}</span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {!allRevealed && (
            <motion.button whileTap={{ scale: 0.96 }} onClick={revealAll}
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

function BuyPlayerModal({ player, currency, onBuy, onClose }: {
  player: Player; currency: Currency; onBuy: (cost: number, cur: 'coins' | 'gems') => void; onClose: () => void;
}) {
  const baseCost = { common: 500, rare: 1500, epic: 4000, legendary: 10000 }[player.rarity ?? 'common'];
  const canAfford = currency.coins >= baseCost;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 20px' }}>
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 430, background: 'rgba(12,12,12,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 20 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 120, flexShrink: 0 }}>
            <PlayerCard player={player} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ color: '#71717a', fontSize: 11, marginBottom: 4 }}>{player.league}</p>
            <p style={{ color: '#fff', fontWeight: 900, fontSize: 18, lineHeight: 1.2 }}>{player.name}</p>
            <p style={{ color: '#a1a1aa', fontSize: 12, marginTop: 4 }}>{formatTeamName(player.team)}</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {[['Goals', player.goals], ['Assists', player.assists], ['CS', player.clean_sheets]].map(([l, v]) => (
                <div key={l} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '4px 8px', textAlign: 'center' }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{v}</div>
                  <div style={{ color: '#71717a', fontSize: 9, textTransform: 'uppercase' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '12px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: '#71717a', fontSize: 13 }}>Price</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>🪙</span>
            <span style={{ color: canAfford ? '#00FF87' : '#f87171', fontWeight: 900, fontSize: 18 }}>{baseCost.toLocaleString()}</span>
          </div>
        </div>
        {!canAfford && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>Not enough coins</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#71717a', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
          <motion.button whileTap={{ scale: 0.96 }} onClick={() => canAfford && onBuy(baseCost, 'coins')} disabled={!canAfford}
            style={{ flex: 2, padding: '14px', borderRadius: 14, background: canAfford ? '#00FF87' : 'rgba(255,255,255,0.05)', border: 'none', color: canAfford ? '#000' : '#52525b', fontWeight: 700, fontSize: 14, cursor: canAfford ? 'pointer' : 'not-allowed' }}>
            Buy Player
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TeamScreen() {
  const [subScreen, setSubScreen] = useState<SubScreen>('collection');
  const [currency, setCurrencyState] = useState<Currency>(getCurrency());
  const [owned, setOwnedState] = useState<OwnedPlayer[]>(getOwned());
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [canClaimDaily, setCanClaimDaily] = useState(false);
  const [canClaimFreePack, setCanClaimFreePack] = useState(false);
  const [freePackCooldown, setFreePackCooldown] = useState('');
  const [openingPack, setOpeningPack] = useState<Pack | null>(null);
  const [pulledPlayers, setPulledPlayers] = useState<Player[]>([]);
  const [buyingPlayer, setBuyingPlayer] = useState<Player | null>(null);
  const [toast, setToast] = useState('');
  const [posFilter, setPosFilter] = useState('All');
  const [rarityFilter, setRarityFilter] = useState('All');
  const [storeSearch, setStoreSearch] = useState('');
  const [leagueFilter, setLeagueFilter] = useState('All');

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const lastDaily = getLastDaily();
    setCanClaimDaily(Date.now() - lastDaily > 24 * 60 * 60 * 1000);

    const lastFree = getLastFreePack();
    const diff = Date.now() - lastFree;
    setCanClaimFreePack(diff > DAILY_FREE_PACK_COOLDOWN);
    if (diff < DAILY_FREE_PACK_COOLDOWN) {
      const remaining = DAILY_FREE_PACK_COOLDOWN - diff;
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      setFreePackCooldown(`${h}h ${m}m`);
    }
  }, []);

  useEffect(() => {
    if (subScreen === 'store' && allPlayers.length === 0) fetchStorePlayers();
  }, [subScreen]);

  const fetchStorePlayers = async () => {
    const cached = localStorage.getItem('fantasy_players');
    if (cached) { setAllPlayers(JSON.parse(cached).map(normalizeStorePlayer)); return; }
    setLoadingPlayers(true);
    const PAGE = 1000; let all: any[] = []; let from = 0;
    while (true) {
      const { data, error } = await supabase.from('players').select('*').order('points', { ascending: false }).range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    setAllPlayers(all.map(normalizeStorePlayer));
    setLoadingPlayers(false);
  };

  const normalizeStorePlayer = (p: any): Player => ({
    ...p,
    position: normPos(p.position ?? ''),
    league: normLeague(p.league ?? ''),
    rarity: p.points >= 200 ? 'legendary' : p.points >= 150 ? 'epic' : p.points >= 80 ? 'rare' : 'common',
  });

  // ── Currency actions ─────────────────────────────────────────────────────────
  const claimDaily = () => {
    const next = { ...currency, coins: currency.coins + DAILY_COINS };
    setCurrencyState(next); setCurrency(next);
    setLastDaily(Date.now()); setCanClaimDaily(false);
    showToast(`+${DAILY_COINS.toLocaleString()} coins claimed! 🪙`);
    // In claimDaily:
    saveLastDaily(Date.now());
  };

  const spendCoins = (amount: number): boolean => {
    if (currency.coins < amount) return false;
    const next = { ...currency, coins: currency.coins - amount };
    setCurrencyState(next); setCurrency(next);
    return true;
  };

  const spendGems = (amount: number): boolean => {
    if (currency.gems < amount) return false;
    const next = { ...currency, gems: currency.gems - amount };
    setCurrencyState(next); setCurrency(next);
    return true;
  };

  const addToCollection = (players: Player[]) => {
    const current = getOwned();
    const updated = [...current];
    for (const p of players) {
      const existing = updated.find(o => o.id === p.id);
      if (existing) { existing.quantity += 1; }
      else { updated.push({ ...p, ownedAt: Date.now(), quantity: 1 }); }
    }
    setOwnedState(updated); setOwned(updated);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  // ── Pack opening ─────────────────────────────────────────────────────────────
  const openPack = (pack: Pack) => {
    if (pack.id === 'free_daily') {
      if (!canClaimFreePack) return;
      setLastFreePack(Date.now()); setCanClaimFreePack(false);
    } else if (pack.currency === 'coins') {
      if (!spendCoins(pack.cost)) { showToast('Not enough coins 🪙'); return; }
    } else {
      if (!spendGems(pack.cost)) { showToast('Not enough gems 💎'); return; }
    }

    // Pull players from allPlayers or generate random ones
    const pool = allPlayers.length > 0 ? allPlayers : [];
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
      const pick = src[Math.floor(Math.random() * src.length)];
      pulled.push({ ...pick, rarity });
    }

    setPulledPlayers(pulled);
    setOpeningPack(pack);
    // In openPack:
    saveLastFreePack(Date.now());
  };

  const closePack = () => {
    addToCollection(pulledPlayers);
    showToast(`${pulledPlayers.length} players added to collection!`);
    setOpeningPack(null);
    setPulledPlayers([]);
  };

  // ── Buy player ───────────────────────────────────────────────────────────────
  const buyPlayer = (cost: number) => {
    if (!buyingPlayer) return;
    if (!spendCoins(cost)) return;
    addToCollection([buyingPlayer]);
    showToast(`${buyingPlayer.name.split(' ').slice(-1)[0]} added to collection! ✅`);
    setBuyingPlayer(null);
  };

  // ── Filtered lists ────────────────────────────────────────────────────────────
  const filteredOwned = owned.filter(p => {
    if (posFilter !== 'All' && p.position !== posFilter) return false;
    if (rarityFilter !== 'All' && p.rarity !== rarityFilter.toLowerCase()) return false;
    return true;
  }).sort((a, b) => b.points - a.points);

  const filteredStore = allPlayers.filter(p => {
    if (leagueFilter !== 'All' && p.league !== leagueFilter) return false;
    if (storeSearch) {
      const q = storeSearch.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.team.toLowerCase().includes(q)) return false;
    }
    return true;
  }).slice(0, 60);

  const isOwned = (id: string) => owned.some(o => o.id === id);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '44px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#000', fontWeight: 900, fontSize: 13, letterSpacing: '-0.04em' }}>TM</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em' }}>My Team</span>
        </div>
      </div>

      {/* Currency bar */}
      <CurrencyBar coins={currency.coins} gems={currency.gems} onDailyClaim={claimDaily} canClaim={canClaimDaily} />

      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: 0, padding: '12px 20px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {(['collection', 'store', 'packs'] as SubScreen[]).map(tab => (
          <button key={tab} onClick={() => setSubScreen(tab)}
            style={{ flex: 1, padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer',
              color: subScreen === tab ? '#fff' : '#52525b',
              fontWeight: subScreen === tab ? 700 : 500,
              fontSize: 13, textTransform: 'capitalize',
              borderBottom: `2px solid ${subScreen === tab ? '#c084fc' : 'transparent'}`,
              transition: 'all 0.18s' }}>
            {tab === 'collection' ? `Collection (${owned.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={subScreen} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

          {/* ── Collection ── */}
          {subScreen === 'collection' && (
            <div style={{ padding: '16px 20px calc(env(safe-area-inset-bottom,0px) + 120px)' }}>
              {/* Filters */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                {['All','GK','DEF','MID','FWD'].map(f => (
                  <button key={f} onClick={() => setPosFilter(f)}
                    style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      background: posFilter === f ? '#c084fc' : 'rgba(255,255,255,0.07)',
                      color: posFilter === f ? '#000' : '#71717a',
                      border: posFilter === f ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.1)' }}>
                    {f}
                  </button>
                ))}
                {['All','Common','Rare','Epic','Legendary'].map(f => (
                  <button key={f} onClick={() => setRarityFilter(f)}
                    style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      background: rarityFilter === f ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                      color: rarityFilter === f ? '#fff' : '#52525b',
                      border: rarityFilter === f ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.07)' }}>
                    {f}
                  </button>
                ))}
              </div>

              {filteredOwned.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <p style={{ color: '#71717a', fontSize: 14, marginBottom: 8 }}>No players yet</p>
                  <p style={{ color: '#52525b', fontSize: 12 }}>Open packs or buy from the store</p>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => setSubScreen('packs')}
                    style={{ marginTop: 16, background: '#c084fc', color: '#000', fontWeight: 700, fontSize: 13, padding: '10px 24px', borderRadius: 99, border: 'none', cursor: 'pointer' }}>
                    Open Packs
                  </motion.button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {filteredOwned.map((p, i) => (
                    <motion.div key={p.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }}>
                      <div style={{ position: 'relative' }}>
                        <PlayerCard player={p} />
                        {p.quantity > 1 && (
                          <div style={{ position: 'absolute', top: 6, left: 6, background: '#c084fc', color: '#000', fontWeight: 900, fontSize: 9, padding: '2px 6px', borderRadius: 99 }}>x{p.quantity}</div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Store ── */}
          {subScreen === 'store' && (
            <div style={{ padding: '16px 20px calc(env(safe-area-inset-bottom,0px) + 120px)' }}>
              <input type="text" value={storeSearch} onChange={e => setStoreSearch(e.target.value)} placeholder="Search player or team…"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '9px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                {['All','Premier League','La Liga','Bundesliga','Serie A','Ligue 1'].map(l => (
                  <button key={l} onClick={() => setLeagueFilter(l)}
                    style={{ padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                      background: leagueFilter === l ? '#c084fc' : 'rgba(255,255,255,0.07)',
                      color: leagueFilter === l ? '#000' : '#71717a',
                      border: leagueFilter === l ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.1)' }}>
                    {l === 'All' ? 'All Leagues' : l}
                  </button>
                ))}
              </div>
              {loadingPlayers ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} style={{ height: 170, borderRadius: 16, background: 'rgba(255,255,255,0.04)' }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {filteredStore.map((p, i) => (
                    <motion.div key={p.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.015 }}>
                      <div style={{ position: 'relative' }}>
                        <PlayerCard player={p} owned={isOwned(p.id)} onClick={() => setBuyingPlayer(p)} />
                        <div style={{ position: 'absolute', bottom: 30, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                          <div style={{ background: 'rgba(0,0,0,0.7)', borderRadius: 99, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ fontSize: 10 }}>🪙</span>
                            <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>
                              {({ common: '500', rare: '1,500', epic: '4,000', legendary: '10,000' }[p.rarity ?? 'common'])}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Packs ── */}
          {subScreen === 'packs' && (
            <div style={{ padding: '16px 20px calc(env(safe-area-inset-bottom,0px) + 120px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {PACKS.map((pack, i) => {
                const isFree = pack.id === 'free_daily';
                const locked = isFree ? !canClaimFreePack : false;
                return (
                  <motion.div key={pack.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                    <div style={{ borderRadius: 20, overflow: 'hidden', background: pack.gradient, border: `1px solid ${pack.accent}44`, position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${pack.accent}cc,transparent)` }} />
                      <div style={{ padding: '18px 18px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ fontSize: 36, flexShrink: 0 }}>{pack.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>{pack.name}</p>
                          <p style={{ color: '#a1a1aa', fontSize: 12, marginTop: 2 }}>{pack.description}</p>
                          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                            {Object.entries(pack.rarityWeights).filter(([,w]) => w > 0).map(([r, w]) => (
                              <span key={r} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                                background: RARITY_CONFIG[r as keyof typeof RARITY_CONFIG].color + '22',
                                color: RARITY_CONFIG[r as keyof typeof RARITY_CONFIG].color,
                                border: `1px solid ${RARITY_CONFIG[r as keyof typeof RARITY_CONFIG].border}` }}>
                                {r} {w}%
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          {isFree ? (
                            locked ? (
                              <div>
                                <p style={{ color: '#71717a', fontSize: 10, marginBottom: 4 }}>Next in</p>
                                <p style={{ color: pack.accent, fontWeight: 700, fontSize: 13 }}>{freePackCooldown}</p>
                              </div>
                            ) : (
                              <motion.button whileTap={{ scale: 0.93 }} onClick={() => openPack(pack)}
                                style={{ background: pack.accent, color: '#000', fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer' }}>
                                Free!
                              </motion.button>
                            )
                          ) : (
                            <motion.button whileTap={{ scale: 0.93 }} onClick={() => openPack(pack)}
                              style={{ background: pack.accent + '22', color: pack.accent, fontWeight: 700, fontSize: 13, padding: '8px 16px', borderRadius: 12, border: `1px solid ${pack.accent}55`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{pack.currency === 'coins' ? '🪙' : '💎'}</span>
                              <span>{pack.cost.toLocaleString()}</span>
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
      </AnimatePresence>

      {/* Pack opening modal */}
      <AnimatePresence>
        {openingPack && (
          <PackOpenModal pack={openingPack} pulledPlayers={pulledPlayers} onClose={closePack} />
        )}
      </AnimatePresence>

      {/* Buy player modal */}
      <AnimatePresence>
        {buyingPlayer && (
          <BuyPlayerModal player={buyingPlayer} currency={currency} onBuy={buyPlayer} onClose={() => setBuyingPlayer(null)} />
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