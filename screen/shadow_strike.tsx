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
} from 'react-native';
import * as THREE from 'three';

// ==========================================
// GAME TYPES & INTERFACES
// ==========================================
export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAMEOVER';

export interface Objective {
  id: number;
  title: string;
  description: string;
  targetPos: THREE.Vector3;
  completed: boolean;
  type: 'explore' | 'keycard' | 'enter' | 'eliminate' | 'intel' | 'extract';
}

export interface EnemyEntity {
  id: number;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  hp: number;
  maxHp: number;
  state: 'PATROL' | 'ALERT' | 'CHASE' | 'ATTACK' | 'SEARCH' | 'DEAD';
  patrolPoints: THREE.Vector3[];
  currentPatrolIdx: number;
  alertTimer: number;
  shootCooldown: number;
  lastKnownPos: THREE.Vector3;
  searchTimer: number;
  gunMesh: THREE.Mesh;
  muzzleFlashMesh: THREE.PointLight;
  isDead: boolean;
}

export interface ParticleItem {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  fade: boolean;
}

export interface ExplosiveBarrel {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  detonated: boolean;
}

// ==========================================
// SYNTHESIZED WEB AUDIO ENGINE
// ==========================================
class ShadowSoundSystem {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public volume: number = 0.85;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window !== 'undefined') {
      try {
        const AudioClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioClass) {
          this.ctx = new AudioClass();
        }
      } catch (_) {}
    }
  }

  private getContext(): AudioContext | null {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Gunshot with punchy bass transient and reverb noise
  playGunshot(isSilenced: boolean = false) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // 1. Bass punch
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(isSilenced ? 120 : 280, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
      gain.gain.setValueAtTime(0.4 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);

      // 2. White noise snap
      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.025));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1600, now);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45 * this.volume, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
    } catch (_) {}
  }

  // Explosion sound for red barrels
  playExplosion() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.4);
      gain.gain.setValueAtTime(0.55 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (_) {}
  }

  // Enemy Gunshot (distant tone)
  playEnemyGunshot() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);
      gain.gain.setValueAtTime(0.2 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (_) {}
  }

  // Hit Marker confirm audio
  playHitMarker() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.setValueAtTime(2200, now + 0.03);
      gain.gain.setValueAtTime(0.25 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (_) {}
  }

  // Player Damage Grunt / Impact
  playPlayerHit() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
      gain.gain.setValueAtTime(0.4 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (_) {}
  }

  // Reload sound (Slide rack mechanical clicks)
  playReload() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [0, 0.22, 0.45].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600 + idx * 200, now + offset);
        osc.frequency.exponentialRampToValueAtTime(200, now + offset + 0.08);
        gain.gain.setValueAtTime(0.25 * this.volume, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.08);
      });
    } catch (_) {}
  }

  // Objective Completed / Intel Picked Up Fanfare
  playObjectiveComplete() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.25 * this.volume, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.35);
      });
    } catch (_) {}
  }

  // Footstep Audio
  playFootstep() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(70 + Math.random() * 30, now);
      gain.gain.setValueAtTime(0.08 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (_) {}
  }
}

const gameSounds = new ShadowSoundSystem();

// ==========================================
// HIGH PRO MAX: PROCEDURAL TEXTURE GENERATION SUITE
// ==========================================
const createTerrainCanvasTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#23381e';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 6 + 2;
    const colors = ['#2e4726', '#1c2d18', '#382b1d', '#2c2217', '#424a3c', '#172414'];
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? '#555b50' : '#141812';
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  return texture;
};

const createTerrainBumpTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = Math.floor(Math.random() * 255);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  return texture;
};

const createRoadCanvasTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#14161a';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 7000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.6 ? '#282c33' : '#0c0d10';
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  ctx.fillStyle = 'rgba(10, 11, 14, 0.45)';
  ctx.fillRect(110, 0, 60, 512);
  ctx.fillRect(342, 0, 60, 512);

  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(35, 0, 10, 512);
  ctx.fillRect(467, 0, 10, 512);

  ctx.fillStyle = '#f0f4f8';
  for (let y = 15; y < 512; y += 80) {
    ctx.fillRect(250, y, 12, 45);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 12);
  return texture;
};

const createCamoCanvasTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#263423';
  ctx.fillRect(0, 0, 256, 256);

  const colors = ['#3b3327', '#171c14', '#47533c', '#544633', '#1e241c'];
  for (let i = 0; i < 350; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const w = Math.random() * 26 + 8;
    const h = Math.random() * 26 + 8;
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillRect(x, y, w, h);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
};

const createBunkerConcreteTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#4c525a';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = Math.random() > 0.5 ? '#5a626b' : '#3e444b';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = '#282b30';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 250, 250);
  ctx.strokeRect(258, 4, 250, 250);
  ctx.strokeRect(4, 258, 250, 250);
  ctx.strokeRect(258, 258, 250, 250);

  ctx.fillStyle = '#1b1d20';
  [12, 246, 266, 500].forEach((px) => {
    [12, 246, 266, 500].forEach((py) => {
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('SECTOR 07 // MIL-RESTRICTED', 30, 230);
  ctx.fillText('WARNING: LETHAL FORCE', 285, 230);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
};

const createSkyDomeTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#060a16');
  grad.addColorStop(0.35, '#0d192e');
  grad.addColorStop(0.7, '#1b2f48');
  grad.addColorStop(0.9, '#3a332a');
  grad.addColorStop(1.0, '#4a3d2e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 220; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 240;
    const alpha = Math.random() * 0.8 + 0.2;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  ctx.fillStyle = 'rgba(45, 60, 85, 0.28)';
  for (let i = 0; i < 18; i++) {
    const x = Math.random() * 512;
    const y = 290 + Math.random() * 130;
    ctx.beginPath();
    ctx.ellipse(x, y, 100, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
};

const createBarkCanvasTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#261b14';
  ctx.fillRect(0, 0, 128, 256);

  for (let x = 0; x < 128; x += 4) {
    ctx.fillStyle = Math.random() > 0.5 ? '#38281d' : '#1c130d';
    ctx.fillRect(x, 0, 3, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 3);
  return texture;
};

const createGrassTuftTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);

  const blades = [
    { x1: 64, y1: 128, x2: 28, y2: 20, color: '#385e28' },
    { x1: 64, y1: 128, x2: 44, y2: 12, color: '#4a7534' },
    { x1: 64, y1: 128, x2: 64, y2: 6, color: '#55873c' },
    { x1: 64, y1: 128, x2: 82, y2: 14, color: '#446e2f' },
    { x1: 64, y1: 128, x2: 100, y2: 24, color: '#325424' },
    { x1: 60, y1: 128, x2: 18, y2: 45, color: '#2d4720' },
    { x1: 68, y1: 128, x2: 112, y2: 40, color: '#3f632b' },
  ];

  blades.forEach((b) => {
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.quadraticCurveTo((b.x1 + b.x2) / 2 + 6, (b.y1 + b.y2) / 2, b.x2, b.y2);
    ctx.stroke();
  });

  return new THREE.CanvasTexture(canvas);
};

const createCrateTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#2d3b2b';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#1c261b';
  ctx.fillRect(0, 0, 256, 18);
  ctx.fillRect(0, 238, 256, 18);
  ctx.fillRect(0, 0, 18, 256);
  ctx.fillRect(238, 0, 18, 256);

  ctx.strokeStyle = '#1c261b';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(18, 18);
  ctx.lineTo(238, 238);
  ctx.stroke();

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('AMMO 5.56mm', 40, 120);
  ctx.fillText('US FORCES', 50, 145);

  return new THREE.CanvasTexture(canvas);
};

const createSandbagTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#7a6b52';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = 'rgba(60, 50, 35, 0.25)';
  for (let i = 0; i < 256; i += 4) {
    ctx.fillRect(i, 0, 1.5, 256);
    ctx.fillRect(0, i, 256, 1.5);
  }

  return new THREE.CanvasTexture(canvas);
};

// ==========================================
// MAIN 3D SHADOW STRIKE COMPONENT
// ==========================================
export default function ShadowStrikeScreen({ navigation }: any) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const mountRef = useRef<any>(null);

  // UI States
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [playerArmor, setPlayerArmor] = useState<number>(100);
  const [ammoClip, setAmmoClip] = useState<number>(30);
  const [ammoReserve, setAmmoReserve] = useState<number>(120);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [currentObjective, setCurrentObjective] = useState<string>('EXPLORE THE STARTING PERIMETER');
  const [objectiveDist, setObjectiveDist] = useState<number>(45);
  const [interactPrompt, setInteractPrompt] = useState<string | null>(null);
  const [hitMarkerVisible, setHitMarkerVisible] = useState<boolean>(false);
  const [damageVignette, setDamageVignette] = useState<boolean>(false);
  const [missionNotification, setMissionNotification] = useState<string | null>(null);
  const [graphicsQuality, setGraphicsQuality] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');
  const [score, setScore] = useState<number>(0);
  const [enemiesNeutralized, setEnemiesNeutralized] = useState<number>(0);
  const [missionTimeSec, setMissionTimeSec] = useState<number>(0);

  // Mutable Game Loop References
  const gameRef = useRef({
    state: 'MENU' as GameState,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    dirSun: null as THREE.DirectionalLight | null,
    ambientLight: null as THREE.HemisphereLight | null,
    animFrameId: null as any,

    // Clock & Timers
    clock: new THREE.Clock(),
    elapsedTime: 0,
    lastStepTime: 0,

    // Controls & Input
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
      isShooting: false,
      isPointerLocked: false,
    },

    // Player Physics & Articulated Rig
    player: {
      position: new THREE.Vector3(0, 2, 45),
      velocity: new THREE.Vector3(0, 0, 0),
      mesh: null as THREE.Group | null,
      torsoGroup: null as THREE.Group | null,
      bodyMesh: null as THREE.Mesh | null,
      legL: null as THREE.Group | null,
      legR: null as THREE.Group | null,
      armL: null as THREE.Group | null,
      armR: null as THREE.Group | null,
      gunGroup: null as THREE.Group | null,
      gunMesh: null as THREE.Mesh | null,
      muzzleLight: null as THREE.PointLight | null,
      muzzleFlashMesh: null as THREE.Mesh | null,
      onGround: true,
      hp: 100,
      armor: 100,
      clip: 30,
      reserve: 120,
      reloading: false,
      hasKeycard: false,
      hasIntel: false,
      walkCycle: 0,
    },

    // Tactical Laser Sight
    laserLine: null as THREE.Line | null,
    laserDot: null as THREE.Mesh | null,

    // Camera follow offsets
    camTarget: new THREE.Vector3(),
    currentCamPos: new THREE.Vector3(0, 3, 50),

    // World & High Pro Max Entities
    terrainMesh: null as THREE.Mesh | null,
    obstacles: [] as THREE.Box3[],
    enemies: [] as EnemyEntity[],
    particles: [] as ParticleItem[],
    bulletTracers: [] as { line: THREE.Line; life: number }[],
    explosiveBarrels: [] as ExplosiveBarrel[],
    searchlights: [] as THREE.SpotLight[],
    volumetricCones: [] as THREE.Mesh[],
    grassMeshes: [] as THREE.Mesh[],
    dustParticles: [] as THREE.Mesh[],
    cloudsMesh: null as THREE.Mesh | null,
    radarDish: null as THREE.Mesh | null,
    beaconLight: null as THREE.PointLight | null,

    // Key Mission Items
    keycardMesh: null as THREE.Group | null,
    intelMesh: null as THREE.Group | null,
    extractionMesh: null as THREE.Group | null,
    gateMesh: null as THREE.Group | null,
    gateOpen: false,

    // Campaign Objectives
    objectives: [] as Objective[],
    currentObjIndex: 0,
  });

  // ==========================================
  // INITIALIZE 3D ENGINE & SCENE (HIGH PRO MAX)
  // ==========================================
  useEffect(() => {
    if (Platform.OS !== 'web' || !mountRef.current) return;

    const g = gameRef.current;
    const width = mountRef.current.clientWidth || winWidth;
    const height = mountRef.current.clientHeight || winHeight;

    // 1. Scene with Rich Atmospheric Sky
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a1120');
    scene.fog = new THREE.FogExp2('#0d182b', 0.007);
    g.scene = scene;

    // Celestial Skydome Sphere with atmospheric gradient & stars
    const skyGeo = new THREE.SphereGeometry(450, 32, 16);
    const skyTex = createSkyDomeTexture();
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex || undefined,
      side: THREE.BackSide,
      fog: false,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // Drifting Volumetric Cloud Layer
    const cloudGeo = new THREE.PlaneGeometry(600, 600);
    cloudGeo.rotateX(-Math.PI / 2);
    const cloudMat = new THREE.MeshBasicMaterial({
      color: '#1a2b42',
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.position.y = 135;
    scene.add(cloudMesh);
    g.cloudsMesh = cloudMesh;

    // Atmospheric Floating Dust Particles
    const dustGeo = new THREE.BufferGeometry();
    const dustCount = 80;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 120;
      dustPos[i + 1] = Math.random() * 10 + 0.5;
      dustPos[i + 2] = (Math.random() - 0.5) * 120;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: '#ffea9f',
      size: 0.22,
      transparent: true,
      opacity: 0.6,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 950);
    camera.position.set(0, 3, 50);
    g.camera = camera;

    // 3. Renderer with HIGH PRO MAX Filmic Tone Mapping & Soft Shadows
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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    g.renderer = renderer;

    // Mount canvas to DOM
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 4. Photorealistic Cinematic Lighting Rig
    const ambientLight = new THREE.HemisphereLight('#8ebcff', '#36281e', 0.9);
    scene.add(ambientLight);
    g.ambientLight = ambientLight;

    const dirSun = new THREE.DirectionalLight('#fff0db', 2.4);
    dirSun.position.set(85, 140, 65);
    dirSun.castShadow = true;
    dirSun.shadow.mapSize.width = 2048;
    dirSun.shadow.mapSize.height = 2048;
    dirSun.shadow.camera.near = 10;
    dirSun.shadow.camera.far = 400;
    const d = 130;
    dirSun.shadow.camera.left = -d;
    dirSun.shadow.camera.right = d;
    dirSun.shadow.camera.top = d;
    dirSun.shadow.camera.bottom = -d;
    dirSun.shadow.bias = -0.0003;
    scene.add(dirSun);
    g.dirSun = dirSun;

    // Sun flare glow
    const sunOrb = new THREE.Mesh(
      new THREE.SphereGeometry(16, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#ffea9f', fog: false })
    );
    sunOrb.position.set(240, 390, 180);
    scene.add(sunOrb);

    // 5. Build Environment, Highway, Player, Tactical Laser, AI & Mission Items
    buildOpenWorldTerrain(scene, g);
    buildAsphaltRoad(scene, g);
    buildAbandonedFacility(scene, g);
    buildPlayerCharacter(scene, g);
    buildTacticalLaserSight(scene, g);
    spawnEnemyPatrols(scene, g);
    setupMissionSystem(scene, g);

    // 6. Setup Event Listeners
    setupInputListeners(renderer.domElement, g);

    // 7. Handle Window Resize
    const onResize = () => {
      if (!mountRef.current || !g.camera || !g.renderer) return;
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;
      g.camera.aspect = w / h;
      g.camera.updateProjectionMatrix();
      g.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 8. Main Game Render Loop
    let isRunning = true;
    const gameLoop = () => {
      if (!isRunning) return;
      const dt = Math.min(g.clock.getDelta(), 0.1);
      const t = g.clock.getElapsedTime();

      // Atmospheric Cloud Drift
      if (g.cloudsMesh) {
        g.cloudsMesh.rotation.y += dt * 0.006;
      }

      // Wind Sway on Wild Grass Clumps
      if (g.grassMeshes && g.grassMeshes.length > 0) {
        for (let i = 0; i < g.grassMeshes.length; i++) {
          const m = g.grassMeshes[i];
          m.rotation.z = Math.sin(t * 1.8 + m.position.x * 0.4) * 0.12;
        }
      }

      // Rotating Rooftop Radar Dish
      if (g.radarDish) {
        g.radarDish.rotation.y += dt * 0.55;
      }

      if (g.state === 'PLAYING') {
        updatePlayerPhysics(dt, g);
        updateCombatAndWeapons(dt, g);
        updateEnemyAI(dt, g);
        updateMissionProgress(g);
        updateParticles(dt, g);
        updateTacticalLaser(g);

        // Animate searchlights swinging with volumetric beam cones
        g.searchlights.forEach((sl: any, idx: number) => {
          const sweepX = Math.sin(t * 0.75 + idx * 2.2) * 26;
          sl.target.position.x = sweepX;
          if (g.volumetricCones[idx]) {
            g.volumetricCones[idx].lookAt(sl.target.position);
          }
        });
      } else if (g.state === 'MENU') {
        // Cinematic camera orbit around mountain facility
        g.elapsedTime += dt * 0.35;
        if (g.camera) {
          g.camera.position.x = Math.sin(g.elapsedTime) * 65;
          g.camera.position.z = Math.cos(g.elapsedTime) * 65 + 10;
          g.camera.position.y = 28 + Math.sin(g.elapsedTime * 0.5) * 5;
          g.camera.lookAt(0, 10, -20);
        }
      }

      if (g.renderer && g.scene && g.camera) {
        g.renderer.render(g.scene, g.camera);
      }

      g.animFrameId = requestAnimationFrame(gameLoop);
    };

    g.animFrameId = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      if (g.animFrameId) cancelAnimationFrame(g.animFrameId);
      window.removeEventListener('resize', onResize);
      if (renderer.domElement && mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [winWidth, winHeight]);

  // ==========================================
  // PROCEDURAL OPEN-WORLD TERRAIN GENERATION (HIGH PRO MAX)
  // ==========================================
  const buildOpenWorldTerrain = (scene: THREE.Scene, g: any) => {
    const size = 360;
    const segments = 100;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      const distFromCenter = Math.sqrt(x * x + z * z);

      let height = 0;
      if (distFromCenter > 35) {
        height =
          Math.sin(x * 0.04) * Math.cos(z * 0.04) * 8.5 +
          Math.sin(x * 0.08 + 1.2) * Math.cos(z * 0.08) * 4.2;

        if (distFromCenter > 115) {
          height += Math.pow((distFromCenter - 115) * 0.28, 1.85);
        }
      } else {
        height = Math.sin(x * 0.02) * 0.35;
      }

      pos.setY(i, height);
    }
    geo.computeVertexNormals();

    const terrainTex = createTerrainCanvasTexture();
    const terrainBump = createTerrainBumpTexture();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTex || undefined,
      bumpMap: terrainBump || undefined,
      bumpScale: 0.18,
      roughness: 0.88,
      metalness: 0.04,
    });
    const terrain = new THREE.Mesh(geo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);
    g.terrainMesh = terrain;

    // Towering Perimeter Mountain Ring enclosing the tactical valley
    const mountainRingGeo = new THREE.CylinderGeometry(210, 160, 80, 32, 4, true);
    mountainRingGeo.rotateY(Math.PI / 4);
    const mRingPos = mountainRingGeo.attributes.position;
    for (let i = 0; i < mRingPos.count; i++) {
      const vx = mRingPos.getX(i);
      const vy = mRingPos.getY(i);
      const vz = mRingPos.getZ(i);
      const crag = Math.sin(vx * 0.08) * Math.cos(vz * 0.08) * 12;
      mRingPos.setY(i, vy + crag);
    }
    mountainRingGeo.computeVertexNormals();

    const mountainRingMat = new THREE.MeshStandardMaterial({
      color: '#1b241c',
      roughness: 0.95,
      metalness: 0.05,
      bumpMap: terrainBump || undefined,
      bumpScale: 0.3,
      side: THREE.BackSide,
      flatShading: true,
    });
    const mountainRing = new THREE.Mesh(mountainRingGeo, mountainRingMat);
    mountainRing.position.y = 28;
    scene.add(mountainRing);

    // Realistic Multi-Tier Pine Trees & Boulders
    const trunkTex = createBarkCanvasTexture();
    const trunkMat = new THREE.MeshStandardMaterial({
      map: trunkTex || undefined,
      roughness: 0.92,
    });
    const foliageMat = new THREE.MeshStandardMaterial({
      color: '#183820',
      roughness: 0.78,
      flatShading: true,
    });
    const rockGeo = new THREE.DodecahedronGeometry(1.7, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: '#4e5459',
      roughness: 0.88,
      flatShading: true,
    });

    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 4.2, 7);
    const fTier1Geo = new THREE.ConeGeometry(3.6, 4.4, 7);
    const fTier2Geo = new THREE.ConeGeometry(2.8, 3.8, 7);
    const fTier3Geo = new THREE.ConeGeometry(1.9, 3.2, 7);

    for (let i = 0; i < 95; i++) {
      const tx = (Math.random() - 0.5) * 240;
      const tz = (Math.random() - 0.5) * 240;
      const dCenter = Math.sqrt(tx * tx + tz * tz);

      if (dCenter > 38 && dCenter < 125) {
        const ty = getTerrainHeight(tx, tz);

        const treeGroup = new THREE.Group();
        treeGroup.position.set(tx, ty, tz);
        const tScale = 0.85 + Math.random() * 0.45;
        treeGroup.scale.set(tScale, tScale, tScale);
        treeGroup.rotation.y = Math.random() * Math.PI * 2;

        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 2.1;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        treeGroup.add(trunk);

        // Tier 1 bottom foliage
        const f1 = new THREE.Mesh(fTier1Geo, foliageMat);
        f1.position.y = 3.8;
        f1.castShadow = true;
        treeGroup.add(f1);

        // Tier 2 mid foliage
        const f2 = new THREE.Mesh(fTier2Geo, foliageMat);
        f2.position.y = 6.2;
        f2.castShadow = true;
        treeGroup.add(f2);

        // Tier 3 top foliage
        const f3 = new THREE.Mesh(fTier3Geo, foliageMat);
        f3.position.y = 8.4;
        f3.castShadow = true;
        treeGroup.add(f3);

        scene.add(treeGroup);

        g.obstacles.push(new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(tx, ty + 2.5, tz),
          new THREE.Vector3(1.3 * tScale, 6 * tScale, 1.3 * tScale)
        ));

        if (Math.random() < 0.45) {
          const rx = tx + (Math.random() - 0.5) * 7;
          const rz = tz + (Math.random() - 0.5) * 7;
          const ry = getTerrainHeight(rx, rz);
          const rock = new THREE.Mesh(rockGeo, rockMat);
          const rScale = 0.8 + Math.random() * 1.5;
          rock.scale.set(rScale, rScale * 0.75, rScale);
          rock.position.set(rx, ry + rScale * 0.65, rz);
          rock.rotation.set(Math.random(), Math.random(), Math.random());
          rock.castShadow = true;
          rock.receiveShadow = true;
          scene.add(rock);
          g.obstacles.push(new THREE.Box3().setFromObject(rock));
        }
      }
    }

    // High Pro Max: 130+ Animated Wild Grass Blade Clumps
    const grassTex = createGrassTuftTexture();
    const grassMat = new THREE.MeshStandardMaterial({
      map: grassTex || undefined,
      transparent: true,
      alphaTest: 0.35,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const grassQuadGeo = new THREE.PlaneGeometry(1.6, 1.3);

    for (let i = 0; i < 130; i++) {
      const gx = (Math.random() - 0.5) * 230;
      const gz = (Math.random() - 0.5) * 230;
      const gDist = Math.sqrt(gx * gx + gz * gz);
      if (gDist > 14 && gDist < 120) {
        const gy = getTerrainHeight(gx, gz);
        const grassCluster = new THREE.Group();
        grassCluster.position.set(gx, gy + 0.65, gz);

        const p1 = new THREE.Mesh(grassQuadGeo, grassMat);
        const p2 = new THREE.Mesh(grassQuadGeo, grassMat);
        p2.rotation.y = Math.PI / 2;
        grassCluster.add(p1);
        grassCluster.add(p2);
        grassCluster.rotation.y = Math.random() * Math.PI;

        scene.add(grassCluster);
        g.grassMeshes.push(grassCluster);
      }
    }
  };

  // Terrain height query helper
  const getTerrainHeight = (x: number, z: number): number => {
    const dist = Math.sqrt(x * x + z * z);
    if (dist <= 35) return 0;
    let h = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 8.5 + Math.sin(x * 0.08 + 1.2) * Math.cos(z * 0.08) * 4.2;
    if (dist > 115) h += Math.pow((dist - 115) * 0.28, 1.85);
    return Math.max(0, h);
  };

  // ==========================================
  // REALISTIC ASPHALT ROAD WITH HIGHWAY MARKINGS & BARRIERS
  // ==========================================
  const buildAsphaltRoad = (scene: THREE.Scene, g: any) => {
    const roadTex = createRoadCanvasTexture();
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex || undefined,
      roughness: 0.82,
      metalness: 0.1,
    });

    // Road segment leading from spawn to gate
    const roadGeo = new THREE.BoxGeometry(9.6, 0.16, 78);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, 0.08, 38);
    road.receiveShadow = true;
    scene.add(road);

    // Concrete Jersey Safety Barriers flanking the highway
    const barrierMat = new THREE.MeshStandardMaterial({ color: '#555d66', roughness: 0.75 });
    const barrierGeo = new THREE.BoxGeometry(0.5, 0.9, 3.5);

    [-5.2, 5.2].forEach((xOffset) => {
      for (let z = 10; z <= 65; z += 4.5) {
        const barrier = new THREE.Mesh(barrierGeo, barrierMat);
        barrier.position.set(xOffset, 0.45, z);
        barrier.castShadow = true;
        barrier.receiveShadow = true;
        scene.add(barrier);
        g.obstacles.push(new THREE.Box3().setFromObject(barrier));
      }
    });
  };

  // ==========================================
  // BUILD ABANDONED MILITARY COMPLEX (HIGH PRO MAX)
  // ==========================================
  const buildAbandonedFacility = (scene: THREE.Scene, g: any) => {
    const bunkerTex = createBunkerConcreteTexture();
    const crateTex = createCrateTexture();
    const sandbagTex = createSandbagTexture();

    const concreteMat = new THREE.MeshStandardMaterial({
      map: bunkerTex || undefined,
      roughness: 0.72,
      metalness: 0.1,
    });
    const rustMetalMat = new THREE.MeshStandardMaterial({
      color: '#38251e',
      roughness: 0.58,
      metalness: 0.75,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: '#1a1f26',
      roughness: 0.35,
      metalness: 0.9,
    });
    const hazardMat = new THREE.MeshBasicMaterial({ color: '#ffcc00' });
    const redLightMat = new THREE.MeshBasicMaterial({ color: '#ff0033' });
    const sandbagMat = new THREE.MeshStandardMaterial({
      map: sandbagTex || undefined,
      roughness: 0.88,
    });
    const crateMat = new THREE.MeshStandardMaterial({
      map: crateTex || undefined,
      roughness: 0.7,
      metalness: 0.3,
    });

    // 1. Concrete Compound Floor Slab
    const slab = new THREE.Mesh(new THREE.BoxGeometry(68, 0.45, 68), concreteMat);
    slab.position.set(0, 0.1, -15);
    slab.receiveShadow = true;
    scene.add(slab);

    // 2. Central Reinforced Bunker (HQ Facility)
    const bunkerGroup = new THREE.Group();
    bunkerGroup.position.set(0, 0, -25);

    const bunker = new THREE.Mesh(new THREE.BoxGeometry(26, 7.8, 20), concreteMat);
    bunker.position.y = 3.9;
    bunker.castShadow = true;
    bunker.receiveShadow = true;
    bunkerGroup.add(bunker);

    // Hazard warning stripe above bunker entrance
    const hazardStripe = new THREE.Mesh(new THREE.BoxGeometry(13, 0.85, 0.2), hazardMat);
    hazardStripe.position.set(0, 6.3, 10.1);
    bunkerGroup.add(hazardStripe);

    // Rotating Satellite Radar Dish on Roof
    const dishMast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 3.5), darkSteelMat);
    dishMast.position.set(0, 9.5, 0);
    bunkerGroup.add(dishMast);

    const dishGroup = new THREE.Group();
    dishGroup.position.set(0, 11.2, 0);

    const dish = new THREE.Mesh(new THREE.SphereGeometry(2.8, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), darkSteelMat);
    dish.rotation.x = 0.55;
    dishGroup.add(dish);

    // Blinking red aviation warning light on mast
    const mastLight = new THREE.PointLight('#ff0033', 2.0, 15);
    mastLight.position.set(0, 1.8, 0);
    dishGroup.add(mastLight);

    bunkerGroup.add(dishGroup);
    g.radarDish = dishGroup;

    scene.add(bunkerGroup);
    g.obstacles.push(new THREE.Box3().setFromObject(bunker));

    // 3. Security Blast Gate
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, 5);

    const pillarGeo = new THREE.BoxGeometry(2.4, 6.8, 2.4);
    const pillarL = new THREE.Mesh(pillarGeo, concreteMat);
    pillarL.position.set(-6, 3.4, 0);
    pillarL.castShadow = true;
    gateGroup.add(pillarL);

    const pillarR = new THREE.Mesh(pillarGeo, concreteMat);
    pillarR.position.set(6, 3.4, 0);
    pillarR.castShadow = true;
    gateGroup.add(pillarR);

    // Sliding Door Gate with Heavy Reinforcement
    const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(10, 5.2, 0.45), rustMetalMat);
    gateDoor.position.set(0, 2.6, 0);
    gateDoor.castShadow = true;
    gateGroup.add(gateDoor);

    // Red Security Warning Beacon
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.5), redLightMat);
    beacon.position.set(-6, 6.9, 0);
    gateGroup.add(beacon);

    scene.add(gateGroup);
    g.gateMesh = gateGroup;
    g.obstacles.push(new THREE.Box3().setFromObject(gateDoor));

    // Sandbag Defensive Berms Flanking Checkpoint Gate
    const sandbagGeo = new THREE.BoxGeometry(1.6, 0.5, 0.8);
    for (let row = 0; row < 3; row++) {
      for (let x = -11; x <= -7; x += 1.4) {
        const bag = new THREE.Mesh(sandbagGeo, sandbagMat);
        bag.position.set(x, 0.25 + row * 0.45, 4.2 + (row % 2) * 0.2);
        bag.castShadow = true;
        bag.receiveShadow = true;
        scene.add(bag);
      }
      for (let x = 7; x <= 11; x += 1.4) {
        const bag = new THREE.Mesh(sandbagGeo, sandbagMat);
        bag.position.set(x, 0.25 + row * 0.45, 4.2 + (row % 2) * 0.2);
        bag.castShadow = true;
        bag.receiveShadow = true;
        scene.add(bag);
      }
    }

    // 4. Guard Watchtowers with Volumetric Searchlights
    [-23, 23].forEach((xPos, idx) => {
      const tower = new THREE.Group();
      tower.position.set(xPos, 0, -2);

      // Lattice Truss Legs
      for (let lx = -2.0; lx <= 2.0; lx += 4.0) {
        for (let lz = -2.0; lz <= 2.0; lz += 4.0) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 13), darkSteelMat);
          leg.position.set(lx, 6.5, lz);
          leg.castShadow = true;
          tower.add(leg);
        }
      }

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.2, 5.2), concreteMat);
      cabin.position.set(0, 14, 0);
      cabin.castShadow = true;
      tower.add(cabin);

      // Searchlight Spotlight
      const spotlight = new THREE.SpotLight('#ffffcc', 3.5, 60, Math.PI * 0.24, 0.35);
      spotlight.position.set(0, 12.5, 0);
      spotlight.target.position.set(xPos * 0.4, 0, 14);
      spotlight.castShadow = true;
      scene.add(spotlight.target);
      tower.add(spotlight);
      g.searchlights.push(spotlight);

      // Volumetric Light Cone Mesh
      const coneGeo = new THREE.CylinderGeometry(0.3, 5.5, 30, 16, 1, true);
      coneGeo.rotateX(-Math.PI / 2);
      coneGeo.translate(0, 0, 15);
      const coneMat = new THREE.MeshBasicMaterial({
        color: '#ffffe0',
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const volCone = new THREE.Mesh(coneGeo, coneMat);
      volCone.position.set(0, 12.5, 0);
      volCone.lookAt(spotlight.target.position);
      tower.add(volCone);
      g.volumetricCones.push(volCone);

      scene.add(tower);
      g.obstacles.push(new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(xPos, 6.5, -2),
        new THREE.Vector3(4.5, 15, 4.5)
      ));
    });

    // 5. Military Storage Warehouse & Cargo Crates
    const hangar = new THREE.Mesh(new THREE.BoxGeometry(17, 7.0, 15), rustMetalMat);
    hangar.position.set(-21, 3.5, -30);
    hangar.castShadow = true;
    hangar.receiveShadow = true;
    scene.add(hangar);
    g.obstacles.push(new THREE.Box3().setFromObject(hangar));

    // Stenciled Ammunition Crates
    const crateGeo = new THREE.BoxGeometry(1.8, 1.4, 1.8);
    const cratePositions = [
      new THREE.Vector3(12, 0.7, -5),
      new THREE.Vector3(14, 0.7, -5.2),
      new THREE.Vector3(13, 2.1, -5.1),
      new THREE.Vector3(-14, 0.7, -12),
      new THREE.Vector3(-14, 0.7, -10),
    ];
    cratePositions.forEach((pos) => {
      const cr = new THREE.Mesh(crateGeo, crateMat);
      cr.position.copy(pos);
      cr.castShadow = true;
      cr.receiveShadow = true;
      scene.add(cr);
      g.obstacles.push(new THREE.Box3().setFromObject(cr));
    });

    // Scatter Explosive Fuel Barrels
    const barrelGeo = new THREE.CylinderGeometry(0.72, 0.72, 1.85, 14);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: '#e62e3d',
      roughness: 0.35,
      metalness: 0.65,
    });

    const barrelPositions = [
      new THREE.Vector3(-7, 0.95, 2),
      new THREE.Vector3(8, 0.95, 1),
      new THREE.Vector3(-10, 0.95, -18),
      new THREE.Vector3(12, 0.95, -15),
      new THREE.Vector3(-5, 0.95, -35),
    ];

    barrelPositions.forEach((bPos) => {
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.position.copy(bPos);
      barrel.castShadow = true;
      scene.add(barrel);
      g.explosiveBarrels.push({ mesh: barrel, position: bPos.clone(), detonated: false });
      g.obstacles.push(new THREE.Box3().setFromObject(barrel));
    });

    // 6. Mountain Extraction Helipad
    const helipadGroup = new THREE.Group();
    helipadGroup.position.set(50, getTerrainHeight(50, -70), -70);

    const padSlab = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 10.5, 0.85, 28), concreteMat);
    padSlab.receiveShadow = true;
    helipadGroup.add(padSlab);

    // Glowing Yellow "H" Marking
    const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 5.2), new THREE.MeshBasicMaterial({ color: '#ffea00' }));
    hBar1.position.set(-2.0, 0.48, 0);
    helipadGroup.add(hBar1);

    const hBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 5.2), new THREE.MeshBasicMaterial({ color: '#ffea00' }));
    hBar2.position.set(2.0, 0.48, 0);
    helipadGroup.add(hBar2);

    const hBarCross = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.1, 0.85), new THREE.MeshBasicMaterial({ color: '#ffea00' }));
    hBarCross.position.set(0, 0.48, 0);
    helipadGroup.add(hBarCross);

    // Pulsing Green Extraction Guidance Strobe
    const beaconLight = new THREE.PointLight('#00ff66', 4.5, 40);
    beaconLight.position.set(0, 4.5, 0);
    helipadGroup.add(beaconLight);
    g.beaconLight = beaconLight;

    scene.add(helipadGroup);
    g.extractionMesh = helipadGroup;
  };

  // ==========================================
  // THIRD-PERSON ELITE OPERATIVE CHARACTER RIG (HIGH PRO MAX)
  // ==========================================
  const buildPlayerCharacter = (scene: THREE.Scene, g: any) => {
    const playerGroup = new THREE.Group();
    playerGroup.position.copy(g.player.position);

    const camoTex = createCamoCanvasTexture();
    const camoMat = new THREE.MeshStandardMaterial({
      map: camoTex || undefined,
      roughness: 0.75,
      metalness: 0.05,
    });
    const vestMat = new THREE.MeshStandardMaterial({
      color: '#1a222a',
      roughness: 0.55,
      metalness: 0.15,
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: '#00f0ff',
      emissive: '#00b4d8',
      roughness: 0.15,
      metalness: 0.8,
    });
    const darkPolyMat = new THREE.MeshStandardMaterial({
      color: '#101418',
      roughness: 0.6,
      metalness: 0.2,
    });
    const gunMat = new THREE.MeshStandardMaterial({
      color: '#0c0f12',
      roughness: 0.32,
      metalness: 0.88,
    });

    // 1. Torso Group (Breathing & Lean)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.35;
    playerGroup.add(torsoGroup);
    g.player.torsoGroup = torsoGroup;

    // Combat Uniform Base
    const combatShirt = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.52), camoMat);
    combatShirt.castShadow = true;
    torsoGroup.add(combatShirt);
    g.player.bodyMesh = combatShirt;

    // Tactical Modular Plate Carrier Armor Vest
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.58), vestMat);
    vest.position.y = 0.02;
    vest.castShadow = true;
    torsoGroup.add(vest);

    // Front Triple STANAG Rifle Mag Pouches
    [-0.24, 0, 0.24].forEach((px) => {
      const magPouch = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.14), darkPolyMat);
      magPouch.position.set(px, -0.1, 0.34);
      torsoGroup.add(magPouch);
    });

    // Shoulder Comms Radio & Antenna
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.14), darkPolyMat);
    radio.position.set(-0.35, 0.35, 0.15);
    torsoGroup.add(radio);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5), darkPolyMat);
    antenna.position.set(-0.35, 0.65, 0.15);
    torsoGroup.add(antenna);

    // Tactical Assault Backpack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.82, 0.38), darkPolyMat);
    pack.position.set(0, 0.05, -0.42);
    torsoGroup.add(pack);

    // Bedroll on top of backpack
    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.65, 8), camoMat);
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 0.52, -0.42);
    torsoGroup.add(bedroll);

    // 2. Head & High-Cut FAST Ballistic Helmet
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.8, 0);
    torsoGroup.add(headGroup);

    // Balaclava Face Mask
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.52, 0.5), darkPolyMat);
    head.position.y = 0.05;
    head.castShadow = true;
    headGroup.add(head);

    // High-Cut Helmet Shell
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.36, 0.62), camoMat);
    helmet.position.set(0, 0.2, 0.02);
    helmet.castShadow = true;
    headGroup.add(helmet);

    // NVG Shroud & Tactical Goggles
    const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.1), darkPolyMat);
    nvgMount.position.set(0, 0.22, 0.34);
    headGroup.add(nvgMount);

    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.18), visorMat);
    goggles.position.set(0, 0.08, 0.26);
    headGroup.add(goggles);

    // Tactical Headset with boom mic
    const earCupL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.16), darkPolyMat);
    earCupL.position.set(-0.3, 0.08, 0);
    headGroup.add(earCupL);

    const earCupR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.16), darkPolyMat);
    earCupR.position.set(0.3, 0.08, 0);
    headGroup.add(earCupR);

    // 3. Articulated Legs (Locomotion Kinematics)
    const legGeo = new THREE.BoxGeometry(0.32, 0.95, 0.32);
    const bootGeo = new THREE.BoxGeometry(0.34, 0.24, 0.46);
    const kneePadGeo = new THREE.BoxGeometry(0.28, 0.24, 0.12);

    // Left Leg Group
    const legLGroup = new THREE.Group();
    legLGroup.position.set(-0.24, 0.95, 0);
    const legL = new THREE.Mesh(legGeo, camoMat);
    legL.position.y = -0.45;
    legL.castShadow = true;
    legLGroup.add(legL);

    const kneeL = new THREE.Mesh(kneePadGeo, darkPolyMat);
    kneeL.position.set(0, -0.42, 0.18);
    legLGroup.add(kneeL);

    const bootL = new THREE.Mesh(bootGeo, darkPolyMat);
    bootL.position.set(0, -0.85, 0.06);
    bootL.castShadow = true;
    legLGroup.add(bootL);
    playerGroup.add(legLGroup);
    g.player.legL = legLGroup;

    // Right Leg Group with Holstered Sidearm Pistol
    const legRGroup = new THREE.Group();
    legRGroup.position.set(0.24, 0.95, 0);
    const legR = new THREE.Mesh(legGeo, camoMat);
    legR.position.y = -0.45;
    legR.castShadow = true;
    legRGroup.add(legR);

    const kneeR = new THREE.Mesh(kneePadGeo, darkPolyMat);
    kneeR.position.set(0, -0.42, 0.18);
    legRGroup.add(kneeR);

    const bootR = new THREE.Mesh(bootGeo, darkPolyMat);
    bootR.position.set(0, -0.85, 0.06);
    bootR.castShadow = true;
    legRGroup.add(bootR);

    // Holstered Sidearm on Right Thigh
    const holster = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.22), darkPolyMat);
    holster.position.set(0.2, -0.35, 0.02);
    legRGroup.add(holster);
    playerGroup.add(legRGroup);
    g.player.legR = legRGroup;

    // 4. Tactical MK-18 Carbine with Quad Rail, EOTech Sight & Muzzle Flash
    const gunGroup = new THREE.Group();
    gunGroup.position.set(0.42, 1.25, 0.4);

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.92), gunMat);
    receiver.castShadow = true;
    gunGroup.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.65);
    gunGroup.add(barrel);

    // Angled Foregrip
    const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.15), darkPolyMat);
    foregrip.position.set(0, -0.15, 0.45);
    gunGroup.add(foregrip);

    // EOTech Holographic Optic Sight
    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.26), darkPolyMat);
    optic.position.set(0, 0.17, 0.05);
    gunGroup.add(optic);

    const opticReticle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.02), visorMat);
    opticReticle.position.set(0, 0.17, 0.18);
    gunGroup.add(opticReticle);

    // Curved 30-round STANAG Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.18), gunMat);
    mag.position.set(0, -0.22, 0.1);
    gunGroup.add(mag);

    // PEQ-15 Laser Sight Top Module
    const peq = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.2), darkPolyMat);
    peq.position.set(0, 0.15, 0.52);
    gunGroup.add(peq);

    // Multi-Point Starburst Muzzle Flash Mesh (normally hidden)
    const flashMat = new THREE.MeshBasicMaterial({ color: '#fff066', transparent: true, opacity: 0.95 });
    const flashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), flashMat);
    flashMesh.scale.set(1.0, 1.0, 2.5);
    flashMesh.position.set(0, 0.05, 1.05);
    flashMesh.visible = false;
    gunGroup.add(flashMesh);
    g.player.muzzleFlashMesh = flashMesh;

    // Muzzle Flash Dynamic Light
    const muzzleLight = new THREE.PointLight('#ffe066', 0, 10);
    muzzleLight.position.set(0, 0.05, 1.05);
    gunGroup.add(muzzleLight);

    playerGroup.add(gunGroup);
    g.player.gunGroup = gunGroup;
    g.player.gunMesh = receiver;
    g.player.muzzleLight = muzzleLight;

    scene.add(playerGroup);
    g.player.mesh = playerGroup;
  };

  const darkSteelMat = () => new THREE.MeshStandardMaterial({ color: '#16191d', roughness: 0.4, metalness: 0.9 });

  // ==========================================
  // TACTICAL RED LASER SIGHT SYSTEM (HIGH PRO MAX)
  // ==========================================
  const buildTacticalLaserSight = (scene: THREE.Scene, g: any) => {
    // Laser beam line
    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -40),
    ]);
    const laserMat = new THREE.LineBasicMaterial({ color: '#ff0033', transparent: true, opacity: 0.75, linewidth: 2 });
    const laserLine = new THREE.Line(laserGeo, laserMat);
    scene.add(laserLine);
    g.laserLine = laserLine;

    // Laser impact dot
    const dotGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: '#ff0033' });
    const laserDot = new THREE.Mesh(dotGeo, dotMat);
    scene.add(laserDot);
    g.laserDot = laserDot;
  };

  const updateTacticalLaser = (g: any) => {
    if (!g.laserLine || !g.laserDot || !g.player.mesh || !g.camera) return;

    const startPos = g.player.position.clone().add(new THREE.Vector3(
      Math.cos(g.mouseLook.yaw) * 0.45,
      1.3,
      -Math.sin(g.mouseLook.yaw) * 0.45
    ));

    const aimDir = new THREE.Vector3(
      -Math.sin(g.mouseLook.yaw),
      Math.sin(g.mouseLook.pitch),
      -Math.cos(g.mouseLook.yaw)
    ).normalize();

    const endPos = startPos.clone().add(aimDir.clone().multiplyScalar(45));

    // Update laser line vertices
    const posAttr = g.laserLine.geometry.attributes.position;
    posAttr.setXYZ(0, startPos.x, startPos.y, startPos.z);
    posAttr.setXYZ(1, endPos.x, endPos.y, endPos.z);
    posAttr.needsUpdate = true;

    // Laser dot position
    g.laserDot.position.copy(endPos);
  };

  // ==========================================
  // ENEMY AI SYNDICATE PATROL SPAWNS
  // ==========================================
  const spawnEnemyPatrols = (scene: THREE.Scene, g: any) => {
    const enemyMat = new THREE.MeshStandardMaterial({ color: '#8a1c14', roughness: 0.5 });
    const visorMat = new THREE.MeshBasicMaterial({ color: '#ff0033' });
    const gunMat = darkSteelMat();

    const patrolConfigs = [
      {
        startPos: new THREE.Vector3(-12, 0, 18),
        patrol: [new THREE.Vector3(-15, 0, 18), new THREE.Vector3(15, 0, 18)],
      },
      {
        startPos: new THREE.Vector3(0, 0, -5),
        patrol: [new THREE.Vector3(-8, 0, -5), new THREE.Vector3(8, 0, -5)],
      },
      {
        startPos: new THREE.Vector3(-18, 0, -20),
        patrol: [new THREE.Vector3(-22, 0, -15), new THREE.Vector3(-18, 0, -32)],
      },
      {
        startPos: new THREE.Vector3(14, 0, -22),
        patrol: [new THREE.Vector3(18, 0, -18), new THREE.Vector3(10, 0, -30)],
      },
      {
        startPos: new THREE.Vector3(0, 0, -38),
        patrol: [new THREE.Vector3(-10, 0, -38), new THREE.Vector3(10, 0, -38)],
      },
      {
        startPos: new THREE.Vector3(35, getTerrainHeight(35, -55), -55),
        patrol: [new THREE.Vector3(30, getTerrainHeight(30, -50), -50), new THREE.Vector3(45, getTerrainHeight(45, -60), -60)],
      },
    ];

    const enemies: EnemyEntity[] = [];

    patrolConfigs.forEach((cfg, idx) => {
      const eGroup = new THREE.Group();
      eGroup.position.copy(cfg.startPos);

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.1, 0.55), enemyMat);
      torso.position.y = 1.35;
      torso.castShadow = true;
      eGroup.add(torso);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), enemyMat);
      head.position.y = 2.1;
      head.castShadow = true;
      eGroup.add(head);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.15, 0.15), visorMat);
      visor.position.set(0, 2.12, 0.24);
      eGroup.add(visor);

      const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.8), gunMat);
      rifle.position.set(0.4, 1.25, 0.35);
      eGroup.add(rifle);

      const mLight = new THREE.PointLight('#ff3300', 0, 7);
      mLight.position.set(0.4, 1.25, 0.8);
      eGroup.add(mLight);

      scene.add(eGroup);

      enemies.push({
        id: idx + 1,
        mesh: eGroup,
        position: cfg.startPos.clone(),
        velocity: new THREE.Vector3(),
        hp: 100,
        maxHp: 100,
        state: 'PATROL',
        patrolPoints: cfg.patrol,
        currentPatrolIdx: 0,
        alertTimer: 0,
        shootCooldown: 1.0 + Math.random() * 0.5,
        lastKnownPos: new THREE.Vector3(),
        searchTimer: 0,
        gunMesh: rifle,
        muzzleFlashMesh: mLight,
        isDead: false,
      });
    });

    g.enemies = enemies;
  };

  // ==========================================
  // MISSION & INTERACTIVE ITEMS SETUP
  // ==========================================
  const setupMissionSystem = (scene: THREE.Scene, g: any) => {
    // Blue Glowing Keycard
    const keycardGroup = new THREE.Group();
    keycardGroup.position.set(7, 1.2, 1);

    const cardMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.08, 0.9),
      new THREE.MeshStandardMaterial({ color: '#00f0ff', emissive: '#00e5ff', roughness: 0.2 })
    );
    cardMesh.castShadow = true;
    keycardGroup.add(cardMesh);

    const cardLight = new THREE.PointLight('#00f0ff', 2.0, 6);
    keycardGroup.add(cardLight);
    scene.add(keycardGroup);
    g.keycardMesh = keycardGroup;

    // Gold Intel Drive
    const intelGroup = new THREE.Group();
    intelGroup.position.set(0, 1.2, -24);

    const driveMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.2, 0.5),
      new THREE.MeshStandardMaterial({ color: '#ffd700', emissive: '#ffaa00', roughness: 0.3 })
    );
    driveMesh.castShadow = true;
    intelGroup.add(driveMesh);

    const intelLight = new THREE.PointLight('#ffd700', 2.5, 8);
    intelGroup.add(intelLight);
    scene.add(intelGroup);
    g.intelMesh = intelGroup;

    // Objectives
    const objectives: Objective[] = [
      {
        id: 1,
        title: 'SCOUT SECURITY CHECKPOINT',
        description: 'Approach the forward security gate perimeter.',
        targetPos: new THREE.Vector3(0, 0, 12),
        completed: false,
        type: 'explore',
      },
      {
        id: 2,
        title: 'RETRIEVE ACCESS KEYCARD',
        description: 'Locate the security keycard at the guard station.',
        targetPos: new THREE.Vector3(7, 0, 1),
        completed: false,
        type: 'keycard',
      },
      {
        id: 3,
        title: 'BREACH FACILITY BLAST DOORS',
        description: 'Use the access keycard to unlock the security gate.',
        targetPos: new THREE.Vector3(0, 0, 5),
        completed: false,
        type: 'enter',
      },
      {
        id: 4,
        title: 'CLEAR FACILITY DEFENDERS',
        description: 'Eliminate hostile syndicate patrol guards.',
        targetPos: new THREE.Vector3(0, 0, -18),
        completed: false,
        type: 'eliminate',
      },
      {
        id: 5,
        title: 'SECURE CLASSIFIED INTEL DRIVE',
        description: 'Retrieve the gold hard drive from the central bunker.',
        targetPos: new THREE.Vector3(0, 0, -24),
        completed: false,
        type: 'intel',
      },
      {
        id: 6,
        title: 'EVACUATE TO MOUNTAIN HELIPAD',
        description: 'Reach the extraction beacon on the mountain ridge.',
        targetPos: new THREE.Vector3(50, getTerrainHeight(50, -70), -70),
        completed: false,
        type: 'extract',
      },
    ];

    g.objectives = objectives;
    g.currentObjIndex = 0;
  };

  // ==========================================
  // INPUT LISTENERS (KEYBOARD & MOUSE)
  // ==========================================
  const setupInputListeners = (canvas: HTMLCanvasElement, g: any) => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') g.keys.w = true;
      if (k === 'a' || e.key === 'ArrowLeft') g.keys.a = true;
      if (k === 's' || e.key === 'ArrowDown') g.keys.s = true;
      if (k === 'd' || e.key === 'ArrowRight') g.keys.d = true;
      if (e.key === 'Shift') {
        g.keys.shift = true;
        setIsSprinting(true);
      }
      if (e.key === ' ') {
        e.preventDefault();
        g.keys.space = true;
      }
      if (k === 'e') g.keys.e = true;
      if (k === 'r') reloadPlayerWeapon(g);
      if (k === 'f') firePlayerWeapon(g); // F key also fires
      if (e.key === 'Escape') togglePause();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') g.keys.w = false;
      if (k === 'a' || e.key === 'ArrowLeft') g.keys.a = false;
      if (k === 's' || e.key === 'ArrowDown') g.keys.s = false;
      if (k === 'd' || e.key === 'ArrowRight') g.keys.d = false;
      if (e.key === 'Shift') {
        g.keys.shift = false;
        setIsSprinting(false);
      }
      if (e.key === ' ') g.keys.space = false;
      if (k === 'e') g.keys.e = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (g.state !== 'PLAYING') return;

      if (!document.pointerLockElement) {
        canvas.requestPointerLock().catch(() => {});
      }

      if (e.button === 0) {
        // Left click: Fire weapon
        firePlayerWeapon(g);
      } else if (e.button === 2) {
        // Right click: Aim down sights
        g.mouseLook.isAiming = !g.mouseLook.isAiming;
        setIsAiming(g.mouseLook.isAiming);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        const sensitivity = 0.0022;
        g.mouseLook.yaw -= e.movementX * sensitivity;
        g.mouseLook.pitch -= e.movementY * sensitivity;
        g.mouseLook.pitch = Math.max(-0.6, Math.min(0.85, g.mouseLook.pitch));
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('contextmenu', onContextMenu);
  };

  // ==========================================
  // PLAYER LOCOMOTION & CAMERA UPDATE
  // ==========================================
  const updatePlayerPhysics = (dt: number, g: any) => {
    const p = g.player;
    if (!p.mesh) return;

    const forward = new THREE.Vector3(-Math.sin(g.mouseLook.yaw), 0, -Math.cos(g.mouseLook.yaw));
    const right = new THREE.Vector3(Math.cos(g.mouseLook.yaw), 0, -Math.sin(g.mouseLook.yaw));

    const moveDir = new THREE.Vector3(0, 0, 0);
    if (g.keys.w) moveDir.add(forward);
    if (g.keys.s) moveDir.sub(forward);
    if (g.keys.d) moveDir.add(right);
    if (g.keys.a) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0.01;
    if (isMoving) moveDir.normalize();

    const baseSpeed = g.keys.shift && !g.mouseLook.isAiming ? 13.0 : g.mouseLook.isAiming ? 5.0 : 7.8;
    p.velocity.x = moveDir.x * baseSpeed;
    p.velocity.z = moveDir.z * baseSpeed;

    if (g.keys.space && p.onGround) {
      p.velocity.y = 9.5;
      p.onGround = false;
      gameSounds.playFootstep();
    }

    p.velocity.y -= 22.0 * dt;

    const nextPos = p.position.clone().add(p.velocity.clone().multiplyScalar(dt));

    const groundY = getTerrainHeight(nextPos.x, nextPos.z);
    if (nextPos.y <= groundY + 0.1) {
      nextPos.y = groundY;
      p.velocity.y = 0;
      p.onGround = true;
    }

    const playerBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(nextPos.x, nextPos.y + 1.2, nextPos.z),
      new THREE.Vector3(1.2, 2.4, 1.2)
    );

    let hitObstacle = false;
    for (let box of g.obstacles) {
      if (box.intersectsBox(playerBox)) {
        hitObstacle = true;
        break;
      }
    }

    if (!hitObstacle) {
      p.position.copy(nextPos);
    } else {
      p.position.y = nextPos.y;
    }

    p.mesh.position.copy(p.position);

    if (isMoving || g.mouseLook.isAiming) {
      p.mesh.rotation.y = g.mouseLook.yaw;
    }

    if (isMoving && p.onGround) {
      p.walkCycle += dt * (g.keys.shift ? 15 : 9.5);
      const stride = Math.sin(p.walkCycle) * (g.keys.shift ? 0.75 : 0.52);

      if (p.legL) p.legL.rotation.x = stride;
      if (p.legR) p.legR.rotation.x = -stride;

      if (p.torsoGroup) {
        p.torsoGroup.rotation.x = g.keys.shift ? 0.16 : 0.04;
        p.torsoGroup.position.y = 1.35 + Math.abs(Math.sin(p.walkCycle)) * 0.08;
      }

      if (Math.sin(p.walkCycle) > 0.95 && g.lastStepTime + 0.28 < g.elapsedTime) {
        gameSounds.playFootstep();
        g.lastStepTime = g.elapsedTime;
      }
    } else {
      if (p.legL) p.legL.rotation.x *= 0.85;
      if (p.legR) p.legR.rotation.x *= 0.85;
      if (p.torsoGroup) {
        p.torsoGroup.rotation.x *= 0.85;
        p.torsoGroup.position.y = 1.35 + Math.sin(g.elapsedTime * 2.2) * 0.015;
      }
    }

    const camDist = g.mouseLook.isAiming ? 1.9 : 3.8;
    const camHeight = g.mouseLook.isAiming ? 1.6 : 2.2;
    const shoulderOffset = g.mouseLook.isAiming ? 0.65 : 0.85;

    const camX = p.position.x + Math.sin(g.mouseLook.yaw) * camDist + Math.cos(g.mouseLook.yaw) * shoulderOffset;
    const camZ = p.position.z + Math.cos(g.mouseLook.yaw) * camDist - Math.sin(g.mouseLook.yaw) * shoulderOffset;
    let camY = p.position.y + camHeight + Math.sin(g.mouseLook.pitch) * 2.5;

    // Camera terrain collision safety clamp
    const camGroundH = getTerrainHeight(camX, camZ);
    camY = Math.max(camGroundH + 0.6, camY);

    g.currentCamPos.lerp(new THREE.Vector3(camX, camY, camZ), 0.22);
    if (g.camera) {
      g.camera.position.copy(g.currentCamPos);

      const lookTarget = p.position.clone().add(new THREE.Vector3(
        -Math.sin(g.mouseLook.yaw) * 25,
        1.6 + Math.sin(g.mouseLook.pitch) * 12,
        -Math.cos(g.mouseLook.yaw) * 25
      ));
      g.camera.lookAt(lookTarget);
    }
  };

  // ==========================================
  // COMBAT & WEAPON FIRING SYSTEM (HIGH PRO MAX)
  // ==========================================
  const firePlayerWeapon = (g: any) => {
    const p = g.player;
    if (p.reloading || p.clip <= 0) {
      if (p.clip <= 0) reloadPlayerWeapon(g);
      return;
    }

    p.clip -= 1;
    setAmmoClip(p.clip);
    gameSounds.playGunshot(false);

    // Muzzle Flash Starburst Mesh & Dynamic Point Light
    if (p.muzzleFlashMesh) {
      p.muzzleFlashMesh.visible = true;
      p.muzzleFlashMesh.rotation.z = Math.random() * Math.PI * 2;
      setTimeout(() => {
        if (p.muzzleFlashMesh) p.muzzleFlashMesh.visible = false;
      }, 45);
    }

    if (p.muzzleLight) {
      p.muzzleLight.intensity = 5.5;
      setTimeout(() => {
        if (p.muzzleLight) p.muzzleLight.intensity = 0;
      }, 45);
    }

    // Weapon Physical Recoil Kick
    if (p.gunGroup) {
      p.gunGroup.position.z -= 0.08;
      setTimeout(() => {
        if (p.gunGroup) p.gunGroup.position.z = 0.4;
      }, 75);
    }

    // Ejecting golden brass casing particle
    spawnBulletCasing(p.position.clone().add(new THREE.Vector3(0, 1.3, 0)), g);

    // Camera Recoil Pitch Kick
    g.mouseLook.pitch += 0.024;

    // Raycast Bullet into Scene
    if (!g.camera || !g.scene) return;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), g.camera);

    const hits = raycaster.intersectObjects(g.scene.children, true);
    let hitPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(90));

    if (hits.length > 0) {
      for (let hit of hits) {
        if (!isChildOf(hit.object, p.mesh)) {
          hitPoint = hit.point;

          // Check if hit an enemy
          const enemyHit = findEnemyFromHit(hit.object, g.enemies);
          if (enemyHit && !enemyHit.isDead) {
            damageEnemy(enemyHit, 35, g);
            triggerHitMarker();
          }

          // Check if hit an explosive red barrel
          for (let b of g.explosiveBarrels) {
            if (!b.detonated && hit.point.distanceTo(b.position) < 2.0) {
              detonateBarrel(b, g);
              break;
            }
          }

          spawnImpactSparks(hitPoint, g);
          break;
        }
      }
    }

    createBulletTracer(p.position.clone().add(new THREE.Vector3(0, 1.3, 0)), hitPoint, g);
  };

  // Detonate explosive fuel barrel with huge fireball
  const detonateBarrel = (b: ExplosiveBarrel, g: any) => {
    b.detonated = true;
    gameSounds.playExplosion();

    // Fireball visual mesh
    const fireGeo = new THREE.SphereGeometry(3.5, 12, 12);
    const fireMat = new THREE.MeshBasicMaterial({ color: '#ff5500', transparent: true, opacity: 0.9 });
    const fireball = new THREE.Mesh(fireGeo, fireMat);
    fireball.position.copy(b.position);
    g.scene.add(fireball);

    // Light flash
    const fLight = new THREE.PointLight('#ff7700', 6.0, 20);
    fLight.position.copy(b.position);
    g.scene.add(fLight);

    setTimeout(() => {
      g.scene.remove(fireball);
      g.scene.remove(fLight);
      g.scene.remove(b.mesh);
    }, 350);

    // Area damage to nearby enemies
    for (let e of g.enemies) {
      if (!e.isDead && e.position.distanceTo(b.position) < 10) {
        damageEnemy(e, 85, g);
      }
    }
  };

  // Ejecting bullet casing particle
  const spawnBulletCasing = (pos: THREE.Vector3, g: any) => {
    const caseGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 6);
    const caseMat = new THREE.MeshBasicMaterial({ color: '#ffd700' });
    const casing = new THREE.Mesh(caseGeo, caseMat);
    casing.position.copy(pos);
    g.scene.add(casing);
    g.particles.push({
      mesh: casing,
      velocity: new THREE.Vector3(
        Math.cos(g.mouseLook.yaw) * 4 + (Math.random() - 0.5),
        2.5 + Math.random(),
        -Math.sin(g.mouseLook.yaw) * 4 + (Math.random() - 0.5)
      ),
      life: 0.4,
      maxLife: 0.4,
      fade: true,
    });
  };

  const isChildOf = (obj: THREE.Object3D, parent: THREE.Object3D | null): boolean => {
    let curr: any = obj;
    while (curr) {
      if (curr === parent) return true;
      curr = curr.parent;
    }
    return false;
  };

  const findEnemyFromHit = (obj: THREE.Object3D, enemies: EnemyEntity[]): EnemyEntity | null => {
    for (let e of enemies) {
      if (isChildOf(obj, e.mesh)) return e;
    }
    return null;
  };

  // Damage Enemy Logic
  const damageEnemy = (e: EnemyEntity, dmg: number, g: any) => {
    e.hp = Math.max(0, e.hp - dmg);
    e.state = 'CHASE';
    e.lastKnownPos.copy(g.player.position);

    e.mesh.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const orig = child.material.color.getHex();
        child.material.color.setHex(0xffffff);
        setTimeout(() => {
          child.material.color.setHex(orig);
        }, 80);
      }
    });

    if (e.hp <= 0 && !e.isDead) {
      e.isDead = true;
      e.state = 'DEAD';
      e.mesh.rotation.x = Math.PI / 2;
      e.mesh.position.y = 0.2;
      setEnemiesNeutralized((n) => n + 1);
      setScore((s) => s + 150);
      spawnItemDrop(e.position.clone(), g);
    }
  };

  const triggerHitMarker = () => {
    gameSounds.playHitMarker();
    setHitMarkerVisible(true);
    setTimeout(() => setHitMarkerVisible(false), 90);
  };

  const reloadPlayerWeapon = (g: any) => {
    const p = g.player;
    if (p.reloading || p.clip >= 30 || p.reserve <= 0) return;

    p.reloading = true;
    setIsReloading(true);
    gameSounds.playReload();

    setTimeout(() => {
      const needed = 30 - p.clip;
      const amount = Math.min(needed, p.reserve);
      p.clip += amount;
      p.reserve -= amount;
      p.reloading = false;
      setAmmoClip(p.clip);
      setAmmoReserve(p.reserve);
      setIsReloading(false);
    }, 1800);
  };

  const createBulletTracer = (start: THREE.Vector3, end: THREE.Vector3, g: any) => {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: '#ffea00', linewidth: 2 });
    const line = new THREE.Line(geo, mat);
    g.scene.add(line);
    g.bulletTracers.push({ line, life: 3 });
  };

  const spawnImpactSparks = (pos: THREE.Vector3, g: any) => {
    const sparkGeo = new THREE.SphereGeometry(0.08, 4, 4);
    const sparkMat = new THREE.MeshBasicMaterial({ color: '#ffcc00' });

    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(sparkGeo, sparkMat);
      sp.position.copy(pos);
      g.scene.add(sp);
      g.particles.push({
        mesh: sp,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          Math.random() * 6 + 1,
          (Math.random() - 0.5) * 6
        ),
        life: 0.25,
        maxLife: 0.25,
        fade: true,
      });
    }
  };

  const spawnItemDrop = (pos: THREE.Vector3, g: any) => {
    const dropGeo = new THREE.BoxGeometry(0.6, 0.4, 0.6);
    const dropMat = new THREE.MeshStandardMaterial({ color: '#00ff66', emissive: '#00aa44', roughness: 0.3 });
    const drop = new THREE.Mesh(dropGeo, dropMat);
    drop.position.set(pos.x, 0.3, pos.z);
    g.scene.add(drop);
  };

  // ==========================================
  // ENEMY ARTIFICIAL INTELLIGENCE LOOP
  // ==========================================
  const updateEnemyAI = (dt: number, g: any) => {
    const p = g.player;

    for (let e of g.enemies) {
      if (e.isDead) continue;

      const toPlayer = p.position.clone().sub(e.position);
      const distToPlayer = toPlayer.length();

      switch (e.state) {
        case 'PATROL': {
          const target = e.patrolPoints[e.currentPatrolIdx];
          const toTarget = target.clone().sub(e.position);
          if (toTarget.length() < 1.2) {
            e.currentPatrolIdx = (e.currentPatrolIdx + 1) % e.patrolPoints.length;
          } else {
            toTarget.normalize();
            e.position.add(toTarget.multiplyScalar(3.2 * dt));
            e.mesh.rotation.y = Math.atan2(-toTarget.x, -toTarget.z);
          }

          if (distToPlayer < 25) {
            e.state = 'ALERT';
            e.alertTimer = 1.0;
          }
          break;
        }

        case 'ALERT': {
          e.mesh.rotation.y = Math.atan2(-toPlayer.x, -toPlayer.z);
          e.alertTimer -= dt;
          if (e.alertTimer <= 0) {
            e.state = 'CHASE';
          }
          break;
        }

        case 'CHASE': {
          e.lastKnownPos.copy(p.position);
          toPlayer.normalize();
          e.position.add(toPlayer.multiplyScalar(5.5 * dt));
          e.mesh.rotation.y = Math.atan2(-toPlayer.x, -toPlayer.z);

          if (distToPlayer < 18) {
            e.state = 'ATTACK';
          } else if (distToPlayer > 45) {
            e.state = 'SEARCH';
            e.searchTimer = 4.0;
          }
          break;
        }

        case 'ATTACK': {
          e.mesh.rotation.y = Math.atan2(-toPlayer.x, -toPlayer.z);

          e.shootCooldown -= dt;
          if (e.shootCooldown <= 0) {
            e.shootCooldown = 1.4 + Math.random() * 0.4;
            enemyFireAtPlayer(e, g);
          }

          if (distToPlayer > 22) {
            e.state = 'CHASE';
          }
          break;
        }

        case 'SEARCH': {
          e.searchTimer -= dt;
          if (e.searchTimer <= 0) {
            e.state = 'PATROL';
          }
          break;
        }
      }

      e.position.y = getTerrainHeight(e.position.x, e.position.z);
      e.mesh.position.copy(e.position);
    }
  };

  const enemyFireAtPlayer = (e: EnemyEntity, g: any) => {
    gameSounds.playEnemyGunshot();

    if (e.muzzleFlashMesh) {
      e.muzzleFlashMesh.intensity = 4.0;
      setTimeout(() => {
        if (e.muzzleFlashMesh) e.muzzleFlashMesh.intensity = 0;
      }, 60);
    }

    const start = e.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    const end = g.player.position.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 1.5,
      1.2,
      (Math.random() - 0.5) * 1.5
    ));
    createBulletTracer(start, end, g);

    const dist = e.position.distanceTo(g.player.position);
    if (dist < 22 && Math.random() < 0.65) {
      damagePlayer(12, g);
    }
  };

  const damagePlayer = (dmg: number, g: any) => {
    const p = g.player;
    gameSounds.playPlayerHit();

    if (p.armor > 0) {
      p.armor = Math.max(0, p.armor - dmg);
      setPlayerArmor(p.armor);
    } else {
      p.hp = Math.max(0, p.hp - dmg);
      setPlayerHp(p.hp);
    }

    setDamageVignette(true);
    setTimeout(() => setDamageVignette(false), 240);

    if (p.hp <= 0 && g.state === 'PLAYING') {
      g.state = 'GAMEOVER';
      setGameState('GAMEOVER');
    }
  };

  // ==========================================
  // MISSION PROGRESSION & OBJECTIVES UPDATE
  // ==========================================
  const updateMissionProgress = (g: any) => {
    const p = g.player;
    const currentObj = g.objectives[g.currentObjIndex];
    if (!currentObj) return;

    const dist = Math.round(p.position.distanceTo(currentObj.targetPos));
    setObjectiveDist(dist);

    if (g.keycardMesh) g.keycardMesh.rotation.y += 0.03;
    if (g.intelMesh) g.intelMesh.rotation.y += 0.03;

    switch (currentObj.type) {
      case 'explore': {
        if (dist < 6) {
          completeCurrentObjective(g);
        }
        break;
      }

      case 'keycard': {
        if (dist < 3.5 && !p.hasKeycard) {
          setInteractPrompt('PRESS [E] OR TAP INTERACT TO COLLECT KEYCARD');
          if (g.keys.e) {
            p.hasKeycard = true;
            if (g.keycardMesh) g.scene.remove(g.keycardMesh);
            setInteractPrompt(null);
            completeCurrentObjective(g);
          }
        } else {
          setInteractPrompt(null);
        }
        break;
      }

      case 'enter': {
        if (dist < 8) {
          if (p.hasKeycard && !g.gateOpen) {
            g.gateOpen = true;
            if (g.gateMesh) {
              g.gateMesh.position.y += 5.5;
            }
            completeCurrentObjective(g);
          }
        }
        break;
      }

      case 'eliminate': {
        const deadCount = g.enemies.filter((e: any) => e.isDead).length;
        if (deadCount >= 3) {
          completeCurrentObjective(g);
        }
        break;
      }

      case 'intel': {
        if (dist < 4.0 && !p.hasIntel) {
          setInteractPrompt('PRESS [E] OR TAP INTERACT TO DOWNLOAD INTEL');
          if (g.keys.e) {
            p.hasIntel = true;
            if (g.intelMesh) g.scene.remove(g.intelMesh);
            setInteractPrompt(null);
            completeCurrentObjective(g);
          }
        } else {
          setInteractPrompt(null);
        }
        break;
      }

      case 'extract': {
        if (dist < 8) {
          g.state = 'VICTORY';
          setGameState('VICTORY');
          gameSounds.playObjectiveComplete();
        }
        break;
      }
    }
  };

  const completeCurrentObjective = (g: any) => {
    gameSounds.playObjectiveComplete();
    const current = g.objectives[g.currentObjIndex];
    if (current) current.completed = true;

    showNotification(`OBJECTIVE COMPLETED: ${current.title}`);

    if (g.currentObjIndex < g.objectives.length - 1) {
      g.currentObjIndex += 1;
      const next = g.objectives[g.currentObjIndex];
      setCurrentObjective(next.title);
    }
  };

  const showNotification = (msg: string) => {
    setMissionNotification(msg);
    setTimeout(() => setMissionNotification(null), 3000);
  };

  const updateParticles = (dt: number, g: any) => {
    for (let i = g.particles.length - 1; i >= 0; i--) {
      const pt = g.particles[i];
      pt.life -= dt;
      pt.mesh.position.add(pt.velocity.clone().multiplyScalar(dt));
      if (pt.fade) {
        (pt.mesh.material as THREE.MeshBasicMaterial).opacity = pt.life / pt.maxLife;
      }
      if (pt.life <= 0) {
        g.scene.remove(pt.mesh);
        g.particles.splice(i, 1);
      }
    }

    for (let i = g.bulletTracers.length - 1; i >= 0; i--) {
      const tr = g.bulletTracers[i];
      tr.life -= 1;
      if (tr.life <= 0) {
        g.scene.remove(tr.line);
        g.bulletTracers.splice(i, 1);
      }
    }
  };

  const updateCombatAndWeapons = (dt: number, g: any) => {
    setMissionTimeSec((s) => s + dt);
  };

  // ==========================================
  // GRAPHICS QUALITY PRESETS (LOW / MEDIUM / HIGH)
  // ==========================================
  const changeGraphicsQuality = (preset: 'LOW' | 'MEDIUM' | 'HIGH') => {
    setGraphicsQuality(preset);
    const g = gameRef.current;
    if (!g.renderer) return;

    if (preset === 'HIGH') {
      g.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      g.renderer.shadowMap.enabled = true;
      if (g.dirSun) {
        g.dirSun.castShadow = true;
        g.dirSun.shadow.mapSize.width = 2048;
        g.dirSun.shadow.mapSize.height = 2048;
      }
    } else if (preset === 'MEDIUM') {
      g.renderer.setPixelRatio(1.25);
      g.renderer.shadowMap.enabled = true;
      if (g.dirSun) {
        g.dirSun.castShadow = true;
        g.dirSun.shadow.mapSize.width = 1024;
        g.dirSun.shadow.mapSize.height = 1024;
      }
    } else {
      // LOW
      g.renderer.setPixelRatio(1.0);
      g.renderer.shadowMap.enabled = false;
      if (g.dirSun) {
        g.dirSun.castShadow = false;
      }
    }
  };

  // ==========================================
  // GAME STATE MANAGEMENT (START / PAUSE / RESTART)
  // ==========================================
  const startGame = () => {
    const g = gameRef.current;
    g.state = 'PLAYING';
    setGameState('PLAYING');
    showNotification('MISSION COMMENCED: INFILTRATE AND ESCAPE');
    if (mountRef.current) {
      mountRef.current.requestPointerLock?.();
    }
  };

  const togglePause = () => {
    const g = gameRef.current;
    if (g.state === 'PLAYING') {
      g.state = 'PAUSED';
      setGameState('PAUSED');
      document.exitPointerLock?.();
    } else if (g.state === 'PAUSED') {
      g.state = 'PLAYING';
      setGameState('PLAYING');
      mountRef.current?.requestPointerLock?.();
    }
  };

  const restartMission = () => {
    const g = gameRef.current;
    g.player.position.set(0, 2, 45);
    g.player.hp = 100;
    g.player.armor = 100;
    g.player.clip = 30;
    g.player.reserve = 120;
    g.player.hasKeycard = false;
    g.player.hasIntel = false;
    g.currentObjIndex = 0;
    g.gateOpen = false;

    setPlayerHp(100);
    setPlayerArmor(100);
    setAmmoClip(30);
    setAmmoReserve(120);
    setCurrentObjective(g.objectives[0].title);
    setEnemiesNeutralized(0);
    setScore(0);
    setMissionTimeSec(0);

    for (let e of g.enemies) {
      e.hp = 100;
      e.isDead = false;
      e.state = 'PATROL';
      e.mesh.rotation.x = 0;
      e.mesh.position.copy(e.patrolPoints[0]);
    }

    g.state = 'PLAYING';
    setGameState('PLAYING');
    mountRef.current?.requestPointerLock?.();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 3D WebGL Canvas Viewport */}
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
            cursor: gameState === 'PLAYING' ? 'crosshair' : 'default',
          }}
        />

        {/* Damage Red Vignette Screen Flash */}
        {damageVignette && <View style={styles.damageVignette} pointerEvents="none" />}

        {/* IN-GAME TACTICAL HUD */}
        {gameState === 'PLAYING' && (
          <View style={styles.hudOverlay} pointerEvents="box-none">
            {/* Top Bar: Health, Armor & Mission Objective */}
            <View style={styles.hudTopRow}>
              {/* Health & Armor Bars */}
              <View style={styles.statusGauges}>
                <View style={styles.gaugeBlock}>
                  <Text style={styles.gaugeLabel}>HP</Text>
                  <View style={styles.gaugeBarBg}>
                    <View
                      style={[
                        styles.gaugeBarFill,
                        {
                          width: `${playerHp}%`,
                          backgroundColor: playerHp > 40 ? '#00ff66' : '#ff0033',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.gaugeVal}>{playerHp}</Text>
                </View>

                <View style={styles.gaugeBlock}>
                  <Text style={[styles.gaugeLabel, { color: '#00f0ff' }]}>AP</Text>
                  <View style={styles.gaugeBarBg}>
                    <View style={[styles.gaugeBarFill, { width: `${playerArmor}%`, backgroundColor: '#00f0ff' }]} />
                  </View>
                  <Text style={[styles.gaugeVal, { color: '#00f0ff' }]}>{playerArmor}</Text>
                </View>
              </View>

              {/* Mission Objective Banner */}
              <View style={styles.objectiveBanner}>
                <Text style={styles.objectiveTag}>CURRENT OBJECTIVE</Text>
                <Text style={styles.objectiveText}>{currentObjective}</Text>
                <Text style={styles.objectiveDistance}>{objectiveDist} METERS</Text>
              </View>

              {/* Pause Button */}
              <View pointerEvents="auto">
                <TouchableOpacity
                  style={styles.pauseBtn}
                  onPress={togglePause}
                >
                  <Text style={styles.pauseBtnText}>⏸ PAUSE</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Dynamic Center Crosshair */}
            <View style={styles.crosshairWrap} pointerEvents="none">
              <View style={styles.crosshairDot} />
              <View style={[styles.crosshairLine, styles.chTop]} />
              <View style={[styles.crosshairLine, styles.chBottom]} />
              <View style={[styles.crosshairLine, styles.chLeft]} />
              <View style={[styles.crosshairLine, styles.chRight]} />
              {hitMarkerVisible && <Text style={styles.hitMarkerText}>✕</Text>}
            </View>

            {/* Context Interaction Prompt */}
            {interactPrompt && (
              <View style={styles.interactBox}>
                <Text style={styles.interactText}>{interactPrompt}</Text>
              </View>
            )}

            {/* Mission Notification Toast */}
            {missionNotification && (
              <View style={styles.notifBox}>
                <Text style={styles.notifText}>🔔 {missionNotification}</Text>
              </View>
            )}

            {/* ==================================================== */}
            {/* HIGH PRO MAX: ON-SCREEN TACTICAL COMBAT CONTROLS */}
            {/* ==================================================== */}
            <View style={styles.onScreenControlsRow} pointerEvents="box-none">
              {/* Left Side: Directional D-Pad Navigation */}
              <View style={styles.dpadContainer} pointerEvents="auto">
                <TouchableOpacity
                  style={styles.dpadBtn}
                  onPressIn={() => (gameRef.current.keys.w = true)}
                  onPressOut={() => (gameRef.current.keys.w = false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dpadText}>▲</Text>
                </TouchableOpacity>

                <View style={styles.dpadMiddleRow}>
                  <TouchableOpacity
                    style={styles.dpadBtn}
                    onPressIn={() => (gameRef.current.keys.a = true)}
                    onPressOut={() => (gameRef.current.keys.a = false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dpadText}>◀</Text>
                  </TouchableOpacity>

                  <View style={styles.dpadCenter}>
                    <Text style={styles.dpadCenterText}>MOVE</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.dpadBtn}
                    onPressIn={() => (gameRef.current.keys.d = true)}
                    onPressOut={() => (gameRef.current.keys.d = false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dpadText}>▶</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.dpadBtn}
                  onPressIn={() => (gameRef.current.keys.s = true)}
                  onPressOut={() => (gameRef.current.keys.s = false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dpadText}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Right Side: HIGH PRO MAX COMBAT ACTION BUTTONS & BIG FIRE BUTTON */}
              <View style={styles.actionButtonsCluster} pointerEvents="auto">
                {/* Secondary Tactical Actions Row: Jump, Sprint, Aim, Reload, Interact */}
                <View style={styles.secondaryActionsRow}>
                  <TouchableOpacity
                    style={[styles.tacticalSmallBtn, isSprinting && styles.tacticalBtnActive]}
                    onPress={() => {
                      const next = !gameRef.current.keys.shift;
                      gameRef.current.keys.shift = next;
                      setIsSprinting(next);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tacticalBtnIcon}>⚡</Text>
                    <Text style={styles.tacticalBtnLabel}>SPRINT</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tacticalSmallBtn}
                    onPress={() => {
                      if (gameRef.current.player.onGround) {
                        gameRef.current.player.velocity.y = 9.5;
                        gameRef.current.player.onGround = false;
                        gameSounds.playFootstep();
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tacticalBtnIcon}>🦘</Text>
                    <Text style={styles.tacticalBtnLabel}>JUMP</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tacticalSmallBtn, isAiming && styles.tacticalBtnActive]}
                    onPress={() => {
                      const next = !gameRef.current.mouseLook.isAiming;
                      gameRef.current.mouseLook.isAiming = next;
                      setIsAiming(next);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tacticalBtnIcon}>🎯</Text>
                    <Text style={styles.tacticalBtnLabel}>AIM</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tacticalSmallBtn}
                    onPress={() => reloadPlayerWeapon(gameRef.current)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tacticalBtnIcon}>🔄</Text>
                    <Text style={styles.tacticalBtnLabel}>RELOAD</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tacticalSmallBtn, { borderColor: '#ffd700' }]}
                    onPress={() => {
                      gameRef.current.keys.e = true;
                      setTimeout(() => (gameRef.current.keys.e = false), 250);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tacticalBtnIcon}>✋</Text>
                    <Text style={[styles.tacticalBtnLabel, { color: '#ffd700' }]}>ACTION</Text>
                  </TouchableOpacity>
                </View>

                {/* BIG GLOWING RED HIGH PRO MAX FIRE BUTTON */}
                <View style={styles.fireRow}>
                  {/* Weapon Telemetry info */}
                  <View style={styles.weaponTelemetry}>
                    <Text style={styles.weaponName}>MK-18 5.56mm</Text>
                    <View style={styles.ammoRow}>
                      <Text style={[styles.ammoClip, isReloading && { color: '#ffaa00' }]}>
                        {isReloading ? 'RELOAD' : ammoClip}
                      </Text>
                      <Text style={styles.ammoDivider}>/</Text>
                      <Text style={styles.ammoReserve}>{ammoReserve}</Text>
                    </View>
                  </View>

                  {/* MASSIVE PRO MAX FIRE BUTTON */}
                  <TouchableOpacity
                    style={styles.bigFireButton}
                    onPressIn={() => firePlayerWeapon(gameRef.current)}
                    onPress={() => firePlayerWeapon(gameRef.current)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.fireInnerGlow}>
                      <Text style={styles.fireIconText}>🔥</Text>
                      <Text style={styles.fireLabelText}>FIRE</Text>
                      <Text style={styles.fireSubText}>SHOOT</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* MAIN MENU CINEMATIC OVERLAY */}
        {gameState === 'MENU' && (
          <View style={styles.menuOverlay}>
            <View style={styles.menuCard}>
              <Text style={styles.menuBadge}>TACTICAL THIRD-PERSON ACTION</Text>
              <Text style={styles.menuTitle}>SHADOW STRIKE</Text>
              <Text style={styles.menuSubTitle}>OPEN WORLD • OPERATION ESCAPE THE FACILITY</Text>

              <View style={styles.menuBtnGroup}>
                <TouchableOpacity style={styles.primaryMenuBtn} onPress={startGame} activeOpacity={0.85}>
                  <Text style={styles.primaryMenuBtnText}>▶ START CAMPAIGN MISSION</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryMenuBtn}
                  onPress={() => {
                    const next = graphicsQuality === 'HIGH' ? 'MEDIUM' : graphicsQuality === 'MEDIUM' ? 'LOW' : 'HIGH';
                    changeGraphicsQuality(next);
                  }}
                >
                  <Text style={styles.secondaryMenuBtnText}>GRAPHICS QUALITY: {graphicsQuality} (PRO MAX)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryMenuBtn}
                  onPress={() => {
                    navigation?.navigate?.('Home');
                  }}
                >
                  <Text style={styles.secondaryMenuBtnText}>‹ RETURN TO ARCADE HUB</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.controlsGuide}>
                <Text style={styles.guideTitle}>HIGH PRO MAX CONTROLS:</Text>
                <Text style={styles.guideText}>• 🔥 RED FIRE BUTTON on screen / F Key / Left-Click to Shoot!</Text>
                <Text style={styles.guideText}>• 🎯 AIM Button / Right-Click for Over-The-Shoulder ADS Zoom</Text>
                <Text style={styles.guideText}>• 🔄 RELOAD Button / R Key to reload MK-18 magazine</Text>
                <Text style={styles.guideText}>• ▲◀▼▶ On-screen D-Pad or WASD to move operative</Text>
                <Text style={styles.guideText}>• ⚡ SPRINT & 🦘 JUMP Buttons or Shift & Spacebar</Text>
                <Text style={styles.guideText}>• ✋ ACTION Button or E Key to collect Keycard & Intel</Text>
              </View>
            </View>
          </View>
        )}

        {/* PAUSE MENU MODAL */}
        <Modal visible={gameState === 'PAUSED'} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>TACTICAL PAUSE</Text>
              <Text style={styles.modalSub}>Current Objective: {currentObjective}</Text>

              <TouchableOpacity style={styles.modalBtn} onPress={togglePause}>
                <Text style={styles.modalBtnText}>RESUME MISSION</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalBtn} onPress={restartMission}>
                <Text style={styles.modalBtnText}>RESTART MISSION</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  setGameState('MENU');
                  gameRef.current.state = 'MENU';
                }}
              >
                <Text style={styles.modalBtnText}>MAIN MENU</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* MISSION VICTORY OVERLAY */}
        <Modal visible={gameState === 'VICTORY'} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalBox, { borderColor: '#ffd700' }]}>
              <Text style={{ fontSize: 44, textAlign: 'center' }}>🚁</Text>
              <Text style={[styles.modalTitle, { color: '#ffd700' }]}>MISSION ACCOMPLISHED</Text>
              <Text style={styles.modalSub}>Facility evacuated with classified intel!</Text>

              <View style={styles.statsTable}>
                <Text style={styles.statLine}>Total Score: {score} PTS</Text>
                <Text style={styles.statLine}>Enemies Neutralized: {enemiesNeutralized} GUARDS</Text>
                <Text style={styles.statLine}>Mission Time: {Math.round(missionTimeSec)} SECONDS</Text>
              </View>

              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#ffd700' }]} onPress={restartMission}>
                <Text style={[styles.modalBtnText, { color: '#000' }]}>PLAY AGAIN ▶</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  navigation?.navigate?.('Home');
                }}
              >
                <Text style={styles.modalBtnText}>ARCADE HUB</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* GAME OVER (KIA) OVERLAY */}
        <Modal visible={gameState === 'GAMEOVER'} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalBox, { borderColor: '#ff0033' }]}>
              <Text style={{ fontSize: 44, textAlign: 'center' }}>💀</Text>
              <Text style={[styles.modalTitle, { color: '#ff0033' }]}>K.I.A. - OPERATIVE DOWN</Text>
              <Text style={styles.modalSub}>You were eliminated by syndicate forces.</Text>

              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#ff0033' }]} onPress={restartMission}>
                <Text style={styles.modalBtnText}>RESPAWN & RETRY ▶</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  navigation?.navigate?.('Home');
                }}
              >
                <Text style={styles.modalBtnText}>RETURN TO MENU</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050711',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  damageVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 0, 0, 0.38)',
    borderWidth: 16,
    borderColor: 'rgba(255, 0, 0, 0.85)',
    zIndex: 10,
  },
  hudOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 5,
  },
  hudTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statusGauges: {
    backgroundColor: 'rgba(5, 10, 20, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.45)',
    borderRadius: 10,
    padding: 10,
    minWidth: 180,
  },
  gaugeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  gaugeLabel: {
    color: '#00ff66',
    fontSize: 11,
    fontWeight: '900',
    width: 26,
  },
  gaugeBarBg: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  gaugeBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  gaugeVal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    width: 32,
    textAlign: 'right',
  },
  objectiveBanner: {
    backgroundColor: 'rgba(4, 8, 18, 0.92)',
    borderWidth: 1.5,
    borderColor: '#ffd700',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignItems: 'center',
    boxShadow: '0 0 16px rgba(255, 215, 0, 0.4)',
  },
  objectiveTag: {
    color: '#ffd700',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  objectiveText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  objectiveDistance: {
    color: '#00f0ff',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  pauseBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 1,
    borderColor: '#4a5568',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  pauseBtnText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 'bold',
  },
  crosshairWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 30,
    height: 30,
    marginLeft: -15,
    marginTop: -15,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  crosshairDot: {
    width: 4,
    height: 4,
    backgroundColor: '#00f0ff',
    borderRadius: 2,
  },
  crosshairLine: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 240, 255, 0.85)',
  },
  chTop: { width: 2, height: 8, top: 0 },
  chBottom: { width: 2, height: 8, bottom: 0 },
  chLeft: { width: 8, height: 2, left: 0 },
  chRight: { width: 8, height: 2, right: 0 },
  hitMarkerText: {
    color: '#ff0033',
    fontSize: 24,
    fontWeight: '900',
  },
  interactBox: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.3)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    boxShadow: '0 0 15px rgba(0, 240, 255, 0.5)',
  },
  interactText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  notifBox: {
    position: 'absolute',
    top: 85,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 20, 40, 0.95)',
    borderWidth: 1.5,
    borderColor: '#00ff66',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  notifText: {
    color: '#00ff66',
    fontSize: 12,
    fontWeight: '800',
  },

  /* ON-SCREEN TACTICAL COMBAT CONTROLS */
  onScreenControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    paddingBottom: 4,
  },

  /* D-PAD STYLING */
  dpadContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(6, 12, 24, 0.65)',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  dpadMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dpadBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dpadText: {
    color: '#00f0ff',
    fontSize: 16,
    fontWeight: '900',
  },
  dpadCenter: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dpadCenterText: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '900',
  },

  /* ACTION CLUSTER STYLING */
  actionButtonsCluster: {
    alignItems: 'flex-end',
    gap: 8,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  tacticalSmallBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    minWidth: 54,
  },
  tacticalBtnActive: {
    backgroundColor: '#00f0ff',
    borderColor: '#ffffff',
  },
  tacticalBtnIcon: {
    fontSize: 16,
  },
  tacticalBtnLabel: {
    color: '#00f0ff',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },

  /* BIG PRO MAX FIRE BUTTON */
  fireRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weaponTelemetry: {
    backgroundColor: 'rgba(4, 8, 18, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.35)',
    borderRadius: 10,
    padding: 8,
    alignItems: 'flex-end',
  },
  weaponName: {
    color: '#00f0ff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  ammoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  ammoClip: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  ammoDivider: {
    color: '#718096',
    fontSize: 15,
    marginHorizontal: 3,
  },
  ammoReserve: {
    color: '#a0aec0',
    fontSize: 13,
    fontWeight: '700',
  },

  bigFireButton: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#ff0033',
    borderWidth: 3,
    borderColor: '#ff6688',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 0 25px rgba(255, 0, 51, 0.75)',
  },
  fireInnerGlow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#cc0029',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fireIconText: {
    fontSize: 22,
  },
  fireLabelText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  fireSubText: {
    color: '#ffc2cc',
    fontSize: 8,
    fontWeight: '800',
  },

  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 7, 16, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 20,
  },
  menuCard: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: '#080d1c',
    borderWidth: 2,
    borderColor: '#00f0ff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    boxShadow: '0 0 45px rgba(0, 240, 255, 0.35)',
  },
  menuBadge: {
    color: '#00f0ff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  menuTitle: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  menuSubTitle: {
    color: '#a0aec0',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  menuBtnGroup: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  primaryMenuBtn: {
    backgroundColor: '#ff0033',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(255, 0, 51, 0.65)',
  },
  primaryMenuBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryMenuBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryMenuBtnText: {
    color: '#00f0ff',
    fontSize: 13,
    fontWeight: '800',
  },
  controlsGuide: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 10,
    padding: 12,
  },
  guideTitle: {
    color: '#ffd700',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  guideText: {
    color: '#cbd5e0',
    fontSize: 10.5,
    marginVertical: 1.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#080d1c',
    borderWidth: 2,
    borderColor: '#00f0ff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 8,
  },
  modalSub: {
    color: '#a0aec0',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 18,
    textAlign: 'center',
  },
  statsTable: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  statLine: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    marginVertical: 3,
  },
  modalBtn: {
    width: '100%',
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 5,
  },
  modalBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
