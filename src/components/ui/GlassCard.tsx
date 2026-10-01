import React from 'react';
import { tokens } from '../../ui/theme';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  interactive?: boolean;
  style?: React.CSSProperties;
}

export default function GlassCard({ children, className = '', interactive = false, style, ...rest }: GlassCardProps) {
  return (
    <div
      {...rest}
      className={`relative border transition-[transform,border-color,background] duration-200 ${interactive ? 'cursor-pointer active:scale-[.985] hover:border-white/20' : ''} ${className}`}
      style={{
        ...style,
        background: style?.background ?? tokens.color.surface,
        borderColor: style?.borderColor ?? tokens.color.border,
        borderRadius: tokens.radius.lg,
        boxShadow: tokens.shadow.card,
        backdropFilter: `blur(${tokens.blur.card}) saturate(125%)`,
        WebkitBackdropFilter: `blur(${tokens.blur.card}) saturate(125%)`,
      }}
    >
      {children}
    </div>
  );
}
