import AsyncStorage from '@react-native-async-storage/async-storage';

// Rastreo de comportamiento del usuario (personalización predictiva):
// guarda localmente los últimos artistas vistos para adaptar el Home.
const KEY = 'musicya.viewed';
const MAX = 10;

export type ViewedArtist = {
  id: number;
  name: string;
  genre: string | null;
  is_verified?: boolean;
};

export async function recordView(a: ViewedArtist): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const prev: ViewedArtist[] = raw ? JSON.parse(raw) : [];
    const next = [a, ...prev.filter((x) => x.id !== a.id)].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // si falla el almacenamiento, simplemente no se registra
  }
}

export async function getViewed(): Promise<ViewedArtist[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ViewedArtist[]) : [];
  } catch {
    return [];
  }
}
