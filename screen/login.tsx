import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

export interface ShadowProfile {
  name: string;
  avatar: string;
  uid: string;
  clan: string;
  createdAt: number;
}

export const PROFILE_KEY = 'BGMI_SHADOW_PROFILE';

const AVATARS: { id: string; icon: string }[] = [
  { id: 'a01', icon: '👑' },
  { id: 'a02', icon: '💀' },
  { id: 'a03', icon: '🔥' },
  { id: 'a04', icon: '🐉' },
  { id: 'a05', icon: '⚡' },
  { id: 'a06', icon: '🎯' },
  { id: 'a07', icon: '🦅' },
  { id: 'a08', icon: '🐺' },
  { id: 'a09', icon: '🛡' },
  { id: 'a10', icon: '🗡' },
  { id: 'a11', icon: '⚔' },
  { id: 'a12', icon: '💎' },
];
const CLANS = ['TABAAHI', 'ALPHAS', 'NOCTURNE', 'RAISTARS', 'SOUL', 'GODLIKE', 'TEAMINDIA', 'ORANGE'];

const generateUID = () => String(10000000 + Math.floor(Math.random() * 89999999));

export default function LoginScreen({ onLogin }: { onLogin: (p: ShadowProfile) => void }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👑');
  const [clan, setClan] = useState('TABAAHI');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 3) { setErr('Handle kam se kam 3 characters ka hona chahiye.'); return; }
    if (trimmed.length > 14) { setErr('Handle 14 characters se zyada nahi ho sakta.'); return; }
    setBusy(true);
    const profile: ShadowProfile = {
      name: trimmed,
      avatar,
      clan,
      uid: generateUID(),
      createdAt: Date.now(),
    };
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (_) {}
    setBusy(false);
    onLogin(profile);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <View style={styles.headerRow}>
        <Text style={styles.headerTag}>SECURE • ASIA (INDIA)</Text>
        <Text style={styles.headerPing}>PING 20ms</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>CREATE OPERATIVE</Text>
        <Text style={styles.subtitle}>
          Apna handle, avatar aur clan chuno. Yeh profile lobby, dossier aur har match me use hogi.
        </Text>

        <Text style={styles.label}>PLAYER HANDLE</Text>
        <TextInput
          value={name}
          onChangeText={(t) => { setName(t); setErr(''); }}
          placeholder="e.g. THUG_LIFE"
          placeholderTextColor="#5b6b82"
          maxLength={14}
          autoCapitalize="characters"
          style={styles.input}
        />

        <Text style={styles.label}>AVATAR</Text>
        <View style={styles.avatarGrid}>
          {AVATARS.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => setAvatar(a.icon)}
              style={[styles.avatarCell, avatar === a.icon && styles.avatarCellActive]}
            >
              <Text style={styles.avatarEmoji}>{a.icon}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>CLAN TAG</Text>
        <View style={styles.clanRow}>
          {CLANS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setClan(c)}
              style={[styles.clanChip, clan === c && styles.clanChipActive]}
            >
              <Text style={[styles.clanText, clan === c && styles.clanTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {err.length > 0 && <Text style={styles.err}>{err}</Text>}

        <TouchableOpacity activeOpacity={0.85} onPress={handleContinue} disabled={busy}>
          <LinearGradient
            colors={['#ffe000', '#f59e0b', '#d97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.startBtn}
          >
            {busy
              ? <ActivityIndicator color="#0f172a" />
              : <Text style={styles.startBtnText}>▶ CONTINUE TO LOBBY</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Guest login — profile isi device pe store hoti hai (AsyncStorage). Koi server nahi.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#05070d',
    padding: 20,
    justifyContent: 'center',
  },
  headerRow: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTag: { color: '#00f0ff', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  headerPing: { color: '#22c55e', fontSize: 10, fontWeight: '900' },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.35)',
    borderRadius: 14,
    padding: 20,
  },
  title: { color: '#fbbf24', fontSize: 22, fontWeight: '900', letterSpacing: 1.5 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4, marginBottom: 16, lineHeight: 18 },
  label: { color: '#94a3b8', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatarCell: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCellActive: { borderColor: '#00f0ff', backgroundColor: 'rgba(0, 240, 255, 0.15)' },
  avatarEmoji: { fontSize: 22 },
  clanRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  clanChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    borderWidth: 1,
    borderColor: '#334155',
  },
  clanChipActive: { borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.15)' },
  clanText: { color: '#94a3b8', fontSize: 11, fontWeight: '900' },
  clanTextActive: { color: '#fbbf24' },
  err: { color: '#ef4444', fontSize: 11, fontWeight: '800', marginTop: 10 },
  startBtn: {
    marginTop: 18,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: { color: '#0f172a', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  disclaimer: { color: 'rgba(148, 163, 184, 0.6)', fontSize: 10, marginTop: 12, textAlign: 'center' },
});
