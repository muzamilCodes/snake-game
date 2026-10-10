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

  const handleStartGame = () => {
    soundManager.playClick();
    navigation.navigate('Snake', {
      difficulty: settings.difficulty,
      theme: settings.theme,
      solidBorders: settings.solidBorders,
      soundEnabled: settings.soundEnabled,
    });
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
        </View>

        {/* Hero Title Area */}
        <View style={styles.heroSection}>
          <View style={styles.badgeBanner}>
            <Text style={[styles.badgeText, { color: currentTheme.accentSecondary }]}>★ ARCADE EDITION ★</Text>
          </View>
          <Text style={[styles.mainTitle, { color: currentTheme.accent }]}>NEON SNAKE</Text>
          <Text style={[styles.subtitle, { color: currentTheme.textSecondary }]}>
            Cyberpunk Snake Simulator
          </Text>

          {/* High Score Banner */}
          <View style={[styles.highScoreCard, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.accent }]}>
            <Text style={[styles.highScoreLabel, { color: currentTheme.textSecondary }]}>PERSONAL RECORD</Text>
            <View style={styles.highScoreRow}>
              <Text style={styles.trophyIcon}>🏆</Text>
              <Text style={[styles.highScoreValue, { color: currentTheme.accent }]}>{profile.bestScore}</Text>
              <Text style={[styles.ptsLabel, { color: currentTheme.textSecondary }]}>PTS</Text>
            </View>
          </View>
        </View>

        {/* Difficulty Selector */}
        <View style={[styles.sectionCard, { backgroundColor: currentTheme.cardBg }]}>
          <Text style={[styles.sectionHeader, { color: currentTheme.accent }]}>DIFFICULTY LEVEL</Text>
          <View style={styles.choiceGrid}>
            {[
              { id: 'Casual', icon: '🐢', label: 'Casual', sub: 'Chill & Relaxed' },
              { id: 'Normal', icon: '🐍', label: 'Normal', sub: 'Classic Speed' },
              { id: 'Hardcore', icon: '⚡', label: 'Hardcore', sub: 'High Velocity' },
              { id: 'Insane', icon: '💀', label: 'Insane', sub: 'Extreme Reflex' },
            ].map((d) => {
              const active = settings.difficulty === d.id;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.difficultyOption,
                    active && {
                      borderColor: currentTheme.accent,
                      backgroundColor: 'rgba(0, 240, 255, 0.12)',
                    },
                    !active && { borderColor: 'rgba(255,255,255,0.08)' },
                  ]}
                  onPress={() => {
                    soundManager.playClick();
                    updateSettings({ difficulty: d.id as any });
                  }}
                >
                  <Text style={styles.diffIcon}>{d.icon}</Text>
                  <Text style={[styles.diffLabel, { color: active ? currentTheme.accent : currentTheme.textPrimary }]}>
                    {d.label}
                  </Text>
                  <Text style={[styles.diffSub, { color: currentTheme.textSecondary }]}>{d.sub}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Border Mode & Theme Options */}
        <View style={[styles.sectionCard, { backgroundColor: currentTheme.cardBg }]}>
          <Text style={[styles.sectionHeader, { color: currentTheme.accent }]}>GAME MODES & STYLE</Text>

          {/* Wall Collision Toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={[styles.toggleTitle, { color: currentTheme.textPrimary }]}>
                {settings.solidBorders ? '🧱 Solid Borders (Deadly)' : '🔄 Wall Wrap (Pass-Through)'}
              </Text>
              <Text style={[styles.toggleSub, { color: currentTheme.textSecondary }]}>
                {settings.solidBorders ? 'Hitting walls will cause game over' : 'Wrap to the opposite wall smoothly'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.toggleSwitch,
                settings.solidBorders && { backgroundColor: currentTheme.accentSecondary },
                !settings.solidBorders && { backgroundColor: 'rgba(255,255,255,0.1)' },
              ]}
              onPress={() => {
                soundManager.playClick();
                updateSettings({ solidBorders: !settings.solidBorders });
              }}
            >
              <Text style={styles.toggleSwitchText}>{settings.solidBorders ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>

          {/* Theme Selector */}
          <Text style={[styles.subSectionTitle, { color: currentTheme.textSecondary }]}>COLOR THEME</Text>
          <View style={styles.themeRow}>
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
                    styles.themeBtn,
                    active && { borderColor: thm.color, backgroundColor: 'rgba(255,255,255,0.08)' },
                    !active && { borderColor: 'rgba(255,255,255,0.08)' },
                  ]}
                  onPress={() => {
                    soundManager.playClick();
                    updateSettings({ theme: thm.id as any });
                  }}
                >
                  <Text style={styles.themeEmoji}>{thm.emoji}</Text>
                  <Text style={[styles.themeLabel, { color: active ? thm.color : currentTheme.textSecondary }]}>
                    {thm.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Big Action Launch Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: currentTheme.accent }]}
            onPress={handleStartGame}
            activeOpacity={0.85}
          >
            <Text style={styles.playBtnIcon}>▶</Text>
            <Text style={styles.playBtnText}>START GAME</Text>
          </TouchableOpacity>

          <View style={styles.secondaryButtonsRow}>
            <TouchableOpacity
              style={[
                styles.secBtn,
                { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.accent },
              ]}
              onPress={() => {
                soundManager.playClick();
                navigation.navigate('Leaderboard', { theme: settings.theme });
              }}
            >
              <Text style={styles.secBtnIcon}>🏆</Text>
              <Text style={[styles.secBtnText, { color: currentTheme.accent }]}>LEADERBOARD</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secBtn,
                { backgroundColor: currentTheme.cardBg, borderColor: 'rgba(255,255,255,0.2)' },
              ]}
              onPress={() => {
                soundManager.playClick();
                setShowHowToPlay(true);
              }}
            >
              <Text style={styles.secBtnIcon}>📖</Text>
              <Text style={[styles.secBtnText, { color: currentTheme.textPrimary }]}>CONTROLS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Hint */}
        <View style={styles.footerNote}>
          <Text style={[styles.footerText, { color: currentTheme.textSecondary }]}>
            ⌨️ Keyboard: Arrow Keys or W-A-S-D to steer • Spacebar to pause
          </Text>
        </View>
      </ScrollView>

      {/* How To Play Modal */}
      <Modal visible={showHowToPlay} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.accent }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.accent }]}>HOW TO PLAY</Text>
            
            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🍎</Text>
              <Text style={[styles.ruleText, { color: currentTheme.textPrimary }]}>
                Eat red apples to grow longer and gain 10 points.
              </Text>
            </View>

            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>⭐</Text>
              <Text style={[styles.ruleText, { color: currentTheme.textPrimary }]}>
                Golden stars give 30 bonus points!
              </Text>
            </View>

            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>❄️</Text>
              <Text style={[styles.ruleText, { color: currentTheme.textPrimary }]}>
                Frost berries slow down time for easier maneuvering.
              </Text>
            </View>

            <View style={styles.ruleItem}>
              <Text style={styles.ruleIcon}>🎮</Text>
              <Text style={[styles.ruleText, { color: currentTheme.textPrimary }]}>
                Use Arrow Keys, W/A/S/D, or on-screen D-Pad.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: currentTheme.accent }]}
              onPress={() => {
                soundManager.playClick();
                setShowHowToPlay(false);
              }}
            >
              <Text style={styles.modalCloseText}>GOT IT!</Text>
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
    paddingBottom: 30,
    maxWidth: 550,
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
    marginBottom: 20,
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
    fontSize: 13,
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  highScoreCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    marginTop: 14,
  },
  highScoreLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  highScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  trophyIcon: {
    fontSize: 22,
  },
  highScoreValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
  },
  ptsLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  difficultyOption: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  diffIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  diffLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  diffSub: {
    fontSize: 10,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 12,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  toggleSwitch: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleSwitchText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 10,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  themeEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  themeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionSection: {
    marginTop: 6,
    gap: 12,
  },
  playBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    elevation: 8,
    shadowColor: '#00f0ff',
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  playBtnIcon: {
    fontSize: 22,
    color: '#000',
    fontWeight: '900',
  },
  playBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 2,
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  secBtnIcon: {
    fontSize: 16,
  },
  secBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  footerNote: {
    marginTop: 18,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
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
    fontSize: 22,
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
