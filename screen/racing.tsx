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

// --- RACING CIRCUITS CONFIGURATION (10 LEVELS) ---
export interface CircuitLevel {
  level: number;
  name: string;
  theme: string;
  distMeters: number;
  baseMaxSpeed: number; // km/h
  trafficDensity: number;
  skyColors: [string, string];
  roadColor: string;
  stripeColor: string;
  curbColor1: string;
  curbColor2: string;
  unlockedByDefault?: boolean;
}

const CIRCUITS: CircuitLevel[] = [
  { level: 1, name: 'Miami Sunset Strip', theme: 'Dusk Coast', distMeters: 2500, baseMaxSpeed: 180, trafficDensity: 0.022, skyColors: ['#2b0d38', '#d64571'], roadColor: '#16192b', stripeColor: '#00f0ff', curbColor1: '#ff0055', curbColor2: '#ffffff', unlockedByDefault: true },
  { level: 2, name: 'Tokyo Neon Expressway', theme: 'Metropolis Night', distMeters: 3000, baseMaxSpeed: 200, trafficDensity: 0.027, skyColors: ['#070a1e', '#161b40'], roadColor: '#121424', stripeColor: '#ff007f', curbColor1: '#00f0ff', curbColor2: '#121424' },
  { level: 3, name: 'Cyber Tunnel Matrix', theme: 'Neon Arches', distMeters: 3500, baseMaxSpeed: 215, trafficDensity: 0.030, skyColors: ['#030d07', '#081f12'], roadColor: '#08140c', stripeColor: '#00ff66', curbColor1: '#00ff66', curbColor2: '#003314' },
  { level: 4, name: 'Rainstorm Overpass', theme: 'Wet Reflection', distMeters: 4000, baseMaxSpeed: 230, trafficDensity: 0.033, skyColors: ['#0b1626', '#1a2f4c'], roadColor: '#0d1829', stripeColor: '#00e5ff', curbColor1: '#0099ff', curbColor2: '#ffffff' },
  { level: 5, name: 'Sunset Canyon Run', theme: 'Golden Cliffs', distMeters: 4500, baseMaxSpeed: 245, trafficDensity: 0.035, skyColors: ['#3b1106', '#bd4b0f'], roadColor: '#241410', stripeColor: '#ffaa00', curbColor1: '#ff5500', curbColor2: '#ffffff' },
  { level: 6, name: 'Industrial Docklands', theme: 'Heavy Haulers', distMeters: 5000, baseMaxSpeed: 260, trafficDensity: 0.038, skyColors: ['#121417', '#252a33'], roadColor: '#14171c', stripeColor: '#ffd700', curbColor1: '#ffaa00', curbColor2: '#222222' },
  { level: 7, name: 'Neo Seoul Freeway', theme: 'Police Alert', distMeters: 5500, baseMaxSpeed: 275, trafficDensity: 0.040, skyColors: ['#160824', '#3d1266'], roadColor: '#170e26', stripeColor: '#ff0055', curbColor1: '#00e5ff', curbColor2: '#ff0055' },
  { level: 8, name: 'Desert Skyline Highway', theme: 'Sandstorm Sprint', distMeters: 6000, baseMaxSpeed: 290, trafficDensity: 0.043, skyColors: ['#291405', '#6b360a'], roadColor: '#24170d', stripeColor: '#ff9900', curbColor1: '#ff6600', curbColor2: '#ffffff' },
  { level: 9, name: 'Orbital Sky Bridge', theme: 'Stratosphere Overlook', distMeters: 7000, baseMaxSpeed: 315, trafficDensity: 0.046, skyColors: ['#040214', '#150a3d'], roadColor: '#0d0726', stripeColor: '#bd00ff', curbColor1: '#00f0ff', curbColor2: '#bd00ff' },
  { level: 10, name: 'The Apex Grand Prix Final', theme: 'Championship Finale', distMeters: 8500, baseMaxSpeed: 350, trafficDensity: 0.050, skyColors: ['#050814', '#0f1838'], roadColor: '#0a1026', stripeColor: '#ffd700', curbColor1: '#ffd700', curbColor2: '#ff0055' },
];

interface TrafficCar {
  id: number;
  x: number; // -1 (left) to 1 (right)
  y: number; // distance down road (0 to 1000)
  speed: number;
  color: string;
  type: 'sedan' | 'sport' | 'truck' | 'police';
}

interface ItemPickup {
  id: number;
  x: number;
  y: number;
  type: 'nitro' | 'coin' | 'shield';
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

  // Campaign level state
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
  const [levelModalOpen, setLevelModalOpen] = useState<boolean>(false);

  // HUD stats
  const [hudSpeed, setHudSpeed] = useState<number>(0);
  const [hudDist, setHudDist] = useState<number>(0);
  const [hudNitro, setHudNitro] = useState<number>(100);
  const [hudCoins, setHudCoins] = useState<number>(0);
  const [hasShield, setHasShield] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);

  // Game lifecycle
  const [gameRunning, setGameRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [raceWon, setRaceWon] = useState<boolean>(false);
  const [raceCrashed, setRaceCrashed] = useState<boolean>(false);

  // High performance game state refs (60 FPS loop without React re-render lag)
  const stateRef = useRef({
    playerX: 0, // -1 to 1
    playerY: 0,
    speed: 0, // km/h
    targetSpeed: 0,
    distance: 0,
    nitroFuel: 100,
    isNitro: false,
    coins: 0,
    hasShield: false,
    score: 0,
    steering: 0, // -1 left, 1 right
    accelerating: false,
    braking: false,
    roadPos: 0,
    curve: 0,
    targetCurve: 0,
    traffic: [] as TrafficCar[],
    pickups: [] as ItemPickup[],
    particles: [] as Particle[],
    screenShake: 0,
    running: false,
    paused: false,
    levelConfig: CIRCUITS[0],
    levelNumber: 1,
  });

  const animFrameRef = useRef<any>(null);
  const audioOscRef = useRef<any>(null);

  // Load progress
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

  // Main 60 FPS Canvas Game Loop
  useEffect(() => {
    let active = true;

    const loop = () => {
      if (!active) return;
      updatePhysics();
      renderCanvas();
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
    if (!s.running || s.paused || s.nitroFuel < 15) return;
    soundManager.playNitro();
    s.isNitro = true;
    setTimeout(() => {
      s.isNitro = false;
    }, 2500);
  };

  const startLevelRace = (lvlNum: number = currentLevel) => {
    soundManager.playEngineRev();
    const cfg = CIRCUITS.find((c) => c.level === lvlNum) || CIRCUITS[0];
    setCurrentLevel(lvlNum);

    const s = stateRef.current;
    s.levelConfig = cfg;
    s.levelNumber = lvlNum;
    s.playerX = 0;
    s.speed = 10;
    s.distance = 0;
    s.nitroFuel = 100;
    s.isNitro = false;
    s.coins = 0;
    s.hasShield = false;
    s.score = 0;
    s.steering = 0;
    s.accelerating = true;
    s.braking = false;
    s.traffic = [];
    s.pickups = [];
    s.particles = [];
    s.screenShake = 0;
    s.running = true;
    s.paused = false;

    setHudSpeed(10);
    setHudDist(0);
    setHudNitro(100);
    setHudCoins(0);
    setHasShield(false);
    setScore(0);
    setRaceWon(false);
    setRaceCrashed(false);
    setIsPaused(false);
    setLevelModalOpen(false);
    setGameRunning(true);
  };

  const updatePhysics = () => {
    const s = stateRef.current;
    if (!s.running || s.paused) return;

    // 1. Acceleration & Speed Physics
    const maxSpd = s.isNitro ? s.levelConfig.baseMaxSpeed + 90 : s.levelConfig.baseMaxSpeed;
    if (s.isNitro) {
      s.speed = Math.min(maxSpd, s.speed + 4.5);
      s.nitroFuel = Math.max(0, s.nitroFuel - 0.6);
      if (s.nitroFuel <= 0) s.isNitro = false;

      // Nitro exhaust fire particles
      for (let i = 0; i < 3; i++) {
        s.particles.push({
          x: s.playerX,
          y: 0.88,
          vx: (Math.random() - 0.5) * 0.04,
          vy: 0.05 + Math.random() * 0.05,
          size: 6 + Math.random() * 6,
          color: Math.random() > 0.5 ? '#00f0ff' : '#ff007f',
          alpha: 1,
        });
      }
    } else if (s.braking) {
      s.speed = Math.max(0, s.speed - 3.8);
    } else {
      // Normal cruising / acceleration
      if (s.speed < maxSpd) {
        s.speed = Math.min(maxSpd, s.speed + 1.2);
      } else {
        s.speed = Math.max(maxSpd, s.speed - 1.5);
      }
      s.nitroFuel = Math.min(100, s.nitroFuel + 0.08);
    }

    // 2. Steering & Lateral Movement
    if (s.steering !== 0) {
      const turnPower = (0.024 * (s.speed / 140));
      s.playerX += s.steering * turnPower;

      // Tire smoke when cornering fast
      if (s.speed > 160 && Math.random() < 0.35) {
        s.particles.push({
          x: s.playerX + (s.steering > 0 ? -0.06 : 0.06),
          y: 0.85,
          vx: (Math.random() - 0.5) * 0.02,
          vy: 0.03,
          size: 4 + Math.random() * 5,
          color: 'rgba(255,255,255,0.4)',
          alpha: 0.6,
        });
      }
    }

    // Road Bounds (Grass / Curb deceleration)
    if (Math.abs(s.playerX) > 0.88) {
      s.speed = Math.max(60, s.speed - 2.5);
      s.screenShake = 3;
    }
    s.playerX = Math.max(-0.96, Math.min(0.96, s.playerX));

    // 3. Distance & Curve
    const metersDelta = s.speed * 0.035;
    s.distance += metersDelta;
    s.roadPos = (s.roadPos + s.speed * 0.06) % 1000;

    // Dynamic track road curving
    if (Math.random() < 0.015) {
      s.targetCurve = (Math.random() - 0.5) * 1.6;
    }
    s.curve += (s.targetCurve - s.curve) * 0.03;

    // 4. Check Victory
    if (s.distance >= s.levelConfig.distMeters) {
      soundManager.playPowerup();
      s.running = false;
      setRaceWon(true);
      setGameRunning(false);

      // Unlock next level
      if (s.levelNumber < 10) {
        const nextLvl = s.levelNumber + 1;
        if (!unlockedLevels.includes(nextLvl)) {
          const updated = [...unlockedLevels, nextLvl];
          setUnlockedLevels(updated);
          saveUnlockedProgress(updated);
        }
      }
      return;
    }

    // 5. Traffic Spawning & Movement
    if (Math.random() < s.levelConfig.trafficDensity && s.traffic.length < 8) {
      const lanes = [-0.62, -0.22, 0.22, 0.62];
      const laneX = lanes[Math.floor(Math.random() * lanes.length)];
      const tooClose = s.traffic.some((t) => Math.abs(t.x - laneX) < 0.25 && t.y < 250);

      if (!tooClose) {
        const types: Array<'sedan' | 'sport' | 'truck' | 'police'> = ['sedan', 'sport', 'truck', 'police'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        const colors = ['#00e5ff', '#ff0055', '#ffd700', '#00ff66', '#a020f0'];
        s.traffic.push({
          id: Date.now() + Math.random(),
          x: laneX,
          y: 0,
          speed: chosen === 'truck' ? 70 : chosen === 'police' ? 140 : 100,
          type: chosen,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    }

    // Move traffic relative to player
    const updatedTraffic: TrafficCar[] = [];
    for (let t of s.traffic) {
      const relSpeed = (s.speed - t.speed) * 0.055;
      t.y += relSpeed;

      // Collision with player (near bottom, y: 780 to 920)
      if (t.y > 760 && t.y < 890 && Math.abs(t.x - s.playerX) < 0.22) {
        if (s.hasShield) {
          // Shield absorbs!
          soundManager.playExplosion();
          s.hasShield = false;
          s.screenShake = 15;
          setHasShield(false);
          // Push traffic away
          t.x += t.x > s.playerX ? 0.4 : -0.4;
          updatedTraffic.push(t);
        } else {
          // Crash!
          soundManager.playExplosion();
          s.screenShake = 25;
          s.running = false;
          setRaceCrashed(true);
          setGameRunning(false);
          return;
        }
      } else if (t.y < 1000 && t.y > -100) {
        updatedTraffic.push(t);
      }
    }
    s.traffic = updatedTraffic;

    // 6. Item Pickups Spawning & Collision
    if (Math.random() < 0.018 && s.pickups.length < 4) {
      const lanes = [-0.55, 0, 0.55];
      const pX = lanes[Math.floor(Math.random() * lanes.length)];
      const types: Array<'nitro' | 'coin' | 'shield'> = ['coin', 'coin', 'nitro', 'shield'];
      s.pickups.push({
        id: Date.now() + Math.random(),
        x: pX,
        y: 0,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }

    const updatedPickups: ItemPickup[] = [];
    for (let p of s.pickups) {
      p.y += s.speed * 0.055;
      if (p.y > 770 && p.y < 890 && Math.abs(p.x - s.playerX) < 0.25) {
        // Collect!
        if (p.type === 'coin') {
          soundManager.playCoin();
          s.coins += 1;
          s.score += 50;
        } else if (p.type === 'nitro') {
          soundManager.playPowerup();
          s.nitroFuel = Math.min(100, s.nitroFuel + 45);
        } else if (p.type === 'shield') {
          soundManager.playPowerup();
          s.hasShield = true;
          setHasShield(true);
        }
      } else if (p.y < 1000) {
        updatedPickups.push(p);
      }
    }
    s.pickups = updatedPickups;

    // 7. Update Particles
    const activeParticles: Particle[] = [];
    for (let pt of s.particles) {
      pt.y += pt.vy;
      pt.x += pt.vx;
      pt.alpha -= 0.035;
      if (pt.alpha > 0) activeParticles.push(pt);
    }
    s.particles = activeParticles;

    // 8. Update HUD states throttled
    if (Math.random() < 0.25) {
      setHudSpeed(Math.round(s.speed));
      setHudDist(Math.round(s.distance));
      setHudNitro(Math.round(s.nitroFuel));
      setHudCoins(s.coins);
      setScore(s.score + Math.round(s.distance * 0.2));
    }
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;
    const w = canvasW;
    const h = canvasH;

    // Screen Shake Offset
    ctx.save();
    if (s.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * s.screenShake;
      const shakeY = (Math.random() - 0.5) * s.screenShake;
      ctx.translate(shakeX, shakeY);
      s.screenShake *= 0.88;
    }

    // 1. SKY / HORIZON BACKGROUND
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
    skyGrad.addColorStop(0, s.levelConfig.skyColors[0]);
    skyGrad.addColorStop(1, s.levelConfig.skyColors[1]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.45);

    // Cyberpunk Neon City Skyline on Horizon
    const horizonY = h * 0.42;
    ctx.fillStyle = '#050714';
    const numBuildings = 14;
    const bldW = w / numBuildings;
    for (let i = 0; i < numBuildings; i++) {
      const bH = 30 + (Math.sin(i * 1.5 + s.levelNumber) + 1) * 25;
      const bX = i * bldW;
      ctx.fillRect(bX, horizonY - bH, bldW + 1, bH + 5);

      // Neon window lights
      ctx.fillStyle = (i % 2 === 0) ? s.levelConfig.stripeColor : '#ff007f';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(bX + 4, horizonY - bH + 6, bldW - 8, 3);
      ctx.fillRect(bX + 4, horizonY - bH + 16, bldW - 8, 3);
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#050714';
    }

    // Neon Horizon Sun / Glow
    const sunGrad = ctx.createRadialGradient(w / 2, horizonY - 10, 5, w / 2, horizonY - 10, 70);
    sunGrad.addColorStop(0, s.levelConfig.stripeColor);
    sunGrad.addColorStop(0.5, 'rgba(255, 0, 127, 0.4)');
    sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(w / 2, horizonY - 10, 70, 0, Math.PI * 2);
    ctx.fill();

    // 2. PSEUDO-3D HIGHWAY ROAD
    const roadTopY = horizonY;
    const roadBottomY = h;
    const roadTopW = w * 0.22;
    const roadBottomW = w * 0.94;

    const centerX = w / 2 + s.curve * 30;

    // Road Surface Polygon
    ctx.beginPath();
    ctx.moveTo(centerX - roadTopW / 2, roadTopY);
    ctx.lineTo(centerX + roadTopW / 2, roadTopY);
    ctx.lineTo(w / 2 + roadBottomW / 2, roadBottomY);
    ctx.lineTo(w / 2 - roadBottomW / 2, roadBottomY);
    ctx.closePath();
    ctx.fillStyle = s.levelConfig.roadColor;
    ctx.fill();

    // Road Shoulders / Curbs (Red/White stripes)
    const segments = 22;
    for (let i = 0; i < segments; i++) {
      const p1 = i / segments;
      const p2 = (i + 1) / segments;

      // Perspective interpolation
      const y1 = roadTopY + Math.pow(p1, 2) * (roadBottomY - roadTopY);
      const y2 = roadTopY + Math.pow(p2, 2) * (roadBottomY - roadTopY);

      const rw1 = roadTopW + Math.pow(p1, 2) * (roadBottomW - roadTopW);
      const rw2 = roadTopW + Math.pow(p2, 2) * (roadBottomW - roadTopW);

      const cx1 = (centerX) * (1 - p1) + (w / 2) * p1;
      const cx2 = (centerX) * (1 - p2) + (w / 2) * p2;

      const curbW1 = rw1 * 0.08;
      const curbW2 = rw2 * 0.08;

      const stripePhase = Math.floor((p1 * 10 + s.roadPos * 0.02) % 2);
      ctx.fillStyle = stripePhase === 0 ? s.levelConfig.curbColor1 : s.levelConfig.curbColor2;

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

      // Dashed Lane Lines (3 lane dividers = 4 lanes)
      if (stripePhase === 0) {
        ctx.fillStyle = s.levelConfig.stripeColor;
        ctx.shadowColor = s.levelConfig.stripeColor;
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

    // 3. DRAW ITEM PICKUPS ON ROAD
    for (let pk of s.pickups) {
      const pRatio = Math.max(0, Math.min(1, pk.y / 1000));
      const py = roadTopY + Math.pow(pRatio, 2) * (roadBottomY - roadTopY);
      const prw = roadTopW + Math.pow(pRatio, 2) * (roadBottomW - roadTopW);
      const pcx = (centerX) * (1 - pRatio) + (w / 2) * pRatio;
      const px = pcx + (prw / 2) * pk.x;
      const pScale = 0.4 + pRatio * 0.9;

      ctx.save();
      ctx.translate(px, py);
      ctx.scale(pScale, pScale);

      if (pk.type === 'coin') {
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('$', -4, 4);
      } else if (pk.type === 'nitro') {
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.fillRect(-8, -14, 16, 28);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, -18, 12, 5);
      } else if (pk.type === 'shield') {
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. DRAW TRAFFIC VEHICLES
    // Sort traffic by distance y so closer cars render in front
    const sortedTraffic = [...s.traffic].sort((a, b) => a.y - b.y);
    for (let car of sortedTraffic) {
      const cRatio = Math.max(0, Math.min(1, car.y / 1000));
      const cy = roadTopY + Math.pow(cRatio, 2) * (roadBottomY - roadTopY);
      const crw = roadTopW + Math.pow(cRatio, 2) * (roadBottomW - roadTopW);
      const ccx = (centerX) * (1 - cRatio) + (w / 2) * cRatio;
      const cx = ccx + (crw / 2) * car.x;
      const cScale = 0.35 + cRatio * 0.95;

      drawVehicle(ctx, cx, cy, cScale, car.color, car.type, false);
    }

    // 5. DRAW PLAYER SUPERCAR (Near bottom)
    const playerScreenY = roadBottomY - 70;
    const playerScreenX = w / 2 + (roadBottomW / 2) * s.playerX;
    const playerScale = 1.15;

    // Draw Headlight Beams illuminating road
    ctx.save();
    ctx.globalAlpha = 0.25;
    const beamGrad = ctx.createLinearGradient(playerScreenX, playerScreenY, playerScreenX, playerScreenY - 180);
    beamGrad.addColorStop(0, '#ffffff');
    beamGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(playerScreenX - 25, playerScreenY);
    ctx.lineTo(playerScreenX - 85, playerScreenY - 180);
    ctx.lineTo(playerScreenX + 85, playerScreenY - 180);
    ctx.lineTo(playerScreenX + 25, playerScreenY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw Shield Aura Bubble if active
    if (s.hasShield) {
      ctx.save();
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.ellipse(playerScreenX, playerScreenY, 46, 54, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw Player Car Model
    drawVehicle(ctx, playerScreenX, playerScreenY, playerScale, '#ff0055', 'sport', true, s.isNitro, s.steering);

    // 6. DRAW PARTICLES (Smoke & Nitro Flames)
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

    ctx.restore(); // Restore screen shake
  };

  // High Fidelity Vector Vehicle Renderer
  const drawVehicle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    color: string,
    type: 'sedan' | 'sport' | 'truck' | 'police',
    isPlayer: boolean,
    isNitro: boolean = false,
    steering: number = 0
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Steering tilt
    if (isPlayer && steering !== 0) {
      ctx.rotate(steering * 0.08);
    }

    const carW = type === 'truck' ? 44 : 36;
    const carH = type === 'truck' ? 76 : 58;

    // Shadow underneath
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 5, carW * 0.65, carH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wheels (4 Tires)
    ctx.fillStyle = '#111';
    ctx.fillRect(-carW / 2 - 3, -carH / 2 + 8, 5, 12);
    ctx.fillRect(carW / 2 - 2, -carH / 2 + 8, 5, 12);
    ctx.fillRect(-carW / 2 - 3, carH / 2 - 18, 5, 14);
    ctx.fillRect(carW / 2 - 2, carH / 2 - 18, 5, 14);

    // Main Car Chassis Body
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = isPlayer ? 14 : 4;

    ctx.beginPath();
    ctx.roundRect(-carW / 2, -carH / 2, carW, carH, [10, 10, 6, 6]);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cockpit Roof & Windshield Glass
    ctx.fillStyle = '#0a0d17';
    ctx.beginPath();
    ctx.roundRect(-carW / 2 + 5, -carH / 2 + 14, carW - 10, carH - 26, 6);
    ctx.fill();

    // Front Windshield Tint
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

    // Headlights (Xenon White/Cyan)
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(-carW / 2 + 4, -carH / 2 + 1, 7, 3);
    ctx.fillRect(carW / 2 - 11, -carH / 2 + 1, 7, 3);
    ctx.shadowBlur = 0;

    // Police Siren Lights
    if (type === 'police') {
      const blink = Math.floor(Date.now() / 150) % 2;
      ctx.fillStyle = blink === 0 ? '#ff0000' : '#0000ff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 14;
      ctx.fillRect(-10, -4, 20, 6);
      ctx.shadowBlur = 0;
    }

    // Spoiler on Sports car
    if (type === 'sport' || isPlayer) {
      ctx.fillStyle = '#111';
      ctx.fillRect(-carW / 2 + 2, carH / 2 - 1, carW - 4, 4);
    }

    // Nitro Jet Exhaust Flames
    if (isPlayer && isNitro) {
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(-8, carH / 2);
      ctx.lineTo(0, carH / 2 + 24 + Math.random() * 12);
      ctx.lineTo(8, carH / 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  const curLvlCfg = CIRCUITS.find((c) => c.level === currentLevel) || CIRCUITS[0];
  const progressPct = Math.min(100, Math.round((hudDist / curLvlCfg.distMeters) * 100));

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

        {/* Level Select Trigger */}
        <TouchableOpacity
          style={styles.levelBadgeBtn}
          onPress={() => {
            soundManager.playClick();
            setLevelModalOpen(true);
          }}
        >
          <Text style={styles.levelBadgeText}>
            CIRCUIT {currentLevel}/10 • {curLvlCfg.name} ▾
          </Text>
        </TouchableOpacity>

        <View style={styles.coinBadge}>
          <Text style={styles.coinBadgeText}>🟡 {hudCoins}</Text>
        </View>
      </View>

      {/* High-Tech Cockpit HUD */}
      <View style={styles.cockpitHud}>
        {/* Analog/Digital Speedometer */}
        <View style={styles.speedDial}>
          <Text style={styles.hudMicroLabel}>SPEED</Text>
          <View style={styles.speedNumRow}>
            <Text style={[styles.speedNum, { color: stateRef.current.isNitro ? '#ff007f' : '#00f0ff' }]}>
              {hudSpeed}
            </Text>
            <Text style={styles.speedKmText}>KM/H</Text>
          </View>
        </View>

        {/* Progress Tracker */}
        <View style={styles.progressTrack}>
          <View style={styles.distLabelRow}>
            <Text style={styles.hudMicroLabel}>CIRCUIT FINISH</Text>
            <Text style={styles.distNumText}>{hudDist}m / {curLvlCfg.distMeters}m</Text>
          </View>
          <View style={styles.progressTrackBg}>
            <View
              style={[
                styles.progressTrackFill,
                { width: `${progressPct}%`, backgroundColor: curLvlCfg.stripeColor },
              ]}
            />
          </View>
        </View>

        {/* Nitro NOS Gauge */}
        <View style={styles.nitroGauge}>
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
          {/* HTML5 Canvas Rendered Directly */}
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

          {/* Launch Screen Overlay */}
          {!gameRunning && !raceWon && !raceCrashed && (
            <TouchableOpacity
              style={styles.launchOverlay}
              onPress={() => startLevelRace(currentLevel)}
              activeOpacity={0.9}
            >
              <Text style={styles.launchTitle}>NEON VELOCITY</Text>
              <Text style={styles.launchSub}>{curLvlCfg.name} • {curLvlCfg.distMeters}m</Text>
              <View style={styles.launchBtn}>
                <Text style={styles.launchBtnText}>START ENGINE ▶</Text>
              </View>
              <Text style={styles.launchHint}>
                Keyboard: Left/Right / A-D to steer • Space for Nitro
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Cockpit Drive Controls (Touch & Mobile) */}
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

      {/* 10 Levels Campaign Modal */}
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
              {CIRCUITS.map((c) => {
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
                    onPress={() => startLevelRace(c.level)}
                  >
                    <View style={styles.circuitNumBadge}>
                      <Text style={[styles.circuitNumText, { color: c.stripeColor }]}>#{c.level}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.circuitName}>{c.name}</Text>
                      <Text style={styles.circuitDetails}>
                        {c.theme} • {c.distMeters}m • Top {c.baseMaxSpeed} km/h
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

      {/* Victory Modal */}
      <Modal visible={raceWon} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.resultBox, { borderColor: '#00ff66' }]}>
            <Text style={styles.resultEmoji}>🏆</Text>
            <Text style={[styles.resultTitle, { color: '#00ff66' }]}>CIRCUIT VICTORY!</Text>
            <Text style={styles.resultSub}>{curLvlCfg.name} Conquered</Text>
            <Text style={styles.resultStats}>
              Coins: 🟡 {hudCoins} • Career Score: {score}
            </Text>

            <TouchableOpacity
              style={[styles.resultActionBtn, { backgroundColor: '#00ff66' }]}
              onPress={() => {
                if (currentLevel < 10) startLevelRace(currentLevel + 1);
                else startLevelRace(1);
              }}
            >
              <Text style={styles.resultActionText}>
                {currentLevel < 10 ? `NEXT LEVEL ${currentLevel + 1} ▶` : 'REPLAY FINAL'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resultSecBtn}
              onPress={() => setLevelModalOpen(true)}
            >
              <Text style={styles.resultSecText}>CHOOSE LEVEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Crash Modal */}
      <Modal visible={raceCrashed} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.resultBox, { borderColor: '#ff0055' }]}>
            <Text style={styles.resultEmoji}>💥</Text>
            <Text style={[styles.resultTitle, { color: '#ff0055' }]}>CRASH & WRECK</Text>
            <Text style={styles.resultSub}>
              Distance: {hudDist}m / {curLvlCfg.distMeters}m
            </Text>

            <TouchableOpacity
              style={[styles.resultActionBtn, { backgroundColor: '#ff0055' }]}
              onPress={() => startLevelRace(currentLevel)}
            >
              <Text style={styles.resultActionText}>RETRY RACE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resultSecBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.resultSecText}>ARCADE HUB</Text>
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
  },
  levelBadgeText: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  coinBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  coinBadgeText: {
    color: '#ffd700',
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
  speedDial: {
    minWidth: 75,
  },
  hudMicroLabel: {
    color: '#8a99c7',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  speedNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  speedNum: {
    fontSize: 22,
    fontWeight: '900',
  },
  speedKmText: {
    color: '#8a99c7',
    fontSize: 9,
    fontWeight: '700',
  },
  progressTrack: {
    flex: 1,
    marginHorizontal: 14,
  },
  distLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  distNumText: {
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
  nitroGauge: {
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
  launchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
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
  resultBox: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: '#0a0d1f',
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  resultEmoji: {
    fontSize: 44,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  resultSub: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  resultStats: {
    color: '#8a99c7',
    fontSize: 13,
  },
  resultActionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  resultActionText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  resultSecBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    alignItems: 'center',
  },
  resultSecText: {
    color: '#00f0ff',
    fontSize: 13,
    fontWeight: '800',
  },
});
