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

interface Alien {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type: 'scout' | 'cruiser' | 'boss';
  emoji: string;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
  isPlayer: boolean;
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
}

export default function GalaxyDefender({ navigation, route }: any) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const themeKey = route?.params?.theme || 'neon';
  const theme: ThemeColors = THEMES[themeKey as keyof typeof THEMES] || THEMES.neon;

  const arenaW = Math.min(winWidth * 0.94, 420);
  const arenaH = Math.min(winHeight * 0.58, 520);

  const shipW = 34;
  const shipH = 34;

  const [playerX, setPlayerX] = useState(arenaW / 2 - shipW / 2);
  const [aliens, setAliens] = useState<Alien[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [stars, setStars] = useState<Star[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [hp, setHp] = useState(3);
  const [tripleShot, setTripleShot] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Refs
  const pXRef = useRef(arenaW / 2 - shipW / 2);
  const aliensRef = useRef<Alien[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const starsRef = useRef<Star[]>([]);
  const scoreRef = useRef(0);
  const hpRef = useRef(3);
  const waveRef = useRef(1);
  const tripleRef = useRef(false);
  const loopRef = useRef<any>(null);
  const fireTimerRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const hs = await AsyncStorage.getItem('SHOOTER_HIGH_SCORE');
        if (hs) setHighScore(parseInt(hs));
      } catch (_) {}
    })();

    // Initialize stars
    const initStars: Star[] = Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      x: Math.random() * arenaW,
      y: Math.random() * arenaH,
      size: Math.random() > 0.7 ? 2.5 : 1.5,
      speed: 1 + Math.random() * 2.5,
    }));
    starsRef.current = initStars;
    setStars(initStars);
  }, [arenaW, arenaH]);

  const spawnWave = (w: number) => {
    const newAliens: Alien[] = [];
    const rows = Math.min(4, 2 + Math.floor(w / 2));
    const cols = 5;
    const spacingX = arenaW / (cols + 1);
    let count = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isCruiser = r === 0 && w > 1;
        newAliens.push({
          id: count++,
          x: spacingX * (c + 0.6),
          y: 35 + r * 38,
          hp: isCruiser ? 3 : 1,
          maxHp: isCruiser ? 3 : 1,
          type: isCruiser ? 'cruiser' : 'scout',
          emoji: isCruiser ? '👾' : '🛸',
        });
      }
    }
    aliensRef.current = newAliens;
    setAliens(newAliens);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: any) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (gameActive) shootLaser();
        else startGame();
        return;
      }
      const speed = 25;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        moveShip(-speed);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        moveShip(speed);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [gameActive, isPaused, arenaW]);

  // Main game loop
  useEffect(() => {
    if (gameActive && !isPaused && !gameOver) {
      if (loopRef.current) clearInterval(loopRef.current);
      loopRef.current = setInterval(tick, 20);

      // Auto fire player laser every 260ms
      if (fireTimerRef.current) clearInterval(fireTimerRef.current);
      fireTimerRef.current = setInterval(() => {
        shootLaser();
      }, 260);
    } else {
      if (loopRef.current) clearInterval(loopRef.current);
      if (fireTimerRef.current) clearInterval(fireTimerRef.current);
    }
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
      if (fireTimerRef.current) clearInterval(fireTimerRef.current);
    };
  }, [gameActive, isPaused, gameOver, arenaW, arenaH]);

  const moveShip = (delta: number) => {
    const next = Math.max(8, Math.min(arenaW - shipW - 8, pXRef.current + delta));
    pXRef.current = next;
    setPlayerX(next);
  };

  const shootLaser = () => {
    soundManager.playLaser();
    const curX = pXRef.current + shipW / 2;
    const curY = arenaH - 45;

    if (tripleRef.current) {
      bulletsRef.current.push(
        { id: Math.random(), x: curX - 10, y: curY, isPlayer: true },
        { id: Math.random(), x: curX, y: curY, isPlayer: true },
        { id: Math.random(), x: curX + 10, y: curY, isPlayer: true }
      );
    } else {
      bulletsRef.current.push({
        id: Math.random(),
        x: curX,
        y: curY,
        isPlayer: true,
      });
    }
  };

  const tick = () => {
    // 1. Move stars
    for (let s of starsRef.current) {
      s.y += s.speed;
      if (s.y > arenaH) {
        s.y = 0;
        s.x = Math.random() * arenaW;
      }
    }
    setStars([...starsRef.current]);

    // 2. Move aliens
    const currentAliens = [...aliensRef.current];
    let reachedBottom = false;

    for (let a of currentAliens) {
      a.y += 0.35 + waveRef.current * 0.08;
      if (a.y >= arenaH - 70) {
        reachedBottom = true;
      }

      // Chance for alien to drop bomb
      if (Math.random() < 0.005) {
        bulletsRef.current.push({
          id: Math.random(),
          x: a.x + 12,
          y: a.y + 20,
          isPlayer: false,
        });
      }
    }

    if (reachedBottom) {
      soundManager.playGameOver();
      setGameOver(true);
      setGameActive(false);
      return;
    }

    // 3. Move bullets & check collisions
    const activeBullets: Bullet[] = [];
    const playerY = arenaH - 40;

    for (let b of bulletsRef.current) {
      if (b.isPlayer) {
        b.y -= 7.5;
        let hitAlien = false;

        for (let i = currentAliens.length - 1; i >= 0; i--) {
          const al = currentAliens[i];
          if (
            b.x >= al.x - 6 &&
            b.x <= al.x + 28 &&
            b.y >= al.y &&
            b.y <= al.y + 24
          ) {
            al.hp -= 1;
            hitAlien = true;

            if (al.hp <= 0) {
              soundManager.playExplosion();
              scoreRef.current += al.type === 'cruiser' ? 40 : 20;
              setScore(scoreRef.current);

              if (scoreRef.current > highScore) {
                setHighScore(scoreRef.current);
                AsyncStorage.setItem('SHOOTER_HIGH_SCORE', scoreRef.current.toString()).catch(() => {});
              }

              // Powerup chance
              if (Math.random() < 0.15) {
                tripleRef.current = true;
                setTripleShot(true);
                setTimeout(() => {
                  tripleRef.current = false;
                  setTripleShot(false);
                }, 8000);
              }
              currentAliens.splice(i, 1);
            }
            break;
          }
        }

        if (!hitAlien && b.y > 0) {
          activeBullets.push(b);
        }
      } else {
        // Alien bomb
        b.y += 4.5;
        if (
          b.x >= pXRef.current - 4 &&
          b.x <= pXRef.current + shipW + 4 &&
          b.y >= playerY - 4 &&
          b.y <= playerY + shipH
        ) {
          soundManager.playGameOver();
          hpRef.current -= 1;
          setHp(hpRef.current);

          if (hpRef.current <= 0) {
            setGameOver(true);
            setGameActive(false);
            return;
          }
        } else if (b.y < arenaH) {
          activeBullets.push(b);
        }
      }
    }

    bulletsRef.current = activeBullets;
    setBullets(activeBullets);

    aliensRef.current = currentAliens;
    setAliens(currentAliens);

    // Wave cleared!
    if (currentAliens.length === 0) {
      soundManager.playPowerup();
      waveRef.current += 1;
      setWave(waveRef.current);
      spawnWave(waveRef.current);
    }
  };

  const startGame = () => {
    soundManager.playClick();
    scoreRef.current = 0;
    hpRef.current = 3;
    waveRef.current = 1;
    tripleRef.current = false;
    setScore(0);
    setHp(3);
    setWave(1);
    setTripleShot(false);
    setGameOver(false);
    setIsPaused(false);
    spawnWave(1);
    bulletsRef.current = [];
    setBullets([]);
    setGameActive(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
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
        <Text style={[styles.title, { color: theme.accent }]}>GALAXY DEFENDER</Text>
        <View style={styles.hpRow}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Text key={i} style={styles.hpHeart}>
              {i < hp ? '🛡️' : '💥'}
            </Text>
          ))}
        </View>
      </View>

      {/* Ribbon */}
      <View style={[styles.scoreRibbon, { backgroundColor: theme.cardBg }]}>
        <View style={styles.ribbonItem}>
          <Text style={[styles.ribbonLabel, { color: theme.textSecondary }]}>SCORE</Text>
          <Text style={[styles.ribbonVal, { color: theme.accent }]}>{score}</Text>
        </View>
        <View style={styles.ribbonItem}>
          <Text style={[styles.ribbonLabel, { color: theme.textSecondary }]}>WAVE</Text>
          <Text style={[styles.ribbonVal, { color: theme.accentSecondary }]}>{wave}</Text>
        </View>
        <View style={styles.ribbonItem}>
          <Text style={[styles.ribbonLabel, { color: theme.textSecondary }]}>HIGH</Text>
          <Text style={[styles.ribbonVal, { color: '#ffd700' }]}>{highScore}</Text>
        </View>
        {tripleShot && (
          <View style={styles.tripleBadge}>
            <Text style={styles.tripleText}>TRIPLE 💥</Text>
          </View>
        )}
      </View>

      {/* Space Battle Arena */}
      <View style={styles.arenaWrap}>
        <View
          style={[
            styles.arena,
            {
              width: arenaW,
              height: arenaH,
              backgroundColor: '#03040c',
              borderColor: theme.accent,
            },
          ]}
        >
          {/* Starfield */}
          {stars.map((s) => (
            <View
              key={s.id}
              style={[
                styles.star,
                {
                  left: s.x,
                  top: s.y,
                  width: s.size,
                  height: s.size,
                },
              ]}
            />
          ))}

          {/* Aliens */}
          {aliens.map((al) => (
            <View key={al.id} style={[styles.alien, { left: al.x, top: al.y }]}>
              <Text style={{ fontSize: al.type === 'cruiser' ? 22 : 18 }}>{al.emoji}</Text>
            </View>
          ))}

          {/* Bullets */}
          {bullets.map((b) => (
            <View
              key={b.id}
              style={[
                styles.bullet,
                {
                  left: b.x,
                  top: b.y,
                  backgroundColor: b.isPlayer ? '#00f0ff' : '#ff0055',
                  shadowColor: b.isPlayer ? '#00f0ff' : '#ff0055',
                },
              ]}
            />
          ))}

          {/* Player Starfighter */}
          <View
            style={[
              styles.playerShip,
              {
                left: playerX,
                top: arenaH - 45,
                width: shipW,
                height: shipH,
              },
            ]}
          >
            <Text style={{ fontSize: 26 }}>🚀</Text>
          </View>

          {/* Start Overlay */}
          {!gameActive && !gameOver && (
            <TouchableOpacity style={styles.startOverlay} onPress={startGame} activeOpacity={0.85}>
              <Text style={[styles.startTitle, { color: theme.accent }]}>TAP TO ENGAGE</Text>
              <Text style={[styles.startSub, { color: theme.textSecondary }]}>
                Auto-Firing Active • Move Left/Right
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Steering Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.steerBtn, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}
          onPress={() => moveShip(-35)}
          activeOpacity={0.7}
        >
          <Text style={[styles.steerBtnText, { color: theme.accent }]}>◀ THRUST LEFT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.steerBtn, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}
          onPress={() => moveShip(35)}
          activeOpacity={0.7}
        >
          <Text style={[styles.steerBtnText, { color: theme.accent }]}>THRUST RIGHT ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Game Over Modal */}
      <Modal visible={gameOver} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.cardBg, borderColor: '#ff0055' }]}>
            <Text style={styles.modalEmoji}>💥</Text>
            <Text style={[styles.modalTitle, { color: '#ff0055' }]}>SHIP DESTROYED</Text>
            <Text style={[styles.modalScoreText, { color: theme.textPrimary }]}>Score: {score}</Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Reached Wave {wave}</Text>
            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: theme.accent }]}
              onPress={startGame}
            >
              <Text style={styles.modalActionText}>LAUNCH AGAIN</Text>
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
  hpRow: {
    flexDirection: 'row',
    gap: 4,
  },
  hpHeart: {
    fontSize: 16,
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
    fontSize: 20,
    fontWeight: '900',
  },
  tripleBadge: {
    backgroundColor: '#ff007f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tripleText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
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
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 2,
    opacity: 0.7,
  },
  alien: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bullet: {
    position: 'absolute',
    width: 4,
    height: 12,
    borderRadius: 2,
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  playerShip: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  steerBtn: {
    flex: 1,
    maxWidth: 180,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  steerBtnText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
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
