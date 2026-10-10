import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { getLeaderboard, getPlayerProfile, LeaderboardEntry, PlayerProfile } from '../utils/storage';
import { THEMES } from '../utils/themes';
import { soundManager } from '../utils/sound';

export default function LeaderboardScreen({ navigation, route }: any) {
  const currentTheme = route?.params?.theme || 'neon';
  const theme = THEMES[currentTheme as keyof typeof THEMES] || THEMES.neon;

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [filter, setFilter] = useState<string>('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const list = await getLeaderboard();
    const prof = await getPlayerProfile();
    setLeaderboard(list);
    setProfile(prof);
  };

  const filteredList = filter === 'All'
    ? leaderboard
    : leaderboard.filter((item) => item.difficulty === filter);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return `#${index + 1}`;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.accent }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            soundManager.playClick();
            navigation.goBack();
          }}
        >
          <Text style={[styles.backButtonText, { color: theme.accent }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.accent }]}>HALL OF FAME</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Career Stats Highlight */}
        {profile && (
          <View style={[styles.statsCard, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}>
            <View style={styles.profileRow}>
              <Text style={styles.avatarLarge}>{profile.avatar}</Text>
              <View>
                <Text style={[styles.profileName, { color: theme.textPrimary }]}>{profile.name}</Text>
                <Text style={[styles.profileSubtitle, { color: theme.textSecondary }]}>Your Career Stats</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.accent }]}>{profile.bestScore}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Best Score</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.accentSecondary }]}>{profile.totalGames}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Games</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#00ffcc' }]}>{profile.totalFood}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Apples Eaten</Text>
              </View>
            </View>
          </View>
        )}

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {['All', 'Casual', 'Normal', 'Hardcore', 'Insane'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterPill,
                filter === tab && { backgroundColor: theme.accent },
                filter !== tab && { backgroundColor: theme.cardBg, borderColor: 'rgba(255,255,255,0.1)' },
              ]}
              onPress={() => {
                soundManager.playClick();
                setFilter(tab);
              }}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: filter === tab ? '#000' : theme.textSecondary },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Leaderboard Table / Cards */}
        <View style={styles.listContainer}>
          {filteredList.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: theme.cardBg }]}>
              <Text style={styles.emptyIcon}>🎮</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No scores recorded yet for {filter} mode.
              </Text>
            </View>
          ) : (
            filteredList.map((entry, index) => {
              const isTop3 = index < 3;
              return (
                <View
                  key={entry.id || index}
                  style={[
                    styles.rankRow,
                    {
                      backgroundColor: theme.cardBg,
                      borderColor: isTop3 ? theme.accent : 'rgba(255,255,255,0.06)',
                    },
                  ]}
                >
                  <View style={styles.rankBadgeBox}>
                    <Text style={[styles.rankBadgeText, isTop3 && { fontSize: 22 }]}>
                      {getRankBadge(index)}
                    </Text>
                  </View>

                  <Text style={styles.rowAvatar}>{entry.avatar || '🐍'}</Text>

                  <View style={styles.playerInfo}>
                    <Text style={[styles.playerName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {entry.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={[styles.playerMeta, { color: theme.textSecondary }]}>
                        {entry.difficulty} • Lvl {entry.level}
                      </Text>
                      <Text style={[styles.playerDate, { color: theme.textSecondary }]}>
                        {entry.date}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scoreBox}>
                    <Text style={[styles.scoreValue, { color: theme.accent }]}>{entry.score}</Text>
                    <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>PTS</Text>
                  </View>
                </View>
              );
            })
          )}
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
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  statsCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLarge: {
    fontSize: 40,
    marginRight: 14,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContainer: {
    gap: 10,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  rankBadgeBox: {
    width: 38,
    alignItems: 'center',
  },
  rankBadgeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8a99c7',
  },
  rowAvatar: {
    fontSize: 26,
    marginRight: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  playerMeta: {
    fontSize: 12,
  },
  playerDate: {
    fontSize: 11,
    opacity: 0.8,
  },
  scoreBox: {
    alignItems: 'flex-end',
    minWidth: 50,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyBox: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
