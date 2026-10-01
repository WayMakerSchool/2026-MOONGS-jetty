import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';

export interface MetricDetail {
  label: string;
  title: string;
  value: string;
  description: string;
  source: string;
  icon: ReactNode;
}

interface Props {
  detail: MetricDetail;
  tint: string;
  glow: string;
  origin: { x: number; y: number };
  isDemo: boolean;
  onClose: () => void;
}

export default function MetricGlassSheet({ detail, tint, glow, origin, isDemo, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      trigger?.focus({ preventScroll: true });
    };
  }, []);

  const folded = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, x: origin.x, y: origin.y, scale: 0.28, rotate: -7 };

  return (
    <dialog
      ref={dialogRef}
      className="metric-sheet-dialog"
      aria-labelledby="metric-detail-title"
      aria-describedby="metric-detail-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
    >
      <motion.div
        className="metric-sheet-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.25 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.article
        className="metric-glass-sheet"
        style={{ '--sheet-tint': tint, '--sheet-glow': glow } as CSSProperties}
        initial={folded}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
        exit={folded}
        transition={{ duration: reduceMotion ? 0 : 0.48, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="metric-sheet-scroll">
          <header className="metric-sheet-header">
            <div className="metric-sheet-mark">{detail.icon}<span>{detail.label}</span></div>
            <button type="button" onClick={onClose} className="metric-sheet-close" aria-label="상세 시트 닫기" autoFocus><X size={18} /></button>
          </header>
          <div className="metric-sheet-heading">
            <p className="metric-sheet-eyebrow">오늘의 움직임</p>
            <h2 id="metric-detail-title">{detail.title}</h2>
          </div>
          <p className="metric-sheet-value">{detail.value}</p>
          <div className="metric-sheet-divider" aria-hidden="true" />
          <p id="metric-detail-description" className="metric-sheet-description">{detail.description}</p>
          <div className="metric-sheet-source">
            <p>사용 데이터</p>
            <span>{detail.source}</span>
          </div>
          <footer className="metric-sheet-footer"><span>MOONGS</span><span>{isDemo ? '데모 데이터' : '센서 데이터'}</span></footer>
        </div>
      </motion.article>
    </dialog>
  );
}
