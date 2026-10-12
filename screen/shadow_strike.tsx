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
  Platform,
  ScrollView,
} from 'react-native';
import * as THREE from 'three';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// SHADOW STRIKE: AAA BATTLE ROYALE — MAP CONFIGURATIONS & TYPES
// ============================================================================
export type GameFlowPhase =
  | 'MENU'
  | 'MAP_SELECT'
  | 'DASHBOARD'
  | 'LOBBY'
  | 'AIRPLANE'
  | 'FREEFALL'
  | 'PARACHUTE'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAMEOVER';

export type MapId = 'GREEN_ISLAND' | 'DESERT_FRONTIER' | 'FROZEN_SUMMIT' | 'NEON_METROPOLIS';

export interface MapDefinition {
  id: MapId;
  name: string;
  tagline: string;
  desc: string;
  duration: string;
  badge: string;
  accentColor: string;
  skyGradient: [string, string, string];
  fogColor: string;
  fogDensity: number;
  sunColor: string;
  terrainColors: string[];
  vehicleName: string;
  vehicleColor: string;
}

export const FOUR_MAPS: Record<MapId, MapDefinition> = {
  GREEN_ISLAND: {
    id: 'GREEN_ISLAND',
    name: 'GREEN ISLAND',
    tagline: 'TACTICAL ARCHIPELAGO & CITY',
    desc: 'Lush coastal archipelago featuring Neo-Kavala downtown skyscrapers, river bridges, Sector 04 military base, harbor warehouses, and dense pine forests.',
    duration: '12-15 MINS',
    badge: '★ CLASSIC BR ★',
    accentColor: '#00f0ff',
    skyGradient: ['#0a1426', '#14294b', '#483c2c'],
    fogColor: '#112238',
    fogDensity: 0.0055,
    sunColor: '#fff2de',
    terrainColors: ['#263b20', '#1f301b', '#3a4e2e', '#483c2c'],
    vehicleName: 'TACTICAL ALL-TERRAIN BUGGY',
    vehicleColor: '#2b3724',
  },
  DESERT_FRONTIER: {
    id: 'DESERT_FRONTIER',
    name: 'DESERT FRONTIER',
    tagline: 'ARID CANYONS & OIL DEPOTS',
    desc: 'Vast scorched desert with sweeping sand dunes, sandstone canyon bluffs, sun-baked adobe compounds, oil storage tanks, and high-speed highway routes.',
    duration: '10-14 MINS',
    badge: '★ SNIPER HAVEN ★',
    accentColor: '#eab308',
    skyGradient: ['#1e140a', '#42280e', '#7c5324'],
    fogColor: '#3d2b17',
    fogDensity: 0.0045,
    sunColor: '#ffeed4',
    terrainColors: ['#d4a359', '#b8863b', '#8c5828', '#e2b774'],
    vehicleName: 'DESERT ROVER SAND BUGGY',
    vehicleColor: '#b45309',
  },
  FROZEN_SUMMIT: {
    id: 'FROZEN_SUMMIT',
    name: 'FROZEN SUMMIT',
    tagline: 'GLACIAL PEAKS & ICE LAKE',
    desc: 'Snow-capped alpine mountain ridges, a reflective frozen turquoise ice lake, snow-dusted pine forests, and an arctic military research facility.',
    duration: '12-16 MINS',
    badge: '★ EXTREME COLD ★',
    accentColor: '#38bdf8',
    skyGradient: ['#090d16', '#111e33', '#1e3a5f'],
    fogColor: '#172554',
    fogDensity: 0.0065,
    sunColor: '#e0f2fe',
    terrainColors: ['#e2e8f0', '#cbd5e1', '#94a3b8', '#f8fafc'],
    vehicleName: 'ARCTIC CRAWLER TRUCK',
    vehicleColor: '#0284c7',
  },
  NEON_METROPOLIS: {
    id: 'NEON_METROPOLIS',
    name: 'NEON METROPOLIS',
    tagline: 'CYBERPUNK MEGA-GRID DOWNTOWN',
    desc: 'High-density futuristic city with 12 illuminated skyscrapers, glowing holographic billboards, multi-level skybridges, commercial plazas, and wide highways.',
    duration: '14-18 MINS',
    badge: '★ URBAN CLOSE-QUARTERS ★',
    accentColor: '#ec4899',
    skyGradient: ['#050811', '#160b24', '#2e1065'],
    fogColor: '#1e1035',
    fogDensity: 0.0055,
    sunColor: '#f472b6',
    terrainColors: ['#0f172a', '#1e293b', '#334155', '#090d16'],
    vehicleName: 'CYBER CRUISER BUGGY',
    vehicleColor: '#06b6d4',
  },
};

export type WeaponType = 'CARBINE' | 'SMG' | 'SNIPER' | 'SHOTGUN' | 'PISTOL';

export interface WeaponDef {
  id: WeaponType;
  name: string;
  category: string;
  damage: number;
  clipSize: number;
  reserveMax: number;
  fireRate: number;
  range: number;
  spread: number;
  color: string;
}

export const WEAPON_REGISTRY: Record<WeaponType, WeaponDef> = {
  CARBINE: {
    id: 'CARBINE',
    name: 'M4A1 TACTICAL',
    category: 'ASSAULT RIFLE',
    damage: 34,
    clipSize: 30,
    reserveMax: 150,
    fireRate: 0.11,
    range: 120,
    spread: 0.02,
    color: '#00f0ff',
  },
  SMG: {
    id: 'SMG',
    name: 'VECTOR SUB-9',
    category: 'SUBMACHINE GUN',
    damage: 22,
    clipSize: 35,
    reserveMax: 180,
    fireRate: 0.075,
    range: 75,
    spread: 0.04,
    color: '#ff00ff',
  },
  SNIPER: {
    id: 'SNIPER',
    name: 'AWM COVERT .338',
    category: 'SNIPER RIFLE',
    damage: 98,
    clipSize: 5,
    reserveMax: 30,
    fireRate: 1.1,
    range: 220,
    spread: 0.003,
    color: '#ffd700',
  },
  SHOTGUN: {
    id: 'SHOTGUN',
    name: 'SPAS-12 BREACHER',
    category: 'TACTICAL SHOTGUN',
    damage: 70,
    clipSize: 8,
    reserveMax: 40,
    fireRate: 0.75,
    range: 45,
    spread: 0.08,
    color: '#ff6600',
  },
  PISTOL: {
    id: 'PISTOL',
    name: 'G19 COMBAT 9mm',
    category: 'SIDEARM',
    damage: 26,
    clipSize: 15,
    reserveMax: 60,
    fireRate: 0.22,
    range: 55,
    spread: 0.035,
    color: '#a0aec0',
  },
};

export interface LootItem {
  id: number;
  type: 'WEAPON' | 'MEDKIT' | 'ARMOR' | 'AMMO';
  weaponType?: WeaponType;
  name: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  pickedUp: boolean;
  value: number;
}

export interface EnemyBot {
  id: number;
  name: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  hp: number;
  maxHp: number;
  weapon: WeaponType;
  state: 'PATROL' | 'ALERT' | 'CHASE' | 'ATTACK' | 'COVER' | 'DEAD';
  patrolTarget: THREE.Vector3;
  shootCooldown: number;
  isDead: boolean;
  muzzleLight: THREE.PointLight;
  hpBarMesh: THREE.Mesh;
}

export interface MatchHistoryEntry {
  id: string;
  mapName: string;
  placement: number;
  kills: number;
  survivalTimeSec: number;
  damage: number;
  xpEarned: number;
  won: boolean;
  date: string;
}

export interface PlayerDashboardStats {
  callsign: string;
  rankTitle: string;
  level: number;
  xp: number;
  totalMatches: number;
  totalWins: number;
  totalKills: number;
  totalDeaths: number;
  bestSurvivalSec: number;
  highestDamage: number;
  recentMatches: MatchHistoryEntry[];
}

// ============================================================================
// PROCEDURAL AUDIO SYNTHESIZER
// ============================================================================
class BattleRoyaleAudioSystem {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public volume: number = 0.85;

  private airplaneSoundNode: { osc: OscillatorNode; gain: GainNode } | null = null;
  private engineSoundNode: { osc: OscillatorNode; gain: GainNode } | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window !== 'undefined') {
      try {
        const AudioClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioClass) this.ctx = new AudioClass();
      } catch (_) {}
    }
  }

  public getContext(): AudioContext | null {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playGunshot(type: WeaponType = 'CARBINE') {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'SNIPER') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);
        gain.gain.setValueAtTime(0.75 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      } else if (type === 'SHOTGUN') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.28);
        gain.gain.setValueAtTime(0.8 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      } else if (type === 'SMG') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
        gain.gain.setValueAtTime(0.4 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.14);
        gain.gain.setValueAtTime(0.55 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (_) {}
  }

  playEnemyGunshot() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
      gain.gain.setValueAtTime(0.22 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (_) {}
  }

  startAirplaneDrone() {
    if (!this.enabled || this.airplaneSoundNode) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, ctx.currentTime);
      gain.gain.setValueAtTime(0.25 * this.volume, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this.airplaneSoundNode = { osc, gain };
    } catch (_) {}
  }

  stopAirplaneDrone() {
    if (this.airplaneSoundNode) {
      try {
        this.airplaneSoundNode.gain.gain.exponentialRampToValueAtTime(0.001, this.getContext()?.currentTime || 0 + 0.3);
        this.airplaneSoundNode.osc.stop(this.airplaneSoundNode.osc.context.currentTime + 0.35);
      } catch (_) {}
      this.airplaneSoundNode = null;
    }
  }

  playFreefallWind() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(260, now + 0.5);
      gain.gain.setValueAtTime(0.18 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    } catch (_) {}
  }

  playParachuteDeploy() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.4);
      gain.gain.setValueAtTime(0.6 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (_) {}
  }

  setVehicleEngine(active: boolean, speedRatio: number = 0) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    if (active) {
      if (!this.engineSoundNode) {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(60, ctx.currentTime);
          gain.gain.setValueAtTime(0.28 * this.volume, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          this.engineSoundNode = { osc, gain };
        } catch (_) {}
      } else {
        const targetFreq = 55 + speedRatio * 160;
        this.engineSoundNode.osc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.08);
      }
    } else if (this.engineSoundNode) {
      try {
        this.engineSoundNode.osc.stop();
      } catch (_) {}
      this.engineSoundNode = null;
    }
  }

  playEliminationBannerChime() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [880, 1174.66, 1760].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.35 * this.volume, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.2);
      });
    } catch (_) {}
  }

  playStormWarning() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(720, now + 0.35);
      osc.frequency.linearRampToValueAtTime(440, now + 0.7);
      gain.gain.setValueAtTime(0.35 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.85);
    } catch (_) {}
  }

  playLootPickup() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.25 * this.volume, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.15);
      });
    } catch (_) {}
  }

  playVictoryFanfare() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880, 1108.73];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.35 * this.volume, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.45);
      });
    } catch (_) {}
  }

  playDefeatChord() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [220, 185, 146.83];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);
        gain.gain.setValueAtTime(0.4 * this.volume, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.6);
      });
    } catch (_) {}
  }

  playFootstep() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80 + Math.random() * 25, now);
      gain.gain.setValueAtTime(0.08 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (_) {}
  }
}

const brAudio = new BattleRoyaleAudioSystem();

// ============================================================================
// MAIN COMPONENT: SHADOW STRIKE AAA BATTLE ROYALE
// ============================================================================
export default function ShadowStrikeScreen({ navigation }: any) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const mountRef = useRef<any>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Flow State
  const [phase, setPhase] = useState<GameFlowPhase>('MENU');
  const [selectedMapId, setSelectedMapId] = useState<MapId>('GREEN_ISLAND');
  const [graphicsPreset, setGraphicsPreset] = useState<'LOW' | 'MED' | 'HIGH'>('HIGH');

  // Player Dashboard State
  const [dashboard, setDashboard] = useState<PlayerDashboardStats>({
    callsign: 'GHOST-ACTUAL',
    rankTitle: 'ELITE MASTER III',
    level: 1,
    xp: 0,
    totalMatches: 0,
    totalWins: 0,
    totalKills: 0,
    totalDeaths: 0,
    bestSurvivalSec: 0,
    highestDamage: 0,
    recentMatches: [],
  });

  // Active Match Telemetry
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [playerArmor, setPlayerArmor] = useState<number>(100);
  const [aliveCount, setAliveCount] = useState<number>(20);
  const [killsCount, setKillsCount] = useState<number>(0);
  const [currentWeapon, setCurrentWeapon] = useState<WeaponDef>(WEAPON_REGISTRY.CARBINE);
  const [ammoClip, setAmmoClip] = useState<number>(30);
  const [ammoReserve, setAmmoReserve] = useState<number>(120);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [altitudeMeters, setAltitudeMeters] = useState<number>(1200);
  const [descentSpeedKmh, setDescentSpeedKmh] = useState<number>(240);

  // Safe Zone
  const [safeZoneTime, setSafeZoneTime] = useState<number>(90);
  const [safeZonePhase, setSafeZonePhase] = useState<number>(1);
  const [isOutsideSafeZone, setIsOutsideSafeZone] = useState<boolean>(false);

  // Prompts & Banners
  const [interactPrompt, setInteractPrompt] = useState<string | null>(null);
  const [eliminationBanner, setEliminationBanner] = useState<{
    visible: boolean;
    victimName: string;
    kills: number;
    remaining: number;
  }>({ visible: false, victimName: '', kills: 0, remaining: 20 });
  const [hitMarker, setHitMarker] = useState<boolean>(false);
  const [damageFlash, setDamageFlash] = useState<boolean>(false);
  const [killFeed, setKillFeed] = useState<string[]>([]);
  const [showFullMap, setShowFullMap] = useState<boolean>(false);

  // Driving Telemetry
  const [isDriving, setIsDriving] = useState<boolean>(false);
  const [vehicleSpeedKmh, setVehicleSpeedKmh] = useState<number>(0);

  // Post-Match End Results
  const [endMatchStats, setEndMatchStats] = useState({
    won: false,
    placement: 1,
    kills: 0,
    timeSec: 0,
    damage: 0,
    xpEarned: 0,
    mapName: 'GREEN ISLAND',
  });

  // Mutable Game Loop State
  const gameRef = useRef({
    phase: 'MENU' as GameFlowPhase,
    mapId: 'GREEN_ISLAND' as MapId,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    dirSun: null as THREE.DirectionalLight | null,
    animFrameId: null as any,
    clock: new THREE.Clock(),
    elapsedTime: 0,

    keys: {
      w: false,
      a: false,
      s: false,
      d: false,
      shift: false,
      space: false,
      e: false,
      r: false,
    },
    mouseLook: {
      yaw: 0,
      pitch: 0.15,
      isAiming: false,
    },

    player: {
      position: new THREE.Vector3(0, 120, -200),
      velocity: new THREE.Vector3(0, 0, 0),
      mesh: null as THREE.Group | null,
      torsoGroup: null as THREE.Group | null,
      legL: null as THREE.Group | null,
      legR: null as THREE.Group | null,
      gunGroup: null as THREE.Group | null,
      parachuteGroup: null as THREE.Group | null,
      parachuteOpen: false,
      onGround: false,
      hp: 100,
      armor: 100,
      walkCycle: 0,
      currentWeapon: WEAPON_REGISTRY.CARBINE,
      clip: 30,
      reserve: 120,
      reloading: false,
      lastShotTime: 0,
      inVehicle: false,
    },

    airplane: {
      mesh: null as THREE.Group | null,
      position: new THREE.Vector3(0, 120, -250),
      velocity: new THREE.Vector3(0, 0, 24),
      hasJumped: false,
    },

    vehicle: {
      mesh: null as THREE.Group | null,
      position: new THREE.Vector3(12, 0.4, 15),
      velocity: new THREE.Vector3(0, 0, 0),
      yaw: 0,
      speed: 0,
      occupied: false,
    },

    safeZone: {
      center: new THREE.Vector2(0, 0),
      targetCenter: new THREE.Vector2(15, -10),
      radius: 220,
      targetRadius: 130,
      shrinkTimer: 90,
      mesh: null as THREE.Mesh | null,
      stormRingMesh: null as THREE.Mesh | null,
      currentStage: 1,
    },

    bots: [] as EnemyBot[],
    lootItems: [] as LootItem[],
    bulletTracers: [] as { line: THREE.Line; life: number }[],
    obstacles: [] as THREE.Box3[],
    damageDealt: 0,
    eliminationCount: 0,
  });

  // Load persistent dashboard stats on start
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('SHADOW_STRIKE_DASHBOARD');
        if (saved) {
          setDashboard(JSON.parse(saved));
        }
      } catch (_) {}
    })();
  }, []);

  const saveDashboardStats = async (newEntry: MatchHistoryEntry) => {
    try {
      const prev = dashboard;
      const totalMatches = prev.totalMatches + 1;
      const totalWins = prev.totalWins + (newEntry.won ? 1 : 0);
      const totalKills = prev.totalKills + newEntry.kills;
      const totalDeaths = prev.totalDeaths + (newEntry.won ? 0 : 1);
      const bestSurvivalSec = Math.max(prev.bestSurvivalSec, newEntry.survivalTimeSec);
      const highestDamage = Math.max(prev.highestDamage, newEntry.damage);
      const newXp = prev.xp + newEntry.xpEarned;
      const newLevel = Math.min(100, 1 + Math.floor(newXp / 800));

      let rank = 'RECRUIT I';
      if (newLevel >= 100) rank = 'SUPREME CHAMPION';
      else if (newLevel >= 80) rank = 'GRANDMASTER COMMANDER';
      else if (newLevel >= 60) rank = 'ELITE MASTER III';
      else if (newLevel >= 40) rank = 'SPECIAL FORCES CAPTAIN';
      else if (newLevel >= 20) rank = 'VETERAN SERGEANT';
      else if (newLevel >= 10) rank = 'SPECIALIST II';

      const updatedHistory = [newEntry, ...prev.recentMatches.slice(0, 9)];

      const updatedDashboard: PlayerDashboardStats = {
        ...prev,
        level: newLevel,
        xp: newXp,
        rankTitle: rank,
        totalMatches,
        totalWins,
        totalKills,
        totalDeaths,
        bestSurvivalSec,
        highestDamage,
        recentMatches: updatedHistory,
      };

      setDashboard(updatedDashboard);
      await AsyncStorage.setItem('SHADOW_STRIKE_DASHBOARD', JSON.stringify(updatedDashboard));
    } catch (_) {}
  };

  // ============================================================================
  // THREE.JS SCENE BUILDER ACCORDING TO SELECTED MAP
  // ============================================================================
  useEffect(() => {
    if (Platform.OS !== 'web' || !mountRef.current) return;

    const g = gameRef.current;
    g.mapId = selectedMapId;
    const mapDef = FOUR_MAPS[selectedMapId];

    const width = mountRef.current.clientWidth || winWidth;
    const height = mountRef.current.clientHeight || winHeight;

    // 1. Scene & Map Atmospheric Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(mapDef.skyGradient[0]);
    scene.fog = new THREE.FogExp2(mapDef.fogColor, mapDef.fogDensity);
    g.scene = scene;

    // 2. Skydome with Map Gradient
    const skyGeo = new THREE.SphereGeometry(450, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      color: mapDef.skyGradient[1],
      side: THREE.BackSide,
      fog: false,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 950);
    camera.position.set(0, 3, 40);
    g.camera = camera;

    // 4. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    g.renderer = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 5. Lighting Rig Tailored to Map
    const ambientLight = new THREE.HemisphereLight(mapDef.accentColor, '#221810', 1.05);
    scene.add(ambientLight);

    const dirSun = new THREE.DirectionalLight(mapDef.sunColor, 2.5);
    dirSun.position.set(90, 160, 80);
    dirSun.castShadow = true;
    dirSun.shadow.mapSize.width = 2048;
    dirSun.shadow.mapSize.height = 2048;
    dirSun.shadow.camera.near = 10;
    dirSun.shadow.camera.far = 450;
    const d = 160;
    dirSun.shadow.camera.left = -d;
    dirSun.shadow.camera.right = d;
    dirSun.shadow.camera.top = d;
    dirSun.shadow.camera.bottom = -d;
    scene.add(dirSun);
    g.dirSun = dirSun;

    // 6. Build Map-Specific Terrain, Structures, Vehicle, and Entities
    buildDistinctMapWorld(scene, g, selectedMapId);
    buildMapVehicle(scene, g, mapDef);
    buildC130Airplane(scene, g);
    buildSafeZoneStorm(scene, g);
    buildPlayerOperative(scene, g);
    spawnMapLoot(scene, g);
    spawnHostileBots(scene, g);

    // 7. Input Events
    setupInputEvents(renderer.domElement, g);

    // 8. Resize Handler
    const onResize = () => {
      if (!mountRef.current || !g.camera || !g.renderer) return;
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;
      g.camera.aspect = w / h;
      g.camera.updateProjectionMatrix();
      g.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 9. Main Game Loop
    let isRunning = true;
    const loop = () => {
      if (!isRunning) return;
      const dt = Math.min(g.clock.getDelta(), 0.1);
      g.elapsedTime += dt;

      if (g.phase === 'MENU' || g.phase === 'MAP_SELECT' || g.phase === 'DASHBOARD') {
        const t = g.elapsedTime * 0.35;
        if (g.camera) {
          g.camera.position.set(Math.sin(t) * 14, 3.8, Math.cos(t) * 14);
          g.camera.lookAt(0, 1.4, 0);
        }
      } else if (g.phase === 'AIRPLANE') {
        updateAirplaneFlight(dt, g);
      } else if (g.phase === 'FREEFALL' || g.phase === 'PARACHUTE') {
        updateAirborneDescent(dt, g);
      } else if (g.phase === 'PLAYING') {
        updateGroundGameplay(dt, g);
        updateSafeZoneStorm(dt, g);
        updateHostileBotAI(dt, g);
        updateVehiclePhysics(dt, g);
        updateBulletTracers(g);
        renderMinimap(g);
      }

      if (g.renderer && g.scene && g.camera) {
        g.renderer.render(g.scene, g.camera);
      }

      g.animFrameId = requestAnimationFrame(loop);
    };

    g.animFrameId = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (g.animFrameId) cancelAnimationFrame(g.animFrameId);
      window.removeEventListener('resize', onResize);
      brAudio.stopAirplaneDrone();
      brAudio.setVehicleEngine(false);
      renderer.dispose();
    };
  }, [winWidth, winHeight, selectedMapId]);

  // ============================================================================
  // PROCEDURAL TERRAIN ELEVATION PER MAP
  // ============================================================================
  const getTerrainHeight = (x: number, z: number, mapId: MapId): number => {
    const dist = Math.sqrt(x * x + z * z);
    if (dist > 220) return -1.5; // Outer boundary / ocean

    if (mapId === 'GREEN_ISLAND') {
      if (Math.abs(x + 10) < 6) return -0.8; // river
      if (Math.sqrt((x - 50) ** 2 + (z + 60) ** 2) < 45) return 0.2; // city floor
      let h = Math.sin(x * 0.035) * Math.cos(z * 0.035) * 6.5;
      if (dist > 140) h += Math.pow((dist - 140) * 0.22, 1.7);
      return Math.max(0, h);
    } else if (mapId === 'DESERT_FRONTIER') {
      // Rolling sweeping sand dunes
      let h =
        Math.sin(x * 0.025 + 0.5) * Math.cos(z * 0.025) * 8.5 +
        Math.sin(x * 0.06) * 3.2;
      return Math.max(0, h);
    } else if (mapId === 'FROZEN_SUMMIT') {
      // Central frozen lake basin
      if (dist < 40) return 0.1;
      // Steep mountain crags
      let h = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 11.5 + Math.pow(dist * 0.08, 1.6);
      return Math.max(0, h);
    } else {
      // NEON_METROPOLIS: Flat urban floor
      return 0.1;
    }
  };

  const buildDistinctMapWorld = (scene: THREE.Scene, g: any, mapId: MapId) => {
    const mapDef = FOUR_MAPS[mapId];
    g.obstacles = [];

    // 1. Terrain Mesh
    const geo = new THREE.PlaneGeometry(500, 500, 90, 90);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i), mapId));
    }
    geo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: mapDef.terrainColors[0],
      roughness: 0.88,
      flatShading: true,
    });
    const terrain = new THREE.Mesh(geo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // 2. Surrounding Water / Boundary
    const waterMat = new THREE.MeshStandardMaterial({
      color: mapId === 'FROZEN_SUMMIT' ? '#7dd3fc' : '#0d2d4a',
      roughness: mapId === 'FROZEN_SUMMIT' ? 0.1 : 0.25,
      metalness: 0.7,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), waterMat);
    water.rotateX(-Math.PI / 2);
    water.position.y = -0.4;
    scene.add(water);

    // 3. Map Structures
    if (mapId === 'GREEN_ISLAND') {
      buildGreenIslandStructures(scene, g);
    } else if (mapId === 'DESERT_FRONTIER') {
      buildDesertFrontierStructures(scene, g);
    } else if (mapId === 'FROZEN_SUMMIT') {
      buildFrozenSummitStructures(scene, g);
    } else {
      buildNeonMetropolisStructures(scene, g);
    }
  };

  // Map 1 Structures: Green Island
  const buildGreenIslandStructures = (scene: THREE.Scene, g: any) => {
    const bMat = new THREE.MeshStandardMaterial({ color: '#374151', roughness: 0.7 });
    const cMat = new THREE.MeshStandardMaterial({ color: '#4b5563', roughness: 0.8 });

    // Neo-Kavala Downtown Towers
    [
      { x: 40, z: -50, w: 18, h: 42, d: 18 },
      { x: 65, z: -50, w: 16, h: 32, d: 16 },
      { x: 40, z: -75, w: 16, h: 26, d: 16 },
      { x: 65, z: -75, w: 20, h: 48, d: 20 },
    ].forEach((b) => {
      const by = getTerrainHeight(b.x, b.z, 'GREEN_ISLAND');
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), bMat);
      m.position.set(b.x, by + b.h / 2, b.z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      g.obstacles.push(new THREE.Box3().setFromObject(m));
    });

    // Sector 04 Military Bunker
    const bunker = new THREE.Mesh(new THREE.BoxGeometry(32, 7.5, 22), cMat);
    bunker.position.set(-90, getTerrainHeight(-90, -70, 'GREEN_ISLAND') + 3.75, -70);
    bunker.castShadow = true;
    scene.add(bunker);
    g.obstacles.push(new THREE.Box3().setFromObject(bunker));
  };

  // Map 2 Structures: Desert Frontier
  const buildDesertFrontierStructures = (scene: THREE.Scene, g: any) => {
    const adobeMat = new THREE.MeshStandardMaterial({ color: '#c29b68', roughness: 0.9 });
    const rustMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.6, metalness: 0.5 });

    // Desert Adobe Compounds
    [
      { x: 30, z: -40, w: 16, h: 9, d: 14 },
      { x: 55, z: -35, w: 20, h: 12, d: 18 },
      { x: 35, z: -65, w: 14, h: 8, d: 14 },
      { x: -50, z: 40, w: 22, h: 10, d: 20 },
      { x: -75, z: 45, w: 18, h: 14, d: 16 },
    ].forEach((b) => {
      const by = getTerrainHeight(b.x, b.z, 'DESERT_FRONTIER');
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), adobeMat);
      m.position.set(b.x, by + b.h / 2, b.z);
      m.castShadow = true;
      scene.add(m);
      g.obstacles.push(new THREE.Box3().setFromObject(m));
    });

    // Industrial Cylindrical Oil Storage Tanks
    [-30, -10, 10].forEach((ox) => {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 12, 16), rustMat);
      tank.position.set(ox, getTerrainHeight(ox, 80, 'DESERT_FRONTIER') + 6, 80);
      tank.castShadow = true;
      scene.add(tank);
      g.obstacles.push(new THREE.Box3().setFromObject(tank));
    });
  };

  // Map 3 Structures: Frozen Summit
  const buildFrozenSummitStructures = (scene: THREE.Scene, g: any) => {
    const snowLabMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.4, metalness: 0.6 });
    const iceDomeMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.2, metalness: 0.8 });

    // Arctic Research Labs
    [
      { x: -45, z: -45, w: 24, h: 10, d: 16 },
      { x: -15, z: -50, w: 20, h: 8, d: 18 },
      { x: 50, z: 50, w: 22, h: 11, d: 20 },
    ].forEach((b) => {
      const by = getTerrainHeight(b.x, b.z, 'FROZEN_SUMMIT');
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), snowLabMat);
      m.position.set(b.x, by + b.h / 2, b.z);
      m.castShadow = true;
      scene.add(m);
      g.obstacles.push(new THREE.Box3().setFromObject(m));
    });

    // Radar Geo-Dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), iceDomeMat);
    dome.position.set(0, getTerrainHeight(0, 0, 'FROZEN_SUMMIT'), 0);
    scene.add(dome);
  };

  // Map 4 Structures: Neon Metropolis
  const buildNeonMetropolisStructures = (scene: THREE.Scene, g: any) => {
    const cyberDarkMat = new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.2, metalness: 0.8 });
    const neonPinkMat = new THREE.MeshBasicMaterial({ color: '#f43f5e' });
    const neonCyanMat = new THREE.MeshBasicMaterial({ color: '#06b6d4' });

    // 12 Cyberpunk Towers with glowing billboard headers
    const towers = [
      { x: -60, z: -60, w: 20, h: 65, d: 20 },
      { x: -30, z: -60, w: 18, h: 50, d: 18 },
      { x: 0, z: -60, w: 22, h: 75, d: 22 },
      { x: 30, z: -60, w: 18, h: 55, d: 18 },
      { x: 60, z: -60, w: 20, h: 60, d: 20 },
      { x: -60, z: 0, w: 18, h: 48, d: 18 },
      { x: 60, z: 0, w: 22, h: 70, d: 22 },
      { x: -60, z: 60, w: 20, h: 58, d: 20 },
      { x: -30, z: 60, w: 18, h: 45, d: 18 },
      { x: 0, z: 60, w: 22, h: 80, d: 22 },
      { x: 30, z: 60, w: 18, h: 52, d: 18 },
      { x: 60, z: 60, w: 20, h: 62, d: 20 },
    ];

    towers.forEach((b, idx) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), cyberDarkMat);
      m.position.set(b.x, b.h / 2, b.z);
      m.castShadow = true;
      scene.add(m);

      // Neon Top Header
      const bill = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.8, 4, 0.4), idx % 2 === 0 ? neonPinkMat : neonCyanMat);
      bill.position.set(b.x, b.h + 2.5, b.z + b.d / 2);
      scene.add(bill);

      g.obstacles.push(new THREE.Box3().setFromObject(m));
    });
  };

  // ============================================================================
  // DRIVABLE VEHICLE
  // ============================================================================
  const buildMapVehicle = (scene: THREE.Scene, g: any, mapDef: MapDefinition) => {
    const vGroup = new THREE.Group();
    vGroup.position.set(12, 0.5, 15);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: mapDef.vehicleColor,
      roughness: 0.5,
      metalness: 0.4,
    });
    const cageMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.8 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.9 });

    // Chassis
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 4.4), bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    vGroup.add(body);

    // Roll cage
    const cage = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.3, 2.5), cageMat);
    cage.position.set(0, 1.4, -0.2);
    vGroup.add(cage);

    // 4 Wheels
    const wGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.38, 12);
    wGeo.rotateZ(Math.PI / 2);
    [
      { x: -1.3, z: 1.4 },
      { x: 1.3, z: 1.4 },
      { x: -1.3, z: -1.4 },
      { x: 1.3, z: -1.4 },
    ].forEach((pos) => {
      const w = new THREE.Mesh(wGeo, wheelMat);
      w.position.set(pos.x, 0.48, pos.z);
      w.castShadow = true;
      vGroup.add(w);
    });

    scene.add(vGroup);
    g.vehicle.mesh = vGroup;
  };

  // C-130 Airplane
  const buildC130Airplane = (scene: THREE.Scene, g: any) => {
    const plane = new THREE.Group();
    plane.position.set(0, 120, -250);

    const metalMat = new THREE.MeshStandardMaterial({ color: '#374151', roughness: 0.4, metalness: 0.7 });
    const wingMat = new THREE.MeshStandardMaterial({ color: '#4b5563', roughness: 0.5, metalness: 0.6 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 38, 16), metalMat);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    plane.add(body);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(52, 0.6, 7.5), wingMat);
    wing.position.set(0, 1.2, 4);
    wing.castShadow = true;
    plane.add(wing);

    scene.add(plane);
    g.airplane.mesh = plane;
  };

  // Safe Zone 3D Hologram
  const buildSafeZoneStorm = (scene: THREE.Scene, g: any) => {
    const stormWallGeo = new THREE.CylinderGeometry(220, 220, 90, 64, 1, true);
    const stormWallMat = new THREE.MeshBasicMaterial({
      color: '#0066ff',
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const stormWall = new THREE.Mesh(stormWallGeo, stormWallMat);
    stormWall.position.y = 45;
    scene.add(stormWall);
    g.safeZone.stormRingMesh = stormWall;
  };

  // Player Operative Rig
  const buildPlayerOperative = (scene: THREE.Scene, g: any) => {
    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 120, -200);

    const camoMat = new THREE.MeshStandardMaterial({ color: '#2e3d2a', roughness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#111418', roughness: 0.7 });
    const visorMat = new THREE.MeshStandardMaterial({ color: '#00f0ff', emissive: '#00e5ff', roughness: 0.2 });
    const gunMat = new THREE.MeshStandardMaterial({ color: '#0c0e12', roughness: 0.3, metalness: 0.9 });

    // Torso
    const torso = new THREE.Group();
    torso.position.y = 1.35;
    playerGroup.add(torso);
    g.player.torsoGroup = torso;

    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.52), camoMat);
    shirt.castShadow = true;
    torso.add(shirt);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.52, 0.5), darkMat);
    head.position.y = 0.8;
    head.castShadow = true;
    torso.add(head);

    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.16), visorMat);
    goggles.position.set(0, 0.85, 0.26);
    torso.add(goggles);

    // Parachute
    const chuteGroup = new THREE.Group();
    chuteGroup.position.set(0, 4.5, 0);
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45),
      new THREE.MeshStandardMaterial({ color: '#1e3a24', side: THREE.DoubleSide })
    );
    canopy.rotation.x = Math.PI;
    chuteGroup.add(canopy);
    chuteGroup.visible = false;
    playerGroup.add(chuteGroup);
    g.player.parachuteGroup = chuteGroup;

    // Legs
    const legLGroup = new THREE.Group();
    legLGroup.position.set(-0.24, 0.95, 0);
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.95, 0.32), camoMat);
    legL.position.y = -0.45;
    legL.castShadow = true;
    legLGroup.add(legL);
    playerGroup.add(legLGroup);
    g.player.legL = legLGroup;

    const legRGroup = new THREE.Group();
    legRGroup.position.set(0.24, 0.95, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.95, 0.32), camoMat);
    legR.position.y = -0.45;
    legR.castShadow = true;
    legRGroup.add(legR);
    playerGroup.add(legRGroup);
    g.player.legR = legRGroup;

    // Gun
    const gunGroup = new THREE.Group();
    gunGroup.position.set(0.42, 1.25, 0.4);
    const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.95), gunMat);
    gunMesh.castShadow = true;
    gunGroup.add(gunMesh);
    const mLight = new THREE.PointLight('#ffe066', 0, 10);
    mLight.position.set(0, 0.05, 1.0);
    gunGroup.add(mLight);
    playerGroup.add(gunGroup);
    g.player.gunGroup = gunGroup;

    scene.add(playerGroup);
    g.player.mesh = playerGroup;
  };

  // Loot Items
  const spawnMapLoot = (scene: THREE.Scene, g: any) => {
    const lootSpawns = [
      { pos: new THREE.Vector3(45, 0, -45), type: 'WEAPON' as const, wType: 'SNIPER' as const, name: 'AWM COVERT .338' },
      { pos: new THREE.Vector3(68, 0, -68), type: 'WEAPON' as const, wType: 'SMG' as const, name: 'VECTOR SUB-9' },
      { pos: new THREE.Vector3(-85, 0, -65), type: 'WEAPON' as const, wType: 'CARBINE' as const, name: 'M4A1 TACTICAL' },
      { pos: new THREE.Vector3(15, 0, 18), type: 'MEDKIT' as const, name: 'MILITARY MEDKIT (+75 HP)' },
      { pos: new THREE.Vector3(70, 0, 95), type: 'ARMOR' as const, name: 'LEVEL 3 PLATE ARMOR (+100 AP)' },
      { pos: new THREE.Vector3(-15, 0, -10), type: 'AMMO' as const, name: '5.56mm HIGH CAPACITY BOX (+60)' },
    ];

    const items: LootItem[] = [];
    lootSpawns.forEach((item, idx) => {
      const y = getTerrainHeight(item.pos.x, item.pos.z, g.mapId) + 0.35;
      const group = new THREE.Group();
      group.position.set(item.pos.x, y, item.pos.z);

      let color = '#00f0ff';
      if (item.type === 'WEAPON') color = WEAPON_REGISTRY[item.wType || 'CARBINE'].color;
      else if (item.type === 'MEDKIT') color = '#00ff66';
      else if (item.type === 'ARMOR') color = '#3b82f6';

      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.45, 0.8),
        new THREE.MeshStandardMaterial({ color, emissive: color, roughness: 0.3 })
      );
      box.castShadow = true;
      group.add(box);

      const pLight = new THREE.PointLight(color, 1.8, 6);
      pLight.position.y = 0.5;
      group.add(pLight);

      scene.add(group);
      items.push({
        id: idx + 1,
        type: item.type,
        weaponType: item.wType,
        name: item.name,
        mesh: group,
        position: group.position,
        pickedUp: false,
        value: 75,
      });
    });
    g.lootItems = items;
  };

  // Hostile Bots
  const spawnHostileBots = (scene: THREE.Scene, g: any) => {
    const botCount = 19; // 19 bots + 1 player = 20 total
    const enemyMat = new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.6 });
    const beretMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 });
    const gunMat = new THREE.MeshStandardMaterial({ color: '#1a1f26', roughness: 0.3, metalness: 0.8 });

    const bots: EnemyBot[] = [];
    for (let i = 0; i < botCount; i++) {
      const angle = (i / botCount) * Math.PI * 2;
      const dist = 55 + (i % 4) * 35;
      const bx = Math.cos(angle) * dist + 20;
      const bz = Math.sin(angle) * dist - 30;
      const by = getTerrainHeight(bx, bz, g.mapId);

      const bGroup = new THREE.Group();
      bGroup.position.set(bx, by, bz);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.1, 0.55), enemyMat);
      torso.position.y = 1.35;
      torso.castShadow = true;
      bGroup.add(torso);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), enemyMat);
      head.position.y = 2.1;
      head.castShadow = true;
      bGroup.add(head);

      const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.22, 8), beretMat);
      beret.position.set(0.08, 2.4, 0);
      bGroup.add(beret);

      const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.85), gunMat);
      rifle.position.set(0.4, 1.25, 0.35);
      bGroup.add(rifle);

      const mLight = new THREE.PointLight('#ff3300', 0, 7);
      mLight.position.set(0.4, 1.25, 0.8);
      bGroup.add(mLight);

      // Floating HP Bar
      const hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.16),
        new THREE.MeshBasicMaterial({ color: '#ff0033', side: THREE.DoubleSide })
      );
      hpBar.position.set(0, 2.7, 0);
      bGroup.add(hpBar);

      scene.add(bGroup);

      bots.push({
        id: i + 1,
        name: `Opponent_${String(i + 1).padStart(2, '0')}`,
        mesh: bGroup,
        position: bGroup.position,
        velocity: new THREE.Vector3(),
        hp: 100,
        maxHp: 100,
        weapon: 'CARBINE',
        state: 'PATROL',
        patrolTarget: new THREE.Vector3(bx + (Math.random() - 0.5) * 40, by, bz + (Math.random() - 0.5) * 40),
        shootCooldown: 1.2 + Math.random(),
        isDead: false,
        muzzleLight: mLight,
        hpBarMesh: hpBar,
      });
    }

    g.bots = bots;
    setAliveCount(bots.length + 1);
  };

  // ============================================================================
  // AIRPLANE FLIGHT & FREEFALL / PARACHUTE MECHANICS
  // ============================================================================
  const updateAirplaneFlight = (dt: number, g: any) => {
    const p = g.airplane;
    p.position.add(p.velocity.clone().multiplyScalar(dt));

    if (p.mesh) p.mesh.position.copy(p.position);

    if (g.camera) {
      g.camera.position.set(p.position.x - 22, p.position.y + 12, p.position.z - 28);
      g.camera.lookAt(p.position);
    }

    setAltitudeMeters(Math.round(p.position.y * 10));
    setDescentSpeedKmh(240);

    if (p.position.z > 160 && !p.hasJumped) {
      jumpFromAircraft();
    }
  };

  const jumpFromAircraft = () => {
    const g = gameRef.current;
    if (g.phase !== 'AIRPLANE') return;

    g.airplane.hasJumped = true;
    brAudio.stopAirplaneDrone();
    brAudio.playFreefallWind();

    g.player.position.copy(g.airplane.position);
    g.player.velocity.set(0, -28, 12);
    g.phase = 'FREEFALL';
    setPhase('FREEFALL');
  };

  const deployParachute = () => {
    const g = gameRef.current;
    if (g.phase !== 'FREEFALL') return;

    g.player.parachuteOpen = true;
    if (g.player.parachuteGroup) g.player.parachuteGroup.visible = true;
    brAudio.playParachuteDeploy();

    g.player.velocity.y = -8.5;
    g.phase = 'PARACHUTE';
    setPhase('PARACHUTE');
  };

  const updateAirborneDescent = (dt: number, g: any) => {
    const p = g.player;
    if (!p.mesh) return;

    const forward = new THREE.Vector3(-Math.sin(g.mouseLook.yaw), 0, -Math.cos(g.mouseLook.yaw));
    const right = new THREE.Vector3(Math.cos(g.mouseLook.yaw), 0, -Math.sin(g.mouseLook.yaw));

    const steer = new THREE.Vector3();
    if (g.keys.w) steer.add(forward);
    if (g.keys.s) steer.sub(forward);
    if (g.keys.d) steer.add(right);
    if (g.keys.a) steer.sub(right);
    if (steer.lengthSq() > 0.01) steer.normalize();

    const glideSpeed = g.phase === 'PARACHUTE' ? 14 : 26;
    p.velocity.x = steer.x * glideSpeed;
    p.velocity.z = steer.z * glideSpeed;

    if (g.phase === 'FREEFALL') {
      p.velocity.y = Math.max(-48, p.velocity.y - 18 * dt);
    } else {
      p.velocity.y = -7.5;
    }

    p.position.add(p.velocity.clone().multiplyScalar(dt));
    p.mesh.position.copy(p.position);
    p.mesh.rotation.y = g.mouseLook.yaw;

    const groundH = getTerrainHeight(p.position.x, p.position.z, g.mapId);
    setAltitudeMeters(Math.max(0, Math.round((p.position.y - groundH) * 10)));
    setDescentSpeedKmh(Math.round(Math.abs(p.velocity.y) * 4.2));

    if (g.camera) {
      const camOffset = g.phase === 'PARACHUTE' ? 11 : 6;
      g.camera.position.set(
        p.position.x + Math.sin(g.mouseLook.yaw) * camOffset,
        p.position.y + 4.5,
        p.position.z + Math.cos(g.mouseLook.yaw) * camOffset
      );
      g.camera.lookAt(p.position);
    }

    if (p.position.y <= groundH + 0.5) {
      p.position.y = groundH;
      p.velocity.set(0, 0, 0);
      p.onGround = true;
      p.parachuteOpen = false;
      if (p.parachuteGroup) p.parachuteGroup.visible = false;

      brAudio.playFootstep();
      g.phase = 'PLAYING';
      setPhase('PLAYING');
      pushKillFeed(`DEPLOYED: Touchdown on ${FOUR_MAPS[g.mapId as MapId].name}!`);
    }
  };

  // ============================================================================
  // GROUND GAMEPLAY: MOVEMENT, COMBAT & ELIMINATION
  // ============================================================================
  const updateGroundGameplay = (dt: number, g: any) => {
    const p = g.player;
    if (!p.mesh || p.inVehicle) return;

    const forward = new THREE.Vector3(-Math.sin(g.mouseLook.yaw), 0, -Math.cos(g.mouseLook.yaw));
    const right = new THREE.Vector3(Math.cos(g.mouseLook.yaw), 0, -Math.sin(g.mouseLook.yaw));

    const move = new THREE.Vector3();
    if (g.keys.w) move.add(forward);
    if (g.keys.s) move.sub(forward);
    if (g.keys.d) move.add(right);
    if (g.keys.a) move.sub(right);

    const isMoving = move.lengthSq() > 0.01;
    if (isMoving) move.normalize();

    const speed = g.keys.shift && !g.mouseLook.isAiming ? 13.5 : g.mouseLook.isAiming ? 5.2 : 8.0;
    p.velocity.x = move.x * speed;
    p.velocity.z = move.z * speed;

    if (g.keys.space && p.onGround) {
      p.velocity.y = 9.8;
      p.onGround = false;
      brAudio.playFootstep();
    }

    p.velocity.y -= 24 * dt;

    const nextPos = p.position.clone().add(p.velocity.clone().multiplyScalar(dt));
    const groundY = getTerrainHeight(nextPos.x, nextPos.z, g.mapId);

    if (nextPos.y <= groundY) {
      nextPos.y = groundY;
      p.velocity.y = 0;
      p.onGround = true;
    }

    p.position.copy(nextPos);
    p.mesh.position.copy(p.position);
    p.mesh.rotation.y = g.mouseLook.yaw;

    if (isMoving && p.onGround) {
      p.walkCycle += dt * (g.keys.shift ? 16 : 10);
      const stride = Math.sin(p.walkCycle) * (g.keys.shift ? 0.72 : 0.5);
      if (p.legL) p.legL.rotation.x = stride;
      if (p.legR) p.legR.rotation.x = -stride;
    }

    // Third-person camera follow
    if (g.camera) {
      const camDist = g.mouseLook.isAiming ? 2.0 : 3.8;
      const camHeight = g.mouseLook.isAiming ? 1.6 : 2.2;
      const shoulderX = g.mouseLook.isAiming ? 0.65 : 0.85;

      const camX = p.position.x + Math.sin(g.mouseLook.yaw) * camDist + Math.cos(g.mouseLook.yaw) * shoulderX;
      const camZ = p.position.z + Math.cos(g.mouseLook.yaw) * camDist - Math.sin(g.mouseLook.yaw) * shoulderX;
      let camY = p.position.y + camHeight + Math.sin(g.mouseLook.pitch) * 2.5;

      const camGroundH = getTerrainHeight(camX, camZ, g.mapId);
      camY = Math.max(camGroundH + 0.6, camY);

      g.camera.position.set(camX, camY, camZ);
      const lookTarget = p.position.clone().add(
        new THREE.Vector3(
          -Math.sin(g.mouseLook.yaw) * 30,
          1.6 + Math.sin(g.mouseLook.pitch) * 14,
          -Math.cos(g.mouseLook.yaw) * 30
        )
      );
      g.camera.lookAt(lookTarget);
    }

    checkInteractions(g);
  };

  const checkInteractions = (g: any) => {
    const p = g.player;

    // Vehicle
    if (p.position.distanceTo(g.vehicle.position) < 3.8 && !p.inVehicle) {
      setInteractPrompt(`[E] ENTER ${FOUR_MAPS[g.mapId as MapId].vehicleName}`);
      if (g.keys.e) {
        enterVehicle(g);
        g.keys.e = false;
      }
      return;
    }

    // Loot
    let nearLoot: LootItem | null = null;
    for (let item of g.lootItems) {
      if (!item.pickedUp && p.position.distanceTo(item.position) < 2.5) {
        nearLoot = item;
        break;
      }
    }

    if (nearLoot) {
      setInteractPrompt(`[E] PICK UP ${nearLoot.name}`);
      if (g.keys.e) {
        nearLoot.pickedUp = true;
        nearLoot.mesh.visible = false;
        brAudio.playLootPickup();
        if (nearLoot.type === 'WEAPON' && nearLoot.weaponType) {
          const nw = WEAPON_REGISTRY[nearLoot.weaponType];
          g.player.currentWeapon = nw;
          g.player.clip = nw.clipSize;
          g.player.reserve = nw.reserveMax;
          setCurrentWeapon(nw);
          setAmmoClip(nw.clipSize);
          setAmmoReserve(nw.reserveMax);
          pushKillFeed(`EQUIPPED: ${nw.name}`);
        } else if (nearLoot.type === 'MEDKIT') {
          g.player.hp = Math.min(100, g.player.hp + 75);
          setPlayerHp(g.player.hp);
        } else if (nearLoot.type === 'ARMOR') {
          g.player.armor = 100;
          setPlayerArmor(100);
        }
        g.keys.e = false;
      }
    } else {
      setInteractPrompt(null);
    }
  };

  const fireWeapon = () => {
    const g = gameRef.current;
    const p = g.player;
    if (g.phase !== 'PLAYING' || p.reloading || p.clip <= 0) {
      if (p.clip <= 0) reloadWeapon();
      return;
    }

    const now = g.elapsedTime;
    if (now - p.lastShotTime < p.currentWeapon.fireRate) return;
    p.lastShotTime = now;

    p.clip -= 1;
    setAmmoClip(p.clip);
    brAudio.playGunshot(p.currentWeapon.id);

    if (!g.camera || !g.scene) return;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), g.camera);

    const hits = raycaster.intersectObjects(g.scene.children, true);
    let hitPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(p.currentWeapon.range));

    if (hits.length > 0) {
      for (let hit of hits) {
        if (hit.object !== p.mesh && !isChildOfObject(hit.object, p.mesh)) {
          hitPoint = hit.point;
          const struckBot = findBotFromMesh(hit.object, g.bots);
          if (struckBot && !struckBot.isDead) {
            damageBot(struckBot, p.currentWeapon.damage, g);
            setHitMarker(true);
            setTimeout(() => setHitMarker(false), 90);
          }
          break;
        }
      }
    }

    createTracer(p.position.clone().add(new THREE.Vector3(0, 1.3, 0)), hitPoint, g);
  };

  const isChildOfObject = (child: THREE.Object3D, parent: THREE.Object3D | null): boolean => {
    let curr: any = child;
    while (curr) {
      if (curr === parent) return true;
      curr = curr.parent;
    }
    return false;
  };

  const findBotFromMesh = (obj: THREE.Object3D, bots: EnemyBot[]): EnemyBot | null => {
    for (let b of bots) {
      if (isChildOfObject(obj, b.mesh)) return b;
    }
    return null;
  };

  // MANDATORY ENEMY ELIMINATION HUD TRIGGER (PHASE 10)
  const damageBot = (bot: EnemyBot, dmg: number, g: any) => {
    bot.hp = Math.max(0, bot.hp - dmg);
    g.damageDealt += dmg;
    bot.hpBarMesh.scale.x = Math.max(0.01, bot.hp / bot.maxHp);

    if (bot.hp <= 0 && !bot.isDead) {
      bot.isDead = true;
      bot.state = 'DEAD';
      bot.mesh.rotation.x = Math.PI / 2;
      bot.mesh.position.y = 0.2;

      g.eliminationCount += 1;
      const newKills = g.eliminationCount;
      setKillsCount(newKills);

      const remaining = g.bots.filter((b: any) => !b.isDead).length + 1;
      setAliveCount(remaining);

      // Play mandatory elimination chime
      brAudio.playEliminationBannerChime();

      // Show Mandatory Elimination HUD Banner (Phase 10)
      setEliminationBanner({
        visible: true,
        victimName: bot.name,
        kills: newKills,
        remaining,
      });

      setTimeout(() => {
        setEliminationBanner((prev) => ({ ...prev, visible: false }));
      }, 2800);

      pushKillFeed(`OPERATOR eliminated ${bot.name} [${g.player.currentWeapon.name}]`);

      // Victory Condition
      if (remaining === 1 && g.player.hp > 0) {
        triggerVictory(g);
      }
    }
  };

  const createTracer = (start: THREE.Vector3, end: THREE.Vector3, g: any) => {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: '#ffea00', linewidth: 2 });
    const line = new THREE.Line(geo, mat);
    g.scene.add(line);
    g.bulletTracers.push({ line, life: 3 });
  };

  const reloadWeapon = () => {
    const g = gameRef.current;
    const p = g.player;
    if (p.reloading || p.clip >= p.currentWeapon.clipSize || p.reserve <= 0) return;

    p.reloading = true;
    setIsReloading(true);

    setTimeout(() => {
      const needed = p.currentWeapon.clipSize - p.clip;
      const take = Math.min(needed, p.reserve);
      p.clip += take;
      p.reserve -= take;
      p.reloading = false;
      setAmmoClip(p.clip);
      setAmmoReserve(p.reserve);
      setIsReloading(false);
    }, 1600);
  };

  // ============================================================================
  // VEHICLE DRIVING
  // ============================================================================
  const enterVehicle = (g: any) => {
    g.player.inVehicle = true;
    g.vehicle.occupied = true;
    setIsDriving(true);
    brAudio.setVehicleEngine(true, 0);
    pushKillFeed(`ENTERED: ${FOUR_MAPS[g.mapId as MapId].vehicleName}`);
  };

  const exitVehicle = () => {
    const g = gameRef.current;
    if (!g.player.inVehicle) return;
    g.player.inVehicle = false;
    g.vehicle.occupied = false;
    g.player.position.set(
      g.vehicle.position.x + 2.5,
      getTerrainHeight(g.vehicle.position.x + 2.5, g.vehicle.position.z, g.mapId),
      g.vehicle.position.z
    );
    setIsDriving(false);
    setVehicleSpeedKmh(0);
    brAudio.setVehicleEngine(false);
  };

  const updateVehiclePhysics = (dt: number, g: any) => {
    const v = g.vehicle;
    if (!v.mesh || !v.occupied) return;

    let throttle = 0;
    if (g.keys.w) throttle = 1;
    if (g.keys.s) throttle = -0.5;

    let steer = 0;
    if (g.keys.a) steer = 1;
    if (g.keys.d) steer = -1;

    v.speed += throttle * 28 * dt;
    v.speed *= 0.94;
    v.yaw += steer * (v.speed * 0.08) * dt;

    const fwd = new THREE.Vector3(-Math.sin(v.yaw), 0, -Math.cos(v.yaw));
    v.position.add(fwd.multiplyScalar(v.speed * dt));

    const groundY = getTerrainHeight(v.position.x, v.position.z, g.mapId);
    v.position.y = groundY + 0.4;
    v.mesh.position.copy(v.position);
    v.mesh.rotation.y = v.yaw;

    g.player.position.copy(v.position);

    const speedKmh = Math.round(Math.abs(v.speed) * 3.6);
    setVehicleSpeedKmh(speedKmh);
    brAudio.setVehicleEngine(true, Math.min(1.0, speedKmh / 75));

    if (g.camera) {
      g.camera.position.set(v.position.x + Math.sin(v.yaw) * 8.5, v.position.y + 4.2, v.position.z + Math.cos(v.yaw) * 8.5);
      g.camera.lookAt(v.position);
    }

    // Roadkill bot impacts
    if (Math.abs(v.speed) > 5) {
      for (let b of g.bots) {
        if (!b.isDead && b.position.distanceTo(v.position) < 3.2) {
          damageBot(b, 100, g);
        }
      }
    }
  };

  // Safe Zone
  const updateSafeZoneStorm = (dt: number, g: any) => {
    const sz = g.safeZone;
    sz.shrinkTimer -= dt;
    setSafeZoneTime(Math.max(0, Math.round(sz.shrinkTimer)));

    if (sz.radius > sz.targetRadius) {
      sz.radius -= dt * 2.2;
      sz.center.lerp(sz.targetCenter, 0.005);
    }

    if (sz.shrinkTimer <= 0) {
      sz.currentStage += 1;
      setSafeZonePhase(sz.currentStage);
      sz.shrinkTimer = 60;
      sz.targetRadius = Math.max(20, sz.targetRadius * 0.55);
      sz.targetCenter.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60);
      brAudio.playStormWarning();
      pushKillFeed(`WARNING: Safe Zone contracting to Phase ${sz.currentStage}!`);
    }

    if (sz.stormRingMesh) {
      sz.stormRingMesh.position.set(sz.center.x, 45, sz.center.y);
      sz.stormRingMesh.scale.set(sz.radius / 220, 1, sz.radius / 220);
    }

    const distToCenter = new THREE.Vector2(g.player.position.x, g.player.position.z).distanceTo(sz.center);
    const outside = distToCenter > sz.radius;
    setIsOutsideSafeZone(outside);

    if (outside) {
      g.player.hp -= 4.5 * dt;
      setPlayerHp(Math.max(0, Math.round(g.player.hp)));
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 80);

      if (g.player.hp <= 0) {
        triggerDefeat(g, 'Fell to the Storm Barrier');
      }
    }
  };

  // Bot AI
  const updateHostileBotAI = (dt: number, g: any) => {
    const p = g.player;
    g.bots.forEach((b: EnemyBot) => {
      if (b.isDead) return;
      const distToPlayer = b.position.distanceTo(p.position);

      if (distToPlayer < 45 && !p.inVehicle) {
        b.state = 'ATTACK';
        b.mesh.lookAt(p.position.x, b.position.y, p.position.z);
        b.shootCooldown -= dt;
        if (b.shootCooldown <= 0) {
          b.shootCooldown = 1.2 + Math.random() * 0.8;
          brAudio.playEnemyGunshot();

          b.muzzleLight.intensity = 4.0;
          setTimeout(() => (b.muzzleLight.intensity = 0), 45);

          if (distToPlayer < 35 && Math.random() < 0.6) {
            const dmg = 12 + Math.round(Math.random() * 8);
            if (p.armor > 0) {
              p.armor = Math.max(0, p.armor - dmg);
              setPlayerArmor(p.armor);
            } else {
              p.hp = Math.max(0, p.hp - dmg);
              setPlayerHp(p.hp);
            }
            setDamageFlash(true);
            setTimeout(() => setDamageFlash(false), 90);

            if (p.hp <= 0) {
              triggerDefeat(g, `Eliminated by ${b.name}`);
            }
          }
        }
      } else {
        b.state = 'PATROL';
        const toTarget = b.patrolTarget.clone().sub(b.position);
        if (toTarget.length() < 2.0) {
          b.patrolTarget.set(b.position.x + (Math.random() - 0.5) * 50, 0, b.position.z + (Math.random() - 0.5) * 50);
        } else {
          toTarget.normalize();
          b.position.add(toTarget.multiplyScalar(3.2 * dt));
          b.position.y = getTerrainHeight(b.position.x, b.position.z, g.mapId);
          b.mesh.position.copy(b.position);
          b.mesh.rotation.y = Math.atan2(-toTarget.x, -toTarget.z);
        }
      }
    });
  };

  const updateBulletTracers = (g: any) => {
    for (let i = g.bulletTracers.length - 1; i >= 0; i--) {
      const tr = g.bulletTracers[i];
      tr.life -= 1;
      if (tr.life <= 0) {
        g.scene.remove(tr.line);
        g.bulletTracers.splice(i, 1);
      }
    }
  };

  const renderMinimap = (g: any) => {
    if (!minimapCanvasRef.current) return;
    const cvs = minimapCanvasRef.current;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 140, 140);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 140, 140);

    const mapScale = 140 / 500;
    const cx = 70;
    const cy = 70;

    // Safe Zone
    const sx = cx + g.safeZone.center.x * mapScale;
    const sy = cy + g.safeZone.center.y * mapScale;
    const sr = g.safeZone.radius * mapScale;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.stroke();

    // Bots
    ctx.fillStyle = '#ef4444';
    g.bots.forEach((b: EnemyBot) => {
      if (!b.isDead) {
        ctx.fillRect(cx + b.position.x * mapScale - 2, cy + b.position.z * mapScale - 2, 4, 4);
      }
    });

    // Player
    ctx.save();
    ctx.translate(cx + g.player.position.x * mapScale, cy + g.player.position.z * mapScale);
    ctx.rotate(g.mouseLook.yaw);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(3, 4);
    ctx.lineTo(-3, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Match End Handlers
  const triggerVictory = (g: any) => {
    g.phase = 'VICTORY';
    setPhase('VICTORY');
    brAudio.playVictoryFanfare();

    const xpEarned = 750 + g.eliminationCount * 100;
    const stats: MatchHistoryEntry = {
      id: Date.now().toString(),
      mapName: FOUR_MAPS[g.mapId as MapId].name,
      placement: 1,
      kills: g.eliminationCount,
      survivalTimeSec: Math.round(g.elapsedTime),
      damage: g.damageDealt,
      xpEarned,
      won: true,
      date: new Date().toLocaleDateString(),
    };

    setEndMatchStats({
      ...stats,
      timeSec: stats.survivalTimeSec,
    });
    saveDashboardStats(stats);
  };

  const triggerDefeat = (g: any, reason: string) => {
    g.phase = 'GAMEOVER';
    setPhase('GAMEOVER');
    brAudio.playDefeatChord();

    const remaining = g.bots.filter((b: any) => !b.isDead).length + 1;
    const xpEarned = 150 + g.eliminationCount * 50;

    const stats: MatchHistoryEntry = {
      id: Date.now().toString(),
      mapName: FOUR_MAPS[g.mapId as MapId].name,
      placement: remaining,
      kills: g.eliminationCount,
      survivalTimeSec: Math.round(g.elapsedTime),
      damage: g.damageDealt,
      xpEarned,
      won: false,
      date: new Date().toLocaleDateString(),
    };

    setEndMatchStats({
      ...stats,
      timeSec: stats.survivalTimeSec,
    });
    saveDashboardStats(stats);
    pushKillFeed(`ELIMINATED: ${reason}`);
  };

  const pushKillFeed = (msg: string) => {
    setKillFeed((prev) => [msg, ...prev.slice(0, 4)]);
  };

  const setupInputEvents = (canvas: HTMLCanvasElement, g: any) => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') g.keys.w = true;
      if (k === 'a' || e.key === 'ArrowLeft') g.keys.a = true;
      if (k === 's' || e.key === 'ArrowDown') g.keys.s = true;
      if (k === 'd' || e.key === 'ArrowRight') g.keys.d = true;
      if (e.key === 'Shift') g.keys.shift = true;
      if (e.key === ' ') {
        e.preventDefault();
        g.keys.space = true;
        if (g.phase === 'AIRPLANE') jumpFromAircraft();
      }
      if (k === 'e') g.keys.e = true;
      if (k === 'r') reloadWeapon();
      if (k === 'm') setShowFullMap((m) => !m);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') g.keys.w = false;
      if (k === 'a' || e.key === 'ArrowLeft') g.keys.a = false;
      if (k === 's' || e.key === 'ArrowDown') g.keys.s = false;
      if (k === 'd' || e.key === 'ArrowRight') g.keys.d = false;
      if (e.key === 'Shift') g.keys.shift = false;
      if (e.key === ' ') g.keys.space = false;
      if (k === 'e') g.keys.e = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (g.phase === 'PLAYING') {
        if (!document.pointerLockElement) canvas.requestPointerLock?.();
        if (e.button === 0) fireWeapon();
        else if (e.button === 2) {
          g.mouseLook.isAiming = !g.mouseLook.isAiming;
          setIsAiming(g.mouseLook.isAiming);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        g.mouseLook.yaw -= e.movementX * 0.0022;
        g.mouseLook.pitch -= e.movementY * 0.0022;
        g.mouseLook.pitch = Math.max(-0.6, Math.min(0.85, g.mouseLook.pitch));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
  };

  const startMatchDeployment = () => {
    const g = gameRef.current;
    g.phase = 'AIRPLANE';
    setPhase('AIRPLANE');
    g.airplane.position.set(0, 120, -250);
    g.airplane.hasJumped = false;
    g.eliminationCount = 0;
    g.damageDealt = 0;
    g.player.hp = 100;
    g.player.armor = 100;
    setPlayerHp(100);
    setPlayerArmor(100);
    setKillsCount(0);
    brAudio.startAirplaneDrone();
  };

  // ============================================================================
  // RENDER INTERFACE
  // ============================================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 3D WebGL Canvas */}
      <View style={styles.canvasContainer}>
        <div
          ref={mountRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'hidden',
            cursor: phase === 'PLAYING' ? 'crosshair' : 'default',
          }}
        />

        {damageFlash && <View style={styles.damageFlash} pointerEvents="none" />}
        {isOutsideSafeZone && <View style={styles.stormVignette} pointerEvents="none" />}

        {/* ==================================================================== */}
        {/* PHASE 10 MANDATORY: ENEMY ELIMINATION HUD BANNER */}
        {/* ==================================================================== */}
        {eliminationBanner.visible && (
          <View style={styles.eliminationBannerContainer} pointerEvents="none">
            <View style={styles.eliminationBannerGlow}>
              <Text style={styles.eliminationTitle}>🔥 ENEMY ELIMINATED 🔥</Text>
              <Text style={styles.eliminationVictim}>{eliminationBanner.victimName}</Text>
              <View style={styles.eliminationTelemetryRow}>
                <Text style={styles.eliminationKillsText}>ELIMINATIONS: {eliminationBanner.kills}</Text>
                <Text style={styles.eliminationDivider}>|</Text>
                <Text style={styles.eliminationRemainingText}>REMAINING: {eliminationBanner.remaining}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* SCREEN 1: AAA MAIN MENU */}
        {/* ==================================================================== */}
        {phase === 'MENU' && (
          <View style={styles.menuContainer}>
            <View style={styles.menuCard}>
              <View style={styles.menuBadge}>
                <Text style={styles.menuBadgeText}>★ AAA BATTLE ROYALE ★</Text>
              </View>
              <Text style={styles.menuTitle}>SHADOW STRIKE</Text>
              <Text style={styles.menuSubTitle}>PUBG & FREE FIRE INSPIRED 3D SURVIVAL</Text>

              <View style={styles.menuStatsRow}>
                <Text style={styles.menuStatLabel}>
                  CALLSIGN: <Text style={{ color: '#00f0ff', fontWeight: '900' }}>{dashboard.callsign}</Text>
                </Text>
                <Text style={styles.menuStatLabel}>
                  RANK: <Text style={{ color: '#ffd700', fontWeight: '900' }}>{dashboard.rankTitle}</Text>
                </Text>
                <Text style={styles.menuStatLabel}>
                  LEVEL: <Text style={{ color: '#00ff66', fontWeight: '900' }}>LVL {dashboard.level}</Text>
                </Text>
              </View>

              <View style={styles.menuActions}>
                <TouchableOpacity style={styles.primaryBtn} onPress={startMatchDeployment} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>▶ DEPLOY QUICK MATCH (AIRPLANE DROP)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('MAP_SELECT')}>
                  <Text style={styles.secondaryBtnText}>🗺 SELECT MAP ({FOUR_MAPS[selectedMapId].name})</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('DASHBOARD')}>
                  <Text style={styles.secondaryBtnText}>📊 PERSONAL PLAYER DASHBOARD</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    const next = graphicsPreset === 'HIGH' ? 'MED' : graphicsPreset === 'MED' ? 'LOW' : 'HIGH';
                    setGraphicsPreset(next);
                  }}
                >
                  <Text style={styles.secondaryBtnText}>GRAPHICS PRESET: {graphicsPreset} (PRO MAX)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation?.navigate?.('Home')}>
                  <Text style={styles.secondaryBtnText}>‹ RETURN TO ARCADE HUB</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* SCREEN 2: FOUR LARGE, DISTINCT MAPS SELECTOR (PHASE 3 & 12) */}
        {/* ==================================================================== */}
        {phase === 'MAP_SELECT' && (
          <View style={styles.menuContainer}>
            <View style={[styles.menuCard, { maxWidth: 680 }]}>
              <Text style={styles.menuBadgeText}>OPERATIONAL THEATRES</Text>
              <Text style={styles.menuTitle}>SELECT BATTLEGROUND MAP</Text>
              <Text style={styles.menuSubTitle}>4 DISTINCT LARGE-SCALE 3D ENVIRONMENTS</Text>

              <ScrollView style={{ maxHeight: 380, width: '100%' }} showsVerticalScrollIndicator={false}>
                {Object.values(FOUR_MAPS).map((m) => {
                  const isSelected = m.id === selectedMapId;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.mapOptionCard,
                        isSelected && { borderColor: m.accentColor, backgroundColor: 'rgba(255,255,255,0.08)' },
                      ]}
                      onPress={() => setSelectedMapId(m.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.mapCardHeader}>
                        <View style={[styles.mapBadgePill, { backgroundColor: m.accentColor }]}>
                          <Text style={styles.mapBadgeText}>{m.badge}</Text>
                        </View>
                        <Text style={styles.mapDurationText}>⏱ {m.duration}</Text>
                      </View>
                      <Text style={[styles.mapCardTitle, { color: isSelected ? m.accentColor : '#fff' }]}>
                        {m.name}
                      </Text>
                      <Text style={styles.mapCardTagline}>{m.tagline}</Text>
                      <Text style={styles.mapCardDesc}>{m.desc}</Text>
                      <Text style={[styles.mapCardVehicle, { color: m.accentColor }]}>
                        🚗 Vehicle: {m.vehicleName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={styles.primaryBtn} onPress={startMatchDeployment}>
                <Text style={styles.primaryBtnText}>▶ DEPLOY TO {FOUR_MAPS[selectedMapId].name}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('MENU')}>
                <Text style={styles.secondaryBtnText}>‹ BACK TO MAIN MENU</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* SCREEN 3: PERSONAL PLAYER DASHBOARD (PHASE 14) */}
        {/* ==================================================================== */}
        {phase === 'DASHBOARD' && (
          <View style={styles.menuContainer}>
            <View style={[styles.menuCard, { maxWidth: 700 }]}>
              <Text style={styles.menuBadgeText}>OPERATOR PROFILE & CAREER</Text>
              <Text style={styles.menuTitle}>PERSONAL DASHBOARD</Text>
              <Text style={styles.menuSubTitle}>LIFETIME COMBAT TELEMETRY & STATS</Text>

              {/* Profile Card */}
              <View style={styles.dashHeaderRow}>
                <View>
                  <Text style={styles.dashCallsign}>{dashboard.callsign}</Text>
                  <Text style={styles.dashRank}>{dashboard.rankTitle} • LEVEL {dashboard.level}</Text>
                </View>
                <View style={styles.dashXpBox}>
                  <Text style={styles.dashXpLabel}>TOTAL XP</Text>
                  <Text style={styles.dashXpVal}>{dashboard.xp} PTS</Text>
                </View>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statGridItem}>
                  <Text style={styles.statGridLabel}>MATCHES</Text>
                  <Text style={styles.statGridVal}>{dashboard.totalMatches}</Text>
                </View>
                <View style={styles.statGridItem}>
                  <Text style={styles.statGridLabel}>WINS</Text>
                  <Text style={[styles.statGridVal, { color: '#ffd700' }]}>{dashboard.totalWins}</Text>
                </View>
                <View style={styles.statGridItem}>
                  <Text style={styles.statGridLabel}>WIN RATE</Text>
                  <Text style={[styles.statGridVal, { color: '#00ff66' }]}>
                    {dashboard.totalMatches > 0
                      ? `${Math.round((dashboard.totalWins / dashboard.totalMatches) * 100)}%`
                      : '0%'}
                  </Text>
                </View>
                <View style={styles.statGridItem}>
                  <Text style={styles.statGridLabel}>KILLS</Text>
                  <Text style={[styles.statGridVal, { color: '#ef4444' }]}>{dashboard.totalKills}</Text>
                </View>
                <View style={styles.statGridItem}>
                  <Text style={styles.statGridLabel}>K/D RATIO</Text>
                  <Text style={[styles.statGridVal, { color: '#00f0ff' }]}>
                    {dashboard.totalDeaths > 0
                      ? (dashboard.totalKills / dashboard.totalDeaths).toFixed(2)
                      : dashboard.totalKills.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.statGridItem}>
                  <Text style={styles.statGridLabel}>BEST TIME</Text>
                  <Text style={styles.statGridVal}>{dashboard.bestSurvivalSec}s</Text>
                </View>
              </View>

              {/* Recent Match History */}
              <Text style={styles.historySectionTitle}>RECENT MATCH HISTORY</Text>
              <ScrollView style={{ maxHeight: 160, width: '100%', marginBottom: 12 }}>
                {dashboard.recentMatches.length === 0 ? (
                  <Text style={styles.emptyHistoryText}>No matches recorded yet. Deploy to start logging stats!</Text>
                ) : (
                  dashboard.recentMatches.map((m, idx) => (
                    <View key={idx} style={styles.historyRow}>
                      <Text style={[styles.historyBadge, { color: m.won ? '#ffd700' : '#cbd5e1' }]}>
                        {m.won ? '🏆 WINNER' : `#${m.placement}`}
                      </Text>
                      <Text style={styles.historyMap}>{m.mapName}</Text>
                      <Text style={styles.historyKills}>⚔ {m.kills} Kills</Text>
                      <Text style={styles.historyTime}>⏱ {m.survivalTimeSec}s</Text>
                      <Text style={styles.historyXp}>+{m.xpEarned} XP</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              <TouchableOpacity style={styles.primaryBtn} onPress={startMatchDeployment}>
                <Text style={styles.primaryBtnText}>▶ DEPLOY NEW MATCH</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('MENU')}>
                <Text style={styles.secondaryBtnText}>‹ RETURN TO MAIN MENU</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* AIRPLANE & FREEFALL INSERTION (PHASE 4) */}
        {/* ==================================================================== */}
        {(phase === 'AIRPLANE' || phase === 'FREEFALL' || phase === 'PARACHUTE') && (
          <View style={styles.airborneOverlay} pointerEvents="box-none">
            <View style={styles.airborneTelemetry}>
              <Text style={styles.telemetryTag}>AIRBORNE INSERTION • {FOUR_MAPS[selectedMapId].name}</Text>
              <Text style={styles.telemetryMain}>ALTITUDE: {altitudeMeters}m</Text>
              <Text style={styles.telemetrySub}>AIRSPEED: {descentSpeedKmh} KM/H</Text>
            </View>

            {phase === 'AIRPLANE' && (
              <TouchableOpacity style={styles.jumpBtn} onPress={jumpFromAircraft} activeOpacity={0.85}>
                <Text style={styles.jumpBtnText}>🪂 JUMP FROM AIRCRAFT [SPACE]</Text>
              </TouchableOpacity>
            )}

            {phase === 'FREEFALL' && (
              <TouchableOpacity style={styles.chuteBtn} onPress={deployParachute} activeOpacity={0.85}>
                <Text style={styles.chuteBtnText}>DEPLOY PARACHUTE [TAP]</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ==================================================================== */}
        {/* IN-GAME HUD (PHASE 15) */}
        {/* ==================================================================== */}
        {phase === 'PLAYING' && (
          <View style={styles.hudContainer} pointerEvents="box-none">
            {/* Top Bar */}
            <View style={styles.hudTopRow} pointerEvents="box-none">
              <View style={styles.gaugesContainer}>
                <View style={styles.gaugeLine}>
                  <Text style={styles.hpLabel}>HP</Text>
                  <View style={styles.gaugeTrack}>
                    <View
                      style={[
                        styles.gaugeBar,
                        { width: `${playerHp}%`, backgroundColor: playerHp > 40 ? '#00ff66' : '#ef4444' },
                      ]}
                    />
                  </View>
                  <Text style={styles.gaugeVal}>{playerHp}</Text>
                </View>

                <View style={styles.gaugeLine}>
                  <Text style={[styles.hpLabel, { color: '#00f0ff' }]}>AP</Text>
                  <View style={styles.gaugeTrack}>
                    <View style={[styles.gaugeBar, { width: `${playerArmor}%`, backgroundColor: '#00f0ff' }]} />
                  </View>
                  <Text style={[styles.gaugeVal, { color: '#00f0ff' }]}>{playerArmor}</Text>
                </View>
              </View>

              <View style={styles.safeZoneBanner}>
                <View style={styles.alivePill}>
                  <Text style={styles.aliveLabel}>ALIVE: {aliveCount}/20</Text>
                  <Text style={styles.killsLabel}>KILLS: {killsCount}</Text>
                </View>
                <Text style={styles.zoneClock}>
                  STORM: {Math.floor(safeZoneTime / 60)}:{String(safeZoneTime % 60).padStart(2, '0')} (PHASE {safeZonePhase})
                </Text>
              </View>

              <View style={styles.minimapWrapper}>
                <canvas ref={minimapCanvasRef} width={140} height={140} style={{ borderRadius: 10 }} />
                <TouchableOpacity style={styles.mapToggleBtn} onPress={() => setShowFullMap(true)}>
                  <Text style={styles.mapToggleText}>🗺 MAP [M]</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Crosshair */}
            <View style={styles.crosshair} pointerEvents="none">
              <View style={styles.crosshairCenter} />
              <View style={[styles.crosshairArm, { top: -10, left: -1, width: 2, height: 8 }]} />
              <View style={[styles.crosshairArm, { bottom: -10, left: -1, width: 2, height: 8 }]} />
              <View style={[styles.crosshairArm, { left: -10, top: -1, width: 8, height: 2 }]} />
              <View style={[styles.crosshairArm, { right: -10, top: -1, width: 8, height: 2 }]} />
              {hitMarker && <Text style={styles.hitMarkerSymbol}>✕</Text>}
            </View>

            {interactPrompt && (
              <View style={styles.promptBox} pointerEvents="none">
                <Text style={styles.promptText}>{interactPrompt}</Text>
              </View>
            )}

            <View style={styles.killFeedContainer} pointerEvents="none">
              {killFeed.map((kf, i) => (
                <Text key={i} style={styles.killFeedText}>
                  {kf}
                </Text>
              ))}
            </View>

            {isDriving && (
              <View style={styles.speedometerContainer}>
                <Text style={styles.speedText}>{vehicleSpeedKmh} KM/H</Text>
                <TouchableOpacity style={styles.exitVehBtn} onPress={exitVehicle}>
                  <Text style={styles.exitVehText}>EXIT VEHICLE [E]</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom Controls */}
            <View style={styles.hudBottomRow} pointerEvents="box-none">
              <View style={styles.dpad} pointerEvents="auto">
                <TouchableOpacity
                  style={styles.dpadBtn}
                  onPressIn={() => (gameRef.current.keys.w = true)}
                  onPressOut={() => (gameRef.current.keys.w = false)}
                >
                  <Text style={styles.dpadArrow}>▲</Text>
                </TouchableOpacity>
                <View style={styles.dpadMid}>
                  <TouchableOpacity
                    style={styles.dpadBtn}
                    onPressIn={() => (gameRef.current.keys.a = true)}
                    onPressOut={() => (gameRef.current.keys.a = false)}
                  >
                    <Text style={styles.dpadArrow}>◀</Text>
                  </TouchableOpacity>
                  <View style={styles.dpadCenter} />
                  <TouchableOpacity
                    style={styles.dpadBtn}
                    onPressIn={() => (gameRef.current.keys.d = true)}
                    onPressOut={() => (gameRef.current.keys.d = false)}
                  >
                    <Text style={styles.dpadArrow}>▶</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.dpadBtn}
                  onPressIn={() => (gameRef.current.keys.s = true)}
                  onPressOut={() => (gameRef.current.keys.s = false)}
                >
                  <Text style={styles.dpadArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.combatCluster} pointerEvents="auto">
                <View style={styles.tacticalRow}>
                  <TouchableOpacity
                    style={[styles.smallActionBtn, isAiming && styles.btnActive]}
                    onPress={() => {
                      const next = !gameRef.current.mouseLook.isAiming;
                      gameRef.current.mouseLook.isAiming = next;
                      setIsAiming(next);
                    }}
                  >
                    <Text style={styles.actionIcon}>🎯</Text>
                    <Text style={styles.actionLabel}>AIM</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.smallActionBtn} onPress={reloadWeapon}>
                    <Text style={styles.actionIcon}>🔄</Text>
                    <Text style={styles.actionLabel}>RELOAD</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.smallActionBtn}
                    onPress={() => {
                      if (gameRef.current.player.onGround) {
                        gameRef.current.player.velocity.y = 9.8;
                        gameRef.current.player.onGround = false;
                        brAudio.playFootstep();
                      }
                    }}
                  >
                    <Text style={styles.actionIcon}>🦘</Text>
                    <Text style={styles.actionLabel}>JUMP</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallActionBtn, { borderColor: '#ffd700' }]}
                    onPress={() => {
                      gameRef.current.keys.e = true;
                      setTimeout(() => (gameRef.current.keys.e = false), 200);
                    }}
                  >
                    <Text style={styles.actionIcon}>✋</Text>
                    <Text style={[styles.actionLabel, { color: '#ffd700' }]}>ACTION</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.fireRow}>
                  <View style={styles.weaponInfo}>
                    <Text style={styles.weaponName}>{currentWeapon.name}</Text>
                    <Text style={styles.ammoText}>
                      {isReloading ? 'RELOAD...' : `${ammoClip} / ${ammoReserve}`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.bigFireBtn}
                    onPress={fireWeapon}
                    onPressIn={fireWeapon}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.fireEmoji}>🔥</Text>
                    <Text style={styles.fireLabel}>FIRE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* FULL MAP MODAL */}
        <Modal visible={showFullMap} transparent animationType="fade">
          <View style={styles.mapModalBackdrop}>
            <View style={styles.mapModalCard}>
              <View style={styles.mapHeader}>
                <Text style={styles.mapTitle}>{FOUR_MAPS[selectedMapId].name} — FULL TACTICAL MAP</Text>
                <TouchableOpacity style={styles.closeMapBtn} onPress={() => setShowFullMap(false)}>
                  <Text style={styles.closeMapText}>✕ CLOSE</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.mapDescText}>{FOUR_MAPS[selectedMapId].desc}</Text>
              <Text style={styles.mapCoordHint}>
                Safe Zone Center: X: {Math.round(gameRef.current.safeZone.center.x)}, Z:{' '}
                {Math.round(gameRef.current.safeZone.center.y)} | Radius: {Math.round(gameRef.current.safeZone.radius)}m
              </Text>
            </View>
          </View>
        </Modal>

        {/* VICTORY MODAL */}
        <Modal visible={phase === 'VICTORY'} transparent animationType="slide">
          <View style={styles.endModalBackdrop}>
            <View style={[styles.endModalCard, { borderColor: '#ffd700' }]}>
              <Text style={{ fontSize: 52, textAlign: 'center' }}>🍗</Text>
              <Text style={styles.victoryTitle}>WINNER WINNER CHICKEN DINNER!</Text>
              <Text style={styles.victorySubtitle}>#1 / 20 • CHAMPION OF {endMatchStats.mapName}</Text>

              <View style={styles.endStatsTable}>
                <Text style={styles.endStatLine}>Eliminations: {endMatchStats.kills} OPPONENTS</Text>
                <Text style={styles.endStatLine}>Damage Dealt: {endMatchStats.damage} HP</Text>
                <Text style={styles.endStatLine}>Survival Time: {endMatchStats.timeSec} SECONDS</Text>
                <Text style={[styles.endStatLine, { color: '#ffd700' }]}>XP Earned: +{endMatchStats.xpEarned} PTS</Text>
              </View>

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#ffd700' }]} onPress={startMatchDeployment}>
                <Text style={[styles.primaryBtnText, { color: '#000' }]}>PLAY AGAIN ▶</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('DASHBOARD')}>
                <Text style={styles.secondaryBtnText}>📊 VIEW PERSONAL DASHBOARD</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('MAP_SELECT')}>
                <Text style={styles.secondaryBtnText}>🗺 SELECT ANOTHER MAP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* DEFEAT MODAL */}
        <Modal visible={phase === 'GAMEOVER'} transparent animationType="fade">
          <View style={styles.endModalBackdrop}>
            <View style={[styles.endModalCard, { borderColor: '#ef4444' }]}>
              <Text style={{ fontSize: 52, textAlign: 'center' }}>💀</Text>
              <Text style={[styles.victoryTitle, { color: '#ef4444' }]}>BETTER LUCK NEXT TIME</Text>
              <Text style={styles.victorySubtitle}>PLACED #{endMatchStats.placement} OF 20 ON {endMatchStats.mapName}</Text>

              <View style={styles.endStatsTable}>
                <Text style={styles.endStatLine}>Eliminations: {endMatchStats.kills}</Text>
                <Text style={styles.endStatLine}>Damage Dealt: {endMatchStats.damage}</Text>
                <Text style={styles.endStatLine}>Survival Time: {endMatchStats.timeSec}s</Text>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={startMatchDeployment}>
                <Text style={styles.primaryBtnText}>RETRY MATCH ▶</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('DASHBOARD')}>
                <Text style={styles.secondaryBtnText}>📊 VIEW PERSONAL DASHBOARD</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('MENU')}>
                <Text style={styles.secondaryBtnText}>RETURN TO MAIN MENU</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050711' },
  canvasContainer: { flex: 1, position: 'relative', overflow: 'hidden' },
  damageFlash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(239, 68, 68, 0.45)', zIndex: 10 },
  stormVignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 20,
    borderColor: 'rgba(0, 102, 255, 0.75)',
    backgroundColor: 'rgba(0, 102, 255, 0.25)',
    zIndex: 11,
  },

  // ELIMINATION BANNER (PHASE 10 MANDATORY)
  eliminationBannerContainer: {
    position: 'absolute',
    top: 75,
    left: '50%',
    transform: [{ translateX: -180 }],
    width: 360,
    alignItems: 'center',
    zIndex: 35,
  },
  eliminationBannerGlow: {
    backgroundColor: 'rgba(10, 18, 32, 0.95)',
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    boxShadow: '0 0 28px rgba(239, 68, 68, 0.85)',
    width: '100%',
  },
  eliminationTitle: { color: '#ef4444', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  eliminationVictim: { color: '#ffffff', fontSize: 18, fontWeight: '900', marginTop: 2 },
  eliminationTelemetryRow: { flexDirection: 'row', gap: 10, marginTop: 4, alignItems: 'center' },
  eliminationKillsText: { color: '#ffd700', fontSize: 12, fontWeight: '800' },
  eliminationDivider: { color: '#64748b', fontSize: 12 },
  eliminationRemainingText: { color: '#00f0ff', fontSize: 12, fontWeight: '800' },

  // MENU OVERLAYS
  menuContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 10, 20, 0.82)',
    zIndex: 20,
    padding: 16,
  },
  menuCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: 'rgba(10, 18, 32, 0.96)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    boxShadow: '0 0 24px rgba(0, 240, 255, 0.35)',
  },
  menuBadge: { backgroundColor: '#00f0ff', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8 },
  menuBadgeText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  menuTitle: { color: '#ffffff', fontSize: 30, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  menuSubTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  menuStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  menuStatLabel: { color: '#cbd5e1', fontSize: 11, fontWeight: '700' },
  menuActions: { width: '100%' },
  primaryBtn: {
    backgroundColor: '#00f0ff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 5,
    boxShadow: '0 0 16px rgba(0, 240, 255, 0.5)',
  },
  primaryBtnText: { color: '#000', fontSize: 14, fontWeight: '900' },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 4,
  },
  secondaryBtnText: { color: '#e2e8f0', fontSize: 12, fontWeight: '700' },

  // MAP SELECTION CARDS (PHASE 3)
  mapOptionCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
  },
  mapCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  mapBadgePill: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  mapBadgeText: { color: '#000', fontSize: 9, fontWeight: '900' },
  mapDurationText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },
  mapCardTitle: { fontSize: 18, fontWeight: '900' },
  mapCardTagline: { color: '#cbd5e1', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  mapCardDesc: { color: '#94a3b8', fontSize: 11, lineHeight: 16 },
  mapCardVehicle: { fontSize: 11, fontWeight: '800', marginTop: 6 },

  // DASHBOARD STYLES (PHASE 14)
  dashHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  dashCallsign: { color: '#00f0ff', fontSize: 20, fontWeight: '900' },
  dashRank: { color: '#ffd700', fontSize: 12, fontWeight: '800', marginTop: 2 },
  dashXpBox: { alignItems: 'flex-end' },
  dashXpLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold' },
  dashXpVal: { color: '#fff', fontSize: 18, fontWeight: '900' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 14,
    justifyContent: 'space-between',
  },
  statGridItem: {
    width: '31%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  statGridLabel: { color: '#94a3b8', fontSize: 9, fontWeight: 'bold' },
  statGridVal: { color: '#ffffff', fontSize: 16, fontWeight: '900', marginTop: 2 },
  historySectionTitle: { color: '#00f0ff', fontSize: 12, fontWeight: '900', letterSpacing: 1.2, alignSelf: 'flex-start', marginBottom: 6 },
  emptyHistoryText: { color: '#64748b', fontSize: 11, textAlign: 'center', padding: 12 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 8,
    borderRadius: 6,
    marginVertical: 2,
    alignItems: 'center',
  },
  historyBadge: { fontSize: 11, fontWeight: '900', width: 70 },
  historyMap: { color: '#cbd5e1', fontSize: 11, flex: 1 },
  historyKills: { color: '#ef4444', fontSize: 11, fontWeight: 'bold', width: 60 },
  historyTime: { color: '#94a3b8', fontSize: 11, width: 45 },
  historyXp: { color: '#ffd700', fontSize: 11, fontWeight: 'bold', width: 55, textAlign: 'right' },

  // AIRBORNE OVERLAY
  airborneOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 24, zIndex: 15 },
  airborneTelemetry: {
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  telemetryTag: { color: '#00f0ff', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  telemetryMain: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginTop: 4 },
  telemetrySub: { color: '#ffd700', fontSize: 14, fontWeight: '800' },
  jumpBtn: {
    alignSelf: 'center',
    backgroundColor: '#00f0ff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    boxShadow: '0 0 24px rgba(0, 240, 255, 0.7)',
  },
  jumpBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
  chuteBtn: {
    alignSelf: 'center',
    backgroundColor: '#00ff66',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    boxShadow: '0 0 24px rgba(0, 255, 102, 0.7)',
  },
  chuteBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },

  // IN-GAME HUD
  hudContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 14, zIndex: 10 },
  hudTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  gaugesContainer: {
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.45)',
    borderRadius: 10,
    padding: 10,
    minWidth: 170,
  },
  gaugeLine: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  hpLabel: { color: '#00ff66', fontSize: 11, fontWeight: '900', width: 24 },
  gaugeTrack: { flex: 1, height: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  gaugeBar: { height: '100%', borderRadius: 4 },
  gaugeVal: { color: '#ffffff', fontSize: 12, fontWeight: '800', width: 28, textAlign: 'right' },
  safeZoneBanner: { backgroundColor: 'rgba(10, 18, 32, 0.88)', borderWidth: 1.5, borderColor: '#ffd700', borderRadius: 10, padding: 10, alignItems: 'center' },
  alivePill: { flexDirection: 'row', gap: 12 },
  aliveLabel: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  killsLabel: { color: '#ffd700', fontSize: 13, fontWeight: '900' },
  zoneClock: { color: '#00f0ff', fontSize: 11, fontWeight: '800', marginTop: 4 },
  minimapWrapper: { position: 'relative', borderWidth: 1.5, borderColor: '#00f0ff', borderRadius: 12, overflow: 'hidden' },
  mapToggleBtn: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0, 0, 0, 0.8)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  mapToggleText: { color: '#00f0ff', fontSize: 10, fontWeight: 'bold' },

  crosshair: { position: 'absolute', top: '50%', left: '50%', width: 24, height: 24, marginLeft: -12, marginTop: -12, alignItems: 'center', justifyContent: 'center' },
  crosshairCenter: { width: 4, height: 4, backgroundColor: '#00f0ff', borderRadius: 2 },
  crosshairArm: { position: 'absolute', backgroundColor: '#00f0ff' },
  hitMarkerSymbol: { color: '#ef4444', fontSize: 26, fontWeight: '900' },

  promptBox: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.3)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  promptText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  killFeedContainer: { position: 'absolute', top: 90, left: 14, maxWidth: 320 },
  killFeedText: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 11, fontWeight: '700', marginVertical: 1, textShadowColor: '#000', textShadowRadius: 3 },
  speedometerContainer: {
    position: 'absolute',
    bottom: 130,
    right: 30,
    backgroundColor: 'rgba(10, 18, 32, 0.9)',
    borderWidth: 1.5,
    borderColor: '#ffd700',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  speedText: { color: '#ffd700', fontSize: 18, fontWeight: '900' },
  exitVehBtn: { marginTop: 6, backgroundColor: '#dc2626', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  exitVehText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  hudBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  dpad: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  dpadBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.6)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadArrow: { color: '#00f0ff', fontSize: 16, fontWeight: 'bold' },
  dpadMid: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  dpadCenter: { width: 44, height: 44 },

  combatCluster: { alignItems: 'flex-end' },
  tacticalRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  smallActionBtn: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.5)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: { backgroundColor: '#00f0ff', borderColor: '#00f0ff' },
  actionIcon: { fontSize: 18 },
  actionLabel: { color: '#00f0ff', fontSize: 8, fontWeight: '900', marginTop: 1 },
  fireRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weaponInfo: {
    backgroundColor: 'rgba(10, 18, 32, 0.9)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
  },
  weaponName: { color: '#00f0ff', fontSize: 12, fontWeight: '900' },
  ammoText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  bigFireBtn: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#dc2626',
    borderWidth: 3,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 24px rgba(220, 38, 38, 0.8)',
  },
  fireEmoji: { fontSize: 24 },
  fireLabel: { color: '#ffffff', fontSize: 11, fontWeight: '900' },

  // MODALS
  mapModalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  mapModalCard: { width: '100%', maxWidth: 600, backgroundColor: '#0b1528', borderWidth: 2, borderColor: '#00f0ff', borderRadius: 16, padding: 20 },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  mapTitle: { color: '#00f0ff', fontSize: 16, fontWeight: '900' },
  closeMapBtn: { backgroundColor: '#ef4444', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 6 },
  closeMapText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  mapDescText: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  mapCoordHint: { color: '#94a3b8', fontSize: 11, textAlign: 'center' },

  endModalBackdrop: { flex: 1, backgroundColor: 'rgba(5, 10, 20, 0.92)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  endModalCard: { width: '100%', maxWidth: 480, backgroundColor: '#0d182b', borderWidth: 2, borderRadius: 18, padding: 26, alignItems: 'center' },
  victoryTitle: { color: '#ffd700', fontSize: 24, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  victorySubtitle: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  endStatsTable: { width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 14, borderRadius: 12, marginBottom: 18 },
  endStatLine: { color: '#f1f5f9', fontSize: 13, fontWeight: '700', marginVertical: 4 },
});
