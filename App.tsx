import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './screen/home';
import NeonRacing from './screen/racing';
import SnakeGame from './screen/snake';
import CyberPong from './screen/pong';
import NeonBreakout from './screen/breakout';
import GalaxyDefender from './screen/shooter';
import CyberGlider from './screen/flappy';
import LeaderboardScreen from './screen/leaderboard';
import RegisterScreen from './screen/register';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
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
