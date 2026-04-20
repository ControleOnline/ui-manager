import { Platform } from 'react-native';

// Sombra base reutilizada em cards das telas de integração.
export const integrationCardShadowStyle = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  android: { elevation: 3 },
  web: { boxShadow: '0 10px 24px rgba(15,23,42,0.08)' },
});

// Contagem defensiva para listas usadas em resumos e pré-visualizações.
export const countCollection = collection => (Array.isArray(collection) ? collection.length : 0);
