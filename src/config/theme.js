// ═══════════════════════════════════════════════════════════════════════════
// 🎨 SPLITZY DESIGN SYSTEM — Baby Pink & White Edition
// ═══════════════════════════════════════════════════════════════════════════

export const COLORS = {
  purple: {
    50:  '#fdf4ff',
    100: '#f9e8ff',
    200: '#f0ccff',
    300: '#d9a8f5',
    400: '#bf80f0',
    500: '#9b59d0',
    600: '#7b1fa2',
    700: '#6a1790',
    800: '#560f7a',
    900: '#3d0a5a',
  },
  blue: {
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
  pink: {
    50:  '#fff0f6',
    100: '#ffe4ef',
    200: '#ffc2d9',
    300: '#ffadd0',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
  },

  // Lightened backgrounds
  background: {
    primary:   '#271040',   // was #130520 — noticeably lighter
    secondary: '#321555',   // was #1c0a32
    card:      '#3c1a62',   // was #25103d
    elevated:  '#4a2275',   // was #301550
    input:     '#2d1450',   // was #1c0a32
  },
  text: {
    primary:     '#ffffff',
    secondary:   '#f0d6ff',
    muted:       '#c8a8e0',
    placeholder: '#9370b0',
  },
  status: {
    success:     '#22c55e',
    successBg:   '#052e16',
    warning:     '#f59e0b',
    warningBg:   '#2d1b00',
    error:       '#ef4444',
    errorBg:     '#2d0a0a',
    info:        '#3b82f6',
    infoBg:      '#0a1628',
  },

  gradients: {
    primary:     ['#9b59d0', '#3b82f6'],
    secondary:   ['#ffadd0', '#c084fc'],
    accent:      ['#ffc2d9', '#f0abff'],
    soft:        ['#ffe4ef', '#f0d6ff'],
    dark:        ['#321555', '#271040'],   // lightened
    card:        ['#4a2275', '#321555'],   // lightened
    cardPink:    ['#4d2268', '#371550'],   // lightened
    danger:      ['#dc2626', '#991b1b'],
    success:     ['#15803d', '#052e16'],
    gold:        ['#f59e0b', '#d97706'],
    hero:        ['#7b1fa2', '#ffadd0'],
    white:       ['#ffffff', '#f9e8ff'],
    pinkWhite:   ['#fff0f6', '#ffc2d9'],
  },

  border:      'rgba(255, 173, 208, 0.25)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderWhite: 'rgba(255, 255, 255, 0.2)',
  overlay:     'rgba(10, 2, 20, 0.7)',
  white:       '#ffffff',
  babyPink:    '#ffadd0',
  blush:       '#ffc2d9',
  lavender:    '#f0d6ff',
  black:       '#000000',
  transparent: 'transparent',
};

export const FONTS = {
  regular:     'System',
  medium:      'System',
  semibold:    'System',
  bold:        'System',
  sizes: {
    xs:    11,
    sm:    13,
    base:  15,
    md:    17,
    lg:    19,
    xl:    22,
    '2xl': 26,
    '3xl': 30,
    '4xl': 36,
    '5xl': 44,
  },
  lineHeights: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.75,
  },
};

export const SPACING = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
};

export const RADIUS = {
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  '2xl': 24,
  full:  9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#ffadd0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#c084fc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#9b59d0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  glow: {
    shadowColor: '#ffadd0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
};

export const ANIMATION = {
  fast:   150,
  normal: 250,
  slow:   400,
};
