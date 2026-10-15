import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
  Modal,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as THREE from 'three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ERANGEL_MAP_BASE64 } from '../utils/erangel_assets';

// ============================================================================
// GAME FLOW & MAP DEFINITIONS (ERANGEL & THEMED MAPS)
// ============================================================================
export type GameFlowPhase =
  | 'LOBBY'
  | 'MAP_SELECT'
  | 'AIRPLANE'
  | 'FREEFALL'
  | 'PARACHUTE'
  | 'PLAYING'
  | 'PAUSED'
  | 'VICTORY'
  | 'GAMEOVER';

export type MapId = 'ERANGEL' | 'DESERT_MIRAMAR' | 'FROZEN_VIKENDI' | 'NEON_LIVIK';
export type GameModeId = 'SOLO_BR' | 'ARENA_TDM' | 'ICEMIRE_FRONTIER';

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
  vehicleName: string;
  vehicleColor: string;
}

type SquadCandidate = {
  id: string;
  name: string;
  level: number;
  status: 'ONLINE' | 'IN MATCH';
  region: string;
};

const SQUAD_DIRECTORY: SquadCandidate[] = [
  { id: 'nova-21', name: 'NOVA-21', level: 42, status: 'ONLINE', region: 'India' },
  { id: 'atlas-88', name: 'ATLAS-88', level: 57, status: 'ONLINE', region: 'Asia' },
  { id: 'echo-viper', name: 'ECHO VIPER', level: 31, status: 'IN MATCH', region: 'India' },
  { id: 'sable-09', name: 'SABLE-09', level: 65, status: 'ONLINE', region: 'Asia' },
];

export const FOUR_MAPS: Record<MapId, MapDefinition> = {
  ERANGEL: {
    id: 'ERANGEL',
    name: 'IRONHAVEN ISLE',
    tagline: 'COASTAL CITIES & A FORGOTTEN NAVAL BASE',
    desc: 'A sprawling coastal battleground with weathered towns, a naval installation, shipping docks, a hilltop academy, and two contested sea bridges.',
    duration: '25-30 MINS',
    badge: '★ SIGNATURE MAP ★',
    accentColor: '#ffd700',
    skyGradient: ['#38bdf8', '#7dd3fc', '#bae6fd'],
    fogColor: '#93c5fd',
    fogDensity: 0.0035,
    sunColor: '#fffbeb',
    vehicleName: 'UAZ 4x4 TACTICAL JEEP',
    vehicleColor: '#2f3e2b',
  },
  DESERT_MIRAMAR: {
    id: 'DESERT_MIRAMAR',
    name: 'ASHFALL RIDGE',
    tagline: 'ARID BADLANDS & DUST-STORM OUTPOSTS',
    desc: 'A scorched desert of sandstone bluffs, abandoned compounds, fuel depots, and exposed long-range ridgelines.',
    duration: '25-30 MINS',
    badge: '★ SNIPER HAVEN ★',
    accentColor: '#eab308',
    skyGradient: ['#42280e', '#7c5324', '#fef08a'],
    fogColor: '#451a03',
    fogDensity: 0.004,
    sunColor: '#fef3c7',
    vehicleName: 'MIRADO DESERT COUPE',
    vehicleColor: '#b45309',
  },
  FROZEN_VIKENDI: {
    id: 'FROZEN_VIKENDI',
    name: 'FROSTLINE VALLEY',
    tagline: 'SNOW PEAKS & ABANDONED RELAY STATIONS',
    desc: 'Snow-covered pine slopes, frozen lakes, a silent relay station, and a crumbling mountain fortress.',
    duration: '20-25 MINS',
    badge: '★ EXTREME COLD ★',
    accentColor: '#38bdf8',
    skyGradient: ['#0f172a', '#1e293b', '#e2e8f0'],
    fogColor: '#1e293b',
    fogDensity: 0.005,
    sunColor: '#f0f9ff',
    vehicleName: 'SNOWMOBILE CRAWLER',
    vehicleColor: '#0284c7',
  },
  NEON_LIVIK: {
    id: 'NEON_LIVIK',
    name: 'VERDANT REACH',
    tagline: 'RAPID OPERATIONS IN THE HIGHLANDS',
    desc: 'A fast-moving highland theatre with geothermal springs, dense villages, and tight close-quarters routes.',
    duration: '12-15 MINS',
    badge: '★ FAST PACED ★',
    accentColor: '#10b981',
    skyGradient: ['#064e3b', '#047857', '#6ee7b7'],
    fogColor: '#064e3b',
    fogDensity: 0.0045,
    sunColor: '#ecfdf5',
    vehicleName: 'MONSTER TRUCK',
    vehicleColor: '#059669',
  },
};

// ============================================================================
// CHARACTER SKINS & OUTFITS (INCLUDING "THE FOOL" JOKER & GLACIER M416)
// ============================================================================
export type SkinSetId = 'THE_FOOL_JOKER' | 'GLACIER_WARRIOR' | 'PHARAOH_GOLDEN' | 'BLOOD_RAVEN' | 'TACTICAL_BLACK';

export interface SkinSetDefinition {
  id: SkinSetId;
  name: string;
  tag: string;
  rarity: 'MYTHIC' | 'LEGENDARY' | 'ULTIMATE';
  rarityColor: string;
  faceType: 'CLOWN_JOKER' | 'MASK' | 'HUMAN_MALE' | 'HUMAN_FEMALE';
  coatColor: string;
  pinstripePants: boolean;
  pantsColor: string;
  cummerbundColor: string;
  hairStyle: 'JESTER_PIGTAILS' | 'HOOD' | 'BUZZ' | 'CROWN';
  hairColor: string;
  weaponSkin: 'GLACIER_M416' | 'GOLDEN_M416' | 'SHADOW_AWM' | 'CLASSIC_M4A1';
  hasTailcoat: boolean;
}

export const SKIN_DEFINITIONS: Record<SkinSetId, SkinSetDefinition> = {
  THE_FOOL_JOKER: {
    id: 'THE_FOOL_JOKER',
    name: 'NOMAD RECON SET',
    tag: 'FIELD-TESTED OPERATOR',
    rarity: 'LEGENDARY',
    rarityColor: '#84cc16',
    faceType: 'HUMAN_MALE',
    coatColor: '#465346',
    pinstripePants: false,
    pantsColor: '#2b332c',
    cummerbundColor: '#65725e',
    hairStyle: 'BUZZ',
    hairColor: '#20170f',
    weaponSkin: 'CLASSIC_M4A1',
    hasTailcoat: false,
  },
  GLACIER_WARRIOR: {
    id: 'GLACIER_WARRIOR',
    name: 'ARCTIC WARDEN SET',
    tag: 'SUB-ZERO RESPONSE',
    rarity: 'MYTHIC',
    rarityColor: '#00f0ff',
    faceType: 'MASK',
    coatColor: '#0284c7',
    pinstripePants: false,
    pantsColor: '#0369a1',
    cummerbundColor: '#38bdf8',
    hairStyle: 'HOOD',
    hairColor: '#e0f2fe',
    weaponSkin: 'GLACIER_M416',
    hasTailcoat: false,
  },
  PHARAOH_GOLDEN: {
    id: 'PHARAOH_GOLDEN',
    name: 'DUNE SENTINEL SET',
    tag: 'DESERT COMMAND',
    rarity: 'ULTIMATE',
    rarityColor: '#ffd700',
    faceType: 'MASK',
    coatColor: '#d97706',
    pinstripePants: false,
    pantsColor: '#b45309',
    cummerbundColor: '#06b6d4',
    hairStyle: 'CROWN',
    hairColor: '#ffd700',
    weaponSkin: 'GOLDEN_M416',
    hasTailcoat: true,
  },
  BLOOD_RAVEN: {
    id: 'BLOOD_RAVEN',
    name: 'NIGHTFALL OPERATOR SET',
    tag: 'STEALTH ASSAULT',
    rarity: 'ULTIMATE',
    rarityColor: '#ef4444',
    faceType: 'MASK',
    coatColor: '#450a0a',
    pinstripePants: false,
    pantsColor: '#1c1917',
    cummerbundColor: '#dc2626',
    hairStyle: 'HOOD',
    hairColor: '#991b1b',
    weaponSkin: 'SHADOW_AWM',
    hasTailcoat: true,
  },
  TACTICAL_BLACK: {
    id: 'TACTICAL_BLACK',
    name: 'URBAN STRIKE OPERATOR',
    tag: 'SPECIAL OPERATIONS',
    rarity: 'LEGENDARY',
    rarityColor: '#a855f7',
    faceType: 'HUMAN_MALE',
    coatColor: '#2f3b4c',
    pinstripePants: false,
    pantsColor: '#232c3a',
    cummerbundColor: '#46536b',
    hairStyle: 'BUZZ',
    hairColor: '#26221e',
    weaponSkin: 'CLASSIC_M4A1',
    hasTailcoat: false,
  },
};

// ============================================================================
// FIVE FUNCTIONAL WEAPONS (WITH GLACIER M416 AS ICONIC AR)
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
    name: 'AR-47 AURORA',
    category: 'ASSAULT RIFLE',
    slotNumber: 1,
    damage: 38,
    clipSize: 40,
    reserveMax: 180,
    fireRate: 0.10,
    isAutomatic: true,
    pelletCount: 1,
    range: 150,
    spread: 0.016,
    recoil: 0.012,
    zoomFOV: 50,
    reloadTime: 1.5,
    color: '#00f0ff',
    desc: 'A stable modular carbine with an insulated receiver, compact optic, and controllable recoil.',
  },
  SMG: {
    id: 'SMG',
    name: 'VECTOR SUB-9',
    category: 'SUBMACHINE GUN',
    slotNumber: 2,
    damage: 24,
    clipSize: 35,
    reserveMax: 210,
    fireRate: 0.065,
    isAutomatic: true,
    pelletCount: 1,
    range: 85,
    spread: 0.035,
    recoil: 0.008,
    zoomFOV: 55,
    reloadTime: 1.2,
    color: '#ec4899',
    desc: 'Extreme cyclic rate 9mm SMG. Melts opponents in close-quarters compound breach.',
  },
  SHOTGUN: {
    id: 'SHOTGUN',
    name: 'S12K BREACHER',
    category: 'TACTICAL SHOTGUN',
    slotNumber: 3,
    damage: 18, // 18 * 8 pellets = 144 max point-blank damage
    clipSize: 8,
    reserveMax: 48,
    fireRate: 0.65,
    isAutomatic: false,
    pelletCount: 8,
    range: 45,
    spread: 0.08,
    recoil: 0.04,
    zoomFOV: 58,
    reloadTime: 2.0,
    color: '#f97316',
    desc: 'Semi-automatic 12-gauge magazine shotgun. 8 high-velocity buckshot pellets per trigger pull.',
  },
  SNIPER: {
    id: 'SNIPER',
    name: 'LONGWATCH .338',
    category: 'SNIPER RIFLE',
    slotNumber: 4,
    damage: 120,
    clipSize: 5,
    reserveMax: 25,
    fireRate: 1.25,
    isAutomatic: false,
    pelletCount: 1,
    range: 300,
    spread: 0.001,
    recoil: 0.065,
    zoomFOV: 20, // 8x Zoom Scope
    reloadTime: 2.4,
    color: '#ffd700',
    desc: 'The most powerful airdrop bolt-action rifle. Lethal one-shot headshot through Level 3 helmets.',
  },
  PISTOL: {
    id: 'PISTOL',
    name: 'P92 COMBAT 9mm',
    category: 'SIDEARM',
    slotNumber: 5,
    damage: 30,
    clipSize: 15,
    reserveMax: 60,
    fireRate: 0.20,
    isAutomatic: false,
    pelletCount: 1,
    range: 60,
    spread: 0.028,
    recoil: 0.018,
    zoomFOV: 58,
    reloadTime: 1.0,
    color: '#94a3b8',
    desc: 'Reliable secondary pistol. Lightning draw speed and rapid single-tap fire.',
  },
};

// ============================================================================
// REALISTIC CHARACTER RIG & WEAPON MESH BUILDERS
// ============================================================================
export interface HumanRig {
  root: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  armLGroup: THREE.Group;
  armRGroup: THREE.Group;
  handRGroup: THREE.Group;
  legLGroup: THREE.Group;
  legRGroup: THREE.Group;
  weaponAnchor: THREE.Group;
  currentWeaponMesh: THREE.Group | null;
  hpBarMesh?: THREE.Mesh;
}

export interface EnemyBot {
  id: number;
  name: string;
  squadId: number;
  rig: HumanRig;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  hp: number;
  maxHp: number;
  weapon: WeaponType;
  state: 'PATROL' | 'ALERT' | 'CHASE' | 'ATTACK' | 'COVER' | 'DEAD';
  patrolTarget: THREE.Vector3;
  shootCooldown: number;
  healCooldown: number;
  walkCycle: number;
  isDead: boolean;
  muzzleLight: THREE.PointLight | null;
  hpBarMesh: THREE.Mesh;
  markerGroup?: THREE.Group;
}

// Builds the Glacier M416 (Translucent crystalline ice model with glowing blue frost shaders)
export const buildGlacierM416Mesh = (): THREE.Group => {
  const gun = new THREE.Group();

  const iceCrystalMat = new THREE.MeshStandardMaterial({
    color: '#7ee3ff',
    emissive: '#00ccff',
    emissiveIntensity: 0.45,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.88,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#111827',
    roughness: 0.3,
    metalness: 0.85,
  });
  const frostAccentMat = new THREE.MeshStandardMaterial({
    color: '#e0f7ff',
    roughness: 0.2,
  });

  // Ice Crystal Upper & Lower Receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.44), iceCrystalMat);
  gun.add(receiver);

  // Muzzle & Ice Shrouded Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.42, 8), darkMetalMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, 0.42);
  gun.add(barrel);

  // Ice Spikes / Icicles along handguard
  for (let sp = 0; sp < 4; sp++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.09, 5), iceCrystalMat);
    spike.position.set((sp % 2 === 0 ? 0.04 : -0.04), -0.06, 0.22 + sp * 0.07);
    spike.rotation.x = Math.PI;
    gun.add(spike);
  }

  // Translucent Ice Mag
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.12), iceCrystalMat);
  mag.position.set(0, -0.16, 0.08);
  mag.rotation.x = 0.18;
  gun.add(mag);

  // Frost Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.26), frostAccentMat);
  stock.position.set(0, -0.01, -0.32);
  gun.add(stock);

  // Optical Sight with glowing cyan reticle
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.14), darkMetalMat);
  sight.position.set(0, 0.11, 0.04);
  gun.add(sight);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 8), iceCrystalMat);
  lens.position.set(0, 0.11, 0.11);
  gun.add(lens);

  return gun;
};

// Generic / Distinct 3D Weapon Model Builder
export const buildWeaponModelMesh = (type: WeaponType, skin: string): THREE.Group => {
  if (type === 'CARBINE' && skin === 'GLACIER_M416') {
    return buildGlacierM416Mesh();
  }

  const group = new THREE.Group();
  const gunMetalMat = new THREE.MeshStandardMaterial({ color: '#1a202c', roughness: 0.28, metalness: 0.85 });
  const polymerMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.65 });
  const oliveMat = new THREE.MeshStandardMaterial({ color: '#365314', roughness: 0.72 });
  const goldBrassMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3, metalness: 0.85 });

  if (type === 'CARBINE') {
    // M416 Tactical Assault Rifle
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.14, 0.38), gunMetalMat);
    group.add(receiver);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.36), gunMetalMat);
    rail.position.set(0, 0.08, 0.02);
    group.add(rail);
    // EOTech Holographic Optic Sight
    const holoHood = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.065, 0.12), polymerMat);
    holoHood.position.set(0, 0.12, 0.04);
    group.add(holoHood);
    const holoLens = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.01), new THREE.MeshBasicMaterial({ color: '#ef4444' }));
    holoLens.position.set(0, 0.12, 0.09);
    group.add(holoLens);
    // Fluted barrel & birdcage flash hider
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), gunMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.4);
    group.add(barrel);
    const flashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.07, 8), gunMetalMat);
    flashHider.rotation.x = Math.PI / 2;
    flashHider.position.set(0, 0.02, 0.63);
    group.add(flashHider);
    // Vertical combat foregrip
    const foregrip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), polymerMat);
    foregrip.position.set(0, -0.09, 0.32);
    group.add(foregrip);
    // Curved 30-round STANAG magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.24, 0.1), gunMetalMat);
    mag.position.set(0, -0.15, 0.08);
    mag.rotation.x = 0.18;
    group.add(mag);
    // Tactical crane stock
    const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 8), gunMetalMat);
    bufferTube.rotation.x = Math.PI / 2;
    bufferTube.position.set(0, 0.02, -0.28);
    group.add(bufferTube);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.13, 0.18), polymerMat);
    stock.position.set(0, -0.01, -0.36);
    group.add(stock);
  } else if (type === 'SNIPER') {
    // AWM Heavy Magnum Sniper Rifle
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.15, 0.68), oliveMat);
    group.add(stock);
    const cheekRest = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.05, 0.18), polymerMat);
    cheekRest.position.set(0, 0.09, -0.2);
    group.add(cheekRest);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.95, 8), gunMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, 0.78);
    group.add(barrel);
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.11), gunMetalMat);
    brake.position.set(0, 0.03, 1.28);
    group.add(brake);
    // 8x Sniper Scope
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.42, 12), gunMetalMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.15, 0.1);
    group.add(scopeTube);
    const scopeLens = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 8), new THREE.MeshBasicMaterial({ color: '#10b981' }));
    scopeLens.position.set(0, 0.15, 0.31);
    group.add(scopeLens);
    const boltHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.09, 6), goldBrassMat);
    boltHandle.rotation.z = Math.PI / 2;
    boltHandle.position.set(0.08, 0.06, -0.06);
    group.add(boltHandle);
    const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), goldBrassMat);
    boltKnob.position.set(0.13, 0.06, -0.06);
    group.add(boltKnob);
  } else if (type === 'SMG') {
    // Vector High-Rate SMG
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.2, 0.36), polymerMat);
    group.add(receiver);
    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.18, 8), gunMetalMat);
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, 0.02, 0.26);
    group.add(shroud);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.32, 0.07), gunMetalMat);
    mag.position.set(0, -0.19, 0.04);
    group.add(mag);
    const reflex = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.08), gunMetalMat);
    reflex.position.set(0, 0.13, 0.04);
    group.add(reflex);
    const reflexDot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), new THREE.MeshBasicMaterial({ color: '#22c55e' }));
    reflexDot.position.set(0, 0.13, 0.08);
    group.add(reflexDot);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.12, 0.24), polymerMat);
    stock.position.set(0, 0.01, -0.28);
    group.add(stock);
  } else if (type === 'SHOTGUN') {
    // S12K Semi-Auto Tactical Shotgun
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.34), gunMetalMat);
    group.add(receiver);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.52, 8), gunMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, 0.38);
    group.add(barrel);
    const heatShield = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.32), gunMetalMat);
    heatShield.position.set(0, 0.08, 0.32);
    group.add(heatShield);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.22, 0.12), polymerMat);
    mag.position.set(0, -0.16, 0.08);
    mag.rotation.x = 0.12;
    group.add(mag);
  } else {
    // Desert Eagle .50 AE Handgun
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.085, 0.26), gunMetalMat);
    group.add(slide);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.17, 0.085), polymerMat);
    grip.position.set(0, -0.09, -0.05);
    grip.rotation.x = -0.28;
    group.add(grip);
    const underRail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.12), polymerMat);
    underRail.position.set(0, -0.04, 0.06);
    group.add(underRail);
  }

  return group;
};

// 3D Parachute Canopy Model (BGMI/PUBG arched tactical parachute)
export const buildParachuteCanopyMesh = (): THREE.Group => {
  const canopyGroup = new THREE.Group();
  const canopyMatOrange = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.65, side: THREE.DoubleSide });
  const canopyMatWhite = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.7, side: THREE.DoubleSide });

  for (let i = 0; i < 5; i++) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.08, 4.2),
      i % 2 === 0 ? canopyMatOrange : canopyMatWhite
    );
    const x = (i - 2) * 1.55;
    const archY = -Math.pow((i - 2) * 0.45, 2);
    panel.position.set(x, archY, 0);
    panel.rotation.z = -(i - 2) * 0.12;
    panel.castShadow = true;
    canopyGroup.add(panel);
  }

  // Suspension lines connecting down to harness
  const lineMat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.65 });
  [-3.2, -1.6, 1.6, 3.2].forEach((lx) => {
    [-1.8, 1.8].forEach((lz) => {
      const pts = [
        new THREE.Vector3(lx, -0.6, lz),
        new THREE.Vector3(lx > 0 ? 0.35 : -0.35, -4.2, 0)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, lineMat);
      canopyGroup.add(line);
    });
  });

  canopyGroup.position.set(0, 4.5, 0);
  return canopyGroup;
};

// Builds a realistic, grounded tactical operator with authentic equipment, NVG helmet, backpack, and armor.
export const buildTheFoolJokerRig = (skinDef: SkinSetDefinition, isEnemy: boolean = false): HumanRig => {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinDef.faceType === 'HUMAN_FEMALE' ? '#b97958' : '#9c654b',
    roughness: 0.75,
  });
  const uniformMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? '#1e1b4b' : skinDef.coatColor,
    roughness: 0.82,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? '#7f1d1d' : skinDef.cummerbundColor,
    roughness: 0.55,
    metalness: 0.22,
  });
  const trouserMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? '#0f172a' : skinDef.pantsColor,
    roughness: 0.86,
  });
  const shoesMat = new THREE.MeshStandardMaterial({
    color: '#09090b',
    roughness: 0.3,
    metalness: 0.7,
  });
  const glovesMat = new THREE.MeshStandardMaterial({
    color: '#18181b',
    roughness: 0.55,
  });
  const padMat = new THREE.MeshStandardMaterial({
    color: '#09090b',
    roughness: 0.35,
    metalness: 0.65,
  });

  // 1. Torso, plate carrier, backpack, radio and MOLLE utility pouches.
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.15, 0);
  root.add(torsoGroup);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.44), uniformMat);
  chest.castShadow = true;
  torsoGroup.add(chest);

  // Rounded shoulders + tapered pelvis break up the boxy silhouette
  [-0.4, 0.4].forEach((sx) => {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.125, 10, 8), uniformMat);
    shoulder.position.set(sx, 0.3, 0);
    shoulder.scale.set(1, 0.9, 1);
    torsoGroup.add(shoulder);
  });

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.34, 0.4), trouserMat);
  pelvis.position.set(0, -0.5, 0);
  torsoGroup.add(pelvis);

  const plateCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.58, 0.12), plateMat);
  plateCarrier.position.set(0, 0.02, 0.26);
  torsoGroup.add(plateCarrier);

  // Triple STANAG Magazine Pouches
  [-0.2, 0, 0.2].forEach((x) => {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.08), plateMat);
    pouch.position.set(x, -0.18, 0.37);
    torsoGroup.add(pouch);
  });

  // Comms Radio with Whip Antenna
  const radio = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.07), new THREE.MeshStandardMaterial({ color: '#1a2024', roughness: 0.6 }));
  radio.position.set(-0.34, 0.16, 0.24);
  torsoGroup.add(radio);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 6), new THREE.MeshStandardMaterial({ color: '#09090b' }));
  antenna.position.set(-0.34, 0.38, 0.24);
  torsoGroup.add(antenna);

  // Tactical Combat Backpack mounted on back
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.54, 0.24), new THREE.MeshStandardMaterial({ color: isEnemy ? '#1f2937' : '#292524', roughness: 0.75 }));
  backpack.position.set(0, 0.05, -0.32);
  backpack.castShadow = true;
  torsoGroup.add(backpack);

  const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.44, 8), new THREE.MeshStandardMaterial({ color: '#44403c', roughness: 0.85 }));
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, 0.36, -0.32);
  torsoGroup.add(bedroll);

  // 2. Head, ballistic helmet, NVG goggles, and comms headset.
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.74, 0);
  torsoGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), skinMat);
  head.scale.set(1.0, 1.25, 1.1);
  head.castShadow = true;
  headGroup.add(head);

  // Human face: brow ridge, eyes with pupils — reads as a person, not a mannequin
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: '#e8e6e1', roughness: 0.35 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: '#1c1410', roughness: 0.25 });
  [-0.078, 0.078].forEach((ex) => {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), eyeWhiteMat);
    eyeWhite.position.set(ex, 0.055, 0.198);
    eyeWhite.scale.set(1.15, 0.85, 0.6);
    headGroup.add(eyeWhite);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.017, 6, 6), pupilMat);
    pupil.position.set(ex, 0.055, 0.225);
    headGroup.add(pupil);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.016, 0.02), new THREE.MeshStandardMaterial({ color: skinDef.hairColor, roughness: 0.8 }));
    brow.position.set(ex, 0.108, 0.208);
    brow.rotation.z = ex < 0 ? 0.08 : -0.08;
    headGroup.add(brow);
  });

  // Buzz-cut hair cap visible under the helmet rim at the back
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.226, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
    new THREE.MeshStandardMaterial({ color: skinDef.hairColor, roughness: 0.9 })
  );
  hairCap.scale.set(1.0, 1.05, 1.05);
  hairCap.position.set(0, 0.02, -0.035);
  hairCap.rotation.x = -0.55;
  headGroup.add(hairCap);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.075, 0.18, 8), skinMat);
  neck.position.set(0, 0.58, -0.01);
  torsoGroup.add(neck);

  // Tactical Balaclava Neck & Mask
  const balaclava = new THREE.Mesh(new THREE.SphereGeometry(0.225, 14, 10), new THREE.MeshStandardMaterial({ color: isEnemy ? '#1e1b4b' : '#18181b', roughness: 0.9 }));
  balaclava.scale.set(0.98, 0.9, 1.05);
  balaclava.position.set(0, -0.06, 0.02);
  headGroup.add(balaclava);

  // Ballistic Combat Helmet
  const helmetMat = new THREE.MeshStandardMaterial({ color: isEnemy ? '#dc2626' : '#202826', roughness: 0.45, metalness: 0.35 });
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.245, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), helmetMat);
  helmet.scale.set(1.04, 0.86, 1.08);
  helmet.position.y = 0.1;
  headGroup.add(helmet);

  // NVG Mount & Dual Night-Vision Optics
  const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.05), new THREE.MeshStandardMaterial({ color: '#09090b', metalness: 0.8 }));
  nvgMount.position.set(0, 0.17, 0.25);
  headGroup.add(nvgMount);

  [-0.05, 0.05].forEach((nx) => {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.12, 8), new THREE.MeshStandardMaterial({ color: '#18181b', metalness: 0.7 }));
    tube.rotation.x = Math.PI / 2;
    tube.position.set(nx, 0.17, 0.31);
    headGroup.add(tube);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: isEnemy ? '#ef4444' : '#10b981' }));
    lens.position.set(nx, 0.17, 0.37);
    headGroup.add(lens);
  });

  // Tactical Visor / Goggles
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.03), new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.8 }));
  visor.position.set(0, 0.06, 0.225);
  headGroup.add(visor);

  const headset = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.018, 6, 12, Math.PI), helmetMat);
  headset.rotation.y = Math.PI / 2;
  headset.position.z = -0.02;
  headGroup.add(headset);

  // 3. Arms, protective elbow pads and gloves.
  const armLGroup = new THREE.Group();
  armLGroup.position.set(-0.46, 0.28, 0);
  torsoGroup.add(armLGroup);

  const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.65, 8), uniformMat);
  sleeveL.position.set(0, -0.32, 0.12);
  sleeveL.rotation.x = 0.65;
  armLGroup.add(sleeveL);

  const elbowL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.07), padMat);
  elbowL.position.set(0, -0.32, -0.02);
  armLGroup.add(elbowL);

  const handL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.09), glovesMat);
  handL.position.set(0, -0.62, 0.26);
  armLGroup.add(handL);

  const armRGroup = new THREE.Group();
  armRGroup.position.set(0.46, 0.28, 0);
  torsoGroup.add(armRGroup);

  const sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.65, 8), uniformMat);
  sleeveR.position.set(0, -0.32, 0.12);
  sleeveR.rotation.x = 0.75;
  armRGroup.add(sleeveR);

  const elbowR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.07), padMat);
  elbowR.position.set(0, -0.32, -0.02);
  armRGroup.add(elbowR);

  const handRGroup = new THREE.Group();
  handRGroup.position.set(0, -0.62, 0.28);
  armRGroup.add(handRGroup);

  const handR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.09), glovesMat);
  handRGroup.add(handR);

  // Weapon socket
  const weaponAnchor = new THREE.Group();
  weaponAnchor.position.set(0.02, 0.02, 0.1);
  handRGroup.add(weaponAnchor);

  const carbine = buildWeaponModelMesh('CARBINE', skinDef.weaponSkin);
  weaponAnchor.add(carbine);

  // 4. Reinforced field trousers, knee pads, thigh holster and combat boots.
  const legLGroup = new THREE.Group();
  legLGroup.position.set(-0.2, -0.36, 0);
  torsoGroup.add(legLGroup);

  const pantLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.95, 8), trouserMat);
  pantLegL.position.set(0, -0.48, 0);
  legLGroup.add(pantLegL);

  const kneeL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.08), padMat);
  kneeL.position.set(0, -0.48, 0.1);
  legLGroup.add(kneeL);

  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.26), shoesMat);
  shoeL.position.set(0, -0.98, 0.06);
  legLGroup.add(shoeL);

  const legRGroup = new THREE.Group();
  legRGroup.position.set(0.2, -0.36, 0);
  torsoGroup.add(legRGroup);

  const pantLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.95, 8), trouserMat);
  pantLegR.position.set(0, -0.48, 0);
  legRGroup.add(pantLegR);

  const kneeR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.16, 0.08), padMat);
  kneeR.position.set(0, -0.48, 0.1);
  legRGroup.add(kneeR);

  // Drop-leg sidearm holster on right thigh
  const holster = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.12), new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.5 }));
  holster.position.set(0.15, -0.32, 0.02);
  legRGroup.add(holster);
  const sidearmGrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: '#27272a', metalness: 0.6 }));
  sidearmGrip.position.set(0.15, -0.18, -0.01);
  sidearmGrip.rotation.x = -0.3;
  legRGroup.add(sidearmGrip);

  const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.26), shoesMat);
  shoeR.position.set(0, -0.98, 0.06);
  legRGroup.add(shoeR);

  return {
    root,
    torsoGroup,
    headGroup,
    armLGroup,
    armRGroup,
    handRGroup,
    legLGroup,
    legRGroup,
    weaponAnchor,
    currentWeaponMesh: carbine,
  };
};

// ============================================================================
// MAIN COMPONENT: REALISTIC SHADOW STRIKE BATTLE ROYALE
// ============================================================================
const disposeSceneObject = (obj: any) => {
  if (!obj) return;
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m: any) => {
      Object.values(m).forEach((v: any) => {
        if (v && v.isTexture) v.dispose();
      });
      m.dispose();
    });
  }
};

export default function ShadowStrikeScreen({ navigation, profile, onLogout }: any) {
  const playerProfile: { name: string; avatar: string; uid: string; clan: string } =
    profile || { name: 'OPERATIVE', avatar: '👑', uid: '0000000000', clan: 'TABAAHI' };
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isCompactViewport = winWidth < 600;
  const radarSize = isCompactViewport ? 84 : 130;
  const mountRef = useRef<any>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Flow State
  const [phase, setPhase] = useState<GameFlowPhase>('LOBBY');
  const [selectedMapId, setSelectedMapId] = useState<MapId>('ERANGEL');
  const [gameMode, setGameMode] = useState<GameModeId>('ICEMIRE_FRONTIER');
  const [selectedSkinId, setSelectedSkinId] = useState<SkinSetId>('TACTICAL_BLACK');
  const [is3DInspect, setIs3DInspect] = useState<boolean>(false);

  // Lobby 3D Camera & Rotation
  const lobbyRotationRef = useRef<number>(0);
  const isDraggingLobbyRef = useRef<boolean>(false);
  const lastMouseXRef = useRef<number>(0);

  // Active Match Telemetry (20-Player Battle Royale: 1 Human + 19 Bots)
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [playerArmor, setPlayerArmor] = useState<number>(100);
  const [aliveCount, setAliveCount] = useState<number>(20);
  const [killsCount, setKillsCount] = useState<number>(0);
  const [battleRoyaleMode, setBattleRoyaleMode] = useState<'SOLO' | 'SQUAD'>('SOLO');
  const [squadTeammates, setSquadTeammates] = useState<{ id: number; num: number; name: string; hp: number; maxHp: number; isDead: boolean }[]>([
    { id: 2, num: 2, name: 'Viper_Sniper', hp: 100, maxHp: 100, isDead: false },
    { id: 3, num: 3, name: 'Ghost_Ops', hp: 100, maxHp: 100, isDead: false },
    { id: 4, num: 4, name: 'Apex_Assault', hp: 100, maxHp: 100, isDead: false },
  ]);

  // 5 Functional Weapons Inventory
  const [currentWeapon, setCurrentWeapon] = useState<WeaponDef>(WEAPON_REGISTRY.CARBINE);
  const [ammoClip, setAmmoClip] = useState<number>(40);
  const [ammoReserve, setAmmoReserve] = useState<number>(180);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isAiming, setIsAiming] = useState<boolean>(false);

  // BGMI Medkit Healing & Death Loot Crates
  const [medkitCount, setMedkitCount] = useState<number>(3);
  const [isHealing, setIsHealing] = useState<boolean>(false);
  const [healProgress, setHealProgress] = useState<number>(0);
  const [nearbyLootCrate, setNearbyLootCrate] = useState<any>(null);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [nearbyEnemyBearings, setNearbyEnemyBearings] = useState<{ id: number; dist: number; angleDiff: number }[]>([]);

  // Erangel Safe Zone Telemetry
  const [safeZoneTime, setSafeZoneTime] = useState<number>(120);
  const [safeZonePhase, setSafeZonePhase] = useState<number>(1);
  const [isOutsideSafeZone, setIsOutsideSafeZone] = useState<boolean>(false);

  // Overlays & Radar
  const [hitMarker, setHitMarker] = useState<boolean>(false);
  const [damageFlash, setDamageFlash] = useState<boolean>(false);
  const [killFeed, setKillFeed] = useState<string[]>([]);
  const [showFullMap, setShowFullMap] = useState<boolean>(false);
  const [showInventoryModal, setShowInventoryModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showSquadModal, setShowSquadModal] = useState<boolean>(false);
  const [sentFriendRequests, setSentFriendRequests] = useState<string[]>([]);
  const [showSeasonModal, setShowSeasonModal] = useState<boolean>(false);

  // ============================================================================
  // REAL SETTINGS (graphics preset / sound / sensitivity) — persisted
  // ============================================================================
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [graphicsPreset, setGraphicsPreset] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [sensitivity, setSensitivity] = useState<number>(1);
  const soundEnabledRef = useRef<boolean>(true);
  const settingsLoadedRef = useRef<boolean>(false);

  const handleToggleSound = () => setSoundOn((prev) => !prev);
  const handleSetSensitivity = (delta: number) =>
    setSensitivity((prev) => Math.min(2, Math.max(0.4, Math.round((prev + delta) * 100) / 100)));

  useEffect(() => {
    if (!settingsLoadedRef.current) return;
    AsyncStorage.setItem(
      'BGMI_SHADOW_SETTINGS',
      JSON.stringify({ g: graphicsPreset, s: soundOn, sens: sensitivity })
    ).catch(() => {});
  }, [graphicsPreset, soundOn, sensitivity]);

  useEffect(() => {
    soundEnabledRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    gameRef.current.sensitivity = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    const g = gameRef.current;
    if (!g.renderer || typeof window === 'undefined') return;
    const cap = graphicsPreset === 'LOW' ? 1 : graphicsPreset === 'MEDIUM' ? 1.35 : 1.75;
    g.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap));
    const wantShadow = graphicsPreset !== 'LOW';
    if (g.renderer.shadowMap.enabled !== wantShadow) {
      g.renderer.shadowMap.enabled = wantShadow;
      g.scene?.traverse((o: any) => {
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: any) => {
            m.needsUpdate = true;
          });
        }
      });
    }
  }, [graphicsPreset, phase]);

  const [floatingDamage, setFloatingDamage] = useState<{ text: string; color: string } | null>(null);
  const [eliminationBanner, setEliminationBanner] = useState<{
    visible: boolean;
    victimName: string;
    kills: number;
    remaining: number;
  }>({ visible: false, victimName: '', kills: 0, remaining: 20 });

  // Persistent Career Stats backed by @react-native-async-storage/async-storage
  const [totalDinners, setTotalDinners] = useState<number>(0);
  const [highestKills, setHighestKills] = useState<number>(0);
  const [matchesPlayed, setMatchesPlayed] = useState<number>(0);
  const [totalKills, setTotalKills] = useState<number>(0);
  const [totalDeaths, setTotalDeaths] = useState<number>(0);
  const [ucBalance, setUcBalance] = useState<number>(0);
  const [goldBalance, setGoldBalance] = useState<number>(0);

  useEffect(() => {
    const loadCareerStats = async () => {
      try {
        // One-time migration: older builds persisted fake default stats.
        const migrated = await AsyncStorage.getItem('BGMI_SHADOW_STATS_V2');
        if (!migrated) {
          await AsyncStorage.removeItem('BGMI_SHADOW_DINNERS');
          await AsyncStorage.removeItem('BGMI_SHADOW_HIGH_KILLS');
          await AsyncStorage.removeItem('BGMI_SHADOW_MATCHES');
          await AsyncStorage.setItem('BGMI_SHADOW_STATS_V2', '1').catch(() => {});
        }
        const savedDinners = await AsyncStorage.getItem('BGMI_SHADOW_DINNERS');
        const savedKills = await AsyncStorage.getItem('BGMI_SHADOW_HIGH_KILLS');
        const savedMatches = await AsyncStorage.getItem('BGMI_SHADOW_MATCHES');
        const savedTotalKills = await AsyncStorage.getItem('BGMI_SHADOW_TOTAL_KILLS');
        const savedTotalDeaths = await AsyncStorage.getItem('BGMI_SHADOW_TOTAL_DEATHS');
        const savedSkin = await AsyncStorage.getItem('BGMI_SHADOW_SKIN');
        const savedMap = await AsyncStorage.getItem('BGMI_SHADOW_MAP');

        if (savedDinners !== null) setTotalDinners(parseInt(savedDinners, 10));
        if (savedKills !== null) setHighestKills(parseInt(savedKills, 10));
        if (savedMatches !== null) setMatchesPlayed(parseInt(savedMatches, 10));
        if (savedTotalKills !== null) setTotalKills(parseInt(savedTotalKills, 10));
        if (savedTotalDeaths !== null) setTotalDeaths(parseInt(savedTotalDeaths, 10));
        const savedUC = await AsyncStorage.getItem('BGMI_SHADOW_UC');
        const savedGold = await AsyncStorage.getItem('BGMI_SHADOW_GOLD');
        if (savedUC !== null) setUcBalance(parseInt(savedUC, 10) || 0);
        if (savedGold !== null) setGoldBalance(parseInt(savedGold, 10) || 0);
        const savedSettings = await AsyncStorage.getItem('BGMI_SHADOW_SETTINGS');
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            if (parsed.g === 'LOW' || parsed.g === 'MEDIUM' || parsed.g === 'HIGH') setGraphicsPreset(parsed.g);
            if (typeof parsed.s === 'boolean') {
              setSoundOn(parsed.s);
              soundEnabledRef.current = parsed.s;
            }
            if (typeof parsed.sens === 'number') setSensitivity(parsed.sens);
          } catch {}
        }
        if (savedSkin && (SKIN_DEFINITIONS as any)[savedSkin]) {
          setSelectedSkinId(savedSkin as SkinSetId);
        }
        if (savedMap && (FOUR_MAPS as any)[savedMap]) {
          setSelectedMapId(savedMap as MapId);
        }
      } catch (err) {
        console.warn('AsyncStorage load error:', err);
      } finally {
        settingsLoadedRef.current = true;
      }
    };
    loadCareerStats();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('SHADOW_STRIKE_SENT_FRIEND_REQUESTS')
      .then((saved) => setSentFriendRequests(saved ? JSON.parse(saved) : []))
      .catch(() => {});
  }, []);

  const sendFriendRequest = async (candidate: SquadCandidate) => {
    if (candidate.status !== 'ONLINE' || sentFriendRequests.includes(candidate.id)) return;
    const next = [...sentFriendRequests, candidate.id];
    setSentFriendRequests(next);
    await AsyncStorage.setItem('SHADOW_STRIKE_SENT_FRIEND_REQUESTS', JSON.stringify(next));
    pushKillFeed(`✓ Friend request sent to ${candidate.name}`);
  };

  const handleSelectSkin = async (skinId: SkinSetId) => {
    setSelectedSkinId(skinId);
    try {
      await AsyncStorage.setItem('BGMI_SHADOW_SKIN', skinId);
    } catch (e) {}
  };

  const handleSelectMap = async (mapId: MapId) => {
    setSelectedMapId(mapId);
    try {
      await AsyncStorage.setItem('BGMI_SHADOW_MAP', mapId);
    } catch (e) {}
  };

  // Commits real per-match kill/death totals to the persistent dossier
  const commitCareerMatch = (kills: number, died: boolean, won: boolean) => {
    setTotalKills((prev) => {
      const next = prev + kills;
      AsyncStorage.setItem('BGMI_SHADOW_TOTAL_KILLS', next.toString()).catch(() => {});
      return next;
    });
    if (died) {
      setTotalDeaths((prev) => {
        const next = prev + 1;
        AsyncStorage.setItem('BGMI_SHADOW_TOTAL_DEATHS', next.toString()).catch(() => {});
        return next;
      });
    }
    // Real UC/Gold earnings: +10 UC & +5 Gold per kill, +50 UC & +100 Gold per win.
    const ucGain = kills * 10 + (won ? 50 : 0);
    const goldGain = kills * 5 + (won ? 100 : 0);
    if (ucGain > 0) {
      setUcBalance((prev) => {
        const next = prev + ucGain;
        AsyncStorage.setItem('BGMI_SHADOW_UC', next.toString()).catch(() => {});
        return next;
      });
    }
    if (goldGain > 0) {
      setGoldBalance((prev) => {
        const next = prev + goldGain;
        AsyncStorage.setItem('BGMI_SHADOW_GOLD', next.toString()).catch(() => {});
        return next;
      });
    }
  };

  const handleGameVictory = () => {
    const g = gameRef.current;
    if (g.phase !== 'PLAYING') return;
    g.phase = 'VICTORY';
    setPhase('VICTORY');
    g.isFiring = false;
    if (typeof document !== 'undefined' && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (e) {}
    }
    setTotalDinners((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem('BGMI_SHADOW_DINNERS', next.toString()).catch(() => {});
      return next;
    });
    setMatchesPlayed((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem('BGMI_SHADOW_MATCHES', next.toString()).catch(() => {});
      return next;
    });
    setHighestKills((prev) => {
      const matchKills = g.eliminationCount;
      if (matchKills > prev) {
        AsyncStorage.setItem('BGMI_SHADOW_HIGH_KILLS', matchKills.toString()).catch(() => {});
        return matchKills;
      }
      return prev;
    });
    commitCareerMatch(g.eliminationCount, false, true);
  };

  const handleGameOver = () => {
    const g = gameRef.current;
    if (g.phase !== 'PLAYING') return;
    g.phase = 'GAMEOVER';
    setPhase('GAMEOVER');
    g.isFiring = false;
    if (typeof document !== 'undefined' && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (e) {}
    }
    setMatchesPlayed((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem('BGMI_SHADOW_MATCHES', next.toString()).catch(() => {});
      return next;
    });
    setHighestKills((prev) => {
      const matchKills = g.eliminationCount;
      if (matchKills > prev) {
        AsyncStorage.setItem('BGMI_SHADOW_HIGH_KILLS', matchKills.toString()).catch(() => {});
        return matchKills;
      }
      return prev;
    });
    commitCareerMatch(g.eliminationCount, true, false);
  };

  const returnToLobby = () => {
    const g = gameRef.current;
    const activeScene = g.scene;
    if (activeScene) {
      if (g.bots) {
        g.bots.forEach((b: any) => {
          if (b.rig?.root) activeScene.remove(b.rig.root);
        });
        g.bots = [];
      }
      if (g.lootCrates) {
        g.lootCrates.forEach((c: any) => {
          if (c.mesh) activeScene.remove(c.mesh);
        });
        g.lootCrates = [];
      }
      if (g.vfxPool) {
        g.vfxPool.forEach((v: any) => {
          if (v.mesh) activeScene.remove(v.mesh);
        });
        g.vfxPool = [];
      }
      if (g.parachuteMesh && g.playerRig) {
        g.playerRig.root.remove(g.parachuteMesh);
        g.parachuteMesh = null;
      }
      if (g.healLight) {
        activeScene.remove(g.healLight);
        g.healLight = null;
      }
    }
    g.phase = 'LOBBY';
    setPhase('LOBBY');
    g.isFiring = false;
    g.mouseLook.isAiming = false;
    setIsAiming(false);
    setShowFullMap(false);
    setFloatingDamage(null);
    setEliminationBanner({ visible: false, victimName: '', kills: 0, remaining: 20 });
    g.player.hp = 100;
    g.player.armor = 100;
    setPlayerHp(100);
    setPlayerArmor(100);
    g.eliminationCount = 0;
    setKillsCount(0);
    g.totalAlive = 20;
    setAliveCount(20);
    if (typeof document !== 'undefined' && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (e) {}
    }
  };

  // Web Audio Context & Synthesizer for Realistic Sound Effects
  const audioCtxRef = useRef<any>(null);
  const radarMapImgRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const img = new (window as any).Image();
      img.src = ERANGEL_MAP_BASE64;
      radarMapImgRef.current = img;
    }
  }, []);

  const getAudioCtx = () => {
    if (typeof window === 'undefined' || !soundEnabledRef.current) return null;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
    } catch (e) {
      return null;
    }
  };

  const playGunshotSound = (weaponId: string) => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = weaponId === 'SNIPER' ? 'sawtooth' : weaponId === 'SHOTGUN' ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(weaponId === 'SNIPER' ? 180 : 320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  const playHitMarkerSound = () => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {}
  };

  const playStartMatchSound = () => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      [440, 660, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.28, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.18);
      });
    } catch (e) {}
  };

  const playMedkitSound = () => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.12 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.22);
      });
    } catch (e) {}
  };

  const playLootPickupSound = () => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {}
  };

  // Mutable Game Loop State
  // Lazy init: a plain useRef({...}) literal would be rebuilt on EVERY render
  const gameRef = useRef<any>(null);
  if (!gameRef.current) gameRef.current = {
    phase: 'LOBBY' as GameFlowPhase,
    mapId: 'ERANGEL' as MapId,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    animFrameId: null as any,
    clock: new THREE.Clock(),
    sensitivity: 1,
    elapsedTime: 0,
    isFiring: false,
    totalAlive: 20,
    lastRadarRender: 0,

    keys: {
      w: false,
      a: false,
      s: false,
      d: false,
      shift: false,
      space: false,
      e: false,
      r: false,
      arrowLeft: false,
      arrowRight: false,
      arrowUp: false,
      arrowDown: false,
      crouch: false,
    },
    mouseLook: { yaw: 0, pitch: 0.15, isAiming: false },

    playerRig: null as HumanRig | null,
    lobbyRig: null as HumanRig | null,
    lobbyFloatingCube: null as THREE.Mesh | null,
    lobbyPetBot: null as THREE.Group | null,

    player: {
      position: new THREE.Vector3(0, 150, -280),
      velocity: new THREE.Vector3(0, 0, 0),
      hp: 100,
      armor: 100,
      walkCycle: 0,
      currentWeapon: WEAPON_REGISTRY.CARBINE,
      clip: 40,
      reserve: 180,
      reloading: false,
      lastShotTime: 0,
      jumpVelocity: 0,
      isGrounded: true,
    },

    airplane: {
      position: new THREE.Vector3(0, 120, -120),
      velocity: new THREE.Vector3(0, 0, 36),
      hasJumped: false,
      mesh: null as THREE.Group | null,
    },

    dropZone: new THREE.Vector3(0, 0, 0),

    safeZone: {
      center: new THREE.Vector2(0, -40), // Centered near Pochinki
      targetCenter: new THREE.Vector2(20, -50),
      radius: 360,
      targetRadius: 220,
      shrinkTimer: 120,
      damageTickTimer: 0,
      baseDPS: 8,
      stormRingMesh: null as THREE.Mesh | null,
      currentStage: 1,
    },

    bots: [] as EnemyBot[],
    lootCrates: [] as {
      id: number;
      position: THREE.Vector3;
      mesh: THREE.Group;
      looted: boolean;
      botName: string;
      beamMesh?: THREE.Mesh;
    }[],
    medkits: 3,
    isHealing: false,
    bulletTracers: [] as { line: THREE.Line; life: number }[],
    damageDealt: 0,
    eliminationCount: 0,
    // VFX pool: replaces all setTimeout-based mesh cleanup (main lag fix)
    vfxPool: [] as { mesh: THREE.Object3D; life: number }[],
    // Dying bots pending smooth ragdoll animation
    dyingBots: [] as { bot: any; timer: number }[],
    // Throttle bot-AI React state to 10fps
    lastBotUIUpdate: 0,
    // Store nearby loot crate in gameRef to avoid stale closure in keydown
    currentNearbyLootCrate: null as any,
    // Parachute 3D canopy model
    parachuteMesh: null as THREE.Group | null,
    // Healing aura point light
    healLight: null as THREE.PointLight | null,
    // Pooled muzzle-flash light (created once, intensity-animated)
    muzzleFlashLight: null as THREE.PointLight | null,
  };

  // ============================================================================
  // THREE.JS SCENE INITIALIZER (LOBBY & ERANGEL BATTLEGROUND)
  // ============================================================================
  useEffect(() => {
    if (Platform.OS !== 'web' || !mountRef.current) return;

    const g = gameRef.current;
    g.phase = phase;
    g.mapId = selectedMapId;
    const width = mountRef.current.clientWidth || winWidth;
    const height = mountRef.current.clientHeight || winHeight;

    const scene = new THREE.Scene();
    g.scene = scene;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 2000);
    g.camera = camera;

    // High performance renderer with capped pixel ratio (eliminates lag on 4K/Retina displays)
    const compactDevice = winWidth < 700;
    const renderer = new THREE.WebGLRenderer({
      antialias: !compactDevice,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compactDevice ? 1.3 : 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = compactDevice ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    g.renderer = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Build Scene depending on isLobbyMode (avoids tearing down WebGL on in-match phase changes)
    const isLobbyMode = phase === 'LOBBY' || phase === 'MAP_SELECT';
    if (isLobbyMode) {
      buildBGMILobbyScene(scene, g);
    } else {
      buildErangelBattlegroundScene(scene, g);
    }

    // Input handlers
    const disposeInputControls = setupInputControls(renderer.domElement, g);

    // RAF Loop
    let isRunning = true;
    const loop = () => {
      if (!isRunning) return;
      g.animFrameId = requestAnimationFrame(loop);

      const dt = Math.min(g.clock.getDelta(), 0.05);
      g.elapsedTime += dt;

      if (g.phase === 'LOBBY') {
        updateLobbyScene(dt, g);
      } else if (g.phase === 'AIRPLANE') {
        updateAirplaneFlight(dt, g);
      } else if (g.phase === 'FREEFALL' || g.phase === 'PARACHUTE') {
        updateFreefallAndParachute(dt, g);
      } else if (g.phase === 'PLAYING') {
        updateCombatGameplay(dt, g);
      }

      if (g.renderer && g.scene && g.camera) {
        g.renderer.render(g.scene, g.camera);
      }
    };
    loop();

    return () => {
      isRunning = false;
      if (g.animFrameId) cancelAnimationFrame(g.animFrameId);
      disposeInputControls();
      // Release GPU memory for the old scene, otherwise every match leaks and FPS decays
      scene.traverse((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (mat) {
          (Array.isArray(mat) ? mat : [mat]).forEach((m) => {
            Object.values(m).forEach((v) => {
              if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose();
            });
            m.dispose();
          });
        }
      });
      renderer.dispose();
    };
  }, [selectedMapId, phase === 'LOBBY' || phase === 'MAP_SELECT', selectedSkinId, is3DInspect]);

  // ============================================================================
  // Original forward-operating-base lobby scene.
  // ============================================================================
  const buildBGMILobbyScene = (scene: THREE.Scene, g: any) => {
    scene.background = new THREE.Color('#4d6170');
    scene.fog = new THREE.FogExp2('#667c81', 0.012);

    // Late-afternoon key light over an original forward operating base.
    const hemi = new THREE.HemisphereLight('#d4e0e5', '#1d2a24', 1.25);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fffbeb', 2.8);
    sun.position.set(25, 50, 30);
    sun.castShadow = true;
    const shadowResolution = winWidth < 700 ? 1024 : 2048;
    sun.shadow.mapSize.width = shadowResolution;
    sun.shadow.mapSize.height = shadowResolution;
    scene.add(sun);

    // 1. Desert sand floor (BGMI lobby style)
    const grassGeo = new THREE.PlaneGeometry(80, 80, 48, 48);
    const pos = grassGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      pos.setZ(i, Math.sin(vx * 0.08) * Math.cos(vy * 0.08) * 0.6);
    }
    grassGeo.computeVertexNormals();

    const grassMat = new THREE.MeshStandardMaterial({
      color: '#c9b18a',
      roughness: 0.92,
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    scene.add(grass);

    // 2. Remote command relay and field equipment.
    const ruinsGroup = new THREE.Group();
    ruinsGroup.position.set(4.5, 0, -3.5);

    const stoneMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.8 });
    const archPillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 4.5, 8), stoneMat);
    archPillarL.position.set(-1.6, 2.25, 0);
    ruinsGroup.add(archPillarL);

    const archPillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 4.5, 8), stoneMat);
    archPillarR.position.set(1.6, 2.25, 0);
    ruinsGroup.add(archPillarR);

    const archTop = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.6, 0.8), stoneMat);
    archTop.position.set(0, 4.6, 0);
    ruinsGroup.add(archTop);

    // Circular Stone Dais
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.35, 16), stoneMat);
    dais.position.set(0, 0.15, 0);
    ruinsGroup.add(dais);

    // Rotating emergency beacon on the command relay.
    const cubeMat = new THREE.MeshStandardMaterial({
      color: '#c2410c',
      emissive: '#f97316',
      emissiveIntensity: 0.55,
      roughness: 0.28,
    });
    const signalBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.34, 12), cubeMat);
    signalBeacon.position.set(0, 1.4, 0);
    ruinsGroup.add(signalBeacon);
    g.lobbyFloatingCube = signalBeacon;

    const cubeLight = new THREE.PointLight('#f97316', 2.5, 6);
    cubeLight.position.set(0, 1.4, 0);
    ruinsGroup.add(cubeLight);

    scene.add(ruinsGroup);

    // 3. Recon drone on the right of the character.
    const petBot = new THREE.Group();
    petBot.position.set(1.8, 0.4, 0.4);

    const petBody = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 12, 12),
      new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.2, metalness: 0.6 })
    );
    petBot.add(petBody);

    const petEye = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.08, 0.05),
      new THREE.MeshBasicMaterial({ color: '#00f0ff' })
    );
    petEye.position.set(0, 0.04, 0.22);
    petBot.add(petEye);

    scene.add(petBot);
    g.lobbyPetBot = petBot;

    // 4. Concrete deployment pad under the operator.
    const stageGeo = new THREE.CylinderGeometry(1.5, 1.7, 0.14, 32);
    const stageMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.35,
      metalness: 0.7,
    });
    const heroStage = new THREE.Mesh(stageGeo, stageMat);
    heroStage.position.set(0, 0.07, 0);
    heroStage.receiveShadow = true;
    scene.add(heroStage);

    const stageRimGeo = new THREE.TorusGeometry(1.52, 0.025, 8, 32);
    const stageRimMat = new THREE.MeshBasicMaterial({ color: '#ffd700' });
    const stageRim = new THREE.Mesh(stageRimGeo, stageRimMat);
    stageRim.rotation.x = Math.PI / 2;
    stageRim.position.set(0, 0.14, 0);
    scene.add(stageRim);

    // Dynamic Rim Lights for signature character edge glow
    const cyanRimLight = new THREE.DirectionalLight('#00f0ff', 1.6);
    cyanRimLight.position.set(-5, 6, -5);
    scene.add(cyanRimLight);

    const goldKeyLight = new THREE.DirectionalLight('#fbbf24', 1.8);
    goldKeyLight.position.set(5, 5, 4);
    scene.add(goldKeyLight);

    // Floating dust motes make the base feel lived-in without fantasy effects.
    const sparkleGeo = new THREE.BufferGeometry();
    const spCount = 50;
    const spPos = new Float32Array(spCount * 3);
    for (let i = 0; i < spCount * 3; i += 3) {
      spPos[i] = (Math.random() - 0.5) * 6;
      spPos[i + 1] = Math.random() * 3.2 + 0.3;
      spPos[i + 2] = (Math.random() - 0.5) * 5;
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
    const sparkleMat = new THREE.PointsMaterial({
      color: '#d7e3e0',
      size: 0.045,
      transparent: true,
      opacity: 0.85,
    });
    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    scene.add(sparkles);
    g.lobbySparkles = sparkles;

    // 4b. Motorcycle prop on the left (BGMI lobby style)
    const bikeGroup = new THREE.Group();
    bikeGroup.position.set(-2.4, 0, 0.6);
    bikeGroup.rotation.y = 0.4;
    const tireMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: '#8b95a3', metalness: 0.85, roughness: 0.25 });
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#2d3748', metalness: 0.4, roughness: 0.55 });
    const wheelGeo = new THREE.TorusGeometry(0.32, 0.09, 10, 20);
    const wheelL = new THREE.Mesh(wheelGeo, tireMat);
    wheelL.position.set(0, 0.32, -0.55);
    wheelL.rotation.y = Math.PI / 2;
    bikeGroup.add(wheelL);
    const wheelR = new THREE.Mesh(wheelGeo, tireMat);
    wheelR.position.set(0, 0.32, 0.55);
    wheelR.rotation.y = Math.PI / 2;
    bikeGroup.add(wheelR);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 1.1), bodyMat);
    frame.position.set(0, 0.55, 0);
    bikeGroup.add(frame);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.5), chromeMat);
    tank.position.set(0, 0.75, -0.1);
    bikeGroup.add(tank);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.42), tireMat);
    seat.position.set(0, 0.78, 0.28);
    bikeGroup.add(seat);
    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), chromeMat);
    handlebar.position.set(0, 0.95, -0.5);
    handlebar.rotation.x = Math.PI / 2;
    handlebar.rotation.z = Math.PI / 2;
    bikeGroup.add(handlebar);
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), chromeMat);
    fork.position.set(0, 0.65, -0.55);
    fork.rotation.x = 0.35;
    bikeGroup.add(fork);
    scene.add(bikeGroup);
    g.lobbyBike = bikeGroup;

    // 4c. Floating UFO-style platform above and behind the operator
    const ufoGroup = new THREE.Group();
    ufoGroup.position.set(0.8, 4.2, -6);
    const ufoDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 1.8, 0.35, 24),
      new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.75, roughness: 0.3 })
    );
    ufoGroup.add(ufoDisc);
    const ufoTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.6, roughness: 0.35 })
    );
    ufoTop.position.y = 0.18;
    ufoGroup.add(ufoTop);
    const ufoRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.9, 0.06, 8, 32),
      new THREE.MeshBasicMaterial({ color: '#00f0ff' })
    );
    ufoRing.rotation.x = Math.PI / 2;
    ufoRing.position.y = -0.18;
    ufoGroup.add(ufoRing);
    scene.add(ufoGroup);
    g.lobbyUfo = ufoGroup;

    // 4d. Temple statue on a stone pedestal (background right)
    const statueGroup = new THREE.Group();
    statueGroup.position.set(3.2, 0, -4.5);
    const statueStone = new THREE.MeshStandardMaterial({ color: '#a08a6b', roughness: 0.85 });
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), statueStone);
    pedestal.position.y = 0.3;
    statueGroup.add(pedestal);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.5), statueStone);
    torso.position.y = 1.25;
    statueGroup.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), statueStone);
    head.position.y = 2.15;
    statueGroup.add(head);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 10), statueStone);
    crown.position.y = 2.55;
    statueGroup.add(crown);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.22), statueStone);
    armL.position.set(-0.5, 1.25, 0);
    armL.rotation.z = 0.25;
    statueGroup.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.22), statueStone);
    armR.position.set(0.5, 1.25, 0);
    armR.rotation.z = -0.25;
    statueGroup.add(armR);
    const staffMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), statueStone);
    staffMesh.position.set(0.75, 1.5, 0);
    statueGroup.add(staffMesh);
    scene.add(statueGroup);
    g.lobbyStatue = statueGroup;

    // 5. Spawn the selected operator in the center of the deployment bay.
    const skinDef = SKIN_DEFINITIONS[selectedSkinId] || SKIN_DEFINITIONS.TACTICAL_BLACK;
    const rig = buildTheFoolJokerRig(skinDef, false);
    rig.root.position.set(0, 0.14, 0);
    scene.add(rig.root);
    g.lobbyRig = rig;

    // Set Camera Facing Character (Matching Image 1 third-person viewpoint)
    if (g.camera) {
      g.camera.position.set(0, 1.35, 3.2);
      g.camera.lookAt(0, 1.15, 0);
    }
  };

  const updateLobbyScene = (dt: number, g: any) => {
    // Character Idle Breathing Animation & 360 Drag Rotation
    if (g.lobbyRig) {
      const breath = Math.sin(g.elapsedTime * 2.2) * 0.012;
      g.lobbyRig.torsoGroup.position.y = 1.15 + breath;
      g.lobbyRig.root.rotation.y = lobbyRotationRef.current;
    }

    // Floating Magical Cube Rotation & Hover
    if (g.lobbyFloatingCube) {
      g.lobbyFloatingCube.rotation.x += dt * 0.8;
      g.lobbyFloatingCube.rotation.y += dt * 1.2;
      g.lobbyFloatingCube.position.y = 1.4 + Math.sin(g.elapsedTime * 2.0) * 0.12;
    }

    // Pet Bot Idle Bounce
    if (g.lobbyPetBot) {
      g.lobbyPetBot.position.y = 0.38 + Math.sin(g.elapsedTime * 3.0) * 0.04;
      g.lobbyPetBot.rotation.y = Math.sin(g.elapsedTime * 1.5) * 0.3;
    }

    // Sparkles Rotation
    if (g.lobbySparkles) {
      g.lobbySparkles.rotation.y += dt * 0.1;
    }

    // UFO platform: slow hover + spin
    if (g.lobbyUfo) {
      g.lobbyUfo.position.y = 4.2 + Math.sin(g.elapsedTime * 0.8) * 0.15;
      g.lobbyUfo.rotation.y += dt * 0.3;
    }

    // Motorcycle: subtle idle sway
    if (g.lobbyBike) {
      g.lobbyBike.rotation.z = Math.sin(g.elapsedTime * 1.2) * 0.02;
    }
  };

  // ============================================================================
  // High-detail original battleground scene.
  // ============================================================================
  const buildErangelBattlegroundScene = (scene: THREE.Scene, g: any) => {
    // Old scene's pooled lights are gone after a rebuild
    g.muzzleFlashLight = null;
    g.healLight = null;

    scene.background = new THREE.Color('#6f93a6');
    scene.fog = new THREE.FogExp2('#8da9b3', 0.0026);

    const hemi = new THREE.HemisphereLight('#d9e8ed', '#21372a', 1.45);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight('#fffbeb', 2.8);
    sun.position.set(120, 240, 120);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    // 1. Texture-mapped terrain with denser geometry for a more believable landscape.
    const textureLoader = new THREE.TextureLoader();
    const erangelTexture = textureLoader.load(ERANGEL_MAP_BASE64);
    erangelTexture.wrapS = THREE.ClampToEdgeWrapping;
    erangelTexture.wrapT = THREE.ClampToEdgeWrapping;

    const terrainSegments = winWidth < 700 ? 56 : 80;
    const terrainGeo = new THREE.PlaneGeometry(900, 900, terrainSegments, terrainSegments);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getY(i);
      pos.setZ(i, getErangelTerrainHeight(vx, vz));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: erangelTexture,
      roughness: 0.8,
      metalness: 0.05,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // 2. Ocean channel: only spans the channel, so it never covers the whole map.
    const waterGeo = new THREE.PlaneGeometry(900, 78);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.45, -100);
    scene.add(water);

    // 3. Two Iconic Sosnovka Channel Bridges
    [-60, 60].forEach((bridgeX) => {
      const bridgeGroup = new THREE.Group();
      bridgeGroup.position.set(bridgeX, 2.5, -100);

      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(10, 1.2, 95),
        new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.7 })
      );
      deck.castShadow = true;
      bridgeGroup.add(deck);

      // Steel Trusses
      const trussL = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 4.5, 95),
        new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8 })
      );
      trussL.position.set(-4.8, 2.2, 0);
      bridgeGroup.add(trussL);

      const trussR = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 4.5, 95),
        new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.8 })
      );
      trussR.position.set(4.8, 2.2, 0);
      bridgeGroup.add(trussR);

      scene.add(bridgeGroup);
    });

    // 4. Hot-drop POI: a dense original coastal town with roads, houses and cover.
    const brickMat = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.8 });
    const plasterMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.6 });
    const roofBlueMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.5 });
    const roofRedMat = new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.5 });

    for (let c = 0; c < 16; c++) {
      const hx = (c % 4) * 26 - 39;
      const hz = Math.floor(c / 4) * 26 - 78;
      const groundY = getErangelTerrainHeight(hx, hz);

      const houseGroup = new THREE.Group();
      houseGroup.position.set(hx, groundY, hz);

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(14, 8, 14),
        c % 2 === 0 ? brickMat : plasterMat
      );
      body.position.y = 4;
      body.castShadow = true;
      body.receiveShadow = true;
      houseGroup.add(body);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(11, 4.5, 4),
        c % 2 === 0 ? roofBlueMat : roofRedMat
      );
      roof.position.y = 10.2;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      houseGroup.add(roof);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 3.2, 0.12),
        new THREE.MeshStandardMaterial({ color: '#3f2d24', roughness: 0.72 })
      );
      door.position.set(0, 1.6, 7.06);
      houseGroup.add(door);
      [-4.2, 4.2].forEach((x) => {
        const window = new THREE.Mesh(
          new THREE.BoxGeometry(2.1, 1.8, 0.1),
          new THREE.MeshStandardMaterial({ color: '#83b8d1', emissive: '#28485a', emissiveIntensity: 0.22, roughness: 0.25 })
        );
        window.position.set(x, 5.1, 7.08);
        houseGroup.add(window);
      });

      scene.add(houseGroup);
    }

    const roadMat = new THREE.MeshStandardMaterial({ color: '#30383b', roughness: 0.9 });
    [-26, 0, 26].forEach((x) => {
      const road = new THREE.Mesh(new THREE.BoxGeometry(8, 0.14, 130), roadMat);
      road.position.set(x, getErangelTerrainHeight(x, -40) + 0.12, -40);
      scene.add(road);
    });

    const coverMat = new THREE.MeshStandardMaterial({ color: '#65705e', roughness: 0.82 });
    for (let c = 0; c < 12; c++) {
      const x = ((c * 19) % 86) - 43;
      const z = -15 - Math.floor(c / 3) * 26;
      const crate = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.8, 1.5), coverMat);
      crate.position.set(x, getErangelTerrainHeight(x, z) + 0.9, z);
      crate.castShadow = true;
      crate.receiveShadow = true;
      scene.add(crate);
    }

    // Shipping containers, sandbags and sheds create clear tactical hiding routes.
    const containerMat = new THREE.MeshStandardMaterial({ color: '#315f76', roughness: 0.63, metalness: 0.22 });
    const sandbagMat = new THREE.MeshStandardMaterial({ color: '#80735b', roughness: 0.96 });
    const hideSites = [
      [-32, -12, 0], [30, -4, Math.PI / 2], [-14, 28, Math.PI / 2], [42, 34, 0],
      [-56, -38, Math.PI / 2], [58, -42, 0],
    ];
    hideSites.forEach(([x, z, rotation]) => {
      const y = getErangelTerrainHeight(x, z);
      const container = new THREE.Mesh(new THREE.BoxGeometry(7.5, 3, 2.6), containerMat);
      container.position.set(x, y + 1.5, z);
      container.rotation.y = rotation;
      container.castShadow = true;
      container.receiveShadow = true;
      scene.add(container);

      for (let bag = 0; bag < 4; bag++) {
        const sandbag = new THREE.Mesh(new THREE.SphereGeometry(0.52, 8, 6), sandbagMat);
        sandbag.scale.set(1.35, 0.65, 0.8);
        sandbag.position.set(x - 3 + bag * 1.05, y + 0.42, z + 2.1);
        sandbag.castShadow = true;
        scene.add(sandbag);
      }
    });

    // Military Watchtower at Pochinki
    [-28, 28].forEach((tx) => {
      const tz = -50;
      const ty = getErangelTerrainHeight(tx, tz);
      const towerGroup = new THREE.Group();
      towerGroup.position.set(tx, ty, tz);

      const legs = new THREE.Mesh(new THREE.BoxGeometry(6, 12, 6), new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.7 }));
      legs.position.y = 6;
      towerGroup.add(legs);

      const deck = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 8), new THREE.MeshStandardMaterial({ color: '#78350f' }));
      deck.position.y = 12.3;
      towerGroup.add(deck);

      const troof = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.4, 8.6), new THREE.MeshStandardMaterial({ color: '#0369a1' }));
      troof.position.y = 14.8;
      towerGroup.add(troof);

      scene.add(towerGroup);
    });

    // Erangel Pine Trees around Combat Area
    for (let tr = 0; tr < 20; tr++) {
      const angle = (tr / 20) * Math.PI * 2;
      const r = 50 + (tr % 3) * 20;
      const tx = Math.sin(angle) * r;
      const tz = Math.cos(angle) * r - 40;
      const ty = getErangelTerrainHeight(tx, tz);

      const tree = new THREE.Group();
      tree.position.set(tx, ty, tz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 4, 6), new THREE.MeshStandardMaterial({ color: '#451a03' }));
      trunk.position.y = 2;
      tree.add(trunk);

      const foliage = new THREE.Mesh(new THREE.ConeGeometry(3.2, 8, 7), new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.8 }));
      foliage.position.y = 6.5;
      tree.add(foliage);

      scene.add(tree);
    }

    // Natural Granite Rock Boulders for Combat Cover
    const rockMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.9, metalness: 0.1 });
    const rockPositions = [
      [-15, 20], [18, 28], [-35, -20], [38, -15], [-50, 10], [52, 12],
      [-22, 60], [24, 65], [-45, 80], [48, 85], [-10, -70], [12, -75]
    ];
    rockPositions.forEach(([rx, rz]) => {
      const ry = getErangelTerrainHeight(rx, rz);
      const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8 + (Math.abs(rx) % 3) * 0.4, 1), rockMat);
      boulder.position.set(rx, ry + 0.9, rz);
      boulder.scale.set(1.2, 0.8, 1.1);
      boulder.castShadow = true;
      boulder.receiveShadow = true;
      scene.add(boulder);
    });

    // Sosnovka Military Base Radar Dome (South Island: 0, -180)
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(12, 16, 16),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.4 })
    );
    dome.position.set(0, getErangelTerrainHeight(0, -180) + 12, -180);
    dome.castShadow = true;
    scene.add(dome);

    // 5. Electric Blue Safe-Zone Storm Barrier
    const stormWallGeo = new THREE.CylinderGeometry(360, 360, 140, 48, 1, true);
    const stormWallMat = new THREE.MeshBasicMaterial({
      color: '#00f0ff',
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const stormWall = new THREE.Mesh(stormWallGeo, stormWallMat);
    stormWall.position.set(0, 70, -40);
    scene.add(stormWall);
    g.safeZone.stormRingMesh = stormWall;

    // 6. Insertion aircraft, player operative and hostile opponents.
    if (g.phase === 'AIRPLANE') buildInsertionAircraft(scene, g);
    buildPlayerInErangel(scene, g);
    if (g.phase === 'AIRPLANE' && g.playerRig) g.playerRig.root.visible = false;
    spawnErangelOpponents(scene, g);
  };

  const getErangelTerrainHeight = (x: number, z: number): number => {
    // Water Channel dividing Mainland (Z > -60) and Sosnovka (Z < -140)
    if (z > -140 && z < -60) {
      return 0.1; // Ocean water level
    }
    // Stalber Mountain (North-East peak)
    if (x > 120 && z > 120) {
      return 26 + Math.sin(x * 0.04) * 8;
    }
    // Rolling green hills
    return Math.sin(x * 0.015) * Math.cos(z * 0.015) * 8.5 + 2.5;
  };

  const buildInsertionAircraft = (scene: THREE.Scene, g: any) => {
    const plane = new THREE.Group();
    const fuselageMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.38, metalness: 0.65 });
    const wingMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.45, metalness: 0.72 });
    const engineMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.3, metalness: 0.85 });
    const cockpitMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.15, metalness: 0.9 });

    // Fuselage (C-130 Hercules transport style)
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 18, 16), fuselageMat);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.castShadow = true;
    plane.add(fuselage);

    // Aerodynamic Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1.62, 16, 12), fuselageMat);
    nose.scale.set(1, 0.95, 1.4);
    nose.position.z = 9;
    plane.add(nose);

    // Cockpit windshield glass
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.65, 1.2), cockpitMat);
    cockpit.position.set(0, 1.1, 8.4);
    plane.add(cockpit);

    // High-Mounted Transport Wings (span 26m)
    const wing = new THREE.Mesh(new THREE.BoxGeometry(26, 0.32, 4.2), wingMat);
    wing.position.set(0, 1.4, 0.5);
    wing.castShadow = true;
    plane.add(wing);

    // 4 Turboprop Engine Nacelles + Spinning Propellers
    [-9.2, -4.6, 4.6, 9.2].forEach((x) => {
      const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 3.2, 12), engineMat);
      nacelle.rotation.x = Math.PI / 2;
      nacelle.position.set(x, 0.6, 1.2);
      plane.add(nacelle);

      const propHub = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), new THREE.MeshBasicMaterial({ color: '#facc15' }));
      propHub.position.set(x, 0.6, 2.85);
      plane.add(propHub);

      const propBlades = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: '#0f172a' }));
      propBlades.position.set(x, 0.6, 2.85);
      plane.add(propBlades);
    });

    // Rear Sloped Cargo Ramp & Tail
    const tailCone = new THREE.Mesh(new THREE.ConeGeometry(1.9, 5.5, 16), fuselageMat);
    tailCone.rotation.x = -Math.PI / 2;
    tailCone.position.set(0, 0.4, -11.5);
    plane.add(tailCone);

    // T-Tail Vertical Stabilizer & Horizontal Elevators
    const vFin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 4.8, 3.4), wingMat);
    vFin.position.set(0, 3.2, -10.5);
    plane.add(vFin);
    const hTail = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.22, 2.2), wingMat);
    hTail.position.set(0, 5.4, -10.8);
    plane.add(hTail);

    // Wingtip Navigation Lights (Red Port, Green Starboard)
    const portLight = new THREE.PointLight('#ef4444', 4, 25);
    portLight.position.set(-13.0, 1.4, 0.5);
    plane.add(portLight);
    const stbdLight = new THREE.PointLight('#22c55e', 4, 25);
    stbdLight.position.set(13.0, 1.4, 0.5);
    plane.add(stbdLight);

    const beacon = new THREE.PointLight('#ffffff', 5, 20);
    beacon.position.set(0, 5.6, -11.2);
    plane.add(beacon);

    plane.position.copy(g.airplane.position);
    scene.add(plane);
    g.airplane.mesh = plane;
  };

  const buildPlayerInErangel = (scene: THREE.Scene, g: any) => {
    const skinDef = SKIN_DEFINITIONS[selectedSkinId] || SKIN_DEFINITIONS.TACTICAL_BLACK;
    const rig = buildTheFoolJokerRig(skinDef, false);
    rig.root.position.copy(g.player.position);
    rig.root.visible = (g.phase !== 'AIRPLANE');
    scene.add(rig.root);
    g.playerRig = rig;
  };

  const spawnErangelOpponents = (scene: THREE.Scene, g: any) => {
    const totalBotCount = 19; // 1 Human Player + 19 Bots = 20 Battle Royale participants
    const bots: EnemyBot[] = [];
    const weaponsList: WeaponType[] = ['CARBINE', 'SMG', 'SHOTGUN', 'SNIPER', 'PISTOL'];

    const BOT_NAMES = [
      'Viper_Sniper', 'Ghost_Ops', 'Apex_Assault', // Squad 1 Teammates (in SQUAD mode)
      'Shadow_Wolf', 'Kraken_99', 'Falcon_Eye', 'Raptor_X', // Squad 2
      'Titan_Heavy', 'Spectre_Echo', 'Frost_Bite', 'Blaze_Fury', // Squad 3
      'Cobra_Zero', 'Havoc_Striker', 'Phantom_Reaper', 'Cyber_Ninja', // Squad 4
      'Iron_Clad', 'Vortex_Rider', 'Blood_Hound', 'Storm_Bringer' // Squad 5
    ];

    const spawnPoints = [
      [-15, -25], [18, -28], [-32, -4], [35, 6], [-10, 28], [24, 32],
      [-48, -38], [52, -42], [-58, 18], [60, 22], [-28, 48], [32, 54],
      [-68, -12], [70, -18], [-18, -62], [22, -68], [-44, 72], [46, 76],
      [0, 80]
    ];

    const isSquad = battleRoyaleMode === 'SQUAD';

    for (let i = 0; i < totalBotCount; i++) {
      const point = spawnPoints[i % spawnPoints.length];
      const bx = g.dropZone.x + point[0];
      const bz = g.dropZone.z + point[1];
      const by = getErangelTerrainHeight(bx, bz);

      let squadId = i + 2;
      let isTeammate = false;
      if (isSquad) {
        if (i < 3) {
          squadId = 1; // Player's squad
          isTeammate = true;
        } else {
          squadId = 2 + Math.floor((i - 3) / 4); // Squads 2, 3, 4, 5
        }
      }

      const rig = buildTheFoolJokerRig(
        isTeammate ? SKIN_DEFINITIONS.GLACIER_WARRIOR : SKIN_DEFINITIONS.TACTICAL_BLACK,
        true
      );
      rig.root.position.set(bx, by, bz);

      // Combat Helmet: Blue for Teammates, Red for Enemies
      const helmetColor = isTeammate ? '#0284c7' : '#dc2626';
      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 12, 12),
        new THREE.MeshStandardMaterial({ color: helmetColor, roughness: 0.3, metalness: 0.6 })
      );
      helmet.position.set(0, 1.88, 0);
      rig.root.add(helmet);

      // Overhead Billboard Group (Faces Player Camera)
      const markerGroup = new THREE.Group();
      markerGroup.position.set(0, 2.6, 0);

      // Inverted Glowing Diamond: Cyan for Teammates, Red for Enemies
      const diamondGeo = new THREE.ConeGeometry(0.24, 0.45, 4);
      const diamondMat = new THREE.MeshBasicMaterial({ color: isTeammate ? '#00f0ff' : '#ff2200' });
      const diamond = new THREE.Mesh(diamondGeo, diamondMat);
      diamond.rotation.x = Math.PI;
      diamond.position.y = 0.5;
      markerGroup.add(diamond);

      // Background Bar (Black border)
      const barBg = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.22),
        new THREE.MeshBasicMaterial({ color: '#000000', side: THREE.DoubleSide })
      );
      barBg.position.y = 0.12;
      markerGroup.add(barBg);

      // Foreground Health Fill: Green for Teammates, Red for Enemies
      const hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.34, 0.16),
        new THREE.MeshBasicMaterial({ color: isTeammate ? '#22c55e' : '#ef4444', side: THREE.DoubleSide })
      );
      hpBar.position.set(0, 0.12, 0.01);
      markerGroup.add(hpBar);

      // Beacon glow on body — emissive fake, a real PointLight per bot would
      // multiply the scene's light count and recompile every shader
      const beaconGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color: isTeammate ? '#00f0ff' : '#ff2200' })
      );
      beaconGlow.position.set(0, 1.4, 0.3);
      rig.root.add(beaconGlow);

      rig.root.add(markerGroup);
      rig.hpBarMesh = hpBar;

      scene.add(rig.root);

      bots.push({
        id: i + 1,
        name: BOT_NAMES[i] || `Operative_${String(i + 1).padStart(2, '0')}`,
        squadId,
        rig,
        position: rig.root.position,
        velocity: new THREE.Vector3(),
        hp: 100,
        maxHp: 100,
        weapon: weaponsList[i % weaponsList.length],
        state: 'PATROL',
        patrolTarget: new THREE.Vector3(bx + (Math.random() - 0.5) * 40, by, bz + (Math.random() - 0.5) * 40),
        shootCooldown: 1.0 + Math.random() * 1.5,
        healCooldown: 0,
        walkCycle: 0,
        isDead: false,
        muzzleLight: null,
        hpBarMesh: hpBar,
        markerGroup,
      });
    }

    g.bots = bots;
    g.totalAlive = 20;
    setAliveCount(20);
  };

  // ============================================================================
  // MATCH FLIGHT, INSERTION & PLAYING GAMEPLAY
  // ============================================================================
  const updateAirplaneFlight = (dt: number, g: any) => {
    const p = g.airplane;
    p.position.add(p.velocity.clone().multiplyScalar(dt));

    if (p.mesh) {
      p.mesh.position.copy(p.position);
      p.mesh.rotation.y = Math.atan2(p.velocity.x, p.velocity.z);
      p.mesh.rotation.z = Math.sin(g.elapsedTime * 1.7) * 0.02;
    }

    if (g.camera) {
      const yaw = Math.atan2(p.velocity.x, p.velocity.z);
      g.camera.position.set(
        p.position.x - Math.sin(yaw) * 36,
        p.position.y + 16,
        p.position.z - Math.cos(yaw) * 36
      );
      g.camera.lookAt(p.position);
    }

    // Auto-eject player at the far south-eastern coastline if they haven't jumped yet
    if (p.position.z > 330 && !p.hasJumped) {
      jumpFromAirplane();
    }
  };

  const jumpFromAirplane = () => {
    const g = gameRef.current;
    if (g.phase !== 'AIRPLANE') return;
    g.airplane.hasJumped = true;
    // Drop the aircraft + its 3 nav PointLights from the scene; leftover lights
    // raise per-pixel lighting cost for the rest of the match
    if (g.airplane.mesh && g.scene) {
      g.scene.remove(g.airplane.mesh);
      g.airplane.mesh.traverse((o: any) => disposeSceneObject(o));
      g.airplane.mesh = null;
    }
    g.player.position.copy(g.airplane.position);
    g.player.velocity.set(g.airplane.velocity.x * 0.45, -34, g.airplane.velocity.z * 0.45);
    g.phase = 'FREEFALL';
    if (g.playerRig) {
      g.playerRig.root.position.copy(g.player.position);
      g.playerRig.root.visible = true;
    }
    setPhase('FREEFALL');
    pushKillFeed('🪂 JUMP: Steer with WASD. Parachute auto-deploys at 65m!');
  };

  const updateFreefallAndParachute = (dt: number, g: any) => {
    const p = g.player;
    const yaw = g.mouseLook.yaw;

    // Free steering with WASD / Arrows across the entire map
    if (g.keys.arrowLeft || g.keys.a) g.mouseLook.yaw += 2.2 * dt;
    if (g.keys.arrowRight || g.keys.d) g.mouseLook.yaw -= 2.2 * dt;

    const groundY = getErangelTerrainHeight(p.position.x, p.position.z);
    const altitude = p.position.y - groundY;

    // ── Automatic Parachute Deployment at 65m above ground! ─────────────────
    if (g.phase === 'FREEFALL' && altitude <= 65) {
      g.phase = 'PARACHUTE';
      setPhase('PARACHUTE');
      pushKillFeed('🪂 AUTO-DEPLOY: Parachute opened at 65m!');
    }

    let glideSpeed = g.phase === 'PARACHUTE' ? 16 : 28;
    let descentRate = g.phase === 'PARACHUTE' ? -8.5 : -42;

    if (g.phase === 'FREEFALL') {
      if (g.keys.w || g.keys.arrowUp) {
        // Steep dive: higher speed, faster descent to target location
        glideSpeed = 36;
        descentRate = -65;
      } else if (g.keys.s || g.keys.arrowDown) {
        // Aerodynamic glide: slow descent, travel further across the island
        glideSpeed = 44;
        descentRate = -25;
      }
    } else {
      // Parachute glide steering
      if (g.keys.w || g.keys.arrowUp) glideSpeed = 22;
      if (g.keys.s || g.keys.arrowDown) glideSpeed = 10;

      if (!g.parachuteMesh && g.playerRig) {
        g.parachuteMesh = buildParachuteCanopyMesh();
        g.playerRig.root.add(g.parachuteMesh);
      }
    }

    p.velocity.y += (descentRate - p.velocity.y) * 4 * dt;
    p.velocity.x = Math.sin(yaw) * glideSpeed;
    p.velocity.z = Math.cos(yaw) * glideSpeed;
    p.position.add(p.velocity.clone().multiplyScalar(dt));

    if (g.playerRig) {
      g.playerRig.root.visible = true;
      g.playerRig.root.position.copy(p.position);
      g.playerRig.root.rotation.y = yaw;
      g.playerRig.root.rotation.x = g.phase === 'FREEFALL' ? 0.35 : 0.08;
    }

    if (g.camera) {
      const camDist = g.phase === 'PARACHUTE' ? 8.5 : 6.0;
      const camH = g.phase === 'PARACHUTE' ? 5.5 : 3.5;
      g.camera.position.set(
        p.position.x - Math.sin(yaw) * camDist,
        p.position.y + camH,
        p.position.z - Math.cos(yaw) * camDist
      );
      g.camera.lookAt(p.position);
    }

    if (p.position.y <= groundY + 0.5) {
      p.position.y = groundY + 1.0;
      p.velocity.set(0, 0, 0);
      if (g.parachuteMesh && g.playerRig) {
        g.playerRig.root.remove(g.parachuteMesh);
        g.parachuteMesh = null;
      }
      if (g.playerRig) {
        g.playerRig.root.visible = true;
        g.playerRig.root.rotation.x = 0;
      }
      g.phase = 'PLAYING';
      setPhase('PLAYING');
      pushKillFeed('⚔️ TOUCHDOWN: Hostiles active! Loot death crates & survive!');
    }
  };

  const updateCombatGameplay = (dt: number, g: any) => {
    const p = g.player;
    const yaw = g.mouseLook.yaw;
    const pitch = g.mouseLook.pitch;

    // ── VFX pool tick: zero-setTimeout bullet effect cleanup ──────────────────
    for (let i = g.vfxPool.length - 1; i >= 0; i--) {
      g.vfxPool[i].life -= dt;
      if (g.vfxPool[i].life <= 0) {
        if (g.scene) g.scene.remove(g.vfxPool[i].mesh);
        disposeSceneObject(g.vfxPool[i].mesh);
        g.vfxPool.splice(i, 1);
      }
    }

    // ── Smooth ragdoll animation for dying bots ───────────────────────────────
    for (let i = g.dyingBots.length - 1; i >= 0; i--) {
      const db = g.dyingBots[i];
      db.timer += dt;
      const t = Math.min(1, db.timer / 0.35);
      if (db.bot.rig) {
        db.bot.rig.root.rotation.x = t * (Math.PI / 2);
        db.bot.rig.root.position.y = 0.22 * t;
      }
      if (t >= 1) g.dyingBots.splice(i, 1);
    }

    // ── Pulse loot-crate beacon beams (BGMI shimmer effect) ──────────────────
    g.lootCrates.forEach((crate: any) => {
      if (!crate.looted && crate.beamMesh) {
        (crate.beamMesh.material as any).opacity =
          0.28 + Math.sin(g.elapsedTime * 4.5) * 0.17;
      }
    });

    // ── Healing Pulse Light around player (pooled — never removed from scene) ─
    if (!g.healLight && g.scene) {
      g.healLight = new THREE.PointLight('#22c55e', 0, 6);
      g.scene.add(g.healLight);
    }
    if (g.healLight) {
      if (g.isHealing && g.playerRig) {
        g.healLight.position.copy(p.position).add(new THREE.Vector3(0, 1.0, 0));
        g.healLight.intensity = 2.5 + Math.sin(g.elapsedTime * 9) * 1.8;
      } else {
        g.healLight.intensity = 0;
      }
    }

    // ── Muzzle flash light decay ──────────────────────────────────────────────
    if (g.muzzleFlashLight && g.muzzleFlashLight.intensity > 0) {
      g.muzzleFlashLight.intensity = Math.max(0, g.muzzleFlashLight.intensity - dt * 110);
    }

    // ── Weapon recoil spring recovery ───────────────────────────────────────
    if (g.playerRig && g.playerRig.weaponAnchor) {
      g.playerRig.weaponAnchor.position.z += (0.1 - g.playerRig.weaponAnchor.position.z) * 0.2;
    }

    // ── Gradual camera pitch recoil settling ────────────────────────────────
    if (g.mouseLook.pitch > 0.05 && !g.isFiring) {
      g.mouseLook.pitch -= dt * 0.2;
    }

    // ── Movement ─────────────────────────────────────────────────────────────
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const moveDir = new THREE.Vector3();

    // Arrow Keys & WASD
    if (g.keys.arrowLeft) g.mouseLook.yaw += 2.6 * dt;
    if (g.keys.arrowRight) g.mouseLook.yaw -= 2.6 * dt;
    if (g.keys.arrowUp) moveDir.add(fwd);
    if (g.keys.arrowDown) moveDir.sub(fwd);

    if (g.keys.w) moveDir.add(fwd);
    if (g.keys.s) moveDir.sub(fwd);
    if (g.keys.d) moveDir.add(right);
    if (g.keys.a) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0;
    if (isMoving) moveDir.normalize();

    const isCrouching = g.keys.crouch;
    const speed = isCrouching ? 3.0 : (g.keys.shift ? 10.5 : 6.2);
    p.velocity.x = moveDir.x * speed;
    p.velocity.z = moveDir.z * speed;

    // Horizontal movement
    p.position.x += p.velocity.x * dt;
    p.position.z += p.velocity.z * dt;

    // ── Jump physics & gravity ────────────────────────────────────────────────
    p.jumpVelocity = (p.jumpVelocity || 0) - 22 * dt;
    p.position.y += p.jumpVelocity * dt;
    const groundH = getErangelTerrainHeight(p.position.x, p.position.z);
    const standH = isCrouching ? 0.55 : 1.0;
    if (p.position.y <= groundH + standH) {
      p.position.y = groundH + standH;
      p.jumpVelocity = 0;
      p.isGrounded = true;
    } else {
      p.isGrounded = false;
    }

    if (g.playerRig) {
      const rig = g.playerRig;
      rig.root.visible = true;
      rig.root.position.copy(p.position);
      rig.root.rotation.y = yaw;

      // Smooth crouch squash
      const crouchScaleY = isCrouching ? 0.62 : 1.0;
      rig.torsoGroup.scale.y += (crouchScaleY - rig.torsoGroup.scale.y) * 0.22;

      if (isMoving) {
        p.walkCycle += dt * (isCrouching ? 7 : 12);
        const stride = Math.sin(p.walkCycle) * (isCrouching ? 0.4 : 0.7);
        rig.legLGroup.rotation.x = stride;
        rig.legRGroup.rotation.x = -stride;
        rig.torsoGroup.position.y = 1.15 + Math.abs(Math.sin(p.walkCycle)) * 0.04;
      } else {
        rig.torsoGroup.position.y = 1.15 + Math.sin(g.elapsedTime * 2.4) * 0.015;
        rig.legLGroup.rotation.x = 0;
        rig.legRGroup.rotation.x = 0;
      }
    }

    // ── Camera ────────────────────────────────────────────────────────────────
    if (g.camera) {
      const fov = g.mouseLook.isAiming ? p.currentWeapon.zoomFOV : 65;
      g.camera.fov += (fov - g.camera.fov) * 0.2;
      g.camera.updateProjectionMatrix();

      const dist = g.mouseLook.isAiming ? 1.6 : 3.5;
      const camH = isCrouching ? 1.1 : (g.mouseLook.isAiming ? 1.65 : 1.85);

      g.camera.position.set(
        p.position.x - Math.sin(yaw) * dist + Math.cos(yaw) * 0.6,
        p.position.y + camH + Math.sin(pitch) * 1.5,
        p.position.z - Math.cos(yaw) * dist - Math.sin(yaw) * 0.6
      );
      g.camera.lookAt(
        p.position.x + Math.sin(yaw) * 35,
        p.position.y + 1.4 - pitch * 12,
        p.position.z + Math.cos(yaw) * 35
      );
    }

    // Auto Fire
    if (g.isFiring && p.currentWeapon.isAutomatic) {
      fireWeapon();
    }

    // ── Nearby loot crate check — stored in gameRef to fix stale closure ──────
    let closestCrate: any = null;
    let closestDist = 999;
    g.lootCrates.forEach((crate: any) => {
      if (crate.looted) return;
      const d = p.position.distanceTo(crate.position);
      if (d < 3.5 && d < closestDist) {
        closestDist = d;
        closestCrate = crate;
      }
    });
    g.currentNearbyLootCrate = closestCrate;
    setNearbyLootCrate(closestCrate);

    // Safe Zone & AI
    updateErangelSafeZone(dt, g);
    updateErangelBotAI(dt, g);
    renderErangelRadar(g);
  };

  // Safe Zone Periodic Damage Tick System
  const updateErangelSafeZone = (dt: number, g: any) => {
    const sz = g.safeZone;
    sz.shrinkTimer -= dt;
    setSafeZoneTime(Math.max(0, Math.round(sz.shrinkTimer)));

    if (sz.radius > sz.targetRadius) {
      sz.radius -= dt * 2.8;
      sz.center.lerp(sz.targetCenter, 0.005);
    }

    if (sz.shrinkTimer <= 0) {
      sz.currentStage += 1;
      setSafeZonePhase(sz.currentStage);
      sz.shrinkTimer = 90;
      sz.targetRadius = Math.max(30, sz.targetRadius * 0.55);
      pushKillFeed(`⚠️ PLAYZONE CONTRACTING: Phase ${sz.currentStage}!`);
    }

    if (sz.stormRingMesh) {
      sz.stormRingMesh.position.set(sz.center.x, 70, sz.center.y);
      sz.stormRingMesh.scale.set(sz.radius / 360, 1, sz.radius / 360);
    }

    const currentDPS = sz.baseDPS + (sz.currentStage - 1) * 4;
    sz.damageTickTimer += dt;
    const isTick = sz.damageTickTimer >= 1.0;
    if (isTick) sz.damageTickTimer = 0;

    // Player Check
    const pDist = new THREE.Vector2(g.player.position.x, g.player.position.z).distanceTo(sz.center);
    const pOutside = pDist > sz.radius;
    setIsOutsideSafeZone(pOutside);

    if (pOutside && isTick) {
      if (g.player.armor > 0) {
        g.player.armor = Math.max(0, g.player.armor - currentDPS * 0.6);
        setPlayerArmor(Math.round(g.player.armor));
      } else {
        g.player.hp = Math.max(0, g.player.hp - currentDPS);
        setPlayerHp(Math.round(g.player.hp));
      }
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 90);

      if (g.player.hp <= 0) {
        handleGameOver();
      }
    }

    // Bot Elimination Outside Zone
    if (isTick) {
      g.bots.forEach((b: EnemyBot) => {
        if (b.isDead) return;
        const bDist = new THREE.Vector2(b.position.x, b.position.z).distanceTo(sz.center);
        if (bDist > sz.radius) {
          b.hp = Math.max(0, b.hp - currentDPS);
          if (b.hpBarMesh) b.hpBarMesh.scale.x = Math.max(0.01, b.hp / b.maxHp);
          if (b.hp <= 0 && !b.isDead) {
            b.isDead = true;
            b.state = 'DEAD';
            if (b.markerGroup) b.markerGroup.visible = false;
            if (b.rig) {
              g.dyingBots.push({ bot: b, timer: 0 });
            }
            spawnDeathLootCrate(b.position.clone(), b.name, g);
            g.totalAlive = Math.max(1, g.totalAlive - 1);
            setAliveCount(g.totalAlive);
            pushKillFeed(`☣️ ${b.name} fell to the Playzone`);
            if (g.totalAlive === 1 && g.player.hp > 0) handleGameVictory();
          }
        }
      });
    }
  };

  const updateErangelBotAI = (dt: number, g: any) => {
    const p = g.player;
    const yaw = g.mouseLook?.yaw || 0;
    const bearings: { id: number; dist: number; angleDiff: number }[] = [];
    const isSquad = battleRoyaleMode === 'SQUAD';

    g.bots.forEach((b: EnemyBot) => {
      if (b.isDead) return;

      // Always billboard overhead marker to directly face camera
      if (b.markerGroup && g.camera) {
        b.markerGroup.quaternion.copy(g.camera.quaternion);
      }

      // Update cooldowns
      if (b.healCooldown > 0) b.healCooldown -= dt;
      if (b.shootCooldown > 0) b.shootCooldown -= dt;

      // ── Locomotion Animation (Running, Walking, Aiming) ───────────────────
      b.walkCycle += dt * (b.state === 'ATTACK' ? 5.5 : 10.5);
      const stride = Math.sin(b.walkCycle) * 0.65;
      b.rig.legLGroup.rotation.x = stride;
      b.rig.legRGroup.rotation.x = -stride;
      b.rig.armLGroup.rotation.x = -stride * 0.7;
      b.rig.armRGroup.rotation.x = stride * 0.7;

      // Track distance to human player for HUD bearings / radar
      const distToPlayer = b.position.distanceTo(p.position);
      if (b.squadId !== 1 && distToPlayer < 140) {
        const targetAngle = Math.atan2(b.position.x - p.position.x, b.position.z - p.position.z);
        let diff = targetAngle - yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        bearings.push({ id: b.id, dist: Math.round(distToPlayer), angleDiff: diff });
      }

      // ── Self-Preservation & Healing System ────────────────────────────────
      if (b.hp < 40 && b.healCooldown <= 0) {
        b.state = 'COVER';
        b.hp = Math.min(b.maxHp, b.hp + 35);
        b.healCooldown = 14;
        if (b.hpBarMesh) {
          b.hpBarMesh.scale.x = Math.max(0.01, b.hp / b.maxHp);
        }
      }

      // ── Intelligent Target Selection (Enemies fight EACH OTHER) ───────────
      // A valid target can be the human player (if not teammate) OR any other bot with a different squadId
      let target: { isPlayer: boolean; bot?: EnemyBot; pos: THREE.Vector3; dist: number } | null = null;
      let minTargetDist = 80; // combat awareness radius

      // Consider Human Player
      if (b.squadId !== 1 && p.hp > 0 && distToPlayer < minTargetDist) {
        minTargetDist = distToPlayer;
        target = { isPlayer: true, pos: p.position, dist: distToPlayer };
      }

      // Consider all other alive bots from opposing squads
      for (let i = 0; i < g.bots.length; i++) {
        const other = g.bots[i];
        if (other.id === b.id || other.isDead || other.squadId === b.squadId) continue;
        const d = b.position.distanceTo(other.position);
        if (d < minTargetDist) {
          minTargetDist = d;
          target = { isPlayer: false, bot: other, pos: other.position, dist: d };
        }
      }

      // ── Tactical Actions ──────────────────────────────────────────────────
      if (target) {
        b.rig.root.lookAt(target.pos.x, b.position.y, target.pos.z);

        if (target.dist > 32) {
          // CHASE / REPOSITION: Move closer to target while using terrain cover
          b.state = 'CHASE';
          const toTarget = target.pos.clone().sub(b.position).normalize();
          b.position.add(toTarget.multiplyScalar(4.5 * dt));
          b.position.y = getErangelTerrainHeight(b.position.x, b.position.z);
          b.rig.root.position.copy(b.position);
        } else {
          // ATTACK: Open fire on opponent
          b.state = 'ATTACK';
          if (b.shootCooldown <= 0) {
            b.shootCooldown = 0.9 + Math.random() * 0.7;

            // Audio: Gunshots audible if nearby
            if (distToPlayer < 75) {
              playGunshotSound(b.weapon);
            }

            // Visual Tracer from Bot to Target
            if (g.scene) {
              try {
                const tracerStart = b.position.clone().add(new THREE.Vector3(0, 1.4, 0));
                const dir = target.pos.clone().sub(tracerStart);
                const tLen = Math.min(dir.length(), 35);
                dir.normalize();
                const tracerMesh = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.04, 0.04, tLen, 4),
                  new THREE.MeshBasicMaterial({ color: b.squadId === 1 ? '#00f0ff' : '#ff4400' })
                );
                tracerMesh.position.copy(tracerStart.clone().addScaledVector(dir, tLen / 2));
                tracerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                g.scene.add(tracerMesh);
                g.vfxPool.push({ mesh: tracerMesh, life: 0.06 });
              } catch (e) {}
            }

            // Damage Resolution
            if (target.isPlayer) {
              // Bot damages human player
              if (Math.random() < 0.45) {
                let dmg = 12;
                if (p.armor > 0) {
                  const absorbed = Math.min(p.armor, Math.round(dmg * 0.6));
                  p.armor -= absorbed;
                  dmg -= absorbed;
                  setPlayerArmor(p.armor);
                }
                p.hp = Math.max(0, p.hp - dmg);
                setPlayerHp(p.hp);
                setDamageFlash(true);
                setTimeout(() => setDamageFlash(false), 80);
                if (p.hp <= 0) handleGameOver();
              }
            } else if (target.bot && !target.bot.isDead) {
              // Bot damages opponent bot!
              const victim = target.bot;
              const dmg = 20 + Math.floor(Math.random() * 12);
              victim.hp = Math.max(0, victim.hp - dmg);
              if (victim.hpBarMesh) {
                victim.hpBarMesh.scale.x = Math.max(0.001, victim.hp / victim.maxHp);
              }

              // Victim Elimination
              if (victim.hp <= 0 && !victim.isDead) {
                victim.isDead = true;
                victim.state = 'DEAD';
                if (victim.markerGroup) victim.markerGroup.visible = false;
                if (victim.rig) {
                  g.dyingBots.push({ bot: victim, timer: 0 });
                }
                spawnDeathLootCrate(victim.position.clone(), victim.name, g);
                g.totalAlive = Math.max(1, g.totalAlive - 1);
                setAliveCount(g.totalAlive);
                pushKillFeed(`💥 ${b.name} eliminated ${victim.name} with ${b.weapon}`);

                // Check Victory
                if (isSquad) {
                  const hostileAlive = g.bots.filter((bt: EnemyBot) => bt.squadId !== 1 && !bt.isDead).length;
                  if (hostileAlive === 0 && (p.hp > 0 || g.bots.some((bt: EnemyBot) => bt.squadId === 1 && !bt.isDead))) {
                    handleGameVictory();
                  }
                } else {
                  if (g.totalAlive === 1 && p.hp > 0) {
                    handleGameVictory();
                  }
                }
              }
            }
          }
        }
      } else {
        // No enemy in combat range
        if (b.squadId === 1) {
          // Teammate logic: follow player in squad formation
          if (distToPlayer > 18) {
            b.state = 'CHASE';
            const toPlayer = p.position.clone().sub(b.position).normalize();
            b.position.add(toPlayer.multiplyScalar(4.0 * dt));
            b.position.y = getErangelTerrainHeight(b.position.x, b.position.z);
            b.rig.root.position.copy(b.position);
            b.rig.root.rotation.y = Math.atan2(-toPlayer.x, -toPlayer.z);
          } else {
            b.state = 'PATROL';
            b.rig.root.lookAt(p.position.x + 5, b.position.y, p.position.z + 5);
          }
        } else {
          // Standard patrol between tactical waypoints
          b.state = 'PATROL';
          const toTarget = b.patrolTarget.clone().sub(b.position);
          if (toTarget.length() < 3) {
            b.patrolTarget.set(b.position.x + (Math.random() - 0.5) * 50, 0, b.position.z + (Math.random() - 0.5) * 50);
          } else {
            toTarget.normalize();
            b.position.add(toTarget.multiplyScalar(3.2 * dt));
            b.position.y = getErangelTerrainHeight(b.position.x, b.position.z);
            b.rig.root.position.copy(b.position);
            b.rig.root.rotation.y = Math.atan2(-toTarget.x, -toTarget.z);
          }
        }
      }
    });

    // Throttle React state updates to ~10 FPS for zero UI lag
    if (g.elapsedTime - g.lastBotUIUpdate >= 0.1) {
      g.lastBotUIUpdate = g.elapsedTime;
      setNearbyEnemyBearings(bearings.sort((a: any, b: any) => a.dist - b.dist).slice(0, 4));
      let deg = Math.round(((yaw * 180) / Math.PI) % 360);
      if (deg < 0) deg += 360;
      setCompassHeading(deg);

      // Sync Squad Teammates Telemetry HUD in SQUAD mode
      if (isSquad && g.bots && g.bots.length >= 3) {
        setSquadTeammates([
          { id: g.bots[0].id, num: 2, name: g.bots[0].name, hp: g.bots[0].hp, maxHp: g.bots[0].maxHp, isDead: g.bots[0].isDead },
          { id: g.bots[1].id, num: 3, name: g.bots[1].name, hp: g.bots[1].hp, maxHp: g.bots[1].maxHp, isDead: g.bots[1].isDead },
          { id: g.bots[2].id, num: 4, name: g.bots[2].name, hp: g.bots[2].hp, maxHp: g.bots[2].maxHp, isDead: g.bots[2].isDead },
        ]);
      }
    }
  };

  const renderErangelRadar = (g: any) => {
    if (!minimapCanvasRef.current) return;
    const now = g.elapsedTime;
    if (now - g.lastRadarRender < 0.08) return; // Throttled to ~12 FPS for zero lag
    g.lastRadarRender = now;

    const cvs = minimapCanvasRef.current;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const cx = cvs.width / 2;
    const cy = cvs.height / 2;
    const radius = cx - 2;

    // Draw Circular Clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Satellite Map Background from Image 2
    if (radarMapImgRef.current && radarMapImgRef.current.complete) {
      const normX = (g.player.position.x + 450) / 900;
      const normZ = (g.player.position.z + 450) / 900;
      const img = radarMapImgRef.current;
      const cropW = img.width * 0.28;
      const cropH = img.height * 0.28;
      const sx = Math.max(0, Math.min(img.width - cropW, normX * img.width - cropW / 2));
      const sy = Math.max(0, Math.min(img.height - cropH, normZ * img.height - cropH / 2));
      ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, cvs.width, cvs.height);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, cvs.width, cvs.height);
    }

    const scale = 0.25;

    // Safe Zone Ring (White Circle)
    const szX = cx + (g.safeZone.center.x - g.player.position.x) * scale;
    const szY = cy + (g.safeZone.center.y - g.player.position.z) * scale;
    const szR = g.safeZone.radius * scale;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(szX, szY, Math.max(4, szR), 0, Math.PI * 2);
    ctx.stroke();

    // Bot Blips: Cyan for Teammates, Red for Enemies
    g.bots.forEach((b: EnemyBot) => {
      if (b.isDead) return;
      const bx = cx + (b.position.x - g.player.position.x) * scale;
      const by = cy + (b.position.z - g.player.position.z) * scale;
      if (Math.hypot(bx - cx, by - cy) < radius) {
        ctx.fillStyle = b.squadId === 1 ? '#00f0ff' : '#ef4444';
        ctx.beginPath();
        ctx.arc(bx, by, b.squadId === 1 ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Player Pin & Direction Pointer
    ctx.fillStyle = '#00f0ff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const yaw = g.mouseLook?.yaw || 0;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(yaw) * 12, cy + Math.cos(yaw) * 12);
    ctx.stroke();

    ctx.restore();

    // Golden Outer Ring
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  };

  const fireWeapon = () => {
    const g = gameRef.current;
    const p = g.player;
    if (g.phase !== 'PLAYING') return;
    if (p.reloading) return;

    // Auto-reload if clip is empty
    if (p.clip <= 0) {
      reloadWeapon();
      return;
    }

    const now = g.elapsedTime;
    if (now - p.lastShotTime < p.currentWeapon.fireRate) return;
    p.lastShotTime = now;

    p.clip -= 1;
    setAmmoClip(p.clip);
    playGunshotSound(p.currentWeapon.id);

    if (!g.camera || !g.scene) return;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), g.camera);

    const activeBots = g.bots.filter((b: EnemyBot) => !b.isDead);
    const botRoots = activeBots.map((b: EnemyBot) => b.rig.root);
    const hits = ray.intersectObjects(botRoots, true);

    let targetHitPoint = ray.ray.at(120, new THREE.Vector3());

    if (hits.length > 0) {
      targetHitPoint = hits[0].point;
      let hitObj: THREE.Object3D | null = hits[0].object;
      let struckBot: EnemyBot | undefined;
      while (hitObj && !struckBot) {
        struckBot = g.bots.find((b: EnemyBot) => b.rig?.root === hitObj);
        hitObj = hitObj.parent;
      }

      if (struckBot && !struckBot.isDead) {
        if (battleRoyaleMode === 'SQUAD' && struckBot.squadId === 1) {
          pushKillFeed(`⚠️ Teammate: Do not shoot ${struckBot.name}!`);
          return;
        }

        struckBot.hp = Math.max(0, struckBot.hp - p.currentWeapon.damage);
        if (struckBot.hpBarMesh) {
          struckBot.hpBarMesh.scale.x = Math.max(0.001, struckBot.hp / struckBot.maxHp);
        }
        playHitMarkerSound();
        setHitMarker(true);
        setTimeout(() => setHitMarker(false), 80);
        setFloatingDamage({ text: `-${p.currentWeapon.damage}`, color: p.currentWeapon.color });
        setTimeout(() => setFloatingDamage(null), 550);

        if (struckBot.hp <= 0 && !struckBot.isDead) {
          struckBot.isDead = true;
          struckBot.state = 'DEAD';
          if (struckBot.markerGroup) struckBot.markerGroup.visible = false;
          if (struckBot.rig) {
            g.dyingBots.push({ bot: struckBot, timer: 0 });
          }
          spawnDeathLootCrate(struckBot.position.clone(), struckBot.name, g);
          g.eliminationCount++;
          setKillsCount(g.eliminationCount);
          g.totalAlive = Math.max(1, g.totalAlive - 1);
          setAliveCount(g.totalAlive);

          setEliminationBanner({
            visible: true,
            victimName: struckBot.name,
            kills: g.eliminationCount,
            remaining: g.totalAlive,
          });
          setTimeout(() => setEliminationBanner((prev) => ({ ...prev, visible: false })), 2600);
          pushKillFeed(`${playerProfile.name} eliminated ${struckBot.name} with ${p.currentWeapon.name}`);

          if (battleRoyaleMode === 'SQUAD') {
            const hostileAlive = g.bots.filter((bt: EnemyBot) => bt.squadId !== 1 && !bt.isDead).length;
            if (hostileAlive === 0 && (p.hp > 0 || g.bots.some((bt: EnemyBot) => bt.squadId === 1 && !bt.isDead))) {
              handleGameVictory();
            }
          } else {
            if (g.totalAlive === 1 && p.hp > 0) handleGameVictory();
          }
        }
      }
    }

    // Dynamic Visual Fire: Muzzle Flame + 3D Glowing Tracer + Target Sparks + Weapon Kick
    try {
      const yaw = g.mouseLook?.yaw || 0;
      const muzzleStart = new THREE.Vector3(
        p.position.x + Math.sin(yaw) * 0.45 + Math.cos(yaw) * 0.25,
        p.position.y + 1.25,
        p.position.z + Math.cos(yaw) * 0.45 - Math.sin(yaw) * 0.25
      );

      // Weapon Kickback Recoil & Camera Pitch Kick
      if (g.playerRig && g.playerRig.weaponAnchor) {
        g.playerRig.weaponAnchor.position.z -= 0.16;
      }
      g.mouseLook.pitch = Math.min(0.85, g.mouseLook.pitch + (p.currentWeapon.recoil || 0.025));

      // 1. Bright Glowing Muzzle Flame & PointLight (VFX pool — no setTimeout)
      const flashMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        new THREE.MeshBasicMaterial({ color: '#fffb00' })
      );
      flashMesh.position.copy(muzzleStart);
      g.scene.add(flashMesh);
      g.vfxPool.push({ mesh: flashMesh, life: 0.065 });

      // One persistent pooled light: adding/removing lights per shot forces a
      // full shader recompile of every material in the scene (massive stutter)
      if (!g.muzzleFlashLight && g.scene) {
        g.muzzleFlashLight = new THREE.PointLight('#ff9900', 0, 8);
        g.scene.add(g.muzzleFlashLight);
      }
      if (g.muzzleFlashLight) {
        g.muzzleFlashLight.position.copy(muzzleStart);
        g.muzzleFlashLight.intensity = 7;
      }

      // 2. Thick Glowing 3D Cylinder Tracer Round (VFX pool — no setTimeout)
      const dir = targetHitPoint.clone().sub(muzzleStart);
      const dist = dir.length();
      if (dist > 0.4) {
        dir.normalize();
        const tracerLen = Math.min(dist, 40);
        const tracerMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, tracerLen, 6),
          new THREE.MeshBasicMaterial({ color: p.currentWeapon.color || '#ffea00' })
        );
        const centerPos = muzzleStart.clone().addScaledVector(dir, tracerLen / 2);
        tracerMesh.position.copy(centerPos);
        tracerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        g.scene.add(tracerMesh);
        g.vfxPool.push({ mesh: tracerMesh, life: 0.075 });
      }

      // 3. Impact Spark Burst at Target Hit Point (VFX pool — no setTimeout)
      const sparkMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 6, 6),
        new THREE.MeshBasicMaterial({ color: '#ff3b30' })
      );
      sparkMesh.position.copy(targetHitPoint);
      g.scene.add(sparkMesh);
      g.vfxPool.push({ mesh: sparkMesh, life: 0.07 });
    } catch (e) {}
  };

  const reloadWeapon = () => {
    const g = gameRef.current;
    const p = g.player;
    if (p.reloading || p.clip >= p.currentWeapon.clipSize || p.reserve <= 0) return;
    p.reloading = true;
    setIsReloading(true);
    pushKillFeed(`🔄 Reloading ${p.currentWeapon.name}...`);
    setTimeout(() => {
      const needed = p.currentWeapon.clipSize - p.clip;
      const amount = Math.min(needed, p.reserve);
      p.clip += amount;
      p.reserve -= amount;
      p.reloading = false;
      setIsReloading(false);
      setAmmoClip(p.clip);
      setAmmoReserve(p.reserve);
    }, p.currentWeapon.reloadTime * 1000);
  };

  const switchWeapon = (type: WeaponType) => {
    const def = WEAPON_REGISTRY[type];
    const g = gameRef.current;
    g.player.currentWeapon = def;
    setCurrentWeapon(def);
    setAmmoClip(def.clipSize);
    setAmmoReserve(def.reserveMax);

    if (g.playerRig) {
      const rig = g.playerRig;
      if (rig.currentWeaponMesh) rig.weaponAnchor.remove(rig.currentWeaponMesh);
      const skin = SKIN_DEFINITIONS[selectedSkinId]?.weaponSkin || 'GLACIER_M416';
      const newMesh = buildWeaponModelMesh(type, skin);
      rig.currentWeaponMesh = newMesh;
      rig.weaponAnchor.add(newMesh);
    }
  };

  const spawnDeathLootCrate = (pos: THREE.Vector3, botName: string, g: any) => {
    if (!g.scene) return;
    const crateGroup = new THREE.Group();
    crateGroup.position.set(pos.x, getErangelTerrainHeight(pos.x, pos.z) + 0.35, pos.z);

    // Military Green / Wooden Supply Box
    const boxGeo = new THREE.BoxGeometry(1.2, 0.7, 0.8);
    const boxMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      roughness: 0.35,
      metalness: 0.3,
    });
    const boxMesh = new THREE.Mesh(boxGeo, boxMat);
    boxMesh.castShadow = true;
    crateGroup.add(boxMesh);

    // Gold Rim Latch
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 0.08, 0.84),
      new THREE.MeshBasicMaterial({ color: '#facc15' })
    );
    rim.position.y = 0.25;
    crateGroup.add(rim);

    // Iconic BGMI Vertical Green Light Beam
    const beamGeo = new THREE.CylinderGeometry(0.18, 0.18, 16, 12);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#22c55e',
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 8;
    crateGroup.add(beam);

    // Emissive glow cap instead of a PointLight (light count = shader recompiles)
    const glowCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#22c55e' })
    );
    glowCap.position.y = 1.0;
    crateGroup.add(glowCap);

    g.scene.add(crateGroup);
    g.lootCrates.push({
      id: Date.now() + Math.random(),
      position: crateGroup.position,
      mesh: crateGroup,
      looted: false,
      botName,
      beamMesh: beam,
    });
  };

  const useMedkit = () => {
    const g = gameRef.current;
    const p = g.player;
    if (g.phase !== 'PLAYING') return;
    if (p.hp >= 100) {
      pushKillFeed('⚠️ Health already full (100 HP)!');
      return;
    }
    if (g.medkits <= 0) {
      pushKillFeed('❌ No Medkits! Loot enemy death crates.');
      return;
    }
    if (g.isHealing) return;

    g.isHealing = true;
    setIsHealing(true);
    setHealProgress(0);
    playMedkitSound();
    pushKillFeed('🩹 Applying First Aid Medkit...');

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.25;
      setHealProgress(Math.min(1, progress));
      if (progress >= 1.0) {
        clearInterval(interval);
        g.isHealing = false;
        setIsHealing(false);
        g.medkits = Math.max(0, g.medkits - 1);
        setMedkitCount(g.medkits);
        g.player.hp = 100;
        setPlayerHp(100);
        pushKillFeed('💚 FULL HP RESTORED (100 HP)!');
      }
    }, 400);
  };

  const lootCrate = (crate: any) => {
    const g = gameRef.current;
    if (!crate || crate.looted) return;
    crate.looted = true;
    if (crate.beamMesh) crate.mesh.remove(crate.beamMesh);

    g.medkits += 1;
    setMedkitCount(g.medkits);

    g.player.reserve += 60;
    setAmmoReserve(g.player.reserve);

    g.player.armor = Math.min(100, g.player.armor + 40);
    setPlayerArmor(g.player.armor);

    setNearbyLootCrate(null);
    playLootPickupSound();
    pushKillFeed(`📦 LOOTED: +1 Medkit, +60 Ammo, +40 Armor from ${crate.botName}'s Crate!`);
  };

  const setupInputControls = (canvas: HTMLCanvasElement, g: any) => {
    let isCombatMouseDown = false;
    let lastCombatMouseX = 0;
    let lastCombatMouseY = 0;

    const onKeyDown = (e: KeyboardEvent) => {
      // Arrow keys must not scroll the browser page (caused the "lag" jumpiness)
      if (e.key.startsWith('Arrow')) e.preventDefault();
      const k = e.key.toLowerCase();
      if (k === 'w') g.keys.w = true;
      if (k === 'a') g.keys.a = true;
      if (k === 's') g.keys.s = true;
      if (k === 'd') g.keys.d = true;
      if (e.key === 'ArrowLeft') g.keys.arrowLeft = true;
      if (e.key === 'ArrowRight') g.keys.arrowRight = true;
      if (e.key === 'ArrowUp') g.keys.arrowUp = true;
      if (e.key === 'ArrowDown') g.keys.arrowDown = true;
      if (e.key === 'Shift') g.keys.shift = true;
      if (k === 'r') reloadWeapon();
      if (e.key === ' ') {
        e.preventDefault();
        if (g.phase === 'AIRPLANE') jumpFromAirplane();
        else if (g.phase === 'FREEFALL') {
          g.phase = 'PARACHUTE';
          setPhase('PARACHUTE');
        } else if (g.phase === 'PLAYING' && g.player.isGrounded) {
          // Jump!
          g.player.jumpVelocity = 6.5;
          g.player.isGrounded = false;
        }
      }
      if (k === 'c') g.keys.crouch = true;
      if (k === 'e' && g.currentNearbyLootCrate) lootCrate(g.currentNearbyLootCrate);
      if (k === 'h' || k === '6') useMedkit();
      if (k === '1') switchWeapon('CARBINE');
      if (k === '2') switchWeapon('SMG');
      if (k === '3') switchWeapon('SHOTGUN');
      if (k === '4') switchWeapon('SNIPER');
      if (k === '5') switchWeapon('PISTOL');
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w') g.keys.w = false;
      if (k === 'a') g.keys.a = false;
      if (k === 's') g.keys.s = false;
      if (k === 'd') g.keys.d = false;
      if (e.key === 'ArrowLeft') g.keys.arrowLeft = false;
      if (e.key === 'ArrowRight') g.keys.arrowRight = false;
      if (e.key === 'ArrowUp') g.keys.arrowUp = false;
      if (e.key === 'ArrowDown') g.keys.arrowDown = false;
      if (e.key === 'Shift') g.keys.shift = false;
      if (k === 'c') g.keys.crouch = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (g.phase === 'LOBBY') {
        isDraggingLobbyRef.current = true;
        lastMouseXRef.current = e.clientX;
      } else if (g.phase === 'PLAYING') {
        isCombatMouseDown = true;
        lastCombatMouseX = e.clientX;
        lastCombatMouseY = e.clientY;

        if (e.button === 0) {
          g.isFiring = true;
          fireWeapon();
        } else if (e.button === 2) {
          e.preventDefault();
          g.mouseLook.isAiming = !g.mouseLook.isAiming;
          setIsAiming(g.mouseLook.isAiming);
        }
      }
    };

    const onMouseUp = () => {
      isDraggingLobbyRef.current = false;
      isCombatMouseDown = false;
      g.isFiring = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (g.phase === 'LOBBY' && isDraggingLobbyRef.current) {
        const deltaX = e.clientX - lastMouseXRef.current;
        lastMouseXRef.current = e.clientX;
        lobbyRotationRef.current += deltaX * 0.012;
      } else if (g.phase === 'PLAYING') {
        const sens = g.sensitivity ?? 1;
        if (document.pointerLockElement === canvas) {
          g.mouseLook.yaw -= e.movementX * 0.0024 * sens;
          g.mouseLook.pitch -= e.movementY * 0.0024 * sens;
        } else if (isCombatMouseDown) {
          const deltaX = e.clientX - lastCombatMouseX;
          const deltaY = e.clientY - lastCombatMouseY;
          lastCombatMouseX = e.clientX;
          lastCombatMouseY = e.clientY;
          g.mouseLook.yaw -= deltaX * 0.0035 * sens;
          g.mouseLook.pitch -= deltaY * 0.0035 * sens;
        }
        g.mouseLook.pitch = Math.max(-0.6, Math.min(0.85, g.mouseLook.pitch));
      }
    };

    const onCanvasClick = () => {
      if (g.phase === 'PLAYING' && document.pointerLockElement !== canvas) {
        try {
          canvas.requestPointerLock?.();
        } catch (e) {}
      }
    };

    canvas.addEventListener('click', onCanvasClick);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('contextmenu', onContextMenu);

    // Return disposer so re-running the scene effect can't stack duplicate listeners
    return () => {
      canvas.removeEventListener('click', onCanvasClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('contextmenu', onContextMenu);
    };
  };

  const pushKillFeed = (msg: string) => {
    setKillFeed((prev) => [msg, ...prev.slice(0, 4)]);
  };

  const startErangelMatch = (instantTouchdown: any = false) => {
    playStartMatchSound();
    const g = gameRef.current;
    // ── Full match-state reset (prevents accumulation across restarts) ────────
    g.player.hp = 100;
    g.player.armor = 100;
    g.player.jumpVelocity = 0;
    g.player.isGrounded = true;

    const activeScene = g.scene;
    // Clean up loot crates from scene
    if (g.lootCrates && activeScene) {
      g.lootCrates.forEach((crate: any) => {
        if (crate.mesh) activeScene.remove(crate.mesh);
      });
    }
    g.lootCrates = [];

    // Clean up VFX from scene
    if (g.vfxPool && activeScene) {
      g.vfxPool.forEach((v: any) => {
        if (v.mesh) {
          activeScene.remove(v.mesh);
          disposeSceneObject(v.mesh);
        }
      });
    }
    g.vfxPool = [];
    g.dyingBots = [];

    // Respawn / reset bots if scene is already loaded
    if (activeScene && g.bots && g.bots.length > 0) {
      g.bots.forEach((b: any) => {
        if (b.rig?.root) activeScene.remove(b.rig.root);
      });
      spawnErangelOpponents(activeScene, g);
    }

    // Reset safe zone
    g.safeZone.radius = 360;
    g.safeZone.targetRadius = 220;
    g.safeZone.shrinkTimer = 120;
    g.safeZone.currentStage = 1;
    if (g.safeZone.stormRingMesh) {
      g.safeZone.stormRingMesh.scale.set(360, 1, 360);
    }
    setSafeZoneTime(120);
    setSafeZonePhase(1);
    setIsOutsideSafeZone(false);

    g.eliminationCount = 0;
    g.totalAlive = 20;
    g.medkits = 3;
    g.isHealing = false;
    setPlayerHp(100);
    setPlayerArmor(100);
    setKillsCount(0);
    setAliveCount(20);
    setMedkitCount(3);
    setIsHealing(false);
    setHealProgress(0);
    setKillFeed(['⚔️ MATCH COMMENCED: 20 Operatives Deployed. Eliminate hostiles to claim Victory!']);
    setEliminationBanner({ visible: false, victimName: '', kills: 0, remaining: 20 });

    if (g.parachuteMesh && g.playerRig) {
      g.playerRig.root.remove(g.parachuteMesh);
      g.parachuteMesh = null;
    }

    if (instantTouchdown === true) {
      g.phase = 'PLAYING';
      setPhase('PLAYING');
      g.player.position.set(g.dropZone.x, getErangelTerrainHeight(g.dropZone.x, g.dropZone.z) + 1.0, g.dropZone.z);
      g.player.velocity.set(0, 0, 0);
      if (g.playerRig) {
        g.playerRig.root.position.copy(g.player.position);
        g.playerRig.root.visible = true;
      }
      pushKillFeed('⚔️ TOUCHDOWN: Hostiles spotted near the insertion zone.');
    } else {
      g.phase = 'AIRPLANE';
      setPhase('AIRPLANE');
      if (g.playerRig) g.playerRig.root.visible = false;
      g.airplane.position.set(-320, 150, -360);
      g.airplane.velocity.set(22, 0, 34);
      g.airplane.hasJumped = false;
      if (g.airplane.mesh) {
        g.airplane.mesh.position.set(-320, 150, -360);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />

      <View style={styles.canvasContainer}>
        {/* 3D WebGL canvas for the Shadow Strike lobby and battleground. */}
        <div
          ref={mountRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            display: 'block',
            cursor: phase === 'PLAYING' ? 'crosshair' : 'grab',
          }}
        />

        {damageFlash && <View style={styles.damageFlash} pointerEvents="none" />}
        {isOutsideSafeZone && <View style={styles.stormVignette} pointerEvents="none" />}

        {/* Elimination Banner HUD */}
        {eliminationBanner.visible && (
          <View style={styles.elimBannerBox} pointerEvents="none">
            <Text style={styles.elimBannerTitle}>🔥 ENEMY ELIMINATED 🔥</Text>
            <Text style={styles.elimBannerVictim}>{eliminationBanner.victimName}</Text>
            <Text style={styles.elimBannerStats}>
              ELIMINATIONS: {eliminationBanner.kills} | REMAINING: {eliminationBanner.remaining}
            </Text>
          </View>
        )}

        {/* ==================================================================== */}
        {/* Original Shadow Strike tactical lobby UI. */}
        {/* ==================================================================== */}
        {phase === 'LOBBY' && (
          <View style={styles.bgmiLobbyUI} pointerEvents="box-none">
            {/* TOP BAR */}
            <View style={styles.bgmiTopBar}>
              {/* Profile Card (Left) */}
              <TouchableOpacity
                style={styles.profileSection}
                onPress={() => setShowProfileModal(true)}
                activeOpacity={0.8}
              >
                <View style={styles.avatarFrameGold}>
                  <Text style={styles.avatarIcon}>{playerProfile.avatar}</Text>
                  <View style={styles.lvlBadge}><Text style={styles.lvlText}>{1 + Math.floor(totalKills / 15)}</Text></View>
                </View>
                <View style={styles.profileDetails}>
                  <Text style={styles.profileName}>{playerProfile.name}</Text>
                  <View style={styles.onlineStatusRow}>
                    <Text style={styles.onlineCountText}>12/62</Text>
                    <Text style={styles.bellIcon}>🔔</Text>
                  </View>
                </View>
                {/* Team slots / icons */}
                <TouchableOpacity style={styles.findTeamBtn} onPress={() => setShowSquadModal(true)}>
                  <Text style={styles.findTeamText}>Squad & Friends</Text>
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Center Icons & 3D Inspect Mode Switcher */}
              <View style={styles.centerIconsRow}>
                <TouchableOpacity
                  style={styles.inspectModeToggleBtn}
                  onPress={() => {
                    lobbyRotationRef.current += Math.PI / 4;
                  }}
                >
                  <Text style={styles.inspectModeToggleText}>
                    🔄 360° SPIN HERO
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.topUtilityIcon} onPress={() => pushKillFeed('🏠 HOME: Personal Space level 8')}>
                  <Text>🏠 Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.topUtilityIcon} onPress={() => pushKillFeed('☁️ CLOUD: All Resource Packs (HD Icons) Downloaded 100%')}>
                  <Text>☁️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.topUtilityIcon} onPress={() => pushKillFeed('🪖 ARMORY: Aurora carbine equipped')}>
                  <Text>🪖</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.topUtilityIcon} onPress={() => setShowSettingsModal(true)}>
                  <Text>⚙️</Text>
                </TouchableOpacity>
              </View>

              {/* Currency & RP Section (Right) */}
              <View style={styles.currencySection}>
                <TouchableOpacity style={styles.currencyPill} onPress={() => pushKillFeed(`🪙 GOLD balance: ${goldBalance}`)}>
                  <Text style={styles.currencyLabel}>🪙</Text>
                  <Text style={styles.currencyVal}>{goldBalance.toLocaleString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.currencyPill} onPress={() => pushKillFeed(`💎 UC balance: ${ucBalance} — earn +10 UC per kill, +50 UC per win`)}>
                  <Text style={styles.currencyLabelUC}>💎</Text>
                  <Text style={styles.currencyVal}>{ucBalance.toLocaleString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSeasonModal(true)}>
                  <LinearGradient
                    colors={['#eab308', '#d97706', '#92400e']}
                    style={styles.rpShieldBadge}
                  >
                    <Text style={styles.rpText}>RP</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.luckyCrateBadge} onPress={() => pushKillFeed('🎁 CRATE: Glacier Classic Crate Opened!')}>
                  <Text style={styles.crateText}>🎁</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* RIGHT SIDE EVENT BANNERS */}
            <View style={styles.rightBannersColumn}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowSeasonModal(true)}
              >
                <LinearGradient
                  colors={['#7c2d12', '#b45309', '#78350f']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.eventBannerCard}
                >
                  <View style={styles.eventBannerInner}>
                    <Text style={styles.eventTag}>🎁 PUSH</Text>
                    <Text style={styles.eventTitle}>TREASURE</Text>
                    <Text style={styles.eventSub}>OPEN EVENT ❯</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowSeasonModal(true)}
              >
                <LinearGradient
                  colors={['#0284c7', '#0369a1', '#1e3a8a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.eventBannerCard}
                >
                  <View style={styles.eventBannerInner}>
                    <Text style={styles.eventTag}>LIMITED DROP</Text>
                    <Text style={styles.eventTitle}>ARCTIC WARDEN</Text>
                    <Text style={styles.eventSub}>VIEW LOADOUT ❯</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              <View style={styles.subBannerRow}>
                <TouchableOpacity style={styles.subBanner} onPress={() => pushKillFeed('🏷️ DEALS: 70% Off on Glacier Weapon Materials')}>
                  <Text style={styles.subBannerText}>🏷 Deals</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.subBanner} onPress={() => pushKillFeed('🎮 PLAY & WIN: Event Challenge 5/5 Completed')}>
                  <Text style={styles.subBannerText}>🎮 Play & Win</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* BOTTOM LEFT: OPERATION SELECTOR & DEPLOY BUTTON */}
            <View style={styles.bottomLeftControls}>
              {/* Arena Training mini card (BGMI style) */}
              <TouchableOpacity
                onPress={() => pushKillFeed('🎯 ARENA TRAINING: Warehouse TDM — 4v4 quick match')}
                activeOpacity={0.85}
                style={{ marginBottom: 8 }}
              >
                <LinearGradient
                  colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.95)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(251, 191, 36, 0.5)',
                    maxWidth: 280,
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>🎯</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 }}>ARENA TRAINING</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700' }}>TDM · Warehouse · 4v4</Text>
                  </View>
                  <Text style={{ color: '#00f0ff', fontSize: 10, fontWeight: '900' }}>PLAY ❯</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* SOLO vs SQUAD MODE SELECTOR (Priority 4) */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, width: '100%', maxWidth: 280 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    borderRadius: 6,
                    backgroundColor: battleRoyaleMode === 'SOLO' ? '#eab308' : 'rgba(15, 23, 42, 0.85)',
                    borderWidth: 1.5,
                    borderColor: battleRoyaleMode === 'SOLO' ? '#fde047' : '#334155',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => {
                    setBattleRoyaleMode('SOLO');
                    pushKillFeed('👤 MODE SELECTED: SOLO (20 Players Free-For-All)');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '900',
                    color: battleRoyaleMode === 'SOLO' ? '#0f172a' : '#cbd5e1',
                    letterSpacing: 0.5,
                  }}>
                    👤 SOLO (20P)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 7,
                    borderRadius: 6,
                    backgroundColor: battleRoyaleMode === 'SQUAD' ? '#00f0ff' : 'rgba(15, 23, 42, 0.85)',
                    borderWidth: 1.5,
                    borderColor: battleRoyaleMode === 'SQUAD' ? '#7ee3ff' : '#334155',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => {
                    setBattleRoyaleMode('SQUAD');
                    pushKillFeed('👥 MODE SELECTED: SQUAD (5 Squads of 4 Players)');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '900',
                    color: battleRoyaleMode === 'SQUAD' ? '#0f172a' : '#cbd5e1',
                    letterSpacing: 0.5,
                  }}>
                    👥 SQUAD (4x5)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Map & Mode Card */}
              <TouchableOpacity
                onPress={() => setPhase('MAP_SELECT')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.95)', 'rgba(23, 37, 84, 0.9)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modeSelectorCard}
                >
                  <View style={styles.modeCrestRow}>
                    <Text style={styles.modeCrestIcon}>🐉</Text>
                    <Text style={styles.modeCrestTitle}>OPERATION NIGHTFALL</Text>
                  </View>
                  <Text style={styles.modeMainTitle}>
                    {selectedMapId === 'ERANGEL' ? 'Battle Royale — Ironhaven' : FOUR_MAPS[selectedMapId].name}
                  </Text>
                  <View style={styles.modeSubInfoRow}>
                    <Text style={styles.modeSubText}>
                      {battleRoyaleMode === 'SOLO' ? '👤 SOLO • 20 PLAYERS' : '👥 SQUAD • 5 SQUADS (20P)'} • TPP • {FOUR_MAPS[selectedMapId].duration}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Primary deployment action */}
              <TouchableOpacity
                onPress={() => startErangelMatch(false)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#ffe000', '#f59e0b', '#d97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bgmiStartBtn}
                >
                  <Text style={styles.bgmiStartBtnText}>▶ START</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* FAST COMBAT INSTANT POCHINKI DROP */}
              <TouchableOpacity
                onPress={() => startErangelMatch(true)}
                activeOpacity={0.85}
                style={{ marginTop: 6 }}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626', '#991b1b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.bgmiStartBtn, { paddingVertical: 8, paddingHorizontal: 12 }]}
                >
                  <Text style={[styles.bgmiStartBtnText, { fontSize: 13 }]}>⚡ HOT DROP // IRONHAVEN</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* BOTTOM NAV BAR & RECRUITMENT TICKER */}
            <View style={styles.bottomBarContainer}>
              <View style={styles.recruitmentTicker}>
                <Text style={styles.tickerText}>
                  Squad Search: Need 2 operators for a warehouse extraction run.
                </Text>
              </View>

              <View style={styles.bottomMenuRow}>
                <TouchableOpacity style={styles.botNavBtn} onPress={() => setShowSquadModal(true)}>
                  <Text style={styles.botNavText}>TEAM</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botNavBtn} onPress={() => setShowProfileModal(true)}>
                  <Text style={[styles.botNavText, { color: '#fbbf24' }]}>{playerProfile.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botNavBtn} onPress={() => pushKillFeed(`🛡️ CLAN: [${playerProfile.clan}] Level 10 Active`)}>
                  <Text style={styles.botNavText}>CLAN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botNavBtn} onPress={() => setShowSeasonModal(true)}>
                  <Text style={[styles.botNavText, { color: '#ffd700' }]}>SS7 SEASON</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botNavBtn} onPress={() => pushKillFeed('🔨 WORKSHOP: Aurora carbine loadout ready')}>
                  <Text style={styles.botNavText}>WORKSHOP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botNavBtn} onPress={() => pushKillFeed('📋 MISSIONS: All Daily Season Missions Complete!')}>
                  <Text style={styles.botNavText}>MISSIONS</Text>
                  <View style={styles.redBadgeDot} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.botNavBtn, styles.inventoryBtnHighlight]}
                  onPress={() => setShowInventoryModal(true)}
                >
                  <Text style={[styles.botNavText, { color: '#00f0ff' }]}>INVENTORY</Text>
                  <View style={styles.redBadgeDot} />
                </TouchableOpacity>
              </View>

              {/* Network Status Stamp */}
              <View style={styles.networkStatusStamp}>
                <Text style={styles.networkText}>📶 INDIA / HD LINK / SECURE</Text>
              </View>
            </View>
          </View>
        )}

        <Modal visible={showSquadModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <BlurView intensity={45} tint="dark" style={styles.blurModalContainer}>
              <View style={styles.squadModalCard}>
                <View style={styles.modalHeaderRow}>
                  <View>
                    <Text style={styles.modalTitle}>SQUAD & FRIENDS</Text>
                    <Text style={styles.squadModalSub}>LOCAL SOCIAL PROTOTYPE • ASIA REGION</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowSquadModal(false)}>
                    <Text style={styles.modalCloseText}>✕ CLOSE</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.squadModalHint}>
                  Add online operators to your squad list. Requests are saved on this device until a multiplayer backend is connected.
                </Text>
                <ScrollView style={{ maxHeight: 330 }} showsVerticalScrollIndicator={false}>
                  {SQUAD_DIRECTORY.map((candidate) => {
                    const requested = sentFriendRequests.includes(candidate.id);
                    const available = candidate.status === 'ONLINE';
                    return (
                      <View key={candidate.id} style={styles.squadPlayerRow}>
                        <View style={[styles.onlineDot, !available && styles.onlineDotBusy]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.squadPlayerName}>{candidate.name}</Text>
                          <Text style={styles.squadPlayerMeta}>LVL {candidate.level} • {candidate.region} • {candidate.status}</Text>
                        </View>
                        <TouchableOpacity
                          disabled={!available || requested}
                          onPress={() => sendFriendRequest(candidate)}
                          style={[styles.friendRequestBtn, (!available || requested) && styles.friendRequestBtnDisabled]}
                        >
                          <Text style={styles.friendRequestText}>{requested ? 'SENT' : available ? '+ ADD' : 'BUSY'}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity onPress={() => setShowSquadModal(false)} activeOpacity={0.85}>
                  <LinearGradient colors={['#14b8a6', '#0f766e']} style={styles.squadReadyBtn}>
                    <Text style={styles.confirmMapBtnText}>READY FOR SQUAD PLAY</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </Modal>

        {/* ==================================================================== */}
        {/* MAP SELECTOR */}
        {/* ==================================================================== */}
        {phase === 'MAP_SELECT' && (
          <View style={styles.modalBackdrop}>
            <BlurView intensity={45} tint="dark" style={styles.blurModalContainer}>
              <View style={styles.erangelModalCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>OPERATIONAL BATTLEGROUNDS</Text>
                  <TouchableOpacity onPress={() => setPhase('LOBBY')}>
                    <Text style={styles.modalCloseText}>✕ CLOSE</Text>
                  </TouchableOpacity>
                </View>

                {/* Erangel Satellite Preview (Image 2) */}
                <TouchableOpacity
                  style={[
                    styles.erangelFeatureCard,
                    selectedMapId === 'ERANGEL' && styles.erangelFeatureCardActive,
                  ]}
                  onPress={() => handleSelectMap('ERANGEL')}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: ERANGEL_MAP_BASE64 }}
                    style={styles.erangelPreviewImg}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(10, 18, 32, 0.85)', 'rgba(7, 13, 23, 0.98)']}
                    style={styles.erangelFeatureOverlay}
                  >
                    <View style={styles.erangelTagPill}>
                      <Text style={styles.erangelTagText}>★ SIGNATURE 8x8 ISLAND ★</Text>
                    </View>
                    <Text style={styles.erangelTitleText}>ERANGEL 8x8 (CLASSIC)</Text>
                    <Text style={styles.erangelDescText}>
                      Featuring Pochinki, Sosnovka Military Base Island, Georgopol Docks, School, Rozhok, and twin sea bridges.
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Other Maps List */}
                <ScrollView style={{ maxHeight: 200, width: '100%' }} showsVerticalScrollIndicator={false}>
                  {Object.values(FOUR_MAPS)
                    .filter((m) => m.id !== 'ERANGEL')
                    .map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.mapOptionRow, selectedMapId === m.id && styles.mapOptionRowActive]}
                        onPress={() => handleSelectMap(m.id)}
                      >
                        <Text style={styles.mapOptionName}>{m.name}</Text>
                        <Text style={styles.mapOptionTag}>{m.tagline}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>

                <TouchableOpacity onPress={() => setPhase('LOBBY')} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#ffe000', '#f59e0b', '#d97706']}
                    style={styles.confirmMapBtn}
                  >
                    <Text style={styles.confirmMapBtnText}>✓ CONFIRM THEATRE ({FOUR_MAPS[selectedMapId].name})</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        )}

        {/* ==================================================================== */}
        {/* INVENTORY / SKIN SWITCHER MODAL */}
        {/* ==================================================================== */}
        <Modal visible={showInventoryModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <BlurView intensity={45} tint="dark" style={styles.blurModalContainer}>
              <View style={styles.inventoryCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>OUTFIT & WEAPON INVENTORY</Text>
                  <TouchableOpacity onPress={() => setShowInventoryModal(false)}>
                    <Text style={styles.modalCloseText}>✕ CLOSE</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                  {Object.values(SKIN_DEFINITIONS).map((s) => {
                    const isSel = selectedSkinId === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.skinItemCard, isSel && { borderColor: s.rarityColor, backgroundColor: 'rgba(255,255,255,0.08)' }]}
                        onPress={() => {
                          handleSelectSkin(s.id);
                          setShowInventoryModal(false);
                        }}
                      >
                        <View style={styles.skinCardHeader}>
                          <Text style={[styles.skinRarityBadge, { backgroundColor: s.rarityColor }]}>
                            {s.rarity}
                          </Text>
                          <Text style={styles.skinWeaponTag}>{s.weaponSkin}</Text>
                        </View>
                        <Text style={[styles.skinTitle, isSel && { color: s.rarityColor }]}>{s.name}</Text>
                        <Text style={styles.skinDesc}>{s.tag}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </BlurView>
          </View>
        </Modal>

        {/* ==================================================================== */}
        {/* FULL ERANGEL TACTICAL MAP OVERLAY (PRESS 'M') */}
        {/* ==================================================================== */}
        {showFullMap && (
          <View style={styles.fullMapModal} pointerEvents="box-none">
            <View style={styles.fullMapFrame}>
              <View style={styles.fullMapHeader}>
                <Text style={styles.fullMapTitle}>TACTICAL MAP - ERANGEL 8x8</Text>
                <TouchableOpacity onPress={() => setShowFullMap(false)}>
                  <Text style={styles.fullMapClose}>✕ CLOSE [M]</Text>
                </TouchableOpacity>
              </View>
              <Image source={{ uri: ERANGEL_MAP_BASE64 }} style={styles.fullMapImage} resizeMode="contain" />
              <View style={styles.poiLegend}>
                <Text style={styles.poiItem}>📍 POCHINKI</Text>
                <Text style={styles.poiItem}>🪖 SOSNOVKA MILITARY BASE</Text>
                <Text style={styles.poiItem}>🚢 GEORGOPOL DOCKS</Text>
                <Text style={styles.poiItem}>🏫 SCHOOL & ROZHOK</Text>
                <Text style={styles.poiItem}>⚡ MYLTA POWER</Text>
              </View>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* IN-GAME HUD (PHASE: PLAYING) */}
        {/* ==================================================================== */}
        {phase === 'PLAYING' && (
          <View style={[styles.inGameHUD, isCompactViewport && styles.inGameHUDCompact]} pointerEvents="box-none">
            {/* Top Bar */}
            <View style={styles.inGameTopBar}>
              <BlurView intensity={35} tint="dark" style={styles.hudAliveCard}>
                <Text style={styles.hudAliveText}>ALIVE: {aliveCount}</Text>
                <Text style={styles.hudKillsText}>KILLS: {killsCount}</Text>
              </BlurView>

              {/* Top Compass Radar Ribbon with Realtime Enemy Direction & Distance */}
              {!isCompactViewport && <View style={styles.topCompassContainer} pointerEvents="none">
                <BlurView intensity={50} tint="dark" style={styles.topCompassBlur}>
                  <View style={styles.compassCenterMarker} />
                  <Text style={styles.compassHeadingText}>
                    {compassHeading}° {compassHeading >= 338 || compassHeading < 23 ? 'N' : compassHeading < 68 ? 'NE' : compassHeading < 113 ? 'E' : compassHeading < 158 ? 'SE' : compassHeading < 203 ? 'S' : compassHeading < 248 ? 'SW' : compassHeading < 293 ? 'W' : 'NW'}
                  </Text>
                  {/* Active Enemy Direction Indicators */}
                  <View style={styles.compassEnemyRow}>
                    {nearbyEnemyBearings.map((b) => (
                      <View key={b.id} style={styles.compassEnemyPill}>
                        <Text style={styles.compassEnemyPillText}>🔻 {b.dist}m</Text>
                      </View>
                    ))}
                    {nearbyEnemyBearings.length === 0 && (
                      <Text style={styles.compassClearText}>ALL CLEAR (140m)</Text>
                    )}
                  </View>
                </BlurView>
              </View>}

              <BlurView intensity={35} tint="dark" style={styles.hudStormCard}>
                <Text style={styles.hudStormText}>
                  PLAYZONE: {Math.floor(safeZoneTime / 60)}:{String(safeZoneTime % 60).padStart(2, '0')}
                </Text>
                {isOutsideSafeZone && <Text style={styles.stormWarning}>⚠️ TAKING ZONE DAMAGE!</Text>}
              </BlurView>

              {/* Erangel Satellite Radar */}
              <TouchableOpacity onPress={() => setShowFullMap(true)}>
                <canvas ref={minimapCanvasRef} width={radarSize} height={radarSize} style={{ width: radarSize, height: radarSize, borderRadius: radarSize / 2, borderWidth: 2, borderColor: '#00f0ff' }} />
              </TouchableOpacity>
            </View>

            {/* Killfeed */}
            <View style={styles.killFeedBox} pointerEvents="none">
              {killFeed.map((m, idx) => (
                <Text key={idx} style={styles.killFeedText}>{m}</Text>
              ))}
            </View>

            {/* Squad Team Telemetry HUD in SQUAD mode */}
            {battleRoyaleMode === 'SQUAD' && (
              <View
                style={{
                  position: 'absolute',
                  top: isCompactViewport ? 48 : 56,
                  left: 12,
                  backgroundColor: 'rgba(15, 23, 42, 0.88)',
                  padding: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#0284c7',
                  width: 175,
                  gap: 5,
                }}
                pointerEvents="none"
              >
                <Text style={{ fontSize: 9, fontWeight: '900', color: '#38bdf8', letterSpacing: 0.6 }}>
                  🛡️ SQUAD #1 (YOU + 3 BOTS)
                </Text>
                {/* 1. Human Player */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#22c55e' }}>1</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#f8fafc', flex: 1 }} numberOfLines={1}>
                    {playerProfile.name} (You)
                  </Text>
                  <View style={{ width: 44, height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.max(0, playerHp)}%`, height: '100%', backgroundColor: playerHp > 30 ? '#22c55e' : '#ef4444' }} />
                  </View>
                </View>
                {/* 2-4. AI Teammates */}
                {squadTeammates.map((tm) => (
                  <View key={tm.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: tm.isDead ? '#ef4444' : '#00f0ff' }}>{tm.num}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: tm.isDead ? '#64748b' : '#e2e8f0', flex: 1 }} numberOfLines={1}>
                      {tm.name}
                    </Text>
                    <View style={{ width: 44, height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ width: `${tm.isDead ? 0 : Math.max(0, tm.hp)}%`, height: '100%', backgroundColor: tm.isDead ? '#475569' : tm.hp > 30 ? '#00f0ff' : '#ef4444' }} />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Reticle */}
            <View style={styles.reticleCenter} pointerEvents="none">
              <View style={[styles.reticleDot, hitMarker && styles.reticleHit]} />
              {floatingDamage && (
                <Text style={[styles.floatingDmgText, { color: floatingDamage.color }]}>
                  {floatingDamage.text}
                </Text>
              )}
            </View>

            {/* Medkit First Aid Healing Channel Banner */}
            {isHealing && (
              <View style={styles.healingChannelBox} pointerEvents="none">
                <BlurView intensity={65} tint="dark" style={styles.healingChannelInner}>
                  <Text style={styles.healingChannelTitle}>🩹 APPLYING FIRST AID MEDKIT... {Math.round(healProgress * 100)}%</Text>
                  <View style={styles.healProgressBarBg}>
                    <View style={[styles.healProgressBarFill, { width: `${healProgress * 100}%` }]} />
                  </View>
                  <Text style={styles.healingChannelSub}>Restoring Full HP (100 HP)</Text>
                </BlurView>
              </View>
            )}

            {/* Nearby Enemy Death Loot Crate Pickup Banner */}
            {nearbyLootCrate && (
              <TouchableOpacity
                style={styles.lootCratePromptContainer}
                onPress={() => lootCrate(nearbyLootCrate)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(22, 101, 52, 0.95)', 'rgba(21, 128, 61, 0.98)', 'rgba(5, 150, 105, 0.95)']}
                  style={styles.lootCratePromptInner}
                >
                  <View style={styles.lootCrateIconBox}>
                    <Text style={styles.lootCrateIconText}>📦</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lootCratePromptTitle}>LOOT CRATE: {nearbyLootCrate.botName}</Text>
                    <Text style={styles.lootCratePromptSub}>TAP OR PRESS [E] • +1 MEDKIT • +60 AMMO • +40 ARMOR</Text>
                  </View>
                  <View style={styles.lootActionPill}>
                    <Text style={styles.lootActionPillText}>LOOT ALL [E]</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Bottom HUD: 5 Weapon Slots & Health */}
            <View style={[styles.inGameBottomBar, isCompactViewport && styles.inGameBottomBarCompact]}>
              {/* HP & Armor & Medkit Button */}
              <View style={styles.vitalsBox}>
                <View style={styles.barRow}>
                  <Text style={styles.barLbl}>HP</Text>
                  <View style={styles.barTrack}>
                    <LinearGradient
                      colors={['#4ade80', '#22c55e', '#15803d']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.barFill, { width: `${playerHp}%` }]}
                    />
                  </View>
                  <Text style={styles.barVal}>{playerHp}</Text>
                </View>
                <View style={styles.barRow}>
                  <Text style={styles.barLbl}>AP</Text>
                  <View style={styles.barTrack}>
                    <LinearGradient
                      colors={['#38bdf8', '#00f0ff', '#0284c7']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.barFill, { width: `${playerArmor}%` }]}
                    />
                  </View>
                  <Text style={styles.barVal}>{playerArmor}</Text>
                </View>

                {/* Medkit First Aid Quick Action */}
                <TouchableOpacity
                  style={[styles.medkitBarBtn, isHealing && { opacity: 0.5 }]}
                  onPress={useMedkit}
                  disabled={isHealing}
                  activeOpacity={0.7}
                >
                  <LinearGradient colors={['#10b981', '#059669']} style={styles.medkitBarGrad}>
                    <Text style={styles.medkitBarIcon}>🩹</Text>
                    <View>
                      <Text style={styles.medkitBarTitle}>MEDKIT ({medkitCount})</Text>
                      <Text style={styles.medkitBarSub}>{isHealing ? 'HEALING...' : 'HEAL [H]'}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* 5 Weapon Switcher */}
              {!isCompactViewport && <View style={styles.weaponSlotsRow}>
                {Object.values(WEAPON_REGISTRY).map((w) => {
                  const isCurrent = currentWeapon.id === w.id;
                  return (
                    <TouchableOpacity
                      key={w.id}
                      style={[styles.weaponSlotItem, isCurrent && styles.weaponSlotItemActive]}
                      onPress={() => switchWeapon(w.id)}
                    >
                      <Text style={styles.weaponSlotNum}>[{w.slotNumber}]</Text>
                      <Text style={[styles.weaponSlotTitle, isCurrent && { color: w.color }]}>
                        {w.name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>}

              {/* Ammo Box */}
              <View style={styles.ammoBox}>
                <Text style={styles.ammoWeaponTitle}>{currentWeapon.name}</Text>
                <Text style={styles.ammoCount}>
                  {isReloading ? 'RELOAD...' : `${ammoClip} `}
                  <Text style={styles.ammoReserve}>/ {ammoReserve}</Text>
                </Text>
              </View>
            </View>

            {/* Virtual On-Screen Combat Controls (Right Hand Action Cluster) */}
            <View style={styles.virtualCombatCluster} pointerEvents="box-none">
              <TouchableOpacity
                onPress={useMedkit}
                disabled={isHealing}
                activeOpacity={0.7}
                style={[styles.virtualMedkitBtn, isHealing && { opacity: 0.5 }]}
              >
                <Text style={styles.virtualMedkitText}>🩹 MED ({medkitCount})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const g = gameRef.current;
                  g.mouseLook.isAiming = !g.mouseLook.isAiming;
                  setIsAiming(g.mouseLook.isAiming);
                }}
                activeOpacity={0.7}
                style={styles.virtualAdsBtn}
              >
                <Text style={styles.virtualAdsText}>{isAiming ? '🔍 4x ADS' : '🎯 SCOPE'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={reloadWeapon}
                activeOpacity={0.7}
                style={styles.virtualReloadBtn}
              >
                <Text style={styles.virtualReloadText}>🔄 RELOAD</Text>
              </TouchableOpacity>

              {/* Jump & Crouch Virtual Controls */}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => {
                    const g = gameRef.current;
                    if (g.player.isGrounded) {
                      g.player.jumpVelocity = 6.5;
                      g.player.isGrounded = false;
                    }
                  }}
                  activeOpacity={0.7}
                  style={styles.virtualJumpBtn}
                >
                  <Text style={styles.virtualJumpText}>🦘 JUMP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    const g = gameRef.current;
                    g.keys.crouch = !g.keys.crouch;
                  }}
                  activeOpacity={0.7}
                  style={styles.virtualCrouchBtn}
                >
                  <Text style={styles.virtualCrouchText}>🧎 CROUCH</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => fireWeapon()}
                onPressIn={() => {
                  const g = gameRef.current;
                  g.isFiring = true;
                  fireWeapon();
                }}
                onPressOut={() => {
                  const g = gameRef.current;
                  g.isFiring = false;
                }}
                activeOpacity={0.6}
                style={styles.virtualFireBtn}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626', '#991b1b']}
                  style={styles.virtualFireGradient}
                >
                  <Text style={styles.virtualFireText}>🔥</Text>
                  <Text style={styles.virtualFireSub}>FIRE</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Virtual Movement D-Pad (Left Hand Cluster) */}
            <View style={styles.virtualDpadCluster} pointerEvents="box-none">
              <View style={styles.dpadRow}>
                <TouchableOpacity
                  onPressIn={() => { gameRef.current.keys.w = true; }}
                  onPressOut={() => { gameRef.current.keys.w = false; }}
                  style={styles.dpadBtn}
                >
                  <Text style={styles.dpadBtnText}>▲</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dpadRow}>
                <TouchableOpacity
                  onPressIn={() => { gameRef.current.keys.arrowLeft = true; }}
                  onPressOut={() => { gameRef.current.keys.arrowLeft = false; }}
                  style={styles.dpadBtn}
                >
                  <Text style={styles.dpadBtnText}>◀</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const g = gameRef.current;
                    g.keys.shift = !g.keys.shift;
                  }}
                  style={[styles.dpadBtn, { backgroundColor: 'rgba(0,240,255,0.25)', borderColor: '#00f0ff' }]}
                >
                  <Text style={[styles.dpadBtnText, { fontSize: 10, color: '#00f0ff' }]}>RUN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPressIn={() => { gameRef.current.keys.arrowRight = true; }}
                  onPressOut={() => { gameRef.current.keys.arrowRight = false; }}
                  style={styles.dpadBtn}
                >
                  <Text style={styles.dpadBtnText}>▶</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dpadRow}>
                <TouchableOpacity
                  onPressIn={() => { gameRef.current.keys.s = true; }}
                  onPressOut={() => { gameRef.current.keys.s = false; }}
                  style={styles.dpadBtn}
                >
                  <Text style={styles.dpadBtnText}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* In-Game Key Guide Bar */}
            <View style={styles.controlHintsBar} pointerEvents="none">
              <Text style={styles.controlHintText}>
                🎮 WASD: Move • [SPACE]: Jump • [C]: Crouch • Click / [🔥 FIRE]: Shoot • [🎯 SCOPE]: 4x ADS • [🔄]: Reload • [🩹 H]: Medkit ({medkitCount}) • [📦 E]: Loot • 1-5: Guns • M: Map
              </Text>
            </View>
          </View>
        )}

        {/* AIRPLANE DROP OVERLAY */}
        {phase === 'AIRPLANE' && (
          <View style={styles.airplaneOverlay} pointerEvents="box-none">
            <Text style={styles.flightTitle}>✈️ INSERTION AIRCRAFT // IRONHAVEN ISLE</Text>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 16 }}>
              <TouchableOpacity onPress={jumpFromAirplane} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#f59e0b', '#d97706', '#b45309']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.jumpActionBtn}
                >
                  <Text style={styles.jumpActionBtnText}>🪂 PARACHUTE DROP [SPACE]</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => startErangelMatch(true)} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#ef4444', '#dc2626', '#991b1b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.jumpActionBtn}
                >
                  <Text style={styles.jumpActionBtnText}>⚡ FAST INSERTION</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* FREEFALL & PARACHUTE DESCENT OVERLAY */}
        {(phase === 'FREEFALL' || phase === 'PARACHUTE') && (
          <View style={styles.airplaneOverlay} pointerEvents="box-none">
            <Text style={styles.flightTitle}>
              {phase === 'FREEFALL' ? '🪂 FREEFALL // RAPID DESCENT' : '🪂 PARACHUTE DEPLOYED // GLIDING'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 16 }}>
              {phase === 'FREEFALL' && (
                <TouchableOpacity
                  onPress={() => {
                    const g = gameRef.current;
                    g.phase = 'PARACHUTE';
                    setPhase('PARACHUTE');
                  }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#22c55e', '#16a34a', '#15803d']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.jumpActionBtn}
                  >
                    <Text style={styles.jumpActionBtnText}>🪂 DEPLOY PARACHUTE [SPACE]</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => startErangelMatch(true)} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#ef4444', '#dc2626', '#991b1b']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.jumpActionBtn}
                >
                  <Text style={styles.jumpActionBtnText}>⚡ FAST TOUCHDOWN</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* VICTORY MODAL */}
        <Modal visible={phase === 'VICTORY'} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <BlurView intensity={40} tint="dark" style={styles.blurModalContainer}>
              <View style={[styles.endModalCard, { borderColor: '#ffd700' }]}>
                <Text style={styles.victoryTitle}>🏆 WINNER WINNER 🏆</Text>
                <Text style={styles.victorySub}>
                  {battleRoyaleMode === 'SQUAD' ? 'SQUAD #1 CHICKEN DINNER!' : 'CHICKEN DINNER! #1/20'}
                </Text>
                <Text style={styles.victoryMap}>
                  {battleRoyaleMode === 'SQUAD' ? 'TEAM VICTORY' : 'SOLO CHAMPION'} • KILLS: {killsCount} • MAP: IRONHAVEN ISLE
                </Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity onPress={() => startErangelMatch(false)} activeOpacity={0.85}>
                    <LinearGradient
                      colors={['#10b981', '#059669', '#047857']}
                      style={styles.bgmiStartBtn}
                    >
                      <Text style={styles.bgmiStartBtnText}>✈️ NEXT MATCH</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={returnToLobby} activeOpacity={0.85}>
                    <LinearGradient
                      colors={['#ffe000', '#f59e0b', '#d97706']}
                      style={styles.bgmiStartBtn}
                    >
                      <Text style={styles.bgmiStartBtnText}>🏠 LOBBY</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </Modal>

        {/* DEFEAT MODAL */}
        <Modal visible={phase === 'GAMEOVER'} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <BlurView intensity={40} tint="dark" style={styles.blurModalContainer}>
              <View style={[styles.endModalCard, { borderColor: '#ef4444' }]}>
                <Text style={styles.defeatTitle}>BETTER LUCK NEXT TIME</Text>
                <Text style={styles.victoryMap}>MAP: IRONHAVEN ISLE</Text>
                <View style={{ flexDirection: 'column', gap: 10, marginTop: 16, width: '100%', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
                    <TouchableOpacity onPress={() => startErangelMatch(false)} activeOpacity={0.85}>
                      <LinearGradient
                        colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                        style={styles.bgmiStartBtn}
                      >
                        <Text style={styles.bgmiStartBtnText}>✈️ AIRPLANE DROP</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => startErangelMatch(true)} activeOpacity={0.85}>
                      <LinearGradient
                        colors={['#ef4444', '#dc2626', '#991b1b']}
                        style={styles.bgmiStartBtn}
                      >
                        <Text style={styles.bgmiStartBtnText}>⚡ FAST RESPAWN</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={returnToLobby} activeOpacity={0.85}>
                    <LinearGradient
                      colors={['#ffe000', '#f59e0b', '#d97706']}
                      style={[styles.bgmiStartBtn, { width: 220 }]}
                    >
                      <Text style={styles.bgmiStartBtnText}>🏠 RETURN TO LOBBY</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </Modal>

        {/* ==================================================================== */}
        {/* REAL SETTINGS MODAL (GRAPHICS / SOUND / SENSITIVITY) */}
        {/* ==================================================================== */}
        <Modal visible={showSettingsModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <BlurView intensity={45} tint="dark" style={styles.blurModalContainer}>
              <View style={styles.profileModalCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>⚙️ SETTINGS</Text>
                  <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                    <Text style={styles.modalCloseText}>✕ CLOSE</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.settingsRow}>
                  <Text style={styles.settingsLabel}>GRAPHICS QUALITY</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['LOW', 'MEDIUM', 'HIGH'] as const).map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        onPress={() => setGraphicsPreset(preset)}
                        style={[
                          styles.settingsSegBtn,
                          graphicsPreset === preset && styles.settingsSegBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.settingsSegText,
                            graphicsPreset === preset && styles.settingsSegTextActive,
                          ]}
                        >
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <Text style={styles.settingsHint}>
                  LOW disables shadows and caps resolution — best FPS on weak PCs.
                </Text>

                <View style={styles.settingsRow}>
                  <Text style={styles.settingsLabel}>SOUND EFFECTS</Text>
                  <TouchableOpacity
                    onPress={handleToggleSound}
                    style={[styles.settingsSegBtn, soundOn && styles.settingsSegBtnActive]}
                  >
                    <Text style={[styles.settingsSegText, soundOn && styles.settingsSegTextActive]}>
                      {soundOn ? '🔊 ON' : '🔇 OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.settingsRow}>
                  <Text style={styles.settingsLabel}>MOUSE SENSITIVITY ×{sensitivity.toFixed(2)}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleSetSensitivity(-0.1)}
                      style={styles.settingsSegBtn}
                    >
                      <Text style={styles.settingsSegText}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleSetSensitivity(0.1)}
                      style={styles.settingsSegBtn}
                    >
                      <Text style={styles.settingsSegText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity onPress={() => setShowSettingsModal(false)} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#ffe000', '#f59e0b', '#d97706']}
                    style={styles.confirmMapBtn}
                  >
                    <Text style={styles.confirmMapBtnText}>✓ SAVE & CLOSE</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    setShowSettingsModal(false);
                    try { await AsyncStorage.removeItem('BGMI_SHADOW_PROFILE'); } catch (_) {}
                    if (typeof onLogout === 'function') onLogout();
                  }}
                  activeOpacity={0.85}
                  style={{ marginTop: 10 }}
                >
                  <LinearGradient
                    colors={['#7f1d1d', '#991b1b', '#b91c1c']}
                    style={[styles.confirmMapBtn, { paddingVertical: 10 }]}
                  >
                    <Text style={[styles.confirmMapBtnText, { color: '#fee2e2', fontSize: 12 }]}>🔄 SWITCH ACCOUNT (LOG OUT)</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </Modal>

        {/* ==================================================================== */}
        {/* OPERATIVE PROFILE MODAL (SMxTHUG LEVEL 75) */}
        {/* ==================================================================== */}
        <Modal visible={showProfileModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <BlurView intensity={45} tint="dark" style={styles.blurModalContainer}>
              <View style={styles.profileModalCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>OPERATIVE PROFILE & DOSSIER</Text>
                  <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                    <Text style={styles.modalCloseText}>✕ CLOSE</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.profileModalBody}>
                  <View style={styles.avatarBigFrame}>
                    <Text style={{ fontSize: 36 }}>{playerProfile.avatar}</Text>
                    <View style={styles.avatarBigBadge}><Text style={styles.avatarBigBadgeText}>LV.{1 + Math.floor(totalKills / 15)}</Text></View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileHeroName}>{playerProfile.name}</Text>
                    <Text style={styles.profileClanBadge}>CLAN: [{playerProfile.clan}] • TIER: ACE DOMINATOR ★</Text>
                    <Text style={styles.profileServerInfo}>SERVER: ASIA (INDIA) • ID: {playerProfile.uid}</Text>
                  </View>
                </View>

                <View style={styles.profileStatsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statVal}>{(totalKills / Math.max(1, totalDeaths)).toFixed(2)}</Text>
                    <Text style={styles.statLbl}>K/D RATIO</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statVal}>{matchesPlayed > 0 ? Math.round((totalDinners / matchesPlayed) * 100) : 0}%</Text>
                    <Text style={styles.statLbl}>WIN RATE</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statVal}>{matchesPlayed}</Text>
                    <Text style={styles.statLbl}>MATCHES</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statVal}>{totalDinners}</Text>
                    <Text style={styles.statLbl}>DINNERS</Text>
                  </View>
                </View>

                <View style={[styles.profileStatsRow, { marginTop: 8 }]}>
                  <View style={styles.statBox}>
                    <Text style={styles.statVal}>{totalKills}</Text>
                    <Text style={styles.statLbl}>TOTAL KILLS</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statVal}>{totalDeaths}</Text>
                    <Text style={styles.statLbl}>DEATHS</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statVal}>{highestKills}</Text>
                    <Text style={styles.statLbl}>BEST MATCH</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statVal}>{matchesPlayed > 0 ? (totalKills / matchesPlayed).toFixed(1) : '0.0'}</Text>
                    <Text style={styles.statLbl}>AVG KILLS</Text>
                  </View>
                </View>

                <LinearGradient
                  colors={['#0f172a', '#1e293b', '#0e7490']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.signatureGunCard}
                >
                  <Text style={styles.signatureGunTitle}>SIGNATURE FIREARM</Text>
                  <Text style={styles.signatureGunName}>M416 GLACIER (LEVEL 7 MAX)</Text>
                  <Text style={styles.signatureGunDesc}>On-hit Frost Effect • Ice Sculpture Death Crate • Cyan Emissive Glow</Text>
                </LinearGradient>

                <TouchableOpacity onPress={() => setShowProfileModal(false)} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#ffe000', '#f59e0b', '#d97706']}
                    style={styles.confirmMapBtn}
                  >
                    <Text style={styles.confirmMapBtnText}>✓ CONFIRM DOSSIER</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </Modal>

        {/* ==================================================================== */}
        {/* C7S20 SEASON & ROYALE PASS MODAL */}
        {/* ==================================================================== */}
        <Modal visible={showSeasonModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <BlurView intensity={45} tint="dark" style={styles.blurModalContainer}>
              <View style={styles.profileModalCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>C7S20 ROYALE PASS & SEASONS</Text>
                  <TouchableOpacity onPress={() => setShowSeasonModal(false)}>
                    <Text style={styles.modalCloseText}>✕ CLOSE</Text>
                  </TouchableOpacity>
                </View>

                <LinearGradient
                  colors={['#78350f', '#b45309', '#d97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.seasonBannerBox}
                >
                  <Text style={styles.seasonBannerTitle}>FROSTY VOYAGER • ELITE PASS LV.100</Text>
                  <Text style={styles.seasonBannerDesc}>All Season Mythic Rewards & Upgrades Unlocked for {playerProfile.name}</Text>
                </LinearGradient>

                <View style={styles.seasonRewardsRow}>
                  <View style={styles.seasonRewardCard}>
                    <Text style={{ fontSize: 28 }}>🃏</Text>
                    <Text style={styles.rewardCardTitle}>The Fool Suit</Text>
                    <Text style={styles.rewardCardStatus}>CLAIMED</Text>
                  </View>
                  <View style={styles.seasonRewardCard}>
                    <Text style={{ fontSize: 28 }}>❄️</Text>
                    <Text style={styles.rewardCardTitle}>Glacier M416</Text>
                    <Text style={styles.rewardCardStatus}>EQUIPPED</Text>
                  </View>
                  <View style={styles.seasonRewardCard}>
                    <Text style={{ fontSize: 28 }}>🤖</Text>
                    <Text style={styles.rewardCardTitle}>Red Companion</Text>
                    <Text style={styles.rewardCardStatus}>ACTIVE</Text>
                  </View>
                </View>

                <TouchableOpacity onPress={() => setShowSeasonModal(false)} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#ffe000', '#f59e0b', '#d97706']}
                    style={styles.confirmMapBtn}
                  >
                    <Text style={styles.confirmMapBtnText}>✓ CLAIM ALL & CLOSE</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLESHEET (PIXEL-PERFECT BGMI LOBBY & ERANGEL TACTICAL THEME)
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  canvasContainer: { flex: 1, position: 'relative', width: '100%', height: '100%' },

  damageFlash: {
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
    borderColor: 'rgba(0, 240, 255, 0.65)',
    zIndex: 35,
  },

  // Elimination Banner
  elimBannerBox: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  elimBannerTitle: { color: '#ef4444', fontSize: 15, fontWeight: '900', letterSpacing: 1.5 },
  elimBannerVictim: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 2 },
  elimBannerStats: { color: '#ffd700', fontSize: 12, fontWeight: '800', marginTop: 3 },

  // BGMI Authentic Screenshot Backdrop (Image 1)
  bgmiLobbyBackdropImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  inspectModeToggleBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1.5,
    borderColor: '#ffd700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inspectModeToggleText: {
    color: '#ffd700',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // BGMI EXACT LOBBY UI LAYOUT
  bgmiLobbyUI: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    justifyContent: 'space-between',
    zIndex: 20,
  },

  // Top Bar
  bgmiTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarFrameGold: {
    width: 48,
    height: 48,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffd700',
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarIcon: { fontSize: 20 },
  lvlBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#b45309',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  lvlText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  profileDetails: { justifyContent: 'center' },
  profileName: { color: '#fff', fontSize: 14, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 3 },
  onlineStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineCountText: { color: '#ffd700', fontSize: 11, fontWeight: '800' },
  bellIcon: { fontSize: 10 },
  findTeamBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 6,
  },
  findTeamText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  centerIconsRow: { flexDirection: 'row', gap: 10 },
  topUtilityIcon: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
  },

  currencySection: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  currencyLabel: { color: '#ffd700', fontSize: 11, fontWeight: '900' },
  currencyLabelUC: { color: '#00f0ff', fontSize: 11, fontWeight: '900' },
  currencyVal: { color: '#fff', fontSize: 11, fontWeight: '800' },
  rpShieldBadge: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rpText: { color: '#000', fontSize: 10, fontWeight: '900' },
  luckyCrateBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  crateText: { fontSize: 12 },

  // Right Side Banners
  rightBannersColumn: {
    position: 'absolute',
    right: 12,
    top: 70,
    width: 170,
    gap: 8,
  },
  eventBannerCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    borderRadius: 8,
    padding: 10,
  },
  eventBannerInner: { alignItems: 'center' },
  eventTag: { color: '#38bdf8', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  eventTitle: { color: '#fff', fontSize: 13, fontWeight: '900' },
  eventSub: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },
  subBannerRow: { flexDirection: 'row', gap: 4 },
  subBanner: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 5,
    borderRadius: 4,
    alignItems: 'center',
  },
  subBannerText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  // Bottom Left: START Button & Mode Selector
  bottomLeftControls: {
    position: 'absolute',
    left: 12,
    bottom: 50,
    width: 240,
    gap: 8,
  },
  modeSelectorCard: {
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.6)',
    borderRadius: 8,
    padding: 8,
  },
  modeCrestRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modeCrestIcon: { fontSize: 14 },
  modeCrestTitle: { color: '#38bdf8', fontSize: 11, fontWeight: '900' },
  modeMainTitle: { color: '#fff', fontSize: 13, fontWeight: '900', marginTop: 2 },
  modeSubInfoRow: { marginTop: 2 },
  modeSubText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700' },

  // EXACT BGMI START BUTTON
  bgmiStartBtn: {
    backgroundColor: '#ffd700', // Iconic BGMI bright yellow
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#ffd700',
    shadowRadius: 18,
    shadowOpacity: 0.8,
  },
  bgmiStartBtnText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },

  // Bottom Nav Bar & Ticker
  bottomBarContainer: {
    width: '100%',
    gap: 6,
  },
  recruitmentTicker: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'center',
  },
  tickerText: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700' },

  bottomMenuRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 6,
    borderRadius: 6,
  },
  botNavBtn: { position: 'relative', paddingHorizontal: 6 },
  botNavText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  inventoryBtnHighlight: { backgroundColor: 'rgba(0, 240, 255, 0.15)', borderRadius: 4, paddingVertical: 2 },
  redBadgeDot: {
    position: 'absolute',
    top: -2,
    right: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },

  networkStatusStamp: { position: 'absolute', left: 4, bottom: -6 },
  networkText: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '600' },

  // Modals & Popups
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  blurModalContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '92%',
  },
  erangelModalCard: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 2,
    borderColor: '#38bdf8',
    borderRadius: 14,
    padding: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { color: '#38bdf8', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  modalCloseText: { color: '#ef4444', fontSize: 12, fontWeight: '800' },

  squadModalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: 'rgba(8, 17, 28, 0.96)',
    borderWidth: 2,
    borderColor: '#14b8a6',
    borderRadius: 14,
    padding: 16,
  },
  squadModalSub: { color: 'rgba(148, 211, 202, 0.75)', fontSize: 10, fontWeight: '800', marginTop: 3, letterSpacing: 0.7 },
  squadModalHint: { color: 'rgba(255,255,255,0.68)', fontSize: 12, lineHeight: 17, marginBottom: 12 },
  squadPlayerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 11, paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 7,
  },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#22c55e', shadowColor: '#22c55e', shadowOpacity: 0.9, shadowRadius: 6 },
  onlineDotBusy: { backgroundColor: '#64748b', shadowOpacity: 0 },
  squadPlayerName: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.6 },
  squadPlayerMeta: { color: 'rgba(255,255,255,0.56)', fontSize: 10, fontWeight: '700', marginTop: 2 },
  friendRequestBtn: { backgroundColor: '#14b8a6', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
  friendRequestBtnDisabled: { backgroundColor: 'rgba(100,116,139,0.6)' },
  friendRequestText: { color: '#041b1a', fontSize: 11, fontWeight: '900' },
  squadReadyBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },

  erangelFeatureCard: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#38bdf8',
    marginBottom: 12,
    position: 'relative',
  },
  erangelFeatureCardActive: { borderColor: '#ffd700' },
  erangelPreviewImg: { width: '100%', height: '100%' },
  erangelFeatureOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
  },
  erangelTagPill: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  erangelTagText: { color: '#000', fontSize: 9, fontWeight: '900' },
  erangelTitleText: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 2 },
  erangelDescText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },

  mapOptionRow: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  mapOptionRowActive: { borderColor: '#38bdf8', borderWidth: 1 },
  mapOptionName: { color: '#fff', fontSize: 13, fontWeight: '800' },
  mapOptionTag: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 1 },

  confirmMapBtn: {
    backgroundColor: '#ffd700',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmMapBtnText: { color: '#000', fontSize: 14, fontWeight: '900' },

  // Inventory Modal
  inventoryCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 2,
    borderColor: '#ffd700',
    borderRadius: 14,
    padding: 16,
  },
  skinItemCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  skinCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skinRarityBadge: { color: '#000', fontSize: 9, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  skinWeaponTag: { color: '#00f0ff', fontSize: 10, fontWeight: '800' },
  skinTitle: { color: '#fff', fontSize: 14, fontWeight: '900', marginTop: 4 },
  skinDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },

  // Full Tactical Map Overlay
  fullMapModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
    padding: 16,
  },
  fullMapFrame: {
    width: '100%',
    maxWidth: 720,
    height: '90%',
    backgroundColor: '#070d17',
    borderWidth: 2,
    borderColor: '#00f0ff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  fullMapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  fullMapTitle: { color: '#00f0ff', fontSize: 16, fontWeight: '900' },
  fullMapClose: { color: '#ef4444', fontSize: 13, fontWeight: '800' },
  fullMapImage: { width: '100%', height: '80%' },
  poiLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  poiItem: { color: '#ffd700', fontSize: 10, fontWeight: '800' },

  // In-Game Combat HUD
  inGameHUD: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    justifyContent: 'space-between',
    zIndex: 25,
  },
  inGameHUDCompact: { padding: 8 },
  inGameTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hudAliveCard: {
    backgroundColor: 'rgba(10, 18, 32, 0.85)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    padding: 8,
    borderRadius: 8,
    minWidth: 120,
  },
  hudAliveText: { color: '#00f0ff', fontSize: 14, fontWeight: '900' },
  hudKillsText: { color: '#ffd700', fontSize: 12, fontWeight: '800', marginTop: 1 },
  hudStormCard: {
    backgroundColor: 'rgba(10, 18, 32, 0.85)',
    borderWidth: 1.5,
    borderColor: '#ffd700',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  hudStormText: { color: '#ffd700', fontSize: 13, fontWeight: '900' },
  stormWarning: { color: '#ef4444', fontSize: 10, fontWeight: '800', marginTop: 2 },

  killFeedBox: { position: 'absolute', top: 160, right: 14, gap: 4, width: 260 },
  killFeedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 4,
    borderRadius: 4,
  },

  reticleCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 8,
    height: 8,
    marginLeft: -4,
    marginTop: -4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00f0ff' },
  reticleHit: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ef4444' },

  inGameBottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 },
  inGameBottomBarCompact: { alignItems: 'flex-end' },
  vitalsBox: {
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    padding: 10,
    borderRadius: 8,
    width: 200,
    gap: 4,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLbl: { color: '#fff', fontSize: 10, fontWeight: '900', width: 20 },
  barTrack: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barVal: { color: '#fff', fontSize: 10, fontWeight: '900', width: 24, textAlign: 'right' },

  weaponSlotsRow: { flexDirection: 'row', gap: 6 },
  weaponSlotItem: {
    backgroundColor: 'rgba(10, 18, 32, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    minWidth: 54,
  },
  weaponSlotItemActive: { borderColor: '#00f0ff', backgroundColor: 'rgba(0, 240, 255, 0.15)' },
  weaponSlotNum: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900' },
  weaponSlotTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '800' },

  ammoBox: {
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    padding: 10,
    borderRadius: 8,
    width: 170,
    alignItems: 'flex-end',
  },
  ammoWeaponTitle: { color: '#00f0ff', fontSize: 12, fontWeight: '900' },
  ammoCount: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 2 },
  ammoReserve: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },

  airplaneOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 30,
  },
  flightTitle: { color: '#ffd700', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  jumpActionBtn: {
    backgroundColor: '#00f0ff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    shadowColor: '#00f0ff',
    shadowRadius: 16,
    shadowOpacity: 0.8,
  },
  jumpActionBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },

  // End Modals
  endModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 2,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  victoryTitle: { color: '#ffd700', fontSize: 26, fontWeight: '900', letterSpacing: 1.5 },
  victorySub: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  defeatTitle: { color: '#ef4444', fontSize: 22, fontWeight: '900' },
  victoryMap: { color: '#38bdf8', fontSize: 12, fontWeight: '800', marginVertical: 10 },

  // Floating Damage Number
  floatingDmgText: {
    position: 'absolute',
    top: -24,
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowRadius: 4,
    letterSpacing: 1,
  },

  // Control Hints Bar
  controlHintsBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlHintText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Profile Modal Styles
  profileModalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: 'rgba(10, 18, 32, 0.88)',
    borderWidth: 2,
    borderColor: '#ffd700',
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  profileModalBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    borderRadius: 8,
  },
  avatarBigFrame: {
    width: 64,
    height: 64,
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#ffd700',
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarBigBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#b45309',
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  avatarBigBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  profileHeroName: { color: '#fff', fontSize: 18, fontWeight: '900' },
  profileClanBadge: { color: '#ffd700', fontSize: 12, fontWeight: '800', marginTop: 2 },
  profileServerInfo: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },

  profileStatsRow: { flexDirection: 'row', gap: 8 },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  settingsLabel: { color: '#e2e8f0', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  settingsHint: { color: 'rgba(255,255,255,0.45)', fontSize: 9, marginTop: 4 },
  settingsSegBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  settingsSegBtnActive: {
    backgroundColor: 'rgba(0,240,255,0.15)',
    borderColor: '#00f0ff',
  },
  settingsSegText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800' },
  settingsSegTextActive: { color: '#00f0ff' },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  statVal: { color: '#00f0ff', fontSize: 16, fontWeight: '900' },
  statLbl: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '800', marginTop: 2 },

  signatureGunCard: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    borderRadius: 8,
    padding: 12,
  },
  signatureGunTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800' },
  signatureGunName: { color: '#00f0ff', fontSize: 14, fontWeight: '900', marginTop: 2 },
  signatureGunDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },

  // Season Modal Styles
  seasonBannerBox: {
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    borderWidth: 1.5,
    borderColor: '#ffd700',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  seasonBannerTitle: { color: '#ffd700', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  seasonBannerDesc: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 4 },

  seasonRewardsRow: { flexDirection: 'row', gap: 10 },
  seasonRewardCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  rewardCardTitle: { color: '#fff', fontSize: 12, fontWeight: '800' },
  rewardCardStatus: { color: '#22c55e', fontSize: 10, fontWeight: '900' },

  // Virtual On-Screen Combat Controls
  virtualCombatCluster: {
    position: 'absolute',
    right: 20,
    bottom: 95,
    alignItems: 'center',
    gap: 10,
    zIndex: 25,
  },
  virtualFireBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowRadius: 14,
    shadowOpacity: 0.8,
  },
  virtualFireGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  virtualFireText: { fontSize: 22 },
  virtualFireSub: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  virtualAdsBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: '#00f0ff',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
  },
  virtualAdsText: { color: '#00f0ff', fontSize: 11, fontWeight: '900' },
  virtualReloadBtn: {
    backgroundColor: 'rgba(234, 179, 8, 0.25)',
    borderWidth: 1.5,
    borderColor: '#eab308',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
  },
  virtualReloadText: { color: '#eab308', fontSize: 11, fontWeight: '900' },
  virtualJumpBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
  },
  virtualJumpText: { color: '#60a5fa', fontSize: 11, fontWeight: '900' },
  virtualCrouchBtn: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    borderWidth: 1.5,
    borderColor: '#a855f7',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
  },
  virtualCrouchText: { color: '#c084fc', fontSize: 11, fontWeight: '900' },

  // Virtual Movement D-Pad
  virtualDpadCluster: {
    position: 'absolute',
    left: 20,
    bottom: 95,
    alignItems: 'center',
    zIndex: 25,
  },
  dpadRow: { flexDirection: 'row', gap: 5, marginVertical: 2 },
  dpadBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  // Top Compass Radar Ribbon
  topCompassContainer: {
    flex: 1,
    maxWidth: 420,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  topCompassBlur: {
    width: '100%',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    backgroundColor: 'rgba(5, 11, 20, 0.75)',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  compassCenterMarker: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 7,
    backgroundColor: '#ffd700',
  },
  compassHeadingText: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  compassEnemyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  compassEnemyPill: {
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  compassEnemyPillText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  compassClearText: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
  },

  // Medkit First Aid Healing Channel Banner
  healingChannelBox: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    zIndex: 40,
    minWidth: 280,
  },
  healingChannelInner: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#10b981',
    backgroundColor: 'rgba(6, 78, 59, 0.88)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  healingChannelTitle: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  healProgressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
  },
  healProgressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 5,
  },
  healingChannelSub: {
    color: '#a7f3d0',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },

  // Nearby Enemy Death Loot Crate Pickup Banner
  lootCratePromptContainer: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    zIndex: 35,
    maxWidth: 480,
    width: '90%',
  },
  lootCratePromptInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4ade80',
    gap: 12,
    shadowColor: '#22c55e',
    shadowRadius: 14,
    shadowOpacity: 0.6,
  },
  lootCrateIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lootCrateIconText: {
    fontSize: 20,
  },
  lootCratePromptTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  lootCratePromptSub: {
    color: '#bbf7d0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  lootActionPill: {
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  lootActionPillText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Medkit Bar Button in Vitals
  medkitBarBtn: {
    marginTop: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  medkitBarGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 6,
  },
  medkitBarIcon: {
    fontSize: 16,
  },
  medkitBarTitle: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  medkitBarSub: {
    color: '#d1fae5',
    fontSize: 8,
    fontWeight: '700',
  },

  // Virtual Medkit Button in Action Cluster
  virtualMedkitBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1.5,
    borderColor: '#10b981',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 18,
    alignItems: 'center',
  },
  virtualMedkitText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '900',
  },
});
