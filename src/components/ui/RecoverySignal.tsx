import React from 'react';
import { Sparkles } from 'lucide-react';
import { tokens } from '../../ui/theme';
import playfulTrafficLight from '../../assets/images/playful-traffic-light.png';

interface Props { lsi: number; balance: number; pending?: boolean; }

export default function RecoverySignal({ lsi, balance, pending = false }: Props) {
  const status = pending ? '—' : lsi >= 90 && balance >= 85 ? 'GO' : lsi >= 75 ? 'CAUTION' : 'STOP';
  const activePose: 'stop' | 'ready' | 'go' = status === 'GO' ? 'go' : status === 'CAUTION' ? 'ready' : 'stop';
  const statusColor = status === 'GO' ? '#C9F5D7' : status === 'CAUTION' ? '#F8C8A1' : '#F69AA1';
  return (
    <section className="recovery-signal-scene relative flex-auto shrink-0 overflow-hidden rounded-[32px] border border-white/10 px-4 pb-5 pt-4">
      <div className="absolute -left-16 top-16 h-52 w-52 rounded-full bg-[#6688FF]/20 blur-[70px]" aria-hidden />
      <div className="absolute -right-16 bottom-8 h-52 w-52 rounded-full bg-[#F4B3D8]/15 blur-[70px]" aria-hidden />
      <div className="relative flex items-start justify-between">
        <div><p className="text-[9px] font-bold uppercase tracking-[.2em]" style={{color:tokens.color.textMuted}}>AI movement signal</p><h2 className="mt-1 text-[24px] font-medium tracking-[-.04em] text-white">Recovery Signal</h2></div>
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[9px] font-bold text-white/80"><Sparkles size={11}/> LIVE</span>
      </div>

      <div className="relative mx-auto mt-5 w-[min(100%,260px)]" role="img" aria-label={`하트, 스마일, 클로버 신호등 · 현재 ${status}`}>
        <img className="block h-auto w-full drop-shadow-[0_16px_24px_rgba(0,0,0,0.45)]" src={playfulTrafficLight} alt="" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 944 1672" aria-hidden>
          <defs>
            <filter id="signal-lens-soften" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
          </defs>
          {([
            { pose: 'stop', cx: 521, cy: 361, rx: 164, ry: 165 },
            { pose: 'ready', cx: 521, cy: 851, rx: 164, ry: 175 },
            { pose: 'go', cx: 521, cy: 1358, rx: 164, ry: 178 },
          ] as const).map(({ pose, ...ellipse }) => (
            <ellipse key={pose} {...ellipse} fill="#030406" opacity={!pending && activePose === pose ? 0 : .72} filter="url(#signal-lens-soften)" className="transition-opacity duration-700" />
          ))}
        </svg>
      </div>

      <div className="relative mt-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 backdrop-blur-xl"><span className="h-2 w-2 rounded-full" style={{ background: statusColor, boxShadow: `0 0 12px ${statusColor}` }}/><span className="text-[11px] font-bold tracking-[.16em] text-white">{status}</span></div>
        <p className="mt-2 text-[11px] text-white/65">LSI {pending ? '—' : lsi}% · 보행 균형 {pending ? '—' : balance}점 기반</p>
      </div>
    </section>
  );
}
