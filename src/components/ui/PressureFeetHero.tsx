import React from 'react';
import { AppState } from '../../types';
import GradientGlassCard from './GradientGlassCard';
import { tokens } from '../../ui/theme';

interface Props { state: AppState; onOpenPressure: () => void; }

const solePath = 'M42 76 C30 99 33 124 58 139 C83 155 87 190 78 229 C68 270 69 307 82 332 C94 352 125 350 137 329 C151 302 145 263 150 224 C156 178 171 136 174 103 C176 84 151 78 126 84 C96 91 67 78 42 76 Z';

function Foot({ side, values, showValues }: { showValues?: boolean; side: 'L' | 'R'; values: number[] }) {
  const mirrored = side === 'L';
  const sensorPoints = [[69, 116], [134, 119], [91, 302], [127, 302]];
  return (
    <svg viewBox="0 0 205 360" className="h-full w-full overflow-hidden" aria-label={`${side === 'L' ? '왼발' : '오른발'} 압력 센서`}>
      <defs>
        <pattern id={`dots-${side}`} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.25" fill="rgba(255,255,255,.63)" /></pattern>
        <filter id={`glow-${side}`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="8" /></filter>
      </defs>
      <g transform={mirrored ? 'translate(205 0) scale(-1 1)' : undefined}>
        <ellipse cx="55" cy="28" rx="19" ry="22" transform="rotate(-12 55 28)" fill={`url(#dots-${side})`} />
        <ellipse cx="97" cy="24" rx="13" ry="15" fill={`url(#dots-${side})`} />
        <ellipse cx="130" cy="37" rx="11" ry="13" fill={`url(#dots-${side})`} />
        <ellipse cx="155" cy="55" rx="9" ry="11" fill={`url(#dots-${side})`} />
        <ellipse cx="174" cy="79" rx="7" ry="9" fill={`url(#dots-${side})`} />
        <path d={solePath} fill={`url(#dots-${side})`} stroke="rgba(255,255,255,.12)" strokeWidth="1" />
        {sensorPoints.map(([cx, cy], index) => {
          const value = values[index] ?? 0;
          const color = value > 80 ? tokens.color.coral : value > 65 ? tokens.color.orange : value > 40 ? tokens.color.green : tokens.color.cyan;
          const radius = 15 + value * .13;
          return <g key={index}>
            <circle cx={cx} cy={cy} r={radius} fill={color} opacity=".22" filter={`url(#glow-${side})`} />
            <circle cx={cx} cy={cy} r="12" fill="rgba(8,10,16,.42)" stroke="rgba(255,255,255,.62)" strokeWidth="1" />
            <circle cx={cx} cy={cy} r="3.5" fill="white" />
            {showValues && <text x={cx} y={cy + 31} textAnchor="middle" fontSize="10" fill="white" transform={mirrored ? `translate(${cx * 2} 0) scale(-1 1)` : undefined}>{Math.round(value)}%</text>}
            <circle cx={cx} cy={cy} r="18" fill="none" stroke={color} strokeWidth="1" opacity={value > 70 ? .8 : .25} />
          </g>;
        })}
      </g>
    </svg>
  );
}

export default function PressureFeetHero({ state, onOpenPressure }: Props) {
  const left = state.sensorData.leftFoot;
  const right = state.sensorData.rightFoot;
  const leftValues = [left.piezo1 ?? left.forefoot, left.piezo2 ?? left.forefoot, left.piezo3 ?? left.heel, left.piezo4 ?? left.heel];
  const rightValues = [right.piezo1 ?? right.forefoot, right.piezo2 ?? right.forefoot, right.piezo3 ?? right.heel, right.piezo4 ?? right.heel];
  const pressureReceived = state.telemetry?.hasPressure ?? state.telemetry?.received;
  const measured = !state.telemetry || state.telemetry.bilateral;
  return (
    <button type="button" onClick={onOpenPressure} className="w-full text-left transition-transform active:scale-[.992]" aria-label="실시간 양발 압력 상세 보기">
      <GradientGlassCard className="overflow-hidden px-4 pb-4 pt-4" accent="balance">
        <div className="flex items-start justify-between">
          <div><p className="text-[9px] font-bold uppercase tracking-[.18em]" style={{ color: tokens.color.textMuted }}>{state.telemetry ? (state.telemetry.bilateral ? (state.telemetry.estimated ? 'Live sensor · 추정 하중' : 'Live sensor · 양발') : 'Live sensor · 오른발') : 'Demo sensor · 8 channels'}</p><h2 className="mt-1 text-[25px] font-medium tracking-[-.045em] text-white">Gait Balance</h2></div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1.5 text-[9px] font-bold text-[#A7F2C6]"><span className="h-1.5 w-1.5 rounded-full bg-[#80E7AE]"/>{state.telemetry ? (pressureReceived ? 'LIVE' : 'WAIT') : 'DEMO'}</span>
        </div>
        <div className="relative mt-1 h-[240px] overflow-hidden">
          <div className="absolute left-1/2 top-[46%] h-24 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent" aria-hidden />
          <div className="grid h-full grid-cols-2 gap-0"><Foot side="L" values={leftValues} showValues={!!state.telemetry?.bilateral}/><Foot side="R" values={rightValues} showValues={!!pressureReceived}/></div>
        </div>
        <div className="relative z-10 mt-2 grid grid-cols-2 gap-8 px-4 pt-3 text-center">
          <div><div className="text-[34px] font-light tracking-[-.05em] text-white">{measured ? state.gaitMetrics.weightDistributionLeft : '—'}<span className="ml-1 text-xs text-white/65">%</span></div><div className="text-[9px] font-bold uppercase tracking-[.15em]" style={{ color: tokens.color.textMuted }}>Left load</div></div>
          <div><div className="text-[34px] font-light tracking-[-.05em] text-white">{measured ? state.gaitMetrics.weightDistributionRight : '—'}<span className="ml-1 text-xs text-white/65">%</span></div><div className="text-[9px] font-bold uppercase tracking-[.15em]" style={{ color: tokens.color.textMuted }}>Right load</div></div>
        </div>
      </GradientGlassCard>
    </button>
  );
}
