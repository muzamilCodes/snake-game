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
  ScrollView,
} from 'react-native';
import { THEMES, ThemeColors } from '../utils/themes';
import { soundManager } from '../utils/sound';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TrafficCar {
  id: number;
  lane: number; // 0, 1, 2
  y: number;
  speed: number;
  color: string;
  type: 'car' | 'truck' | 'police';
  emoji: string;
}

interface RoadPickup {
  id: number;
  lane: number;
  y: number;
  type: 'nitro' | 'coin' | 'shield';
  emoji: string;
}

interface LevelConfig {
  level: number;
  name: string;
  themeName: string;
  targetDist: number; // meters
  baseSpeed: number; // km/h
  trafficRate: number;
  bgColor: string;
  roadColor: string;
  stripeColor: string;
  unlockedByDefault?: boolean;
}

const RACING_LEVELS: LevelConfig[] = [
  { level: 1, name: 'Neon Boulevard', themeName: 'Dusk Cruise', targetDist: 2000, baseSpeed: 140, trafficRate: 0.02, bgColor: '#060919', roadColor: '#0a0d1f', stripeColor: '#00f0ff', unlockedByDefault: true },
  { level: 2, name: 'Cyber City Night', themeName: 'Downtown Traffic', targetDist: 2400, baseSpeed: 160, trafficRate: 0.025, bgColor: '#050714', roadColor: '#080a18', stripeColor: '#ff007f' },
  { level: 3, name: 'Rainstorm Expressway', themeName: 'Wet Asphalt', targetDist: 2800, baseSpeed: 175, trafficRate: 0.028, bgColor: '#040b17', roadColor: '#081220', stripeColor: '#00ffff' },
  { level: 4, name: 'Sunset Boulevard', themeName: 'Golden Hour', targetDist: 3200, baseSpeed: 190, trafficRate: 0.03, bgColor: '#19071c', roadColor: '#240a29', stripeColor: '#ffaa00' },
  { level: 5, name: 'Midnight Tunnel', themeName: 'Enclosed Tube', targetDist: 3600, baseSpeed: 210, trafficRate: 0.033, bgColor: '#090909', roadColor: '#121212', stripeColor: '#00ff66' },
  { level: 6, name: 'Tokyo Outrun', themeName: 'Police Alert', targetDist: 4000, baseSpeed: 225, trafficRate: 0.035, bgColor: '#0d0419', roadColor: '#17062a', stripeColor: '#ff0055' },
  { level: 7, name: 'Hyper Grid Circuit', themeName: 'Digital Highway', targetDist: 4500, baseSpeed: 240, trafficRate: 0.038, bgColor: '#00141a', roadColor: '#00222b', stripeColor: '#00e5ff' },
  { level: 8, name: 'Desert Skyline', themeName: 'Dust & Nitro', targetDist: 5000, baseSpeed: 260, trafficRate: 0.04, bgColor: '#1c0f05', roadColor: '#261609', stripeColor: '#ff7700' },
  { level: 9, name: 'Orbital Skyway', themeName: 'Stratosphere Bridge', targetDist: 5500, baseSpeed: 280, trafficRate: 0.042, bgColor: '#0c0521', roadColor: '#130833', stripeColor: '#bd00ff' },
  { level: 10, name: 'Apex Grand Prix', themeName: 'Championship Finale', targetDist: 6500, baseSpeed: 310, trafficRate: 0.045, bgColor: '#040714', roadColor: '#080d24', stripeColor: '#ffd700' },
];

export default function NeonRacing({ navigation, route }: any) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const themeKey = route?.params?.theme || 'neon';
  const theme: ThemeColors = THEMES[themeKey as keyof typeof THEMES] || THEMES.neon;

  const trackW = Math.min(winWidth * 0.94, 430);
  const trackH = Math.min(winHeight * 0.58, 540);
  const numLanes = 3;
  const laneW = trackW / numLanes;
  const carW = 44;
  const carH = 70;

  // Level & progression
  const [currentLevelNum, setCurrentLevelNum] = useState<number>(1);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
  const [levelSelectVisible, setLevelSelectVisible] = useState<boolean>(false);

  // Gameplay state
  const [playerLane, setPlayerLane] = useState<number>(1); // 0 (Left), 1 (Mid), 2 (Right)
  const [distanceDriven, setDistanceDriven] = useState<number>(0);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [nitroFuel, setNitroFuel] = useState<number>(100);
  const [isNitroActive, setIsNitroActive] = useState<boolean>(false);
  const [coinsCollected, setCoinsCollected] = useState<number>(0);
  const [hasShield, setHasShield] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [raceVictory, setRaceVictory] = useState<boolean>(false);

  // Entities
  const [traffic, setTraffic] = useState<TrafficCar[]>([]);
  const [pickups, setPickups] = useState<RoadPickup[]>([]);
  const [roadOffset, setRoadOffset] = useState<number>(0);

  // Refs
  const laneRef = useRef<number>(1);
  const distRef = useRef<number>(0);
  const speedRef = useRef<number>(0);
  const nitroRef = useRef<number>(100);
  const isNitroRef = useRef<boolean>(false);
  const trafficRef = useRef<TrafficCar[]>([]);
  const pickupsRef = useRef<RoadPickup[]>([]);
  const shieldRef = useRef<boolean>(false);
  const coinsRef = useRef<number>(0);
  const loopRef = useRef<any>(null);

  const curLevelConfig = RACING_LEVELS.find((l) => l.level === currentLevelNum) || RACING_LEVELS[0];

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('RACING_UNLOCKED_LEVELS');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setUnlockedLevels(parsed);
        }
      } catch (_) {}
    })();
  }, []);

  const saveUnlockedLevels = async (levels: number[]) => {
    try {
      await AsyncStorage.setItem('RACING_UNLOCKED_LEVELS', JSON.stringify(levels));
    } catch (_) {}
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: any) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        triggerNitro();
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        changeLane(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        changeLane(1);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        triggerNitro();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [gameActive, isPaused, gameOver]);

  // Main Game Loop
  useEffect(() => {
    if (gameActive && !isPaused && !gameOver && !raceVictory) {
      if (loopRef.current) clearInterval(loopRef.current);
      loopRef.current = setInterval(tick, 18);
    } else {
      if (loopRef.current) clearInterval(loopRef.current);
    }
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [gameActive, isPaused, gameOver, raceVictory, currentLevelNum, trackH]);

  const changeLane = (dir: number) => {
    if (!gameActive || gameOver || raceVictory) return;
    const next = Math.max(0, Math.min(2, laneRef.current + dir));
    if (next !== laneRef.current) {
      soundManager.playScreech();
      laneRef.current = next;
      setPlayerLane(next);
    }
  };

  const triggerNitro = () => {
    if (!gameActive || gameOver || raceVictory) return;
    if (nitroRef.current > 15) {
      soundManager.playNitro();
      isNitroRef.current = true;
      setIsNitroActive(true);
      setTimeout(() => {
        isNitroRef.current = false;
        setIsNitroActive(false);
      }, 2200);
    }
  };

  const spawnTrafficAndPickups = () => {
    // Traffic car spawn
    if (Math.random() < curLevelConfig.trafficRate) {
      const freeLane = Math.floor(Math.random() * numLanes);
      const isAlreadyOccupied = trafficRef.current.some(
        (t) => t.lane === freeLane && t.y < 120
      );

      if (!isAlreadyOccupied) {
        const types: Array<'car' | 'truck' | 'police'> = ['car', 'car', 'truck', 'police'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        const emoji = chosenType === 'truck' ? '🚛' : chosenType === 'police' ? '🚓' : '🏎️';
        const color = chosenType === 'truck' ? '#ffaa00' : chosenType === 'police' ? '#00e5ff' : '#ff0055';

        trafficRef.current.push({
          id: Date.now() + Math.random(),
          lane: freeLane,
          y: -80,
          speed: chosenType === 'truck' ? 1.8 : 3.2,
          type: chosenType,
          emoji,
          color,
        });
      }
    }

    // Pickup spawn
    if (Math.random() < 0.018) {
      const pLane = Math.floor(Math.random() * numLanes);
      const pType = Math.random() < 0.5 ? 'coin' : Math.random() < 0.8 ? 'nitro' : 'shield';
      const emoji = pType === 'coin' ? '🟡' : pType === 'nitro' ? '⛽' : '🛡️';

      pickupsRef.current.push({
        id: Date.now() + Math.random(),
        lane: pLane,
        y: -50,
        type: pType,
        emoji,
      });
    }
  };

  const tick = () => {
    const isNitro = isNitroRef.current;
    let targetSpeed = curLevelConfig.baseSpeed;
    if (isNitro) {
      targetSpeed += 95;
      nitroRef.current = Math.max(0, nitroRef.current - 0.7);
      setNitroFuel(Math.round(nitroRef.current));
      if (nitroRef.current <= 0) {
        isNitroRef.current = false;
        setIsNitroActive(false);
      }
    } else {
      nitroRef.current = Math.min(100, nitroRef.current + 0.1);
      setNitroFuel(Math.round(nitroRef.current));
    }

    speedRef.current = targetSpeed;
    setSpeedKmh(Math.round(targetSpeed));

    // Update Distance
    const metersAdvanced = targetSpeed * 0.045;
    distRef.current += metersAdvanced;
    setDistanceDriven(Math.round(distRef.current));

    // Road animation offset
    setRoadOffset((prev) => (prev + targetSpeed * 0.07) % 60);

    // Check Victory
    if (distRef.current >= curLevelConfig.targetDist) {
      triggerVictory();
      return;
    }

    spawnTrafficAndPickups();

    // Move traffic
    const activeTraffic: TrafficCar[] = [];
    const playerY = trackH - carH - 30;

    for (let t of trafficRef.current) {
      // Traffic moves down relative to player speed
      t.y += 4.5 + (targetSpeed / 55) - t.speed;

      // Collision Detection
      if (
        t.lane === laneRef.current &&
        t.y + 55 >= playerY &&
        t.y <= playerY + carH - 10
      ) {
        if (shieldRef.current) {
          // Shield absorbs crash!
          soundManager.playExplosion();
          shieldRef.current = false;
          setHasShield(false);
        } else {
          // Crash!
          soundManager.playExplosion();
          setGameOver(true);
          setGameActive(false);
          return;
        }
      } else if (t.y < trackH + 90) {
        activeTraffic.push(t);
      }
    }
    trafficRef.current = activeTraffic;
    setTraffic(activeTraffic);

    // Move pickups
    const activePickups: RoadPickup[] = [];
    for (let p of pickupsRef.current) {
      p.y += 3.8 + (targetSpeed / 55);

      if (
        p.lane === laneRef.current &&
        p.y + 25 >= playerY &&
        p.y <= playerY + carH
      ) {
        // Collect pickup
        if (p.type === 'coin') {
          soundManager.playCoin();
          coinsRef.current += 1;
          setCoinsCollected(coinsRef.current);
          setScore((s) => s + 50);
        } else if (p.type === 'nitro') {
          soundManager.playPowerup();
          nitroRef.current = Math.min(100, nitroRef.current + 40);
          setNitroFuel(Math.round(nitroRef.current));
        } else if (p.type === 'shield') {
          soundManager.playPowerup();
          shieldRef.current = true;
          setHasShield(true);
        }
      } else if (p.y < trackH + 50) {
        activePickups.push(p);
      }
    }
    pickupsRef.current = activePickups;
    setPickups(activePickups);

    // Passive score accumulation
    setScore((s) => s + 2);
  };

  const triggerVictory = () => {
    soundManager.playPowerup();
    setRaceVictory(true);
    setGameActive(false);

    // Unlock next level
    if (currentLevelNum < 10) {
      const nextLvl = currentLevelNum + 1;
      if (!unlockedLevels.includes(nextLvl)) {
        const updated = [...unlockedLevels, nextLvl];
        setUnlockedLevels(updated);
        saveUnlockedLevels(updated);
      }
    }
  };

  const startRace = (lvlNum: number = currentLevelNum) => {
    soundManager.playEngineRev();
    setCurrentLevelNum(lvlNum);
    laneRef.current = 1;
    distRef.current = 0;
    nitroRef.current = 100;
    isNitroRef.current = false;
    trafficRef.current = [];
    pickupsRef.current = [];
    shieldRef.current = false;
    coinsRef.current = 0;

    setPlayerLane(1);
    setDistanceDriven(0);
    setNitroFuel(100);
    setIsNitroActive(false);
    setTraffic([]);
    setPickups([]);
    setHasShield(false);
    setCoinsCollected(0);
    setScore(0);
    setGameOver(false);
    setRaceVictory(false);
    setIsPaused(false);
    setLevelSelectVisible(false);
    setGameActive(true);
  };

  const proceedNextLevel = () => {
    if (currentLevelNum < 10) {
      startRace(currentLevelNum + 1);
    } else {
      startRace(1);
    }
  };

  const progressPercent = Math.min(100, Math.round((distanceDriven / curLevelConfig.targetDist) * 100));

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

        <TouchableOpacity
          style={[styles.levelSelectorPill, { borderColor: theme.accent }]}
          onPress={() => {
            soundManager.playClick();
            setLevelSelectVisible(true);
          }}
        >
          <Text style={[styles.levelPillText, { color: theme.accent }]}>
            LVL {currentLevelNum}/10 • {curLevelConfig.name} ▾
          </Text>
        </TouchableOpacity>

        <View style={styles.topCoinPill}>
          <Text style={styles.topCoinText}>🟡 {coinsCollected}</Text>
        </View>
      </View>

      {/* Cockpit Digital Dashboard Ribbon */}
      <View style={[styles.dashRibbon, { backgroundColor: theme.cardBg }]}>
        {/* Speedometer */}
        <View style={styles.dashGauge}>
          <Text style={[styles.dashLabel, { color: theme.textSecondary }]}>SPEED</Text>
          <View style={styles.speedRow}>
            <Text style={[styles.speedVal, { color: isNitroActive ? '#ff007f' : theme.accent }]}>
              {speedKmh}
            </Text>
            <Text style={[styles.speedUnit, { color: theme.textSecondary }]}>KM/H</Text>
          </View>
        </View>

        {/* Distance Progress */}
        <View style={styles.distGauge}>
          <View style={styles.distLabelRow}>
            <Text style={[styles.dashLabel, { color: theme.textSecondary }]}>FINISH LINE</Text>
            <Text style={[styles.distVal, { color: theme.accentSecondary }]}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%`, backgroundColor: curLevelConfig.stripeColor },
              ]}
            />
          </View>
        </View>

        {/* Nitro Tank */}
        <View style={styles.nitroGauge}>
          <Text style={[styles.dashLabel, { color: theme.textSecondary }]}>NITRO</Text>
          <View style={styles.nitroBarBg}>
            <View
              style={[
                styles.nitroBarFill,
                {
                  height: `${nitroFuel}%`,
                  backgroundColor: nitroFuel > 40 ? '#00f0ff' : '#ff0055',
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* 3-Lane Highway Track */}
      <View style={styles.trackContainer}>
        <View
          style={[
            styles.highway,
            {
              width: trackW,
              height: trackH,
              backgroundColor: curLevelConfig.roadColor,
              borderColor: curLevelConfig.stripeColor,
            },
          ]}
        >
          {/* Animated Road Lane Dividers */}
          <View style={styles.dividerOverlay}>
            {/* Lane line 1 (between lane 0 and 1) */}
            <View style={[styles.laneLine, { left: laneW }]}>
              {Array.from({ length: 12 }).map((_, i) => (
                <View
                  key={`l1-${i}`}
                  style={[
                    styles.dashStripe,
                    {
                      top: i * 50 + roadOffset,
                      backgroundColor: curLevelConfig.stripeColor,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Lane line 2 (between lane 1 and 2) */}
            <View style={[styles.laneLine, { left: laneW * 2 }]}>
              {Array.from({ length: 12 }).map((_, i) => (
                <View
                  key={`l2-${i}`}
                  style={[
                    styles.dashStripe,
                    {
                      top: i * 50 + roadOffset,
                      backgroundColor: curLevelConfig.stripeColor,
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Road Pickups (Coins, Nitro, Shield) */}
          {pickups.map((p) => (
            <View
              key={p.id}
              style={[
                styles.pickupItem,
                {
                  left: p.lane * laneW + laneW / 2 - 16,
                  top: p.y,
                },
              ]}
            >
              <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
            </View>
          ))}

          {/* Traffic Vehicles */}
          {traffic.map((t) => (
            <View
              key={t.id}
              style={[
                styles.trafficVehicle,
                {
                  left: t.lane * laneW + laneW / 2 - carW / 2,
                  top: t.y,
                  width: carW,
                  height: carH,
                  borderColor: t.color,
                },
              ]}
            >
              <Text style={{ fontSize: 32 }}>{t.emoji}</Text>
            </View>
          ))}

          {/* Player Supercar */}
          <View
            style={[
              styles.playerRacer,
              {
                left: playerLane * laneW + laneW / 2 - carW / 2,
                top: trackH - carH - 30,
                width: carW,
                height: carH,
              },
            ]}
          >
            {/* Nitro Flame Exhaust */}
            {isNitroActive && (
              <View style={styles.nitroExhaust}>
                <Text style={{ fontSize: 18 }}>🔥</Text>
              </View>
            )}

            {/* Shield Aura */}
            {hasShield && <View style={styles.shieldAura} />}

            {/* Headlights beam */}
            <View style={styles.headlightBeam} />

            {/* Car Icon */}
            <Text style={{ fontSize: 38 }}>🏎️</Text>
          </View>

          {/* Start Screen Overlay */}
          {!gameActive && !gameOver && !raceVictory && (
            <TouchableOpacity style={styles.startOverlay} onPress={() => startRace()} activeOpacity={0.85}>
              <Text style={[styles.startTitle, { color: theme.accent }]}>TAP TO START RACE</Text>
              <Text style={[styles.startSub, { color: theme.textSecondary }]}>
                {curLevelConfig.name} • Target: {curLevelConfig.targetDist}m
              </Text>
              <Text style={[styles.startHint, { color: theme.accentSecondary }]}>
                Steer: Left / Right • Nitro: Space / Tap Button
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Steering & Nitro Controls */}
      <View style={styles.actionControls}>
        <TouchableOpacity
          style={[styles.steerPadBtn, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}
          onPress={() => changeLane(-1)}
          activeOpacity={0.7}
        >
          <Text style={[styles.steerPadText, { color: theme.accent }]}>◀ LANE LEFT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.nitroPadBtn,
            {
              backgroundColor: isNitroActive ? '#ff007f' : theme.accent,
            },
          ]}
          onPress={triggerNitro}
          activeOpacity={0.8}
        >
          <Text style={styles.nitroPadText}>🚀 NITRO</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.steerPadBtn, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}
          onPress={() => changeLane(1)}
          activeOpacity={0.7}
        >
          <Text style={[styles.steerPadText, { color: theme.accent }]}>LANE RIGHT ▶</Text>
        </TouchableOpacity>
      </View>

      {/* Level Select Modal (10 Levels) */}
      <Modal visible={levelSelectVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.levelSelectBox, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}>
            <View style={styles.levelHeaderRow}>
              <Text style={[styles.levelSelectTitle, { color: theme.accent }]}>SELECT RACING CIRCUIT</Text>
              <TouchableOpacity
                onPress={() => setLevelSelectVisible(false)}
                style={styles.closeModalBtn}
              >
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {RACING_LEVELS.map((lvl) => {
                const isUnlocked = unlockedLevels.includes(lvl.level) || lvl.unlockedByDefault;
                const isCurrent = currentLevelNum === lvl.level;

                return (
                  <TouchableOpacity
                    key={lvl.level}
                    style={[
                      styles.levelCardItem,
                      isCurrent && { borderColor: lvl.stripeColor, backgroundColor: 'rgba(255,255,255,0.08)' },
                      !isCurrent && { borderColor: 'rgba(255,255,255,0.06)' },
                      !isUnlocked && { opacity: 0.5 },
                    ]}
                    disabled={!isUnlocked}
                    onPress={() => startRace(lvl.level)}
                  >
                    <View style={styles.levelNumBadge}>
                      <Text style={[styles.levelNumText, { color: lvl.stripeColor }]}>#{lvl.level}</Text>
                    </View>

                    <View style={styles.levelInfoText}>
                      <Text style={[styles.levelCardName, { color: theme.textPrimary }]}>{lvl.name}</Text>
                      <Text style={[styles.levelCardSub, { color: theme.textSecondary }]}>
                        {lvl.themeName} • {lvl.targetDist}m • {lvl.baseSpeed} km/h
                      </Text>
                    </View>

                    <View style={styles.levelStatusIcon}>
                      <Text style={{ fontSize: 18 }}>{isUnlocked ? '🏁' : '🔒'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Race Victory Modal */}
      <Modal visible={raceVictory} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.cardBg, borderColor: '#00ff66' }]}>
            <Text style={styles.modalEmoji}>🏆</Text>
            <Text style={[styles.modalTitle, { color: '#00ff66' }]}>CIRCUIT COMPLETED!</Text>
            <Text style={[styles.modalScoreText, { color: theme.textPrimary }]}>
              {curLevelConfig.name} Mastered
            </Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
              Coins Collected: 🟡 {coinsCollected} • Score: {score}
            </Text>

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: '#00ff66' }]}
              onPress={proceedNextLevel}
            >
              <Text style={styles.modalActionText}>
                {currentLevelNum < 10 ? `ADVANCE TO LEVEL ${currentLevelNum + 1} ▶` : 'REPLAY FINALE'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSecBtn, { borderColor: theme.accent }]}
              onPress={() => setLevelSelectVisible(true)}
            >
              <Text style={[styles.modalSecText, { color: theme.accent }]}>CHOOSE CIRCUIT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Crash / Game Over Modal */}
      <Modal visible={gameOver} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.cardBg, borderColor: '#ff0055' }]}>
            <Text style={styles.modalEmoji}>💥</Text>
            <Text style={[styles.modalTitle, { color: '#ff0055' }]}>CRASH & BURN</Text>
            <Text style={[styles.modalScoreText, { color: theme.textPrimary }]}>
              Distance: {distanceDriven}m / {curLevelConfig.targetDist}m
            </Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
              Coins: 🟡 {coinsCollected}
            </Text>

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: theme.accent }]}
              onPress={() => startRace(currentLevelNum)}
            >
              <Text style={styles.modalActionText}>RETRY CIRCUIT</Text>
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
  levelSelectorPill: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  levelPillText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  topCoinPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topCoinText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffd700',
  },
  dashRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  dashGauge: {
    alignItems: 'flex-start',
    minWidth: 80,
  },
  dashLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  speedVal: {
    fontSize: 22,
    fontWeight: '900',
  },
  speedUnit: {
    fontSize: 10,
    fontWeight: '700',
  },
  distGauge: {
    flex: 1,
    marginHorizontal: 14,
  },
  distLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  distVal: {
    fontSize: 10,
    fontWeight: '900',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  nitroGauge: {
    alignItems: 'center',
  },
  nitroBarBg: {
    width: 28,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  nitroBarFill: {
    width: '100%',
    borderRadius: 2,
  },
  trackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  highway: {
    borderWidth: 2,
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 10,
  },
  dividerOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  laneLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
  },
  dashStripe: {
    position: 'absolute',
    width: 3,
    height: 28,
    borderRadius: 1.5,
    opacity: 0.6,
  },
  pickupItem: {
    position: 'absolute',
    zIndex: 10,
  },
  trafficVehicle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    zIndex: 15,
  },
  playerRacer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  nitroExhaust: {
    position: 'absolute',
    bottom: -16,
  },
  shieldAura: {
    position: 'absolute',
    width: 58,
    height: 82,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#00e5ff',
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
  },
  headlightBeam: {
    position: 'absolute',
    top: -50,
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 25,
  },
  startOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 50,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  startSub: {
    fontSize: 13,
  },
  startHint: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  steerPadBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  steerPadText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  nitroPadBtn: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: 'center',
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 8,
  },
  nitroPadText: {
    color: '#000',
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
    maxWidth: 380,
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
  levelSelectBox: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 18,
    borderWidth: 2,
    padding: 20,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 10,
  },
  levelSelectTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  closeModalBtn: {
    padding: 4,
  },
  closeModalText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  levelCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  levelNumBadge: {
    width: 36,
    alignItems: 'center',
  },
  levelNumText: {
    fontSize: 16,
    fontWeight: '900',
  },
  levelInfoText: {
    flex: 1,
    marginLeft: 8,
  },
  levelCardName: {
    fontSize: 15,
    fontWeight: '800',
  },
  levelCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  levelStatusIcon: {
    paddingHorizontal: 8,
  },
});
