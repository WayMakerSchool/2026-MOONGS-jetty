import React from 'react';
import { tokens } from '../../ui/theme';

interface Props { value?: number | string; label?: string; size?: number; analysing?: boolean; }

export default function RecoveryOrb({ value = '--', label = '', size = 144, analysing = false }: Props) {
  const numeric = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  const progress = Math.min(Math.max(numeric, 0), 100);
  const hue = progress >= 90 ? tokens.color.green : progress >= 75 ? tokens.color.blue : tokens.color.orange;

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label} ${value}%`}>
      <div className={`absolute inset-0 rounded-full ${analysing ? 'orb-breathe' : ''}`} style={{
        background: `radial-gradient(circle at 34% 28%, rgba(255,255,255,.8), transparent 8%), radial-gradient(circle at 30% 30%, ${tokens.color.pink}, transparent 38%), radial-gradient(circle at 72% 68%, ${hue}, transparent 46%), ${tokens.color.purple}`,
        boxShadow: `0 0 48px ${hue}38, inset -12px -16px 38px rgba(5,7,14,.38), inset 8px 8px 24px rgba(255,255,255,.16)`,
        opacity: .88,
      }} aria-hidden />
      <div className="absolute inset-[8%] rounded-full border border-white/20" aria-hidden />
      <div className="relative z-10 text-center drop-shadow-[0_2px_10px_rgba(0,0,0,.6)]">
        <div className="flex items-start justify-center leading-none">
          <span className="text-[44px] font-light tracking-[-0.06em] text-white">{value}</span>
          <span className="mt-1.5 ml-1 text-sm font-semibold text-white/90">%</span>
        </div>
        {label && <div className="mt-2 text-[10px] font-bold uppercase tracking-[.2em] text-white/85">{label}</div>}
      </div>
      <svg className="absolute -rotate-90" width={size + 8} height={size + 8} aria-hidden>
        <circle cx={(size + 8) / 2} cy={(size + 8) / 2} r={size / 2} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="2" />
        <circle cx={(size + 8) / 2} cy={(size + 8) / 2} r={size / 2} fill="none" stroke="rgba(255,255,255,.58)" strokeWidth="2" strokeLinecap="round" strokeDasharray={`${Math.PI * size}`} strokeDashoffset={`${Math.PI * size * (1 - progress / 100)}`} />
      </svg>
    </div>
  );
}
