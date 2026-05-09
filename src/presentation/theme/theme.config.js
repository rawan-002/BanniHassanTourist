const theme = {

  colors: {

    primary:   '#4D3873',
    primaryLight: '#6B4D9E',
    primaryDark:  '#2F3D76',

    secondary:      '#2F8872',
    secondaryLight: '#47A88E',
    secondaryDark:  '#1A6B5A',

    accent:      '#DA943B',
    accentLight: '#E5B06B',
    accentDark:  '#B87A2F',

    backgroundPage:  '#E3E3E4',
    backgroundCard:  '#FFFFFF',

    textPrimary:   '#1A1A1A',
    textSecondary: '#4D3873',

    navbarGradient: 'linear-gradient(90deg, #3e2e75 0%, #e6a14c 50%, #1d5075 100%)',

    heroButtonBg:        'rgba(159, 165, 212, 0.3)',
    heroButtonBorder:    'rgba(159, 165, 212, 0.6)',
    heroButtonHover:     '#868fdb',
    heroButtonHoverDark: '#737cb9',

    heroOverlay: `linear-gradient(to top,
      rgba(0,0,0,1)    0%,
      rgba(0,0,0,0.80) 30%,
      rgba(0,0,0,0.50) 60%,
      rgba(0,0,0,0)    100%
    )`,

    footerBg: `linear-gradient(180deg,
      rgb(28, 27, 57)  0%,
      rgb(37, 37, 89)  50%,
      rgb(43, 43, 98)  100%
    )`,
    footerAccent: 'rgba(159, 165, 212, 0.05)',

    scrollbarThumb: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    scrollbarTrack: 'rgba(0,0,0,0.1)',
  },

  fonts: {
    primary: "'RH-Zak Reg', Arial, sans-serif",
    thin:    "'RH-Zak Thin', Arial, sans-serif",
    bold:    "'RH-Zak Bold', Arial, sans-serif",
    slab:    "'29LTZaridSlab-Regular', Arial, sans-serif",
  },

  borderRadius: {
    button: 8,
    card:   12,
  },
};

export default theme;
