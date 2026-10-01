import React from 'react';
import { Activity, Compass, Home, Sliders, Sparkles, TrendingUp } from 'lucide-react';

interface Props { activeScreen: string; onNavigate: (screen: string) => void; }

const items = [
  { id: 'home', label: '홈', Icon: Home },
  { id: 'chat', label: 'AI', Icon: Sparkles },
  { id: 'analysis', label: '분석', Icon: Activity },
  { id: 'trend', label: '추세', Icon: TrendingUp },
  { id: 'exercise', label: '운동', Icon: Compass },
  { id: 'my', label: '설정', Icon: Sliders },
];

export default function BottomNavigation({ activeScreen, onNavigate }: Props) {
  return (
    <nav className="safe-nav relative z-40 mx-auto mt-2 w-[calc(100%-24px)] max-w-[366px] shrink-0 bg-transparent px-2 py-1.5" aria-label="주요 메뉴">
      <div className="grid grid-cols-6 gap-0.5">
        {items.map(({ id, label, Icon }) => {
          const selected = activeScreen === id;
          return (
            <button key={id} type="button" onClick={() => onNavigate(id)} aria-current={selected ? 'page' : undefined} aria-label={label}
              title={label}
              className={`relative flex min-h-12 min-w-0 items-center justify-center rounded-full transition-colors duration-200 active:scale-95 ${selected ? 'bg-white/10 text-white' : 'bg-transparent text-[#AEB7C3]'}`}>
              <Icon size={22} strokeWidth={selected ? 2.8 : 1.8} aria-hidden />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
