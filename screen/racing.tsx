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
  Platform,
} from 'react-native';
import { soundManager } from '../utils/sound';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- 10 EXPEDITION CIRCUITS (EXACTLY 300M + 300M EACH LEVEL) ---
export interface CircuitConfig {
  level: number;
  name: string;
  theme: string;
  distMeters: number; // 300m, 600m, 900m, ... up to 3000m
  baseRivalSpeed: number; // km/h
  rivalsCount: number;
  skyColors: [string, string];
  roadColor: string;
  stripeColor: string;
  curbColor1: string;
  curbColor2: string;
  unlockedByDefault?: boolean;
}

const CAMPAIGN_CIRCUITS: CircuitConfig[] = [
  { level: 1, name: 'Neon Sprint 300', theme: 'Dusk Qualifier', distMeters: 300, baseRivalSpeed: 170, rivalsCount: 5, skyColors: ['#1e082b', '#8f2d56'], roadColor: '#141624', stripeColor: '#00f0ff', curbColor1: '#ff0055', curbColor2: '#ffffff', unlockedByDefault: true },
  { level: 2, name: 'Tokyo Overpass 600', theme: 'Night Lights', distMeters: 600, baseRivalSpeed: 185, rivalsCount: 6, skyColors: ['#070a1e', '#161b40'], roadColor: '#101221', stripeColor: '#ff007f', curbColor1: '#00f0ff', curbColor2: '#101221' },
  { level: 3, name: 'Cyber Tunnel 900', theme: 'Matrix Underground', distMeters: 900, baseRivalSpeed: 200, rivalsCount: 6, skyColors: ['#030d07', '#092415'], roadColor: '#08140c', stripeColor: '#00ff66', curbColor1: '#00ff66', curbColor2: '#003314' },
  { level: 4, name: 'Rainy Expressway 1200', theme: 'Wet Reflection', distMeters: 1200, baseRivalSpeed: 215, rivalsCount: 7, skyColors: ['#0a1424', '#1c3454'], roadColor: '#0c1626', stripeColor: '#00e5ff', curbColor1: '#0099ff', curbColor2: '#ffffff' },
  { level: 5, name: 'Sunset Canyon 1500', theme: 'Golden Cliffs', distMeters: 1500, baseRivalSpeed: 230, rivalsCount: 7, skyColors: ['#3b1106', '#bd4b0f'], roadColor: '#241410', stripeColor: '#ffaa00', curbColor1: '#ff5500', curbColor2: '#ffffff' },
  { level: 6, name: 'Industrial Docks 1800', theme: 'Harbor Sprint', distMeters: 1800, baseRivalSpeed: 245, rivalsCount: 7, skyColors: ['#121417', '#252a33'], roadColor: '#14171c', stripeColor: '#ffd700', curbColor1: '#ffaa00', curbColor2: '#222222' },
  { level: 7, name: 'Neo Seoul 2100', theme: 'Police Grid', distMeters: 2100, baseRivalSpeed: 260, rivalsCount: 8, skyColors: ['#160824', '#3d1266'], roadColor: '#170e26', stripeColor: '#ff0055', curbColor1: '#00e5ff', curbColor2: '#ff0055' },
  { level: 8, name: 'Desert Outrun 2400', theme: 'Sandstorm Highway', distMeters: 2400, baseRivalSpeed: 275, rivalsCount: 8, skyColors: ['#291405', '#6b360a'], roadColor: '#24170d', stripeColor: '#ff9900', curbColor1: '#ff6600', curbColor2: '#ffffff' },
  { level: 9, name: 'Orbital Bridge 2700', theme: 'Skyway High-G', distMeters: 2700, baseRivalSpeed: 295, rivalsCount: 8, skyColors: ['#040214', '#150a3d'], roadColor: '#0d0726', stripeColor: '#bd00ff', curbColor1: '#00f0ff', curbColor2: '#bd00ff' },
  { level: 10, name: 'Apex Grand Prix 3000', theme: 'Championship Finale', distMeters: 3000, baseRivalSpeed: 320, rivalsCount: 8, skyColors: ['#050814', '#0f1838'], roadColor: '#0a1026', stripeColor: '#ffd700', curbColor1: '#ffd700', curbColor2: '#ff0055' },
];

interface RivalRacer {
  id: number;
  name: string;
  dist: number; // distance traveled in meters
  x: number; // lateral track offset (-0.8 to 0.8)
  speed: number; // current speed
  maxSpeed: number;
  color: string;
  model: 'viper' | 'phantom' | 'coupe' | 'f1';
  finished: boolean;
  finishTime?: number;
  finishRank?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export default function NeonRacing({ navigation }: any) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();

  // Canvas Viewport Sizing
  const canvasW = Math.min(winWidth * 0.96, 520);
  const canvasH = Math.min(winHeight * 0.58, 540);
  const canvasRef = useRef<any>(null);

  // Campaign level progression
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
  const [levelModalOpen, setLevelModalOpen] = useState<boolean>(false);

  // HUD Real-time Values
  const [hudSpeed, setHudSpeed] = useState<number>(0);
  const [hudDist, setHudDist] = useState<number>(0);
  const [hudNitro, setHudNitro] = useState<number>(100);
  const [hudPosition, setHudPosition] = useState<number>(1);
  const [hudTotalRacers, setHudTotalRacers] = useState<number>(6);
  const [hudGear, setHudGear] = useState<number>(1);
  const [countdownText, setCountdownText] = useState<string | null>(null);

  // Game Lifecycle
  const [raceActive, setRaceActive] = useState<boolean>(false);
  const [podiumModalVisible, setPodiumModalVisible] = useState<boolean>(false);
  const [crashedModalVisible, setCrashedModalVisible] = useState<boolean>(false);
  const [finalRankings, setFinalRankings] = useState<RivalRacer[]>([]);

  // High performance game state refs (60 FPS loop without React re-render lag)
  const stateRef = useRef({
    playerDist: 0,
    playerX: 0, // -1 to 1
    playerSpeed: 0,
    maxPlayerSpeed: 280,
    nitro: 100,
    isNitro: false,
    steering: 0,
    accelerating: false,
    braking: false,
    gear: 1,
    curve: 0,
    targetCurve: 0,
    roadRoll: 0,
    screenShake: 0,
    rivals: [] as RivalRacer[],
    particles: [] as Particle[],
    raceFinished: false,
    raceStartTime: 0,
    countdown: 3,
    countdownActive: false,
    config: CAMPAIGN_CIRCUITS[0],
    levelNum: 1,
    running: false,
  });

  const animFrameRef = useRef<any>(null);

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

  const saveUnlockedProgress = async (levels: number[]) => {
    try {
      await AsyncStorage.setItem('RACING_UNLOCKED_LEVELS', JSON.stringify(levels));
    } catch (_) {}
  };

  // Keyboard controls listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        s.steering = -1;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        s.steering = 1;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        s.accelerating = true;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        s.braking = true;
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        activateNitro();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (s.steering < 0) s.steering = 0;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (s.steering > 0) s.steering = 0;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        s.accelerating = false;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        s.braking = false;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      return () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      };
    }
  }, []);

  // Main 60 FPS Render Loop
  useEffect(() => {
    let active = true;

    const loop = () => {
      if (!active) return;
      updateGamePhysics();
      render3DHighway();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [canvasW, canvasH]);

  const activateNitro = () => {
    const s = stateRef.current;
    if (!s.running || s.countdownActive || s.raceFinished || s.nitro < 15) return;
    soundManager.playNitro();
    s.isNitro = true;
    setTimeout(() => {
      s.isNitro = false;
    }, 2400);
  };

  // Launch a Level Race with 3-2-1 Countdown & Grid Rivals
  const startCircuitRace = (lvlNum: number = currentLevel) => {
    const cfg = CAMPAIGN_CIRCUITS.find((c) => c.level === lvlNum) || CAMPAIGN_CIRCUITS[0];
    setCurrentLevel(lvlNum);

    const s = stateRef.current;
    s.config = cfg;
    s.levelNum = lvlNum;
    s.playerDist = 0;
    s.playerX = 0;
    s.playerSpeed = 0;
    s.maxPlayerSpeed = cfg.baseRivalSpeed + 45;
    s.nitro = 100;
    s.isNitro = false;
    s.steering = 0;
    s.accelerating = true;
    s.braking = false;
    s.gear = 1;
    s.curve = 0;
    s.targetCurve = 0;
    s.roadRoll = 0;
    s.screenShake = 0;
    s.particles = [];
    s.raceFinished = false;
    s.countdown = 3;
    s.countdownActive = true;
    s.running = true;

    // Generate Competitor Rivals on Starting Grid
    const rivalNames = [
      'Ghost Viper',
      'Phantom GTR',
      'Cyber Mustang',
      'Apex Falcon',
      'Shadow 911',
      'Red Devil',
      'Vortex Turbo',
      'Boss Dreadnought',
    ];
    const rivalColors = ['#00e5ff', '#ffaa00', '#00ff66', '#a020f0', '#ffffff', '#ff0055', '#ffff00', '#ff3300'];
    const rivalModels: Array<'viper' | 'phantom' | 'coupe' | 'f1'> = ['viper', 'phantom', 'coupe', 'f1'];

    const rivals: RivalRacer[] = [];
    for (let i = 0; i < cfg.rivalsCount; i++) {
      // Spread rivals on starting grid
      const gridRow = Math.floor(i / 2) + 1;
      const gridLane = (i % 2 === 0) ? -0.45 : 0.45;
      rivals.push({
        id: i + 1,
        name: rivalNames[i % rivalNames.length],
        dist: Math.max(0, 15 - gridRow * 8), // slightly ahead on grid
        x: gridLane,
        speed: 0,
        maxSpeed: cfg.baseRivalSpeed + (Math.random() - 0.5) * 20,
        color: rivalColors[i % rivalColors.length],
        model: rivalModels[i % rivalModels.length],
        finished: false,
      });
    }
    s.rivals = rivals;

    setHudSpeed(0);
    setHudDist(0);
    setHudNitro(100);
    setHudPosition(cfg.rivalsCount + 1); // Start at back of grid
    setHudTotalRacers(cfg.rivalsCount + 1);
    setHudGear(1);
    setPodiumModalVisible(false);
    setCrashedModalVisible(false);
    setLevelModalOpen(false);
    setRaceActive(true);

    // Realistic Countdown 3... 2... 1... GO!
    setCountdownText('3');
    soundManager.playCountdownBeep(false);

    setTimeout(() => {
      setCountdownText('2');
      soundManager.playCountdownBeep(false);
    }, 900);

    setTimeout(() => {
      setCountdownText('1');
      soundManager.playCountdownBeep(false);
    }, 1800);

    setTimeout(() => {
      setCountdownText('GO!');
      soundManager.playCountdownBeep(true);
      s.countdownActive = false;
      s.raceStartTime = Date.now();
      setTimeout(() => setCountdownText(null), 800);
    }, 2700);
  };

  const updateGamePhysics = () => {
    const s = stateRef.current;
    if (!s.running || s.countdownActive) return;

    // 1. Acceleration & Gearbox Physics
    const targetMax = s.isNitro ? s.maxPlayerSpeed + 80 : s.maxPlayerSpeed;

    if (s.isNitro) {
      s.playerSpeed = Math.min(targetMax, s.playerSpeed + 5.2);
      s.nitro = Math.max(0, s.nitro - 0.8);
      if (s.nitro <= 0) s.isNitro = false;

      // Nitro exhaust flame particles
      for (let i = 0; i < 3; i++) {
        s.particles.push({
          x: s.playerX,
          y: 0.88,
          vx: (Math.random() - 0.5) * 0.04,
          vy: 0.05 + Math.random() * 0.04,
          size: 6 + Math.random() * 7,
          color: Math.random() > 0.5 ? '#00f0ff' : '#ff007f',
          alpha: 1,
        });
      }
    } else if (s.braking) {
      s.playerSpeed = Math.max(0, s.playerSpeed - 4.5);
    } else {
      // Accelerating
      if (s.playerSpeed < targetMax) {
        s.playerSpeed = Math.min(targetMax, s.playerSpeed + 1.8);
      } else {
        s.playerSpeed = Math.max(targetMax, s.playerSpeed - 1.2);
      }
      s.nitro = Math.min(100, s.nitro + 0.07);
    }

    // Dynamic Gear determination (1 to 6)
    const spd = s.playerSpeed;
    s.gear = spd < 50 ? 1 : spd < 100 ? 2 : spd < 155 ? 3 : spd < 210 ? 4 : spd < 270 ? 5 : 6;

    // 2. Steering & Track Bounds
    if (s.steering !== 0) {
      const turnPower = 0.025 * (s.playerSpeed / 130);
      s.playerX += s.steering * turnPower;

      // Tire smoke when drifting at high speed
      if (s.playerSpeed > 150 && Math.random() < 0.35) {
        s.particles.push({
          x: s.playerX + (s.steering > 0 ? -0.06 : 0.06),
          y: 0.86,
          vx: (Math.random() - 0.5) * 0.02,
          vy: 0.03,
          size: 4 + Math.random() * 6,
          color: 'rgba(255,255,255,0.4)',
          alpha: 0.6,
        });
      }
    }

    // Road Bounds (Grass / Curb deceleration)
    if (Math.abs(s.playerX) > 0.85) {
      s.playerSpeed = Math.max(50, s.playerSpeed - 3.2);
      s.screenShake = 3.5;
    }
    s.playerX = Math.max(-0.95, Math.min(0.95, s.playerX));

    // 3. Distance & Curve
    const metersDelta = s.playerSpeed * 0.038;
    s.playerDist += metersDelta;
    s.roadRoll = (s.roadRoll + s.playerSpeed * 0.08) % 1000;

    // Dynamic track curving
    if (Math.random() < 0.02) {
      s.targetCurve = (Math.random() - 0.5) * 1.5;
    }
    s.curve += (s.targetCurve - s.curve) * 0.03;

    // 4. Competitor Rivals AI Physics
    for (let r of s.rivals) {
      if (!r.finished) {
        // AI accelerates toward max speed
        if (r.speed < r.maxSpeed) {
          r.speed = Math.min(r.maxSpeed, r.speed + 1.2 + Math.random() * 0.6);
        }
        r.dist += r.speed * 0.038;

        // Slight AI lateral lane drifting
        if (Math.random() < 0.02) {
          r.x = Math.max(-0.75, Math.min(0.75, r.x + (Math.random() - 0.5) * 0.2));
        }

        // Check if rival crossed finish line
        if (r.dist >= s.config.distMeters) {
          r.finished = true;
          r.finishTime = Date.now() - s.raceStartTime;
        }
      }
    }

    // 5. Live Rank / Standings Calculation
    const allRacers = [
      { id: 0, name: 'PLAYER (YOU)', dist: s.playerDist, isPlayer: true },
      ...s.rivals.map((r) => ({ id: r.id, name: r.name, dist: r.dist, isPlayer: false })),
    ];
    allRacers.sort((a, b) => b.dist - a.dist);
    const playerRank = allRacers.findIndex((r) => r.isPlayer) + 1;

    // 6. Check Player Finish Line
    if (s.playerDist >= s.config.distMeters && !s.raceFinished) {
      s.raceFinished = true;
      s.running = false;
      soundManager.playVictoryFanfare();

      // Final rankings table
      const sortedRivals = [
        {
          id: 0,
          name: 'YOU (PLAYER)',
          dist: s.playerDist,
          speed: s.playerSpeed,
          maxSpeed: s.maxPlayerSpeed,
          x: s.playerX,
          color: '#ff0055',
          model: 'viper' as const,
          finished: true,
          finishRank: playerRank,
        },
        ...s.rivals,
      ].sort((a, b) => b.dist - a.dist);

      setFinalRankings(sortedRivals);
      setPodiumModalVisible(true);
      setRaceActive(false);

      // Qualify and unlock next level if finished in top 3!
      if (playerRank <= 3 && s.levelNum < 10) {
        const nextLvl = s.levelNum + 1;
        if (!unlockedLevels.includes(nextLvl)) {
          const updated = [...unlockedLevels, nextLvl];
          setUnlockedLevels(updated);
          saveUnlockedProgress(updated);
        }
      }
      return;
    }

    // 7. Update Particles
    const activeParticles: Particle[] = [];
    for (let pt of s.particles) {
      pt.y += pt.vy;
      pt.x += pt.vx;
      pt.alpha -= 0.038;
      if (pt.alpha > 0) activeParticles.push(pt);
    }
    s.particles = activeParticles;

    // 8. Update HUD Throttled
    if (Math.random() < 0.28) {
      setHudSpeed(Math.round(s.playerSpeed));
      setHudDist(Math.round(s.playerDist));
      setHudNitro(Math.round(s.nitro));
      setHudPosition(playerRank);
      setHudGear(s.gear);
    }
  };

  // 3D Perspective Road Rendering Engine
  const render3DHighway = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;
    const w = canvasW;
    const h = canvasH;

    ctx.save();
    if (s.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * s.screenShake;
      const shakeY = (Math.random() - 0.5) * s.screenShake;
      ctx.translate(shakeX, shakeY);
      s.screenShake *= 0.88;
    }

    // 1. SKY & HORIZON
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.44);
    skyGrad.addColorStop(0, s.config.skyColors[0]);
    skyGrad.addColorStop(1, s.config.skyColors[1]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.44);

    // Parallax Mountain Silhouettes
    const horizonY = h * 0.42;
    ctx.fillStyle = '#070a1a';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let i = 0; i <= w; i += 40) {
      const mH = 25 + Math.sin(i * 0.03 + s.levelNum) * 20;
      ctx.lineTo(i, horizonY - mH);
    }
    ctx.lineTo(w, horizonY);
    ctx.closePath();
    ctx.fill();

    // Cyberpunk Skyline Buildings
    const bldCount = 12;
    const bldW = w / bldCount;
    ctx.fillStyle = '#040714';
    for (let i = 0; i < bldCount; i++) {
      const bH = 20 + Math.sin(i * 1.8 + s.levelNum) * 30 + 15;
      const bx = i * bldW;
      ctx.fillRect(bx, horizonY - bH, bldW + 1, bH + 2);

      // Glowing Neon Windows
      ctx.fillStyle = (i % 2 === 0) ? s.config.stripeColor : '#ff0055';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(bx + 4, horizonY - bH + 6, bldW - 8, 3);
      ctx.fillRect(bx + 4, horizonY - bH + 16, bldW - 8, 3);
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#040714';
    }

    // Glowing Horizon Sun
    const sunGrad = ctx.createRadialGradient(w / 2, horizonY - 15, 6, w / 2, horizonY - 15, 75);
    sunGrad.addColorStop(0, s.config.stripeColor);
    sunGrad.addColorStop(0.5, 'rgba(255, 0, 85, 0.4)');
    sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(w / 2, horizonY - 15, 75, 0, Math.PI * 2);
    ctx.fill();

    // 2. 3D ROAD PROJECTION
    const roadTopY = horizonY;
    const roadBottomY = h;
    const roadTopW = w * 0.22;
    const roadBottomW = w * 0.94;
    const centerX = w / 2 + s.curve * 32;

    // Road Surface
    ctx.beginPath();
    ctx.moveTo(centerX - roadTopW / 2, roadTopY);
    ctx.lineTo(centerX + roadTopW / 2, roadTopY);
    ctx.lineTo(w / 2 + roadBottomW / 2, roadBottomY);
    ctx.lineTo(w / 2 - roadBottomW / 2, roadBottomY);
    ctx.closePath();
    ctx.fillStyle = s.config.roadColor;
    ctx.fill();

    // Road Segments (Striped Curbs & Lane Markings)
    const segments = 24;
    for (let i = 0; i < segments; i++) {
      const p1 = i / segments;
      const p2 = (i + 1) / segments;

      const y1 = roadTopY + Math.pow(p1, 2) * (roadBottomY - roadTopY);
      const y2 = roadTopY + Math.pow(p2, 2) * (roadBottomY - roadTopY);

      const rw1 = roadTopW + Math.pow(p1, 2) * (roadBottomW - roadTopW);
      const rw2 = roadTopW + Math.pow(p2, 2) * (roadBottomW - roadTopW);

      const cx1 = (centerX) * (1 - p1) + (w / 2) * p1;
      const cx2 = (centerX) * (1 - p2) + (w / 2) * p2;

      const curbW1 = rw1 * 0.085;
      const curbW2 = rw2 * 0.085;

      const stripePhase = Math.floor((p1 * 12 + s.roadRoll * 0.02) % 2);
      ctx.fillStyle = stripePhase === 0 ? s.config.curbColor1 : s.config.curbColor2;

      // Left curb
      ctx.beginPath();
      ctx.moveTo(cx1 - rw1 / 2, y1);
      ctx.lineTo(cx1 - rw1 / 2 - curbW1, y1);
      ctx.lineTo(cx2 - rw2 / 2 - curbW2, y2);
      ctx.lineTo(cx2 - rw2 / 2, y2);
      ctx.closePath();
      ctx.fill();

      // Right curb
      ctx.beginPath();
      ctx.moveTo(cx1 + rw1 / 2, y1);
      ctx.lineTo(cx1 + rw1 / 2 + curbW1, y1);
      ctx.lineTo(cx2 + rw2 / 2 + curbW2, y2);
      ctx.lineTo(cx2 + rw2 / 2, y2);
      ctx.closePath();
      ctx.fill();

      // Dashed lane lines
      if (stripePhase === 0) {
        ctx.fillStyle = s.config.stripeColor;
        ctx.shadowColor = s.config.stripeColor;
        ctx.shadowBlur = 6;

        [-0.5, 0, 0.5].forEach((divOffset) => {
          const lx1 = cx1 + (rw1 / 2) * divOffset;
          const lx2 = cx2 + (rw2 / 2) * divOffset;
          const lw = Math.max(1.5, p1 * 5);

          ctx.beginPath();
          ctx.moveTo(lx1 - lw / 2, y1);
          ctx.lineTo(lx1 + lw / 2, y1);
          ctx.lineTo(lx2 + lw / 2, y2);
          ctx.lineTo(lx2 - lw / 2, y2);
          ctx.closePath();
          ctx.fill();
        });
        ctx.shadowBlur = 0;
      }
    }

    // 3. 3D CHECKERED FINISH LINE OVERHEAD BANNER
    const finishDistRemaining = s.config.distMeters - s.playerDist;
    if (finishDistRemaining >= 0 && finishDistRemaining <= 180) {
      const finishRatio = 1 - (finishDistRemaining / 180);
      const fy = roadTopY + Math.pow(finishRatio, 2) * (roadBottomY - roadTopY);
      const frw = roadTopW + Math.pow(finishRatio, 2) * (roadBottomW - roadTopW);
      const fcx = (centerX) * (1 - finishRatio) + (w / 2) * finishRatio;

      // Finish Banner Arch Across Track
      const archH = 45 * (0.3 + finishRatio * 0.9);
      ctx.save();
      ctx.fillStyle = '#0a0d1f';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15;
      ctx.strokeRect(fcx - frw / 2, fy - archH, frw, 22 * (0.3 + finishRatio * 0.8));
      ctx.fillRect(fcx - frw / 2, fy - archH, frw, 22 * (0.3 + finishRatio * 0.8));

      // Checkered Pattern
      const checkCols = 16;
      const chW = frw / checkCols;
      const chH = 11 * (0.3 + finishRatio * 0.8);
      for (let c = 0; c < checkCols; c++) {
        ctx.fillStyle = (c % 2 === 0) ? '#ffffff' : '#000000';
        ctx.fillRect(fcx - frw / 2 + c * chW, fy - archH, chW, chH);
        ctx.fillStyle = (c % 2 === 1) ? '#ffffff' : '#000000';
        ctx.fillRect(fcx - frw / 2 + c * chW, fy - archH + chH, chW, chH);
      }
      ctx.restore();
    }

    // 4. DRAW RIVAL RACERS IN 3D PERSPECTIVE
    // Sort rivals by relative distance so farther cars draw first
    const rivalsToDraw = s.rivals.map((r) => {
      const relDist = r.dist - s.playerDist; // + is ahead, - is behind
      return { ...r, relDist };
    }).filter((r) => r.relDist > -60 && r.relDist < 250);

    rivalsToDraw.sort((a, b) => b.relDist - a.relDist);

    for (let rival of rivalsToDraw) {
      // Perspective calculation: 0 (player) to 250m (horizon)
      const pRatio = Math.max(0, Math.min(1, 1 - (rival.relDist / 250)));
      const ry = roadTopY + Math.pow(pRatio, 2) * (roadBottomY - roadTopY);
      const rrw = roadTopW + Math.pow(pRatio, 2) * (roadBottomW - roadTopW);
      const rcx = (centerX) * (1 - pRatio) + (w / 2) * pRatio;
      const rx = rcx + (rrw / 2) * rival.x;
      const rScale = 0.35 + pRatio * 0.85;

      drawVectorSupercar(ctx, rx, ry, rScale, rival.color, false, false, 0);

      // Name & Rank Tag above rival car
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(rx - 35 * rScale, ry - 38 * rScale, 70 * rScale, 14 * rScale);
      ctx.fillStyle = rival.color;
      ctx.font = `bold ${Math.round(10 * rScale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(rival.name, rx, ry - 27 * rScale);
      ctx.restore();
    }

    // 5. DRAW PLAYER SUPERCAR (Near bottom)
    const playerScreenY = roadBottomY - 70;
    const playerScreenX = w / 2 + (roadBottomW / 2) * s.playerX;
    const playerScale = 1.18;

    // Forward Xenon Light Fog Beams
    ctx.save();
    ctx.globalAlpha = 0.22;
    const beamGrad = ctx.createLinearGradient(playerScreenX, playerScreenY, playerScreenX, playerScreenY - 170);
    beamGrad.addColorStop(0, '#ffffff');
    beamGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(playerScreenX - 24, playerScreenY);
    ctx.lineTo(playerScreenX - 85, playerScreenY - 170);
    ctx.lineTo(playerScreenX + 85, playerScreenY - 170);
    ctx.lineTo(playerScreenX + 24, playerScreenY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw Player Car Model
    drawVectorSupercar(ctx, playerScreenX, playerScreenY, playerScale, '#ff0055', true, s.isNitro, s.steering);

    // 6. DRAW PARTICLES (Tire Smoke & Nitro Flame Blasts)
    for (let pt of s.particles) {
      const pty = h * pt.y;
      const ptx = w / 2 + (roadBottomW / 2) * pt.x;

      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(ptx, pty, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  };

  // High-Fidelity Vector Supercar Renderer
  const drawVectorSupercar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    color: string,
    isPlayer: boolean,
    isNitro: boolean = false,
    steering: number = 0
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (isPlayer && steering !== 0) {
      ctx.rotate(steering * 0.08);
    }

    const carW = 38;
    const carH = 62;

    // Shadow underneath
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.ellipse(0, 6, carW * 0.7, carH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4 Wide Rubber Tires
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-carW / 2 - 3, -carH / 2 + 8, 5, 12);
    ctx.fillRect(carW / 2 - 2, -carH / 2 + 8, 5, 12);
    ctx.fillRect(-carW / 2 - 3, carH / 2 - 18, 5, 15);
    ctx.fillRect(carW / 2 - 2, carH / 2 - 18, 5, 15);

    // Main Metallic Chassis Body
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = isPlayer ? 14 : 5;
    ctx.beginPath();
    ctx.roundRect(-carW / 2, -carH / 2, carW, carH, [12, 12, 6, 6]);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cockpit Roof & Windshield Glass
    ctx.fillStyle = '#0a0d17';
    ctx.beginPath();
    ctx.roundRect(-carW / 2 + 5, -carH / 2 + 14, carW - 10, carH - 26, 6);
    ctx.fill();

    // Front Windshield Tint Reflection
    ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.beginPath();
    ctx.roundRect(-carW / 2 + 7, -carH / 2 + 16, carW - 14, 10, 4);
    ctx.fill();

    // Rear Windshield Tint
    ctx.beginPath();
    ctx.roundRect(-carW / 2 + 7, carH / 2 - 24, carW - 14, 8, 4);
    ctx.fill();

    // Taillights (Red Neon LED Bar)
    ctx.fillStyle = '#ff0033';
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 10;
    ctx.fillRect(-carW / 2 + 4, carH / 2 - 4, 8, 3);
    ctx.fillRect(carW / 2 - 12, carH / 2 - 4, 8, 3);
    ctx.shadowBlur = 0;

    // Headlights (Xenon White)
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(-carW / 2 + 4, -carH / 2 + 1, 7, 3);
    ctx.fillRect(carW / 2 - 11, -carH / 2 + 1, 7, 3);
    ctx.shadowBlur = 0;

    // Aerodynamic Rear Spoiler
    ctx.fillStyle = '#111';
    ctx.fillRect(-carW / 2 + 2, carH / 2 - 1, carW - 4, 4);

    // Nitro Jet Flames
    if (isPlayer && isNitro) {
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(-8, carH / 2);
      ctx.lineTo(0, carH / 2 + 26 + Math.random() * 12);
      ctx.lineTo(8, carH / 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  const curCfg = CAMPAIGN_CIRCUITS.find((c) => c.level === currentLevel) || CAMPAIGN_CIRCUITS[0];
  const progressPercent = Math.min(100, Math.round((hudDist / curCfg.distMeters) * 100));

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return '#ffd700'; // Gold
    if (rank === 2) return '#c0c0c0'; // Silver
    if (rank === 3) return '#cd7f32'; // Bronze
    return '#8a99c7';
  };

  const getRankOrdinal = (n: number) => {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            soundManager.playClick();
            stateRef.current.running = false;
            navigation.goBack();
          }}
        >
          <Text style={styles.backBtnText}>‹ Arcade</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.levelBadgeBtn}
          onPress={() => {
            soundManager.playClick();
            setLevelModalOpen(true);
          }}
        >
          <Text style={styles.levelBadgeText}>
            LEVEL {currentLevel} • {curCfg.distMeters} METERS ▾
          </Text>
        </TouchableOpacity>

        {/* Live Race Position Box */}
        <View style={[styles.posBadge, { borderColor: getRankBadgeColor(hudPosition) }]}>
          <Text style={[styles.posText, { color: getRankBadgeColor(hudPosition) }]}>
            {getRankOrdinal(hudPosition)} / {hudTotalRacers}
          </Text>
        </View>
      </View>

      {/* Realistic Cockpit Dashboard Ribbon */}
      <View style={styles.cockpitHud}>
        {/* Speedometer */}
        <View style={styles.speedBlock}>
          <Text style={styles.hudMicroLabel}>SPEED</Text>
          <View style={styles.speedRow}>
            <Text style={[styles.speedNum, { color: stateRef.current.isNitro ? '#ff007f' : '#00f0ff' }]}>
              {hudSpeed}
            </Text>
            <Text style={styles.speedUnit}>KM/H</Text>
          </View>
        </View>

        {/* Distance Progress */}
        <View style={styles.progressBlock}>
          <View style={styles.distLabelRow}>
            <Text style={styles.hudMicroLabel}>FINISH LINE</Text>
            <Text style={styles.distVal}>{hudDist}m / {curCfg.distMeters}m ({progressPercent}%)</Text>
          </View>
          <View style={styles.progressTrackBg}>
            <View
              style={[
                styles.progressTrackFill,
                { width: `${progressPercent}%`, backgroundColor: curCfg.stripeColor },
              ]}
            />
          </View>
        </View>

        {/* Gear Indicator */}
        <View style={styles.gearBlock}>
          <Text style={styles.hudMicroLabel}>GEAR</Text>
          <Text style={styles.gearVal}>G{hudGear}</Text>
        </View>

        {/* Nitro Gauge */}
        <View style={styles.nitroBlock}>
          <Text style={styles.hudMicroLabel}>NOS</Text>
          <View style={styles.nitroTankBg}>
            <View
              style={[
                styles.nitroTankFill,
                {
                  height: `${hudNitro}%`,
                  backgroundColor: hudNitro > 35 ? '#00f0ff' : '#ff0055',
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Canvas Viewport */}
      <View style={styles.canvasContainer}>
        <View style={[styles.canvasWrapper, { width: canvasW, height: canvasH }]}>
          {Platform.OS === 'web' && (
            <canvas
              ref={canvasRef}
              width={canvasW}
              height={canvasH}
              style={{
                width: canvasW,
                height: canvasH,
                borderRadius: 14,
                display: 'block',
              }}
            />
          )}

          {/* Starting Countdown Overlay (3... 2... 1... GO!) */}
          {countdownText && (
            <View style={styles.countdownOverlay}>
              <Text
                style={[
                  styles.countdownHugeText,
                  { color: countdownText === 'GO!' ? '#00ff66' : '#ff0055' },
                ]}
              >
                {countdownText}
              </Text>
            </View>
          )}

          {/* Launch Ready Overlay */}
          {!raceActive && !podiumModalVisible && !crashedModalVisible && (
            <TouchableOpacity
              style={styles.launchOverlay}
              onPress={() => startCircuitRace(currentLevel)}
              activeOpacity={0.9}
            >
              <Text style={styles.launchTitle}>NEON GRAND PRIX</Text>
              <Text style={styles.launchSub}>
                LEVEL {currentLevel}: {curCfg.name} • {curCfg.distMeters} METERS
              </Text>
              <Text style={styles.launchRivalCount}>
                Compete against {curCfg.rivalsCount} AI Rivals for 1st Place!
              </Text>

              <View style={styles.launchBtn}>
                <Text style={styles.launchBtnText}>LINE UP ON GRID ▶</Text>
              </View>

              <Text style={styles.launchHint}>
                Steer: Left/Right / A-D • Accel: Up/W • Nitro: Spacebar
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Cockpit Drive Controls */}
      <View style={styles.controlsBar}>
        <TouchableOpacity
          style={styles.steerBtn}
          onPressIn={() => (stateRef.current.steering = -1)}
          onPressOut={() => (stateRef.current.steering = 0)}
          activeOpacity={0.7}
        >
          <Text style={styles.steerBtnText}>◀ STEER LEFT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nitroActionBtn, stateRef.current.isNitro && { backgroundColor: '#ff007f' }]}
          onPress={activateNitro}
          activeOpacity={0.8}
        >
          <Text style={styles.nitroBtnText}>🚀 NITRO</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.steerBtn}
          onPressIn={() => (stateRef.current.steering = 1)}
          onPressOut={() => (stateRef.current.steering = 0)}
          activeOpacity={0.7}
        >
          <Text style={styles.steerBtnText}>STEER RIGHT ▶</Text>
        </TouchableOpacity>
      </View>

      {/* 10 Campaign Circuits Modal (300m, 600m, 900m...) */}
      <Modal visible={levelModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>CHOOSE RACING CIRCUIT</Text>
              <TouchableOpacity onPress={() => setLevelModalOpen(false)}>
                <Text style={styles.modalCloseX}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {CAMPAIGN_CIRCUITS.map((c) => {
                const isUnlocked = unlockedLevels.includes(c.level) || c.unlockedByDefault;
                const isSelected = currentLevel === c.level;

                return (
                  <TouchableOpacity
                    key={c.level}
                    style={[
                      styles.circuitItem,
                      isSelected && { borderColor: c.stripeColor, backgroundColor: 'rgba(255,255,255,0.08)' },
                      !isSelected && { borderColor: 'rgba(255,255,255,0.06)' },
                      !isUnlocked && { opacity: 0.4 },
                    ]}
                    disabled={!isUnlocked}
                    onPress={() => startCircuitRace(c.level)}
                  >
                    <View style={styles.circuitNumBadge}>
                      <Text style={[styles.circuitNumText, { color: c.stripeColor }]}>#{c.level}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.circuitName}>{c.name}</Text>
                      <Text style={styles.circuitDetails}>
                        Distance: {c.distMeters}m (+300m) • {c.rivalsCount} Competitors
                      </Text>
                    </View>
                    <Text style={{ fontSize: 18 }}>{isUnlocked ? '🏁' : '🔒'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Official Race Podium Results Modal (1st, 2nd, 3rd) */}
      <Modal visible={podiumModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.podiumBox}>
            <Text style={styles.podiumEmoji}>🏁</Text>
            <Text style={styles.podiumTitle}>OFFICIAL RACE RESULTS</Text>
            <Text style={styles.podiumSub}>
              Level {currentLevel}: {curCfg.name} ({curCfg.distMeters}m)
            </Text>

            {/* Standings Table */}
            <View style={styles.rankingsTable}>
              {finalRankings.map((r, idx) => {
                const rankNum = idx + 1;
                const isPlayer = r.name.includes('YOU');

                return (
                  <View
                    key={r.id}
                    style={[
                      styles.rankRow,
                      isPlayer && { backgroundColor: 'rgba(0, 240, 255, 0.15)', borderColor: '#00f0ff' },
                    ]}
                  >
                    <View style={styles.rankBadge}>
                      <Text style={[styles.rankBadgeText, { color: getRankBadgeColor(rankNum) }]}>
                        {rankNum === 1 ? '🥇 1st' : rankNum === 2 ? '🥈 2nd' : rankNum === 3 ? '🥉 3rd' : `${rankNum}th`}
                      </Text>
                    </View>
                    <Text style={[styles.driverName, isPlayer && { color: '#00f0ff', fontWeight: 'bold' }]}>
                      {r.name}
                    </Text>
                    <Text style={styles.driverDist}>{Math.round(r.dist)}m</Text>
                  </View>
                );
              })}
            </View>

            {/* Action Buttons */}
            {hudPosition <= 3 ? (
              <TouchableOpacity
                style={[styles.podiumActionBtn, { backgroundColor: '#00ff66' }]}
                onPress={() => {
                  if (currentLevel < 10) startCircuitRace(currentLevel + 1);
                  else startCircuitRace(1);
                }}
              >
                <Text style={styles.podiumActionText}>
                  {currentLevel < 10 ? `QUALIFIED! ADVANCE TO LEVEL ${currentLevel + 1} (${(currentLevel + 1) * 300}M) ▶` : 'CHAMPIONSHIP COMPLETED! 🏆'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.podiumActionBtn, { backgroundColor: '#ff0055' }]}
                onPress={() => startCircuitRace(currentLevel)}
              >
                <Text style={styles.podiumActionText}>FINISH IN TOP 3 TO ADVANCE • RETRY RACE</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.podiumSecBtn}
              onPress={() => setLevelModalOpen(true)}
            >
              <Text style={styles.podiumSecText}>SELECT CIRCUIT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Crashed Modal */}
      <Modal visible={crashedModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.podiumBox, { borderColor: '#ff0055' }]}>
            <Text style={styles.podiumEmoji}>💥</Text>
            <Text style={[styles.podiumTitle, { color: '#ff0055' }]}>CRASH & RETIRE</Text>
            <Text style={styles.podiumSub}>Car sustained heavy collision damage</Text>

            <TouchableOpacity
              style={[styles.podiumActionBtn, { backgroundColor: '#ff0055' }]}
              onPress={() => startCircuitRace(currentLevel)}
            >
              <Text style={styles.podiumActionText}>RETRY RACE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.podiumSecBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.podiumSecText}>ARCADE MENU</Text>
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
    backgroundColor: '#050714',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0a0d1f',
    borderBottomWidth: 1,
    borderBottomColor: '#00f0ff',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: {
    color: '#00f0ff',
    fontSize: 16,
    fontWeight: '700',
  },
  levelBadgeBtn: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderColor: '#00f0ff',
  },
  levelBadgeText: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  posBadge: {
    borderWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  posText: {
    fontSize: 13,
    fontWeight: '900',
  },
  cockpitHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 14,
    marginTop: 8,
    backgroundColor: '#0c1026',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  speedBlock: {
    minWidth: 70,
  },
  hudMicroLabel: {
    color: '#8a99c7',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  speedNum: {
    fontSize: 22,
    fontWeight: '900',
  },
  speedUnit: {
    color: '#8a99c7',
    fontSize: 9,
    fontWeight: '700',
  },
  progressBlock: {
    flex: 1,
    marginHorizontal: 12,
  },
  distLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  distVal: {
    color: '#00f0ff',
    fontSize: 10,
    fontWeight: '800',
  },
  progressTrackBg: {
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressTrackFill: {
    height: '100%',
    borderRadius: 4,
  },
  gearBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  gearVal: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: '900',
  },
  nitroBlock: {
    alignItems: 'center',
  },
  nitroTankBg: {
    width: 26,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  nitroTankFill: {
    width: '100%',
    borderRadius: 2,
  },
  canvasContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  canvasWrapper: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00f0ff',
    boxShadow: '0 0 25px rgba(0, 240, 255, 0.4)',
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
  },
  countdownHugeText: {
    fontSize: 84,
    fontWeight: '900',
    fontFamily: 'monospace',
    textShadowColor: '#000',
    textShadowRadius: 20,
    letterSpacing: 4,
  },
  launchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 50,
  },
  launchTitle: {
    color: '#00f0ff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
    textShadowColor: '#00f0ff',
    textShadowRadius: 15,
  },
  launchSub: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  launchRivalCount: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: '600',
  },
  launchBtn: {
    backgroundColor: '#ff0055',
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
    boxShadow: '0 0 15px #ff0055',
  },
  launchBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  launchHint: {
    color: '#8a99c7',
    fontSize: 11,
    marginTop: 6,
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  steerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    backgroundColor: '#0c1026',
    alignItems: 'center',
  },
  steerBtnText: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  nitroActionBtn: {
    backgroundColor: '#00f0ff',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: 'center',
    boxShadow: '0 0 15px #00f0ff',
  },
  nitroBtnText: {
    color: '#000000',
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
    maxWidth: 440,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#00f0ff',
    backgroundColor: '#0a0d1f',
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: 10,
  },
  modalTitle: {
    color: '#00f0ff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  modalCloseX: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  circuitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  circuitNumBadge: {
    width: 36,
    alignItems: 'center',
  },
  circuitNumText: {
    fontSize: 16,
    fontWeight: '900',
  },
  circuitName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  circuitDetails: {
    color: '#8a99c7',
    fontSize: 11,
    marginTop: 2,
  },
  podiumBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ffd700',
    backgroundColor: '#0a0d1f',
    padding: 22,
    alignItems: 'center',
  },
  podiumEmoji: {
    fontSize: 42,
  },
  podiumTitle: {
    color: '#ffd700',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  podiumSub: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  rankingsTable: {
    width: '100%',
    gap: 6,
    marginBottom: 16,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  rankBadge: {
    minWidth: 50,
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  driverName: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  driverDist: {
    color: '#8a99c7',
    fontSize: 11,
    fontWeight: '700',
  },
  podiumActionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  podiumActionText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  podiumSecBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    alignItems: 'center',
    marginTop: 8,
  },
  podiumSecText: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: '800',
  },
});
