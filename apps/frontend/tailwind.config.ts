import type { Config } from 'tailwindcss';

/**
 * Claude-Inspired Design System
 * 
 * A warm, calm, human-centered color palette with:
 * - Parchment backgrounds
 * - Muted amber accents
 * - Soft typography
 * - Premium feel without flashiness
 */

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ============================================
      // COLOR PALETTE - Warm, calm, Claude-inspired
      // ============================================
      colors: {
        // Background layers - warm parchment tones
        background: {
          DEFAULT: '#FAF9F7',     // Warm off-white
          secondary: '#F5F4F1',   // Slightly darker
          tertiary: '#EFEDE8',    // Subtle depth
        },
        // Surface cards - soft neutral
        surface: {
          DEFAULT: '#FFFFFF',     // Pure surface (only exception)
          muted: '#F8F7F4',       // Muted card
          elevated: '#FEFEFE',    // Elevated state
          hover: '#F3F1ED',       // Hover state
        },
        // Primary accent - muted amber/terracotta
        primary: {
          DEFAULT: '#C4704B',     // Warm terracotta
          50: '#FDF8F6',
          100: '#FAEFEB',
          200: '#F5DED6',
          300: '#EABFAD',
          400: '#DA9A7C',
          500: '#C4704B',
          600: '#B25A3A',
          700: '#954A30',
          800: '#7A3F2B',
          900: '#653628',
        },
        // Secondary accent - warm brown
        secondary: {
          DEFAULT: '#8B7355',     // Warm brown
          50: '#FAF8F6',
          100: '#F3EFE9',
          200: '#E5DDD2',
          300: '#D1C3B0',
          400: '#B9A48A',
          500: '#8B7355',
          600: '#745D44',
          700: '#5F4B38',
          800: '#503F30',
          900: '#44362A',
        },
        // Border colors - soft warm grays
        border: {
          DEFAULT: '#E8E5E0',     // Subtle border
          light: '#F0EDE8',       // Very subtle
          medium: '#D9D5CE',      // Visible border
          focus: '#C4704B40',     // Focus ring
        },
        // Text colors - warm grays
        text: {
          primary: '#2D2A26',     // Near-black warm
          secondary: '#5C5650',   // Medium emphasis
          tertiary: '#8A847C',    // Low emphasis
          muted: '#B3ADA4',       // Very low emphasis
          inverse: '#FAF9F7',     // On dark backgrounds
        },
        // Status colors - muted, not harsh
        status: {
          success: '#6B8E6B',     // Sage green
          'success-bg': '#6B8E6B10',
          warning: '#C2955C',     // Muted gold
          'warning-bg': '#C2955C10',
          error: '#B87070',       // Dusty rose
          'error-bg': '#B8707010',
          info: '#6B8A9A',        // Slate blue
          'info-bg': '#6B8A9A10',
          idle: '#8A847C',        // Neutral
          'idle-bg': '#8A847C10',
        },
      },
      // ============================================
      // TYPOGRAPHY - Editorial, humanist feel
      // ============================================
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        serif: [
          'Georgia',
          'Cambria',
          'Times New Roman',
          'serif',
        ],
        mono: [
          'SF Mono',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      fontSize: {
        // Display sizes
        'display': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.025em', fontWeight: '600' }],
        'display-sm': ['1.875rem', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '600' }],
        // Headings
        'heading': ['1.5rem', { lineHeight: '1.35', letterSpacing: '-0.015em', fontWeight: '600' }],
        'heading-sm': ['1.25rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-md': ['1.375rem', { lineHeight: '1.35', letterSpacing: '-0.012em', fontWeight: '600' }],
        // Body text
        'body-lg': ['1.0625rem', { lineHeight: '1.65' }],
        'body': ['0.9375rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.55' }],
        // Small text
        'caption': ['0.8125rem', { lineHeight: '1.5' }],
        'micro': ['0.75rem', { lineHeight: '1.4' }],
        // Labels
        'label': ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '500' }],
      },
      // ============================================
      // SPACING - Generous whitespace
      // ============================================
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '22': '5.5rem',
      },
      // ============================================
      // BORDER RADIUS - Soft, friendly
      // ============================================
      borderRadius: {
        'sm': '0.375rem',
        'DEFAULT': '0.5rem',
        'md': '0.625rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
      },
      // ============================================
      // SHADOWS - Subtle elevation
      // ============================================
      boxShadow: {
        'xs': '0 1px 2px rgba(45, 42, 38, 0.04)',
        'sm': '0 1px 3px rgba(45, 42, 38, 0.06), 0 1px 2px rgba(45, 42, 38, 0.04)',
        'DEFAULT': '0 2px 8px rgba(45, 42, 38, 0.06), 0 1px 3px rgba(45, 42, 38, 0.04)',
        'md': '0 4px 12px rgba(45, 42, 38, 0.07), 0 2px 4px rgba(45, 42, 38, 0.04)',
        'lg': '0 8px 24px rgba(45, 42, 38, 0.08), 0 4px 8px rgba(45, 42, 38, 0.04)',
        'card': '0 1px 3px rgba(45, 42, 38, 0.04), 0 4px 12px rgba(45, 42, 38, 0.03)',
        'card-hover': '0 2px 6px rgba(45, 42, 38, 0.06), 0 8px 24px rgba(45, 42, 38, 0.06)',
        'inner': 'inset 0 1px 2px rgba(45, 42, 38, 0.06)',
      },
      // ============================================
      // TRANSITIONS - Premium, intentional motion
      // ============================================
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
      },
      // ============================================
      // ANIMATIONS - Subtle, intentional
      // ============================================
      animation: {
        'fade-in': 'fadeIn 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulseSubtle 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      // ============================================
      // MAX-WIDTH - Content containment
      // ============================================
      maxWidth: {
        'prose': '65ch',
        'content': '72rem',
      },
    },
  },
  plugins: [],
};

export default config;
