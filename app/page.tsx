'use client';

import { useState } from 'react';
import HomeScreen from '../components/HomeScreen';
import GameScreen from '../components/GameScreen';
import CreateScreen from '../components/CreateScreen';
import ClubScreen from '../components/ClubScreen';

export default function App() {
  const [activeTab, setActiveTab] =
    useState<'home' | 'games' | 'create' | 'club'>('home');

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans">
      <div className="max-w-[430px] mx-auto min-h-screen relative pb-24">
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'games' && <GameScreen />}
        {activeTab === 'create' && <CreateScreen />}
        {activeTab === 'club' && <ClubScreen />}

        <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[86%] max-w-[380px] z-50">
          <div className="flex items-center justify-around px-2 py-1.5 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">

            {[
              { id: 'home', label: 'Home', icon: HomeIcon },
              { id: 'games', label: 'Games', icon: GamesIcon },
              { id: 'create', label: 'Create', icon: CreateIcon },
              { id: 'club', label: 'Club', icon: ClubIcon },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className="relative flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-2xl transition-all duration-300"
              >
                <div
                  className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                    activeTab === id ? 'bg-[#00FF87]/10' : ''
                  }`}
                />

                <div
                  className={`relative w-9 h-9 flex items-center justify-center transition-all duration-300 ${
                    activeTab === id ? '-translate-y-1' : ''
                  }`}
                >
                  <Icon active={activeTab === id} />
                </div>

                <span
                  className={`text-[9px] font-medium tracking-wide transition-all duration-300 ${
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