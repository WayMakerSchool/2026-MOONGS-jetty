import React from 'react';
import { gradients, tokens } from '../../ui/theme';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  accent?: 'recovery' | 'balance' | 'warn';
}

export default function GradientGlassCard({ children, accent = 'recovery', className = '', ...rest }: Props) {
  const bg = accent === 'balance' ? gradients.balance : accent === 'warn' ? gradients.warning : gradients.recovery;
  return (
    <div
      {...rest}
      className={`relative overflow-hidden border ${className}`}
      style={{
        background: bg, borderColor: tokens.color.borderStrong, borderRadius: tokens.radius.lg,
        boxShadow: tokens.shadow.float, backdropFilter: `blur(${tokens.blur.card})`, WebkitBackdropFilter: `blur(${tokens.blur.card})`
      }}
    >
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />
      <div className="relative">
        {children}
      </div>
    </div>
  );
}
