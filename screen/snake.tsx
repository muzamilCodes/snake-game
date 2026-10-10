import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import { THEMES, ThemeColors } from "../utils/themes";
import { soundManager } from "../utils/sound";
import {
  getPlayerProfile,
  updatePlayerStats,
  addLeaderboardEntry,
  PlayerProfile,
} from "../utils/storage";

const SIZE = 20;

interface Point {
  x: number;
  y: number;
}

interface SpecialFood {
  x: number;
  y: number;
  type: 'golden' | 'frost';
  expiresAt: number;
}

interface FloatingScore {
  id: number;
  x: number;
  y: number;
  text: string;
}

export default function SnakeGame({ navigation, route }: any) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();

  const themeKey = route?.params?.theme || 'neon';
  const theme: ThemeColors = THEMES[themeKey as keyof typeof THEMES] || THEMES.neon;
  const difficulty: 'Casual' | 'Normal' | 'Hardcore' | 'Insane' =
    route?.params?.difficulty || 'Normal';
  const solidBorders: boolean = !!route?.params?.solidBorders;

  // Board Sizing (Responsive across Web, Desktop & Mobile)
  const maxBoardDim = Math.min(Math.min(winWidth * 0.94, winHeight * 0.50), 440);
  const CELL = Math.max(14, Math.floor(maxBoardDim / SIZE));
  const BOARD_SIZE = CELL * SIZE;

  // Speeds per difficulty
  const baseSpeed =
    difficulty === 'Casual' ? 140 :
    difficulty === 'Normal' ? 100 :
    difficulty === 'Hardcore' ? 75 : 55;

  const minSpeed =
    difficulty === 'Casual' ? 75 :
    difficulty === 'Normal' ? 50 :
    difficulty === 'Hardcore' ? 38 : 28;

  // State
  const [snake, setSnake] = useState<Point[]>([
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ]);
  const [food, setFood] = useState<Point>({ x: 14, y: 10 });
  const [specialFood, setSpecialFood] = useState<SpecialFood | null>(null);
  const [dir, setDir] = useState<string>("RIGHT");
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [currentSpeed, setCurrentSpeed] = useState<number>(baseSpeed);
  const [combo, setCombo] = useState<number>(1);
  const [slowMoActive, setSlowMoActive] = useState<boolean>(false);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const [soundOn, setSoundOn] = useState<boolean>(soundManager.enabled);

  // Profile & Highscore Submission
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [playerNameInput, setPlayerNameInput] = useState<string>('');
  const [scoreSaved, setScoreSaved] = useState<boolean>(false);
  const [applesEaten, setApplesEaten] = useState<number>(0);

  // Refs for loop
  const dirRef = useRef<string>("RIGHT");
  const nextDirRef = useRef<string>("RIGHT");
  const gameLoopRef = useRef<any>(null);
  const specialTimerRef = useRef<any>(null);
  const slowMoTimerRef = useRef<any>(null);
  const lastEatTimeRef = useRef<number>(0);
  const foodRef = useRef<Point>({ x: 14, y: 10 });
  const specialFoodRef = useRef<SpecialFood | null>(null);
  const scoreRef = useRef<number>(0);

  foodRef.current = food;
  specialFoodRef.current = specialFood;
  scoreRef.current = score;

  const getRandomPosition = (currentSnake: Point[]): Point => {
    let p: Point;
    let attempts = 0;
    do {
      p = {
        x: Math.floor(Math.random() * SIZE),
        y: Math.floor(Math.random() * SIZE),
      };
      attempts++;
    } while (
      currentSnake.some((s) => s.x === p.x && s.y === p.y) &&
      attempts < 100
    );
    return p;
  };

  // Load user data
  useEffect(() => {
    (async () => {
      const prof = await getPlayerProfile();
      setProfile(prof);
      setHighScore(prof.bestScore);
      setPlayerNameInput(prof.name);
    })();
  }, []);

  // Keyboard navigation on Web
  useEffect(() => {
    const handleKeyDown = (e: any) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePause();
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        restartGame();
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          changeDirection('RIGHT');
          break;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [gameActive, isPaused, gameOver]);

  // Game Loop
  useEffect(() => {
    if (gameActive && !isPaused && !gameOver) {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      gameLoopRef.current = setInterval(tick, currentSpeed);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameActive, isPaused, gameOver, currentSpeed]);

  const changeDirection = (newDir: string) => {
    const opposites: Record<string, string> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };

    if (opposites[newDir] === dirRef.current) return;
    nextDirRef.current = newDir;

    if (!gameActive && !gameOver) {
      startGame();
    }
  };

  const spawnSpecialItem = (currentSnake: Point[]) => {
    if (Math.random() < 0.35 && !specialFoodRef.current) {
      const type = Math.random() < 0.6 ? 'golden' : 'frost';
      const pos = getRandomPosition(currentSnake);
      const special: SpecialFood = {
        x: pos.x,
        y: pos.y,
        type,
        expiresAt: Date.now() + 7000,
      };
      setSpecialFood(special);

      if (specialTimerRef.current) clearTimeout(specialTimerRef.current);
      specialTimerRef.current = setTimeout(() => {
        setSpecialFood(null);
      }, 7000);
    }
  };

  const showFloatingPopup = (x: number, y: number, text: string) => {
    const id = Date.now() + Math.random();
    setFloatingScores((prev) => [...prev, { id, x, y, text }]);
    setTimeout(() => {
      setFloatingScores((prev) => prev.filter((item) => item.id !== id));
    }, 900);
  };

  const tick = () => {
    dirRef.current = nextDirRef.current;
    setDir(dirRef.current);

    setSnake((prevSnake) => {
      const head = { ...prevSnake[0] };

      if (dirRef.current === 'UP') head.y -= 1;
      if (dirRef.current === 'DOWN') head.y += 1;
      if (dirRef.current === 'LEFT') head.x -= 1;
      if (dirRef.current === 'RIGHT') head.x += 1;

      // Solid borders vs Wrap
      if (solidBorders) {
        if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE) {
          triggerGameOver();
          return prevSnake;
        }
      } else {
        head.x = (head.x + SIZE) % SIZE;
        head.y = (head.y + SIZE) % SIZE;
      }

      // Self collision
      if (prevSnake.some((s, idx) => idx > 0 && s.x === head.x && s.y === head.y)) {
        triggerGameOver();
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];
      let hasEaten = false;

      // Check standard food
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        hasEaten = true;
        soundManager.playEat(false);

        // Combo handling
        const now = Date.now();
        let newCombo = 1;
        if (now - lastEatTimeRef.current < 2500) {
          newCombo = Math.min(4, combo + 1);
        }
        setCombo(newCombo);
        lastEatTimeRef.current = now;

        const earned = 10 * newCombo;
        const newScore = scoreRef.current + earned;
        scoreRef.current = newScore;
        setScore(newScore);
        setApplesEaten((prev) => prev + 1);

        showFloatingPopup(head.x, head.y, `+${earned}${newCombo > 1 ? ` (x${newCombo})` : ''}`);

        // Level up and speed scaling
        const newLevel = Math.floor(newScore / 40) + 1;
        setLevel(newLevel);
        if (!slowMoActive) {
          const speedStep = Math.max(minSpeed, baseSpeed - (newLevel - 1) * 6);
          setCurrentSpeed(speedStep);
        }

        // New food
        const nextFood = getRandomPosition(newSnake);
        setFood(nextFood);

        // Chance to spawn special powerup
        spawnSpecialItem(newSnake);
      }

      // Check special food
      if (
        specialFoodRef.current &&
        head.x === specialFoodRef.current.x &&
        head.y === specialFoodRef.current.y
      ) {
        hasEaten = true;
        const spec = specialFoodRef.current;
        setSpecialFood(null);

        if (spec.type === 'golden') {
          soundManager.playEat(true);
          const bonus = 30;
          const newScore = scoreRef.current + bonus;
          scoreRef.current = newScore;
          setScore(newScore);
          showFloatingPopup(head.x, head.y, `+30 ⭐`);
        } else if (spec.type === 'frost') {
          soundManager.playPowerup();
          setSlowMoActive(true);
          setCurrentSpeed(baseSpeed + 50);
          showFloatingPopup(head.x, head.y, `❄️ SLOW-MO`);

          if (slowMoTimerRef.current) clearTimeout(slowMoTimerRef.current);
          slowMoTimerRef.current = setTimeout(() => {
            setSlowMoActive(false);
            const normalLvlSpeed = Math.max(minSpeed, baseSpeed - (level - 1) * 6);
            setCurrentSpeed(normalLvlSpeed);
          }, 5000);
        }
      }

      if (!hasEaten) {
        newSnake.pop();
      }

      return newSnake;
    });
  };

  const triggerGameOver = () => {
    soundManager.playGameOver();
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    setGameActive(false);
    setGameOver(true);

    const finalScore = scoreRef.current;
    if (finalScore > highScore) {
      setHighScore(finalScore);
    }

    // Auto update player stats
    updatePlayerStats(finalScore, applesEaten);
  };

  const startGame = () => {
    soundManager.playClick();
    const initSnake = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ];
    setSnake(initSnake);
    dirRef.current = 'RIGHT';
    nextDirRef.current = 'RIGHT';
    setDir('RIGHT');

    const newFood = getRandomPosition(initSnake);
    setFood(newFood);
    setSpecialFood(null);

    setScore(0);
    scoreRef.current = 0;
    setLevel(1);
    setCombo(1);
    setApplesEaten(0);
    setCurrentSpeed(baseSpeed);
    setSlowMoActive(false);

    setScoreSaved(false);
    setGameOver(false);
    setIsPaused(false);
    setGameActive(true);
  };

  const restartGame = () => {
    startGame();
  };

  const togglePause = () => {
    if (!gameActive || gameOver) return;
    soundManager.playClick();
    setIsPaused(!isPaused);
  };

  const handleSaveScoreToLeaderboard = async () => {
    if (scoreSaved) return;
    soundManager.playPowerup();
    await addLeaderboardEntry(
      playerNameInput || 'SnakeRider',
      score,
      level,
      difficulty,
      profile?.avatar || '🐍'
    );
    setScoreSaved(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" />

      {/* Top Navigation & Status Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.headerBg, borderBottomColor: theme.accent }]}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => {
            soundManager.playClick();
            navigation.goBack();
          }}
        >
          <Text style={[styles.navBtnText, { color: theme.accent }]}>‹ Home</Text>
        </TouchableOpacity>

        <View style={styles.topInfo}>
          <Text style={[styles.modeBadge, { color: theme.accentSecondary }]}>
            {difficulty.toUpperCase()} {solidBorders ? '• 🧱 WALLS' : ''}
          </Text>
        </View>

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => {
              const nextVal = !soundOn;
              setSoundOn(nextVal);
              soundManager.enabled = nextVal;
              if (nextVal) soundManager.playClick();
            }}
          >
            <Text style={styles.actionIconText}>{soundOn ? '🔊' : '🔇'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionIconBtn, isPaused && { backgroundColor: theme.accent }]}
            onPress={togglePause}
          >
            <Text style={styles.actionIconText}>{isPaused ? '▶' : '⏸'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Score & HUD Ribbon */}
      <View style={[styles.hudRibbon, { backgroundColor: theme.cardBg }]}>
        <View style={styles.hudBlock}>
          <Text style={[styles.hudLabel, { color: theme.textSecondary }]}>SCORE</Text>
          <Text style={[styles.hudValue, { color: theme.accent }]}>{score}</Text>
        </View>

        <View style={styles.hudBlock}>
          <Text style={[styles.hudLabel, { color: theme.textSecondary }]}>LEVEL</Text>
          <Text style={[styles.hudValue, { color: theme.accentSecondary }]}>{level}</Text>
        </View>

        <View style={styles.hudBlock}>
          <Text style={[styles.hudLabel, { color: theme.textSecondary }]}>BEST</Text>
          <Text style={[styles.hudValue, { color: '#ffd700' }]}>{highScore}</Text>
        </View>

        {combo > 1 && (
          <View style={[styles.comboBadge, { backgroundColor: theme.accentSecondary }]}>
            <Text style={styles.comboText}>x{combo} COMBO</Text>
          </View>
        )}

        {slowMoActive && (
          <View style={[styles.comboBadge, { backgroundColor: '#00f0ff' }]}>
            <Text style={[styles.comboText, { color: '#000' }]}>❄️ SLOW</Text>
          </View>
        )}
      </View>

      {/* Center Game Board Container */}
      <View style={styles.boardWrapper}>
        <View
          style={[
            styles.board,
            {
              width: BOARD_SIZE,
              height: BOARD_SIZE,
              backgroundColor: theme.boardBg,
              borderColor: solidBorders ? '#ff2a85' : theme.accent,
            },
          ]}
        >
          {/* Grid lines */}
          <View style={styles.gridContainer}>
            {Array.from({ length: SIZE + 1 }).map((_, i) => (
              <View
                key={`v-${i}`}
                style={[
                  styles.gridLineV,
                  { left: i * CELL, backgroundColor: theme.gridLine },
                ]}
              />
            ))}
            {Array.from({ length: SIZE + 1 }).map((_, i) => (
              <View
                key={`h-${i}`}
                style={[
                  styles.gridLineH,
                  { top: i * CELL, backgroundColor: theme.gridLine },
                ]}
              />
            ))}
          </View>

          {/* Regular Food */}
          <View
            style={[
              styles.foodElem,
              {
                left: food.x * CELL,
                top: food.y * CELL,
                width: CELL,
                height: CELL,
              },
            ]}
          >
            <View style={[styles.foodCore, { backgroundColor: theme.foodColor }]} />
            <View style={[styles.foodHalo, { backgroundColor: theme.foodGlow }]} />
          </View>

          {/* Special Food (Star or Frost) */}
          {specialFood && (
            <View
              style={[
                styles.foodElem,
                {
                  left: specialFood.x * CELL,
                  top: specialFood.y * CELL,
                  width: CELL,
                  height: CELL,
                },
              ]}
            >
              <Text style={{ fontSize: CELL * 0.9 }}>
                {specialFood.type === 'golden' ? '⭐' : '❄️'}
              </Text>
            </View>
          )}

          {/* Snake Segments */}
          {snake.map((seg, idx) => {
            const isHead = idx === 0;
            const isTail = idx === snake.length - 1;

            return (
              <View
                key={`s-${idx}`}
                style={[
                  styles.segment,
                  {
                    left: seg.x * CELL,
                    top: seg.y * CELL,
                    width: CELL,
                    height: CELL,
                    backgroundColor: isHead
                      ? theme.snakeHead
                      : isTail
                      ? theme.snakeTail
                      : theme.snakeBody,
                    borderColor: isHead ? theme.snakeHeadBorder : theme.snakeBodyBorder,
                    borderRadius: isHead ? 6 : isTail ? 4 : 5,
                  },
                ]}
              >
                {isHead && (
                  <View style={styles.headFeatures}>
                    <View style={styles.eye} />
                    <View style={styles.eye} />
                  </View>
                )}
              </View>
            );
          })}

          {/* Floating Score Popups */}
          {floatingScores.map((item) => (
            <View
              key={item.id}
              style={[
                styles.floatingPopup,
                { left: item.x * CELL, top: item.y * CELL - 14 },
              ]}
            >
              <Text style={[styles.floatingPopupText, { color: theme.accent }]}>
                {item.text}
              </Text>
            </View>
          ))}

          {/* Ready Overlay */}
          {!gameActive && !gameOver && (
            <TouchableOpacity
              style={styles.overlayCenter}
              onPress={startGame}
              activeOpacity={0.9}
            >
              <Text style={[styles.tapToPlayTitle, { color: theme.accent }]}>TAP TO START</Text>
              <Text style={[styles.tapToPlaySub, { color: theme.textSecondary }]}>
                or press Arrow Key / WASD
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Direction Touch D-Pad */}
      <View style={styles.controlsSection}>
        <View style={styles.dpad}>
          <TouchableOpacity
            style={[styles.dpadBtn, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}
            onPress={() => changeDirection('UP')}
            activeOpacity={0.7}
          >
            <Text style={[styles.dpadText, { color: theme.accent }]}>▲</Text>
          </TouchableOpacity>

          <View style={styles.dpadRow}>
            <TouchableOpacity
              style={[styles.dpadBtn, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}
              onPress={() => changeDirection('LEFT')}
              activeOpacity={0.7}
            >
              <Text style={[styles.dpadText, { color: theme.accent }]}>◀</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dpadCenterBtn,
                { backgroundColor: theme.accent },
              ]}
              onPress={gameActive ? togglePause : startGame}
              activeOpacity={0.8}
            >
              <Text style={styles.dpadCenterText}>
                {gameActive ? (isPaused ? '▶' : '⏸') : 'GO'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dpadBtn, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}
              onPress={() => changeDirection('RIGHT')}
              activeOpacity={0.7}
            >
              <Text style={[styles.dpadText, { color: theme.accent }]}>▶</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.dpadBtn, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}
            onPress={() => changeDirection('DOWN')}
            activeOpacity={0.7}
          >
            <Text style={[styles.dpadText, { color: theme.accent }]}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Game Over Modal */}
      <Modal visible={gameOver} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.cardBg, borderColor: '#ff0055' }]}>
            <Text style={styles.modalSkull}>💀</Text>
            <Text style={styles.gameOverTitle}>GAME OVER</Text>

            <View style={styles.finalScoreWrap}>
              <Text style={[styles.finalScoreVal, { color: theme.accent }]}>{score}</Text>
              <Text style={[styles.finalScoreSub, { color: theme.textSecondary }]}>POINTS SCORED</Text>
            </View>

            {score >= highScore && score > 0 && (
              <View style={styles.newRecordBadge}>
                <Text style={styles.newRecordText}>🏆 NEW HIGH SCORE RECORD! 🏆</Text>
              </View>
            )}

            {/* Save to Leaderboard Input */}
            <View style={styles.saveLeaderboardSection}>
              <TextInput
                style={[
                  styles.nameInput,
                  {
                    color: theme.textPrimary,
                    borderColor: theme.accent,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                  },
                ]}
                value={playerNameInput}
                onChangeText={setPlayerNameInput}
                placeholder="Enter player name..."
                placeholderTextColor="#667799"
                maxLength={16}
                editable={!scoreSaved}
              />
              <TouchableOpacity
                style={[
                  styles.saveScoreBtn,
                  { backgroundColor: scoreSaved ? '#00cc66' : theme.accent },
                ]}
                onPress={handleSaveScoreToLeaderboard}
                disabled={scoreSaved}
              >
                <Text style={styles.saveScoreBtnText}>
                  {scoreSaved ? '✓ RECORDED' : 'SAVE TO HALL OF FAME'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: theme.accent }]}
                onPress={startGame}
              >
                <Text style={styles.modalActionText}>PLAY AGAIN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalActionBtn,
                  { backgroundColor: 'transparent', borderColor: theme.accent, borderWidth: 1.5 },
                ]}
                onPress={() => {
                  setGameOver(false);
                  navigation.navigate('Leaderboard', { theme: themeKey });
                }}
              >
                <Text style={[styles.modalActionText, { color: theme.accent }]}>LEADERBOARD</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pause Modal */}
      <Modal visible={isPaused && gameActive} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}>
            <Text style={styles.pauseIcon}>⏸</Text>
            <Text style={[styles.pauseTitle, { color: theme.accent }]}>GAME PAUSED</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: theme.accent }]}
                onPress={() => setIsPaused(false)}
              >
                <Text style={styles.modalActionText}>RESUME</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalActionBtn,
                  { backgroundColor: 'transparent', borderColor: theme.accent, borderWidth: 1.5 },
                ]}
                onPress={restartGame}
              >
                <Text style={[styles.modalActionText, { color: theme.accent }]}>RESTART</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalActionBtn,
                  { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1 },
                ]}
                onPress={() => {
                  setIsPaused(false);
                  setGameActive(false);
                  navigation.goBack();
                }}
              >
                <Text style={[styles.modalActionText, { color: theme.textSecondary }]}>EXIT TO HOME</Text>
              </TouchableOpacity>
            </View>
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
  navBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  navBtnText: {
    fontSize: 17,
    fontWeight: '700',
  },
  topInfo: {
    alignItems: 'center',
  },
  modeBadge: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  actionIconText: {
    fontSize: 16,
    color: '#fff',
  },
  hudRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  hudBlock: {
    alignItems: 'center',
  },
  hudLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hudValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  comboBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comboText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
  },
  boardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  board: {
    borderWidth: 2,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  gridContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  gridLineV: {
    position: 'absolute',
    width: 1,
    height: '100%',
  },
  gridLineH: {
    position: 'absolute',
    height: 1,
    width: '100%',
  },
  foodElem: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodCore: {
    width: '70%',
    height: '70%',
    borderRadius: 50,
  },
  foodHalo: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 50,
    opacity: 0.5,
  },
  segment: {
    position: 'absolute',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headFeatures: {
    flexDirection: 'row',
    gap: 4,
  },
  eye: {
    width: 3,
    height: 3,
    backgroundColor: '#000',
    borderRadius: 1.5,
  },
  floatingPopup: {
    position: 'absolute',
    zIndex: 20,
  },
  floatingPopupText: {
    fontSize: 14,
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  overlayCenter: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tapToPlayTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  tapToPlaySub: {
    fontSize: 12,
  },
  controlsSection: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  dpad: {
    alignItems: 'center',
    gap: 6,
  },
  dpadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dpadBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dpadCenterBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenterText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
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
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 2,
    padding: 22,
    alignItems: 'center',
    gap: 12,
  },
  modalSkull: {
    fontSize: 42,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ff0055',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  finalScoreWrap: {
    alignItems: 'center',
    marginVertical: 4,
  },
  finalScoreVal: {
    fontSize: 40,
    fontWeight: '900',
  },
  finalScoreSub: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  newRecordBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: '#ffd700',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  newRecordText: {
    color: '#ffd700',
    fontWeight: '800',
    fontSize: 12,
  },
  saveLeaderboardSection: {
    width: '100%',
    gap: 8,
    marginTop: 6,
  },
  nameInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveScoreBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveScoreBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalButtons: {
    width: '100%',
    gap: 10,
    marginTop: 10,
  },
  modalActionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pauseIcon: {
    fontSize: 40,
  },
  pauseTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
});
