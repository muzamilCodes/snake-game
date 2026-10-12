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
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// SHADOW STRIKE: BATTLE ROYALE — AAA ARCHITECTURE & TYPES
// ============================================================================
export type GameFlowPhase =
  | 'MENU'
  | 'LOBBY'
  | 'AIRPLANE'
  | 'FREEFALL'
  | 'PARACHUTE'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAMEOVER';

export type WeaponType = 'CARBINE' | 'SMG' | 'SNIPER' | 'SHOTGUN' | 'PISTOL';

export interface WeaponDef {
  id: WeaponType;
  name: string;
  category: string;
  damage: number;
  clipSize: number;
  reserveMax: number;
  fireRate: number; // sec between shots
  range: number;
  spread: number;
  color: string;
  modelLength: number;
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
    modelLength: 0.95,
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
    modelLength: 0.72,
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
    modelLength: 1.3,
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
    modelLength: 0.88,
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
    modelLength: 0.45,
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

export interface ParticleFx {
  mesh: THREE.Object3D;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  fade: boolean;
}

export interface CampaignMissionLevel {
  level: number;
  title: string;
  archetype: string;
  description: string;
  targetKills: number;
  botCount: number;
  stormSpeed: number; // 1.0 = standard
  rewardXp: number;
  rewardSkin?: string;
}

// 10 Distinct Mission Archetypes scaled over 100 Levels
const generate100Levels = (): CampaignMissionLevel[] => {
  const archetypes = [
    { title: 'BOOTCAMP DROP', desc: 'Survive the initial deployment and eliminate rogue operatives.' },
    { title: 'URBAN WARFARE', desc: 'Hot-drop into the city centre and sweep out entrenched hostile squads.' },
    { title: 'OUTPOST INFILTRATION', desc: 'Assault the fortified military base and eliminate perimeter guards.' },
    { title: 'CONVOY SPEEDWAY', desc: 'Secure the highway fuel depot and commandeer tactical buggy vehicles.' },
    { title: 'SNIPER PEAKS', desc: 'Survive extreme long-range sniper crossfire on the mountain ridges.' },
    { title: 'TOXIC STORM SURGE', desc: 'Hyper-accelerated blue zone storm. Speed and positioning are critical.' },
    { title: 'WAREHOUSE RAID', desc: 'Close-quarters industrial zone sweep through shipping container mazes.' },
    { title: 'NIGHT SPECIAL OPS', desc: 'Low-light stealth engagement against heavily armed syndicate elites.' },
    { title: 'IRON SQUAD TAKEDOWN', desc: 'Heavily armored hostile combatants with military-grade body armor.' },
    { title: 'GRAND CHAMPIONSHIP', desc: 'The ultimate 20-combatant survival trial. Stand as the sole survivor.' },
  ];

  const skins = [
    { lvl: 1, name: 'Digital Woodland' },
    { lvl: 10, name: 'Desert Storm Spec-Ops' },
    { lvl: 25, name: 'Urban Shadow' },
    { lvl: 50, name: 'Arctic Ghost' },
    { lvl: 75, name: 'Cyber Vanguard' },
    { lvl: 100, name: 'Supreme Champion (Gold & Carbon)' },
  ];

  const levels: CampaignMissionLevel[] = [];
  for (let i = 1; i <= 100; i++) {
    const archIdx = (i - 1) % archetypes.length;
    const arch = archetypes[archIdx];
    const botCount = Math.min(20, 8 + Math.floor(i / 8));
    const targetKills = Math.min(10, 3 + Math.floor(i / 15));
    const stormSpeed = 1.0 + (i / 100) * 0.8;
    const rewardXp = 250 + i * 50;
    const skinUnlock = skins.find((s) => s.lvl === i)?.name;

    levels.push({
      level: i,
      title: `${arch.title} ${Math.ceil(i / 10)}`,
      archetype: arch.title,
      description: arch.desc,
      targetKills,
      botCount,
      stormSpeed,
      rewardXp,
      rewardSkin: skinUnlock,
    });
  }
  return levels;
};

export const CAMPAIGN_LEVELS = generate100Levels();

// ============================================================================
// PROCEDURAL WEB AUDIO SYNTHESIZER (PUBG BATTLE ROYALE AUDIO)
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

  // Gunshots tailored to weapon types
  playGunshot(type: WeaponType = 'CARBINE') {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'SNIPER') {
        // Heavy booming rifle crack
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);
        gain.gain.setValueAtTime(0.75 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      } else if (type === 'SHOTGUN') {
        // Deep explosive blast
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.28);
        gain.gain.setValueAtTime(0.8 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      } else if (type === 'SMG') {
        // Crisp, high-cadence snap
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
        gain.gain.setValueAtTime(0.4 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      } else if (type === 'PISTOL') {
        // Tight mechanical pop
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(310, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
        gain.gain.setValueAtTime(0.45 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      } else {
        // M4A1 Carbine punch
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

      // Noise snap burst
      const bufSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.45 * this.volume, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      noise.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
    } catch (_) {}
  }

  // Enemy Bot Gunshot (Distant echo)
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

  // C-130 Airplane Engine Low Drone
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
        this.airplaneSoundNode.gain.gain.exponentialRampToValueAtTime(
          0.001,
          this.getContext()?.currentTime || 0 + 0.3
        );
        this.airplaneSoundNode.osc.stop(this.airplaneSoundNode.osc.context.currentTime + 0.35);
      } catch (_) {}
      this.airplaneSoundNode = null;
    }
  }

  // Freefall high-speed wind whoosh
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

  // Parachute deploy canopy snap
  playParachuteDeploy() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      // Canopy snap
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

  // Drivable Buggy Engine Dynamic Rev
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

  // Hit Marker Confirm Chime
  playHitMarker() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.setValueAtTime(2400, now + 0.03);
      gain.gain.setValueAtTime(0.25 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (_) {}
  }

  // Safe Zone Storm Warning Siren
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

  // Loot Item Collected Tone
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

  // Reload Mechanical Racks
  playReload() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [0, 0.25, 0.55].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(700 + idx * 150, now + offset);
        gain.gain.setValueAtTime(0.2 * this.volume, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.07);
      });
    } catch (_) {}
  }

  // Victory Winner Fanfare
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

  // Elimination / Defeat Tone
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

  // Footstep
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
// PROCEDURAL TEXTURE GENERATION SUITE (PBR CANVAS TEXTURES)
// ============================================================================
const createPbrTerrainTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#263b20';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 5 + 1.5;
    const colors = ['#2d4427', '#1f301b', '#3a4e2e', '#483c2c', '#2c2419', '#1a2616'];
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(32, 32);
  return texture;
};

const createBuildingWindowTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#2d333b';
  ctx.fillRect(0, 0, 256, 256);

  const rows = 8;
  const cols = 6;
  const padX = 8;
  const padY = 8;
  const w = (256 - (cols + 1) * padX) / cols;
  const h = (256 - (rows + 1) * padY) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isLit = Math.random() > 0.45;
      ctx.fillStyle = isLit ? '#66a3cc' : '#14181d';
      ctx.fillRect(padX + c * (w + padX), padY + r * (h + padY), w, h);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 4);
  return texture;
};

const createRoadTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(0, 0, 256, 512);

  // White edge lines
  ctx.fillStyle = '#f0f4f8';
  ctx.fillRect(16, 0, 6, 512);
  ctx.fillRect(234, 0, 6, 512);

  // Dashed yellow center line
  ctx.fillStyle = '#ffaa00';
  for (let y = 10; y < 512; y += 70) {
    ctx.fillRect(124, y, 8, 40);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 16);
  return texture;
};

const createSkydomeTexture = (): THREE.CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#0a1426');
  grad.addColorStop(0.3, '#10223f');
  grad.addColorStop(0.65, '#22416b');
  grad.addColorStop(0.85, '#5c4838');
  grad.addColorStop(1.0, '#75543c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 350; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 260;
    const a = Math.random() * 0.9 + 0.1;
    ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  return new THREE.CanvasTexture(canvas);
};

// ============================================================================
// MAIN REACT COMPONENT: SHADOW STRIKE BATTLE ROYALE
// ============================================================================
export default function ShadowStrikeScreen({ navigation }: any) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const mountRef = useRef<any>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Flow State
  const [phase, setPhase] = useState<GameFlowPhase>('MENU');
  const [selectedOutfit, setSelectedOutfit] = useState<string>('Digital Woodland');
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [playerXp, setPlayerXp] = useState<number>(0);

  // Match Telemetry
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [playerArmor, setPlayerArmor] = useState<number>(100);
  const [aliveCount, setAliveCount] = useState<number>(20);
  const [killsCount, setKillsCount] = useState<number>(0);
  const [currentWeapon, setCurrentWeapon] = useState<WeaponDef>(WEAPON_REGISTRY.CARBINE);
  const [ammoClip, setAmmoClip] = useState<number>(30);
  const [ammoReserve, setAmmoReserve] = useState<number>(120);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [matchTimeSec, setMatchTimeSec] = useState<number>(0);
  const [altitudeMeters, setAltitudeMeters] = useState<number>(1200);
  const [descentSpeedKmh, setDescentSpeedKmh] = useState<number>(240);

  // Safe Zone (Storm) Telemetry
  const [safeZoneTime, setSafeZoneTime] = useState<number>(90);
  const [safeZonePhase, setSafeZonePhase] = useState<number>(1);
  const [isOutsideSafeZone, setIsOutsideSafeZone] = useState<boolean>(false);

  // In-Game Notifications & Interactivity
  const [interactPrompt, setInteractPrompt] = useState<string | null>(null);
  const [hitMarker, setHitMarker] = useState<boolean>(false);
  const [damageFlash, setDamageFlash] = useState<boolean>(false);
  const [killFeed, setKillFeed] = useState<string[]>([]);
  const [showFullMap, setShowFullMap] = useState<boolean>(false);
  const [graphicsPreset, setGraphicsPreset] = useState<'LOW' | 'MED' | 'HIGH'>('HIGH');

  // Driving vehicle telemetry
  const [isDriving, setIsDriving] = useState<boolean>(false);
  const [vehicleSpeedKmh, setVehicleSpeedKmh] = useState<number>(0);

  // Match End Stats
  const [endMatchStats, setEndMatchStats] = useState({
    won: false,
    placement: 1,
    kills: 0,
    timeSec: 0,
    damage: 0,
    xpEarned: 0,
  });

  // Mutable Game Loop State
  const gameRef = useRef({
    phase: 'MENU' as GameFlowPhase,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    dirSun: null as THREE.DirectionalLight | null,
    animFrameId: null as any,
    clock: new THREE.Clock(),
    elapsedTime: 0,

    // Controls
    keys: {
      w: false,
      a: false,
      s: false,
      d: false,
      shift: false,
      space: false,
      e: false,
      r: false,
      m: false,
      num1: false,
      num2: false,
      num3: false,
    },
    mouseLook: {
      yaw: 0,
      pitch: 0.15,
      isAiming: false,
      isPointerLocked: false,
    },

    // Player Entity
    player: {
      position: new THREE.Vector3(0, 120, -200),
      velocity: new THREE.Vector3(0, 0, 0),
      mesh: null as THREE.Group | null,
      torsoGroup: null as THREE.Group | null,
      legL: null as THREE.Group | null,
      legR: null as THREE.Group | null,
      armR: null as THREE.Group | null,
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

    // Airplane Insertion
    airplane: {
      mesh: null as THREE.Group | null,
      position: new THREE.Vector3(0, 120, -250),
      velocity: new THREE.Vector3(0, 0, 24), // flies towards +Z
      hasJumped: false,
    },

    // Vehicle
    vehicle: {
      mesh: null as THREE.Group | null,
      position: new THREE.Vector3(12, 0.4, 15),
      velocity: new THREE.Vector3(0, 0, 0),
      yaw: 0,
      speed: 0,
      steering: 0,
      wheels: [] as THREE.Mesh[],
      occupied: false,
    },

    // Safe Zone (The Storm)
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

    // Entities
    bots: [] as EnemyBot[],
    lootItems: [] as LootItem[],
    particles: [] as ParticleFx[],
    bulletTracers: [] as { line: THREE.Line; life: number }[],
    obstacles: [] as THREE.Box3[],
    killFeedList: [] as string[],
    damageDealt: 0,
  });

  // Load persistent level & XP on mount
  useEffect(() => {
    (async () => {
      try {
        const savedLvl = await AsyncStorage.getItem('SHADOW_STRIKE_LEVEL');
        const savedXp = await AsyncStorage.getItem('SHADOW_STRIKE_XP');
        if (savedLvl) setCurrentLevel(parseInt(savedLvl, 10));
        if (savedXp) setPlayerXp(parseInt(savedXp, 10));
      } catch (_) {}
    })();
  }, []);

  // ============================================================================
  // THREE.JS SCENE INITIALIZATION & BUILD
  // ============================================================================
  useEffect(() => {
    if (Platform.OS !== 'web' || !mountRef.current) return;

    const g = gameRef.current;
    const width = mountRef.current.clientWidth || winWidth;
    const height = mountRef.current.clientHeight || winHeight;

    // 1. Scene & Atmospheric Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b1528');
    scene.fog = new THREE.FogExp2('#112238', 0.0055);
    g.scene = scene;

    // Skydome
    const skyGeo = new THREE.SphereGeometry(450, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: createSkydomeTexture() || undefined,
      side: THREE.BackSide,
      fog: false,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 950);
    camera.position.set(0, 3, 40);
    g.camera = camera;

    // 3. WebGL Renderer
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

    // 4. Lighting Rig
    const ambientLight = new THREE.HemisphereLight('#8ebcff', '#36281e', 1.05);
    scene.add(ambientLight);

    const dirSun = new THREE.DirectionalLight('#fff2de', 2.5);
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

    // 5. Build Map, Island, City, Vehicles, Safe Zone, Player & Bots
    buildBattleRoyaleIsland(scene, g);
    buildCityAndStructures(scene, g);
    buildTacticalBuggy(scene, g);
    buildC130TransportAircraft(scene, g);
    buildSafeZoneHologram(scene, g);
    buildPlayerOperativeRig(scene, g);
    spawnBattleRoyaleLoot(scene, g);
    spawnHostileBots(scene, g, currentLevel);

    // 6. Setup Listeners
    setupInputEvents(renderer.domElement, g);

    // 7. Window Resize
    const onResize = () => {
      if (!mountRef.current || !g.camera || !g.renderer) return;
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;
      g.camera.aspect = w / h;
      g.camera.updateProjectionMatrix();
      g.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 8. Main Render & Game Loop
    let isRunning = true;
    const mainLoop = () => {
      if (!isRunning) return;
      const dt = Math.min(g.clock.getDelta(), 0.1);
      g.elapsedTime += dt;

      // Update according to active phase
      if (g.phase === 'MENU') {
        // Orbit showcase camera around central player
        const t = g.elapsedTime * 0.4;
        if (g.camera) {
          g.camera.position.set(Math.sin(t) * 12, 3.2, Math.cos(t) * 12);
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
        updateParticlesAndTracers(dt, g);
        renderMinimapRadar(g);
      }

      if (g.renderer && g.scene && g.camera) {
        g.renderer.render(g.scene, g.camera);
      }

      g.animFrameId = requestAnimationFrame(mainLoop);
    };

    g.animFrameId = requestAnimationFrame(mainLoop);

    return () => {
      isRunning = false;
      if (g.animFrameId) cancelAnimationFrame(g.animFrameId);
      window.removeEventListener('resize', onResize);
      brAudio.stopAirplaneDrone();
      brAudio.setVehicleEngine(false);
      renderer.dispose();
    };
  }, [winWidth, winHeight, currentLevel]);

  // ============================================================================
  // TERRAIN & ISLAND GENERATION (500m x 500m BATTLEGROUND)
  // ============================================================================
  const getTerrainHeight = (x: number, z: number): number => {
    // Ocean / water boundary outside island radius 210
    const dist = Math.sqrt(x * x + z * z);
    if (dist > 220) return -1.5;

    // Flat city center around (50, -60)
    const distToCity = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(z + 60, 2));
    if (distToCity < 45) return 0.2;

    // River channel cut along X = -10
    if (Math.abs(x + 10) < 6) return -0.8;

    // Rolling hills & ridges
    let h =
      Math.sin(x * 0.035) * Math.cos(z * 0.035) * 6.5 +
      Math.sin(x * 0.07 + 1.4) * Math.cos(z * 0.07) * 3.5;

    // Outer Mountain Ring
    if (dist > 140) {
      h += Math.pow((dist - 140) * 0.22, 1.7);
    }
    return Math.max(0, h);
  };

  const buildBattleRoyaleIsland = (scene: THREE.Scene, g: any) => {
    const size = 500;
    const segments = 120;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, getTerrainHeight(x, z));
    }
    geo.computeVertexNormals();

    const terrainTex = createPbrTerrainTexture();
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTex || undefined,
      roughness: 0.88,
      metalness: 0.05,
    });
    const terrain = new THREE.Mesh(geo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Surrounding Ocean Water Plane
    const waterGeo = new THREE.PlaneGeometry(600, 600);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0d2d4a',
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = -0.4;
    scene.add(water);

    // River Water Plane
    const riverGeo = new THREE.PlaneGeometry(12, 440);
    riverGeo.rotateX(-Math.PI / 2);
    const river = new THREE.Mesh(riverGeo, waterMat);
    river.position.set(-10, -0.1, 0);
    scene.add(river);

    // Concrete River Bridges (Crossing at Z = -80 and Z = +60)
    [-80, 60].forEach((bz) => {
      const bridgeGeo = new THREE.BoxGeometry(22, 1.2, 9);
      const bridgeMat = new THREE.MeshStandardMaterial({ color: '#444a52', roughness: 0.7 });
      const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
      bridge.position.set(-10, 0.6, bz);
      bridge.receiveShadow = true;
      scene.add(bridge);
    });

    // Asphalt Highways connecting zones
    buildHighways(scene);
    buildForestTrees(scene, g);
  };

  const buildHighways = (scene: THREE.Scene) => {
    const roadTex = createRoadTexture();
    const roadMat = new THREE.MeshStandardMaterial({ map: roadTex || undefined, roughness: 0.8 });

    // Highway 1: North-South artery (X = 20, Z = -180 to +180)
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.12, 360), roadMat);
    h1.position.set(20, 0.08, 0);
    h1.receiveShadow = true;
    scene.add(h1);

    // Highway 2: East-West crossover (Z = 0, X = -180 to +180)
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(360, 0.12, 9.5), roadMat);
    h2.position.set(0, 0.08, 0);
    h2.receiveShadow = true;
    scene.add(h2);
  };

  const buildForestTrees = (scene: THREE.Scene, g: any) => {
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#261b14', roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: '#183820', roughness: 0.8, flatShading: true });

    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 3.8, 6);
    const f1Geo = new THREE.ConeGeometry(3.2, 4.0, 6);
    const f2Geo = new THREE.ConeGeometry(2.4, 3.2, 6);

    for (let i = 0; i < 110; i++) {
      const tx = (Math.random() - 0.5) * 360;
      const tz = (Math.random() - 0.5) * 360;
      // Keep clear of city centre (50, -60) and highways
      if (Math.abs(tx - 20) > 12 && Math.abs(tz) > 12 && (Math.abs(tx - 50) > 45 || Math.abs(tz + 60) > 45)) {
        const ty = getTerrainHeight(tx, tz);
        if (ty >= 0) {
          const treeGroup = new THREE.Group();
          treeGroup.position.set(tx, ty, tz);

          const trunk = new THREE.Mesh(trunkGeo, trunkMat);
          trunk.position.y = 1.9;
          trunk.castShadow = true;
          treeGroup.add(trunk);

          const f1 = new THREE.Mesh(f1Geo, foliageMat);
          f1.position.y = 3.6;
          f1.castShadow = true;
          treeGroup.add(f1);

          const f2 = new THREE.Mesh(f2Geo, foliageMat);
          f2.position.y = 5.8;
          f2.castShadow = true;
          treeGroup.add(f2);

          scene.add(treeGroup);
          g.obstacles.push(
            new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(tx, ty + 2.5, tz), new THREE.Vector3(1.2, 5, 1.2))
          );
        }
      }
    }
  };

  // ============================================================================
  // CITY BUILDINGS, WAREHOUSES & MILITARY OUTPOST
  // ============================================================================
  const buildCityAndStructures = (scene: THREE.Scene, g: any) => {
    const windowTex = createBuildingWindowTexture();
    const buildingMat = new THREE.MeshStandardMaterial({
      map: windowTex || undefined,
      roughness: 0.65,
      metalness: 0.25,
    });
    const concreteMat = new THREE.MeshStandardMaterial({ color: '#4b5563', roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: '#374151', roughness: 0.4, metalness: 0.8 });

    // 1. NEO-KAVALA CITY DOWNTOWN (Cluster of multi-storey towers)
    const cityBuildings = [
      { x: 40, z: -50, w: 18, h: 42, d: 18, label: 'Apex Tower' },
      { x: 65, z: -50, w: 16, h: 32, d: 16, label: 'Centrum Office' },
      { x: 40, z: -75, w: 16, h: 26, d: 16, label: 'Plaza Suites' },
      { x: 65, z: -75, w: 20, h: 48, d: 20, label: 'Skylight Bank' },
      { x: 90, z: -60, w: 14, h: 22, d: 14, label: 'Urban Residence' },
    ];

    cityBuildings.forEach((b) => {
      const by = getTerrainHeight(b.x, b.z);
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), buildingMat);
      bMesh.position.set(b.x, by + b.h / 2, b.z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      scene.add(bMesh);

      // Rooftop helipad/equipment
      const roofEquip = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.4, 2.5, b.d * 0.4), metalMat);
      roofEquip.position.set(b.x, by + b.h + 1.25, b.z);
      scene.add(roofEquip);

      g.obstacles.push(new THREE.Box3().setFromObject(bMesh));
    });

    // 2. SECTOR 04 MILITARY OUTPOST (Fortified bunker + watchtowers)
    const outpostX = -90;
    const outpostZ = -70;
    const outpostY = getTerrainHeight(outpostX, outpostZ);

    const bunkerMesh = new THREE.Mesh(new THREE.BoxGeometry(32, 7.5, 22), concreteMat);
    bunkerMesh.position.set(outpostX, outpostY + 3.75, outpostZ);
    bunkerMesh.castShadow = true;
    bunkerMesh.receiveShadow = true;
    scene.add(bunkerMesh);
    g.obstacles.push(new THREE.Box3().setFromObject(bunkerMesh));

    // Watchtowers at outpost corners
    [-18, 18].forEach((ox) => {
      [-14, 14].forEach((oz) => {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 14, 8), metalMat);
        tower.position.set(outpostX + ox, outpostY + 7, outpostZ + oz);
        tower.castShadow = true;
        scene.add(tower);
      });
    });

    // 3. INDUSTRIAL WAREHOUSE DISTRICT (Warehouses + stacked shipping containers)
    const warehouseX = 75;
    const warehouseZ = 90;
    const whY = getTerrainHeight(warehouseX, warehouseZ);

    const whMesh = new THREE.Mesh(new THREE.BoxGeometry(34, 9, 20), metalMat);
    whMesh.position.set(warehouseX, whY + 4.5, warehouseZ);
    whMesh.castShadow = true;
    whMesh.receiveShadow = true;
    scene.add(whMesh);
    g.obstacles.push(new THREE.Box3().setFromObject(whMesh));

    // Shipping containers (blue, red, orange)
    const containerColors = ['#2563eb', '#dc2626', '#ea580c', '#16a34a'];
    for (let c = 0; c < 6; c++) {
      const cMat = new THREE.MeshStandardMaterial({
        color: containerColors[c % containerColors.length],
        roughness: 0.5,
        metalness: 0.6,
      });
      const cMesh = new THREE.Mesh(new THREE.BoxGeometry(10, 3.2, 3.6), cMat);
      cMesh.position.set(warehouseX - 15 + (c % 3) * 11, whY + 1.6 + Math.floor(c / 3) * 3.3, warehouseZ + 18);
      cMesh.castShadow = true;
      scene.add(cMesh);
      g.obstacles.push(new THREE.Box3().setFromObject(cMesh));
    }

    // 4. CENTRAL FUEL STATION & PARKING BAY (Where the vehicle is parked)
    const fuelX = 12;
    const fuelZ = 15;
    const fuelY = getTerrainHeight(fuelX, fuelZ);

    // Canopy
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.6, 14),
      new THREE.MeshStandardMaterial({ color: '#e5e7eb', roughness: 0.4 })
    );
    canopy.position.set(fuelX, fuelY + 5.5, fuelZ);
    canopy.castShadow = true;
    scene.add(canopy);

    // Support pillars
    [-6, 6].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5.5), metalMat);
      pillar.position.set(fuelX + px, fuelY + 2.75, fuelZ);
      scene.add(pillar);
    });
  };

  // ============================================================================
  // DRIVABLE TACTICAL BUGGY VEHICLE
  // ============================================================================
  const buildTacticalBuggy = (scene: THREE.Scene, g: any) => {
    const vGroup = new THREE.Group();
    vGroup.position.set(12, 0.5, 15);

    const bodyMat = new THREE.MeshStandardMaterial({ color: '#2b3724', roughness: 0.6, metalness: 0.3 });
    const cageMat = new THREE.MeshStandardMaterial({ color: '#1a1f26', roughness: 0.4, metalness: 0.8 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: '#111317', roughness: 0.9 });

    // Chassis body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 4.4), bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    vGroup.add(body);

    // Roll cage
    const cage = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.3, 2.5), cageMat);
    cage.position.set(0, 1.4, -0.2);
    vGroup.add(cage);

    // 4 Heavy all-terrain wheels
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.38, 12);
    wheelGeo.rotateZ(Math.PI / 2);

    const wheelOffsets = [
      { x: -1.3, z: 1.4 },
      { x: 1.3, z: 1.4 },
      { x: -1.3, z: -1.4 },
      { x: 1.3, z: -1.4 },
    ];

    const wheels: THREE.Mesh[] = [];
    wheelOffsets.forEach((pos) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(pos.x, 0.48, pos.z);
      w.castShadow = true;
      vGroup.add(w);
      wheels.push(w);
    });

    // Headlights
    const hLight = new THREE.SpotLight('#ffffcc', 3.0, 35, Math.PI * 0.25, 0.3);
    hLight.position.set(0, 0.7, 2.2);
    hLight.target.position.set(0, 0.2, 15);
    vGroup.add(hLight);
    vGroup.add(hLight.target);

    scene.add(vGroup);
    g.vehicle.mesh = vGroup;
    g.vehicle.wheels = wheels;
  };

  // ============================================================================
  // C-130 MILITARY AIRPLANE & PARACHUTE RIG
  // ============================================================================
  const buildC130TransportAircraft = (scene: THREE.Scene, g: any) => {
    const plane = new THREE.Group();
    plane.position.set(0, 120, -250);

    const metalMat = new THREE.MeshStandardMaterial({ color: '#374151', roughness: 0.4, metalness: 0.7 });
    const wingMat = new THREE.MeshStandardMaterial({ color: '#4b5563', roughness: 0.5, metalness: 0.6 });

    // Fuselage body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 38, 16), metalMat);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    plane.add(body);

    // Nose cone
    const nose = new THREE.Mesh(new THREE.ConeGeometry(3.2, 8, 16), metalMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = 23;
    plane.add(nose);

    // Massive Wingspan
    const wing = new THREE.Mesh(new THREE.BoxGeometry(52, 0.6, 7.5), wingMat);
    wing.position.set(0, 1.2, 4);
    wing.castShadow = true;
    plane.add(wing);

    // Tail Fin
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9, 7), wingMat);
    tail.position.set(0, 5.5, -17);
    plane.add(tail);

    scene.add(plane);
    g.airplane.mesh = plane;
  };

  // ============================================================================
  // THE SAFE ZONE: 3D TRANSLUCENT HOLOGRAPHIC STORM BARRIER
  // ============================================================================
  const buildSafeZoneHologram = (scene: THREE.Scene, g: any) => {
    // 1. Safe Zone Inner Safe Perimeter (White/Cyan border line)
    const innerRingGeo = new THREE.RingGeometry(218, 220, 64);
    innerRingGeo.rotateX(-Math.PI / 2);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: '#00f0ff',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.position.y = 0.3;
    scene.add(innerRing);
    g.safeZone.mesh = innerRing;

    // 2. Translucent Blue Storm Wall (Cylinder barrier)
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

  // ============================================================================
  // REALISTIC TACTICAL OPERATOR PLAYER RIG & PARACHUTE
  // ============================================================================
  const buildPlayerOperativeRig = (scene: THREE.Scene, g: any) => {
    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 120, -200);

    const camoMat = new THREE.MeshStandardMaterial({ color: '#2e3d2a', roughness: 0.8 });
    const vestMat = new THREE.MeshStandardMaterial({ color: '#1e242c', roughness: 0.6, metalness: 0.2 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#111418', roughness: 0.7 });
    const visorMat = new THREE.MeshStandardMaterial({ color: '#00f0ff', emissive: '#00e5ff', roughness: 0.2 });
    const gunMat = new THREE.MeshStandardMaterial({ color: '#0c0e12', roughness: 0.3, metalness: 0.9 });

    // Torso Group
    const torso = new THREE.Group();
    torso.position.y = 1.35;
    playerGroup.add(torso);
    g.player.torsoGroup = torso;

    // Combat Shirt & Plate Carrier Vest
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.52), camoMat);
    shirt.castShadow = true;
    torso.add(shirt);

    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.88, 0.58), vestMat);
    vest.position.y = 0.02;
    vest.castShadow = true;
    torso.add(vest);

    // Tactical Head & Ballistic Helmet
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.52, 0.5), darkMat);
    head.position.y = 0.8;
    head.castShadow = true;
    torso.add(head);

    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.34, 0.62), camoMat);
    helmet.position.set(0, 0.98, 0.02);
    torso.add(helmet);

    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.16), visorMat);
    goggles.position.set(0, 0.85, 0.26);
    torso.add(goggles);

    // Backpack & Stowed Parachute Pack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.8, 0.36), darkMat);
    pack.position.set(0, 0.05, -0.42);
    torso.add(pack);

    // Deployable Parachute Canopy (Attached above player)
    const chuteGroup = new THREE.Group();
    chuteGroup.position.set(0, 4.5, 0);

    const canopyGeo = new THREE.SphereGeometry(4.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: '#1e3a24',
      roughness: 0.7,
      side: THREE.DoubleSide,
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.rotation.x = Math.PI;
    chuteGroup.add(canopy);

    // Suspension cords
    const cordMat = new THREE.LineBasicMaterial({ color: '#a0aec0' });
    [-2.8, 2.8].forEach((cx) => {
      [-2.8, 2.8].forEach((cz) => {
        const cordGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, -3.2, 0),
          new THREE.Vector3(cx, 0, cz),
        ]);
        chuteGroup.add(new THREE.Line(cordGeo, cordMat));
      });
    });

    chuteGroup.visible = false;
    playerGroup.add(chuteGroup);
    g.player.parachuteGroup = chuteGroup;

    // Legs
    const legGeo = new THREE.BoxGeometry(0.32, 0.95, 0.32);
    const legLGroup = new THREE.Group();
    legLGroup.position.set(-0.24, 0.95, 0);
    const legL = new THREE.Mesh(legGeo, camoMat);
    legL.position.y = -0.45;
    legL.castShadow = true;
    legLGroup.add(legL);
    playerGroup.add(legLGroup);
    g.player.legL = legLGroup;

    const legRGroup = new THREE.Group();
    legRGroup.position.set(0.24, 0.95, 0);
    const legR = new THREE.Mesh(legGeo, camoMat);
    legR.position.y = -0.45;
    legR.castShadow = true;
    legRGroup.add(legR);
    playerGroup.add(legRGroup);
    g.player.legR = legRGroup;

    // Weapon Rig
    const gunGroup = new THREE.Group();
    gunGroup.position.set(0.42, 1.25, 0.4);

    const gunMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.95), gunMat);
    gunMesh.castShadow = true;
    gunGroup.add(gunMesh);

    const muzzleLight = new THREE.PointLight('#ffe066', 0, 10);
    muzzleLight.position.set(0, 0.05, 1.0);
    gunGroup.add(muzzleLight);

    playerGroup.add(gunGroup);
    g.player.gunGroup = gunGroup;

    scene.add(playerGroup);
    g.player.mesh = playerGroup;
  };

  // ============================================================================
  // HOSTILE BOTS & BATTLE ROYALE LOOT CRATES SPAWN
  // ============================================================================
  const spawnBattleRoyaleLoot = (scene: THREE.Scene, g: any) => {
    const lootSpawns = [
      { pos: new THREE.Vector3(45, 0, -45), type: 'WEAPON' as const, wType: 'SNIPER' as const, name: 'AWM COVERT .338' },
      { pos: new THREE.Vector3(68, 0, -68), type: 'WEAPON' as const, wType: 'SMG' as const, name: 'VECTOR SUB-9' },
      { pos: new THREE.Vector3(38, 0, -70), type: 'WEAPON' as const, wType: 'SHOTGUN' as const, name: 'SPAS-12 BREACHER' },
      { pos: new THREE.Vector3(-85, 0, -65), type: 'WEAPON' as const, wType: 'CARBINE' as const, name: 'M4A1 TACTICAL' },
      { pos: new THREE.Vector3(15, 0, 18), type: 'MEDKIT' as const, name: 'MILITARY MEDKIT (+75 HP)' },
      { pos: new THREE.Vector3(70, 0, 95), type: 'ARMOR' as const, name: 'LEVEL 3 PLATE ARMOR (+100 AP)' },
      { pos: new THREE.Vector3(-15, 0, -10), type: 'AMMO' as const, name: '5.56mm HIGH CAPACITY BOX (+60)' },
      { pos: new THREE.Vector3(50, 0, -30), type: 'MEDKIT' as const, name: 'FIRST AID KIT (+50 HP)' },
    ];

    const lootItems: LootItem[] = [];

    lootSpawns.forEach((item, idx) => {
      const y = getTerrainHeight(item.pos.x, item.pos.z) + 0.35;
      const group = new THREE.Group();
      group.position.set(item.pos.x, y, item.pos.z);

      let color = '#00f0ff';
      if (item.type === 'WEAPON') {
        color = WEAPON_REGISTRY[item.wType || 'CARBINE'].color;
      } else if (item.type === 'MEDKIT') color = '#00ff66';
      else if (item.type === 'ARMOR') color = '#3b82f6';
      else if (item.type === 'AMMO') color = '#ffd700';

      const boxGeo = new THREE.BoxGeometry(0.8, 0.45, 0.8);
      const boxMat = new THREE.MeshStandardMaterial({ color, emissive: color, roughness: 0.3 });
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.castShadow = true;
      group.add(box);

      // Floating beacon light
      const pLight = new THREE.PointLight(color, 1.8, 6);
      pLight.position.y = 0.5;
      group.add(pLight);

      scene.add(group);

      lootItems.push({
        id: idx + 1,
        type: item.type,
        weaponType: item.wType,
        name: item.name,
        mesh: group,
        position: group.position,
        pickedUp: false,
        value: item.type === 'MEDKIT' ? 75 : 100,
      });
    });

    g.lootItems = lootItems;
  };

  const spawnHostileBots = (scene: THREE.Scene, g: any, level: number) => {
    const botCount = Math.min(20, 8 + Math.floor(level / 8));
    const enemyMat = new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.6 });
    const redBeretMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 });
    const gunMat = new THREE.MeshStandardMaterial({ color: '#1a1f26', roughness: 0.3, metalness: 0.8 });

    const bots: EnemyBot[] = [];
    const botNames = [
      'Striker-01',
      'Viper-02',
      'Cobra-03',
      'Reaper-04',
      'Ghost-05',
      'Titan-06',
      'Falcon-07',
      'Raven-08',
      'Apex-09',
      'Nemesis-10',
      'Shadow-11',
      'Blaze-12',
      'Warlord-13',
      'Rogue-14',
      'Specter-15',
      'Hunter-16',
      'Vandal-17',
      'Kestrel-18',
      'Havoc-19',
      'Sentry-20',
    ];

    for (let i = 0; i < botCount; i++) {
      const angle = (i / botCount) * Math.PI * 2;
      const dist = 55 + (i % 4) * 35;
      const bx = Math.cos(angle) * dist + 20;
      const bz = Math.sin(angle) * dist - 30;
      const by = getTerrainHeight(bx, bz);

      const bGroup = new THREE.Group();
      bGroup.position.set(bx, by, bz);

      // Torso with Crimson Enemy Tactical Armor
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.1, 0.55), enemyMat);
      torso.position.y = 1.35;
      torso.castShadow = true;
      bGroup.add(torso);

      // Head & Red Beret
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), enemyMat);
      head.position.y = 2.1;
      head.castShadow = true;
      bGroup.add(head);

      const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.22, 8), redBeretMat);
      beret.position.set(0.08, 2.4, 0);
      bGroup.add(beret);

      // Rifle
      const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.85), gunMat);
      rifle.position.set(0.4, 1.25, 0.35);
      bGroup.add(rifle);

      const mLight = new THREE.PointLight('#ff3300', 0, 7);
      mLight.position.set(0.4, 1.25, 0.8);
      bGroup.add(mLight);

      // Floating Enemy HP Indicator Bar above head
      const hpGeo = new THREE.PlaneGeometry(1.2, 0.16);
      const hpMat = new THREE.MeshBasicMaterial({ color: '#ff0033', side: THREE.DoubleSide });
      const hpBar = new THREE.Mesh(hpGeo, hpMat);
      hpBar.position.set(0, 2.7, 0);
      bGroup.add(hpBar);

      scene.add(bGroup);

      bots.push({
        id: i + 1,
        name: botNames[i % botNames.length],
        mesh: bGroup,
        position: bGroup.position,
        velocity: new THREE.Vector3(),
        hp: 100,
        maxHp: 100,
        weapon: (['CARBINE', 'SMG', 'SHOTGUN'] as WeaponType[])[i % 3],
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

    // Camera rides alongside transport aircraft
    if (g.camera) {
      g.camera.position.set(p.position.x - 22, p.position.y + 12, p.position.z - 28);
      g.camera.lookAt(p.position);
    }

    // Telemetry
    setAltitudeMeters(Math.round(p.position.y * 10));
    setDescentSpeedKmh(240);

    // Auto jump if reaching edge of island
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

    // Place player at jump exit
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

    // Drastically slow descent speed to gentle glide
    g.player.velocity.y = -8.5;
    g.phase = 'PARACHUTE';
    setPhase('PARACHUTE');
  };

  const updateAirborneDescent = (dt: number, g: any) => {
    const p = g.player;
    if (!p.mesh) return;

    // Steer in mid-air using keys
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

    // Terminal velocity & descent drag
    if (g.phase === 'FREEFALL') {
      p.velocity.y = Math.max(-48, p.velocity.y - 18 * dt);
    } else {
      p.velocity.y = -7.5; // parachute glide
    }

    p.position.add(p.velocity.clone().multiplyScalar(dt));
    p.mesh.position.copy(p.position);
    p.mesh.rotation.y = g.mouseLook.yaw;

    // Telemetry
    const groundH = getTerrainHeight(p.position.x, p.position.z);
    const alt = Math.max(0, Math.round((p.position.y - groundH) * 10));
    setAltitudeMeters(alt);
    setDescentSpeedKmh(Math.round(Math.abs(p.velocity.y) * 4.2));

    // Follow Camera
    if (g.camera) {
      const camOffset = g.phase === 'PARACHUTE' ? 11 : 6;
      g.camera.position.set(
        p.position.x + Math.sin(g.mouseLook.yaw) * camOffset,
        p.position.y + 4.5,
        p.position.z + Math.cos(g.mouseLook.yaw) * camOffset
      );
      g.camera.lookAt(p.position);
    }

    // Touchdown on Ground
    if (p.position.y <= groundH + 0.5) {
      p.position.y = groundH;
      p.velocity.set(0, 0, 0);
      p.onGround = true;
      p.parachuteOpen = false;
      if (p.parachuteGroup) p.parachuteGroup.visible = false;

      brAudio.playFootstep();
      g.phase = 'PLAYING';
      setPhase('PLAYING');
      pushKillFeed('SYSTEM: Airborne insertion complete. Locate weapons and survive!');
    }
  };

  // ============================================================================
  // GROUND GAMEPLAY: MOVEMENT, WEAPONS, RECOIL & LOOTING
  // ============================================================================
  const updateGroundGameplay = (dt: number, g: any) => {
    const p = g.player;
    if (!p.mesh || p.inVehicle) return;

    // Directional movement
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

    // Jump
    if (g.keys.space && p.onGround) {
      p.velocity.y = 9.8;
      p.onGround = false;
      brAudio.playFootstep();
    }

    // Gravity
    p.velocity.y -= 24 * dt;

    const nextPos = p.position.clone().add(p.velocity.clone().multiplyScalar(dt));
    const groundY = getTerrainHeight(nextPos.x, nextPos.z);

    if (nextPos.y <= groundY) {
      nextPos.y = groundY;
      p.velocity.y = 0;
      p.onGround = true;
    }

    // Obstacle collisions
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(nextPos.x, nextPos.y + 1.2, nextPos.z),
      new THREE.Vector3(1.1, 2.4, 1.1)
    );

    let collided = false;
    for (let box of g.obstacles) {
      if (box.intersectsBox(playerBox)) {
        collided = true;
        break;
      }
    }

    if (!collided) p.position.copy(nextPos);
    else p.position.y = nextPos.y;

    p.mesh.position.copy(p.position);
    p.mesh.rotation.y = g.mouseLook.yaw;

    // Locomotion kinematics (Legs stride)
    if (isMoving && p.onGround) {
      p.walkCycle += dt * (g.keys.shift ? 16 : 10);
      const stride = Math.sin(p.walkCycle) * (g.keys.shift ? 0.72 : 0.5);
      if (p.legL) p.legL.rotation.x = stride;
      if (p.legR) p.legR.rotation.x = -stride;
    } else {
      if (p.legL) p.legL.rotation.x *= 0.8;
      if (p.legR) p.legR.rotation.x *= 0.8;
    }

    // Camera follow (Over-the-shoulder)
    if (g.camera) {
      const camDist = g.mouseLook.isAiming ? 2.0 : 3.8;
      const camHeight = g.mouseLook.isAiming ? 1.6 : 2.2;
      const shoulderX = g.mouseLook.isAiming ? 0.65 : 0.85;

      const camX = p.position.x + Math.sin(g.mouseLook.yaw) * camDist + Math.cos(g.mouseLook.yaw) * shoulderX;
      const camZ = p.position.z + Math.cos(g.mouseLook.yaw) * camDist - Math.sin(g.mouseLook.yaw) * shoulderX;
      let camY = p.position.y + camHeight + Math.sin(g.mouseLook.pitch) * 2.5;

      // Camera terrain collision clamp
      const camGroundH = getTerrainHeight(camX, camZ);
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

    // Proximity loot & vehicle checks
    checkProximityInteractions(g);
  };

  const checkProximityInteractions = (g: any) => {
    const p = g.player;

    // 1. Vehicle Proximity
    const distToVehicle = p.position.distanceTo(g.vehicle.position);
    if (distToVehicle < 3.8 && !p.inVehicle) {
      setInteractPrompt('[E] ENTER TACTICAL BUGGY');
      if (g.keys.e) {
        enterVehicle(g);
        g.keys.e = false;
      }
      return;
    }

    // 2. Loot Items Proximity
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
        pickupLootItem(nearLoot, g);
        g.keys.e = false;
      }
    } else {
      setInteractPrompt(null);
    }
  };

  const pickupLootItem = (item: LootItem, g: any) => {
    item.pickedUp = true;
    item.mesh.visible = false;
    brAudio.playLootPickup();

    if (item.type === 'WEAPON' && item.weaponType) {
      const newW = WEAPON_REGISTRY[item.weaponType];
      g.player.currentWeapon = newW;
      g.player.clip = newW.clipSize;
      g.player.reserve = newW.reserveMax;
      setCurrentWeapon(newW);
      setAmmoClip(newW.clipSize);
      setAmmoReserve(newW.reserveMax);
      pushKillFeed(`EQUIPPED: ${newW.name} (${newW.category})`);
    } else if (item.type === 'MEDKIT') {
      g.player.hp = Math.min(100, g.player.hp + item.value);
      setPlayerHp(g.player.hp);
      pushKillFeed(`HEALED: +${item.value} HP`);
    } else if (item.type === 'ARMOR') {
      g.player.armor = 100;
      setPlayerArmor(100);
      pushKillFeed('EQUIPPED: Level 3 Body Armor');
    } else if (item.type === 'AMMO') {
      g.player.reserve += 60;
      setAmmoReserve(g.player.reserve);
      pushKillFeed('AMMO: +60 Rounds Loaded');
    }
  };

  // Fire Weapon Raycast
  const fireActiveWeapon = () => {
    const g = gameRef.current;
    const p = g.player;
    if (g.phase !== 'PLAYING' || p.reloading || p.clip <= 0) {
      if (p.clip <= 0) reloadActiveWeapon();
      return;
    }

    const now = g.elapsedTime;
    if (now - p.lastShotTime < p.currentWeapon.fireRate) return;
    p.lastShotTime = now;

    p.clip -= 1;
    setAmmoClip(p.clip);
    brAudio.playGunshot(p.currentWeapon.id);

    // Muzzle light flash
    if (p.gunGroup) {
      const mLight = p.gunGroup.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight;
      if (mLight) {
        mLight.intensity = 5.0;
        setTimeout(() => (mLight.intensity = 0), 40);
      }
      // Physical Recoil Kick
      p.gunGroup.position.z -= 0.08;
      setTimeout(() => {
        if (p.gunGroup) p.gunGroup.position.z = 0.4;
      }, 70);
    }

    g.mouseLook.pitch += 0.02;

    // Raycast Bullet
    if (!g.camera || !g.scene) return;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), g.camera);

    const hits = raycaster.intersectObjects(g.scene.children, true);
    let hitPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(p.currentWeapon.range));

    if (hits.length > 0) {
      for (let hit of hits) {
        if (hit.object !== p.mesh && !isChildOfObject(hit.object, p.mesh)) {
          hitPoint = hit.point;

          // Check if struck an enemy bot
          const struckBot = findBotFromMesh(hit.object, g.bots);
          if (struckBot && !struckBot.isDead) {
            damageHostileBot(struckBot, p.currentWeapon.damage, g);
            setHitMarker(true);
            setTimeout(() => setHitMarker(false), 90);
            brAudio.playHitMarker();
          }
          break;
        }
      }
    }

    // Tracer line
    createBulletTracer(p.position.clone().add(new THREE.Vector3(0, 1.3, 0)), hitPoint, g);
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

  const damageHostileBot = (bot: EnemyBot, dmg: number, g: any) => {
    bot.hp = Math.max(0, bot.hp - dmg);
    g.damageDealt += dmg;

    // Update floating HP bar scale
    bot.hpBarMesh.scale.x = Math.max(0.01, bot.hp / bot.maxHp);

    if (bot.hp <= 0 && !bot.isDead) {
      bot.isDead = true;
      bot.state = 'DEAD';
      bot.mesh.rotation.x = Math.PI / 2;
      bot.mesh.position.y = 0.2;
      setKillsCount((k) => k + 1);

      pushKillFeed(`OPERATOR eliminated ${bot.name} with ${g.player.currentWeapon.name}`);

      // Count remaining alive
      const remaining = g.bots.filter((b: any) => !b.isDead).length + 1;
      setAliveCount(remaining);

      // Check Victory Condition
      if (remaining === 1 && g.player.hp > 0) {
        triggerMatchVictory(g);
      }
    }
  };

  const createBulletTracer = (start: THREE.Vector3, end: THREE.Vector3, g: any) => {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: '#ffea00', linewidth: 2 });
    const line = new THREE.Line(geo, mat);
    g.scene.add(line);
    g.bulletTracers.push({ line, life: 3 });
  };

  const reloadActiveWeapon = () => {
    const g = gameRef.current;
    const p = g.player;
    if (p.reloading || p.clip >= p.currentWeapon.clipSize || p.reserve <= 0) return;

    p.reloading = true;
    setIsReloading(true);
    brAudio.playReload();

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
  // VEHICLE DRIVING SYSTEM
  // ============================================================================
  const enterVehicle = (g: any) => {
    g.player.inVehicle = true;
    g.vehicle.occupied = true;
    setIsDriving(true);
    brAudio.setVehicleEngine(true, 0);
    pushKillFeed('ENTERED: Tactical All-Terrain Buggy');
  };

  const exitVehicle = () => {
    const g = gameRef.current;
    if (!g.player.inVehicle) return;

    g.player.inVehicle = false;
    g.vehicle.occupied = false;
    g.player.position.set(g.vehicle.position.x + 2.5, getTerrainHeight(g.vehicle.position.x + 2.5, g.vehicle.position.z), g.vehicle.position.z);
    setIsDriving(false);
    setVehicleSpeedKmh(0);
    brAudio.setVehicleEngine(false);
    pushKillFeed('EXITED: Tactical All-Terrain Buggy');
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

    // Acceleration & Speed
    v.speed += throttle * 28 * dt;
    v.speed *= 0.94; // friction
    v.yaw += steer * (v.speed * 0.08) * dt;

    const fwd = new THREE.Vector3(-Math.sin(v.yaw), 0, -Math.cos(v.yaw));
    v.position.add(fwd.multiplyScalar(v.speed * dt));

    const groundY = getTerrainHeight(v.position.x, v.position.z);
    v.position.y = groundY + 0.4;

    v.mesh.position.copy(v.position);
    v.mesh.rotation.y = v.yaw;

    // Attach player into driver seat
    g.player.position.copy(v.position);

    // Speedometer telemetry
    const speedKmh = Math.round(Math.abs(v.speed) * 3.6);
    setVehicleSpeedKmh(speedKmh);
    brAudio.setVehicleEngine(true, Math.min(1.0, speedKmh / 75));

    // Vehicle Camera
    if (g.camera) {
      g.camera.position.set(
        v.position.x + Math.sin(v.yaw) * 8.5,
        v.position.y + 4.2,
        v.position.z + Math.cos(v.yaw) * 8.5
      );
      g.camera.lookAt(v.position);
    }

    // Roadkill bot impacts
    if (Math.abs(v.speed) > 5) {
      for (let b of g.bots) {
        if (!b.isDead && b.position.distanceTo(v.position) < 3.2) {
          damageHostileBot(b, 100, g);
          pushKillFeed(`ROADKILL: Operative ran over ${b.name}!`);
        }
      }
    }
  };

  // ============================================================================
  // SHRINKING SAFE ZONE (THE STORM) LOOP
  // ============================================================================
  const updateSafeZoneStorm = (dt: number, g: any) => {
    const sz = g.safeZone;
    sz.shrinkTimer -= dt;
    setSafeZoneTime(Math.max(0, Math.round(sz.shrinkTimer)));

    // Shrink radius gradually
    if (sz.radius > sz.targetRadius) {
      sz.radius -= dt * 2.2 * (CAMPAIGN_LEVELS[currentLevel - 1]?.stormSpeed || 1);
      sz.center.lerp(sz.targetCenter, 0.005);
    }

    // Next storm stage
    if (sz.shrinkTimer <= 0) {
      sz.currentStage += 1;
      setSafeZonePhase(sz.currentStage);
      sz.shrinkTimer = 60;
      sz.targetRadius = Math.max(20, sz.targetRadius * 0.55);
      sz.targetCenter.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60);

      brAudio.playStormWarning();
      pushKillFeed(`WARNING: Safe zone contracting to Phase ${sz.currentStage}!`);
    }

    // Update 3D meshes
    if (sz.mesh) {
      sz.mesh.position.set(sz.center.x, 0.3, sz.center.y);
      sz.mesh.scale.set(sz.radius / 220, sz.radius / 220, 1);
    }
    if (sz.stormRingMesh) {
      sz.stormRingMesh.position.set(sz.center.x, 45, sz.center.y);
      sz.stormRingMesh.scale.set(sz.radius / 220, 1, sz.radius / 220);
    }

    // Check if player is outside safe zone
    const distToCenter = new THREE.Vector2(g.player.position.x, g.player.position.z).distanceTo(sz.center);
    const outside = distToCenter > sz.radius;
    setIsOutsideSafeZone(outside);

    if (outside) {
      // Take damage over time
      g.player.hp -= 4.5 * dt;
      setPlayerHp(Math.max(0, Math.round(g.player.hp)));
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 80);

      if (g.player.hp <= 0) {
        triggerMatchDefeat(g, 'Fell to the Storm Barrier');
      }
    }
  };

  // ============================================================================
  // HOSTILE BOT AI BEHAVIOUR
  // ============================================================================
  const updateHostileBotAI = (dt: number, g: any) => {
    const p = g.player;

    g.bots.forEach((b: EnemyBot) => {
      if (b.isDead) return;

      const distToPlayer = b.position.distanceTo(p.position);

      // AI State Machine
      if (distToPlayer < 45 && !p.inVehicle) {
        b.state = 'ATTACK';
        b.mesh.lookAt(p.position.x, b.position.y, p.position.z);

        b.shootCooldown -= dt;
        if (b.shootCooldown <= 0) {
          b.shootCooldown = 1.2 + Math.random() * 0.8;
          brAudio.playEnemyGunshot();

          // Flash bot muzzle
          b.muzzleLight.intensity = 4.0;
          setTimeout(() => (b.muzzleLight.intensity = 0), 45);

          // Bot shoot player
          if (distToPlayer < 35 && Math.random() < 0.65) {
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
              triggerMatchDefeat(g, `Eliminated by ${b.name}`);
            }
          }
        }
      } else {
        // Patrol
        b.state = 'PATROL';
        const toTarget = b.patrolTarget.clone().sub(b.position);
        if (toTarget.length() < 2.0) {
          b.patrolTarget.set(b.position.x + (Math.random() - 0.5) * 50, 0, b.position.z + (Math.random() - 0.5) * 50);
        } else {
          toTarget.normalize();
          b.position.add(toTarget.multiplyScalar(3.2 * dt));
          b.position.y = getTerrainHeight(b.position.x, b.position.z);
          b.mesh.position.copy(b.position);
          b.mesh.rotation.y = Math.atan2(-toTarget.x, -toTarget.z);
        }
      }
    });
  };

  const updateParticlesAndTracers = (dt: number, g: any) => {
    // Bullet tracers life decay
    for (let i = g.bulletTracers.length - 1; i >= 0; i--) {
      const tr = g.bulletTracers[i];
      tr.life -= 1;
      if (tr.life <= 0) {
        g.scene.remove(tr.line);
        g.bulletTracers.splice(i, 1);
      }
    }
  };

  // ============================================================================
  // MINIMAP 2D CANVAS RADAR
  // ============================================================================
  const renderMinimapRadar = (g: any) => {
    if (!minimapCanvasRef.current) return;
    const cvs = minimapCanvasRef.current;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 160, 160);

    // Map background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 160, 160);

    const mapScale = 160 / 500; // 500m world to 160px canvas
    const cx = 80;
    const cy = 80;

    // Draw Safe Zone Circle
    const szCenterScreenX = cx + g.safeZone.center.x * mapScale;
    const szCenterScreenY = cy + g.safeZone.center.y * mapScale;
    const szRadiusScreen = g.safeZone.radius * mapScale;

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(szCenterScreenX, szCenterScreenY, szRadiusScreen, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Hostile Bot Pings
    ctx.fillStyle = '#ef4444';
    g.bots.forEach((b: EnemyBot) => {
      if (!b.isDead) {
        const bx = cx + b.position.x * mapScale;
        const by = cy + b.position.z * mapScale;
        ctx.fillRect(bx - 2, by - 2, 4, 4);
      }
    });

    // Draw Player Arrow
    const px = cx + g.player.position.x * mapScale;
    const py = cy + g.player.position.z * mapScale;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(g.mouseLook.yaw);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // ============================================================================
  // MATCH LIFECYCLE: VICTORY & DEFEAT TRIGGER
  // ============================================================================
  const triggerMatchVictory = async (g: any) => {
    g.phase = 'VICTORY';
    setPhase('VICTORY');
    brAudio.playVictoryFanfare();

    const xpEarned = CAMPAIGN_LEVELS[currentLevel - 1]?.rewardXp || 500;
    const nextLvl = Math.min(100, currentLevel + 1);

    setEndMatchStats({
      won: true,
      placement: 1,
      kills: killsCount,
      timeSec: Math.round(g.elapsedTime),
      damage: g.damageDealt,
      xpEarned,
    });

    try {
      await AsyncStorage.setItem('SHADOW_STRIKE_LEVEL', nextLvl.toString());
      await AsyncStorage.setItem('SHADOW_STRIKE_XP', (playerXp + xpEarned).toString());
      setCurrentLevel(nextLvl);
      setPlayerXp((x) => x + xpEarned);
    } catch (_) {}
  };

  const triggerMatchDefeat = (g: any, reason: string) => {
    g.phase = 'GAMEOVER';
    setPhase('GAMEOVER');
    brAudio.playDefeatChord();

    const remaining = g.bots.filter((b: any) => !b.isDead).length + 1;

    setEndMatchStats({
      won: false,
      placement: remaining,
      kills: killsCount,
      timeSec: Math.round(g.elapsedTime),
      damage: g.damageDealt,
      xpEarned: 100,
    });

    pushKillFeed(`ELIMINATED: ${reason}`);
  };

  const pushKillFeed = (msg: string) => {
    setKillFeed((prev) => [msg, ...prev.slice(0, 4)]);
  };

  // ============================================================================
  // USER CONTROLS & EVENT LISTENERS
  // ============================================================================
  const setupInputEvents = (canvas: HTMLCanvasElement, g: any) => {
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
        if (g.phase === 'AIRPLANE') jumpFromAircraft();
      }
      if (k === 'e') g.keys.e = true;
      if (k === 'r') reloadActiveWeapon();
      if (k === 'm') setShowFullMap((m) => !m);
      if (k === '1') switchWeapon(WEAPON_REGISTRY.CARBINE);
      if (k === '2') switchWeapon(WEAPON_REGISTRY.SMG);
      if (k === '3') switchWeapon(WEAPON_REGISTRY.SNIPER);
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
      if (g.phase === 'PLAYING') {
        if (!document.pointerLockElement) {
          canvas.requestPointerLock?.();
        }
        if (e.button === 0) fireActiveWeapon();
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

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('contextmenu', onContextMenu);
  };

  const switchWeapon = (w: WeaponDef) => {
    const g = gameRef.current;
    g.player.currentWeapon = w;
    g.player.clip = w.clipSize;
    g.player.reserve = w.reserveMax;
    setCurrentWeapon(w);
    setAmmoClip(w.clipSize);
    setAmmoReserve(w.reserveMax);
  };

  const startMatchDeployment = () => {
    const g = gameRef.current;
    g.phase = 'AIRPLANE';
    setPhase('AIRPLANE');
    g.airplane.position.set(0, 120, -250);
    g.airplane.hasJumped = false;
    brAudio.startAirplaneDrone();
  };

  const restartCurrentMission = () => {
    const g = gameRef.current;
    g.player.hp = 100;
    g.player.armor = 100;
    setPlayerHp(100);
    setPlayerArmor(100);
    setKillsCount(0);
    g.damageDealt = 0;
    startMatchDeployment();
  };

  // ============================================================================
  // UI RENDER
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

        {/* Damage Red Flash Vignette */}
        {damageFlash && <View style={styles.damageFlash} pointerEvents="none" />}

        {/* Outside Safe Zone Blue Pulsing Vignette */}
        {isOutsideSafeZone && <View style={styles.stormVignette} pointerEvents="none" />}

        {/* ==================================================================== */}
        {/* SCREEN 1: AAA MAIN MENU */}
        {/* ==================================================================== */}
        {phase === 'MENU' && (
          <View style={styles.menuContainer}>
            <View style={styles.menuCard}>
              <View style={styles.menuBadge}>
                <Text style={styles.menuBadgeText}>★ AAA TACTICAL BATTLE ROYALE ★</Text>
              </View>
              <Text style={styles.menuTitle}>SHADOW STRIKE</Text>
              <Text style={styles.menuSubTitle}>PUBG-INSPIRED SURVIVAL CHAMPIONSHIP</Text>

              <View style={styles.menuStatsRow}>
                <Text style={styles.menuStatLabel}>
                  LEVEL: <Text style={{ color: '#00f0ff', fontWeight: '900' }}>{currentLevel}/100</Text>
                </Text>
                <Text style={styles.menuStatLabel}>
                  XP: <Text style={{ color: '#ffd700', fontWeight: '900' }}>{playerXp} PTS</Text>
                </Text>
              </View>

              <View style={styles.menuActions}>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setPhase('LOBBY')} activeOpacity={0.85}>
                  <Text style={styles.primaryBtnText}>▶ ENTER MATCH LOBBY</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => {
                    const next = graphicsPreset === 'HIGH' ? 'MED' : graphicsPreset === 'MED' ? 'LOW' : 'HIGH';
                    setGraphicsPreset(next);
                  }}
                >
                  <Text style={styles.secondaryBtnText}>GRAPHICS PRESET: {graphicsPreset}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation?.navigate?.('Home')}>
                  <Text style={styles.secondaryBtnText}>‹ RETURN TO ARCADE HUB</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.menuHintBox}>
                <Text style={styles.menuHintText}>
                  Controls: WASD Move • Left-Click Fire • Right-Click ADS Zoom • Space Jump • E Loot/Vehicle • M Full Map
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* SCREEN 2: MATCH LOBBY */}
        {/* ==================================================================== */}
        {phase === 'LOBBY' && (
          <View style={styles.menuContainer}>
            <View style={[styles.menuCard, { maxWidth: 540 }]}>
              <Text style={styles.menuBadgeText}>DEPLOYMENT READINESS</Text>
              <Text style={styles.menuTitle}>MATCH LOBBY</Text>
              <Text style={styles.menuSubTitle}>
                CAMPAIGN LEVEL {currentLevel}: {CAMPAIGN_LEVELS[currentLevel - 1]?.title}
              </Text>

              <View style={styles.lobbyDetails}>
                <Text style={styles.lobbyText}>
                  • Target: {CAMPAIGN_LEVELS[currentLevel - 1]?.description}
                </Text>
                <Text style={styles.lobbyText}>
                  • Enemy Combatants: {CAMPAIGN_LEVELS[currentLevel - 1]?.botCount} Hostile Bots
                </Text>
                <Text style={styles.lobbyText}>
                  • Drop Zone: Kavala Island & Harbor District
                </Text>
                <Text style={styles.lobbyText}>
                  • Active Outfit: {selectedOutfit}
                </Text>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={startMatchDeployment} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>✈ START MATCH (DEPLOY AIRPLANE)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('MENU')}>
                <Text style={styles.secondaryBtnText}>‹ BACK TO MAIN MENU</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* SCREEN 3 & 4: AIRPLANE INSERTION & FREEFALL TELEMETRY */}
        {/* ==================================================================== */}
        {(phase === 'AIRPLANE' || phase === 'FREEFALL' || phase === 'PARACHUTE') && (
          <View style={styles.airborneOverlay} pointerEvents="box-none">
            <View style={styles.airborneTelemetry}>
              <Text style={styles.telemetryTag}>AIRBORNE INSERTION TELEMETRY</Text>
              <Text style={styles.telemetryMain}>ALTITUDE: {altitudeMeters}m</Text>
              <Text style={styles.telemetrySub}>AIRSPEED: {descentSpeedKmh} KM/H</Text>
            </View>

            {phase === 'AIRPLANE' && (
              <TouchableOpacity style={styles.jumpBtn} onPress={jumpFromAircraft} activeOpacity={0.85}>
                <Text style={styles.jumpBtnText}>🪂 JUMP FROM AIRCRAFT (SPACE)</Text>
              </TouchableOpacity>
            )}

            {phase === 'FREEFALL' && (
              <TouchableOpacity style={styles.chuteBtn} onPress={deployParachute} activeOpacity={0.85}>
                <Text style={styles.chuteBtnText}>DEPLOY PARACHUTE (TAP)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ==================================================================== */}
        {/* IN-GAME HUD (PLAYING) */}
        {/* ==================================================================== */}
        {phase === 'PLAYING' && (
          <View style={styles.hudContainer} pointerEvents="box-none">
            {/* Top Bar: Telemetry, Safe Zone & Minimap */}
            <View style={styles.hudTopRow} pointerEvents="box-none">
              {/* Health & Armor Gauges */}
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

              {/* Match Survival & Safe Zone Clock */}
              <View style={styles.safeZoneBanner}>
                <View style={styles.alivePill}>
                  <Text style={styles.aliveLabel}>ALIVE: {aliveCount}/20</Text>
                  <Text style={styles.killsLabel}>KILLS: {killsCount}</Text>
                </View>
                <Text style={styles.zoneClock}>
                  STORM SHRINK: {Math.floor(safeZoneTime / 60)}:
                  {String(safeZoneTime % 60).padStart(2, '0')} (PHASE {safeZonePhase})
                </Text>
              </View>

              {/* Minimap Radar Canvas */}
              <View style={styles.minimapWrapper}>
                <canvas ref={minimapCanvasRef} width={160} height={160} style={{ borderRadius: 10 }} />
                <TouchableOpacity style={styles.mapToggleBtn} onPress={() => setShowFullMap(true)}>
                  <Text style={styles.mapToggleText}>🗺 MAP [M]</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tactical Crosshair */}
            <View style={styles.crosshair} pointerEvents="none">
              <View style={styles.crosshairCenter} />
              <View style={[styles.crosshairArm, { top: -10, left: -1, width: 2, height: 8 }]} />
              <View style={[styles.crosshairArm, { bottom: -10, left: -1, width: 2, height: 8 }]} />
              <View style={[styles.crosshairArm, { left: -10, top: -1, width: 8, height: 2 }]} />
              <View style={[styles.crosshairArm, { right: -10, top: -1, width: 8, height: 2 }]} />
              {hitMarker && <Text style={styles.hitMarkerSymbol}>✕</Text>}
            </View>

            {/* Interaction Prompt */}
            {interactPrompt && (
              <View style={styles.promptBox} pointerEvents="none">
                <Text style={styles.promptText}>{interactPrompt}</Text>
              </View>
            )}

            {/* Live Kill Feed */}
            <View style={styles.killFeedContainer} pointerEvents="none">
              {killFeed.map((kf, i) => (
                <Text key={i} style={styles.killFeedText}>
                  {kf}
                </Text>
              ))}
            </View>

            {/* Driving Speedometer Overlay */}
            {isDriving && (
              <View style={styles.speedometerContainer}>
                <Text style={styles.speedText}>{vehicleSpeedKmh} KM/H</Text>
                <TouchableOpacity style={styles.exitVehBtn} onPress={exitVehicle}>
                  <Text style={styles.exitVehText}>EXIT VEHICLE [E]</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Bottom Controls Bar: D-Pad & Combat Cluster */}
            <View style={styles.hudBottomRow} pointerEvents="box-none">
              {/* Virtual Movement D-Pad */}
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

              {/* Combat Buttons & Big Fire Button */}
              <View style={styles.combatCluster} pointerEvents="auto">
                {/* Secondary Tactical Actions */}
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

                  <TouchableOpacity style={styles.smallActionBtn} onPress={reloadActiveWeapon}>
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
                    <Text style={[styles.actionLabel, { color: '#ffd700' }]}>LOOT</Text>
                  </TouchableOpacity>
                </View>

                {/* Big Crimson Fire Button */}
                <View style={styles.fireRow}>
                  <View style={styles.weaponInfo}>
                    <Text style={styles.weaponName}>{currentWeapon.name}</Text>
                    <Text style={styles.ammoText}>
                      {isReloading ? 'RELOADING...' : `${ammoClip} / ${ammoReserve}`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.bigFireBtn}
                    onPress={fireActiveWeapon}
                    onPressIn={fireActiveWeapon}
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

        {/* ==================================================================== */}
        {/* FULL-SCREEN TACTICAL MAP OVERLAY */}
        {/* ==================================================================== */}
        <Modal visible={showFullMap} transparent animationType="fade">
          <View style={styles.mapModalBackdrop}>
            <View style={styles.mapModalCard}>
              <View style={styles.mapHeader}>
                <Text style={styles.mapTitle}>KAVALA ISLAND — FULL BATTLEGROUND MAP</Text>
                <TouchableOpacity style={styles.closeMapBtn} onPress={() => setShowFullMap(false)}>
                  <Text style={styles.closeMapText}>✕ CLOSE</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fullMapLegend}>
                <Text style={styles.legendText}>🏢 Neo-Kavala City (East)</Text>
                <Text style={styles.legendText}>🛡 Sector 04 Military Outpost (West)</Text>
                <Text style={styles.legendText}>📦 Industrial Warehouses (South-East)</Text>
                <Text style={styles.legendText}>⛽ Fuel Depot & Tactical Buggy (Center)</Text>
              </View>

              <Text style={styles.mapCoordHint}>
                Safe Zone Center: X: {Math.round(gameRef.current.safeZone.center.x)}, Z:{' '}
                {Math.round(gameRef.current.safeZone.center.y)} | Radius: {Math.round(gameRef.current.safeZone.radius)}m
              </Text>
            </View>
          </View>
        </Modal>

        {/* ==================================================================== */}
        {/* SCREEN 5: VICTORY SCREEN (WINNER WINNER CHICKEN DINNER) */}
        {/* ==================================================================== */}
        <Modal visible={phase === 'VICTORY'} transparent animationType="slide">
          <View style={styles.endModalBackdrop}>
            <View style={[styles.endModalCard, { borderColor: '#ffd700' }]}>
              <Text style={{ fontSize: 52, textAlign: 'center' }}>🍗</Text>
              <Text style={styles.victoryTitle}>WINNER WINNER CHICKEN DINNER!</Text>
              <Text style={styles.victorySubtitle}>#1 / 20 • CHAMPION OF SHADOW STRIKE</Text>

              <View style={styles.endStatsTable}>
                <Text style={styles.endStatLine}>Eliminations: {endMatchStats.kills} COMBATANTS</Text>
                <Text style={styles.endStatLine}>Damage Dealt: {endMatchStats.damage} HP</Text>
                <Text style={styles.endStatLine}>Survival Time: {endMatchStats.timeSec} SECONDS</Text>
                <Text style={[styles.endStatLine, { color: '#ffd700' }]}>
                  Experience Gained: +{endMatchStats.xpEarned} XP
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#ffd700' }]}
                onPress={restartCurrentMission}
              >
                <Text style={[styles.primaryBtnText, { color: '#000' }]}>
                  NEXT LEVEL ({currentLevel}/100) ▶
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('MENU')}>
                <Text style={styles.secondaryBtnText}>RETURN TO MAIN MENU</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ==================================================================== */}
        {/* SCREEN 6: DEFEAT / K.I.A. SCREEN */}
        {/* ==================================================================== */}
        <Modal visible={phase === 'GAMEOVER'} transparent animationType="fade">
          <View style={styles.endModalBackdrop}>
            <View style={[styles.endModalCard, { borderColor: '#ef4444' }]}>
              <Text style={{ fontSize: 52, textAlign: 'center' }}>💀</Text>
              <Text style={[styles.victoryTitle, { color: '#ef4444' }]}>BETTER LUCK NEXT TIME</Text>
              <Text style={styles.victorySubtitle}>
                PLACED #{endMatchStats.placement} OF 20 COMBATANTS
              </Text>

              <View style={styles.endStatsTable}>
                <Text style={styles.endStatLine}>Eliminations: {endMatchStats.kills}</Text>
                <Text style={styles.endStatLine}>Damage Dealt: {endMatchStats.damage}</Text>
                <Text style={styles.endStatLine}>Survival Time: {endMatchStats.timeSec}s</Text>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={restartCurrentMission}>
                <Text style={styles.primaryBtnText}>RETRY LEVEL {currentLevel} ▶</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('MENU')}>
                <Text style={styles.secondaryBtnText}>RETURN TO MENU</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLESHEET
// ============================================================================
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
  damageFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 68, 68, 0.45)',
    zIndex: 10,
  },
  stormVignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 20,
    borderColor: 'rgba(0, 102, 255, 0.75)',
    backgroundColor: 'rgba(0, 102, 255, 0.25)',
    zIndex: 11,
  },

  // MENU OVERLAYS
  menuContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 10, 20, 0.78)',
    zIndex: 20,
    padding: 16,
  },
  menuCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: 'rgba(10, 18, 32, 0.94)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    boxShadow: '0 0 24px rgba(0, 240, 255, 0.35)',
  },
  menuBadge: {
    backgroundColor: '#00f0ff',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  menuBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  menuTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  menuSubTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  menuStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 18,
  },
  menuStatLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  menuActions: {
    width: '100%',
  },
  primaryBtn: {
    backgroundColor: '#00f0ff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 6,
    boxShadow: '0 0 16px rgba(0, 240, 255, 0.5)',
  },
  primaryBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 4,
  },
  secondaryBtnText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
  },
  menuHintBox: {
    marginTop: 14,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
  },
  menuHintText: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'center',
  },

  // LOBBY
  lobbyDetails: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  lobbyText: {
    color: '#cbd5e1',
    fontSize: 13,
    marginVertical: 3,
  },

  // AIRBORNE OVERLAY
  airborneOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 24,
    zIndex: 15,
  },
  airborneTelemetry: {
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  telemetryTag: {
    color: '#00f0ff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  telemetryMain: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  telemetrySub: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: '800',
  },
  jumpBtn: {
    alignSelf: 'center',
    backgroundColor: '#00f0ff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    boxShadow: '0 0 24px rgba(0, 240, 255, 0.7)',
  },
  jumpBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },
  chuteBtn: {
    alignSelf: 'center',
    backgroundColor: '#00ff66',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    boxShadow: '0 0 24px rgba(0, 255, 102, 0.7)',
  },
  chuteBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },

  // IN-GAME HUD
  hudContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 14,
    zIndex: 10,
  },
  hudTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gaugesContainer: {
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.45)',
    borderRadius: 10,
    padding: 10,
    minWidth: 170,
  },
  gaugeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  hpLabel: {
    color: '#00ff66',
    fontSize: 11,
    fontWeight: '900',
    width: 24,
  },
  gaugeTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  gaugeBar: {
    height: '100%',
    borderRadius: 4,
  },
  gaugeVal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    width: 28,
    textAlign: 'right',
  },
  safeZoneBanner: {
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 1.5,
    borderColor: '#ffd700',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  alivePill: {
    flexDirection: 'row',
    gap: 12,
  },
  aliveLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  killsLabel: {
    color: '#ffd700',
    fontSize: 13,
    fontWeight: '900',
  },
  zoneClock: {
    color: '#00f0ff',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  minimapWrapper: {
    position: 'relative',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapToggleBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  mapToggleText: {
    color: '#00f0ff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Crosshair
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairCenter: {
    width: 4,
    height: 4,
    backgroundColor: '#00f0ff',
    borderRadius: 2,
  },
  crosshairArm: {
    position: 'absolute',
    backgroundColor: '#00f0ff',
  },
  hitMarkerSymbol: {
    color: '#ef4444',
    fontSize: 26,
    fontWeight: '900',
  },

  // Prompts & Feeds
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
  promptText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  killFeedContainer: {
    position: 'absolute',
    top: 90,
    left: 14,
    maxWidth: 320,
  },
  killFeedText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '700',
    marginVertical: 1,
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
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
  speedText: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: '900',
  },
  exitVehBtn: {
    marginTop: 6,
    backgroundColor: '#dc2626',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  exitVehText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },

  // Bottom Controls
  hudBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dpad: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  dpadArrow: {
    color: '#00f0ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dpadMid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  dpadCenter: {
    width: 44,
    height: 44,
  },

  // Combat Cluster
  combatCluster: {
    alignItems: 'flex-end',
  },
  tacticalRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
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
  btnActive: {
    backgroundColor: '#00f0ff',
    borderColor: '#00f0ff',
  },
  actionIcon: {
    fontSize: 18,
  },
  actionLabel: {
    color: '#00f0ff',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 1,
  },
  fireRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weaponInfo: {
    backgroundColor: 'rgba(10, 18, 32, 0.9)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'flex-end',
  },
  weaponName: {
    color: '#00f0ff',
    fontSize: 12,
    fontWeight: '900',
  },
  ammoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
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
  fireEmoji: {
    fontSize: 24,
  },
  fireLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },

  // MODALS
  mapModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapModalCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#0b1528',
    borderWidth: 2,
    borderColor: '#00f0ff',
    borderRadius: 16,
    padding: 20,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  mapTitle: {
    color: '#00f0ff',
    fontSize: 16,
    fontWeight: '900',
  },
  closeMapBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  closeMapText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fullMapLegend: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  legendText: {
    color: '#cbd5e1',
    fontSize: 13,
    marginVertical: 2,
  },
  mapCoordHint: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },

  // END MATCH (VICTORY / DEFEAT)
  endModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  endModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#0d182b',
    borderWidth: 2,
    borderRadius: 18,
    padding: 26,
    alignItems: 'center',
  },
  victoryTitle: {
    color: '#ffd700',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 8,
    textAlign: 'center',
  },
  victorySubtitle: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  endStatsTable: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 18,
  },
  endStatLine: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
    marginVertical: 4,
  },
});
