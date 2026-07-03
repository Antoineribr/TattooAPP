export const T = {
  // Fonds
  bg:        '#F5F3EE',   // fond principal crème
  bgCard:    '#FFFFFF',   // cartes
  bgSubtle:  '#EDE9E1',   // sections légèrement teintées
  bgDark:    '#1A1A1A',   // texte principal / boutons sombres

  // Bordures
  border:    'rgba(0,0,0,0.08)',
  borderMd:  'rgba(0,0,0,0.12)',
  borderStr: 'rgba(0,0,0,0.18)',

  // Textes
  text:      '#1A1A1A',   // texte primaire
  textSub:   '#6B6B7A',   // texte secondaire
  textMuted: '#9A9AA5',   // texte tertiaire

  // Accents
  gold:      '#B8903E',   // or (légèrement assombri sur blanc)
  goldLight: 'rgba(184,144,62,0.12)',
  goldBorder:'rgba(184,144,62,0.25)',

  // Statuts
  red:       '#D93535',
  redLight:  'rgba(217,53,53,0.1)',
  green:     '#2E8B57',
  greenLight:'rgba(46,139,87,0.1)',
  blue:      '#2563EB',
  blueLight: 'rgba(37,99,235,0.1)',

  // Feed (fond sombre conservé pour immersion photo)
  feedBg:    '#0A0A0B',
  feedText:  '#F4F1EA',
  feedMuted: 'rgba(244,241,234,0.5)',
} as const;
