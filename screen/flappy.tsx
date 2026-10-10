import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
  StatusBar,
  Modal,
} from 'react-native';
import { THEMES, ThemeColors } from '../utils/themes';
import { soundManager } from '../utils/sound';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Pipe {
  id: number;
  x: number;
  topHeight: number;
  bottomHeight: number;
  passed: boolean;
  hasSpark: boolean;
}

export default function CyberGlider({ navigation, route }: any) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const themeKey = route?.params?.theme || 'neon';
  const theme: ThemeColors = THEMES[themeKey as keyof typeof THEMES] || THEMES.neon;

  const arenaW = Math.min(winWidth * 0.94, 420);
  const arenaH = Math.min(winHeight * 0.58, 520);

  const droneSize = 28;
  const droneX = 60;
  const pipeWidth = 44;
  const pipeGap = 130;

  const [droneY, setDroneY] = useState(arenaH / 2);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Refs
  const dYRef = useRef(arenaH / 2);
  const velRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const loopRef = useRef<any>(null);
  const pipeGenTimerRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const hs = await AsyncStorage.getItem('GLIDER_HIGH_SCORE');
        if (hs) setHighScore(parseInt(hs));
      } catch (_) {}
    })();
  }, []);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: any) => {
      if (e.key === ' ' || e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        jump();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [gameActive, gameOver]);

  // Main loop
  useEffect(() => {
    if (gameActive && !gameOver) {
      if (loopRef.current) clearInterval(loopRef.current);
      loopRef.current = setInterval(tick, 18);

      if (pipeGenTimerRef.current) clearInterval(pipeGenTimerRef.current);
      pipeGenTimerRef.current = setInterval(generatePipe, 1600);
    } else {
      if (loopRef.current) clearInterval(loopRef.current);
      if (pipeGenTimerRef.current) clearInterval(pipeGenTimerRef.current);
    }
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
      if (pipeGenTimerRef.current) clearInterval(pipeGenTimerRef.current);
    };
  }, [gameActive, gameOver, arenaH]);

  const jump = () => {
    if (!gameActive && !gameOver) {
      startGame();
      return;
    }
    if (gameOver) return;

    soundManager.playFlap();
    velRef.current = -5.8;
  };

  const generatePipe = () => {
    const minHeight = 40;
    const maxAvailable = arenaH - pipeGap - minHeight * 2;
    const topHeight = minHeight + Math.random() * maxAvailable;
    const bottomHeight = arenaH - topHeight - pipeGap;

    const newPipe: Pipe = {
      id: Date.now() + Math.random(),
      x: arenaW,
      topHeight,
      bottomHeight,
      passed: false,
      hasSpark: Math.random() < 0.4,
    };

    pipesRef.current.push(newPipe);
  };

  const tick = () => {
    // Gravity physics
    velRef.current += 0.36; // gravity
    dYRef.current += velRef.current;

    // Floor and ceiling collision
    if (dYRef.current <= 0) {
      dYRef.current = 0;
      velRef.current = 0;
    }
    if (dYRef.current >= arenaH - droneSize) {
      triggerGameOver();
      return;
    }

    setDroneY(dYRef.current);

    // Move pipes
    const currentPipes = [...pipesRef.current];
    const updatedPipes: Pipe[] = [];

    for (let p of currentPipes) {
      p.x -= 2.6;

      // Check collision with drone
      if (
        droneX + droneSize - 4 >= p.x &&
        droneX + 4 <= p.x + pipeWidth
      ) {
        // In X range of pipe
        if (
          dYRef.current + 4 < p.topHeight ||
          dYRef.current + droneSize - 4 > arenaH - p.bottomHeight
        ) {
          triggerGameOver();
          return;
        }

        // Collect spark
        if (p.hasSpark) {
          p.hasSpark = false;
          soundManager.playPowerup();
          scoreRef.current += 5;
          setScore(scoreRef.current);
        }
      }

      // Check if passed for point
      if (!p.passed && p.x + pipeWidth < droneX) {
        p.passed = true;
        soundManager.playEat(false);
        scoreRef.current += 1;
        setScore(scoreRef.current);

        if (scoreRef.current > highScore) {
          setHighScore(scoreRef.current);
          AsyncStorage.setItem('GLIDER_HIGH_SCORE', scoreRef.current.toString()).catch(() => {});
        }
      }

      if (p.x + pipeWidth > 0) {
        updatedPipes.push(p);
      }
    }

    pipesRef.current = updatedPipes;
    setPipes(updatedPipes);
  };

  const triggerGameOver = () => {
    soundManager.playGameOver();
    setGameOver(true);
    setGameActive(false);
  };

  const startGame = () => {
    soundManager.playClick();
    dYRef.current = arenaH / 2;
    velRef.current = -4;
    setDroneY(arenaH / 2);
    scoreRef.current = 0;
    setScore(0);
    pipesRef.current = [];
    setPipes([]);
    setGameOver(false);
    setGameActive(true);
  };

  const getMedal = (s: number) => {
    if (s >= 50) return '💎 PLATINUM';
    if (s >= 25) return '🥇 GOLD';
    if (s >= 10) return '🥈 SILVER';
    if (s >= 5) return '🥉 BRONZE';
    return 'SERPENT ROOKIE';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.topBar, { backgroundColor: theme.headerBg, borderBottomColor: theme.accent }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            soundManager.playClick();
            navigation.goBack();
          }}
        >
          <Text style={[styles.backBtnText, { color: theme.accent }]}>‹ Arcade</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.accent }]}>CYBER GLIDER</Text>
        <View style={styles.scorePill}>
          <Text style={[styles.scorePillText, { color: theme.accent }]}>{score} PTS</Text>
        </View>
      </View>

      {/* Ribbon */}
      <View style={[styles.scoreRibbon, { backgroundColor: theme.cardBg }]}>
        <View style={styles.ribbonItem}>
          <Text style={[styles.ribbonLabel, { color: theme.textSecondary }]}>CURRENT</Text>
          <Text style={[styles.ribbonVal, { color: theme.accent }]}>{score}</Text>
        </View>
        <View style={styles.ribbonItem}>
          <Text style={[styles.ribbonLabel, { color: theme.textSecondary }]}>MEDAL</Text>
          <Text style={[styles.ribbonVal, { color: '#ffd700', fontSize: 15 }]}>{getMedal(score)}</Text>
        </View>
        <View style={styles.ribbonItem}>
          <Text style={[styles.ribbonLabel, { color: theme.textSecondary }]}>BEST</Text>
          <Text style={[styles.ribbonVal, { color: theme.accentSecondary }]}>{highScore}</Text>
        </View>
      </View>

      {/* Flappy Arena */}
      <View style={styles.arenaWrap}>
        <TouchableOpacity
          style={[
            styles.arena,
            {
              width: arenaW,
              height: arenaH,
              backgroundColor: '#040718',
              borderColor: theme.accent,
            },
          ]}
          onPress={jump}
          activeOpacity={1}
        >
          {/* Laser Pillars (Pipes) */}
          {pipes.map((p) => (
            <React.Fragment key={p.id}>
              {/* Top Laser Gate */}
              <View
                style={[
                  styles.pipe,
                  {
                    left: p.x,
                    top: 0,
                    width: pipeWidth,
                    height: p.topHeight,
                    backgroundColor: 'rgba(0, 240, 255, 0.25)',
                    borderColor: '#00f0ff',
                    borderBottomWidth: 4,
                  },
                ]}
              />

              {/* Spark plasma orb inside gap */}
              {p.hasSpark && (
                <View
                  style={[
                    styles.spark,
                    {
                      left: p.x + pipeWidth / 2 - 9,
                      top: p.topHeight + pipeGap / 2 - 9,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: '#ffd700',
                      borderWidth: 2,
                      borderColor: '#ffffff',
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                  ]}
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffffff' }} />
                </View>
              )}

              {/* Bottom Laser Gate */}
              <View
                style={[
                  styles.pipe,
                  {
                    left: p.x,
                    top: arenaH - p.bottomHeight,
                    width: pipeWidth,
                    height: p.bottomHeight,
                    backgroundColor: 'rgba(0, 240, 255, 0.25)',
                    borderColor: '#00f0ff',
                    borderTopWidth: 4,
                  },
                ]}
              />
            </React.Fragment>
          ))}

          {/* Player High-Tech Cyber Glider */}
          <View
            style={[
              styles.drone,
              {
                left: droneX,
                top: droneY,
                width: 38,
                height: 24,
              },
            ]}
          >
            <View
              style={{
                width: 36,
                height: 20,
                backgroundColor: '#050c1f',
                borderRadius: 5,
                borderWidth: 2,
                borderColor: '#00f0ff',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {/* Cockpit Canopy */}
              <View style={{ width: 14, height: 6, backgroundColor: '#00f0ff', borderRadius: 3 }} />
              {/* Rear Jet Exhaust Thruster */}
              <View
                style={{
                  position: 'absolute',
                  left: -8,
                  width: 8,
                  height: 10,
                  backgroundColor: '#ff0055',
                  borderRadius: 4,
                }}
              />
            </View>
          </View>

          {/* Start overlay */}
          {!gameActive && !gameOver && (
            <View style={styles.startOverlay}>
              <Text style={[styles.startTitle, { color: theme.accent }]}>TAP TO FLY</Text>
              <Text style={[styles.startSub, { color: theme.textSecondary }]}>
                Tap anywhere or press Spacebar / Up Arrow to thrust
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Large Thrust Action Button */}
      <View style={styles.thrustRow}>
        <TouchableOpacity
          style={[styles.thrustBtn, { backgroundColor: theme.accent }]}
          onPress={jump}
          activeOpacity={0.7}
        >
          <Text style={styles.thrustBtnText}>THRUST JET (TAP / SPACE)</Text>
        </TouchableOpacity>
      </View>

      {/* Game Over Modal */}
      <Modal visible={gameOver} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.cardBg, borderColor: '#ff0055' }]}>
            <Text style={{ fontSize: 24, fontWeight: '900', color: '#ff0055', textAlign: 'center', marginBottom: 8 }}>
              MISSION FAILED
            </Text>
            <Text style={[styles.modalTitle, { color: '#ff0055' }]}>CRASH DOWN</Text>
            <Text style={[styles.modalScoreText, { color: theme.textPrimary }]}>Score: {score}</Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Best: {highScore}</Text>
            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: theme.accent }]}
              onPress={startGame}
            >
              <Text style={styles.modalActionText}>FLY AGAIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSecBtn, { borderColor: theme.accent }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.modalSecText, { color: theme.accent }]}>ARCADE HUB</Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  scorePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scoreRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ribbonItem: {
    alignItems: 'center',
  },
  ribbonLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ribbonVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  arenaWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  arena: {
    borderWidth: 2,
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  pipe: {
    position: 'absolute',
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    shadowColor: '#00f0ff',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  spark: {
    position: 'absolute',
  },
  drone: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  startSub: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  thrustRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  thrustBtn: {
    width: '100%',
    maxWidth: 380,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  thrustBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  modalEmoji: {
    fontSize: 44,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  modalScoreText: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
  },
  modalActionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalActionText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalSecBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  modalSecText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
