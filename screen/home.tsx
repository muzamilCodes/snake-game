import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Modal,
} from 'react-native';
import {
  getPlayerProfile,
  getGameSettings,
  saveGameSettings,
  PlayerProfile,
  GameSettings,
} from '../utils/storage';
import { THEMES, ThemeColors } from '../utils/themes';
import { soundManager } from '../utils/sound';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Home({ navigation }: any) {
  const [profile, setProfile] = useState<PlayerProfile>({
    name: 'CyberSnake',
    avatar: '🐍',
    totalGames: 0,
    bestScore: 0,
    totalFood: 0,
  });

  const [settings, setSettings] = useState<GameSettings>({
    difficulty: 'Normal',
    theme: 'neon',
    soundEnabled: true,
    solidBorders: false,
  });

  const [gameScores, setGameScores] = useState({
    snake: 0,
    pong: 0,
    breakout: 0,
    shooter: 0,
    glider: 0,
  });

  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    loadData();
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    const prof = await getPlayerProfile();
    const set = await getGameSettings();
    setProfile(prof);
    setSettings(set);
    soundManager.enabled = set.soundEnabled;

    try {
      const pongHs = await AsyncStorage.getItem('PONG_HIGH_RALLY');
      const breakHs = await AsyncStorage.getItem('BREAKOUT_HIGH_SCORE');
      const shootHs = await AsyncStorage.getItem('SHOOTER_HIGH_SCORE');
      const glideHs = await AsyncStorage.getItem('GLIDER_HIGH_SCORE');

      setGameScores({
        snake: prof.bestScore || 0,
        pong: pongHs ? parseInt(pongHs) : 0,
        breakout: breakHs ? parseInt(breakHs) : 0,
        shooter: shootHs ? parseInt(shootHs) : 0,
        glider: glideHs ? parseInt(glideHs) : 0,
      });
    } catch (_) {}
  };

  const updateSettings = async (partial: Partial<GameSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    if (partial.soundEnabled !== undefined) {
      soundManager.enabled = partial.soundEnabled;
    }
    await saveGameSettings(updated);
  };

  const currentTheme: ThemeColors = THEMES[settings.theme] || THEMES.neon;

  const GAMES = [
    {
      id: 'Snake',
      route: 'Snake',
      name: 'NEON SNAKE 2077',
      tag: 'CLASSIC REINVENTED',
      emoji: '🐍',
      badge: 'POPULAR',
      color: '#00f0ff',
      desc: 'Wall-wrap or solid borders with golden apples, slow-mo frost berries & combo multiplier.',
      highScoreText: `Best: ${gameScores.snake} pts`,
      params: {
        difficulty: settings.difficulty,
        theme: settings.theme,
        solidBorders: settings.solidBorders,
        soundEnabled: settings.soundEnabled,
      },
    },
    {
      id: 'Pong',
      route: 'Pong',
      name: 'CYBER PONG 2077',
      tag: 'PADDLE AI DUEL',
      emoji: '🏓',
      badge: 'ACTION',
      color: '#ff007f',
      desc: 'High-speed neon air hockey vs adaptive AI Droid. Endless rallies & match duels.',
      highScoreText: `Max Rally: ${gameScores.pong} hits`,
      params: { theme: settings.theme },
    },
    {
      id: 'Breakout',
      route: 'Breakout',
      name: 'NEON BREAKOUT',
      tag: 'BRICK CRUSHER',
      emoji: '🧱',
      badge: 'ARCADE',
      color: '#ffd700',
      desc: 'Multi-tier glowing neon bricks, explosive bomb bricks, multi-balls & wide paddle powerups.',
      highScoreText: `Best: ${gameScores.breakout} pts`,
      params: { theme: settings.theme },
    },
    {
      id: 'Shooter',
      route: 'Shooter',
      name: 'GALAXY DEFENDER',
      tag: 'SYNTHWAVE SHOOTER',
      emoji: '🚀',
      badge: 'RETRO',
      color: '#00ff66',
      desc: 'Pilot starfighter, dodge alien plasma bombs, collect triple lasers & defeat dreadnoughts.',
      highScoreText: `Best: ${gameScores.shooter} pts`,
      params: { theme: settings.theme },
    },
    {
      id: 'Flappy',
      route: 'Flappy',
      name: 'CYBER GLIDER',
      tag: 'PRECISION PHYSICS',
      emoji: '🛸',
      badge: 'HARDCORE',
      color: '#a020f0',
      desc: 'Thrust jet glider through pulsating laser gates & collect energy spark orbs.',
      highScoreText: `Best: ${gameScores.glider} pts`,
      params: { theme: settings.theme },
    },
  ];

  const handleLaunchGame = (game: (typeof GAMES)[0]) => {
    soundManager.playClick();
    navigation.navigate(game.route, game.params);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.bg }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Bar: Profile & Sound */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={[styles.profilePill, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.accent }]}
            onPress={() => {
              soundManager.playClick();
              navigation.navigate('Register', { theme: settings.theme });
            }}
          >
            <Text style={styles.profileAvatar}>{profile.avatar}</Text>
            <Text style={[styles.profileName, { color: currentTheme.textPrimary }]}>{profile.name}</Text>
            <Text style={[styles.profileEditIcon, { color: currentTheme.accent }]}>✎</Text>
          </TouchableOpacity>

          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                { backgroundColor: currentTheme.cardBg, borderColor: 'rgba(255,255,255,0.1)' },
              ]}
              onPress={() => {
                updateSettings({ soundEnabled: !settings.soundEnabled });
                if (!settings.soundEnabled) {
                  soundManager.enabled = true;
                  soundManager.playClick();
                }
              }}
            >
              <Text style={styles.iconBtnText}>{settings.soundEnabled ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconBtn,
                { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.accent },
              ]}
              onPress={() => {
                soundManager.playClick();
                navigation.navigate('Leaderboard', { theme: settings.theme });
              }}
            >
              <Text style={styles.iconBtnText}>🏆</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Header Banner */}
        <View style={styles.heroSection}>
          <View style={styles.badgeBanner}>
            <Text style={[styles.badgeText, { color: currentTheme.accentSecondary }]}>
              ★ 5-IN-1 RETRO CYBER ARCADE ★
            </Text>
          </View>
          <Text style={[styles.mainTitle, { color: currentTheme.accent }]}>CYBER ARCADE</Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
            5 Neon Arcade Classics • Zero Latency Audio
          </Text>
        </View>

        {/* Theme Selector Strip */}
        <View style={[styles.themeStrip, { backgroundColor: currentTheme.cardBg }]}>
          <Text style={[styles.themeStripTitle, { color: currentTheme.textSecondary }]}>THEME</Text>
          <View style={styles.themeStripRow}>
            {[
              { id: 'neon', name: 'Cyber Neon', color: '#00f0ff', emoji: '🔮' },
              { id: 'matrix', name: 'Matrix Core', color: '#00ff66', emoji: '🕹️' },
              { id: 'sunset', name: 'Synth Sunset', color: '#ff2a85', emoji: '🌆' },
            ].map((thm) => {
              const active = settings.theme === thm.id;
              return (
                <TouchableOpacity
                  key={thm.id}
                  style={[
                    styles.themeChip,
                    active && { borderColor: thm.color, backgroundColor: 'rgba(255,255,255,0.1)' },
                    !active && { borderColor: 'rgba(255,255,255,0.06)' },
                  ]}
                  onPress={() => {
                    soundManager.playClick();
                    updateSettings({ theme: thm.id as any });
                  }}
                >
                  <Text style={styles.themeChipEmoji}>{thm.emoji}</Text>
                  <Text style={[styles.themeChipText, { color: active ? thm.color : currentTheme.textSecondary }]}>
                    {thm.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 5 Game Cards Showcase */}
        <View style={styles.gamesList}>
          {GAMES.map((game) => (
            <TouchableOpacity
              key={game.id}
              style={[
                styles.gameCard,
                {
                  backgroundColor: currentTheme.cardBg,
                  borderColor: game.color,
                },
              ]}
              onPress={() => handleLaunchGame(game)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardEmojiBox}>
                  <Text style={styles.cardEmoji}>{game.emoji}</Text>
                </View>

                <View style={styles.cardHeaderInfo}>
                  <View style={styles.cardTagRow}>
                    <Text style={[styles.cardTag, { color: game.color }]}>{game.tag}</Text>
                    <View style={[styles.cardBadge, { backgroundColor: game.color }]}>
                      <Text style={styles.cardBadgeText}>{game.badge}</Text>
                    </View>
                  </View>
                  <Text style={[styles.cardTitle, { color: currentTheme.textPrimary }]}>{game.name}</Text>
                </View>
              </View>

              <Text style={[styles.cardDesc, { color: currentTheme.textSecondary }]}>{game.desc}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.scoreBadgeBox}>
                  <Text style={[styles.scoreBadgeText, { color: game.color }]}>{game.highScoreText}</Text>
                </View>

                <View style={[styles.playPill, { backgroundColor: game.color }]}>
                  <Text style={styles.playPillText}>PLAY NOW ▶</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Global Controls Guide Button */}
        <TouchableOpacity
          style={[styles.controlsBtn, { backgroundColor: currentTheme.cardBg, borderColor: 'rgba(255,255,255,0.15)' }]}
          onPress={() => {
            soundManager.playClick();
            setShowHowToPlay(true);
          }}
        >
          <Text style={[styles.controlsBtnText, { color: currentTheme.accent }]}>
            📖 HOW TO PLAY & CONTROLS GUIDE
          </Text>
        </TouchableOpacity>

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Text style={[styles.footerText, { color: currentTheme.textSecondary }]}>
            🎮 Supports Arrow Keys, WASD, Spacebar, Mouse & Touch Screens
          </Text>
        </View>
      </ScrollView>

      {/* How To Play Modal */}
      <Modal visible={showHowToPlay} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.accent }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.accent }]}>ARCADE CONTROLS GUIDE</Text>

            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🐍</Text>
              <Text style={[styles.ruleText, { color: currentTheme.textPrimary }]}>
                <Text style={{ fontWeight: 'bold', color: '#00f0ff' }}>Neon Snake</Text>: Arrow Keys / WASD to steer, Space to pause.
              </Text>
            </View>

            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🏓</Text>
              <Text style={[styles.ruleText, { color: currentTheme.textPrimary }]}>
                <Text style={{ fontWeight: 'bold', color: '#ff007f' }}>Cyber Pong</Text>: Left / Right Arrow or A / D to move paddle.
              </Text>
            </View>

            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🧱</Text>
              <Text style={[styles.ruleText, { color: currentTheme.textPrimary }]}>
                <Text style={{ fontWeight: 'bold', color: '#ffd700' }}>Neon Breakout</Text>: Steer paddle to shatter bricks and catch falling powerups.
              </Text>
            </View>

            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🚀</Text>
              <Text style={[styles.ruleText, { color: currentTheme.textPrimary }]}>
                <Text style={{ fontWeight: 'bold', color: '#00ff66' }}>Galaxy Defender</Text>: Move starfighter to dodge bombs & shoot down aliens.
              </Text>
            </View>

            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🛸</Text>
              <Text style={[styles.ruleText, { color: currentTheme.textPrimary }]}>
                <Text style={{ fontWeight: 'bold', color: '#a020f0' }}>Cyber Glider</Text>: Tap or Spacebar to thrust through laser gates.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: currentTheme.accent }]}
              onPress={() => {
                soundManager.playClick();
                setShowHowToPlay(false);
              }}
            >
              <Text style={styles.modalCloseText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  profileAvatar: {
    fontSize: 20,
    marginRight: 8,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  profileEditIcon: {
    fontSize: 14,
  },
  topRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 18,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeBanner: {
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  mainTitle: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  themeStrip: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  themeStripTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  themeStripRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  themeChipEmoji: {
    fontSize: 14,
  },
  themeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  gamesList: {
    gap: 16,
  },
  gameCard: {
    borderRadius: 18,
    borderWidth: 1.8,
    padding: 18,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  cardEmojiBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 30,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cardTag: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  cardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000',
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  scoreBadgeBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  playPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  playPillText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  controlsBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  controlsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  footerNote: {
    marginTop: 14,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 18,
    borderWidth: 2,
    padding: 22,
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ruleIcon: {
    fontSize: 24,
  },
  ruleText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  modalCloseBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
});
