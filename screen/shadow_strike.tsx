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
// GAME FLOW & MAP DEFINITIONS
// ============================================================================
export type GameFlowPhase =
  | 'LOBBY'
  | 'MAP_SELECT'
  | 'MODE_SELECT'
  | 'DASHBOARD'
  | 'AIRPLANE'
  | 'FREEFALL'
  | 'PARACHUTE'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAMEOVER';

export type MapId = 'GREEN_ISLAND' | 'DESERT_FRONTIER' | 'FROZEN_SUMMIT' | 'NEON_METROPOLIS';
export type GameModeId = 'SOLO_BR' | 'RANKED_TAC';

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
    tagline: 'TACTICAL ARCHIPELAGO & MILITARY BASE',
    desc: 'Lush coastal archipelago featuring military outposts, harbor warehouses, radar towers, and dense pine forests.',
    duration: '12-15 MINS',
    badge: '★ CLASSIC BR ★',
    accentColor: '#00f0ff',
    skyGradient: ['#0a1426', '#14294b', '#483c2c'],
    fogColor: '#112238',
    fogDensity: 0.0055,
    sunColor: '#fff2de',
    terrainColors: ['#263b20', '#1f301b', '#3a4e2e', '#483c2c'],
    vehicleName: 'ALL-TERRAIN ASSAULT BUGGY',
    vehicleColor: '#2b3724',
  },
  DESERT_FRONTIER: {
    id: 'DESERT_FRONTIER',
    name: 'DESERT FRONTIER',
    tagline: 'ARID CANYONS & OIL REFINERY',
    desc: 'Vast scorched desert with sweeping sand dunes, sandstone canyon bluffs, adobe compounds, and high-speed dunes.',
    duration: '10-14 MINS',
    badge: '★ SNIPER HAVEN ★',
    accentColor: '#eab308',
    skyGradient: ['#1e140a', '#42280e', '#7c5324'],
    fogColor: '#3d2b17',
    fogDensity: 0.0045,
    sunColor: '#ffeed4',
    terrainColors: ['#d4a359', '#b8863b', '#8c5828', '#e2b774'],
    vehicleName: 'DESERT SAND ROVER',
    vehicleColor: '#b45309',
  },
  FROZEN_SUMMIT: {
    id: 'FROZEN_SUMMIT',
    name: 'FROZEN SUMMIT',
    tagline: 'GLACIAL PEAKS & ARCTIC RESEARCH LAB',
    desc: 'Snow-capped alpine ridges, reflective turquoise ice lake, sub-zero pine forests, and arctic military bunker.',
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
    desc: 'Futuristic city with illuminated skyscrapers, holographic billboards, multi-level skybridges, and wide highways.',
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

// ============================================================================
// CHARACTER CUSTOMIZATION & APPEARANCE DEFINITIONS
// ============================================================================
export type CharacterGender = 'MALE' | 'FEMALE';
export type OutfitId = 'WOODLAND' | 'URBAN' | 'DESERT' | 'CYBER' | 'ARCTIC';
export type HeadgearId = 'HELMET' | 'BERET' | 'NVG' | 'BALACLAVA' | 'CAP';
export type BackpackId = 'NONE' | 'LVL1' | 'LVL2' | 'LVL3';

export interface CharacterAppearance {
  gender: CharacterGender;
  outfit: OutfitId;
  headgear: HeadgearId;
  backpack: BackpackId;
  lobbyWeapon: WeaponType;
}

export const OUTFIT_DEFINITIONS: Record<
  OutfitId,
  {
    name: string;
    tag: string;
    shirtColor: string;
    pantsColor: string;
    vestColor: string;
    bootsColor: string;
    accentColor: string;
    glovesColor: string;
  }
> = {
  WOODLAND: {
    name: 'TACTICAL WOODLAND',
    tag: 'SPECIAL RECON',
    shirtColor: '#30422c',
    pantsColor: '#243221',
    vestColor: '#1a2417',
    bootsColor: '#1a1a1a',
    accentColor: '#4ade80',
    glovesColor: '#20291e',
  },
  URBAN: {
    name: 'URBAN OPERATIVE',
    tag: 'STEALTH DIGITAL',
    shirtColor: '#2a303c',
    pantsColor: '#1e232b',
    vestColor: '#13171e',
    bootsColor: '#111317',
    accentColor: '#60a5fa',
    glovesColor: '#161920',
  },
  DESERT: {
    name: 'DESERT VANGUARD',
    tag: 'ARID SPEC-OPS',
    shirtColor: '#a68254',
    pantsColor: '#8c693a',
    vestColor: '#634925',
    bootsColor: '#4a371c',
    accentColor: '#facc15',
    glovesColor: '#594121',
  },
  CYBER: {
    name: 'CYBER MERCENARY',
    tag: 'HI-TECH CARBON',
    shirtColor: '#0f172a',
    pantsColor: '#090d16',
    vestColor: '#1e293b',
    bootsColor: '#020617',
    accentColor: '#00f0ff',
    glovesColor: '#0f172a',
  },
  ARCTIC: {
    name: 'ARCTIC GHOST',
    tag: 'SUB-ZERO BLIZZARD',
    shirtColor: '#cbd5e1',
    pantsColor: '#94a3b8',
    vestColor: '#475569',
    bootsColor: '#334155',
    accentColor: '#38bdf8',
    glovesColor: '#334155',
  },
};

export const HEADGEAR_DEFINITIONS: Record<
  HeadgearId,
  { name: string; tag: string; color: string; desc: string }
> = {
  HELMET: {
    name: 'LEVEL 3 KEVLAR HELMET',
    tag: 'HEAVY ARMOR',
    color: '#1e293b',
    desc: 'Ballistic titanium alloy helmet with side rails, chin strap, and night vision mount.',
  },
  BERET: {
    name: 'COMMANDO CRIMSON BERET',
    tag: 'VETERAN',
    color: '#dc2626',
    desc: 'Traditional military wool beret with special forces gold crest pin.',
  },
  NVG: {
    name: 'QUAD-EYE NIGHT VISION (NVG)',
    tag: 'SPEC-OPS',
    color: '#090d16',
    desc: 'Tactical helmet mount with quad-tube wide-angle illuminated night vision lenses.',
  },
  BALACLAVA: {
    name: 'GHOST BALACLAVA & GOGGLES',
    tag: 'COVERT',
    color: '#111827',
    desc: 'Tactical flame-resistant balaclava with polarized ballistic shooting goggles.',
  },
  CAP: {
    name: 'OPERATOR CAP & COMMS',
    tag: 'FIELD RECON',
    color: '#334155',
    desc: 'Low-profile tactical baseball cap with integrated military boom headset.',
  },
};

export const BACKPACK_DEFINITIONS: Record<
  BackpackId,
  { name: string; capacity: string; color: string }
> = {
  NONE: { name: 'NO BACKPACK', capacity: 'LIGHTWEIGHT (+0)', color: '#333333' },
  LVL1: { name: 'LEVEL 1 PATROL PACK', capacity: 'STANDARD (+50 CAP)', color: '#2d3748' },
  LVL2: { name: 'LEVEL 2 ASSAULT PACK', capacity: 'ENHANCED (+100 CAP)', color: '#1a202c' },
  LVL3: { name: 'LEVEL 3 TACTICAL RUCKSACK', capacity: 'MAX EXPANSION (+180 CAP)', color: '#0d1117' },
};

// ============================================================================
// FIVE FUNCTIONAL WEAPONS & WEAPON REGISTRY
// ============================================================================
export type WeaponType = 'CARBINE' | 'SMG' | 'SHOTGUN' | 'SNIPER' | 'PISTOL';

export interface WeaponDef {
  id: WeaponType;
  name: string;
  category: string;
  slotNumber: number;
  damage: number;
  clipSize: number;
  reserveMax: number;
  fireRate: number; // in seconds
  isAutomatic: boolean;
  pelletCount: number; // 1 for single bullet, 8 for shotgun
  range: number;
  spread: number;
  recoil: number;
  zoomFOV: number;
  reloadTime: number;
  color: string;
  desc: string;
}

export const WEAPON_REGISTRY: Record<WeaponType, WeaponDef> = {
  CARBINE: {
    id: 'CARBINE',
    name: 'M4A1 TACTICAL',
    category: 'ASSAULT RIFLE',
    slotNumber: 1,
    damage: 35,
    clipSize: 30,
    reserveMax: 150,
    fireRate: 0.11,
    isAutomatic: true,
    pelletCount: 1,
    range: 130,
    spread: 0.02,
    recoil: 0.015,
    zoomFOV: 52,
    reloadTime: 1.6,
    color: '#00f0ff',
    desc: 'Fully automatic modular 5.56mm carbine. Outstanding balance of fire rate, range, and recoil control.',
  },
  SMG: {
    id: 'SMG',
    name: 'VECTOR SUB-9',
    category: 'SUBMACHINE GUN',
    slotNumber: 2,
    damage: 22,
    clipSize: 35,
    reserveMax: 180,
    fireRate: 0.065,
    isAutomatic: true,
    pelletCount: 1,
    range: 75,
    spread: 0.038,
    recoil: 0.009,
    zoomFOV: 56,
    reloadTime: 1.3,
    color: '#ec4899',
    desc: 'Ultra-fast 9mm SMG with extreme cyclic rate. Shreds opponents at close quarters with high mobility.',
  },
  SHOTGUN: {
    id: 'SHOTGUN',
    name: 'SPAS-12 BREACHER',
    category: 'TACTICAL SHOTGUN',
    slotNumber: 3,
    damage: 16, // 16 * 8 pellets = 128 max burst damage
    clipSize: 8,
    reserveMax: 40,
    fireRate: 0.72,
    isAutomatic: false,
    pelletCount: 8,
    range: 42,
    spread: 0.085,
    recoil: 0.045,
    zoomFOV: 60,
    reloadTime: 2.1,
    color: '#f97316',
    desc: '12-gauge tactical pump shotgun. Fires 8 devastating buckshot pellets simultaneously. Fatal in breach combat.',
  },
  SNIPER: {
    id: 'SNIPER',
    name: 'AWM COVERT .338',
    category: 'SNIPER RIFLE',
    slotNumber: 4,
    damage: 110,
    clipSize: 5,
    reserveMax: 25,
    fireRate: 1.25,
    isAutomatic: false,
    pelletCount: 1,
    range: 260,
    spread: 0.002,
    recoil: 0.065,
    zoomFOV: 22, // High-zoom scope overlay
    reloadTime: 2.4,
    color: '#eab308',
    desc: 'Bolt-action heavy anti-materiel sniper rifle. High-power optical scope with lethal one-shot precision.',
  },
  PISTOL: {
    id: 'PISTOL',
    name: 'G19 COMBAT 9mm',
    category: 'SIDEARM',
    slotNumber: 5,
    damage: 28,
    clipSize: 15,
    reserveMax: 60,
    fireRate: 0.20,
    isAutomatic: false,
    pelletCount: 1,
    range: 55,
    spread: 0.03,
    recoil: 0.02,
    zoomFOV: 58,
    reloadTime: 1.0,
    color: '#94a3b8',
    desc: 'Reliable semi-automatic secondary sidearm. Lightweight, lightning-quick draw, and rapid tactical reload.',
  },
};

// ============================================================================
// MATCH TELEMETRY & DASHBOARD TYPES
// ============================================================================
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

export interface HumanRig {
  root: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  armLGroup: THREE.Group;
  armRGroup: THREE.Group;
  handRGroup: THREE.Group;
  legLGroup: THREE.Group;
  legRGroup: THREE.Group;
  backpackGroup: THREE.Group;
  parachuteGroup: THREE.Group;
  weaponAnchor: THREE.Group;
  currentWeaponMesh: THREE.Group | null;
  hpBarMesh?: THREE.Mesh;
}

export interface EnemyBot {
  id: number;
  name: string;
  rig: HumanRig;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  hp: number;
  maxHp: number;
  weapon: WeaponType;
  state: 'PATROL' | 'ALERT' | 'CHASE' | 'ATTACK' | 'COVER' | 'DEAD';
  patrolTarget: THREE.Vector3;
  shootCooldown: number;
  walkCycle: number;
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
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(22, now + 0.38);
        gain.gain.setValueAtTime(0.85 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      } else if (type === 'SHOTGUN') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(18, now + 0.32);
        gain.gain.setValueAtTime(0.9 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      } else if (type === 'SMG') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(460, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.07);
        gain.gain.setValueAtTime(0.42 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      } else if (type === 'PISTOL') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.14);
        gain.gain.setValueAtTime(0.5 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      } else {
        // CARBINE M4A1
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.13);
        gain.gain.setValueAtTime(0.6 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
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

  playWeaponSwitch() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.12);
      gain.gain.setValueAtTime(0.3 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch (_) {}
  }

  playReload() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [320, 480].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);
        gain.gain.setValueAtTime(0.3 * this.volume, now + idx * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.16);
      });
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
        this.airplaneSoundNode.gain.gain.exponentialRampToValueAtTime(
          0.001,
          (this.getContext()?.currentTime || 0) + 0.3
        );
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
}

const brAudio = new BattleRoyaleAudioSystem();

// ============================================================================
// 3D PROCEDURAL WEAPON MODELS GENERATOR
// ============================================================================
export const build3DWeaponMesh = (type: WeaponType): THREE.Group => {
  const group = new THREE.Group();

  const gunMetalMat = new THREE.MeshStandardMaterial({
    color: '#151921',
    roughness: 0.25,
    metalness: 0.85,
  });
  const polymerMat = new THREE.MeshStandardMaterial({
    color: '#0e1116',
    roughness: 0.65,
    metalness: 0.2,
  });
  const barrelMat = new THREE.MeshStandardMaterial({
    color: '#0a0d12',
    roughness: 0.2,
    metalness: 0.9,
  });
  const opticMat = new THREE.MeshStandardMaterial({
    color: '#00f0ff',
    emissive: '#00c8e0',
    roughness: 0.1,
  });
  const woodStockMat = new THREE.MeshStandardMaterial({
    color: '#422a16',
    roughness: 0.5,
  });

  if (type === 'CARBINE') {
    // M4A1 TACTICAL ASSAULT RIFLE
    // Receiver
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.42), gunMetalMat);
    receiver.position.set(0, 0, 0);
    group.add(receiver);

    // Barrel & Handguard
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.09, 0.38), polymerMat);
    handguard.position.set(0, 0.01, 0.35);
    group.add(handguard);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8), barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, 0.65);
    group.add(barrel);

    // Flash Hider
    const flashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.022, 0.06, 8), gunMetalMat);
    flashHider.rotation.x = Math.PI / 2;
    flashHider.position.set(0, 0.01, 0.79);
    group.add(flashHider);

    // Curved STANAG Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.12), gunMetalMat);
    mag.position.set(0, -0.15, 0.08);
    mag.rotation.x = 0.15;
    group.add(mag);

    // Tactical Buffer Tube & Crane Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.28), polymerMat);
    stock.position.set(0, -0.01, -0.32);
    group.add(stock);

    // Pistol Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.09), polymerMat);
    grip.position.set(0, -0.14, -0.1);
    grip.rotation.x = -0.3;
    group.add(grip);

    // Holographic Sight
    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.14), polymerMat);
    optic.position.set(0, 0.11, 0.04);
    group.add(optic);
    const opticLens = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.01), opticMat);
    opticLens.position.set(0, 0.12, 0.11);
    group.add(opticLens);

    // Tactical Foregrip
    const foregrip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 8), polymerMat);
    foregrip.position.set(0, -0.1, 0.32);
    group.add(foregrip);
  } else if (type === 'SMG') {
    // VECTOR SUB-9
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.18, 0.35), polymerMat);
    upper.position.set(0, 0, 0);
    group.add(upper);

    // Integrated angled receiver & magwell
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.08), gunMetalMat);
    mag.position.set(0, -0.16, 0.05);
    mag.rotation.x = 0.12;
    group.add(mag);

    // Short compensator barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.24);
    group.add(barrel);

    // Side folding compact stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.22), polymerMat);
    stock.position.set(0, 0.02, -0.26);
    group.add(stock);

    // Foregrip
    const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.06), polymerMat);
    foregrip.position.set(0, -0.1, 0.18);
    group.add(foregrip);

    // Micro reflex optic
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.09), gunMetalMat);
    sight.position.set(0, 0.11, 0.02);
    group.add(sight);
  } else if (type === 'SHOTGUN') {
    // SPAS-12 BREACHER
    // Heavy cylindrical barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.55, 8), barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, 0.26);
    group.add(barrel);

    // Under-barrel tubular magazine
    const tubeMag = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.48, 8), gunMetalMat);
    tubeMag.rotation.x = Math.PI / 2;
    tubeMag.position.set(0, -0.02, 0.22);
    group.add(tubeMag);

    // Ribbed pump slide
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.18, 8), polymerMat);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, 0.0, 0.22);
    group.add(pump);

    // Receiver & metal stock
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.28), gunMetalMat);
    receiver.position.set(0, 0, -0.08);
    group.add(receiver);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.08), polymerMat);
    grip.position.set(0, -0.12, -0.16);
    grip.rotation.x = -0.3;
    group.add(grip);

    const foldStock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.32), gunMetalMat);
    foldStock.position.set(0, 0.08, -0.12);
    group.add(foldStock);
  } else if (type === 'SNIPER') {
    // AWM COVERT .338
    // Receiver & Bolt Action Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.14, 0.55), woodStockMat);
    chassis.position.set(0, -0.01, 0);
    group.add(chassis);

    // Long fluted heavy barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.82, 8), barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.65);
    group.add(barrel);

    // Heavy Muzzle Brake
    const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.1), gunMetalMat);
    muzzleBrake.position.set(0, 0.02, 1.08);
    group.add(muzzleBrake);

    // Elevated Sniper Scope with dual rings
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.36, 12), gunMetalMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.14, 0.08);
    group.add(scopeTube);

    const scopeLensFront = new THREE.Mesh(new THREE.CircleGeometry(0.034, 12), opticMat);
    scopeLensFront.position.set(0, 0.14, 0.26);
    group.add(scopeLensFront);

    const scopeLensBack = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), opticMat);
    scopeLensBack.rotation.y = Math.PI;
    scopeLensBack.position.set(0, 0.14, -0.1);
    group.add(scopeLensBack);

    // Bolt handle
    const boltHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), gunMetalMat);
    boltHandle.rotation.z = Math.PI / 2.5;
    boltHandle.position.set(0.06, 0.06, -0.06);
    group.add(boltHandle);

    // Sniper Thumbhole Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.18, 0.35), woodStockMat);
    stock.position.set(0, -0.02, -0.42);
    group.add(stock);

    // Folded Bipod under barrel
    const bipod = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.22), gunMetalMat);
    bipod.position.set(0, -0.06, 0.52);
    group.add(bipod);
  } else {
    // PISTOL G19 COMBAT
    // Slide
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.24), gunMetalMat);
    slide.position.set(0, 0.04, 0);
    group.add(slide);

    // Polymer Frame & Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.16, 0.08), polymerMat);
    grip.position.set(0, -0.07, -0.04);
    grip.rotation.x = -0.28;
    group.add(grip);

    // Under-barrel tactical accessory rail & light
    const tacLight = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 0.08), polymerMat);
    tacLight.position.set(0, -0.01, 0.07);
    group.add(tacLight);

    // Barrel crown
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.04, 8), barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, 0.13);
    group.add(barrel);
  }

  // Muzzle light for firing illumination
  const mLight = new THREE.PointLight('#ffe066', 0, 10);
  mLight.position.set(0, 0.04, 0.95);
  group.add(mLight);

  return group;
};

// ============================================================================
// REALISTIC HUMAN RIG GENERATOR (PLAYER OPERATIVE & HOSTILE BOTS)
// ============================================================================
export const buildRealisticHumanRig = (
  appearance: CharacterAppearance,
  isEnemy: boolean = false,
  enemyNumber: number = 1
): HumanRig => {
  const root = new THREE.Group();
  const outfit = OUTFIT_DEFINITIONS[appearance.outfit] || OUTFIT_DEFINITIONS.WOODLAND;
  const isFemale = appearance.gender === 'FEMALE';

  // Distinct Color Variations for Enemies
  let shirtCol = outfit.shirtColor;
  let pantsCol = outfit.pantsColor;
  let vestCol = outfit.vestColor;
  let bootsCol = outfit.bootsColor;
  let headgearCol = outfit.accentColor;

  if (isEnemy) {
    const enemyPalettes = [
      { shirt: '#4b1e1e', pants: '#2b1414', vest: '#1a0d0d', gear: '#dc2626' },
      { shirt: '#1e293b', pants: '#0f172a', vest: '#090d16', gear: '#2563eb' },
      { shirt: '#3f3323', pants: '#2c2317', vest: '#1d170e', gear: '#eab308' },
      { shirt: '#2d3748', pants: '#1a202c', vest: '#0d1117', gear: '#9333ea' },
    ];
    const pal = enemyPalettes[enemyNumber % enemyPalettes.length];
    shirtCol = pal.shirt;
    pantsCol = pal.pants;
    vestCol = pal.vest;
    bootsCol = '#111317';
    headgearCol = pal.gear;
  }

  // Realistic PBR Materials
  const skinColor = isFemale ? '#e0b094' : '#c99274';
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.65,
    metalness: 0.05,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: shirtCol,
    roughness: 0.75,
    metalness: 0.1,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: vestCol,
    roughness: 0.6,
    metalness: 0.25,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantsCol,
    roughness: 0.8,
  });
  const bootsMat = new THREE.MeshStandardMaterial({
    color: bootsCol,
    roughness: 0.5,
    metalness: 0.3,
  });
  const glovesMat = new THREE.MeshStandardMaterial({
    color: outfit.glovesColor,
    roughness: 0.6,
  });
  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const eyeIrisMat = new THREE.MeshBasicMaterial({ color: '#2563eb' });
  const eyePupilMat = new THREE.MeshBasicMaterial({ color: '#000000' });
  const hairMat = new THREE.MeshStandardMaterial({
    color: isFemale ? '#221711' : '#1a130f',
    roughness: 0.85,
  });
  const beltMat = new THREE.MeshStandardMaterial({
    color: '#0a0d12',
    roughness: 0.5,
    metalness: 0.4,
  });

  // 1. Torso Group (Center of Mass at waist/chest)
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.15, 0);
  root.add(torsoGroup);

  // Chest & Abdomen (proportions tuned for realistic athletic posture)
  const chestWidth = isFemale ? 0.68 : 0.78;
  const chestHeight = 0.72;
  const chestDepth = isFemale ? 0.42 : 0.48;

  const shirt = new THREE.Mesh(new THREE.BoxGeometry(chestWidth, chestHeight, chestDepth), shirtMat);
  shirt.castShadow = true;
  torsoGroup.add(shirt);

  // Heavy Tactical Plate Carrier Vest (MOLLE webbing)
  const vest = new THREE.Mesh(
    new THREE.BoxGeometry(chestWidth + 0.08, chestHeight * 0.78, chestDepth + 0.1),
    vestMat
  );
  vest.position.set(0, 0.04, 0.01);
  vest.castShadow = true;
  torsoGroup.add(vest);

  // 3 Ammo Magazine Pouches on Chest
  for (let m = -1; m <= 1; m++) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.08), vestMat);
    pouch.position.set(m * 0.18, -0.08, chestDepth * 0.5 + 0.05);
    torsoGroup.add(pouch);
  }

  // Tactical Comms Radio with Whip Antenna on Left Shoulder
  const radio = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.08), vestMat);
  radio.position.set(-chestWidth * 0.38, 0.22, chestDepth * 0.45);
  torsoGroup.add(radio);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 6), bootsMat);
  antenna.position.set(-chestWidth * 0.38, 0.38, chestDepth * 0.45);
  torsoGroup.add(antenna);

  // Tactical Duty Belt with Holster
  const belt = new THREE.Mesh(new THREE.BoxGeometry(chestWidth + 0.04, 0.1, chestDepth + 0.06), beltMat);
  belt.position.set(0, -chestHeight * 0.5 - 0.02, 0);
  torsoGroup.add(belt);

  const thighHolster = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.09), bootsMat);
  thighHolster.position.set(chestWidth * 0.45, -chestHeight * 0.5 - 0.12, 0);
  torsoGroup.add(thighHolster);

  // 2. Head Group & Facial Anatomy
  const headGroup = new THREE.Group();
  headGroup.position.set(0, chestHeight * 0.5 + 0.38, 0);
  torsoGroup.add(headGroup);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 10), skinMat);
  neck.position.set(0, -0.16, 0);
  headGroup.add(neck);

  // Anatomical Head (Cranium + Jaw)
  const headSize = isFemale ? 0.36 : 0.4;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headSize * 0.55, 16, 12), skinMat);
  head.scale.set(1.0, 1.25, 1.15);
  head.castShadow = true;
  headGroup.add(head);

  // Modeled Nose
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.06), skinMat);
  nose.position.set(0, 0.01, headSize * 0.58);
  headGroup.add(nose);

  // Realistic Eyes (Sclera + Iris + Pupil)
  [-0.08, 0.08].forEach((eyeX) => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), eyeWhiteMat);
    eyeWhite.position.set(eyeX, 0.06, headSize * 0.52);
    headGroup.add(eyeWhite);

    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.02, 8), eyeIrisMat);
    iris.position.set(eyeX, 0.06, headSize * 0.55);
    headGroup.add(iris);

    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.009, 8), eyePupilMat);
    pupil.position.set(eyeX, 0.06, headSize * 0.555);
    headGroup.add(pupil);
  });

  // Modeled Mouth & Ears
  const lips = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.03, 0.02),
    new THREE.MeshBasicMaterial({ color: '#9e624f' })
  );
  lips.position.set(0, -0.09, headSize * 0.55);
  headGroup.add(lips);

  [-headSize * 0.52, headSize * 0.52].forEach((earX) => {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.06), skinMat);
    ear.position.set(earX, 0.02, 0);
    headGroup.add(ear);
  });

  // Hair Styling
  if (isFemale) {
    // Female Sleek Tactical Ponytail
    const hairBase = new THREE.Mesh(new THREE.SphereGeometry(headSize * 0.58, 12, 10), hairMat);
    hairBase.position.set(0, 0.06, -0.04);
    headGroup.add(hairBase);

    const ponytail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.02, 0.32, 8), hairMat);
    ponytail.position.set(0, -0.05, -headSize * 0.65);
    ponytail.rotation.x = -0.4;
    headGroup.add(ponytail);
  } else {
    // Male Tapered Military Buzz Cut
    const hair = new THREE.Mesh(new THREE.SphereGeometry(headSize * 0.56, 12, 10), hairMat);
    hair.position.set(0, 0.08, -0.02);
    headGroup.add(hair);
  }

  // Selected Headgear
  const headgearType = appearance.headgear || 'HELMET';
  const headgearMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? headgearCol : HEADGEAR_DEFINITIONS[headgearType]?.color || '#1e293b',
    roughness: 0.45,
    metalness: 0.4,
  });

  if (headgearType === 'HELMET') {
    // Level 3 Kevlar Helmet with Chin Strap
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(headSize * 0.64, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
      headgearMat
    );
    helmet.position.set(0, 0.04, 0);
    helmet.castShadow = true;
    headGroup.add(helmet);

    const chinStrap = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.015, 6, 16, Math.PI), beltMat);
    chinStrap.position.set(0, -0.12, 0.04);
    chinStrap.rotation.x = Math.PI / 1.5;
    headGroup.add(chinStrap);
  } else if (headgearType === 'BERET') {
    // Crimson Commando Beret
    const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.12, 12), headgearMat);
    beret.position.set(0.04, 0.22, -0.02);
    beret.rotation.z = -0.18;
    headGroup.add(beret);
  } else if (headgearType === 'NVG') {
    // Night Vision Goggles Helmet Mount
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(headSize * 0.62, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
      headgearMat
    );
    helmet.position.set(0, 0.04, 0);
    headGroup.add(helmet);

    const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.18), beltMat);
    nvgMount.position.set(0, 0.12, headSize * 0.58);
    headGroup.add(nvgMount);

    [-0.05, 0.05].forEach((gx) => {
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.03, 0.14, 8),
        new THREE.MeshBasicMaterial({ color: '#00ff88' })
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(gx, 0.1, headSize * 0.68);
      headGroup.add(lens);
    });
  } else if (headgearType === 'BALACLAVA') {
    // Balaclava & Shooting Glasses
    const mask = new THREE.Mesh(new THREE.SphereGeometry(headSize * 0.58, 14, 12), headgearMat);
    mask.scale.set(1.0, 1.25, 1.15);
    headGroup.add(mask);

    const goggles = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.09, 0.08),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.1, metalness: 0.8 })
    );
    goggles.position.set(0, 0.06, headSize * 0.58);
    headGroup.add(goggles);
  } else {
    // Operator Cap & Headset
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 12), headgearMat);
    cap.position.set(0, 0.18, 0);
    headGroup.add(cap);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.18), headgearMat);
    visor.position.set(0, 0.12, 0.2);
    headGroup.add(visor);
  }

  // 3. Backpack (Attached to rear of torso)
  const backpackGroup = new THREE.Group();
  backpackGroup.position.set(0, 0.04, -chestDepth * 0.5 - 0.08);
  torsoGroup.add(backpackGroup);

  const bpType = appearance.backpack || 'LVL2';
  if (bpType !== 'NONE') {
    const bpDepth = bpType === 'LVL3' ? 0.36 : bpType === 'LVL2' ? 0.28 : 0.2;
    const bpHeight = bpType === 'LVL3' ? 0.65 : 0.52;
    const bpMat = new THREE.MeshStandardMaterial({
      color: BACKPACK_DEFINITIONS[bpType]?.color || '#1e293b',
      roughness: 0.7,
    });

    const pack = new THREE.Mesh(new THREE.BoxGeometry(chestWidth * 0.75, bpHeight, bpDepth), bpMat);
    pack.castShadow = true;
    backpackGroup.add(pack);

    // Bedroll on bottom for Level 3
    if (bpType === 'LVL3') {
      const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, chestWidth * 0.8, 8), shirtMat);
      bedroll.rotation.z = Math.PI / 2;
      bedroll.position.set(0, -bpHeight * 0.5 - 0.08, 0);
      backpackGroup.add(bedroll);
    }
  }

  // 4. Parachute (Stored & Deployable)
  const chuteGroup = new THREE.Group();
  chuteGroup.position.set(0, 4.8, 0);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45),
    new THREE.MeshStandardMaterial({ color: '#166534', side: THREE.DoubleSide })
  );
  canopy.rotation.x = Math.PI;
  chuteGroup.add(canopy);
  chuteGroup.visible = false;
  root.add(chuteGroup);

  // 5. Left & Right Jointed Arms
  // Left Arm (Support Hand)
  const armLGroup = new THREE.Group();
  armLGroup.position.set(-chestWidth * 0.56, chestHeight * 0.4, 0);
  torsoGroup.add(armLGroup);

  const bicepL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.38, 8), shirtMat);
  bicepL.position.set(0, -0.19, 0);
  bicepL.castShadow = true;
  armLGroup.add(bicepL);

  const forearmL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.38, 8), shirtMat);
  forearmL.position.set(0, -0.5, 0.12);
  forearmL.rotation.x = 0.55;
  armLGroup.add(forearmL);

  const handL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.09), glovesMat);
  handL.position.set(0, -0.68, 0.25);
  armLGroup.add(handL);

  // Right Arm (Trigger Hand holding weapon)
  const armRGroup = new THREE.Group();
  armRGroup.position.set(chestWidth * 0.56, chestHeight * 0.4, 0);
  torsoGroup.add(armRGroup);

  const bicepR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.38, 8), shirtMat);
  bicepR.position.set(0, -0.19, 0);
  bicepR.castShadow = true;
  armRGroup.add(bicepR);

  const forearmR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.38, 8), shirtMat);
  forearmR.position.set(0, -0.48, 0.16);
  forearmR.rotation.x = 0.7;
  armRGroup.add(forearmR);

  const handRGroup = new THREE.Group();
  handRGroup.position.set(0, -0.66, 0.3);
  armRGroup.add(handRGroup);

  const handR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.09), glovesMat);
  handRGroup.add(handR);

  // Weapon Socket attached to right hand
  const weaponAnchor = new THREE.Group();
  weaponAnchor.position.set(0.02, 0.02, 0.1);
  handRGroup.add(weaponAnchor);

  // Attach Initial 3D Weapon
  const initialWeapon = appearance.lobbyWeapon || 'CARBINE';
  const initialWeaponMesh = build3DWeaponMesh(initialWeapon);
  weaponAnchor.add(initialWeaponMesh);

  // 6. Left & Right Legs with Knee Joints & Tactical Boots
  const legSpacing = chestWidth * 0.28;

  // Left Leg
  const legLGroup = new THREE.Group();
  legLGroup.position.set(-legSpacing, -chestHeight * 0.52, 0);
  torsoGroup.add(legLGroup);

  const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.52, 8), pantsMat);
  thighL.position.set(0, -0.26, 0);
  thighL.castShadow = true;
  legLGroup.add(thighL);

  const kneeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.08), bootsMat);
  kneeL.position.set(0, -0.52, 0.06);
  legLGroup.add(kneeL);

  const calfL = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.08, 0.48, 8), pantsMat);
  calfL.position.set(0, -0.76, 0);
  legLGroup.add(calfL);

  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.28), bootsMat);
  bootL.position.set(0, -1.04, 0.05);
  bootL.castShadow = true;
  legLGroup.add(bootL);

  // Right Leg
  const legRGroup = new THREE.Group();
  legRGroup.position.set(legSpacing, -chestHeight * 0.52, 0);
  torsoGroup.add(legRGroup);

  const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.52, 8), pantsMat);
  thighR.position.set(0, -0.26, 0);
  thighR.castShadow = true;
  legRGroup.add(thighR);

  const kneeR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.08), bootsMat);
  kneeR.position.set(0, -0.52, 0.06);
  legRGroup.add(kneeR);

  const calfR = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.08, 0.48, 8), pantsMat);
  calfR.position.set(0, -0.76, 0);
  legRGroup.add(calfR);

  const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.28), bootsMat);
  bootR.position.set(0, -1.04, 0.05);
  bootR.castShadow = true;
  legRGroup.add(bootR);

  return {
    root,
    torsoGroup,
    headGroup,
    armLGroup,
    armRGroup,
    handRGroup,
    legLGroup,
    legRGroup,
    backpackGroup,
    parachuteGroup: chuteGroup,
    weaponAnchor,
    currentWeaponMesh: initialWeaponMesh,
  };
};

// ============================================================================
// MAIN COMPONENT: SHADOW STRIKE AAA BATTLE ROYALE
// ============================================================================
export default function ShadowStrikeScreen({ navigation }: any) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const mountRef = useRef<any>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Flow State
  const [phase, setPhase] = useState<GameFlowPhase>('LOBBY');
  const [lobbyTab, setLobbyTab] = useState<'PLAY' | 'CUSTOMIZE' | 'ARSENAL' | 'DASHBOARD' | 'SETTINGS'>('PLAY');
  const [selectedMapId, setSelectedMapId] = useState<MapId>('GREEN_ISLAND');
  const [gameMode, setGameMode] = useState<GameModeId>('SOLO_BR');
  const [graphicsPreset, setGraphicsPreset] = useState<'LOW' | 'MED' | 'HIGH'>('HIGH');

  // Character Customization State
  const [appearance, setAppearance] = useState<CharacterAppearance>({
    gender: 'MALE',
    outfit: 'WOODLAND',
    headgear: 'HELMET',
    backpack: 'LVL2',
    lobbyWeapon: 'CARBINE',
  });

  // Lobby 3D Camera & Rotation
  const lobbyRotationRef = useRef<number>(0);
  const lobbyZoomRef = useRef<number>(4.2);
  const isDraggingLobbyRef = useRef<boolean>(false);
  const lastMouseXRef = useRef<number>(0);

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

  // Weapon Inventory State (5 Functional Weapons)
  const [currentWeapon, setCurrentWeapon] = useState<WeaponDef>(WEAPON_REGISTRY.CARBINE);
  const [ammoClip, setAmmoClip] = useState<number>(30);
  const [ammoReserve, setAmmoReserve] = useState<number>(150);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [weaponsInventory, setWeaponsInventory] = useState<
    Record<WeaponType, { clip: number; reserve: number }>
  >({
    CARBINE: { clip: 30, reserve: 150 },
    SMG: { clip: 35, reserve: 180 },
    SHOTGUN: { clip: 8, reserve: 40 },
    SNIPER: { clip: 5, reserve: 25 },
    PISTOL: { clip: 15, reserve: 60 },
  });

  // Flight & Parachute Telemetry
  const [altitudeMeters, setAltitudeMeters] = useState<number>(1200);
  const [descentSpeedKmh, setDescentSpeedKmh] = useState<number>(240);

  // Safe Zone Telemetry
  const [safeZoneTime, setSafeZoneTime] = useState<number>(90);
  const [safeZonePhase, setSafeZonePhase] = useState<number>(1);
  const [isOutsideSafeZone, setIsOutsideSafeZone] = useState<boolean>(false);

  // Driving Telemetry
  const [isDriving, setIsDriving] = useState<boolean>(false);
  const [vehicleSpeedKmh, setVehicleSpeedKmh] = useState<number>(0);

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

  // Mutable Game Loop State Ref
  const gameRef = useRef({
    phase: 'LOBBY' as GameFlowPhase,
    mapId: 'GREEN_ISLAND' as MapId,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    dirSun: null as THREE.DirectionalLight | null,
    animFrameId: null as any,
    clock: new THREE.Clock(),
    elapsedTime: 0,
    isFiring: false,

    keys: {
      w: false,
      a: false,
      s: false,
      d: false,
      shift: false,
      space: false,
      e: false,
      r: false,
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
    },
    mouseLook: {
      yaw: 0,
      pitch: 0.15,
      isAiming: false,
    },

    playerRig: null as HumanRig | null,
    player: {
      position: new THREE.Vector3(0, 120, -200),
      velocity: new THREE.Vector3(0, 0, 0),
      onGround: false,
      hp: 100,
      armor: 100,
      walkCycle: 0,
      currentWeapon: WEAPON_REGISTRY.CARBINE,
      clip: 30,
      reserve: 150,
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
      damageTickTimer: 0,
      baseDPS: 8,
      mesh: null as THREE.Mesh | null,
      stormRingMesh: null as THREE.Mesh | null,
      currentStage: 1,
    },

    bots: [] as EnemyBot[],
    lootItems: [] as LootItem[],
    bulletTracers: [] as { line: THREE.Line; life: number }[],
    damageDealt: 0,
    eliminationCount: 0,

    // Lobby Specific 3D Environment
    lobbyShowroomGroup: null as THREE.Group | null,
    lobbyCharacterRig: null as HumanRig | null,
  });

  // Load persistent appearance and dashboard stats on startup
  useEffect(() => {
    (async () => {
      try {
        const savedDash = await AsyncStorage.getItem('SHADOW_STRIKE_DASHBOARD');
        if (savedDash) setDashboard(JSON.parse(savedDash));

        const savedApp = await AsyncStorage.getItem('SHADOW_STRIKE_APPEARANCE');
        if (savedApp) {
          const parsed = JSON.parse(savedApp);
          setAppearance(parsed);
          setCurrentWeapon(WEAPON_REGISTRY[parsed.lobbyWeapon as WeaponType] || WEAPON_REGISTRY.CARBINE);
        }
      } catch (_) {}
    })();
  }, []);

  // Save appearance changes
  const updateAppearance = async (partial: Partial<CharacterAppearance>) => {
    const next = { ...appearance, ...partial };
    setAppearance(next);
    try {
      await AsyncStorage.setItem('SHADOW_STRIKE_APPEARANCE', JSON.stringify(next));
    } catch (_) {}

    // Refresh Lobby 3D character in real-time
    const g = gameRef.current;
    if (g.lobbyShowroomGroup && g.lobbyCharacterRig) {
      g.lobbyShowroomGroup.remove(g.lobbyCharacterRig.root);
      const newRig = buildRealisticHumanRig(next, false);
      g.lobbyCharacterRig = newRig;
      g.lobbyShowroomGroup.add(newRig.root);
    }
  };

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
  // PROCEDURAL TERRAIN HEIGHT CALCULATOR
  // ============================================================================
  const getTerrainHeight = (x: number, z: number, map: MapId): number => {
    const scale1 = 0.015;
    const scale2 = 0.045;
    if (map === 'DESERT_FRONTIER') {
      return Math.sin(x * scale1) * Math.cos(z * scale1) * 8.5 + Math.sin(x * scale2 + z * scale2) * 2.5;
    }
    if (map === 'FROZEN_SUMMIT') {
      return (
        Math.sin(x * 0.012) * Math.cos(z * 0.012) * 16.0 +
        Math.cos(x * 0.035) * 4.5 +
        Math.sin(z * 0.04) * 3.5
      );
    }
    if (map === 'NEON_METROPOLIS') {
      return 0.15; // Flat urban mega-grid
    }
    // GREEN_ISLAND
    return (
      Math.sin(x * scale1) * Math.cos(z * scale1) * 6.5 +
      Math.sin(x * scale2 * 1.5) * 2.0 +
      Math.cos(z * scale2) * 1.5
    );
  };

  // ============================================================================
  // THREE.JS SCENE BUILDER ACCORDING TO CURRENT PHASE
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
    scene.background = new THREE.Color(phase === 'LOBBY' ? '#070a12' : mapDef.skyGradient[0]);
    scene.fog = new THREE.FogExp2(
      phase === 'LOBBY' ? '#070a12' : mapDef.fogColor,
      phase === 'LOBBY' ? 0.015 : mapDef.fogDensity
    );
    g.scene = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1500);
    g.camera = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: graphicsPreset !== 'LOW', alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, graphicsPreset === 'HIGH' ? 2 : 1.5));
    renderer.shadowMap.enabled = graphicsPreset !== 'LOW';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    g.renderer = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 4. Lighting Rig
    const ambientLight = new THREE.HemisphereLight(
      phase === 'LOBBY' ? '#60a5fa' : mapDef.accentColor,
      '#111827',
      phase === 'LOBBY' ? 1.4 : 1.1
    );
    scene.add(ambientLight);

    const dirSun = new THREE.DirectionalLight(mapDef.sunColor, phase === 'LOBBY' ? 2.2 : 2.5);
    dirSun.position.set(45, 120, 45);
    dirSun.castShadow = graphicsPreset !== 'LOW';
    dirSun.shadow.mapSize.width = 2048;
    dirSun.shadow.mapSize.height = 2048;
    scene.add(dirSun);
    g.dirSun = dirSun;

    // 5. Build Environments based on Phase
    if (phase === 'LOBBY') {
      buildLobbyShowroom(scene, g);
    } else {
      buildBattlegroundWorld(scene, g, mapDef);
      buildPlayerOperative(scene, g);
      spawnMapLoot(scene, g);
      spawnHostileBots(scene, g);
      buildSafeZoneStorm(scene, g);
    }

    // 6. Setup Input Events
    setupInputEvents(renderer.domElement, g);

    // 7. Resize Handler
    const onResize = () => {
      if (!mountRef.current || !g.camera || !g.renderer) return;
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;
      g.camera.aspect = w / h;
      g.camera.updateProjectionMatrix();
      g.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 8. Main RAF Game Loop
    let isRunning = true;
    const loop = () => {
      if (!isRunning) return;
      g.animFrameId = requestAnimationFrame(loop);

      const dt = Math.min(g.clock.getDelta(), 0.1);
      g.elapsedTime += dt;

      if (g.phase === 'LOBBY') {
        updateLobbyPreview(dt, g);
      } else if (g.phase === 'AIRPLANE') {
        updateAirplaneFlight(dt, g);
      } else if (g.phase === 'FREEFALL' || g.phase === 'PARACHUTE') {
        updateFreefallAndParachute(dt, g);
      } else if (g.phase === 'PLAYING') {
        updatePlayerMovement(dt, g);
        updateHostileBotAI(dt, g);
        updateSafeZoneStorm(dt, g);
        updateBulletTracers(g);
        renderMinimap(g);

        // Continuous automatic fire if mouse held down
        if (g.isFiring && g.player.currentWeapon.isAutomatic) {
          fireWeapon();
        }
      }

      if (g.renderer && g.scene && g.camera) {
        g.renderer.render(g.scene, g.camera);
      }
    };
    loop();

    return () => {
      isRunning = false;
      if (g.animFrameId) cancelAnimationFrame(g.animFrameId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [selectedMapId, phase, graphicsPreset]);

  // ============================================================================
  // PUBG-INSPIRED 3D LOBBY SHOWROOM BUILDER
  // ============================================================================
  const buildLobbyShowroom = (scene: THREE.Scene, g: any) => {
    const showroomGroup = new THREE.Group();
    scene.add(showroomGroup);
    g.lobbyShowroomGroup = showroomGroup;

    // 1. High-Tech Hexagonal Floor Podium
    const floorGeo = new THREE.CylinderGeometry(4.5, 4.8, 0.25, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#0d1522',
      roughness: 0.2,
      metalness: 0.8,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.12, 0);
    floor.receiveShadow = true;
    showroomGroup.add(floor);

    // Glowing Neon Rim
    const rimGeo = new THREE.RingGeometry(4.4, 4.6, 48);
    const rimMat = new THREE.MeshBasicMaterial({ color: '#00f0ff', side: THREE.DoubleSide });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 0.02, 0);
    showroomGroup.add(rim);

    // Overhead Volumetric Spotlight
    const spot = new THREE.SpotLight('#ffffff', 4.5, 25, Math.PI / 4, 0.4, 1.2);
    spot.position.set(0, 8.5, 3);
    spot.target.position.set(0, 1.2, 0);
    spot.castShadow = true;
    showroomGroup.add(spot);
    showroomGroup.add(spot.target);

    // Back Blue Rim Light for Silhouette separation
    const backLight = new THREE.PointLight('#00f0ff', 2.8, 12);
    backLight.position.set(0, 2.5, -3.5);
    showroomGroup.add(backLight);

    // Warm Key Fill Light
    const fillLight = new THREE.PointLight('#ffd700', 1.8, 10);
    fillLight.position.set(3, 2.2, 3);
    showroomGroup.add(fillLight);

    // 2. Spawn 3D Realistic Character Rig in Lobby
    const charRig = buildRealisticHumanRig(appearance, false);
    charRig.root.position.set(0, 0.01, 0);
    showroomGroup.add(charRig.root);
    g.lobbyCharacterRig = charRig;

    // Position Camera facing Character
    if (g.camera) {
      g.camera.position.set(0, 1.5, lobbyZoomRef.current);
      g.camera.lookAt(0, 1.2, 0);
    }
  };

  const updateLobbyPreview = (dt: number, g: any) => {
    if (!g.lobbyCharacterRig) return;
    const rig = g.lobbyCharacterRig;

    // Idle Breathing Kinematics
    const breath = Math.sin(g.elapsedTime * 2.2) * 0.015;
    rig.torsoGroup.position.y = 1.15 + breath;
    rig.headGroup.rotation.x = Math.sin(g.elapsedTime * 1.8) * 0.02;

    // Subtle idle arm & weapon sway
    rig.armRGroup.rotation.z = Math.sin(g.elapsedTime * 2.2) * 0.01;
    rig.armLGroup.rotation.z = -Math.sin(g.elapsedTime * 2.2) * 0.01;

    // Rotate character according to user drag
    rig.root.rotation.y = lobbyRotationRef.current;

    // Camera Zoom smoothly lerping
    if (g.camera) {
      const targetZ = lobbyZoomRef.current;
      g.camera.position.z += (targetZ - g.camera.position.z) * 0.1;
      g.camera.lookAt(0, 1.25, 0);
    }
  };

  // ============================================================================
  // BATTLEGROUND 3D WORLD BUILDER
  // ============================================================================
  const buildBattlegroundWorld = (scene: THREE.Scene, g: any, mapDef: MapDefinition) => {
    // 1. Procedural Terrain Mesh
    const terrainGeo = new THREE.PlaneGeometry(800, 800, 96, 96);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getY(i);
      pos.setZ(i, getTerrainHeight(vx, vz, mapDef.id));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: mapDef.terrainColors[0],
      roughness: 0.85,
      metalness: 0.1,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // 2. Military Structures, Hangars & Bunkers
    for (let b = 0; b < 12; b++) {
      const bx = (b % 4) * 65 - 95;
      const bz = Math.floor(b / 4) * 75 - 75;
      const by = getTerrainHeight(bx, bz, mapDef.id);

      const bGroup = new THREE.Group();
      bGroup.position.set(bx, by, bz);

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(16, 9, 22),
        new THREE.MeshStandardMaterial({ color: '#273344', roughness: 0.7 })
      );
      building.position.y = 4.5;
      building.castShadow = true;
      building.receiveShadow = true;
      bGroup.add(building);

      // Roof Antenna
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 6, 6),
        new THREE.MeshStandardMaterial({ color: '#ffd700' })
      );
      ant.position.set(0, 12, 0);
      bGroup.add(ant);

      scene.add(bGroup);
    }

    // 3. Foliage / Rocks
    for (let t = 0; t < 45; t++) {
      const tx = (Math.random() - 0.5) * 360;
      const tz = (Math.random() - 0.5) * 360;
      const ty = getTerrainHeight(tx, tz, mapDef.id);

      const tree = new THREE.Group();
      tree.position.set(tx, ty, tz);

      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.45, 4.5, 6),
        new THREE.MeshStandardMaterial({ color: '#3d2817' })
      );
      trunk.position.y = 2.25;
      tree.add(trunk);

      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(3.2, 7.5, 7),
        new THREE.MeshStandardMaterial({ color: '#1a3318' })
      );
      leaves.position.y = 6.2;
      leaves.castShadow = true;
      tree.add(leaves);

      scene.add(tree);
    }

    // 4. Tactical Vehicle
    const buggyGroup = new THREE.Group();
    buggyGroup.position.set(12, getTerrainHeight(12, 15, mapDef.id) + 0.4, 15);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.1, 4.2),
      new THREE.MeshStandardMaterial({ color: mapDef.vehicleColor, roughness: 0.5, metalness: 0.7 })
    );
    body.castShadow = true;
    buggyGroup.add(body);

    const wheelMat = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 });
    [
      [-1.3, -0.2, 1.4],
      [1.3, -0.2, 1.4],
      [-1.3, -0.2, -1.4],
      [1.3, -0.2, -1.4],
    ].forEach((wPos) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.42, 12), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wPos[0], wPos[1], wPos[2]);
      wheel.castShadow = true;
      buggyGroup.add(wheel);
    });

    scene.add(buggyGroup);
    g.vehicle.mesh = buggyGroup;

    // 5. C-130 Airplane
    const plane = new THREE.Group();
    plane.position.set(0, 120, -250);

    const fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.2, 28, 12),
      new THREE.MeshStandardMaterial({ color: '#2b3644', roughness: 0.6 })
    );
    fuselage.rotation.x = Math.PI / 2;
    fuselage.castShadow = true;
    plane.add(fuselage);

    const wings = new THREE.Mesh(
      new THREE.BoxGeometry(42, 0.45, 5.5),
      new THREE.MeshStandardMaterial({ color: '#1c2530' })
    );
    wings.position.set(0, 0.6, 2);
    plane.add(wings);

    scene.add(plane);
    g.airplane.mesh = plane;
    g.airplane.position.copy(plane.position);
  };

  // Safe Zone Storm Mesh
  const buildSafeZoneStorm = (scene: THREE.Scene, g: any) => {
    const stormWallGeo = new THREE.CylinderGeometry(220, 220, 90, 48, 1, true);
    const stormWallMat = new THREE.MeshBasicMaterial({
      color: '#00f0ff',
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      wireframe: false,
    });
    const stormWall = new THREE.Mesh(stormWallGeo, stormWallMat);
    stormWall.position.set(0, 45, 0);
    scene.add(stormWall);
    g.safeZone.stormRingMesh = stormWall;
  };

  // Player Operative Rig in Battlefield
  const buildPlayerOperative = (scene: THREE.Scene, g: any) => {
    const rig = buildRealisticHumanRig(appearance, false);
    rig.root.position.set(0, 120, -200);
    scene.add(rig.root);
    g.playerRig = rig;
  };

  // Loot Items
  const spawnMapLoot = (scene: THREE.Scene, g: any) => {
    const lootSpawns: {
      pos: THREE.Vector3;
      type: 'WEAPON' | 'MEDKIT' | 'ARMOR' | 'AMMO';
      wType?: WeaponType;
      name: string;
    }[] = [
      { pos: new THREE.Vector3(35, 0, -35), type: 'WEAPON', wType: 'SNIPER', name: 'AWM COVERT .338 (SNIPER)' },
      { pos: new THREE.Vector3(55, 0, -60), type: 'WEAPON', wType: 'SMG', name: 'VECTOR SUB-9 (SMG)' },
      { pos: new THREE.Vector3(-70, 0, -50), type: 'WEAPON', wType: 'SHOTGUN', name: 'SPAS-12 BREACHER (SHOTGUN)' },
      { pos: new THREE.Vector3(-40, 0, 30), type: 'WEAPON', wType: 'CARBINE', name: 'M4A1 TACTICAL (ASSAULT)' },
      { pos: new THREE.Vector3(15, 0, 18), type: 'MEDKIT', name: 'MILITARY MEDKIT (+75 HP)' },
      { pos: new THREE.Vector3(70, 0, 85), type: 'ARMOR', name: 'LEVEL 3 PLATE ARMOR (+100 AP)' },
      { pos: new THREE.Vector3(-15, 0, -10), type: 'AMMO', name: '5.56mm HIGH CAPACITY CRATE (+90)' },
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

  // Hostile Bots (19 Living Bots)
  const spawnHostileBots = (scene: THREE.Scene, g: any) => {
    const botCount = 19;
    const bots: EnemyBot[] = [];

    const weaponsList: WeaponType[] = ['CARBINE', 'SMG', 'SHOTGUN', 'SNIPER', 'PISTOL'];

    for (let i = 0; i < botCount; i++) {
      const angle = (i / botCount) * Math.PI * 2;
      const dist = 55 + (i % 4) * 35;
      const bx = Math.cos(angle) * dist + 20;
      const bz = Math.sin(angle) * dist - 30;
      const by = getTerrainHeight(bx, bz, g.mapId);

      const botWeapon = weaponsList[i % weaponsList.length];

      // Build High-Quality Human Rig for Enemy
      const botAppearance: CharacterAppearance = {
        gender: i % 3 === 0 ? 'FEMALE' : 'MALE',
        outfit: 'URBAN',
        headgear: i % 2 === 0 ? 'BERET' : 'HELMET',
        backpack: 'LVL2',
        lobbyWeapon: botWeapon,
      };

      const rig = buildRealisticHumanRig(botAppearance, true, i + 1);
      rig.root.position.set(bx, by, bz);

      const mLight = new THREE.PointLight('#ff3300', 0, 7);
      mLight.position.set(0.4, 1.25, 0.8);
      rig.root.add(mLight);

      // Floating HP Bar
      const hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.16),
        new THREE.MeshBasicMaterial({ color: '#ff0033', side: THREE.DoubleSide })
      );
      hpBar.position.set(0, 2.7, 0);
      rig.root.add(hpBar);
      rig.hpBarMesh = hpBar;

      scene.add(rig.root);

      bots.push({
        id: i + 1,
        name: `Opponent_${String(i + 1).padStart(2, '0')}`,
        rig,
        position: rig.root.position,
        velocity: new THREE.Vector3(),
        hp: 100,
        maxHp: 100,
        weapon: botWeapon,
        state: 'PATROL',
        patrolTarget: new THREE.Vector3(bx + (Math.random() - 0.5) * 40, by, bz + (Math.random() - 0.5) * 40),
        shootCooldown: 1.2 + Math.random(),
        walkCycle: 0,
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

    g.phase = 'PARACHUTE';
    setPhase('PARACHUTE');
    brAudio.playParachuteDeploy();

    if (g.playerRig) {
      g.playerRig.parachuteGroup.visible = true;
    }
  };

  const updateFreefallAndParachute = (dt: number, g: any) => {
    const p = g.player;
    const yaw = g.mouseLook.yaw;
    const glideSpeed = g.phase === 'PARACHUTE' ? 14 : 26;
    const terminalVelocity = g.phase === 'PARACHUTE' ? -7.5 : -42;

    p.velocity.y = Math.max(terminalVelocity, p.velocity.y - 12 * dt);
    if (g.phase === 'FREEFALL') {
      if (g.keys.w) {
        p.velocity.x = Math.sin(yaw) * glideSpeed;
        p.velocity.z = Math.cos(yaw) * glideSpeed;
      }
    } else {
      // Steerable Gliding
      const steerX = Math.sin(yaw) * glideSpeed;
      const steerZ = Math.cos(yaw) * glideSpeed;
      p.velocity.x += (steerX - p.velocity.x) * 0.1;
      p.velocity.z += (steerZ - p.velocity.z) * 0.1;
    }

    p.position.add(p.velocity.clone().multiplyScalar(dt));

    if (g.playerRig) {
      g.playerRig.root.position.copy(p.position);
      g.playerRig.root.rotation.y = yaw;
    }

    const camOffset = g.phase === 'PARACHUTE' ? 11 : 6;
    if (g.camera) {
      g.camera.position.set(
        p.position.x - Math.sin(yaw) * camOffset,
        p.position.y + 4.5,
        p.position.z - Math.cos(yaw) * camOffset
      );
      g.camera.lookAt(p.position);
    }

    setAltitudeMeters(Math.max(0, Math.round(p.position.y * 10)));
    setDescentSpeedKmh(Math.round(Math.abs(p.velocity.y) * 7.5));

    const groundY = getTerrainHeight(p.position.x, p.position.z, g.mapId);
    if (p.position.y <= groundY + 0.3) {
      p.position.y = groundY;
      p.velocity.set(0, 0, 0);
      p.onGround = true;

      if (g.playerRig) {
        g.playerRig.parachuteGroup.visible = false;
      }

      g.phase = 'PLAYING';
      setPhase('PLAYING');
      pushKillFeed('TOUCHDOWN CONFIRMED: Gear up and survive!');
    }
  };

  // ============================================================================
  // THIRD-PERSON PLAYER MOVEMENT & ANIMATIONS
  // ============================================================================
  const updatePlayerMovement = (dt: number, g: any) => {
    const p = g.player;
    const yaw = g.mouseLook.yaw;
    const pitch = g.mouseLook.pitch;

    if (p.inVehicle) {
      updateVehicleDriving(dt, g);
      return;
    }

    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const moveDir = new THREE.Vector3();

    if (g.keys.w) moveDir.add(fwd);
    if (g.keys.s) moveDir.sub(fwd);
    if (g.keys.d) moveDir.add(right);
    if (g.keys.a) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0;
    if (isMoving) moveDir.normalize();

    const speed = g.keys.shift ? 9.5 : 5.8;
    p.velocity.x = moveDir.x * speed;
    p.velocity.z = moveDir.z * speed;

    p.position.add(p.velocity.clone().multiplyScalar(dt));
    p.position.y = getTerrainHeight(p.position.x, p.position.z, g.mapId);

    // Update 3D Human Rig Kinematics
    if (g.playerRig) {
      const rig = g.playerRig;
      rig.root.position.copy(p.position);
      rig.root.rotation.y = yaw;

      // Realistic Walking Stride Kinematics
      if (isMoving) {
        p.walkCycle += dt * (g.keys.shift ? 16 : 10);
        const stride = Math.sin(p.walkCycle) * 0.7;
        rig.legLGroup.rotation.x = stride;
        rig.legRGroup.rotation.x = -stride;

        rig.armLGroup.rotation.x = -stride * 0.6;
        rig.armRGroup.rotation.x = 0.5 + stride * 0.2;

        rig.torsoGroup.position.y = 1.15 + Math.abs(Math.sin(p.walkCycle)) * 0.04;
      } else {
        // Natural Idle Breathing
        const breath = Math.sin(g.elapsedTime * 2.5) * 0.015;
        rig.torsoGroup.position.y = 1.15 + breath;
        rig.legLGroup.rotation.x = 0;
        rig.legRGroup.rotation.x = 0;

        // Weapon Holding Stance
        if (g.mouseLook.isAiming) {
          rig.armRGroup.rotation.x = 0.95;
          rig.armLGroup.rotation.x = 0.85;
        } else {
          rig.armRGroup.rotation.x = 0.45;
          rig.armLGroup.rotation.x = 0.35;
        }
      }
    }

    // Third-Person Over-the-Shoulder Camera with Aiming Zoom
    if (g.camera) {
      const targetFOV = g.mouseLook.isAiming ? p.currentWeapon.zoomFOV : 70;
      g.camera.fov += (targetFOV - g.camera.fov) * 0.18;
      g.camera.updateProjectionMatrix();

      const shoulderDist = g.mouseLook.isAiming ? 1.8 : 3.6;
      const shoulderHeight = g.mouseLook.isAiming ? 1.7 : 1.9;
      const shoulderSide = 0.65;

      const camX = p.position.x - Math.sin(yaw) * shoulderDist + Math.cos(yaw) * shoulderSide;
      const camZ = p.position.z - Math.cos(yaw) * shoulderDist - Math.sin(yaw) * shoulderSide;
      const camY = p.position.y + shoulderHeight + Math.sin(pitch) * 1.5;

      g.camera.position.set(camX, camY, camZ);
      g.camera.lookAt(
        p.position.x + Math.sin(yaw) * 35,
        p.position.y + 1.4 - pitch * 12,
        p.position.z + Math.cos(yaw) * 35
      );
    }

    // Check Loot Crates Interaction Prompt
    checkLootProximity(g);
  };

  // ============================================================================
  // WEAPON MANAGEMENT, FUNCTIONAL SWITCHING & FIRING (REQUIREMENT 2)
  // ============================================================================
  const switchWeapon = (newType: WeaponType) => {
    const g = gameRef.current;
    const p = g.player;
    if (p.reloading || p.currentWeapon.id === newType) return;

    // Save previous weapon's ammo
    const prevType = p.currentWeapon.id;
    const updatedInventory = {
      ...weaponsInventory,
      [prevType]: { clip: p.clip, reserve: p.reserve },
    };

    // Load new weapon's stats and ammo
    const newDef = WEAPON_REGISTRY[newType];
    const newAmmo = updatedInventory[newType] || { clip: newDef.clipSize, reserve: newDef.reserveMax };

    p.currentWeapon = newDef;
    p.clip = newAmmo.clip;
    p.reserve = newAmmo.reserve;

    setCurrentWeapon(newDef);
    setAmmoClip(newAmmo.clip);
    setAmmoReserve(newAmmo.reserve);
    setWeaponsInventory(updatedInventory);

    // Update 3D Weapon Model attached to character's hand!
    if (g.playerRig) {
      const rig = g.playerRig;
      if (rig.currentWeaponMesh) {
        rig.weaponAnchor.remove(rig.currentWeaponMesh);
      }
      const newMesh = build3DWeaponMesh(newType);
      rig.currentWeaponMesh = newMesh;
      rig.weaponAnchor.add(newMesh);
    }

    brAudio.playWeaponSwitch();
    pushKillFeed(`EQUIPPED: [${newDef.slotNumber}] ${newDef.name}`);
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
    setWeaponsInventory((prev) => ({
      ...prev,
      [p.currentWeapon.id]: { ...prev[p.currentWeapon.id], clip: p.clip },
    }));

    brAudio.playGunshot(p.currentWeapon.id);

    // Apply Recoil Kick
    g.mouseLook.pitch -= p.currentWeapon.recoil;

    if (!g.camera || !g.scene) return;

    // Pellets raycast loop (1 for standard guns, 8 for Shotgun)
    const pellets = p.currentWeapon.pelletCount;
    for (let pel = 0; pel < pellets; pel++) {
      const raycaster = new THREE.Raycaster();
      const spreadX = (Math.random() - 0.5) * p.currentWeapon.spread;
      const spreadY = (Math.random() - 0.5) * p.currentWeapon.spread;

      raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), g.camera);

      const hits = raycaster.intersectObjects(g.scene.children, true);
      let hitPoint = raycaster.ray.origin
        .clone()
        .add(raycaster.ray.direction.clone().multiplyScalar(p.currentWeapon.range));

      if (hits.length > 0) {
        for (let hit of hits) {
          if (hit.object !== g.playerRig?.root && !isChildOfObject(hit.object, g.playerRig?.root || null)) {
            hitPoint = hit.point;
            const struckBot = findBotFromMesh(hit.object, g.bots);
            if (struckBot && !struckBot.isDead) {
              damageBot(struckBot, p.currentWeapon.damage, g);
              setHitMarker(true);
              setTimeout(() => setHitMarker(false), 80);
            }
            break;
          }
        }
      }

      createTracer(p.position.clone().add(new THREE.Vector3(0, 1.35, 0)), hitPoint, g);
    }
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
      if (isChildOfObject(obj, b.rig.root)) return b;
    }
    return null;
  };

  const damageBot = (bot: EnemyBot, dmg: number, g: any) => {
    if (bot.isDead) return;
    bot.hp = Math.max(0, bot.hp - dmg);
    g.damageDealt += dmg;
    if (bot.hpBarMesh) {
      bot.hpBarMesh.scale.x = Math.max(0.01, bot.hp / bot.maxHp);
    }

    // Enemy Eliminated by Player
    if (bot.hp <= 0 && !bot.isDead) {
      bot.isDead = true;
      bot.state = 'DEAD';
      bot.velocity.set(0, 0, 0);

      // Trigger Realistic Death Collapse Animation
      if (bot.rig) {
        bot.rig.root.rotation.x = Math.PI / 2;
        bot.rig.root.position.y = 0.2;
      }
      if (bot.muzzleLight) bot.muzzleLight.intensity = 0;

      g.eliminationCount += 1;
      const newKills = g.eliminationCount;
      setKillsCount(newKills);

      const remaining = g.bots.filter((b: EnemyBot) => !b.isDead).length + 1;
      setAliveCount(remaining);

      // Play mandatory elimination chime
      brAudio.playEliminationBannerChime();

      // Show Mandatory Elimination HUD Banner
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

      // Victory Condition: Last Player Alive!
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
    brAudio.playReload();

    setTimeout(() => {
      const needed = p.currentWeapon.clipSize - p.clip;
      const take = Math.min(needed, p.reserve);
      p.clip += take;
      p.reserve -= take;
      p.reloading = false;
      setAmmoClip(p.clip);
      setAmmoReserve(p.reserve);
      setWeaponsInventory((prev) => ({
        ...prev,
        [p.currentWeapon.id]: { clip: p.clip, reserve: p.reserve },
      }));
      setIsReloading(false);
    }, p.currentWeapon.reloadTime * 1000);
  };

  // ============================================================================
  // RELIABLE SAFE-ZONE STORM SYSTEM (REQUIREMENT 1 FIX)
  // ============================================================================
  const updateSafeZoneStorm = (dt: number, g: any) => {
    const sz = g.safeZone;
    sz.shrinkTimer -= dt;
    setSafeZoneTime(Math.max(0, Math.round(sz.shrinkTimer)));

    if (sz.radius > sz.targetRadius) {
      sz.radius -= dt * 2.4;
      sz.center.lerp(sz.targetCenter, 0.005);
    }

    if (sz.shrinkTimer <= 0) {
      sz.currentStage += 1;
      setSafeZonePhase(sz.currentStage);
      sz.shrinkTimer = 60;
      sz.targetRadius = Math.max(25, sz.targetRadius * 0.55);
      sz.targetCenter.set((Math.random() - 0.5) * 65, (Math.random() - 0.5) * 65);
      brAudio.playStormWarning();
      pushKillFeed(`⚠️ STORM CONTRACTING: Safe Zone contracting to Phase ${sz.currentStage}!`);
    }

    // Update 3D Visual Storm Mesh
    if (sz.stormRingMesh) {
      sz.stormRingMesh.position.set(sz.center.x, 45, sz.center.y);
      sz.stormRingMesh.scale.set(sz.radius / 220, 1, sz.radius / 220);
    }

    // Configurable Safe-Zone Damage Rate (Phase scaled)
    const currentDPS = sz.baseDPS + (sz.currentStage - 1) * 4;

    // Reliable Periodic Damage Tick Accumulator (every 1.0s)
    sz.damageTickTimer += dt;
    const isTick = sz.damageTickTimer >= 1.0;
    if (isTick) {
      sz.damageTickTimer = 0;
    }

    // 1. Player Safe Zone Evaluation
    const playerDist = new THREE.Vector2(g.player.position.x, g.player.position.z).distanceTo(sz.center);
    const playerOutside = playerDist > sz.radius;
    setIsOutsideSafeZone(playerOutside);

    if (playerOutside && isTick) {
      if (g.player.armor > 0) {
        g.player.armor = Math.max(0, g.player.armor - currentDPS * 0.65);
        setPlayerArmor(Math.round(g.player.armor));
      } else {
        g.player.hp = Math.max(0, g.player.hp - currentDPS);
        setPlayerHp(Math.round(g.player.hp));
      }
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 100);

      if (g.player.hp <= 0) {
        triggerDefeat(g, 'Fell to the Storm Barrier');
        return;
      }
    }

    // 2. Hostile Bot Safe Zone Evaluation (Fix for Requirement 1)
    if (isTick) {
      g.bots.forEach((b: EnemyBot) => {
        if (b.isDead) return;

        const botDist = new THREE.Vector2(b.position.x, b.position.z).distanceTo(sz.center);
        const botOutside = botDist > sz.radius;

        // Inside safe-zone: DO NOT receive zone damage!
        if (!botOutside) return;

        // Outside safe-zone: apply damage periodically until health reaches 0
        b.hp = Math.max(0, b.hp - currentDPS);
        if (b.hpBarMesh) {
          b.hpBarMesh.scale.x = Math.max(0.01, b.hp / b.maxHp);
        }

        // Eliminate bot immediately when health reaches zero
        if (b.hp <= 0 && !b.isDead) {
          b.isDead = true;
          b.state = 'DEAD';
          b.velocity.set(0, 0, 0);

          // Collapse bot and remove from combat
          if (b.rig) {
            b.rig.root.rotation.x = Math.PI / 2;
            b.rig.root.position.y = 0.2;
          }
          if (b.muzzleLight) b.muzzleLight.intensity = 0;

          // Decrement remaining alive counter
          const remaining = g.bots.filter((bot: EnemyBot) => !bot.isDead).length + 1;
          setAliveCount(remaining);

          // Notify elimination in killfeed
          pushKillFeed(`☣️ ${b.name} was eliminated by the Storm Barrier!`);

          // Victory condition check
          if (remaining === 1 && g.player.hp > 0) {
            triggerVictory(g);
          }
        }
      });
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
        b.rig.root.lookAt(p.position.x, b.position.y, p.position.z);
        b.shootCooldown -= dt;
        if (b.shootCooldown <= 0) {
          b.shootCooldown = 1.1 + Math.random() * 0.8;
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
          b.patrolTarget.set(
            b.position.x + (Math.random() - 0.5) * 50,
            0,
            b.position.z + (Math.random() - 0.5) * 50
          );
        } else {
          toTarget.normalize();
          b.position.add(toTarget.multiplyScalar(3.2 * dt));
          b.position.y = getTerrainHeight(b.position.x, b.position.z, g.mapId);
          b.rig.root.position.copy(b.position);
          b.rig.root.rotation.y = Math.atan2(-toTarget.x, -toTarget.z);

          // Stride kinematics for bots
          b.walkCycle += dt * 8;
          b.rig.legLGroup.rotation.x = Math.sin(b.walkCycle) * 0.6;
          b.rig.legRGroup.rotation.x = -Math.sin(b.walkCycle) * 0.6;
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

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const cx = cvs.width / 2;
    const cy = cvs.height / 2;
    const mapScale = 0.28;

    // Radar Background
    ctx.fillStyle = '#08101a';
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Safe Zone Ring
    const sx = cx + g.safeZone.center.x * mapScale;
    const sy = cy + g.safeZone.center.y * mapScale;
    const sr = g.safeZone.radius * mapScale;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(4, sr), 0, Math.PI * 2);
    ctx.stroke();

    // Hostile Bots Dots
    ctx.fillStyle = '#ff3344';
    g.bots.forEach((b: EnemyBot) => {
      if (b.isDead) return;
      const bx = cx + (b.position.x - g.player.position.x) * mapScale;
      const by = cy + (b.position.z - g.player.position.z) * mapScale;
      if (Math.hypot(bx - cx, by - cy) < cx - 6) {
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Player Marker
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  const checkLootProximity = (g: any) => {
    let nearLoot: LootItem | null = null;
    for (let item of g.lootItems) {
      if (!item.pickedUp && item.position.distanceTo(g.player.position) < 3.2) {
        nearLoot = item;
        break;
      }
    }

    if (nearLoot) {
      setInteractPrompt(`[E] PICK UP ${nearLoot.name}`);
      if (g.keys.e) {
        nearLoot.pickedUp = true;
        g.scene.remove(nearLoot.mesh);
        brAudio.playLootPickup();
        pushKillFeed(`ACQUIRED: ${nearLoot.name}`);

        if (nearLoot.type === 'WEAPON' && nearLoot.weaponType) {
          switchWeapon(nearLoot.weaponType);
        } else if (nearLoot.type === 'MEDKIT') {
          g.player.hp = Math.min(100, g.player.hp + 75);
          setPlayerHp(g.player.hp);
        } else if (nearLoot.type === 'ARMOR') {
          g.player.armor = 100;
          setPlayerArmor(100);
        } else if (nearLoot.type === 'AMMO') {
          g.player.reserve += 90;
          setAmmoReserve(g.player.reserve);
        }
        g.keys.e = false;
      }
    } else {
      setInteractPrompt(null);
    }
  };

  const updateVehicleDriving = (dt: number, g: any) => {
    const v = g.vehicle;
    const accel = 22;
    if (g.keys.w) v.speed = Math.min(110, v.speed + accel * dt);
    else if (g.keys.s) v.speed = Math.max(-30, v.speed - accel * dt);
    else v.speed *= 0.95;

    if (g.keys.a) v.yaw += 1.8 * dt;
    if (g.keys.d) v.yaw -= 1.8 * dt;

    const fwd = new THREE.Vector3(Math.sin(v.yaw), 0, Math.cos(v.yaw));
    v.position.add(fwd.multiplyScalar(v.speed * 0.28 * dt));
    v.position.y = getTerrainHeight(v.position.x, v.position.z, g.mapId) + 0.4;

    if (v.mesh) {
      v.mesh.position.copy(v.position);
      v.mesh.rotation.y = v.yaw;
    }

    g.player.position.copy(v.position);
    if (g.playerRig) g.playerRig.root.position.copy(v.position);

    setVehicleSpeedKmh(Math.round(Math.abs(v.speed)));
    brAudio.setVehicleEngine(true, Math.abs(v.speed) / 110);

    if (g.camera) {
      g.camera.position.set(
        v.position.x - Math.sin(v.yaw) * 6.5,
        v.position.y + 3.2,
        v.position.z - Math.cos(v.yaw) * 6.5
      );
      g.camera.lookAt(v.position);
    }

    if (g.keys.e) exitVehicle();
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
    brAudio.setVehicleEngine(false);
    g.keys.e = false;
  };

  // Match End Handlers
  const triggerVictory = (g: any) => {
    g.phase = 'VICTORY';
    setPhase('VICTORY');
    brAudio.playVictoryFanfare();

    const xpEarned = 750 + g.eliminationCount * 120;
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

    const remaining = g.bots.filter((b: EnemyBot) => !b.isDead).length + 1;
    const xpEarned = 150 + g.eliminationCount * 60;

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

  // ============================================================================
  // INPUT CONTROLS SETUP
  // ============================================================================
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
        else if (g.phase === 'FREEFALL') deployParachute();
      }
      if (k === 'e') g.keys.e = true;
      if (k === 'r') reloadWeapon();
      if (k === 'm') setShowFullMap((m) => !m);

      // Weapon Switching via Number Keys 1 - 5
      if (k === '1') switchWeapon('CARBINE');
      if (k === '2') switchWeapon('SMG');
      if (k === '3') switchWeapon('SHOTGUN');
      if (k === '4') switchWeapon('SNIPER');
      if (k === '5') switchWeapon('PISTOL');
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
      if (g.phase === 'LOBBY') {
        isDraggingLobbyRef.current = true;
        lastMouseXRef.current = e.clientX;
      } else if (g.phase === 'PLAYING') {
        if (!document.pointerLockElement) canvas.requestPointerLock?.();
        if (e.button === 0) {
          g.isFiring = true;
          fireWeapon();
        } else if (e.button === 2) {
          g.mouseLook.isAiming = !g.mouseLook.isAiming;
          setIsAiming(g.mouseLook.isAiming);
        }
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (g.phase === 'LOBBY') {
        isDraggingLobbyRef.current = false;
      } else if (g.phase === 'PLAYING') {
        if (e.button === 0) g.isFiring = false;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (g.phase === 'LOBBY' && isDraggingLobbyRef.current) {
        const deltaX = e.clientX - lastMouseXRef.current;
        lastMouseXRef.current = e.clientX;
        lobbyRotationRef.current += deltaX * 0.012;
      } else if (g.phase === 'PLAYING') {
        if (document.pointerLockElement === canvas) {
          g.mouseLook.yaw -= e.movementX * 0.0022;
          g.mouseLook.pitch -= e.movementY * 0.0022;
          g.mouseLook.pitch = Math.max(-0.6, Math.min(0.85, g.mouseLook.pitch));
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (g.phase === 'LOBBY') {
        lobbyZoomRef.current = Math.max(2.8, Math.min(6.5, lobbyZoomRef.current + e.deltaY * 0.003));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', onWheel);
  };

  // Match Flow Transitions
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />

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
            cursor: phase === 'PLAYING' ? 'crosshair' : phase === 'LOBBY' ? 'grab' : 'default',
          }}
        />

        {/* Damage Red Screen Flash */}
        {damageFlash && <View style={styles.damageFlashOverlay} pointerEvents="none" />}

        {/* Storm Purple Vignette */}
        {isOutsideSafeZone && <View style={styles.stormVignette} pointerEvents="none" />}

        {/* Elimination Banner HUD */}
        {eliminationBanner.visible && (
          <View style={styles.eliminationBannerContainer} pointerEvents="none">
            <View style={styles.eliminationBannerCard}>
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
        {/* PUBG-INSPIRED 3D CHARACTER LOBBY SCREEN (PHASE: LOBBY) */}
        {/* ==================================================================== */}
        {phase === 'LOBBY' && (
          <View style={styles.lobbyOverlay} pointerEvents="box-none">
            {/* Top Navigation Bar & Profile */}
            <View style={styles.lobbyHeader}>
              <View style={styles.profileBadge}>
                <View style={styles.profileAvatarCircle}>
                  <Text style={styles.profileAvatarText}>🎖</Text>
                </View>
                <View>
                  <Text style={styles.profileCallsign}>{dashboard.callsign}</Text>
                  <Text style={styles.profileRank}>
                    {dashboard.rankTitle} • LVL {dashboard.level}
                  </Text>
                </View>
              </View>

              {/* Lobby Tabs */}
              <View style={styles.lobbyTabsRow}>
                {(['PLAY', 'CUSTOMIZE', 'ARSENAL', 'DASHBOARD', 'SETTINGS'] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.lobbyTabBtn, lobbyTab === tab && styles.lobbyTabBtnActive]}
                    onPress={() => setLobbyTab(tab)}
                  >
                    <Text style={[styles.lobbyTabBtnText, lobbyTab === tab && styles.lobbyTabBtnTextActive]}>
                      {tab === 'PLAY'
                        ? '⚔️ BATTLE'
                        : tab === 'CUSTOMIZE'
                        ? '👤 OPERATOR'
                        : tab === 'ARSENAL'
                        ? '🔫 ARSENAL'
                        : tab === 'DASHBOARD'
                        ? '📊 CAREER'
                        : '⚙️ SETTINGS'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.exitToHubBtn} onPress={() => navigation?.navigate?.('Home')}>
                <Text style={styles.exitToHubBtnText}>‹ HUB</Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: BATTLE READY & DEPLOYMENT */}
            {lobbyTab === 'PLAY' && (
              <View style={styles.lobbyBottomPanel}>
                <View style={styles.lobbyMatchConfigCard}>
                  <Text style={styles.lobbySectionTitle}>BATTLEGROUND & MODE</Text>
                  <View style={styles.lobbyMapPreviewRow}>
                    <TouchableOpacity
                      style={styles.selectedMapBadge}
                      onPress={() => setPhase('MAP_SELECT')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.selectedMapLabel}>THEATRE MAP:</Text>
                      <Text style={styles.selectedMapName}>🗺 {FOUR_MAPS[selectedMapId].name}</Text>
                      <Text style={styles.selectedMapSub}>[CLICK TO CHANGE MAP]</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.selectedModeBadge}
                      onPress={() => setGameMode((m) => (m === 'SOLO_BR' ? 'RANKED_TAC' : 'SOLO_BR'))}
                    >
                      <Text style={styles.selectedMapLabel}>MODE:</Text>
                      <Text style={styles.selectedModeName}>
                        {gameMode === 'SOLO_BR' ? '★ SOLO BATTLE ROYALE' : '★ RANKED HARDCORE'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.deployMatchBtn}
                    onPress={startMatchDeployment}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.deployMatchBtnText}>▶ START MATCH (AIRPLANE DROP)</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.lobbyRotationHint}>
                  <Text style={styles.lobbyRotationHintText}>
                    💡 DRAG WITH MOUSE TO ROTATE CHARACTER 360° | SCROLL TO ZOOM
                  </Text>
                </View>
              </View>
            )}

            {/* TAB 2: 3D CHARACTER CUSTOMIZATION STUDIO */}
            {lobbyTab === 'CUSTOMIZE' && (
              <View style={styles.customizationStudioCard}>
                <Text style={styles.studioHeaderTitle}>TACTICAL OPERATOR CUSTOMIZATION</Text>

                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                  {/* Gender Selector */}
                  <Text style={styles.studioCategoryTitle}>OPERATOR GENDER</Text>
                  <View style={styles.pillSelectorRow}>
                    {(['MALE', 'FEMALE'] as const).map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.pillBtn, appearance.gender === g && styles.pillBtnActive]}
                        onPress={() => updateAppearance({ gender: g })}
                      >
                        <Text style={[styles.pillBtnText, appearance.gender === g && styles.pillBtnTextActive]}>
                          {g === 'MALE' ? '♂ MALE OPERATOR' : '♀ FEMALE OPERATOR'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Outfits Selector */}
                  <Text style={styles.studioCategoryTitle}>TACTICAL UNIFORM</Text>
                  <View style={styles.gridOptionsContainer}>
                    {Object.entries(OUTFIT_DEFINITIONS).map(([id, o]) => {
                      const isSel = appearance.outfit === id;
                      return (
                        <TouchableOpacity
                          key={id}
                          style={[styles.optionCard, isSel && styles.optionCardActive]}
                          onPress={() => updateAppearance({ outfit: id as OutfitId })}
                        >
                          <Text style={[styles.optionCardTitle, isSel && { color: o.accentColor }]}>{o.name}</Text>
                          <Text style={styles.optionCardTag}>{o.tag}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Headgear Selector */}
                  <Text style={styles.studioCategoryTitle}>BALLISTIC HEADGEAR</Text>
                  <View style={styles.gridOptionsContainer}>
                    {Object.entries(HEADGEAR_DEFINITIONS).map(([id, h]) => {
                      const isSel = appearance.headgear === id;
                      return (
                        <TouchableOpacity
                          key={id}
                          style={[styles.optionCard, isSel && styles.optionCardActive]}
                          onPress={() => updateAppearance({ headgear: id as HeadgearId })}
                        >
                          <Text style={[styles.optionCardTitle, isSel && { color: '#00f0ff' }]}>{h.name}</Text>
                          <Text style={styles.optionCardTag}>{h.tag}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Backpack Selector */}
                  <Text style={styles.studioCategoryTitle}>TACTICAL BACKPACK</Text>
                  <View style={styles.gridOptionsContainer}>
                    {Object.entries(BACKPACK_DEFINITIONS).map(([id, b]) => {
                      const isSel = appearance.backpack === id;
                      return (
                        <TouchableOpacity
                          key={id}
                          style={[styles.optionCard, isSel && styles.optionCardActive]}
                          onPress={() => updateAppearance({ backpack: id as BackpackId })}
                        >
                          <Text style={[styles.optionCardTitle, isSel && { color: '#ffd700' }]}>{b.name}</Text>
                          <Text style={styles.optionCardTag}>{b.capacity}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* TAB 3: 5 FUNCTIONAL WEAPONS ARSENAL */}
            {lobbyTab === 'ARSENAL' && (
              <View style={styles.customizationStudioCard}>
                <Text style={styles.studioHeaderTitle}>ARMORY: 5 FUNCTIONAL WEAPONS</Text>
                <Text style={styles.studioHeaderSub}>
                  Select weapon to preview in operator's hands & review ballistic telemetry
                </Text>

                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                  {Object.values(WEAPON_REGISTRY).map((w) => {
                    const isSel = appearance.lobbyWeapon === w.id;
                    return (
                      <TouchableOpacity
                        key={w.id}
                        style={[styles.arsenalCard, isSel && { borderColor: w.color, backgroundColor: 'rgba(255,255,255,0.06)' }]}
                        onPress={() => {
                          updateAppearance({ lobbyWeapon: w.id });
                          switchWeapon(w.id);
                        }}
                      >
                        <View style={styles.arsenalCardHeader}>
                          <Text style={[styles.arsenalSlotPill, { backgroundColor: w.color }]}>
                            SLOT [{w.slotNumber}]
                          </Text>
                          <Text style={styles.arsenalCategoryText}>{w.category}</Text>
                        </View>
                        <Text style={[styles.arsenalName, { color: isSel ? w.color : '#fff' }]}>{w.name}</Text>
                        <Text style={styles.arsenalDesc}>{w.desc}</Text>

                        <View style={styles.arsenalStatsRow}>
                          <Text style={styles.arsenalStat}>DMG: <Text style={{ color: '#ff3344' }}>{w.damage}</Text></Text>
                          <Text style={styles.arsenalStat}>MAG: <Text style={{ color: '#00f0ff' }}>{w.clipSize}</Text></Text>
                          <Text style={styles.arsenalStat}>RATE: <Text style={{ color: '#ffd700' }}>{w.fireRate}s</Text></Text>
                          <Text style={styles.arsenalStat}>RANGE: <Text style={{ color: '#a855f7' }}>{w.range}m</Text></Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* TAB 4: CAREER DASHBOARD */}
            {lobbyTab === 'DASHBOARD' && (
              <View style={styles.customizationStudioCard}>
                <Text style={styles.studioHeaderTitle}>CAREER PROFILE & STATS</Text>

                <View style={styles.dashboardGrid}>
                  <View style={styles.dashMetric}>
                    <Text style={styles.dashMetricVal}>{dashboard.totalMatches}</Text>
                    <Text style={styles.dashMetricLbl}>MATCHES</Text>
                  </View>
                  <View style={styles.dashMetric}>
                    <Text style={[styles.dashMetricVal, { color: '#ffd700' }]}>{dashboard.totalWins}</Text>
                    <Text style={styles.dashMetricLbl}>VICTORIES</Text>
                  </View>
                  <View style={styles.dashMetric}>
                    <Text style={[styles.dashMetricVal, { color: '#ff3344' }]}>{dashboard.totalKills}</Text>
                    <Text style={styles.dashMetricLbl}>TOTAL KILLS</Text>
                  </View>
                  <View style={styles.dashMetric}>
                    <Text style={[styles.dashMetricVal, { color: '#00f0ff' }]}>
                      {(dashboard.totalKills / Math.max(1, dashboard.totalDeaths)).toFixed(2)}
                    </Text>
                    <Text style={styles.dashMetricLbl}>K/D RATIO</Text>
                  </View>
                </View>

                <Text style={[styles.studioCategoryTitle, { marginTop: 16 }]}>RECENT MATCH HISTORY</Text>
                <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                  {dashboard.recentMatches.map((m, idx) => (
                    <View key={idx} style={styles.historyRow}>
                      <Text style={[styles.historyPlace, { color: m.won ? '#ffd700' : '#fff' }]}>
                        #{m.placement}
                      </Text>
                      <Text style={styles.historyMap}>{m.mapName}</Text>
                      <Text style={styles.historyKills}>🔥 {m.kills} KILLS</Text>
                      <Text style={styles.historyTime}>⏱ {Math.floor(m.survivalTimeSec / 60)}m</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* TAB 5: GRAPHICS & AUDIO SETTINGS */}
            {lobbyTab === 'SETTINGS' && (
              <View style={styles.customizationStudioCard}>
                <Text style={styles.studioHeaderTitle}>SYSTEM CONFIGURATION</Text>

                <Text style={styles.studioCategoryTitle}>GRAPHICS PRESET</Text>
                <View style={styles.pillSelectorRow}>
                  {(['LOW', 'MED', 'HIGH'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.pillBtn, graphicsPreset === g && styles.pillBtnActive]}
                      onPress={() => setGraphicsPreset(g)}
                    >
                      <Text style={[styles.pillBtnText, graphicsPreset === g && styles.pillBtnTextActive]}>
                        {g} PERFORMANCE
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.studioCategoryTitle}>AUDIO CONTROLS</Text>
                <TouchableOpacity
                  style={[styles.pillBtn, { marginTop: 8 }]}
                  onPress={() => (brAudio.enabled = !brAudio.enabled)}
                >
                  <Text style={styles.pillBtnText}>
                    SOUND EFFECTS: {brAudio.enabled ? '🔊 ENABLED' : '🔇 MUTED'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ==================================================================== */}
        {/* FOUR LARGE MAPS SELECTOR MODAL */}
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

              <TouchableOpacity style={styles.primaryBtn} onPress={() => setPhase('LOBBY')}>
                <Text style={styles.primaryBtnText}>✓ CONFIRM THEATRE ({FOUR_MAPS[selectedMapId].name})</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* AIRPLANE & FREEFALL INSERTION OVERLAY */}
        {/* ==================================================================== */}
        {(phase === 'AIRPLANE' || phase === 'FREEFALL' || phase === 'PARACHUTE') && (
          <View style={styles.airborneOverlay} pointerEvents="box-none">
            <View style={styles.altimeterCard}>
              <Text style={styles.altimeterTitle}>ALTIMETER TELEMETRY</Text>
              <Text style={styles.altitudeText}>{altitudeMeters}m</Text>
              <Text style={styles.descentSpeedText}>DESCENT: {descentSpeedKmh} KM/H</Text>
            </View>

            {phase === 'AIRPLANE' && (
              <TouchableOpacity style={styles.jumpBtn} onPress={jumpFromAircraft} activeOpacity={0.85}>
                <Text style={styles.jumpBtnText}>🪂 PRESS [SPACE] TO JUMP FROM PLANE</Text>
              </TouchableOpacity>
            )}

            {phase === 'FREEFALL' && (
              <TouchableOpacity style={styles.jumpBtn} onPress={deployParachute} activeOpacity={0.85}>
                <Text style={styles.jumpBtnText}>🪂 PRESS [SPACE] TO DEPLOY PARACHUTE</Text>
              </TouchableOpacity>
            )}

            {phase === 'PARACHUTE' && (
              <View style={styles.glidingBanner}>
                <Text style={styles.glidingBannerText}>
                  STEERING PARACHUTE GLIDE TO GROUND LZ... [WASD TO STEER]
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ==================================================================== */}
        {/* IN-GAME COMBAT HUD (PHASE: PLAYING) */}
        {/* ==================================================================== */}
        {phase === 'PLAYING' && (
          <View style={styles.hudOverlay} pointerEvents="box-none">
            {/* Top Bar: Compass, Storm Timer, Alive Count */}
            <View style={styles.hudTopRow}>
              <View style={styles.hudLeftStats}>
                <View style={styles.hudAliveBadge}>
                  <Text style={styles.hudAliveText}>ALIVE: {aliveCount}</Text>
                  <Text style={styles.hudKillsText}>KILLS: {killsCount}</Text>
                </View>
              </View>

              <View style={styles.safeZoneBanner}>
                <Text style={styles.safeZonePhaseText}>
                  STORM: {Math.floor(safeZoneTime / 60)}:{String(safeZoneTime % 60).padStart(2, '0')} (PHASE {safeZonePhase})
                </Text>
                {isOutsideSafeZone && (
                  <Text style={styles.safeZoneWarningText}>⚠️ OUTSIDE SAFE ZONE! TAKING DAMAGE!</Text>
                )}
              </View>

              <View style={styles.minimapContainer}>
                <canvas
                  ref={minimapCanvasRef}
                  width={140}
                  height={140}
                  style={{ width: 140, height: 140, borderRadius: 70 }}
                />
              </View>
            </View>

            {/* Kill Feed Notification Box */}
            <View style={styles.killFeedBox} pointerEvents="none">
              {killFeed.map((msg, idx) => (
                <Text key={idx} style={styles.killFeedText}>
                  {msg}
                </Text>
              ))}
            </View>

            {/* Reticle / Sniper Scope Overlay */}
            {isAiming && currentWeapon.id === 'SNIPER' ? (
              <View style={styles.sniperScopeOverlay} pointerEvents="none">
                <View style={styles.scopeCrosshairV} />
                <View style={styles.scopeCrosshairH} />
                <View style={styles.scopeCenterDot} />
              </View>
            ) : (
              <View style={styles.reticleContainer} pointerEvents="none">
                <View style={[styles.reticleDot, hitMarker && styles.reticleHit]} />
              </View>
            )}

            {/* Interaction Prompt */}
            {interactPrompt && (
              <View style={styles.interactContainer} pointerEvents="none">
                <Text style={styles.interactText}>{interactPrompt}</Text>
              </View>
            )}

            {/* Driving Telemetry */}
            {isDriving && (
              <View style={styles.drivingTelemetryCard}>
                <Text style={styles.drivingSpeedText}>{vehicleSpeedKmh} KM/H</Text>
                <Text style={styles.drivingHintText}>[E] EXIT VEHICLE | [WASD] DRIVE</Text>
              </View>
            )}

            {/* Bottom HUD: Health, Armor, Weapon Slots & Ammo */}
            <View style={styles.hudBottomRow}>
              {/* Health & Armor Bars */}
              <View style={styles.vitalsCard}>
                <View style={styles.vitalBarRow}>
                  <Text style={styles.vitalLabel}>HP</Text>
                  <View style={styles.vitalTrack}>
                    <View style={[styles.vitalFill, { width: `${playerHp}%`, backgroundColor: '#ff3344' }]} />
                  </View>
                  <Text style={styles.vitalVal}>{playerHp}</Text>
                </View>

                <View style={styles.vitalBarRow}>
                  <Text style={styles.vitalLabel}>AP</Text>
                  <View style={styles.vitalTrack}>
                    <View style={[styles.vitalFill, { width: `${playerArmor}%`, backgroundColor: '#00f0ff' }]} />
                  </View>
                  <Text style={styles.vitalVal}>{playerArmor}</Text>
                </View>
              </View>

              {/* 5 Weapon Slots Quick-Select Switcher */}
              <View style={styles.weaponSlotsContainer}>
                {Object.values(WEAPON_REGISTRY).map((w) => {
                  const isCurrent = currentWeapon.id === w.id;
                  const ammo = weaponsInventory[w.id];
                  return (
                    <TouchableOpacity
                      key={w.id}
                      style={[styles.weaponSlotBtn, isCurrent && { borderColor: w.color, backgroundColor: 'rgba(255,255,255,0.14)' }]}
                      onPress={() => switchWeapon(w.id)}
                    >
                      <Text style={[styles.weaponSlotNum, isCurrent && { color: w.color }]}>[{w.slotNumber}]</Text>
                      <Text style={[styles.weaponSlotName, isCurrent && { color: '#fff' }]}>{w.name.split(' ')[0]}</Text>
                      <Text style={styles.weaponSlotAmmo}>
                        {ammo ? `${ammo.clip}/${ammo.reserve}` : '--'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Active Weapon Ammo & Status */}
              <View style={styles.ammoCard}>
                <Text style={styles.ammoWeaponCategory}>{currentWeapon.category}</Text>
                <Text style={[styles.ammoWeaponName, { color: currentWeapon.color }]}>
                  {currentWeapon.name}
                </Text>
                <Text style={styles.ammoNumbers}>
                  {ammoClip} <Text style={styles.ammoReserveText}>/ {ammoReserve}</Text>
                </Text>
                {isReloading && <Text style={styles.reloadingText}>RELOADING...</Text>}
              </View>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* MATCH END MODALS: VICTORY & DEFEAT (REQUIREMENT 6) */}
        {/* ==================================================================== */}
        {/* VICTORY MODAL */}
        <Modal visible={phase === 'VICTORY'} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { borderColor: '#ffd700' }]}>
              <Text style={[styles.modalTitle, { color: '#ffd700' }]}>🏆 WINNER WINNER 🏆</Text>
              <Text style={styles.modalSubTitle}>CHICKEN DINNER!</Text>
              <Text style={styles.modalMapName}>MAP: {endMatchStats.mapName}</Text>

              <View style={styles.endStatsGrid}>
                <View style={styles.endStatBox}>
                  <Text style={styles.endStatVal}>#1</Text>
                  <Text style={styles.endStatLbl}>PLACEMENT</Text>
                </View>
                <View style={styles.endStatBox}>
                  <Text style={[styles.endStatVal, { color: '#ffd700' }]}>{endMatchStats.kills}</Text>
                  <Text style={styles.endStatLbl}>ELIMINATIONS</Text>
                </View>
                <View style={styles.endStatBox}>
                  <Text style={styles.endStatVal}>{endMatchStats.damage}</Text>
                  <Text style={styles.endStatLbl}>DAMAGE</Text>
                </View>
                <View style={styles.endStatBox}>
                  <Text style={[styles.endStatVal, { color: '#00ff66' }]}>+{endMatchStats.xpEarned}</Text>
                  <Text style={styles.endStatLbl}>XP EARNED</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#ffd700' }]}
                onPress={startMatchDeployment}
              >
                <Text style={[styles.primaryBtnText, { color: '#000' }]}>PLAY AGAIN ↻</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('LOBBY')}>
                <Text style={styles.secondaryBtnText}>‹ RETURN TO LOBBY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* DEFEAT MODAL */}
        <Modal visible={phase === 'GAMEOVER'} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { borderColor: '#ff3344' }]}>
              <Text style={[styles.modalTitle, { color: '#ff3344' }]}>BETTER LUCK NEXT TIME</Text>
              <Text style={styles.modalSubTitle}>ELIMINATED IN BATTLE</Text>
              <Text style={styles.modalMapName}>MAP: {endMatchStats.mapName}</Text>

              <View style={styles.endStatsGrid}>
                <View style={styles.endStatBox}>
                  <Text style={styles.endStatVal}>#{endMatchStats.placement}</Text>
                  <Text style={styles.endStatLbl}>RANK</Text>
                </View>
                <View style={styles.endStatBox}>
                  <Text style={[styles.endStatVal, { color: '#ff3344' }]}>{endMatchStats.kills}</Text>
                  <Text style={styles.endStatLbl}>KILLS</Text>
                </View>
                <View style={styles.endStatBox}>
                  <Text style={styles.endStatVal}>{endMatchStats.damage}</Text>
                  <Text style={styles.endStatLbl}>DAMAGE</Text>
                </View>
                <View style={styles.endStatBox}>
                  <Text style={[styles.endStatVal, { color: '#00ff66' }]}>+{endMatchStats.xpEarned}</Text>
                  <Text style={styles.endStatLbl}>XP EARNED</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={startMatchDeployment}>
                <Text style={styles.primaryBtnText}>RETRY MATCH ↻</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setPhase('LOBBY')}>
                <Text style={styles.secondaryBtnText}>‹ RETURN TO LOBBY</Text>
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
  container: { flex: 1, backgroundColor: '#050711' },
  canvasContainer: { flex: 1, position: 'relative', width: '100%', height: '100%' },

  // Screen Overlays
  damageFlashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.45)',
    zIndex: 40,
  },
  stormVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 26,
    borderColor: 'rgba(168, 85, 247, 0.65)',
    zIndex: 35,
  },

  // Elimination Banner HUD
  eliminationBannerContainer: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  eliminationBannerCard: {
    width: 380,
    backgroundColor: 'rgba(10, 18, 32, 0.95)',
    borderWidth: 2,
    borderColor: '#ff3344',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#ff3344',
    shadowRadius: 24,
    shadowOpacity: 0.8,
  },
  eliminationTitle: { color: '#ff3344', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  eliminationVictim: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 2 },
  eliminationTelemetryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  eliminationKillsText: { color: '#ffd700', fontSize: 12, fontWeight: '800' },
  eliminationDivider: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  eliminationRemainingText: { color: '#00f0ff', fontSize: 12, fontWeight: '800' },

  // PUBG 3D Character Lobby Styles
  lobbyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    justifyContent: 'space-between',
    zIndex: 20,
  },
  lobbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 18, 32, 0.85)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  profileBadge: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00f0ff',
  },
  profileAvatarText: { fontSize: 18 },
  profileCallsign: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  profileRank: { color: '#ffd700', fontSize: 11, fontWeight: '700' },

  lobbyTabsRow: { flexDirection: 'row', gap: 6 },
  lobbyTabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  lobbyTabBtnActive: {
    backgroundColor: '#00f0ff',
  },
  lobbyTabBtnText: { color: '#a0aec0', fontSize: 12, fontWeight: '800' },
  lobbyTabBtnTextActive: { color: '#000', fontWeight: '900' },

  exitToHubBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  exitToHubBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '800' },

  lobbyBottomPanel: {
    alignItems: 'center',
    gap: 12,
  },
  lobbyMatchConfigCard: {
    width: '100%',
    maxWidth: 620,
    backgroundColor: 'rgba(10, 18, 32, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  lobbySectionTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  lobbyMapPreviewRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginVertical: 12,
  },
  selectedMapBadge: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: '#00f0ff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  selectedModeBadge: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: '#ffd700',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  selectedMapLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700' },
  selectedMapName: { color: '#00f0ff', fontSize: 14, fontWeight: '900', marginTop: 2 },
  selectedMapSub: { color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 2 },
  selectedModeName: { color: '#ffd700', fontSize: 14, fontWeight: '900', marginTop: 2 },

  deployMatchBtn: {
    width: '100%',
    backgroundColor: '#00f0ff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#00f0ff',
    shadowRadius: 16,
    shadowOpacity: 0.6,
  },
  deployMatchBtnText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  lobbyRotationHint: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  lobbyRotationHintText: { color: '#00f0ff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  // Customization Studio Card
  customizationStudioCard: {
    position: 'absolute',
    right: 20,
    top: 85,
    width: 380,
    backgroundColor: 'rgba(10, 18, 32, 0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderRadius: 16,
    padding: 16,
    zIndex: 25,
  },
  studioHeaderTitle: { color: '#00f0ff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  studioHeaderSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2, marginBottom: 10 },
  studioCategoryTitle: { color: '#ffd700', fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 12, marginBottom: 6 },
  pillSelectorRow: { flexDirection: 'row', gap: 8 },
  pillBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillBtnActive: { borderColor: '#00f0ff', backgroundColor: 'rgba(0, 240, 255, 0.15)' },
  pillBtnText: { color: '#a0aec0', fontSize: 11, fontWeight: '800' },
  pillBtnTextActive: { color: '#00f0ff' },

  gridOptionsContainer: { gap: 6 },
  optionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 10,
  },
  optionCardActive: { borderColor: '#00f0ff', backgroundColor: 'rgba(0, 240, 255, 0.12)' },
  optionCardTitle: { color: '#fff', fontSize: 12, fontWeight: '800' },
  optionCardTag: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },

  // Arsenal Cards
  arsenalCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  arsenalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  arsenalSlotPill: { color: '#000', fontSize: 10, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  arsenalCategoryText: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700' },
  arsenalName: { fontSize: 14, fontWeight: '900', marginTop: 4 },
  arsenalDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginVertical: 4 },
  arsenalStatsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  arsenalStat: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800' },

  // Dashboard Grid
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  dashMetric: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  dashMetricVal: { color: '#fff', fontSize: 18, fontWeight: '900' },
  dashMetricLbl: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', marginTop: 2 },

  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  historyPlace: { fontSize: 12, fontWeight: '900' },
  historyMap: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  historyKills: { color: '#ff3344', fontSize: 11, fontWeight: '700' },
  historyTime: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },

  // Airborne Overlay
  airborneOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 25,
  },
  altimeterCard: {
    backgroundColor: 'rgba(10, 18, 32, 0.85)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  altimeterTitle: { color: '#00f0ff', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  altitudeText: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 4 },
  descentSpeedText: { color: '#ffd700', fontSize: 13, fontWeight: '800', marginTop: 2 },
  jumpBtn: {
    backgroundColor: '#00f0ff',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: '#00f0ff',
    shadowRadius: 20,
    shadowOpacity: 0.8,
  },
  jumpBtnText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  glidingBanner: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 12, borderRadius: 10 },
  glidingBannerText: { color: '#00ff88', fontSize: 13, fontWeight: '800' },

  // In-Game Combat HUD Styles
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: 'space-between',
    zIndex: 15,
  },
  hudTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hudLeftStats: { gap: 6 },
  hudAliveBadge: {
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 10,
    padding: 10,
    minWidth: 140,
  },
  hudAliveText: { color: '#00f0ff', fontSize: 16, fontWeight: '900' },
  hudKillsText: { color: '#ffd700', fontSize: 13, fontWeight: '800', marginTop: 2 },

  safeZoneBanner: {
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 1.5,
    borderColor: '#ffd700',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  safeZonePhaseText: { color: '#ffd700', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  safeZoneWarningText: { color: '#ff3344', fontSize: 11, fontWeight: '900', marginTop: 2 },
  minimapContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00f0ff',
  },

  killFeedBox: { position: 'absolute', top: 180, right: 16, gap: 4, width: 280 },
  killFeedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },

  // Reticle & Scope
  reticleContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00f0ff' },
  reticleHit: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ff3344' },

  sniperScopeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeCrosshairV: { width: 2, height: '100%', backgroundColor: '#00f0ff', opacity: 0.75 },
  scopeCrosshairH: { position: 'absolute', width: '100%', height: 2, backgroundColor: '#00f0ff', opacity: 0.75 },
  scopeCenterDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#ff3344' },

  interactContainer: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 18, 32, 0.9)',
    borderWidth: 1.5,
    borderColor: '#00ff88',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  interactText: { color: '#00ff88', fontSize: 14, fontWeight: '900', letterSpacing: 1 },

  drivingTelemetryCard: {
    position: 'absolute',
    bottom: 140,
    right: 16,
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  drivingSpeedText: { color: '#00f0ff', fontSize: 20, fontWeight: '900' },
  drivingHintText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },

  // Bottom HUD: Health, Slots, Ammo
  hudBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 },
  vitalsCard: {
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderRadius: 12,
    padding: 12,
    width: 220,
    gap: 6,
  },
  vitalBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vitalLabel: { color: '#fff', fontSize: 11, fontWeight: '900', width: 22 },
  vitalTrack: { flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' },
  vitalFill: { height: '100%', borderRadius: 5 },
  vitalVal: { color: '#fff', fontSize: 11, fontWeight: '900', width: 28, textAlign: 'right' },

  weaponSlotsContainer: { flexDirection: 'row', gap: 6 },
  weaponSlotBtn: {
    backgroundColor: 'rgba(10, 18, 32, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    minWidth: 54,
  },
  weaponSlotNum: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900' },
  weaponSlotName: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '800', marginTop: 1 },
  weaponSlotAmmo: { color: '#00f0ff', fontSize: 9, fontWeight: '700', marginTop: 2 },

  ammoCard: {
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderRadius: 12,
    padding: 12,
    width: 170,
    alignItems: 'flex-end',
  },
  ammoWeaponCategory: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800' },
  ammoWeaponName: { fontSize: 14, fontWeight: '900', marginTop: 1 },
  ammoNumbers: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 2 },
  ammoReserveText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  reloadingText: { color: '#ffd700', fontSize: 10, fontWeight: '900', marginTop: 2 },

  // Menu Cards & General Modals
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 17, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 30,
  },
  menuCard: {
    width: '100%',
    backgroundColor: 'rgba(10, 18, 32, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.5)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#00f0ff',
    shadowRadius: 28,
    shadowOpacity: 0.5,
  },
  menuBadgeText: { color: '#00f0ff', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  menuTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 1.5, marginTop: 4 },
  menuSubTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', marginBottom: 14 },

  mapOptionCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  mapCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapBadgePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  mapBadgeText: { color: '#000', fontSize: 10, fontWeight: '900' },
  mapDurationText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' },
  mapCardTitle: { fontSize: 16, fontWeight: '900', marginTop: 4 },
  mapCardTagline: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700' },
  mapCardDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginVertical: 4 },
  mapCardVehicle: { fontSize: 11, fontWeight: '800' },

  primaryBtn: {
    width: '100%',
    backgroundColor: '#00f0ff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryBtnText: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  secondaryBtn: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Match Results Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#0a1220',
    borderWidth: 2,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 24, fontWeight: '900', letterSpacing: 1.5 },
  modalSubTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', marginTop: 2 },
  modalMapName: { color: '#00f0ff', fontSize: 12, fontWeight: '800', marginTop: 4 },
  endStatsGrid: { flexDirection: 'row', width: '100%', gap: 10, marginVertical: 18 },
  endStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  endStatVal: { color: '#fff', fontSize: 18, fontWeight: '900' },
  endStatLbl: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', marginTop: 2 },
});
