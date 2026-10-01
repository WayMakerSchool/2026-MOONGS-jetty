import React from 'react';
import { tokens } from '../../ui/theme';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export default function GlassButton({ children, className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`min-h-11 px-4 py-2 rounded-full border text-sm font-semibold text-[#F7F8FA] transition-[transform,background,border-color] duration-200 active:scale-95 hover:bg-white/10 ${className}`}
      style={{ background: tokens.color.surfaceStrong, borderColor: tokens.color.borderStrong, backdropFilter: `blur(${tokens.blur.soft})` }}
    >
      {children}
    </button>
  );
}
