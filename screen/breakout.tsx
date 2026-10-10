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

interface Brick {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  hits: number;
  maxHits: number;
  color: string;
  points: number;
  isBomb?: boolean;
}

interface PowerUp {
  id: number;
  x: number;
  y: number;
  type: 'wide' | 'multi' | 'slow';
  emoji: string;
}

export default function NeonBreakout({ navigation, route }: any) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const themeKey = route?.params?.theme || 'neon';
  const theme: ThemeColors = THEMES[themeKey as keyof typeof THEMES] || THEMES.neon;

  const arenaWidth = Math.min(winWidth * 0.94, 420);
  const arenaHeight = Math.min(winHeight * 0.58, 520);

  const basePaddleW = arenaWidth * 0.24;
  const paddleH = 12;
  const ballSize = 12;

  const [paddleW, setPaddleW] = useState(basePaddleW);
  const [paddleX, setPaddleX] = useState(arenaWidth / 2 - basePaddleW / 2);
  const [balls, setBalls] = useState([{ x: arenaWidth / 2, y: arenaHeight - 60, vx: 3.5, vy: -4 }]);
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameActive, setGameActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [levelClear, setLevelClear] = useState(false);

  // Refs
  const pXRef = useRef(arenaWidth / 2 - basePaddleW / 2);
  const pWRef = useRef(basePaddleW);
  const ballsRef = useRef([{ x: arenaWidth / 2, y: arenaHeight - 60, vx: 3.5, vy: -4 }]);
  const bricksRef = useRef<Brick[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const loopRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const hs = await AsyncStorage.getItem('BREAKOUT_HIGH_SCORE');
        if (hs) setHighScore(parseInt(hs));
      } catch (_) {}
    })();
  }, []);

  const createLevelBricks = (lvl: number) => {
    const rows = Math.min(6, 3 + lvl);
    const cols = 6;
    const padding = 6;
    const brickW = (arenaWidth - padding * (cols + 1)) / cols;
    const brickH = 16;
    const newBricks: Brick[] = [];

    const colors = ['#00f0ff', '#ff007f', '#ffd700', '#00ff66', '#a020f0', '#ff3300'];

    let count = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isBomb = Math.random() < 0.08;
        const color = isBomb ? '#ff3300' : colors[(r + lvl) % colors.length];
        const hits = r === 0 && lvl > 1 ? 2 : 1;
        newBricks.push({
          id: count++,
          x: padding + c * (brickW + padding),
          y: 40 + r * (brickH + padding),
          w: brickW,
          h: brickH,
          hits,
          maxHits: hits,
          color,
          points: hits * 15,
          isBomb,
        });
      }
    }
    bricksRef.current = newBricks;
    setBricks(newBricks);
  };

  useEffect(() => {
    createLevelBricks(level);
  }, [arenaWidth, level]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: any) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (gameActive) setIsPaused((p) => !p);
        else startGame();
        return;
      }
      const speed = 24;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        movePaddle(-speed);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        movePaddle(speed);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [gameActive, isPaused, arenaWidth]);

  // Loop
  useEffect(() => {
    if (gameActive && !isPaused && !gameOver && !levelClear) {
      if (loopRef.current) clearInterval(loopRef.current);
      loopRef.current = setInterval(tick, 16);
    } else {
      if (loopRef.current) clearInterval(loopRef.current);
    }
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [gameActive, isPaused, gameOver, levelClear, arenaWidth, arenaHeight]);

  const movePaddle = (delta: number) => {
    const next = Math.max(0, Math.min(arenaWidth - pWRef.current, pXRef.current + delta));
    pXRef.current = next;
    setPaddleX(next);
  };

  const tick = () => {
    const currentBalls = [...ballsRef.current];
    const currentBricks = [...bricksRef.current];
    const updatedBalls = [];

    const paddleY = arenaHeight - 20 - paddleH;

    for (let b of currentBalls) {
      let { x, y, vx, vy } = b;
      x += vx;
      y += vy;

      // Wall bounce
      if (x <= 0) {
        x = 0;
        vx = -vx;
        soundManager.playPaddleHit(false);
      } else if (x >= arenaWidth - ballSize) {
        x = arenaWidth - ballSize;
        vx = -vx;
        soundManager.playPaddleHit(false);
      }
      if (y <= 0) {
        y = 0;
        vy = -vy;
        soundManager.playPaddleHit(false);
      }

      // Paddle collision
      if (
        y + ballSize >= paddleY &&
        y + ballSize <= paddleY + paddleH + 6 &&
        x + ballSize >= pXRef.current &&
        x <= pXRef.current + pWRef.current &&
        vy > 0
      ) {
        y = paddleY - ballSize;
        vy = -Math.abs(vy);
        const hitOffset = (x + ballSize / 2 - (pXRef.current + pWRef.current / 2)) / (pWRef.current / 2);
        vx = hitOffset * 5.2;
        soundManager.playPaddleHit(true);
      }

      // Brick collision
      for (let i = currentBricks.length - 1; i >= 0; i--) {
        const br = currentBricks[i];
        if (
          x + ballSize >= br.x &&
          x <= br.x + br.w &&
          y + ballSize >= br.y &&
          y <= br.y + br.h
        ) {
          vy = -vy;
          br.hits -= 1;

          if (br.isBomb) {
            soundManager.playExplosion();
          } else {
            soundManager.playEat(false);
          }

          if (br.hits <= 0) {
            // Drop powerup chance
            if (Math.random() < 0.2) {
              const types: Array<'wide' | 'multi' | 'slow'> = ['wide', 'multi', 'slow'];
              const chosen = types[Math.floor(Math.random() * types.length)];
              const emoji = chosen === 'wide' ? '📏' : chosen === 'multi' ? '🔮' : '❄️';
              powerUpsRef.current.push({
                id: Date.now() + Math.random(),
                x: br.x + br.w / 2,
                y: br.y,
                type: chosen,
                emoji,
              });
            }

            scoreRef.current += br.points;
            setScore(scoreRef.current);
            if (scoreRef.current > highScore) {
              setHighScore(scoreRef.current);
              AsyncStorage.setItem('BREAKOUT_HIGH_SCORE', scoreRef.current.toString()).catch(() => {});
            }
            currentBricks.splice(i, 1);
          }
          break;
        }
      }

      // Check bottom fall
      if (y <= arenaHeight) {
        updatedBalls.push({ x, y, vx, vy });
      }
    }

    // Check if all balls lost
    if (updatedBalls.length === 0) {
      soundManager.playGameOver();
      livesRef.current -= 1;
      setLives(livesRef.current);

      if (livesRef.current <= 0) {
        setGameOver(true);
        setGameActive(false);
        return;
      } else {
        // Reset ball on paddle
        const respawn = [{ x: arenaWidth / 2, y: arenaHeight - 60, vx: 3.5, vy: -4 }];
        ballsRef.current = respawn;
        setBalls(respawn);
        return;
      }
    } else {
      ballsRef.current = updatedBalls;
      setBalls(updatedBalls);
    }

    // Update powerups falling
    const activePow = [];
    for (let p of powerUpsRef.current) {
      p.y += 2.5;
      if (
        p.y + 16 >= paddleY &&
        p.y <= paddleY + paddleH &&
        p.x >= pXRef.current &&
        p.x <= pXRef.current + pWRef.current
      ) {
        soundManager.playPowerup();
        if (p.type === 'wide') {
          pWRef.current = basePaddleW * 1.45;
          setPaddleW(pWRef.current);
          setTimeout(() => {
            pWRef.current = basePaddleW;
            setPaddleW(basePaddleW);
          }, 8000);
        } else if (p.type === 'multi') {
          if (ballsRef.current.length > 0) {
            const b = ballsRef.current[0];
            ballsRef.current.push(
              { x: b.x, y: b.y, vx: -b.vx, vy: b.vy },
              { x: b.x, y: b.y, vx: b.vx * 0.8, vy: -Math.abs(b.vy) }
            );
          }
        }
      } else if (p.y < arenaHeight) {
        activePow.push(p);
      }
    }
    powerUpsRef.current = activePow;
    setPowerUps(activePow);

    // Update bricks
    bricksRef.current = currentBricks;
    setBricks(currentBricks);

    // Level Cleared!
    if (currentBricks.length === 0) {
      soundManager.playPowerup();
      setLevelClear(true);
      setGameActive(false);
    }
  };

  const startGame = () => {
    soundManager.playClick();
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameOver(false);
    setLevelClear(false);
    setIsPaused(false);
    createLevelBricks(1);
    const initBall = [{ x: arenaWidth / 2, y: arenaHeight - 60, vx: 3.5, vy: -4 }];
    ballsRef.current = initBall;
    setBalls(initBall);
    setGameActive(true);
  };

  const nextLevel = () => {
    soundManager.playClick();
    const nextLvl = level + 1;
    setLevel(nextLvl);
    setLevelClear(false);
    createLevelBricks(nextLvl);
    const initBall = [{ x: arenaWidth / 2, y: arenaHeight - 60, vx: 3.5, vy: -4 }];
    ballsRef.current = initBall;
    setBalls(initBall);
    setGameActive(true);
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
        <Text style={[styles.title, { color: theme.accent }]}>NEON BREAKOUT</Text>
        <View style={styles.livesRow}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Text key={i} style={styles.heartIcon}>
              {i < lives ? '❤️' : '🖤'}
            </Text>
          ))}
        </View>
      </View>

      {/* Score Ribbon */}
      <View style={[styles.scoreRibbon, { backgroundColor: theme.cardBg }]}>
        <View style={styles.ribbonItem}>
          <Text style={[styles.ribbonLabel, { color: theme.textSecondary }]}>SCORE</Text>
          <Text style={[styles.ribbonVal, { color: theme.accent }]}>{score}</Text>
        </View>
        <View style={styles.ribbonItem}>
          <Text style={[styles.ribbonLabel, { color: theme.textSecondary }]}>STAGE</Text>
          <Text style={[styles.ribbonVal, { color: theme.accentSecondary }]}>{level}</Text>
        </View>
        <View style={styles.ribbonItem}>
          <Text style={[styles.ribbonLabel, { color: theme.textSecondary }]}>HIGH</Text>
          <Text style={[styles.ribbonVal, { color: '#ffd700' }]}>{highScore}</Text>
        </View>
      </View>

      {/* Playfield */}
      <View style={styles.arenaWrap}>
        <View
          style={[
            styles.arena,
            {
              width: arenaWidth,
              height: arenaHeight,
              backgroundColor: theme.boardBg,
              borderColor: theme.accent,
            },
          ]}
        >
          {/* Bricks */}
          {bricks.map((b) => (
            <View
              key={b.id}
              style={[
                styles.brick,
                {
                  left: b.x,
                  top: b.y,
                  width: b.w,
                  height: b.h,
                  backgroundColor: b.color,
                  borderColor: '#fff',
                  opacity: b.hits < b.maxHits ? 0.6 : 1,
                },
              ]}
            >
              {b.isBomb && <Text style={{ fontSize: 9 }}>💣</Text>}
            </View>
          ))}

          {/* PowerUps */}
          {powerUps.map((p) => (
            <View key={p.id} style={[styles.powerup, { left: p.x, top: p.y }]}>
              <Text style={{ fontSize: 16 }}>{p.emoji}</Text>
            </View>
          ))}

          {/* Paddle */}
          <View
            style={[
              styles.paddle,
              {
                width: paddleW,
                height: paddleH,
                left: paddleX,
                top: arenaHeight - 20 - paddleH,
                backgroundColor: theme.accent,
              },
            ]}
          />

          {/* Balls */}
          {balls.map((b, i) => (
            <View
              key={i}
              style={[
                styles.ball,
                {
                  width: ballSize,
                  height: ballSize,
                  left: b.x,
                  top: b.y,
                  backgroundColor: '#00f0ff',
                },
              ]}
            />
          ))}

          {/* Start overlay */}
          {!gameActive && !gameOver && !levelClear && (
            <TouchableOpacity style={styles.startOverlay} onPress={startGame} activeOpacity={0.85}>
              <Text style={[styles.startTitle, { color: theme.accent }]}>TAP TO LAUNCH</Text>
              <Text style={[styles.startSub, { color: theme.textSecondary }]}>
                Arrow Keys or Steering Buttons below
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Steering Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.steerBtn, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}
          onPress={() => movePaddle(-36)}
          activeOpacity={0.7}
        >
          <Text style={[styles.steerBtnText, { color: theme.accent }]}>◀ MOVE LEFT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.steerBtn, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}
          onPress={() => movePaddle(36)}
          activeOpacity={0.7}
        >
          <Text style={[styles.steerBtnText, { color: theme.accent }]}>MOVE RIGHT ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Game Over Modal */}
      <Modal visible={gameOver} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.cardBg, borderColor: '#ff0055' }]}>
            <Text style={styles.modalEmoji}>💀</Text>
            <Text style={[styles.modalTitle, { color: '#ff0055' }]}>GAME OVER</Text>
            <Text style={[styles.modalScoreText, { color: theme.textPrimary }]}>Score: {score}</Text>
            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: theme.accent }]}
              onPress={startGame}
            >
              <Text style={styles.modalActionText}>TRY AGAIN</Text>
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

      {/* Level Clear Modal */}
      <Modal visible={levelClear} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.cardBg, borderColor: '#00ff66' }]}>
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={[styles.modalTitle, { color: '#00ff66' }]}>STAGE {level} CLEAR!</Text>
            <Text style={[styles.modalScoreText, { color: theme.textPrimary }]}>Score: {score}</Text>
            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: '#00ff66' }]}
              onPress={nextLevel}
            >
              <Text style={styles.modalActionText}>NEXT STAGE ▶</Text>
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
  livesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  heartIcon: {
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
  brick: {
    position: 'absolute',
    borderRadius: 3,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  powerup: {
    position: 'absolute',
  },
  paddle: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#00f0ff',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  ball: {
    position: 'absolute',
    borderRadius: 6,
    shadowColor: '#00f0ff',
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
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
