import { StyleSheet } from 'react-native';
import {colors} from '@controleonline/../../src/styles/colors';
import {withOpacity} from '@controleonline/../../src/styles/branding';

const createStyles = (palette = colors) =>
  StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    paddingRight: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: withOpacity(palette.white, 0.76),
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: withOpacity(palette.white, 0.88),
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 24,
    height: 24,
  },
});

export default createStyles;
