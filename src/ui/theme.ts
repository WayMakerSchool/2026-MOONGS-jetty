// MOONGS / Adaptive Recovery Interface — single source of visual truth.
export const tokens = {
  color: {
    canvas: '#000000', canvasRaised: '#0D0F15',
    surface: 'rgba(255,255,255,0.06)', surfaceStrong: 'rgba(255,255,255,0.10)',
    border: 'rgba(255,255,255,0.12)', borderStrong: 'rgba(255,255,255,0.18)',
    text: '#F2F4F7', textSecondary: '#C9CED9', textMuted: '#8F97A9',
    blue: '#C5D9FF', cyan: '#B9F0EA', purple: '#D9C8FF', pink: '#F4B3D8',
    green: '#C9F5D7', lime: '#E1F5A9', orange: '#F8C8A1', coral: '#F69AA1',
  },
  radius: { sm: '16px', md: '20px', lg: '26px', pill: '999px' },
  blur: { soft: '16px', card: '22px', nav: '28px' },
  shadow: {
    card: '0 18px 50px -26px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.08)',
    float: '0 20px 48px -18px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.1)',
  },
  motion: { fast: '180ms', base: '280ms', slow: '7s' },
} as const;

export const gradients = {
  recovery: 'radial-gradient(circle at 18% 16%, rgba(244,179,216,.32), transparent 34%), radial-gradient(circle at 84% 76%, rgba(197,217,255,.28), transparent 38%), linear-gradient(135deg, rgba(217,200,255,.18), rgba(4,5,9,.76))',
  balance: 'radial-gradient(circle at 22% 12%, rgba(185,240,234,.25), transparent 36%), radial-gradient(circle at 80% 82%, rgba(201,245,215,.20), transparent 40%), linear-gradient(135deg, rgba(255,255,255,.08), rgba(11,12,16,.82))',
  warning: 'radial-gradient(circle at 17% 12%, rgba(248,200,161,.24), transparent 34%), radial-gradient(circle at 80% 82%, rgba(244,179,216,.16), transparent 40%), linear-gradient(135deg, rgba(255,255,255,.06), rgba(12,10,18,.82))',
} as const;

// Existing screens use these aliases until their later migration phases.
const legacyTokens = {
  backgroundDeep: tokens.color.canvas, backgroundDeepAlt: tokens.color.canvasRaised,
  primaryAccent: tokens.color.blue, accentSoft: '#5B7CFF', recoveryPink: tokens.color.pink,
  recoveryPurple: tokens.color.purple, stableGreen: tokens.color.green,
  warnOrange: tokens.color.orange, sensorCyan: tokens.color.cyan,
  textPrimary: tokens.color.text, textSecondary: tokens.color.textSecondary, muted: tokens.color.textMuted,
  radiusLg: tokens.radius.lg, radiusMd: tokens.radius.sm, blurSoft: tokens.blur.soft,
  animFast: tokens.motion.fast, animMed: tokens.motion.base, animSlow: '600ms',
};

export default legacyTokens;
