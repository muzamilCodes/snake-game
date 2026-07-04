import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Vibration,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import axios from "axios";

const SIZE = 20;
const { width, height } = Dimensions.get("window");
const CELL = Math.floor(width * 0.7 / SIZE);

const randomPos = () => ({
  x: Math.floor(Math.random() * SIZE),
  y: Math.floor(Math.random() * SIZE),
});

const realisticSounds = {
  eat: "https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3",
  gameOver: "https://assets.mixkit.co/sfx/preview/mixkit-retro-game-over-1947.mp3",
  move: "https://assets.mixkit.co/sfx/preview/mixkit-plastic-bubble-click-1124.mp3",
  start: "https://assets.mixkit.co/sfx/preview/mixkit-game-show-intro-music-687.mp3",
};

export default function SnakeGame() {
  const [snake, setSnake] = useState([
    { x: 6, y: 10 },
    { x: 5, y: 10 },
    { x: 4, y: 10 },
  ]);
  const [food, setFood] = useState(randomPos());
  const [dir, setDir] = useState("RIGHT");
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [speed, setSpeed] = useState(120);
  const [level, setLevel] = useState(1);
  
  // Sound references
  const eatSound = useRef(null);
  const overSound = useRef(null);
  const moveSound = useRef(null);
  const startSound = useRef(null);
  
  const gameLoopRef = useRef(null);
  const dirRef = useRef("RIGHT");
  const scoreRef = useRef(0);
  const levelRef = useRef(1);
  const foodRef = useRef(randomPos());

  useEffect(() => {
    loadHighScore();
    loadSounds();
    // Initialize foodRef
    foodRef.current = randomPos();
    setFood(foodRef.current);
    
    return () => {
      // Cleanup sounds
      [eatSound, overSound, moveSound, startSound].forEach(sound => {
        if (sound.current) {
          sound.current.unloadAsync();
        }
      });
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, []);

  // Game loop setup
  useEffect(() => {
    if (gameActive && !gameOver) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
      gameLoopRef.current = setInterval(moveSnake, speed);
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameActive, gameOver, speed]);

  const loadHighScore = async () => {
    try {
      const hs = await AsyncStorage.getItem("SNAKE_HS");
      if (hs) setHighScore(parseInt(hs));
    } catch (error) {
      console.log("Error loading high score:", error);
    }
  };

  const saveHighScore = async (val) => {
    try {
      await AsyncStorage.setItem("SNAKE_HS", val.toString());
    } catch (error) {
      console.log("Error saving high score:", error);
    }
  };

  const loadSounds = async () => {
    try {
      // Configure audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });

      // Load eat sound
      const { sound: eat } = await Audio.Sound.createAsync(
        { uri: realisticSounds.eat }
      );
      eatSound.current = eat;

      // Load game over sound
      const { sound: over } = await Audio.Sound.createAsync(
        { uri: realisticSounds.gameOver }
      );
      overSound.current = over;

      // Load move sound
      const { sound: move } = await Audio.Sound.createAsync(
        { uri: realisticSounds.move }
      );
      moveSound.current = move;

      // Load start sound
      const { sound: start } = await Audio.Sound.createAsync(
        { uri: realisticSounds.start }
      );
      startSound.current = start;

    } catch (error) {
      console.log("Error loading sounds:", error);
    }
  };

  const playSound = async (soundRef) => {
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.setPositionAsync(0);
          await soundRef.current.playAsync();
        }
      }
    } catch (error) {
      console.log("Error playing sound:", error);
    }
  };

  const moveSnake = () => {
    console.log("moveSnake called, direction:", dirRef.current);
    console.log("Current food position:", foodRef.current);
    
    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };
      
      // Move based on direction
      if (dirRef.current === "RIGHT") head.x += 1;
      if (dirRef.current === "LEFT") head.x -= 1;
      if (dirRef.current === "UP") head.y -= 1;
      if (dirRef.current === "DOWN") head.y += 1;

      // Play move sound
      playSound(moveSound);

      // Wall wrap
      head.x = (head.x + SIZE) % SIZE;
      head.y = (head.y + SIZE) % SIZE;

      console.log("New head position:", head);
      console.log("Food position:", foodRef.current);

      // Self collision check
      if (prevSnake.some((s, i) => i > 0 && s.x === head.x && s.y === head.y)) {
        console.log("Self collision detected!");
        handleGameOver();
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];
      let ateFood = false;

      // Food collision check
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        console.log("Food eaten!");
        ateFood = true;
        
        // Generate new food that's not on snake
        let newFood;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loop
        
        do {
          newFood = randomPos();
          attempts++;
        } while (
          newSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y) &&
          attempts < maxAttempts
        );
        
        foodRef.current = newFood;
        setFood(newFood);
        
        // Update score
        const newScore = scoreRef.current + 10;
        scoreRef.current = newScore;
        setScore(newScore);
        
        // Update level based on new score
        const newLevel = Math.floor(newScore / 30) + 1;
        if (newLevel > levelRef.current) {
          levelRef.current = newLevel;
          setLevel(newLevel);
          const newSpeed = Math.max(50, 120 - (newLevel - 1) * 10);
          setSpeed(newSpeed);
        }

        // Update high score
        if (newScore > highScore) {
          setHighScore(newScore);
          saveHighScore(newScore);
        }
        
        // Play sound and vibrate
        playSound(eatSound);
        Vibration.vibrate(50);
        
        console.log("New score:", newScore, "New food:", newFood);
      }

      // Remove tail only if no food was eaten
      if (!ateFood) {
        newSnake.pop();
      }

      return newSnake;
    });
  };

  const handleGameOver = async () => {
    console.log("Game Over! Final score:", scoreRef.current);
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    setGameActive(false);
    setGameOver(true);
    await playSound(overSound);
    Vibration.vibrate(500);
    
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      await saveHighScore(scoreRef.current);
      Alert.alert(
        "🎉 New High Score!",
        `Congratulations! New High Score: ${scoreRef.current}`,
        [{ text: "Awesome!", style: "default" }]
      );
    }
    
    // await sendScoreOnline(score);
  };

  const changeDirection = (newDir) => {
    console.log("Changing direction to:", newDir);
    // Prevent 180-degree turns
    const oppositeDirections = {
      "UP": "DOWN",
      "DOWN": "UP",
      "LEFT": "RIGHT",
      "RIGHT": "LEFT"
    };
    
    if (dirRef.current === oppositeDirections[newDir]) {
      console.log("Prevented 180-degree turn");
      return;
    }
    
    dirRef.current = newDir;
    setDir(newDir);
    console.log("Direction changed to:", newDir);
  };

  const startGame = async () => {
    console.log("Starting game...");
    
    // Stop any existing game loop
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    await playSound(startSound);
    
    // Reset all game states
    const initialSnake = [
      { x: 6, y: 10 },
      { x: 5, y: 10 },
      { x: 4, y: 10 },
    ];
    setSnake(initialSnake);
    
    // Generate food that's not on snake
    let newFood;
    do {
      newFood = randomPos();
    } while (initialSnake.some(segment => 
      segment.x === newFood.x && segment.y === newFood.y
    ));
    
    foodRef.current = newFood;
    setFood(newFood);
    
    setDir("RIGHT");
    dirRef.current = "RIGHT";
    
    scoreRef.current = 0;
    setScore(0);
    
    levelRef.current = 1;
    setLevel(1);
    
    setSpeed(120);
    setGameOver(false);
    setGameActive(true);
    
    console.log("Game started! Initial snake:", initialSnake, "Initial food:", newFood);
  };

  const pauseGame = () => {
    console.log("Pausing game...");
    setGameActive(false);
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  };

  const resetGame = () => {
    console.log("Resetting game...");
    
    // Clear game loop
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    // Reset all states
    const initialSnake = [
      { x: 6, y: 10 },
      { x: 5, y: 10 },
      { x: 4, y: 10 },
    ];
    setSnake(initialSnake);
    
    // Generate food that's not on snake
    let newFood;
    do {
      newFood = randomPos();
    } while (initialSnake.some(segment => 
      segment.x === newFood.x && segment.y === newFood.y
    ));
    
    foodRef.current = newFood;
    setFood(newFood);
    
    setDir("RIGHT");
    dirRef.current = "RIGHT";
    
    scoreRef.current = 0;
    setScore(0);
    
    levelRef.current = 1;
    setLevel(1);
    
    setSpeed(120);
    setGameActive(false);
    setGameOver(false);
  };

  // Add keyboard controls for debugging
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!gameActive || gameOver) return;
      
      switch(e.key) {
        case 'ArrowUp': changeDirection('UP'); break;
        case 'ArrowDown': changeDirection('DOWN'); break;
        case 'ArrowLeft': changeDirection('LEFT'); break;
        case 'ArrowRight': changeDirection('RIGHT'); break;
        case ' ': gameActive ? pauseGame() : startGame(); break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameActive, gameOver]);

  // Render snake with realistic look
  const renderSnake = () => {
    return snake.map((segment, i) => {
      const isHead = i === 0;
      const isTail = i === snake.length - 1;
      
      let style = [styles.bodySegment];
      
      if (isHead) {
        style.push(styles.snakeHead);
        // Add direction-based rotation
        let rotation = 0;
        switch(dir) {
          case 'UP': rotation = 270; break;
          case 'RIGHT': rotation = 0; break;
          case 'DOWN': rotation = 90; break;
          case 'LEFT': rotation = 180; break;
        }
        style.push({ transform: [{ rotate: `${rotation}deg` }] });
      } else if (isTail) {
        style.push(styles.snakeTail);
      } else {
        style.push(styles.snakeBody);
      }

      return (
        <View
          key={`segment-${i}-${segment.x}-${segment.y}`}
          style={[
            style,
            {
              left: segment.x * CELL,
              top: segment.y * CELL,
              width: CELL,
              height: CELL,
            },
          ]}
        >
          {isHead && (
            <>
              <View style={styles.eyeLeft} />
              <View style={styles.eyeRight} />
              <View style={styles.tongue} />
            </>
          )}
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>🐍 DAKHNI SNAKE</Text>
          <Text style={styles.level}>Level: {level}</Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[styles.statText, {color: "#00ffcc", fontSize: 20}]}>🏆</Text>
            <Text style={styles.statText}>Score: {score}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statText, {color: "#ffaa00", fontSize: 20}]}>⭐</Text>
            <Text style={styles.statText}>High: {highScore}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statText, {color: "#ff3355", fontSize: 20}]}>⚡</Text>
            <Text style={styles.statText}>Speed: {Math.round(1000/speed)}</Text>
          </View>
        </View>
      </View>

      {/* Game Status Indicator */}
      <View style={styles.statusIndicator}>
        <Text style={[styles.statusText, { color: gameActive ? "#00ff00" : "#ff5555" }]}>
          Status: {gameActive ? "Playing" : gameOver ? "Game Over" : "Ready"}
        </Text>
        <Text style={styles.statusText}>Direction: {dir}</Text>
      </View>

      {/* Game Board */}
      <View style={styles.board}>
        {/* Grid lines */}
        <View style={styles.grid}>
          {Array.from({ length: SIZE + 1 }).map((_, i) => (
            <View
              key={`v${i}`}
              style={[
                styles.gridLine,
                styles.gridLineVertical,
                { left: (i * CELL) - 1 },
              ]}
            />
          ))}
          {Array.from({ length: SIZE + 1 }).map((_, i) => (
            <View
              key={`h${i}`}
              style={[
                styles.gridLine,
                styles.gridLineHorizontal,
                { top: (i * CELL) - 1 },
              ]}
            />
          ))}
        </View>

        {/* Snake */}
        {renderSnake()}

        {/* Food with animation */}
        <View style={[
          styles.food,
          {
            left: food.x * CELL,
            top: food.y * CELL,
            width: CELL,
            height: CELL,
          },
        ]}>
          <View style={styles.foodInner} />
          <View style={styles.foodGlow} />
        </View>
      </View>

      {/* Debug Info */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>Snake length: {snake.length}</Text>
        <Text style={styles.debugText}>Food: ({food.x}, {food.y})</Text>
        <Text style={styles.debugText}>Score: {score}</Text>
      </View>

      {/* Game Controls */}
      <View style={styles.gameControls}>
        <TouchableOpacity
          style={[styles.controlBtn, gameActive ? styles.pauseBtn : styles.startBtn]}
          onPress={gameActive ? pauseGame : startGame}
        >
          <Text style={[styles.controlBtnText, {fontSize: 24, marginLeft: 0}]}>
            {gameActive ? "⏸️" : "▶️"}
          </Text>
          <Text style={styles.controlBtnText}>
            {gameActive ? "Pause" : "Start"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.resetBtn]}
          onPress={resetGame}
        >
          <Text style={[styles.controlBtnText, {fontSize: 24, marginLeft: 0}]}>🔄</Text>
          <Text style={styles.controlBtnText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Direction Controls */}
      <View style={styles.directionControls}>
        <TouchableOpacity
          style={styles.dirBtn}
          onPress={() => changeDirection("UP")}
        >
          <Text style={[styles.dirBtnText, {fontSize: 30}]}>⬆️</Text>
        </TouchableOpacity>

        <View style={styles.horizontalDir}>
          <TouchableOpacity
            style={styles.dirBtn}
            onPress={() => changeDirection("LEFT")}
          >
            <Text style={[styles.dirBtnText, {fontSize: 30}]}>⬅️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dirBtn}
            onPress={() => changeDirection("DOWN")}
          >
            <Text style={[styles.dirBtnText, {fontSize: 30}]}>⬇️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dirBtn}
            onPress={() => changeDirection("RIGHT")}
          >
            <Text style={[styles.dirBtnText, {fontSize: 30}]}>➡️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Game Status */}
      {gameOver && (
        <View style={styles.gameOverOverlay}>
          <Text style={styles.gameOverText}>🎮 GAME OVER 🎮</Text>
          <Text style={styles.finalScore}>Final Score: {score}</Text>
          <Text style={styles.tapToStart}>Tap Start to Play Again!</Text>
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          ℹ️ Use arrow buttons or keyboard arrows to move the snake
        </Text>
        <Text style={styles.instructionsText}>
          🎯 Eat the red food to grow and score points
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050014",
  },
  header: {
    padding: 15,
    backgroundColor: "#0a001f",
    borderBottomWidth: 2,
    borderBottomColor: "#00ffcc",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: "#00ffcc",
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: "monospace",
    textShadowColor: "#00ffcc",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  level: {
    color: "#ffaa00",
    fontSize: 18,
    fontWeight: "bold",
    backgroundColor: "#1a0033",
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a0033",
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: "center",
  },
  statText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  statusIndicator: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: "#0a001f",
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
  },
  statusText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  board: {
    width: CELL * SIZE,
    height: CELL * SIZE,
    backgroundColor: "#02020a",
    borderWidth: 3,
    borderColor: "#00ffcc",
    borderRadius: 10,
    position: "relative",
    alignSelf: "center",
    marginVertical: 20,
    overflow: "hidden",
    shadowColor: "#00ffcc",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  grid: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  gridLine: {
    position: "absolute",
    backgroundColor: "#00ffcc20",
  },
  gridLineVertical: {
    width: 1,
    height: "100%",
  },
  gridLineHorizontal: {
    height: 1,
    width: "100%",
  },
  bodySegment: {
    position: "absolute",
    borderRadius: 6,
  },
  snakeHead: {
    backgroundColor: "#00ffcc",
    borderWidth: 2,
    borderColor: "#00cc99",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  snakeBody: {
    backgroundColor: "#00cc99",
    borderWidth: 1,
    borderColor: "#009966",
    borderRadius: 6,
  },
  snakeTail: {
    backgroundColor: "#009966",
    borderWidth: 1,
    borderColor: "#006644",
    borderRadius: 4,
  },
  eyeLeft: {
    position: "absolute",
    width: 6,
    height: 6,
    backgroundColor: "#000",
    borderRadius: 3,
    top: "30%",
    left: "25%",
  },
  eyeRight: {
    position: "absolute",
    width: 6,
    height: 6,
    backgroundColor: "#000",
    borderRadius: 3,
    top: "30%",
    right: "25%",
  },
  tongue: {
    position: "absolute",
    width: 10,
    height: 4,
    backgroundColor: "#ff3355",
    borderRadius: 2,
    top: "60%",
    transform: [{ rotate: "45deg" }],
  },
  food: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  foodInner: {
    width: "70%",
    height: "70%",
    backgroundColor: "#ff3355",
    borderRadius: CELL * 0.7 / 2,
    shadowColor: "#ff3355",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  foodGlow: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "#ff3355",
    borderRadius: CELL / 2,
    opacity: 0.3,
    transform: [{ scale: 1.2 }],
  },
  debugInfo: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 5,
    backgroundColor: "#0a001f",
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  debugText: {
    color: "#aaa",
    fontSize: 12,
  },
  gameControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  controlBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 5,
  },
  startBtn: {
    backgroundColor: "#00cc66",
  },
  pauseBtn: {
    backgroundColor: "#ffaa00",
  },
  resetBtn: {
    backgroundColor: "#ff3355",
  },
  controlBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  directionControls: {
    alignItems: "center",
    marginBottom: 20,
  },
  horizontalDir: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -20,
  },
  dirBtn: {
    padding: 10,
    marginHorizontal: 15,
    backgroundColor: "#1a0033",
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#00ffcc",
    shadowColor: "#00ffcc",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  dirBtnText: {
    color: "#00ffcc",
    textAlign: "center",
  },
  gameOverOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -150 }, { translateY: -50 }],
    width: 300,
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderRadius: 15,
    borderWidth: 3,
    borderColor: "#ff3355",
    alignItems: "center",
    zIndex: 100,
  },
  gameOverText: {
    color: "#ff3355",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  finalScore: {
    color: "#00ffcc",
    fontSize: 24,
    marginBottom: 10,
  },
  tapToStart: {
    color: "#ffaa00",
    fontSize: 16,
  },
  instructions: {
    alignItems: "center",
    padding: 10,
    backgroundColor: "#0a001f",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#00ffcc",
  },
  instructionsText: {
    color: "#00ffcc",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 2,
  },
});