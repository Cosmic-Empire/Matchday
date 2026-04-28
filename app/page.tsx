'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import HomeScreen from '../components/HomeScreen';
import GameScreen from '../components/GameScreen';
import FantasyScreen from '../components/FantasyScreen';
import ClubScreen from '../components/ClubScreen';
import AuthScreen from '../components/AuthScreen';

const TABS = ['home', 'games', 'fantasy', 'club'] as const;
type Tab = typeof TABS[number];

const SWIPE_THRESHOLD = 50;
const SWIPE_MAX_VERTICAL = 75; // ignore if too vertical

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [direction, setDirection] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setIsGuest(localStorage.getItem('matchday_guest') === 'true');

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;

    const updateIndicator = () => {
      const buttons = container.querySelectorAll('button');
      const index = TABS.indexOf(activeTab);
      const btn = buttons[index] as HTMLElement;
      if (!btn) return;

      const containerRect = container.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const centerX = btnRect.left - containerRect.left + btnRect.width / 2;
      const indicatorWidth = Math.min(btnRect.width * 1.35, containerRect.width / 3.8);
      const left = centerX - indicatorWidth / 2;
      const clampedLeft = Math.max(4, Math.min(left, containerRect.width - indicatorWidth - 4));

      indicator.style.width = `${indicatorWidth}px`;
      indicator.style.left = `${clampedLeft}px`;
    };

    const resizeObserver = new ResizeObserver(() => requestAnimationFrame(updateIndicator));
    resizeObserver.observe(container);
    container.querySelectorAll('button').forEach(btn => resizeObserver.observe(btn));
    requestAnimationFrame(updateIndicator);

    return () => resizeObserver.disconnect();
  }, [activeTab]);

  const goToTab = (tab: Tab) => {
    const currentIndex = TABS.indexOf(activeTab);
    const nextIndex = TABS.indexOf(tab);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(tab);
  };

  // Native touch handlers — work regardless of inner scroll containers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    // Ignore if gesture is more vertical than horizontal
    if (Math.abs(dy) > SWIPE_MAX_VERTICAL) return;

    const currentIndex = TABS.indexOf(activeTab);

    if (dx < -SWIPE_THRESHOLD && currentIndex < TABS.length - 1) {
      setDirection(1);
      setActiveTab(TABS[currentIndex + 1]);
    } else if (dx > SWIPE_THRESHOLD && currentIndex > 0) {
      setDirection(-1);
      setActiveTab(TABS[currentIndex - 1]);
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00FF87] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isGuest) {
    return <AuthScreen />;
  }

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] as const },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0,
      transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const },
    }),
  };

  return (
    <div
      className="min-h-screen bg-[#0A0A0A] text-white font-sans"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="max-w-[430px] mx-auto min-h-screen relative pb-24 overflow-hidden">

        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full"
          >
            {activeTab === 'home'    && <HomeScreen />}
            {activeTab === 'games'   && <GameScreen />}
            {activeTab === 'fantasy' && <FantasyScreen />}
            {activeTab === 'club'    && <ClubScreen />}
          </motion.div>
        </AnimatePresence>

        <nav className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300
          ${scrolled ? 'w-[72%] max-w-[300px]' : 'w-[80%] max-w-[330px]'}`}>
          <div
            ref={containerRef}
            className="relative flex items-center justify-between px-1 py-1 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300"
          >
            <div
              ref={indicatorRef}
              className="absolute inset-y-1 rounded-full bg-[#00FF87]/15 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_0_20px_rgba(0,255,135,0.15)]"
            />

            {[
              { id: 'home',    label: 'Home',    icon: HomeIcon },
              { id: 'games',   label: 'Games',   icon: GamesIcon },
              { id: 'fantasy', label: 'Fantasy', icon: FantasyIcon },
              { id: 'club',    label: 'Club',    icon: ClubIcon },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => goToTab(id as Tab)}
                className="relative flex flex-1 flex-col items-center gap-1 px-2 py-1 rounded-2xl transition-all duration-300"
              >
                <div className={`relative flex items-center justify-center transition-all duration-300
                  ${scrolled ? 'w-7 h-7' : 'w-8 h-8'}
                  ${activeTab === id ? '-translate-y-1 scale-110 drop-shadow-[0_0_6px_rgba(0,255,135,0.6)]' : 'scale-100'}`}>
                  <Icon active={activeTab === id} />
                </div>
                <span className={`transition-all duration-300 ${scrolled ? 'text-[7px]' : 'text-[8px]'}
                  font-medium tracking-wide ${activeTab === id ? 'text-[#00FF87]' : 'text-zinc-500'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
        fill={active ? '#00FF87' : 'none'} stroke={active ? '#00FF87' : '#52525b'}
        strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function GamesIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={active ? '#00FF87' : '#52525b'} strokeWidth="1.5" />
      <path d="M12 3C12 3 9 7 9 12C9 17 12 21 12 21" stroke={active ? '#00FF87' : '#52525b'} strokeWidth="1.5" />
      <path d="M12 3C12 3 15 7 15 12C15 17 12 21 12 21" stroke={active ? '#00FF87' : '#52525b'} strokeWidth="1.5" />
      <path d="M3 12H21" stroke={active ? '#00FF87' : '#52525b'} strokeWidth="1.5" />
    </svg>
  );
}

function FantasyIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        fill={active ? '#00FF87' : 'none'} stroke={active ? '#00FF87' : '#52525b'}
        strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function ClubIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 4 6 4 13C4 17 7.5 20 12 20C16.5 20 20 17 20 13C20 6 12 2 12 2Z"
        fill={active ? '#00FF87' : 'none'} stroke={active ? '#00FF87' : '#52525b'} strokeWidth="1.5" />
      <path d="M12 20V22M8 22H16" stroke={active ? '#00FF87' : '#52525b'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}