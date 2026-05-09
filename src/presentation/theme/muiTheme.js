import { createTheme } from '@mui/material/styles';
import t from './theme.config.js';

const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: t.fonts.primary,
    h1: { fontFamily: t.fonts.primary, fontWeight: 700 },
    h2: { fontFamily: t.fonts.primary, fontWeight: 700 },
    h3: { fontFamily: t.fonts.primary, fontWeight: 600 },
    h4: { fontFamily: t.fonts.primary, fontWeight: 600 },
    h5: { fontFamily: t.fonts.primary, fontWeight: 600 },
    h6: { fontFamily: t.fonts.primary, fontWeight: 600 },
  },
  palette: {
    primary: {
      main:  t.colors.primary,
      light: t.colors.primaryLight,
      dark:  t.colors.primaryDark,
    },
    secondary: {
      main:  t.colors.secondary,
      light: t.colors.secondaryLight,
      dark:  t.colors.secondaryDark,
    },
    accent: {
      main:  t.colors.accent,
      light: t.colors.accentLight,
      dark:  t.colors.accentDark,
    },
    background: {
      default: t.colors.backgroundPage,
      paper:   t.colors.backgroundCard,
    },
    text: {
      primary:   t.colors.textPrimary,
      secondary: t.colors.textSecondary,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius:  t.borderRadius.button,
          textTransform: 'none',
          fontWeight:    600,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: t.borderRadius.card,
          boxShadow:    '0 4px 20px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        'body, html': { height: '100%', scrollBehavior: 'smooth' },
        body: {
          '&::-webkit-scrollbar':       { width: '8px' },
          '&::-webkit-scrollbar-track': { background: t.colors.scrollbarTrack },
          '&::-webkit-scrollbar-thumb': {
            background:   t.colors.scrollbarThumb,
            borderRadius: '10px',
            '&:hover':    { background: t.colors.primaryLight },
          },
        },
        '*': { margin: 0, padding: 0, boxSizing: 'border-box' },
      },
    },
  },
});

export default theme;
