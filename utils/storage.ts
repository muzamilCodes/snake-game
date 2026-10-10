import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  level: number;
  difficulty: 'Casual' | 'Normal' | 'Hardcore' | 'Insane';
  date: string;
  avatar: string;
}

export interface PlayerProfile {
  name: string;
  avatar: string;
  totalGames: number;
  bestScore: number;
  totalFood: number;
}

export interface GameSettings {
  difficulty: 'Casual' | 'Normal' | 'Hardcore' | 'Insane';
  theme: 'neon' | 'matrix' | 'sunset';
  soundEnabled: boolean;
  solidBorders: boolean;
}

const DEFAULT_PROFILE: PlayerProfile = {
  name: 'CyberSnake',
  avatar: '🐍',
  totalGames: 0,
  bestScore: 0,
  totalFood: 0,
};

const DEFAULT_SETTINGS: GameSettings = {
  difficulty: 'Normal',
  theme: 'neon',
  soundEnabled: true,
  solidBorders: false,
};

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', name: 'ViperKing', score: 320, level: 8, difficulty: 'Normal', date: 'Oct 10', avatar: '🐉' },
  { id: '2', name: 'CyberSnake', score: 240, level: 6, difficulty: 'Normal', date: 'Oct 09', avatar: '🐍' },
  { id: '3', name: 'NeonHunter', score: 180, level: 5, difficulty: 'Casual', date: 'Oct 08', avatar: '⚡' },
  { id: '4', name: 'RetroGamer', score: 140, level: 4, difficulty: 'Hardcore', date: 'Oct 07', avatar: '🕹️' },
  { id: '5', name: 'GlitchMaster', score: 90, level: 3, difficulty: 'Insane', date: 'Oct 06', avatar: '👾' },
];

export async function getPlayerProfile(): Promise<PlayerProfile> {
  try {
    const raw = await AsyncStorage.getItem('SNAKE_PROFILE');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return DEFAULT_PROFILE;
}

export async function savePlayerProfile(profile: PlayerProfile): Promise<void> {
  try {
    await AsyncStorage.setItem('SNAKE_PROFILE', JSON.stringify(profile));
  } catch (_) {}
}

export async function getGameSettings(): Promise<GameSettings> {
  try {
    const raw = await AsyncStorage.getItem('SNAKE_SETTINGS');
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (_) {}
  return DEFAULT_SETTINGS;
}

export async function saveGameSettings(settings: GameSettings): Promise<void> {
  try {
    await AsyncStorage.setItem('SNAKE_SETTINGS', JSON.stringify(settings));
  } catch (_) {}
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const raw = await AsyncStorage.getItem('SNAKE_LEADERBOARD');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return DEFAULT_LEADERBOARD;
}

export async function addLeaderboardEntry(
  name: string,
  score: number,
  level: number,
  difficulty: 'Casual' | 'Normal' | 'Hardcore' | 'Insane',
  avatar: string
): Promise<LeaderboardEntry[]> {
  try {
    const list = await getLeaderboard();
    const newEntry: LeaderboardEntry = {
      id: Date.now().toString(),
      name: name.trim() || 'Player',
      score,
      level,
      difficulty,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avatar: avatar || '🐍',
    };

    const updated = [...list, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    await AsyncStorage.setItem('SNAKE_LEADERBOARD', JSON.stringify(updated));
    return updated;
  } catch (_) {
    return DEFAULT_LEADERBOARD;
  }
}

export async function updatePlayerStats(score: number, foodEaten: number): Promise<PlayerProfile> {
  const current = await getPlayerProfile();
  const updated: PlayerProfile = {
    ...current,
    totalGames: current.totalGames + 1,
    bestScore: Math.max(current.bestScore, score),
    totalFood: current.totalFood + foodEaten,
  };
  await savePlayerProfile(updated);
  return updated;
}
