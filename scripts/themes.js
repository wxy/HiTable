// Designed palettes shared by the configuration page and table overlays.
// Automatic mode selects one of these palettes; it does not generate colours.
// Keys remain stable so tuning a shade preserves existing saved selections.
window.HiTableThemes = {
  '#746b5e': {
    // Preserve the saved Warm Graphite key when replacing it with Neutral Graphite.
    surface: '#e1e1e1', ink: '#242424',
    band: '#686868', bandInk: '#ffffff',
    highlight: '#1c1c1c', highlightInk: '#ffffff',
    // Only Automatic uses this designed variant on dark neutral pages.
    dark: {
      surface: '#303030', ink: '#f3f3f3',
      band: '#686868', bandInk: '#ffffff',
      highlight: '#e1e1e1', highlightInk: '#242424',
      muted: '#3b3b3b', mutedInk: '#b0b0b0', grid: '#ffffff40',
      menuSurface: '#252525', menuInk: '#f3f3f3',
      menuMutedInk: '#bdbdbd', menuSeparator: '#484848'
    }
  },
  '#c0392b': {
    surface: '#e56d60', ink: '#10251b',
    band: '#c0392b', bandInk: '#ffffff',
    highlight: '#561a13', highlightInk: '#ffffff'
  },
  '#d35400': {
    surface: '#ed8b43', ink: '#10251b',
    band: '#d35400', bandInk: '#000000',
    highlight: '#8c3500', highlightInk: '#ffffff'
  },
  '#f39c12': {
    surface: '#f8d88a', ink: '#10251b',
    band: '#f39c12', bandInk: '#10251b',
    highlight: '#925a09', highlightInk: '#ffffff'
  },
  '#27ae60': {
    surface: '#8ad6a4', ink: '#10251b',
    band: '#27ae60', bandInk: '#10251b',
    highlight: '#16683b', highlightInk: '#ffffff'
  },
  '#16a085': {
    surface: '#62c7b2', ink: '#10251b',
    band: '#16a085', bandInk: '#10251b',
    highlight: '#0c5b4b', highlightInk: '#ffffff'
  },
  '#2980b9': {
    surface: '#74b5dc', ink: '#10251b',
    band: '#2980b9', bandInk: '#000000',
    highlight: '#174e75', highlightInk: '#ffffff'
  },
  '#8e44ad': {
    surface: '#b586cb', ink: '#10251b',
    band: '#8e44ad', bandInk: '#ffffff',
    highlight: '#432050', highlightInk: '#ffffff'
  },
  '#c2185b': {
    surface: '#e778a5', ink: '#10251b',
    band: '#c2185b', bandInk: '#ffffff',
    highlight: '#5e0829', highlightInk: '#ffffff'
  },
  '#5d4037': {
    surface: '#b49182', ink: '#10251b',
    band: '#89614f', bandInk: '#ffffff',
    highlight: '#251812', highlightInk: '#ffffff'
  },
  '#607d8b': {
    surface: '#a1b7c2', ink: '#10251b',
    band: '#607d8b', bandInk: '#000000',
    highlight: '#344953', highlightInk: '#ffffff'
  }
};
