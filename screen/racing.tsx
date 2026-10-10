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

// --- 10 EXPEDITION CIRCUITS (STRICT 300M INCREMENTS: 300m, 600m, 900m ... 3000m) ---
export interface CircuitConfig {
  level: number;
  name: string;
  theme: string;
  distMeters: number;
  baseAIspeed: number; // km/h
  rivalsCount: number;
  skyTop: string;
  skyBottom: string;
  roadColor: string;
  stripeColor: string;
  curb1: string;
  curb2: string;
  envType: 'neonCity' | 'sunsetCoast' | 'cyberTunnel' | 'desert' | 'nightBay';
  unlockedByDefault?: boolean;
}

export const CAMPAIGN_CIRCUITS: CircuitConfig[] = [
  { level: 1, name: 'Miami Sprint 300', theme: 'Sunset Palms', distMeters: 300, baseAIspeed: 175, rivalsCount: 5, skyTop: '#15082e', skyBottom: '#a6245e', roadColor: '#171a26', stripeColor: '#ffffff', curb1: '#ff0055', curb2: '#ffffff', envType: 'sunsetCoast', unlockedByDefault: true },
  { level: 2, name: 'Tokyo Expressway 600', theme: 'Neon Midnight', distMeters: 600, baseAIspeed: 190, rivalsCount: 5, skyTop: '#070b24', skyBottom: '#18245c', roadColor: '#141829', stripeColor: '#00e5ff', curb1: '#00e5ff', curb2: '#11162b', envType: 'neonCity' },
  { level: 3, name: 'Cyber Tunnel 900', theme: 'Matrix Grid', distMeters: 900, baseAIspeed: 205, rivalsCount: 6, skyTop: '#021207', skyBottom: '#0a3318', roadColor: '#0c1a12', stripeColor: '#00ff66', curb1: '#00ff66', curb2: '#021207', envType: 'cyberTunnel' },
  { level: 4, name: 'Rainstorm Overpass 1200', theme: 'Wet Asphalt', distMeters: 1200, baseAIspeed: 220, rivalsCount: 6, skyTop: '#091526', skyBottom: '#1c395e', roadColor: '#101b2b', stripeColor: '#00e5ff', curb1: '#0088ff', curb2: '#ffffff', envType: 'neonCity' },
  { level: 5, name: 'Sunset Canyon 1500', theme: 'Golden Ridge', distMeters: 1500, baseAIspeed: 235, rivalsCount: 6, skyTop: '#3b1206', skyBottom: '#bd4b0f', roadColor: '#241712', stripeColor: '#ffaa00', curb1: '#ff5500', curb2: '#ffffff', envType: 'sunsetCoast' },
  { level: 6, name: 'Industrial Docks 1800', theme: 'Harbor Sprint', distMeters: 1800, baseAIspeed: 250, rivalsCount: 7, skyTop: '#14171a', skyBottom: '#282f3b', roadColor: '#171a21', stripeColor: '#ffd700', curb1: '#ffaa00', curb2: '#111111', envType: 'nightBay' },
  { level: 7, name: 'Neo Seoul 2100', theme: 'Laser Highway', distMeters: 2100, baseAIspeed: 265, rivalsCount: 7, skyTop: '#160824', skyBottom: '#3d1266', roadColor: '#1a102b', stripeColor: '#ff0055', curb1: '#00e5ff', curb2: '#ff0055', envType: 'neonCity' },
  { level: 8, name: 'Desert Outrun 2400', theme: 'Sandstorm Speedway', distMeters: 2400, baseAIspeed: 280, rivalsCount: 7, skyTop: '#2b1606', skyBottom: '#753b0a', roadColor: '#291b10', stripeColor: '#ff9900', curb1: '#ff6600', curb2: '#ffffff', envType: 'desert' },
  { level: 9, name: 'Orbital Skyway 2700', theme: 'Stratosphere Bridge', distMeters: 2700, baseAIspeed: 295, rivalsCount: 8, skyTop: '#05021a', skyBottom: '#190a47', roadColor: '#10082b', stripeColor: '#bd00ff', curb1: '#00f0ff', curb2: '#bd00ff', envType: 'cyberTunnel' },
  { level: 10, name: 'Apex Grand Prix 3000', theme: 'World Championship', distMeters: 3000, baseAIspeed: 315, rivalsCount: 8, skyTop: '#060917', skyBottom: '#121e42', roadColor: '#0d1329', stripeColor: '#ffd700', curb1: '#ffd700', curb2: '#ff0055', envType: 'neonCity' },
];

export interface CompetitorRacer {
  id: number;
  name: string;
  color: string;
  accentColor: string;
  dist: number; // distance traveled in meters
  x: number; // lateral track position (-0.85 to 0.85)
  speed: number; // current speed km/h
  maxSpeed: number; // top speed km/h
  accel: number;
  steerDir: number;
  finished: boolean;
  finishTimeSec?: number;
  finishTimeStr?: string;
  rank?: number;
}

interface RoadsideObject {
  dist: number; // track distance in meters
  side: -1 | 1; // -1 left, 1 right
  type: 'lamp' | 'palm' | 'billboard' | 'gantry';
  label?: string;
}

interface Particle {
  x: number; // track X (-1 to 1)
  y: number; // screen ratio (0 to 1)
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
}

export default function RealisticRacing({ navigation }: any) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();

  // Responsive Viewport Sizing
  const canvasW = Math.min(winWidth * 0.98, 620);
  const canvasH = Math.min(winHeight * 0.60, 580);
  const canvasRef = useRef<any>(null);

  // Campaign State
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
  const [circuitModalOpen, setCircuitModalOpen] = useState<boolean>(false);

  // HUD & Telemetry State
  const [hudSpeed, setHudSpeed] = useState<number>(0);
  const [hudRPM, setHudRPM] = useState<number>(1000);
  const [hudDist, setHudDist] = useState<number>(0);
  const [hudNitro, setHudNitro] = useState<number>(100);
  const [hudRank, setHudRank] = useState<number>(1);
  const [hudTotalCars, setHudTotalCars] = useState<number>(6);
  const [hudGear, setHudGear] = useState<number>(1);
  const [isDrafting, setIsDrafting] = useState<boolean>(false);

  // Race Sequences
  const [gantryLights, setGantryLights] = useState<number>(-1); // -1 inactive, 0..5 red lights, 6 = green GO
  const [raceActive, setRaceActive] = useState<boolean>(false);
  const [podiumOpen, setPodiumOpen] = useState<boolean>(false);
  const [podiumList, setPodiumList] = useState<CompetitorRacer[]>([]);

  // 60 FPS Real-time Engine State
  const engineRef = useRef({
    active: false,
    countingDown: false,
    raceOver: false,
    startTime: 0,
    levelNumber: 1,
    cfg: CAMPAIGN_CIRCUITS[0],

    // Player Physics
    playerDist: 0,
    playerX: 0, // -1 (left curb) to +1 (right curb)
    playerSpeed: 0, // km/h
    playerTargetSpeed: 0,
    playerRoll: 0, // chassis tilt angle
    steerDir: 0, // -1 left, +1 right
    isThrottle: false,
    isBrake: false,
    isNitro: false,
    nitro: 100,
    gear: 1,
    rpm: 1000,
    drafting: false,

    // Track Geometry
    roadScroll: 0,
    curve: 0,
    targetCurve: 0,
    screenShake: 0,

    // Simulation Entities
    competitors: [] as CompetitorRacer[],
    roadsideObjects: [] as RoadsideObject[],
    particles: [] as Particle[],
  });

  const animFrameRef = useRef<any>(null);

  // Load Unlocked Levels from Storage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('RACING_UNLOCKED_LEVELS');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUnlockedLevels(parsed);
          }
        }
      } catch (_) {}
    })();
  }, []);

  // Save Progress
  const persistUnlockProgress = async (unlocked: number[]) => {
    try {
      await AsyncStorage.setItem('RACING_UNLOCKED_LEVELS', JSON.stringify(unlocked));
    } catch (_) {}
  };

  // Keyboard Event Listeners for Desktop / Web
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (!eng.active) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        eng.steerDir = -1;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        eng.steerDir = 1;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        eng.isThrottle = true;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        eng.isBrake = true;
      } else if (e.key === ' ' || e.code === 'Space' || e.key === 'Shift') {
        e.preventDefault();
        triggerNitro();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const eng = engineRef.current;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (eng.steerDir === -1) eng.steerDir = 0;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (eng.steerDir === 1) eng.steerDir = 0;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        eng.isThrottle = false;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        eng.isBrake = false;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, []);

  // Main 60 FPS Engine Tick Loop
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;
      stepPhysicsEngine();
      renderHighwayScene();
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      soundManager.stopEngineLoop();
    };
  }, [canvasW, canvasH]);

  // Nitro Trigger
  const triggerNitro = () => {
    const eng = engineRef.current;
    if (!eng.active || eng.countingDown || eng.raceOver || eng.nitro < 15 || eng.isNitro) return;
    eng.isNitro = true;
    soundManager.playNitro();
    setTimeout(() => {
      eng.isNitro = false;
    }, 3200);
  };

  // Launch Race With 5-Light Formula 1 Gantry Sequence
  const launchRace = (lvl: number = currentLevel) => {
    const cfg = CAMPAIGN_CIRCUITS.find((c) => c.level === lvl) || CAMPAIGN_CIRCUITS[0];
    setCurrentLevel(lvl);

    const eng = engineRef.current;
    eng.cfg = cfg;
    eng.levelNumber = lvl;
    eng.playerDist = 0;
    eng.playerX = 0;
    eng.playerSpeed = 0;
    eng.playerRoll = 0;
    eng.steerDir = 0;
    eng.isThrottle = false;
    eng.isBrake = false;
    eng.isNitro = false;
    eng.nitro = 100;
    eng.gear = 1;
    eng.rpm = 1000;
    eng.drafting = false;
    eng.curve = 0;
    eng.targetCurve = 0;
    eng.roadScroll = 0;
    eng.screenShake = 0;
    eng.particles = [];
    eng.raceOver = false;
    eng.countingDown = true;
    eng.active = true;

    // Build Distinctive Competitor Grid
    const rivalDrivers = [
      { name: 'Phantom GTR', color: '#00e5ff', accent: '#ffffff' },
      { name: 'Venom Viper', color: '#ffaa00', accent: '#111111' },
      { name: 'Ghost 911', color: '#ffffff', accent: '#ff0055' },
      { name: 'Apex Demon', color: '#00ff66', accent: '#041209' },
      { name: 'Red Fury', color: '#ff1744', accent: '#ffd700' },
      { name: 'Shadow GT', color: '#bd00ff', accent: '#00f0ff' },
      { name: 'Turbo Raptor', color: '#ffd700', accent: '#1a102b' },
      { name: 'Cyber Chiron', color: '#0088ff', accent: '#ffffff' },
    ];

    const competitors: CompetitorRacer[] = [];
    for (let i = 0; i < cfg.rivalsCount; i++) {
      const driver = rivalDrivers[i % rivalDrivers.length];
      const gridRow = Math.floor(i / 2) + 1; // 1, 2, 3...
      const gridSide = (i % 2 === 0) ? -0.42 : 0.42;

      competitors.push({
        id: i + 1,
        name: driver.name,
        color: driver.color,
        accentColor: driver.accent,
        dist: Math.max(0, 16 - gridRow * 7), // Starting grid line staggered ahead
        x: gridSide,
        speed: 0,
        maxSpeed: cfg.baseAIspeed + (Math.random() - 0.45) * 18,
        accel: 2.2 + Math.random() * 0.8,
        steerDir: 0,
        finished: false,
      });
    }
    eng.competitors = competitors;

    // Generate Roadside Scenery Objects (Poles, Palms, Billboards)
    const scenery: RoadsideObject[] = [];
    const totalDist = cfg.distMeters + 150;
    for (let d = 20; d < totalDist; d += 28) {
      scenery.push({
        dist: d,
        side: -1,
        type: cfg.envType === 'sunsetCoast' ? 'palm' : 'lamp',
      });
      scenery.push({
        dist: d,
        side: 1,
        type: cfg.envType === 'sunsetCoast' ? 'palm' : 'lamp',
      });
    }

    // Billboards every 75 meters
    for (let b = 60; b < totalDist - 80; b += 75) {
      scenery.push({
        dist: b,
        side: Math.random() > 0.5 ? 1 : -1,
        type: 'billboard',
        label: b > totalDist - 150 ? 'FINISH SPRINT' : 'APEX GP 2077',
      });
    }
    eng.roadsideObjects = scenery;

    setHudSpeed(0);
    setHudRPM(1000);
    setHudDist(0);
    setHudNitro(100);
    setHudRank(cfg.rivalsCount + 1);
    setHudTotalCars(cfg.rivalsCount + 1);
    setHudGear(1);
    setIsDrafting(false);
    setPodiumOpen(false);
    setCircuitModalOpen(false);
    setRaceActive(true);

    // Start 5-Light Formula 1 Gantry Sequence
    soundManager.startEngineLoop();
    setGantryLights(0);

    // Sequence: 1, 2, 3, 4, 5 Red Lights then GREEN
    const lightTimes = [500, 1100, 1700, 2300, 2900];
    lightTimes.forEach((delay, idx) => {
      setTimeout(() => {
        setGantryLights(idx + 1);
        soundManager.playCountdownBeep(false);
      }, delay);
    });

    // Lights out & GO!
    setTimeout(() => {
      setGantryLights(6); // 6 = ALL GREEN / GO!
      soundManager.playCountdownBeep(true);
      eng.countingDown = false;
      eng.startTime = Date.now();
      eng.isThrottle = true; // Auto launch throttle for smooth experience

      // Clear gantry overlay after 900ms
      setTimeout(() => {
        setGantryLights(-1);
      }, 900);
    }, 3600);
  };

  // 60 FPS Physics Step
  const stepPhysicsEngine = () => {
    const eng = engineRef.current;
    if (!eng.active) return;

    if (eng.countingDown) {
      // Idle engine sound at starting line
      soundManager.setEngineRPM(0.12);
      return;
    }

    // 1. Player Acceleration & Top Speed Dynamics
    let targetSpeed = eng.isThrottle ? eng.cfg.baseAIspeed + 30 : 0;
    if (eng.isNitro) targetSpeed += 75;
    if (eng.drafting) targetSpeed += 25;

    if (eng.isNitro) {
      eng.playerSpeed = Math.min(targetSpeed, eng.playerSpeed + 3.2);
      eng.nitro = Math.max(0, eng.nitro - 0.55);
      if (eng.nitro <= 0) eng.isNitro = false;

      // Nitro exhaust particle blast
      eng.particles.push({
        x: eng.playerX + (Math.random() - 0.5) * 0.04,
        y: 0.90,
        vx: (Math.random() - 0.5) * 0.03,
        vy: 0.05 + Math.random() * 0.04,
        size: 7 + Math.random() * 7,
        color: Math.random() > 0.5 ? '#00f0ff' : '#ff0055',
        alpha: 1,
        life: 14,
      });
    } else if (eng.isBrake) {
      eng.playerSpeed = Math.max(0, eng.playerSpeed - 4.5);
    } else if (eng.isThrottle) {
      if (eng.playerSpeed < targetSpeed) {
        eng.playerSpeed = Math.min(targetSpeed, eng.playerSpeed + 1.25);
      } else {
        eng.playerSpeed = Math.max(targetSpeed, eng.playerSpeed - 0.8);
      }
      eng.nitro = Math.min(100, eng.nitro + 0.06);
    } else {
      // Natural engine friction coasting
      eng.playerSpeed = Math.max(0, eng.playerSpeed - 1.2);
    }

    // 2. Realistic Distance Increment: (km/h / 3.6) / 60 = meters/frame
    // At 180 km/h: 50 m/s / 60 = ~0.83 meters per frame. 300m takes ~14-16s!
    const metersDelta = (eng.playerSpeed / 3.6) / 60;
    eng.playerDist += metersDelta;
    eng.roadScroll = (eng.roadScroll + eng.playerSpeed * 0.04) % 1000;

    // 3. Realistic Gear Shifting & RPM calculation
    const currentSpeed = eng.playerSpeed;
    let gear = 1;
    let rpmNorm = 0.2;
    if (currentSpeed < 45) {
      gear = 1;
      rpmNorm = currentSpeed / 45;
    } else if (currentSpeed < 90) {
      gear = 2;
      rpmNorm = (currentSpeed - 45) / 45;
    } else if (currentSpeed < 145) {
      gear = 3;
      rpmNorm = (currentSpeed - 90) / 55;
    } else if (currentSpeed < 205) {
      gear = 4;
      rpmNorm = (currentSpeed - 145) / 60;
    } else if (currentSpeed < 265) {
      gear = 5;
      rpmNorm = (currentSpeed - 205) / 60;
    } else {
      gear = 6;
      rpmNorm = Math.min(1, (currentSpeed - 265) / 75);
    }

    if (gear !== eng.gear && eng.playerSpeed > 30) {
      soundManager.playGearShift();
    }
    eng.gear = gear;
    eng.rpm = Math.round(1500 + rpmNorm * 6500);
    soundManager.setEngineRPM(rpmNorm);

    // 4. Steering & Cornering Grip
    if (eng.steerDir !== 0) {
      const steerAgility = 0.024 * (Math.min(180, eng.playerSpeed) / 100);
      eng.playerX += eng.steerDir * steerAgility;
      eng.playerRoll = Math.max(-0.18, Math.min(0.18, eng.playerRoll + eng.steerDir * 0.035));

      // Tire smoke particles during sharp high-speed cornering
      if (eng.playerSpeed > 130 && Math.random() < 0.4) {
        eng.particles.push({
          x: eng.playerX + (eng.steerDir > 0 ? -0.09 : 0.09),
          y: 0.88,
          vx: (Math.random() - 0.5) * 0.02,
          vy: 0.02,
          size: 5 + Math.random() * 6,
          color: 'rgba(255,255,255,0.45)',
          alpha: 0.7,
          life: 12,
        });
      }
    } else {
      // Auto-center chassis roll
      eng.playerRoll *= 0.75;
    }

    // Off-road Grass / Curb friction penalty
    if (Math.abs(eng.playerX) > 0.88) {
      eng.playerSpeed = Math.max(35, eng.playerSpeed - 3.2);
      eng.screenShake = 4;
    }
    eng.playerX = Math.max(-0.96, Math.min(0.96, eng.playerX));

    // Dynamic Road Curve Physics
    if (Math.random() < 0.02) {
      eng.targetCurve = (Math.random() - 0.5) * 1.6;
    }
    eng.curve += (eng.targetCurve - eng.curve) * 0.025;

    // 5. Competitor AI Dynamics & Grid Racing
    let draftingFound = false;

    for (let c of eng.competitors) {
      if (!c.finished) {
        // Accelerate off starting grid
        if (c.speed < c.maxSpeed) {
          c.speed = Math.min(c.maxSpeed, c.speed + c.accel * (0.8 + Math.random() * 0.4));
        }

        const aiMetersDelta = (c.speed / 3.6) / 60;
        c.dist += aiMetersDelta;

        // AI Lane shifting & overtaking logic
        if (Math.random() < 0.025) {
          c.steerDir = (Math.random() - 0.5) * 0.35;
        }
        c.x = Math.max(-0.82, Math.min(0.82, c.x + c.steerDir * 0.015));

        // Check if player is drafting behind this competitor (within 22m and same lane)
        const relDist = c.dist - eng.playerDist;
        if (relDist > 3 && relDist < 25 && Math.abs(c.x - eng.playerX) < 0.28) {
          draftingFound = true;
        }

        // AI Finish line check
        if (c.dist >= eng.cfg.distMeters) {
          c.finished = true;
          const secs = (Date.now() - eng.startTime) / 1000;
          c.finishTimeSec = secs;
          c.finishTimeStr = `${secs.toFixed(2)}s`;
        }
      }
    }

    // Drafting state update
    if (draftingFound && !eng.drafting) {
      soundManager.playDraftingWhoosh();
    }
    eng.drafting = draftingFound;
    setIsDrafting(draftingFound);

    // 6. Live Position / Rank Standings
    const allRacers = [
      { id: 0, name: 'YOU (PLAYER)', dist: eng.playerDist, isPlayer: true },
      ...eng.competitors.map((c) => ({ id: c.id, name: c.name, dist: c.dist, isPlayer: false })),
    ];
    allRacers.sort((a, b) => b.dist - a.dist);
    const playerRank = allRacers.findIndex((r) => r.isPlayer) + 1;

    // 7. Finish Line Check For Player
    if (eng.playerDist >= eng.cfg.distMeters && !eng.raceOver) {
      eng.raceOver = true;
      eng.active = false;
      soundManager.stopEngineLoop();
      soundManager.playVictoryFanfare();

      const playerSecs = (Date.now() - eng.startTime) / 1000;

      // Build Complete Official Standings Table
      const finalRoster: CompetitorRacer[] = [
        {
          id: 0,
          name: 'YOU (PLAYER)',
          color: '#ff0055',
          accentColor: '#ffffff',
          dist: eng.playerDist,
          x: eng.playerX,
          speed: eng.playerSpeed,
          maxSpeed: eng.playerSpeed,
          accel: 0,
          steerDir: 0,
          finished: true,
          finishTimeSec: playerSecs,
          finishTimeStr: `${playerSecs.toFixed(2)}s`,
        },
        ...eng.competitors.map((c) => {
          if (!c.finished) {
            // Estimate finish time based on current speed
            const rem = Math.max(0, eng.cfg.distMeters - c.dist);
            const addSec = rem / Math.max(20, c.speed / 3.6);
            const est = playerSecs + addSec;
            return {
              ...c,
              finished: true,
              finishTimeSec: est,
              finishTimeStr: `+${(est - playerSecs).toFixed(2)}s`,
            };
          } else {
            const diff = (c.finishTimeSec || playerSecs) - playerSecs;
            return {
              ...c,
              finishTimeStr: diff > 0 ? `+${diff.toFixed(2)}s` : `${(c.finishTimeSec || playerSecs).toFixed(2)}s`,
            };
          }
        }),
      ];

      // Sort by actual arrival time (or distance if tied)
      finalRoster.sort((a, b) => (a.finishTimeSec || 999) - (b.finishTimeSec || 999));
      finalRoster.forEach((r, idx) => {
        r.rank = idx + 1;
      });

      setPodiumList(finalRoster);
      setPodiumOpen(true);
      setRaceActive(false);

      // Unlock next level if finished in top 3
      const finalRank = finalRoster.findIndex((r) => r.name.includes('YOU')) + 1;
      if (finalRank <= 3 && eng.levelNumber < 10) {
        const nextLvl = eng.levelNumber + 1;
        if (!unlockedLevels.includes(nextLvl)) {
          const updated = [...unlockedLevels, nextLvl];
          setUnlockedLevels(updated);
          persistUnlockProgress(updated);
        }
      }
    }

    // Step particle life
    for (let i = eng.particles.length - 1; i >= 0; i--) {
      const p = eng.particles[i];
      p.life--;
      p.alpha = Math.max(0, p.life / 14);
      p.size *= 1.04;
      p.y -= p.vy;
      p.x += p.vx;
      if (p.life <= 0) eng.particles.splice(i, 1);
    }

    // Sync Telemetry with React HUD (Throttled update)
    setHudSpeed(Math.round(eng.playerSpeed));
    setHudRPM(eng.rpm);
    setHudDist(Math.round(eng.playerDist));
    setHudNitro(Math.round(eng.nitro));
    setHudRank(playerRank);
    setHudGear(eng.gear);
  };

  // High-Definition Pseudo-3D Canvas Scene Renderer
  const renderHighwayScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const eng = engineRef.current;
    const w = canvasW;
    const h = canvasH;

    ctx.save();
    // Screen shake on nitro or rough off-road driving
    if (eng.screenShake > 0) {
      const sx = (Math.random() - 0.5) * eng.screenShake;
      const sy = (Math.random() - 0.5) * eng.screenShake;
      ctx.translate(sx, sy);
      eng.screenShake *= 0.85;
    }

    // 1. SKY & HORIZON
    const horizonY = h * 0.44;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, eng.cfg.skyTop);
    skyGrad.addColorStop(1, eng.cfg.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonY);

    // Parallax Skyline / Mountains that pan with track curvature
    const panOffset = eng.curve * 40;

    // Distant mountain ridge
    ctx.fillStyle = 'rgba(5, 8, 20, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= w; x += 30) {
      const my = horizonY - 18 - Math.sin((x + panOffset * 0.4) * 0.025 + eng.levelNumber) * 22;
      ctx.lineTo(x, my);
    }
    ctx.lineTo(w, horizonY);
    ctx.closePath();
    ctx.fill();

    // Cyber Skyline Skyscrapers
    const towerCount = 14;
    const towerW = w / towerCount;
    for (let i = 0; i < towerCount; i++) {
      const bx = i * towerW + (panOffset * 0.7 % towerW);
      const th = 25 + Math.sin(i * 1.7 + eng.levelNumber) * 35 + 20;
      ctx.fillStyle = '#060914';
      ctx.fillRect(bx, horizonY - th, towerW + 1, th + 2);

      // Glowing Neon Windows
      ctx.fillStyle = (i % 2 === 0) ? eng.cfg.stripeColor : '#ff0055';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(bx + 4, horizonY - th + 6, towerW - 8, 3);
      ctx.fillRect(bx + 4, horizonY - th + 18, towerW - 8, 3);
      ctx.globalAlpha = 1.0;
    }

    // Horizon Sun / Moon
    const sunGrad = ctx.createRadialGradient(w / 2 + panOffset * 0.5, horizonY - 10, 4, w / 2 + panOffset * 0.5, horizonY - 10, 80);
    sunGrad.addColorStop(0, eng.cfg.stripeColor);
    sunGrad.addColorStop(0.4, 'rgba(255, 0, 85, 0.45)');
    sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(w / 2 + panOffset * 0.5, horizonY - 10, 80, 0, Math.PI * 2);
    ctx.fill();

    // 2. 3D ROAD PROJECTION
    const roadTopY = horizonY;
    const roadBottomY = h;
    const roadTopW = w * 0.18;
    const roadBottomW = w * 0.96;
    const roadCenterX = w / 2 + eng.curve * 38;

    // Roadbed Base Polygon
    ctx.beginPath();
    ctx.moveTo(roadCenterX - roadTopW / 2, roadTopY);
    ctx.lineTo(roadCenterX + roadTopW / 2, roadTopY);
    ctx.lineTo(w / 2 + roadBottomW / 2, roadBottomY);
    ctx.lineTo(w / 2 - roadBottomW / 2, roadBottomY);
    ctx.closePath();
    ctx.fillStyle = eng.cfg.roadColor;
    ctx.fill();

    // Road Segments with Alternating Red/White Curbs & Lane Markings
    const numSegments = 28;
    for (let i = 0; i < numSegments; i++) {
      const p1 = i / numSegments;
      const p2 = (i + 1) / numSegments;

      const y1 = roadTopY + Math.pow(p1, 2) * (roadBottomY - roadTopY);
      const y2 = roadTopY + Math.pow(p2, 2) * (roadBottomY - roadTopY);

      const rw1 = roadTopW + Math.pow(p1, 2) * (roadBottomW - roadTopW);
      const rw2 = roadTopW + Math.pow(p2, 2) * (roadBottomW - roadTopW);

      const cx1 = (roadCenterX) * (1 - p1) + (w / 2) * p1;
      const cx2 = (roadCenterX) * (1 - p2) + (w / 2) * p2;

      // Color toggle based on road scrolling
      const isAlt = Math.floor((i + eng.roadScroll * 0.12) % 2) === 0;

      // Left 3D Curb
      const curbW1 = rw1 * 0.08;
      const curbW2 = rw2 * 0.08;
      ctx.fillStyle = isAlt ? eng.cfg.curb1 : eng.cfg.curb2;
      ctx.beginPath();
      ctx.moveTo(cx1 - rw1 / 2, y1);
      ctx.lineTo(cx1 - rw1 / 2 - curbW1, y1);
      ctx.lineTo(cx2 - rw2 / 2 - curbW2, y2);
      ctx.lineTo(cx2 - rw2 / 2, y2);
      ctx.closePath();
      ctx.fill();

      // Right 3D Curb
      ctx.beginPath();
      ctx.moveTo(cx1 + rw1 / 2, y1);
      ctx.lineTo(cx1 + rw1 / 2 + curbW1, y1);
      ctx.lineTo(cx2 + rw2 / 2 + curbW2, y2);
      ctx.lineTo(cx2 + rw2 / 2, y2);
      ctx.closePath();
      ctx.fill();

      // Dashed Center Lanes (3-Lane Highway)
      if (isAlt) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        // Left divider
        const divX1 = cx1 - rw1 * 0.16;
        const divX2 = cx2 - rw2 * 0.16;
        const lineW = Math.max(2, rw2 * 0.018);
        ctx.fillRect(divX1 - lineW / 2, y1, lineW, Math.max(2, y2 - y1));

        // Right divider
        const divX1R = cx1 + rw1 * 0.16;
        const divX2R = cx2 + rw2 * 0.16;
        ctx.fillRect(divX1R - lineW / 2, y1, lineW, Math.max(2, y2 - y1));
      }
    }

    // 3. STARTING GRID BOXES (Visible on first 40 meters)
    if (eng.playerDist < 45) {
      for (let g = 0; g < 4; g++) {
        const gridDist = 12 + g * 8;
        const rel = gridDist - eng.playerDist;
        if (rel > 0 && rel < 90) {
          const ratio = 1 - (rel / 90);
          const gy = roadTopY + Math.pow(ratio, 2) * (roadBottomY - roadTopY);
          const grw = roadTopW + Math.pow(ratio, 2) * (roadBottomW - roadTopW);
          const gcx = (roadCenterX) * (1 - ratio) + (w / 2) * ratio;

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = Math.max(1, 3 * ratio);
          ctx.strokeRect(gcx - grw * 0.35, gy - 4 * ratio, grw * 0.7, 8 * ratio);
        }
      }
    }

    // 4. OVERHEAD 3D CHECKERED FINISH LINE ARCH GANTRY
    const finishRem = eng.cfg.distMeters - eng.playerDist;
    if (finishRem >= -15 && finishRem <= 160) {
      const fRatio = Math.max(0, Math.min(1, 1 - (finishRem / 160)));
      const fy = roadTopY + Math.pow(fRatio, 2) * (roadBottomY - roadTopY);
      const frw = roadTopW + Math.pow(fRatio, 2) * (roadBottomW - roadTopW);
      const fcx = (roadCenterX) * (1 - fRatio) + (w / 2) * fRatio;
      const archH = 55 * (0.35 + fRatio * 0.85);

      ctx.save();
      // Left and Right Gantry Support Pillars
      ctx.fillStyle = '#111726';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.fillRect(fcx - frw / 2 - 12 * fRatio, fy - archH, 12 * fRatio, archH);
      ctx.fillRect(fcx + frw / 2, fy - archH, 12 * fRatio, archH);

      // Overhead Checkered Banner Beam
      const beamH = 26 * (0.35 + fRatio * 0.85);
      ctx.fillStyle = '#060914';
      ctx.fillRect(fcx - frw / 2, fy - archH, frw, beamH);
      ctx.strokeRect(fcx - frw / 2, fy - archH, frw, beamH);

      // Checkered Pattern
      const numCols = 16;
      const chW = frw / numCols;
      const chH = beamH / 2;
      for (let c = 0; c < numCols; c++) {
        ctx.fillStyle = c % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(fcx - frw / 2 + c * chW, fy - archH, chW, chH);
        ctx.fillStyle = c % 2 === 1 ? '#ffffff' : '#000000';
        ctx.fillRect(fcx - frw / 2 + c * chW, fy - archH + chH, chW, chH);
      }

      // "FINISH LINE" Banner Text
      if (fRatio > 0.4) {
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold ${Math.round(14 * fRatio)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🏁 FINISH 🏁', fcx, fy - archH - 6);
      }
      ctx.restore();
    }

    // 5. ROADSIDE 3D SCENERY (Poles, Palms, Billboards)
    const activeScenery = eng.roadsideObjects
      .map((obj) => ({ ...obj, rel: obj.dist - eng.playerDist }))
      .filter((obj) => obj.rel > 0 && obj.rel < 140)
      .sort((a, b) => b.rel - a.rel);

    for (let obj of activeScenery) {
      const sRatio = 1 - (obj.rel / 140);
      const sy = roadTopY + Math.pow(sRatio, 2) * (roadBottomY - roadTopY);
      const srw = roadTopW + Math.pow(sRatio, 2) * (roadBottomW - roadTopW);
      const scx = (roadCenterX) * (1 - sRatio) + (w / 2) * sRatio;
      const sx = scx + (srw / 2 + 18 * sRatio) * obj.side;
      const sScale = 0.2 + sRatio * 1.1;

      ctx.save();
      if (obj.type === 'palm') {
        // Cyber Palm Tree
        ctx.strokeStyle = '#5a3d28';
        ctx.lineWidth = Math.max(2, 6 * sScale);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + (obj.side > 0 ? 8 : -8) * sScale, sy - 35 * sScale, sx, sy - 60 * sScale);
        ctx.stroke();

        // Palm Fronds
        ctx.fillStyle = '#00ff66';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 60 * sScale, 22 * sScale, 10 * sScale, (obj.side > 0 ? 0.3 : -0.3), 0, Math.PI * 2);
        ctx.fill();
      } else if (obj.type === 'billboard') {
        // Neon Billboard
        const bbW = 54 * sScale;
        const bbH = 28 * sScale;
        ctx.fillStyle = '#0a0d1a';
        ctx.strokeStyle = eng.cfg.stripeColor;
        ctx.lineWidth = 2 * sScale;
        ctx.fillRect(sx - bbW / 2, sy - bbH - 20 * sScale, bbW, bbH);
        ctx.strokeRect(sx - bbW / 2, sy - bbH - 20 * sScale, bbW, bbH);

        // Billboard post
        ctx.fillStyle = '#555';
        ctx.fillRect(sx - 2 * sScale, sy - 20 * sScale, 4 * sScale, 20 * sScale);

        // Text
        if (sScale > 0.45) {
          ctx.fillStyle = '#ffd700';
          ctx.font = `bold ${Math.round(8 * sScale)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(obj.label || 'APEX GP', sx, sy - 20 * sScale - bbH / 2 + 3);
        }
      } else {
        // Neon Streetlight Pole
        ctx.strokeStyle = '#2b3652';
        ctx.lineWidth = Math.max(1, 4 * sScale);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy - 55 * sScale);
        ctx.lineTo(sx - obj.side * 18 * sScale, sy - 55 * sScale);
        ctx.stroke();

        // Glowing Lamp Head
        ctx.fillStyle = eng.cfg.stripeColor;
        ctx.shadowColor = eng.cfg.stripeColor;
        ctx.shadowBlur = 12 * sScale;
        ctx.beginPath();
        ctx.arc(sx - obj.side * 18 * sScale, sy - 55 * sScale, 4 * sScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    // 6. DRAW COMPETITOR RACERS IN 3D REAR PERSPECTIVE
    const rivalsSorted = eng.competitors
      .map((r) => ({ ...r, relDist: r.dist - eng.playerDist }))
      .filter((r) => r.relDist > -30 && r.relDist < 160)
      .sort((a, b) => b.relDist - a.relDist);

    for (let rival of rivalsSorted) {
      const pRatio = Math.max(0, Math.min(1, 1 - (rival.relDist / 160)));
      const ry = roadTopY + Math.pow(pRatio, 2) * (roadBottomY - roadTopY);
      const rrw = roadTopW + Math.pow(pRatio, 2) * (roadBottomW - roadTopW);
      const rcx = (roadCenterX) * (1 - pRatio) + (w / 2) * pRatio;
      const rx = rcx + (rrw / 2) * rival.x;
      const rScale = 0.35 + pRatio * 0.95;

      drawRealisticRearSupercar(ctx, rx, ry, rScale, rival.color, rival.accentColor, false, false, rival.steerDir);

      // Driver Tag & Distance Floating Badge
      ctx.save();
      const tagW = 74 * rScale;
      const tagH = 16 * rScale;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.strokeStyle = rival.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(rx - tagW / 2, ry - 44 * rScale, tagW, tagH);
      ctx.fillRect(rx - tagW / 2, ry - 44 * rScale, tagW, tagH);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(9 * rScale)}px sans-serif`;
      ctx.textAlign = 'center';
      const gapM = rival.relDist > 0 ? `+${Math.round(rival.relDist)}m` : `${Math.round(rival.relDist)}m`;
      ctx.fillText(`${rival.name} • ${gapM}`, rx, ry - 32 * rScale);
      ctx.restore();
    }

    // 7. DRAW PLAYER SUPERCAR (Authentic 3D Rear View)
    const playerScreenY = roadBottomY - 75;
    const playerScreenX = w / 2 + (roadBottomW / 2) * eng.playerX;
    const playerScale = 1.35;

    // Headlight Illuminating Beams onto Road Ahead
    ctx.save();
    ctx.globalAlpha = 0.25;
    const beamGrad = ctx.createLinearGradient(playerScreenX, playerScreenY, playerScreenX, playerScreenY - 180);
    beamGrad.addColorStop(0, '#ffffff');
    beamGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(playerScreenX - 30, playerScreenY);
    ctx.lineTo(playerScreenX - 95, playerScreenY - 180);
    ctx.lineTo(playerScreenX + 95, playerScreenY - 180);
    ctx.lineTo(playerScreenX + 30, playerScreenY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Render 3D Rear-View Player Hypercar
    drawRealisticRearSupercar(
      ctx,
      playerScreenX,
      playerScreenY,
      playerScale,
      '#ff0055', // Championship Magenta Body
      '#00f0ff', // Cyberpunk Accent
      true,
      eng.isNitro,
      eng.playerRoll
    );

    // 8. SPEED LINES (Motion Streaks above 180 km/h)
    if (eng.playerSpeed > 180) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.5;
      const numLines = Math.min(18, Math.round((eng.playerSpeed - 180) * 0.2));
      for (let s = 0; s < numLines; s++) {
        const lx = Math.random() * w;
        const ly = horizonY + Math.random() * (h - horizonY);
        const lLen = 25 + Math.random() * 45;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + (eng.playerX * -15), ly + lLen);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 9. DRAW PARTICLES (Exhaust Flames & Tire Smoke)
    for (let pt of eng.particles) {
      const pty = h * pt.y;
      const ptx = w / 2 + (roadBottomW / 2) * pt.x;

      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ptx, pty, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  };

  // --- AUTHENTIC 3D REAR-PERSPECTIVE SUPERCAR VECTOR RENDERER ---
  const drawRealisticRearSupercar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    bodyColor: string,
    accentColor: string,
    isPlayer: boolean,
    isNitro: boolean = false,
    rollAngle: number = 0
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Chassis dynamic banking roll during steering
    if (rollAngle !== 0) {
      ctx.rotate(rollAngle);
    }

    const carW = 48; // Wide rear hypercar profile
    const carH = 34;

    // 1. Ground Drop Shadow with Soft Ambient Occlusion
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 10, carW * 0.72, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Wide Rear Slick Tires with Tread & Rim Detail
    const tireW = 9;
    const tireH = 22;
    // Left Rear Tire
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(-carW / 2 - 4, -tireH / 2 + 3, tireW, tireH);
    ctx.fillStyle = '#222';
    ctx.fillRect(-carW / 2 - 2, -tireH / 2 + 5, tireW - 4, tireH - 4);

    // Right Rear Tire
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(carW / 2 - tireW + 4, -tireH / 2 + 3, tireW, tireH);
    ctx.fillStyle = '#222';
    ctx.fillRect(carW / 2 - tireW + 6, -tireH / 2 + 5, tireW - 4, tireH - 4);

    // 3. Lower Carbon-Fiber Rear Diffuser (Aero Fins)
    ctx.fillStyle = '#11131a';
    ctx.fillRect(-carW / 2 + 4, 4, carW - 8, 8);
    // Vertical Diffuser Fins
    ctx.fillStyle = '#2b3040';
    for (let f = -14; f <= 14; f += 7) {
      ctx.fillRect(f - 1, 4, 2, 8);
    }

    // 4. Main Muscular Rear Bumper & Wheel Arches
    ctx.fillStyle = bodyColor;
    ctx.shadowColor = bodyColor;
    ctx.shadowBlur = isPlayer ? 15 : 6;

    // Robust Slanted Bumper Path (Cross-Browser Compatible)
    ctx.beginPath();
    ctx.moveTo(-carW / 2 + 2, 6);
    ctx.lineTo(-carW / 2 - 2, -4);
    ctx.quadraticCurveTo(-carW / 2 - 2, -10, -carW / 2 + 6, -10);
    ctx.lineTo(carW / 2 - 6, -10);
    ctx.quadraticCurveTo(carW / 2 + 2, -10, carW / 2 + 2, -4);
    ctx.lineTo(carW / 2 - 2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // 5. Slanted Cockpit Cabin & Rear Window Louvers
    ctx.fillStyle = '#080c14';
    ctx.beginPath();
    ctx.moveTo(-carW * 0.32, -10);
    ctx.lineTo(-carW * 0.22, -24);
    ctx.lineTo(carW * 0.22, -24);
    ctx.lineTo(carW * 0.32, -10);
    ctx.closePath();
    ctx.fill();

    // Rear Window Glass Tint with Cyber Reflection
    ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(-carW * 0.28, -11);
    ctx.lineTo(-carW * 0.19, -22);
    ctx.lineTo(carW * 0.19, -22);
    ctx.lineTo(carW * 0.28, -11);
    ctx.closePath();
    ctx.fill();

    // V12 Engine Bay Louver Slats
    ctx.fillStyle = '#111';
    ctx.fillRect(-carW * 0.18, -18, carW * 0.36, 2);
    ctx.fillRect(-carW * 0.22, -14, carW * 0.44, 2);

    // 6. Full-Width Cyberpunk Neon LED Taillight Bar
    ctx.fillStyle = '#ff0033';
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = isPlayer ? 16 : 8;
    ctx.fillRect(-carW / 2 + 4, -8, carW - 8, 4);
    // Center Brake Glow Accent
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-carW * 0.2, -7, carW * 0.4, 2);
    ctx.shadowBlur = 0;

    // 7. Titanium Dual Exhaust Tips (Pulsating Heat Glow)
    const exL = -10;
    const exR = 10;
    // Left tip
    ctx.fillStyle = '#111';
    ctx.fillRect(exL - 4, 3, 8, 5);
    ctx.fillStyle = isPlayer && isNitro ? '#00e5ff' : '#ff5500';
    ctx.fillRect(exL - 2, 4, 4, 3);

    // Right tip
    ctx.fillStyle = '#111';
    ctx.fillRect(exR - 4, 3, 8, 5);
    ctx.fillStyle = isPlayer && isNitro ? '#00e5ff' : '#ff5500';
    ctx.fillRect(exR - 2, 4, 4, 3);

    // 8. High-Performance Elevated Carbon GT Wing / Spoiler
    const wingW = carW + 4;
    ctx.fillStyle = '#11131a';
    ctx.fillRect(-wingW / 2, -26, wingW, 4);

    // Left and Right Wing Endplates (Downforce fins)
    ctx.fillStyle = accentColor;
    ctx.fillRect(-wingW / 2 - 2, -29, 3, 9);
    ctx.fillRect(wingW / 2 - 1, -29, 3, 9);

    // Wing Struts / Pylons
    ctx.fillStyle = '#444';
    ctx.fillRect(-12, -22, 3, 12);
    ctx.fillRect(9, -22, 3, 12);

    // 9. NITRO JET AFTERBURNER FLAMES
    if (isPlayer && isNitro) {
      // Sonic Shock Diamond Plumes from Dual Exhausts
      [exL, exR].forEach((pipeX) => {
        ctx.save();
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.moveTo(pipeX - 5, 8);
        ctx.lineTo(pipeX, 8 + 32 + Math.random() * 16);
        ctx.lineTo(pipeX + 5, 8);
        ctx.closePath();
        ctx.fill();

        // Inner white-hot core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(pipeX - 2, 8);
        ctx.lineTo(pipeX, 8 + 18 + Math.random() * 8);
        ctx.lineTo(pipeX + 2, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });
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

      {/* Top Header Navigation */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            soundManager.playClick();
            soundManager.stopEngineLoop();
            engineRef.current.active = false;
            navigation.goBack();
          }}
        >
          <Text style={styles.backBtnText}>‹ Arcade</Text>
        </TouchableOpacity>

        {/* Level & Meter Display */}
        <TouchableOpacity
          style={styles.levelBadgeBtn}
          onPress={() => {
            soundManager.playClick();
            setCircuitModalOpen(true);
          }}
        >
          <Text style={styles.levelBadgeText}>
            LEVEL {currentLevel} • {curCfg.distMeters}M CIRCUIT ▾
          </Text>
        </TouchableOpacity>

        {/* Live Race Position Box */}
        <View style={[styles.posBadge, { borderColor: getRankBadgeColor(hudRank) }]}>
          <Text style={[styles.posText, { color: getRankBadgeColor(hudRank) }]}>
            {getRankOrdinal(hudRank)} / {hudTotalCars}
          </Text>
        </View>
      </View>

      {/* Realistic Supercar Cockpit Dashboard Ribbon */}
      <View style={styles.cockpitHud}>
        {/* Speedometer */}
        <View style={styles.speedBlock}>
          <Text style={styles.hudMicroLabel}>SPEED</Text>
          <View style={styles.speedRow}>
            <Text style={[styles.speedNum, { color: engineRef.current.isNitro ? '#ff007f' : '#00f0ff' }]}>
              {hudSpeed}
            </Text>
            <Text style={styles.speedUnit}>KM/H</Text>
          </View>
        </View>

        {/* Tachometer RPM Dial */}
        <View style={styles.rpmBlock}>
          <Text style={styles.hudMicroLabel}>RPM (x1000)</Text>
          <Text style={[styles.rpmNum, { color: hudRPM > 6800 ? '#ff0055' : '#ffd700' }]}>
            {(hudRPM / 1000).toFixed(1)}
          </Text>
        </View>

        {/* Distance Progress */}
        <View style={styles.progressBlock}>
          <View style={styles.distLabelRow}>
            <Text style={styles.hudMicroLabel}>DISTANCE</Text>
            <Text style={styles.distVal}>
              {hudDist}m / {curCfg.distMeters}m ({progressPercent}%)
            </Text>
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

        {/* Nitro NOS Tank */}
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

      {/* Slipstream Drafting Indicator Banner */}
      {isDrafting && (
        <View style={styles.draftingBanner}>
          <Text style={styles.draftingText}>⚡ SLIPSTREAM DRAFTING BOOST ACTIVE (+25 KM/H)</Text>
        </View>
      )}

      {/* 60 FPS Highway Canvas Viewport */}
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

          {/* 5-Light Formula 1 Starting Gantry Overlay */}
          {gantryLights >= 0 && (
            <View style={styles.gantryOverlay}>
              <View style={styles.gantryFrame}>
                <Text style={styles.gantryTitle}>
                  {gantryLights === 6 ? 'LIGHTS OUT & AWAY WE GO!' : 'STARTING GRID'}
                </Text>
                <View style={styles.lightsRow}>
                  {[1, 2, 3, 4, 5].map((idx) => {
                    const isLit = gantryLights >= idx && gantryLights < 6;
                    const isGo = gantryLights === 6;
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.gantryBulb,
                          isLit && styles.gantryRedLit,
                          isGo && styles.gantryGreenLit,
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Launch Ready Overlay (Before clicking start) */}
          {!raceActive && !podiumOpen && (
            <TouchableOpacity
              style={styles.launchOverlay}
              onPress={() => launchRace(currentLevel)}
              activeOpacity={0.9}
            >
              <Text style={styles.launchBadge}>TOURNAMENT CHAMPIONSHIP</Text>
              <Text style={styles.launchTitle}>{curCfg.name.toUpperCase()}</Text>
              <Text style={styles.launchSub}>
                LEVEL {currentLevel} • {curCfg.distMeters} METERS SPRINT • {curCfg.rivalsCount} RIVALS
              </Text>

              <View style={styles.launchBtn}>
                <Text style={styles.launchBtnText}>LINE UP ON GRID ▶</Text>
              </View>

              <View style={styles.controlsLegend}>
                <Text style={styles.legendText}>Steer: Left/Right / A-D</Text>
                <Text style={styles.legendText}>•</Text>
                <Text style={styles.legendText}>Gas: Up / W</Text>
                <Text style={styles.legendText}>•</Text>
                <Text style={styles.legendText}>Nitro: Spacebar</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tactile On-Screen Driving Pedals & Steer Controls */}
      <View style={styles.controlsBar}>
        {/* Left Side: Steer Controls */}
        <View style={styles.steerGroup}>
          <TouchableOpacity
            style={styles.steerBtn}
            onPressIn={() => (engineRef.current.steerDir = -1)}
            onPressOut={() => (engineRef.current.steerDir = 0)}
            activeOpacity={0.7}
          >
            <Text style={styles.steerBtnText}>◀ LEFT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.steerBtn}
            onPressIn={() => (engineRef.current.steerDir = 1)}
            onPressOut={() => (engineRef.current.steerDir = 0)}
            activeOpacity={0.7}
          >
            <Text style={styles.steerBtnText}>RIGHT ▶</Text>
          </TouchableOpacity>
        </View>

        {/* Center: Nitro NOS Button */}
        <TouchableOpacity
          style={[styles.nitroActionBtn, engineRef.current.isNitro && { backgroundColor: '#ff007f' }]}
          onPress={triggerNitro}
          activeOpacity={0.8}
        >
          <Text style={styles.nitroBtnText}>🚀 NITRO</Text>
        </TouchableOpacity>

        {/* Right Side: Throttle & Brake Pedals */}
        <View style={styles.pedalsGroup}>
          <TouchableOpacity
            style={styles.brakePedalBtn}
            onPressIn={() => (engineRef.current.isBrake = true)}
            onPressOut={() => (engineRef.current.isBrake = false)}
            activeOpacity={0.7}
          >
            <Text style={styles.brakePedalText}>🔴 BRAKE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gasPedalBtn}
            onPressIn={() => (engineRef.current.isThrottle = true)}
            onPressOut={() => (engineRef.current.isThrottle = false)}
            activeOpacity={0.7}
          >
            <Text style={styles.gasPedalText}>🟢 GAS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 10 Campaign Circuits Selection Modal (300m, 600m, 900m...) */}
      <Modal visible={circuitModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>CHOOSE RACING CIRCUIT</Text>
              <TouchableOpacity onPress={() => setCircuitModalOpen(false)}>
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
                    onPress={() => launchRace(c.level)}
                  >
                    <View style={styles.circuitNumBadge}>
                      <Text style={[styles.circuitNumText, { color: c.stripeColor }]}>#{c.level}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.circuitName}>{c.name}</Text>
                      <Text style={styles.circuitDetails}>
                        Sprint: {c.distMeters}m (+300m) • {c.rivalsCount} AI Rivals
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

      {/* Official Race Arrival-Order Podium Modal */}
      <Modal visible={podiumOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.podiumBox}>
            <Text style={styles.podiumEmoji}>🏁</Text>
            <Text style={styles.podiumTitle}>OFFICIAL FINISH STANDINGS</Text>
            <Text style={styles.podiumSub}>
              Level {currentLevel}: {curCfg.name} ({curCfg.distMeters}m Sprint)
            </Text>

            {/* Standings Table with Exact Arrival Order & Times */}
            <View style={styles.rankingsTable}>
              {podiumList.map((r) => {
                const rankNum = r.rank || 1;
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
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.rankDriverName, isPlayer && { color: '#00f0ff', fontWeight: 'bold' }]}>
                        {r.name}
                      </Text>
                      <Text style={styles.rankSubText}>
                        Top Speed: {Math.round(r.maxSpeed || r.speed)} km/h
                      </Text>
                    </View>
                    <Text style={[styles.rankTime, isPlayer && { color: '#ffd700' }]}>
                      {r.finishTimeStr}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Action Buttons */}
            <View style={styles.podiumActionRow}>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => launchRace(currentLevel)}
                activeOpacity={0.8}
              >
                <Text style={styles.retryBtnText}>RETRY LEVEL</Text>
              </TouchableOpacity>

              {currentLevel < 10 && unlockedLevels.includes(currentLevel + 1) && (
                <TouchableOpacity
                  style={styles.nextLevelBtn}
                  onPress={() => launchRace(currentLevel + 1)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.nextLevelBtnText}>
                    NEXT LEVEL ({CAMPAIGN_CIRCUITS[currentLevel]?.distMeters}M) ▶
                  </Text>
                </TouchableOpacity>
              )}
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
    backgroundColor: '#050711',
    alignItems: 'center',
  },
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#090d1c',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 240, 255, 0.25)',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backBtnText: {
    color: '#00f0ff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  levelBadgeBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  levelBadgeText: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  posBadge: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  posText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cockpitHud: {
    width: '96%',
    maxWidth: 620,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0b0f21',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 6,
  },
  hudMicroLabel: {
    color: '#6b7a99',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  speedBlock: {
    alignItems: 'center',
    minWidth: 70,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  speedNum: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  speedUnit: {
    color: '#6b7a99',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  rpmBlock: {
    alignItems: 'center',
    minWidth: 55,
  },
  rpmNum: {
    fontSize: 17,
    fontWeight: '900',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  progressBlock: {
    flex: 1,
    marginHorizontal: 10,
  },
  distLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distVal: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressTrackBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginTop: 3,
    overflow: 'hidden',
  },
  progressTrackFill: {
    height: '100%',
    borderRadius: 3,
  },
  gearBlock: {
    alignItems: 'center',
    marginRight: 8,
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
    width: 14,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  nitroTankFill: {
    width: '100%',
    borderRadius: 4,
  },
  draftingBanner: {
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  draftingText: {
    color: '#00f0ff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  canvasContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasWrapper: {
    backgroundColor: '#03050c',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.8)',
  },
  gantryOverlay: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  gantryFrame: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  gantryTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  lightsRow: {
    flexDirection: 'row',
  },
  gantryBulb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#0f172a',
    marginHorizontal: 5,
  },
  gantryRedLit: {
    backgroundColor: '#ff0033',
    borderColor: '#ff6688',
    boxShadow: '0 0 16px #ff0033',
  },
  gantryGreenLit: {
    backgroundColor: '#00ff66',
    borderColor: '#88ffaa',
    boxShadow: '0 0 20px #00ff66',
  },
  launchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4, 7, 20, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 20,
  },
  launchBadge: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  launchTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  launchSub: {
    color: '#a0aec0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  launchBtn: {
    backgroundColor: '#ff0055',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 28,
    boxShadow: '0 4px 20px rgba(255, 0, 85, 0.6)',
    marginBottom: 16,
  },
  launchBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  controlsLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendText: {
    color: '#6b7a99',
    fontSize: 11,
    fontWeight: '600',
  },
  controlsBar: {
    width: '96%',
    maxWidth: 620,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  steerGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  steerBtn: {
    backgroundColor: '#131b33',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  steerBtnText: {
    color: '#00f0ff',
    fontSize: 13,
    fontWeight: '900',
  },
  nitroActionBtn: {
    backgroundColor: '#00f0ff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(0, 240, 255, 0.4)',
  },
  nitroBtnText: {
    color: '#040718',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pedalsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  brakePedalBtn: {
    backgroundColor: '#2b0d19',
    borderWidth: 1.5,
    borderColor: '#ff0055',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brakePedalText: {
    color: '#ff0055',
    fontSize: 12,
    fontWeight: '900',
  },
  gasPedalBtn: {
    backgroundColor: '#092917',
    borderWidth: 1.5,
    borderColor: '#00ff66',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gasPedalText: {
    color: '#00ff66',
    fontSize: 13,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#090d1c',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 16,
    padding: 18,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 8,
  },
  modalTitle: {
    color: '#00f0ff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalCloseX: {
    color: '#a0aec0',
    fontSize: 18,
    fontWeight: 'bold',
  },
  circuitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  circuitNumBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuitNumText: {
    fontSize: 13,
    fontWeight: '900',
  },
  circuitName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  circuitDetails: {
    color: '#8a99c7',
    fontSize: 11,
    marginTop: 2,
  },
  podiumBox: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#080c1d',
    borderWidth: 2,
    borderColor: '#ffd700',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    boxShadow: '0 0 35px rgba(255, 215, 0, 0.3)',
  },
  podiumEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  podiumTitle: {
    color: '#ffd700',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  podiumSub: {
    color: '#a0aec0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  rankingsTable: {
    width: '100%',
    marginBottom: 18,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  rankBadge: {
    minWidth: 50,
  },
  rankBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  rankDriverName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  rankSubText: {
    color: '#6b7a99',
    fontSize: 10,
    marginTop: 1,
  },
  rankTime: {
    color: '#a0aec0',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  podiumActionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  retryBtn: {
    flex: 1,
    backgroundColor: '#1b2238',
    borderWidth: 1,
    borderColor: '#3b486b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  nextLevelBtn: {
    flex: 1.4,
    backgroundColor: '#00f0ff',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    boxShadow: '0 4px 15px rgba(0, 240, 255, 0.4)',
  },
  nextLevelBtnText: {
    color: '#040718',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
