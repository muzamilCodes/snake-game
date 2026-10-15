import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Home from './screen/home';
import NeonRacing from './screen/racing';
import SnakeGame from './screen/snake';
import CyberPong from './screen/pong';
import NeonBreakout from './screen/breakout';
import GalaxyDefender from './screen/shooter';
import CyberGlider from './screen/flappy';
import LeaderboardScreen from './screen/leaderboard';
import RegisterScreen from './screen/register';
import LoginScreen, { ShadowProfile, PROFILE_KEY } from './screen/login';
import ShadowStrikeScreen from './screen/shadow_strike';

const Stack = createNativeStackNavigator();

export default function App() {
  const [profile, setProfile] = useState<ShadowProfile | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.name) setProfile(parsed);
        }
      } catch (_) {}
      setBooting(false);
    })();
  }, []);

  if (booting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color="#00f0ff" size="large" />
      </View>
    );
  }

  if (!profile) {
    return <LoginScreen onLogin={setProfile} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="ShadowStrike"
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="ShadowStrike">
          {(props) => <ShadowStrikeScreen {...props} profile={profile} onLogout={async () => {
            try { await AsyncStorage.removeItem(PROFILE_KEY); } catch (_) {}
            setProfile(null);
          }} />}
        </Stack.Screen>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Racing" component={NeonRacing} />
        <Stack.Screen name="Snake" component={SnakeGame} />
        <Stack.Screen name="Pong" component={CyberPong} />
        <Stack.Screen name="Breakout" component={NeonBreakout} />
        <Stack.Screen name="Shooter" component={GalaxyDefender} />
        <Stack.Screen name="Flappy" component={CyberGlider} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: '#05070d', alignItems: 'center', justifyContent: 'center' },
});
