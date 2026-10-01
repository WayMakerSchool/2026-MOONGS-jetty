import React, { useState } from 'react';
import { Activity, Bluetooth, ChevronRight, Footprints, Gauge, Info, Move, X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import MetricGlassSheet, { type MetricDetail } from './ui/MetricGlassSheet';
import PressureFeetHero from './ui/PressureFeetHero';
import { AppState } from '../types';
import { tokens } from '../ui/theme';

interface Props {
  state: AppState;
  setScreenName: (screen: string) => void;
  onStartBluetoothScan: () => void;
  onDisconnectBluetooth: () => void;
}

export default function HomeV2({ state, setScreenName, onStartBluetoothScan, onDisconnectBluetooth }: Props) {
  const [detail, setDetail] = useState<MetricDetail | null>(null);
  const [sheetOrigin, setSheetOrigin] = useState({ x: 0, y: 0 });
  const [connectionOpen, setConnectionOpen] = useState(false);
  const bluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const date = new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' }).format(new Date());

  const metrics: Array<MetricDetail & { accent: string }> = [
    { label: 'LSI', title: '좌우 대칭성', value: `${state.gaitMetrics.lsiSymmetry}%`, description: '건강한 발과 회복 중인 발의 보행 데이터를 비교한 좌우 대칭성 지표입니다.', source: '양발 압력 센서 · 보행 주기', accent: '#D7FFDB', icon: <Gauge size={15} /> },
    { label: 'BALANCE', title: '보행 균형', value: `${state.gaitMetrics.balanceScore}`, description: '좌우 체중 분포와 디딤 안정성을 결합해 100점 기준으로 계산합니다.', source: `좌 ${state.gaitMetrics.weightDistributionLeft}% · 우 ${state.gaitMetrics.weightDistributionRight}%`, accent: '#B9F0EA', icon: <Activity size={15} /> },
    { label: 'ACTIVITY', title: '오늘의 활동', value: state.gaitMetrics.stepCount.toLocaleString(), description: '센서가 인식한 유효 보행 주기를 걸음 수로 환산한 오늘의 누적 활동량입니다.', source: `${state.gaitMetrics.distanceKm} km · ${state.gaitMetrics.walkingTimeMin}분`, accent: '#D9FF74', icon: <Footprints size={15} /> },
    { label: 'MOTION', title: '발목 움직임', value: '6.2°', description: '보행 중 발목의 좌우 흔들림 범위입니다. 값이 낮을수록 움직임이 안정적입니다.', source: 'IMU 관성 센서 · 최근 보행', accent: '#F8C8A1', icon: <Move size={15} /> },
  ];

  const metricVisuals: Record<string, { light: string; main: string; dark: string; ink: string }> = {
    LSI: { light: '#b8d2c3', main: '#7f9f91', dark: '#080e16', ink: '#172923' },
    BALANCE: { light: '#f4c0df', main: '#db82b5', dark: '#a71961', ink: '#601737' },
    ACTIVITY: { light: '#789bea', main: '#244cae', dark: '#050c20', ink: '#12285a' },
    MOTION: { light: '#e9a07b', main: '#c35f3c', dark: '#3044cc', ink: '#713721' },
  };

  const folderShapes: Record<string, string> = {
    LSI: 'M 2,30 Q 2,12 21,12 H 83 Q 101,12 101,30 V 38 Q 101,53 117,53 H 179 Q 198,53 196,72 L 190,130 Q 188,147 171,147 H 28 Q 10,147 9,130 Z',
    BALANCE: 'M 4,61 Q 4,43 22,43 H 81 Q 96,43 96,29 V 25 Q 96,12 113,12 H 176 Q 195,12 195,31 V 127 Q 195,147 175,147 H 25 Q 4,147 4,127 Z',
    ACTIVITY: 'M 5,27 Q 5,17 16,17 H 72 L 94,39 H 182 Q 194,39 194,51 V 135 Q 194,147 182,147 H 17 Q 5,147 5,135 Z',
    MOTION: 'M 3,55 Q 3,39 20,39 H 55 Q 63,39 67,29 L 72,20 Q 76,12 87,12 H 135 Q 148,12 152,25 L 156,39 H 180 Q 197,39 197,56 L 189,128 Q 187,147 168,147 H 31 Q 12,147 10,128 Z',
  };

  return (
    <main className="safe-screen h-full overflow-y-auto overscroll-contain px-4" style={{ scrollbarWidth: 'none' }}>
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-3.5">
        <header className="flex items-center justify-between px-1 pt-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: tokens.color.textMuted }}>{date}</p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-[-.04em]" style={{ color: tokens.color.text }}>MOONGS</h1>
          </div>
          <button type="button" onClick={() => setConnectionOpen(true)} aria-label="데이터 연결 설정 열기" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-white/10 active:scale-[.98]" style={{ borderColor: tokens.color.border, background: tokens.color.surface, color: tokens.color.textSecondary }}>
            <Bluetooth size={14} aria-hidden />
          </button>
        </header>

        <PressureFeetHero state={state} onOpenPressure={() => setScreenName('analysis')} />

        <section aria-labelledby="today-metrics">
          <div className="mb-2.5 flex items-end justify-between px-1">
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: tokens.color.textMuted }}>Live metrics</p><h2 id="today-metrics" className="mt-0.5 text-[16px] font-semibold text-white">오늘의 움직임</h2></div>
            <p className="text-[10px]" style={{ color: tokens.color.textMuted }}>카드를 눌러 자세히 보기</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-7 px-2 pt-1">
            {metrics.map((metric) => (
              <button
                key={metric.label}
                type="button"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setSheetOrigin({ x: rect.left + rect.width / 2 - window.innerWidth / 2, y: rect.top + rect.height / 2 - window.innerHeight / 2 });
                  setDetail(metric);
                }}
                aria-haspopup="dialog"
                aria-expanded={detail?.label === metric.label}
                className={`metric-folder metric-folder-${metric.label.toLowerCase()} min-w-0 text-left`}
                style={{ '--folder-light': metricVisuals[metric.label].light, '--folder-main': metricVisuals[metric.label].main, '--folder-dark': metricVisuals[metric.label].dark, '--folder-ink': metricVisuals[metric.label].ink } as React.CSSProperties}
                aria-label={`${metric.title} ${metric.value} 계산 근거 보기`}
              >
                <span className="metric-folder-back" aria-hidden="true" />
                <span className="metric-folder-paper metric-folder-paper-left" aria-hidden="true"><span /><span /><span /></span>
                <span className="metric-folder-paper metric-folder-paper-right" aria-hidden="true">{metric.icon}<span /></span>
                <svg className="metric-folder-front" viewBox="0 0 200 150" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id={`folder-${metric.label}`} x1="0" y1="0" x2="0.25" y2="1">
                      <stop offset="0%" stopColor={metricVisuals[metric.label].light} stopOpacity="0.28" />
                      <stop offset="28%" stopColor={metricVisuals[metric.label].main} stopOpacity="0.58" />
                      <stop offset="64%" stopColor={metricVisuals[metric.label].main} stopOpacity="0.96" />
                      <stop offset="82%" stopColor={metricVisuals[metric.label].main} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={metricVisuals[metric.label].light} stopOpacity="0.52" />
                    </linearGradient>
                    <radialGradient id={`folder-pool-${metric.label}`} cx={metric.label === 'MOTION' ? '80%' : '53%'} cy="56%" r={metric.label === 'MOTION' ? '48%' : '60%'} gradientTransform="translate(0 0.14) scale(1 0.75)">
                      <stop offset="0%" stopColor={metricVisuals[metric.label].dark} stopOpacity="0.98" />
                      <stop offset="30%" stopColor={metricVisuals[metric.label].dark} stopOpacity="0.9" />
                      <stop offset="65%" stopColor={metricVisuals[metric.label].dark} stopOpacity="0.42" />
                      <stop offset="100%" stopColor={metricVisuals[metric.label].dark} stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id={`folder-glow-${metric.label}`} cx="50%" cy="60%" r="70%">
                      <stop offset="35%" stopColor={metricVisuals[metric.label].light} stopOpacity="0" />
                      <stop offset="78%" stopColor={metricVisuals[metric.label].light} stopOpacity="0.14" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.48" />
                    </radialGradient>
                    <linearGradient id={`folder-edge-${metric.label}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
                      <stop offset="50%" stopColor={metricVisuals[metric.label].light} stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
                    </linearGradient>
                  </defs>
                  <path d={folderShapes[metric.label]} fill={`url(#folder-${metric.label})`} />
                  <path d={folderShapes[metric.label]} fill={`url(#folder-pool-${metric.label})`} />
                  <path d={folderShapes[metric.label]} fill={`url(#folder-glow-${metric.label})`} stroke={`url(#folder-edge-${metric.label})`} strokeWidth="0.8" />
                </svg>
                <span className="metric-folder-label">{metric.label}</span>
                <span className="metric-folder-content">
                  <span className="metric-folder-value">{metric.value}</span>
                  <span className="metric-folder-caption"><Info size={10} />{metric.title}<ChevronRight size={15} className="ml-auto" /></span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {connectionOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 px-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="connection-title" onClick={() => setConnectionOpen(false)}>
          <div className="w-full max-w-[404px] rounded-[28px] border border-white/15 bg-[#171b22] p-5 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/50">Data source</p><h2 id="connection-title" className="mt-1 text-xl font-semibold">데이터 연결</h2></div>
              <button type="button" onClick={() => setConnectionOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5" aria-label="닫기"><X size={18}/></button>
            </div>
            <p className="mt-3 text-sm text-white/65">{state.isIoTConnected ? `${state.bluetoothDeviceName || '센서'} 연결 중` : '현재 데모 데이터를 보고 있습니다.'}</p>
            <div className="mt-5 flex flex-col gap-2">
              {bluetoothSupported && !state.isIoTConnected && (
                <button type="button" onClick={onStartBluetoothScan} disabled={state.isBluetoothScanning} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-[#171b22] disabled:opacity-50">
                  <Bluetooth size={16}/>{state.isBluetoothScanning ? '기기 검색 중…' : '블루투스 기기 연결'}
                </button>
              )}
              {state.isIoTConnected && (
                <button type="button" onClick={() => { onDisconnectBluetooth(); setConnectionOpen(false); }} className="min-h-12 rounded-2xl bg-white/10 text-sm font-semibold">연결 해제하고 데모 데이터 사용</button>
              )}
              {!bluetoothSupported && <p className="rounded-2xl bg-white/5 p-3 text-xs leading-5 text-white/60">이 브라우저에서는 블루투스 연결을 지원하지 않습니다. 데모 데이터는 계속 사용할 수 있습니다.</p>}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {detail && (
          <MetricGlassSheet
            detail={detail}
            tint={metricVisuals[detail.label].light}
            glow={metricVisuals[detail.label].main}
            origin={sheetOrigin}
            isDemo={!state.isIoTConnected}
            onClose={() => setDetail(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
