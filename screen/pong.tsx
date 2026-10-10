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

export default function CyberPong({ navigation, route }: any) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const themeKey = route?.params?.theme || 'neon';
  const theme: ThemeColors = THEMES[themeKey as keyof typeof THEMES] || THEMES.neon;

  // Responsive arena dimensions
  const arenaWidth = Math.min(winWidth * 0.94, 420);
  const arenaHeight = Math.min(winHeight * 0.58, 520);

  const paddleWidth = arenaWidth * 0.26;
  const paddleHeight = 12;
  const ballSize = 14;

  const [playerX, setPlayerX] = useState(arenaWidth / 2 - paddleWidth / 2);
  const [aiX, setAiX] = useState(arenaWidth / 2 - paddleWidth / 2);
  const [ballPos, setBallPos] = useState({ x: arenaWidth / 2, y: arenaHeight / 2 });
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null);
  const [rallyCount, setRallyCount] = useState(0);
  const [highRally, setHighRally] = useState(0);
  const [difficulty, setDifficulty] = useState<'Normal' | 'Master'>('Normal');

  // Refs for animation loop
  const pXRef = useRef(arenaWidth / 2 - paddleWidth / 2);
  const aiXRef = useRef(arenaWidth / 2 - paddleWidth / 2);
  const ballRef = useRef({ x: arenaWidth / 2, y: arenaHeight / 2, vx: 3.5, vy: 4.5 });
  const pScoreRef = useRef(0);
  const aiScoreRef = useRef(0);
  const rallyRef = useRef(0);
  const loopRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const hs = await AsyncStorage.getItem('PONG_HIGH_RALLY');
        if (hs) setHighRally(parseInt(hs));
      } catch (_) {}
    })();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: any) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (gameActive) setIsPaused((p) => !p);
        else startGame();
        return;
      }
      const speed = 25;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        movePlayer(-speed);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        movePlayer(speed);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [gameActive, isPaused, arenaWidth]);

  // Main loop
  useEffect(() => {
    if (gameActive && !isPaused && !gameOver) {
      if (loopRef.current) clearInterval(loopRef.current);
      loopRef.current = setInterval(updatePhysics, 16);
    } else {
      if (loopRef.current) clearInterval(loopRef.current);
    }
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [gameActive, isPaused, gameOver, arenaWidth, arenaHeight, difficulty]);

  const movePlayer = (delta: number) => {
    const next = Math.max(0, Math.min(arenaWidth - paddleWidth, pXRef.current + delta));
    pXRef.current = next;
    setPlayerX(next);
  };

  const resetBall = (towardsPlayer: boolean) => {
    const speed = 4;
    const angle = (Math.random() - 0.5) * 3;
    ballRef.current = {
      x: arenaWidth / 2,
      y: arenaHeight / 2,
      vx: angle,
      vy: towardsPlayer ? speed : -speed,
    };
    setBallPos({ x: arenaWidth / 2, y: arenaHeight / 2 });
    rallyRef.current = 0;
    setRallyCount(0);
  };

  const updatePhysics = () => {
    let { x, y, vx, vy } = ballRef.current;

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

    // AI tracking paddle (top)
    const aiCenter = aiXRef.current + paddleWidth / 2;
    const aiTarget = x + ballSize / 2;
    const aiSpeed = difficulty === 'Master' ? 5.2 : 3.8;

    if (aiCenter < aiTarget - 10) {
      aiXRef.current = Math.min(arenaWidth - paddleWidth, aiXRef.current + aiSpeed);
    } else if (aiCenter > aiTarget + 10) {
      aiXRef.current = Math.max(0, aiXRef.current - aiSpeed);
    }
    setAiX(aiXRef.current);

    // AI Paddle Collision (Top)
    const aiY = 16;
    if (
      y <= aiY + paddleHeight &&
      y >= aiY &&
      x + ballSize >= aiXRef.current &&
      x <= aiXRef.current + paddleWidth &&
      vy < 0
    ) {
      y = aiY + paddleHeight;
      vy = -vy * 1.05; // slight speedup
      const hitOffset = (x + ballSize / 2 - (aiXRef.current + paddleWidth / 2)) / (paddleWidth / 2);
      vx = hitOffset * 4.5;
      soundManager.playPaddleHit(true);
      rallyRef.current += 1;
      setRallyCount(rallyRef.current);
    }

    // Player Paddle Collision (Bottom)
    const playerY = arenaHeight - 16 - paddleHeight;
    if (
      y + ballSize >= playerY &&
      y + ballSize <= playerY + paddleHeight + 8 &&
      x + ballSize >= pXRef.current &&
      x <= pXRef.current + paddleWidth &&
      vy > 0
    ) {
      y = playerY - ballSize;
      vy = -vy * 1.05;
      const hitOffset = (x + ballSize / 2 - (pXRef.current + paddleWidth / 2)) / (paddleWidth / 2);
      vx = hitOffset * 4.8;
      soundManager.playPaddleHit(true);
      rallyRef.current += 1;
      setRallyCount(rallyRef.current);

      if (rallyRef.current > highRally) {
        setHighRally(rallyRef.current);
        AsyncStorage.setItem('PONG_HIGH_RALLY', rallyRef.current.toString()).catch(() => {});
      }
    }

    // Point scoring
    if (y < 0) {
      // Player Scores!
      soundManager.playPowerup();
      pScoreRef.current += 1;
      setPlayerScore(pScoreRef.current);
      if (pScoreRef.current >= 7) {
        endGame('player');
        return;
      }
      resetBall(false);
      return;
    } else if (y > arenaHeight) {
      // AI Scores!
      soundManager.playGameOver();
      aiScoreRef.current += 1;
      setAiScore(aiScoreRef.current);
      if (aiScoreRef.current >= 7) {
        endGame('ai');
        return;
      }
      resetBall(true);
      return;
    }

    ballRef.current = { x, y, vx, vy };
    setBallPos({ x, y });
  };

  const startGame = () => {
    soundManager.playClick();
    pScoreRef.current = 0;
    aiScoreRef.current = 0;
    setPlayerScore(0);
    setAiScore(0);
    setGameOver(false);
    setIsPaused(false);
    setWinner(null);
    setGameActive(true);
    resetBall(true);
  };

  const endGame = (win: 'player' | 'ai') => {
    setWinner(win);
    setGameOver(true);
    setGameActive(false);
    if (win === 'player') soundManager.playPowerup();
    else soundManager.playGameOver();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Header Bar */}
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
        <Text style={[styles.title, { color: theme.accent }]}>CYBER PONG 2077</Text>
        <TouchableOpacity
          style={styles.diffBtn}
          onPress={() => {
            soundManager.playClick();
            setDifficulty((d) => (d === 'Normal' ? 'Master' : 'Normal'));
          }}
        >
          <Text style={[styles.diffBtnText, { color: theme.accentSecondary }]}>{difficulty}</Text>
        </TouchableOpacity>
      </View>

      {/* Score Ribbon */}
      <View style={[styles.scoreRibbon, { backgroundColor: theme.cardBg }]}>
        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>AI DROID</Text>
          <Text style={[styles.scoreVal, { color: '#ff0055' }]}>{aiScore}</Text>
        </View>

        <View style={styles.rallyBlock}>
          <Text style={[styles.rallyLabel, { color: theme.textSecondary }]}>RALLY</Text>
          <Text style={[styles.rallyVal, { color: theme.accent }]}>{rallyCount}</Text>
          <Text style={[styles.highRallyLabel, { color: theme.textSecondary }]}>Best: {highRally}</Text>
        </View>

        <View style={styles.scoreBlock}>
          <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>YOU</Text>
          <Text style={[styles.scoreVal, { color: theme.accent }]}>{playerScore}</Text>
        </View>
      </View>

      {/* Arena */}
      <View style={styles.arenaContainer}>
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
          {/* Center Dividing Net */}
          <View style={[styles.netLine, { top: arenaHeight / 2 - 1 }]} />

          {/* AI Paddle (Top) */}
          <View
            style={[
              styles.paddle,
              {
                width: paddleWidth,
                height: paddleHeight,
                left: aiX,
                top: 16,
                backgroundColor: '#ff0055',
                borderColor: '#ff3377',
              },
            ]}
          />

          {/* Player Paddle (Bottom) */}
          <View
            style={[
              styles.paddle,
              {
                width: paddleWidth,
                height: paddleHeight,
                left: playerX,
                top: arenaHeight - 16 - paddleHeight,
                backgroundColor: theme.accent,
                borderColor: '#ffffff',
              },
            ]}
          />

          {/* Neon Ball */}
          <View
            style={[
              styles.ball,
              {
                width: ballSize,
                height: ballSize,
                left: ballPos.x,
                top: ballPos.y,
                backgroundColor: '#ffff00',
              },
            ]}
          />

          {/* Ready Overlay */}
          {!gameActive && !gameOver && (
            <TouchableOpacity style={styles.startOverlay} onPress={startGame} activeOpacity={0.85}>
              <Text style={[styles.startOverlayTitle, { color: theme.accent }]}>TAP TO SERVE</Text>
              <Text style={[styles.startOverlaySub, { color: theme.textSecondary }]}>
                First to 7 Points Wins • Arrow Keys / A-D
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Touch Steering Buttons */}
      <View style={styles.touchControls}>
        <TouchableOpacity
          style={[styles.steerBtn, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}
          onPress={() => movePlayer(-40)}
          activeOpacity={0.7}
        >
          <Text style={[styles.steerBtnText, { color: theme.accent }]}>◀ STEER LEFT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.steerBtn, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}
          onPress={() => movePlayer(40)}
          activeOpacity={0.7}
        >
          <Text style={[styles.steerBtnText, { color: theme.accent }]}>STEER RIGHT ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Game Over Modal */}
      <Modal visible={gameOver} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}>
            <Text style={styles.modalEmoji}>{winner === 'player' ? '🏆' : '💀'}</Text>
            <Text
              style={[
                styles.modalTitle,
                { color: winner === 'player' ? theme.accent : '#ff0055' },
              ]}
            >
              {winner === 'player' ? 'VICTORY!' : 'AI DOMINATION!'}
            </Text>
            <Text style={[styles.modalScoreText, { color: theme.textPrimary }]}>
              Final Score: {playerScore} - {aiScore}
            </Text>
            <Text style={[styles.modalRallyText, { color: theme.textSecondary }]}>
              Max Rally: {highRally} hits
            </Text>

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: theme.accent }]}
              onPress={startGame}
            >
              <Text style={styles.modalActionText}>PLAY AGAIN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSecBtn, { borderColor: theme.accent }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.modalSecText, { color: theme.accent }]}>ARCADE MENU</Text>
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
  diffBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  diffBtnText: {
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
  scoreBlock: {
    alignItems: 'center',
    minWidth: 70,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreVal: {
    fontSize: 24,
    fontWeight: '900',
  },
  rallyBlock: {
    alignItems: 'center',
  },
  rallyLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  rallyVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  highRallyLabel: {
    fontSize: 10,
  },
  arenaContainer: {
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
  netLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
  },
  paddle: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1.5,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  ball: {
    position: 'absolute',
    borderRadius: 7,
    shadowColor: '#ffff00',
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  startOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startOverlayTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  startOverlaySub: {
    fontSize: 12,
  },
  touchControls: {
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
  modalRallyText: {
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
