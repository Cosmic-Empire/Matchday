'use client';

import { useState, useEffect } from 'react';
import HomeScreen from '../components/HomeScreen';
import GameScreen from '../components/GameScreen';
import CreateScreen from '../components/CreateScreen';
import ClubScreen from '../components/ClubScreen';
import { useRef } from 'react';


export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
const indicatorRef = useRef<HTMLDivElement>(null);
const isAnimatingRef = useRef(false);

  const [activeTab, setActiveTab] =
    useState<'home' | 'games' | 'create' | 'club'>('home');

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
  const handleScroll = () => {
    setScrolled(window.scrollY > 20);
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);

useEffect(() => {
  const container = containerRef.current;
  const indicator = indicatorRef.current;

  if (!container || !indicator) return;

  const updateIndicator = () => {
    const buttons = container.querySelectorAll('button');
    const index = ['home', 'games', 'create', 'club'].indexOf(activeTab);
    const btn = buttons[index] as HTMLElement;
    if (!btn) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    const centerX =
      btnRect.left - containerRect.left + btnRect.width / 2;

    const indicatorWidth = Math.min(
      btnRect.width * 1.35,
      containerRect.width / 3.8
    );

    const left = centerX - indicatorWidth / 2;

    const clampedLeft = Math.max(
      4,
      Math.min(left, containerRect.width - indicatorWidth - 4)
    );

    indicator.style.width = `${indicatorWidth}px`;
    indicator.style.left = `${clampedLeft}px`;
  };

  // 🔥 Observe container size changes (THIS is the fix)
  const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(updateIndicator);
  });

  resizeObserver.observe(container);

  // Also observe each button (important for icon scaling)
  const buttons = container.querySelectorAll('button');
  buttons.forEach((btn) => resizeObserver.observe(btn));

  // Initial position
  requestAnimationFrame(updateIndicator);

  return () => {
    resizeObserver.disconnect();
  };
}, [activeTab]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
      <div className="max-w-[430px] mx-auto min-h-screen relative pb-24">
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'games' && <GameScreen />}
        {activeTab === 'create' && <CreateScreen />}
        {activeTab === 'club' && <ClubScreen />}

     <nav
  className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300
  ${scrolled ? 'w-[72%] max-w-[300px]' : 'w-[80%] max-w-[330px]'}`}
>
  <div
  ref={containerRef}
  className="relative flex items-center justify-between px-1 py-1 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl transition-all duration-300 overflo"
>
  

    {/* 🔥 PERFECT INDICATOR */}
    <div
  ref={indicatorRef}
  className="absolute inset-y-1 rounded-full bg-[#00FF87]/15 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] shadow-[0_0_20px_rgba(0,255,135,0.15)]"
/>

    {[
      { id: 'home', label: 'Home', icon: HomeIcon },
      { id: 'games', label: 'Games', icon: GamesIcon },
      { id: 'create', label: 'Create', icon: CreateIcon },
      { id: 'club', label: 'Club', icon: ClubIcon },
    ].map(({ id, label, icon: Icon }) => (
      <button
  key={id}
  onClick={() => setActiveTab(id as typeof activeTab)}
  className="relative flex flex-1 flex-col items-center gap-1 px-2 py-1 rounded-2xl transition-all duration-300"
>
        <div
  className={`relative flex items-center justify-center transition-all duration-300
  ${scrolled ? 'w-7 h-7' : 'w-8 h-8'}
  ${activeTab === id ? '-translate-y-1 scale-110 drop-shadow-[0_0_6px_rgba(0,255,135,0.6)]' : 'scale-100'}`}
>
  <Icon active={activeTab === id} />
</div>
        <span
          className={`transition-all duration-300 ${
            scrolled ? 'text-[7px]' : 'text-[8px]'
          } font-medium tracking-wide ${
            activeTab === id ? 'text-[#00FF87]' : 'text-zinc-500'
          }`}
        >
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
      <path
        d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
        fill={active ? '#00FF87' : 'none'}
        stroke={active ? '#00FF87' : '#52525b'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GamesIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke={active ? '#00FF87' : '#52525b'}
        strokeWidth="1.5"
      />
      <path
        d="M12 3C12 3 9 7 9 12C9 17 12 21 12 21"
        stroke={active ? '#00FF87' : '#52525b'}
        strokeWidth="1.5"
      />
      <path
        d="M12 3C12 3 15 7 15 12C15 17 12 21 12 21"
        stroke={active ? '#00FF87' : '#52525b'}
        strokeWidth="1.5"
      />
      <path
        d="M3 12H21"
        stroke={active ? '#00FF87' : '#52525b'}
        strokeWidth="1.5"
      />
    </svg>
  );
}

function CreateIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="4"
        stroke={active ? '#00FF87' : '#52525b'}
        strokeWidth="1.5"
      />
      <path
        d="M12 8V16M8 12H16"
        stroke={active ? '#00FF87' : '#52525b'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClubIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        fill={active ? '#00FF87' : 'none'}
        stroke={active ? '#00FF87' : '#52525b'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}