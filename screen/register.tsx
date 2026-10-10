import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { getPlayerProfile, savePlayerProfile, PlayerProfile } from '../utils/storage';
import { THEMES } from '../utils/themes';
import { soundManager } from '../utils/sound';

const AVATAR_OPTIONS = ['🐍', '🐉', '⚡', '👾', '🤖', '👑', '🔥', '💎'];

export default function RegisterScreen({ navigation, route }: any) {
  const currentTheme = route?.params?.theme || 'neon';
  const theme = THEMES[currentTheme as keyof typeof THEMES] || THEMES.neon;

  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🐍');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const prof = await getPlayerProfile();
    setProfile(prof);
    setName(prof.name);
    setSelectedAvatar(prof.avatar);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a player handle to register.');
      return;
    }

    soundManager.playPowerup();
    const updated: PlayerProfile = {
      ...(profile || { totalGames: 0, bestScore: 0, totalFood: 0 }),
      name: name.trim(),
      avatar: selectedAvatar,
    };

    await savePlayerProfile(updated);
    setProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.accent }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            soundManager.playClick();
            navigation.goBack();
          }}
        >
          <Text style={[styles.backBtnText, { color: theme.accent }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.accent }]}>PLAYER PROFILE</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>CHOOSE YOUR AVATAR</Text>
          <View style={styles.avatarRow}>
            {AVATAR_OPTIONS.map((avatar) => {
              const isSelected = selectedAvatar === avatar;
              return (
                <TouchableOpacity
                  key={avatar}
                  style={[
                    styles.avatarBtn,
                    isSelected && {
                      borderColor: theme.accent,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      transform: [{ scale: 1.15 }],
                    },
                  ]}
                  onPress={() => {
                    soundManager.playClick();
                    setSelectedAvatar(avatar);
                  }}
                >
                  <Text style={styles.avatarEmoji}>{avatar}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Player Name Input */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>PLAYER CALLSIGN / NAME</Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.textPrimary,
                borderColor: theme.accent,
                backgroundColor: 'rgba(0,0,0,0.4)',
              },
            ]}
            placeholder="Enter player handle..."
            placeholderTextColor="#667799"
            value={name}
            onChangeText={setName}
            maxLength={18}
          />

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: theme.accent }]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>
              {savedSuccess ? '✅ SAVED SUCCESSFULLY' : '💾 SAVE PROFILE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Career Stats */}
        {profile && (
          <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: 'rgba(255,255,255,0.1)' }]}>
            <Text style={[styles.sectionTitle, { color: theme.accentSecondary }]}>CAREER STATS</Text>

            <View style={styles.statList}>
              <View style={styles.statRow}>
                <Text style={[styles.statRowLabel, { color: theme.textSecondary }]}>High Score</Text>
                <Text style={[styles.statRowValue, { color: theme.accent }]}>{profile.bestScore} pts</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[styles.statRowLabel, { color: theme.textSecondary }]}>Games Played</Text>
                <Text style={[styles.statRowValue, { color: theme.textPrimary }]}>{profile.totalGames}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[styles.statRowLabel, { color: theme.textSecondary }]}>Total Apples Devoured</Text>
                <Text style={[styles.statRowValue, { color: '#00ffcc' }]}>{profile.totalFood}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Badges / Achievements */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>ACHIEVEMENTS</Text>
          <View style={styles.badgeList}>
            <View style={styles.badgeItem}>
              <Text style={styles.badgeIcon}>🐣</Text>
              <View>
                <Text style={[styles.badgeName, { color: theme.textPrimary }]}>First Serpent</Text>
                <Text style={[styles.badgeDesc, { color: theme.textSecondary }]}>
                  {profile && profile.totalGames > 0 ? 'Unlocked: Played 1st game' : 'Play 1 game to unlock'}
                </Text>
              </View>
            </View>

            <View style={styles.badgeItem}>
              <Text style={styles.badgeIcon}>💯</Text>
              <View>
                <Text style={[styles.badgeName, { color: theme.textPrimary }]}>Century Club</Text>
                <Text style={[styles.badgeDesc, { color: theme.textSecondary }]}>
                  {profile && profile.bestScore >= 100 ? 'Unlocked: Score 100+ points' : 'Reach score of 100'}
                </Text>
              </View>
            </View>

            <View style={styles.badgeItem}>
              <Text style={styles.badgeIcon}>👑</Text>
              <View>
                <Text style={[styles.badgeName, { color: theme.textPrimary }]}>Snake Master</Text>
                <Text style={[styles.badgeDesc, { color: theme.textSecondary }]}>
                  {profile && profile.bestScore >= 250 ? 'Unlocked: Score 250+ points' : 'Reach score of 250'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 550,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 14,
    fontFamily: 'monospace',
  },
  avatarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 18,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statList: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  statRowLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statRowValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  badgeList: {
    gap: 14,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badgeIcon: {
    fontSize: 30,
  },
  badgeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  badgeDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
