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
  Image,
} from 'react-native';
import * as THREE from 'three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ERANGEL_MAP_BASE64, BGMI_LOBBY_BG_BASE64 } from '../utils/erangel_assets';

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

export const FOUR_MAPS: Record<MapId, MapDefinition> = {
  ERANGEL: {
    id: 'ERANGEL',
    name: 'ERANGEL 8x8 (CLASSIC)',
    tagline: 'MAINLAND & SOSNOVKA MILITARY ISLAND',
    desc: 'The legendary 8x8 battleground featuring Pochinki, Sosnovka Military Base, Georgopol Shipping Docks, School, Rozhok, Yasnaya Polyana, and the twin ocean bridges.',
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
    name: 'MIRAMAR DESERT',
    tagline: 'ARID BADLANDS & LOS LEONES',
    desc: 'Vast scorched desert with sweeping sandstone bluffs, haciendas, oil depots, and long-range sniper plateaus.',
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
    name: 'VIKENDI ARCTIC',
    tagline: 'SNOW PEAKS & CASTLE RUINS',
    desc: 'Snow-covered pine slopes, frozen lakes, Goroka cosmodrome, and an ancient stone fortress.',
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
    name: 'LIVIK NORDIC',
    tagline: 'FAST-PACED NORDIC WATERFALLS',
    desc: 'Action-packed terrain with geothermal hot springs, flower fields, and dense close-quarters towns.',
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
    name: 'THE FOOL (JOKER SET)',
    tag: 'MYTHIC UPGRADEABLE',
    rarity: 'MYTHIC',
    rarityColor: '#ec4899',
    faceType: 'CLOWN_JOKER',
    coatColor: '#181b22', // Gothic black/slate tuxedo coat
    pinstripePants: true,
    pantsColor: '#14171f',
    cummerbundColor: '#dc2626', // Scarlet red waist sash
    hairStyle: 'JESTER_PIGTAILS',
    hairColor: '#e2e8f0', // Silver/blonde jester bells
    weaponSkin: 'GLACIER_M416',
    hasTailcoat: true,
  },
  GLACIER_WARRIOR: {
    id: 'GLACIER_WARRIOR',
    name: 'FROSTY VOYAGER SET',
    tag: 'SUB-ZERO ICE SET',
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
    name: 'GOLDEN PHARAOH X-SUIT',
    tag: 'ULTIMATE 7-STAR',
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
    name: 'BLOOD RAVEN X-SUIT',
    tag: 'CRIMSON FEATHER',
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
    name: 'BLACK COMMANDO TACTICAL',
    tag: 'SPEC-OPS COMBAT',
    rarity: 'LEGENDARY',
    rarityColor: '#a855f7',
    faceType: 'HUMAN_MALE',
    coatColor: '#0f172a',
    pinstripePants: false,
    pantsColor: '#090d16',
    cummerbundColor: '#1e293b',
    hairStyle: 'BUZZ',
    hairColor: '#111',
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
    name: 'M416 (GLACIER ICE)',
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
    desc: 'The iconic Glacier M416. Translucent ice receiver with cyan frost particles and maximum stability.',
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
    name: 'AWM .338 MAGNUM',
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
  muzzleLight: THREE.PointLight | null;
  hpBarMesh: THREE.Mesh;
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

  // Glowing Muzzle Light
  const mLight = new THREE.PointLight('#00f0ff', 0, 10);
  mLight.position.set(0, 0.02, 0.75);
  gun.add(mLight);

  return gun;
};

// Generic / Distinct 3D Weapon Model Builder
export const buildWeaponModelMesh = (type: WeaponType, skin: string): THREE.Group => {
  if (type === 'CARBINE' && skin === 'GLACIER_M416') {
    return buildGlacierM416Mesh();
  }

  const group = new THREE.Group();
  const gunMetalMat = new THREE.MeshStandardMaterial({ color: '#171c26', roughness: 0.25, metalness: 0.85 });
  const polymerMat = new THREE.MeshStandardMaterial({ color: '#0d1117', roughness: 0.6 });

  if (type === 'CARBINE') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.42), gunMetalMat);
    group.add(receiver);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), gunMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, 0.38);
    group.add(barrel);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.12), gunMetalMat);
    mag.position.set(0, -0.14, 0.08);
    mag.rotation.x = 0.15;
    group.add(mag);
  } else if (type === 'SMG') {
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.18, 0.35), polymerMat);
    group.add(upper);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.08), gunMetalMat);
    mag.position.set(0, -0.16, 0.05);
    group.add(mag);
  } else if (type === 'SHOTGUN') {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.55, 8), gunMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, 0.26);
    group.add(barrel);
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.28), polymerMat);
    group.add(receiver);
  } else if (type === 'SNIPER') {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.14, 0.55), gunMetalMat);
    group.add(chassis);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.82, 8), gunMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.65);
    group.add(barrel);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.36, 12), gunMetalMat);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.14, 0.08);
    group.add(scope);
  } else {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.24), gunMetalMat);
    group.add(slide);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.16, 0.08), polymerMat);
    grip.position.set(0, -0.07, -0.04);
    grip.rotation.x = -0.28;
    group.add(grip);
  }

  const mLight = new THREE.PointLight('#ffe066', 0, 10);
  mLight.position.set(0, 0.04, 0.8);
  group.add(mLight);

  return group;
};

// Builds "The Fool" / Joker Character Rig matching the user's lobby screenshot
export const buildTheFoolJokerRig = (skinDef: SkinSetDefinition, isEnemy: boolean = false): HumanRig => {
  const root = new THREE.Group();

  // Materials for "The Fool" Joker Set
  const clownFaceMat = new THREE.MeshStandardMaterial({
    color: '#ffffff', // Pale white porcelain face paint
    roughness: 0.4,
  });
  const smileRedMat = new THREE.MeshBasicMaterial({ color: '#dc2626' }); // Scarlet carved smile
  const eyeMaskMat = new THREE.MeshBasicMaterial({ color: '#1e1b4b' }); // Dark diamond eye shadow
  const tuxedoMat = new THREE.MeshStandardMaterial({
    color: isEnemy ? '#3b0764' : skinDef.coatColor,
    roughness: 0.6,
  });
  const cummerbundMat = new THREE.MeshStandardMaterial({
    color: skinDef.cummerbundColor,
    roughness: 0.5,
  });
  const pinstripeMat = new THREE.MeshStandardMaterial({
    color: skinDef.pantsColor,
    roughness: 0.7,
  });
  const shoesMat = new THREE.MeshStandardMaterial({
    color: '#0a0a0a',
    roughness: 0.2,
    metalness: 0.8,
  });
  const glovesMat = new THREE.MeshStandardMaterial({
    color: '#18181b',
    roughness: 0.6,
  });
  const jesterBellsMat = new THREE.MeshStandardMaterial({
    color: '#ffd700',
    metalness: 0.9,
    roughness: 0.2,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: skinDef.hairColor,
    roughness: 0.8,
  });

  // 1. Torso & Tailcoat Tuxedo
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.15, 0);
  root.add(torsoGroup);

  // Formal Ruffled Shirt & Tuxedo Vest
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.44), tuxedoMat);
  chest.castShadow = true;
  torsoGroup.add(chest);

  // White Shirt Inset & Bowtie
  const shirtInset = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.02), new THREE.MeshBasicMaterial({ color: '#f8fafc' }));
  shirtInset.position.set(0, 0.08, 0.23);
  torsoGroup.add(shirtInset);

  const bowTie = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.03), smileRedMat);
  bowTie.position.set(0, 0.28, 0.25);
  torsoGroup.add(bowTie);

  // Red Waist Sash / Cummerbund
  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 0.48), cummerbundMat);
  sash.position.set(0, -0.32, 0);
  torsoGroup.add(sash);

  // Swallowtail Coat Tails on Back
  if (skinDef.hasTailcoat) {
    const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.04), tuxedoMat);
    tailL.position.set(-0.16, -0.56, -0.22);
    tailL.rotation.x = -0.15;
    torsoGroup.add(tailL);

    const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.04), tuxedoMat);
    tailR.position.set(0.16, -0.56, -0.22);
    tailR.rotation.x = -0.15;
    torsoGroup.add(tailR);
  }

  // 2. Head & Clown Joker Mask
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.74, 0);
  torsoGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), clownFaceMat);
  head.scale.set(1.0, 1.25, 1.1);
  head.castShadow = true;
  headGroup.add(head);

  // Iconic Joker Big Red Smile
  const smileCurve = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 16, Math.PI), smileRedMat);
  smileCurve.position.set(0, -0.06, 0.22);
  smileCurve.rotation.x = Math.PI;
  headGroup.add(smileCurve);

  // Red Painted Nose
  const redNose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), smileRedMat);
  redNose.position.set(0, 0.02, 0.24);
  headGroup.add(redNose);

  // Diamond Eye Markings
  [-0.075, 0.075].forEach((ex) => {
    const eyeDecal = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.01), eyeMaskMat);
    eyeDecal.position.set(ex, 0.08, 0.23);
    eyeDecal.rotation.z = Math.PI / 4;
    headGroup.add(eyeDecal);
  });

  // Jester Pigtails / Hair with Bells
  if (skinDef.hairStyle === 'JESTER_PIGTAILS') {
    [-0.22, 0.22].forEach((hx, idx) => {
      const pigtail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.02, 0.38, 8), hairMat);
      pigtail.position.set(hx, 0.12, -0.05);
      pigtail.rotation.z = idx === 0 ? 0.45 : -0.45;
      headGroup.add(pigtail);

      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), jesterBellsMat);
      bell.position.set(hx * 1.5, -0.08, -0.05);
      headGroup.add(bell);
    });
  }

  // 3. Arms & Hands holding Glacier M416
  const armLGroup = new THREE.Group();
  armLGroup.position.set(-0.46, 0.28, 0);
  torsoGroup.add(armLGroup);

  const sleeveL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.65, 8), tuxedoMat);
  sleeveL.position.set(0, -0.32, 0.12);
  sleeveL.rotation.x = 0.65;
  armLGroup.add(sleeveL);

  const handL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.09), glovesMat);
  handL.position.set(0, -0.62, 0.26);
  armLGroup.add(handL);

  const armRGroup = new THREE.Group();
  armRGroup.position.set(0.46, 0.28, 0);
  torsoGroup.add(armRGroup);

  const sleeveR = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.65, 8), tuxedoMat);
  sleeveR.position.set(0, -0.32, 0.12);
  sleeveR.rotation.x = 0.75;
  armRGroup.add(sleeveR);

  const handRGroup = new THREE.Group();
  handRGroup.position.set(0, -0.62, 0.28);
  armRGroup.add(handRGroup);

  const handR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.09), glovesMat);
  handRGroup.add(handR);

  // Weapon socket
  const weaponAnchor = new THREE.Group();
  weaponAnchor.position.set(0.02, 0.02, 0.1);
  handRGroup.add(weaponAnchor);

  // Attach Glacier M416 by default
  const glacierM416 = buildGlacierM416Mesh();
  weaponAnchor.add(glacierM416);

  // 4. Legs with Pinstripe Trousers & Dress Shoes
  const legLGroup = new THREE.Group();
  legLGroup.position.set(-0.2, -0.36, 0);
  torsoGroup.add(legLGroup);

  const pantLegL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.95, 8), pinstripeMat);
  pantLegL.position.set(0, -0.48, 0);
  legLGroup.add(pantLegL);

  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.26), shoesMat);
  shoeL.position.set(0, -0.98, 0.06);
  legLGroup.add(shoeL);

  const legRGroup = new THREE.Group();
  legRGroup.position.set(0.2, -0.36, 0);
  torsoGroup.add(legRGroup);

  const pantLegR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.95, 8), pinstripeMat);
  pantLegR.position.set(0, -0.48, 0);
  legRGroup.add(pantLegR);

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
    currentWeaponMesh: glacierM416,
  };
};

// ============================================================================
// MAIN COMPONENT: REALISTIC BGMI BATTLE ROYALE
// ============================================================================
export default function ShadowStrikeScreen({ navigation }: any) {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const mountRef = useRef<any>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Flow State
  const [phase, setPhase] = useState<GameFlowPhase>('LOBBY');
  const [selectedMapId, setSelectedMapId] = useState<MapId>('ERANGEL');
  const [gameMode, setGameMode] = useState<GameModeId>('ICEMIRE_FRONTIER');
  const [selectedSkinId, setSelectedSkinId] = useState<SkinSetId>('THE_FOOL_JOKER');
  const [is3DInspect, setIs3DInspect] = useState<boolean>(false);

  // Lobby 3D Camera & Rotation
  const lobbyRotationRef = useRef<number>(0);
  const isDraggingLobbyRef = useRef<boolean>(false);
  const lastMouseXRef = useRef<number>(0);

  // Active Match Telemetry
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [playerArmor, setPlayerArmor] = useState<number>(100);
  const [aliveCount, setAliveCount] = useState<number>(100); // Authentic 100 Players
  const [killsCount, setKillsCount] = useState<number>(0);

  // 5 Functional Weapons Inventory
  const [currentWeapon, setCurrentWeapon] = useState<WeaponDef>(WEAPON_REGISTRY.CARBINE);
  const [ammoClip, setAmmoClip] = useState<number>(40);
  const [ammoReserve, setAmmoReserve] = useState<number>(180);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isAiming, setIsAiming] = useState<boolean>(false);

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
  const [eliminationBanner, setEliminationBanner] = useState<{
    visible: boolean;
    victimName: string;
    kills: number;
    remaining: number;
  }>({ visible: false, victimName: '', kills: 0, remaining: 100 });

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
    if (typeof window === 'undefined') return null;
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

  // Mutable Game Loop State
  const gameRef = useRef({
    phase: 'LOBBY' as GameFlowPhase,
    mapId: 'ERANGEL' as MapId,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    animFrameId: null as any,
    clock: new THREE.Clock(),
    elapsedTime: 0,
    isFiring: false,
    totalAlive: 100,
    lastRadarRender: 0,

    keys: { w: false, a: false, s: false, d: false, shift: false, space: false, e: false, r: false },
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
    },

    airplane: {
      position: new THREE.Vector3(0, 180, -380),
      velocity: new THREE.Vector3(0, 0, 28),
      hasJumped: false,
    },

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
    bulletTracers: [] as { line: THREE.Line; life: number }[],
    damageDealt: 0,
    eliminationCount: 0,
  });

  // ============================================================================
  // THREE.JS SCENE INITIALIZER (LOBBY & ERANGEL BATTLEGROUND)
  // ============================================================================
  useEffect(() => {
    if (Platform.OS !== 'web' || !mountRef.current) return;

    // In 2D Lobby mode, do not run heavy 3D rendering to ensure absolute 0 lag
    if (phase === 'LOBBY' && !is3DInspect) {
      if (mountRef.current) mountRef.current.innerHTML = '';
      return;
    }

    const g = gameRef.current;
    g.mapId = selectedMapId;
    const width = mountRef.current.clientWidth || winWidth;
    const height = mountRef.current.clientHeight || winHeight;

    const scene = new THREE.Scene();
    g.scene = scene;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 2000);
    g.camera = camera;

    // High performance renderer with capped pixel ratio (eliminates lag on 4K/Retina displays)
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    g.renderer = renderer;

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Build Scene depending on Phase
    if (phase === 'LOBBY') {
      buildBGMILobbyScene(scene, g);
    } else {
      buildErangelBattlegroundScene(scene, g);
    }

    // Input handlers
    setupInputControls(renderer.domElement, g);

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
      renderer.dispose();
    };
  }, [selectedMapId, phase, selectedSkinId, is3DInspect]);

  // ============================================================================
  // EXACT BGMI LOBBY 3D SCENE (IMAGE 1 REPLICA)
  // ============================================================================
  const buildBGMILobbyScene = (scene: THREE.Scene, g: any) => {
    scene.background = new THREE.Color('#78c0e8');
    scene.fog = new THREE.FogExp2('#9fd7f5', 0.007);

    // Soft Sunlight & Blue Ambient
    const hemi = new THREE.HemisphereLight('#bae6fd', '#3f6212', 1.4);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fffbeb', 2.8);
    sun.position.set(25, 50, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    // 1. Lush Green Grass Field Terrain (Image 1)
    const grassGeo = new THREE.PlaneGeometry(80, 80, 48, 48);
    const pos = grassGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      pos.setZ(i, Math.sin(vx * 0.08) * Math.cos(vy * 0.08) * 0.6);
    }
    grassGeo.computeVertexNormals();

    const grassMat = new THREE.MeshStandardMaterial({
      color: '#558b2f', // Vibrant grass green matching Image 1
      roughness: 0.85,
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    scene.add(grass);

    // 2. Ancient Stone Portal Arch & Floating Power Cube (Image 1 Right Background)
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

    // Floating Magical Red/Gold Glowing Crystal Cube
    const cubeMat = new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#f97316',
      emissiveIntensity: 0.8,
      roughness: 0.1,
    });
    const magicCube = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), cubeMat);
    magicCube.position.set(0, 1.4, 0);
    ruinsGroup.add(magicCube);
    g.lobbyFloatingCube = magicCube;

    const cubeLight = new THREE.PointLight('#f97316', 2.5, 6);
    cubeLight.position.set(0, 1.4, 0);
    ruinsGroup.add(cubeLight);

    scene.add(ruinsGroup);

    // 3. Companion Pet (Small Red Robot Bot on Right of Character)
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

    // 4. Spawn "The Fool" Joker Rig in the Center of Lobby
    const skinDef = SKIN_DEFINITIONS[selectedSkinId] || SKIN_DEFINITIONS.THE_FOOL_JOKER;
    const rig = buildTheFoolJokerRig(skinDef, false);
    rig.root.position.set(0, 0.05, 0);
    scene.add(rig.root);
    g.lobbyRig = rig;

    // Set Camera Facing Character (Matching Image 1 third-person viewpoint)
    if (g.camera) {
      g.camera.position.set(0, 1.35, 3.4);
      g.camera.lookAt(0, 1.15, 0);
    }
  };

  const updateLobbyScene = (dt: number, g: any) => {
    // Character Idle Breathing Animation
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
  };

  // ============================================================================
  // TRUE ERANGEL 8x8 3D BATTLEGROUND SCENE (IMAGE 2 REPLICA)
  // ============================================================================
  const buildErangelBattlegroundScene = (scene: THREE.Scene, g: any) => {
    scene.background = new THREE.Color('#38bdf8');
    scene.fog = new THREE.FogExp2('#93c5fd', 0.002);

    const hemi = new THREE.HemisphereLight('#bae6fd', '#166534', 1.2);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight('#fffbeb', 2.8);
    sun.position.set(120, 240, 120);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    // 1. Texture-Mapped Erangel Satellite Terrain (Optimized 48x48 for smooth 60 FPS)
    const textureLoader = new THREE.TextureLoader();
    const erangelTexture = textureLoader.load(ERANGEL_MAP_BASE64);
    erangelTexture.wrapS = THREE.ClampToEdgeWrapping;
    erangelTexture.wrapT = THREE.ClampToEdgeWrapping;

    const terrainGeo = new THREE.PlaneGeometry(900, 900, 48, 48);
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

    // 2. Realistic Ocean Water Channel between Mainland & Sosnovka Island
    const waterGeo = new THREE.PlaneGeometry(900, 900);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.4;
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

    // 4. Hot-Drop POI Landmarks (Pochinki & Military Base)
    // Pochinki Town (Center: 0, 0)
    for (let c = 0; c < 16; c++) {
      const hx = (c % 4) * 22 - 33;
      const hz = Math.floor(c / 4) * 22 - 33;
      const house = new THREE.Mesh(
        new THREE.BoxGeometry(14, 8, 16),
        new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 })
      );
      house.position.set(hx, getErangelTerrainHeight(hx, hz) + 4, hz);
      house.castShadow = true;
      scene.add(house);
    }

    // Sosnovka Military Base Radar Dome & C-Buildings (South Island: 0, -180)
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

    // 6. Spawn Player Operative & Hostile Opponents
    buildPlayerInErangel(scene, g);
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

  const buildPlayerInErangel = (scene: THREE.Scene, g: any) => {
    const skinDef = SKIN_DEFINITIONS[selectedSkinId] || SKIN_DEFINITIONS.THE_FOOL_JOKER;
    const rig = buildTheFoolJokerRig(skinDef, false);
    rig.root.position.copy(g.player.position);
    scene.add(rig.root);
    g.playerRig = rig;
  };

  const spawnErangelOpponents = (scene: THREE.Scene, g: any) => {
    const activeCount = 14; // High-performance active bot squad in player sector
    const bots: EnemyBot[] = [];
    const weaponsList: WeaponType[] = ['CARBINE', 'SMG', 'SHOTGUN', 'SNIPER', 'PISTOL'];

    for (let i = 0; i < activeCount; i++) {
      const angle = (i / activeCount) * Math.PI * 2;
      const dist = 40 + (i % 4) * 30;
      const bx = Math.cos(angle) * dist;
      const bz = Math.sin(angle) * dist - 40;
      const by = getErangelTerrainHeight(bx, bz);

      const rig = buildTheFoolJokerRig(SKIN_DEFINITIONS.TACTICAL_BLACK, true);
      rig.root.position.set(bx, by, bz);

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
        name: `Operative_${String(i + 1).padStart(2, '0')}`,
        rig,
        position: rig.root.position,
        velocity: new THREE.Vector3(),
        hp: 100,
        maxHp: 100,
        weapon: weaponsList[i % weaponsList.length],
        state: 'PATROL',
        patrolTarget: new THREE.Vector3(bx + (Math.random() - 0.5) * 45, by, bz + (Math.random() - 0.5) * 45),
        shootCooldown: 1.2 + Math.random(),
        walkCycle: 0,
        isDead: false,
        muzzleLight: null,
        hpBarMesh: hpBar,
      });
    }

    g.bots = bots;
    g.totalAlive = 100;
    setAliveCount(100);
  };

  // ============================================================================
  // MATCH FLIGHT, INSERTION & PLAYING GAMEPLAY
  // ============================================================================
  const updateAirplaneFlight = (dt: number, g: any) => {
    const p = g.airplane;
    p.position.add(p.velocity.clone().multiplyScalar(dt));

    if (g.camera) {
      g.camera.position.set(p.position.x - 24, p.position.y + 14, p.position.z - 32);
      g.camera.lookAt(p.position);
    }

    if (p.position.z > 220 && !p.hasJumped) {
      jumpFromAirplane();
    }
  };

  const jumpFromAirplane = () => {
    const g = gameRef.current;
    if (g.phase !== 'AIRPLANE') return;
    g.airplane.hasJumped = true;
    g.player.position.copy(g.airplane.position);
    g.player.velocity.set(0, -32, 14);
    g.phase = 'FREEFALL';
    setPhase('FREEFALL');
  };

  const updateFreefallAndParachute = (dt: number, g: any) => {
    const p = g.player;
    const yaw = g.mouseLook.yaw;
    const glide = g.phase === 'PARACHUTE' ? 15 : 28;
    const termVel = g.phase === 'PARACHUTE' ? -8 : -45;

    p.velocity.y = Math.max(termVel, p.velocity.y - 12 * dt);
    p.velocity.x = Math.sin(yaw) * glide;
    p.velocity.z = Math.cos(yaw) * glide;

    p.position.add(p.velocity.clone().multiplyScalar(dt));

    if (g.playerRig) {
      g.playerRig.root.position.copy(p.position);
      g.playerRig.root.rotation.y = yaw;
    }

    if (g.camera) {
      g.camera.position.set(
        p.position.x - Math.sin(yaw) * 7.0,
        p.position.y + 4.5,
        p.position.z - Math.cos(yaw) * 7.0
      );
      g.camera.lookAt(p.position);
    }

    const groundY = getErangelTerrainHeight(p.position.x, p.position.z);
    if (p.position.y <= groundY + 0.4) {
      p.position.y = groundY;
      p.velocity.set(0, 0, 0);
      g.phase = 'PLAYING';
      setPhase('PLAYING');
      pushKillFeed('TOUCHDOWN: Safe Zone contracting in 2 mins!');
    }
  };

  const updateCombatGameplay = (dt: number, g: any) => {
    const p = g.player;
    const yaw = g.mouseLook.yaw;
    const pitch = g.mouseLook.pitch;

    // Movement
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const moveDir = new THREE.Vector3();

    if (g.keys.w) moveDir.add(fwd);
    if (g.keys.s) moveDir.sub(fwd);
    if (g.keys.d) moveDir.add(right);
    if (g.keys.a) moveDir.sub(right);

    const isMoving = moveDir.lengthSq() > 0;
    if (isMoving) moveDir.normalize();

    const speed = g.keys.shift ? 10.5 : 6.2;
    p.velocity.x = moveDir.x * speed;
    p.velocity.z = moveDir.z * speed;

    p.position.add(p.velocity.clone().multiplyScalar(dt));
    p.position.y = getErangelTerrainHeight(p.position.x, p.position.z);

    if (g.playerRig) {
      const rig = g.playerRig;
      rig.root.position.copy(p.position);
      rig.root.rotation.y = yaw;

      if (isMoving) {
        p.walkCycle += dt * 12;
        const stride = Math.sin(p.walkCycle) * 0.7;
        rig.legLGroup.rotation.x = stride;
        rig.legRGroup.rotation.x = -stride;
        rig.torsoGroup.position.y = 1.15 + Math.abs(Math.sin(p.walkCycle)) * 0.04;
      } else {
        rig.torsoGroup.position.y = 1.15 + Math.sin(g.elapsedTime * 2.4) * 0.015;
        rig.legLGroup.rotation.x = 0;
        rig.legRGroup.rotation.x = 0;
      }
    }

    // Camera
    if (g.camera) {
      const fov = g.mouseLook.isAiming ? p.currentWeapon.zoomFOV : 65;
      g.camera.fov += (fov - g.camera.fov) * 0.2;
      g.camera.updateProjectionMatrix();

      const dist = g.mouseLook.isAiming ? 1.6 : 3.5;
      const height = g.mouseLook.isAiming ? 1.65 : 1.85;

      g.camera.position.set(
        p.position.x - Math.sin(yaw) * dist + Math.cos(yaw) * 0.6,
        p.position.y + height + Math.sin(pitch) * 1.5,
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
        setPhase('GAMEOVER');
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
            if (b.rig) {
              b.rig.root.rotation.x = Math.PI / 2;
              b.rig.root.position.y = 0.2;
            }
            g.totalAlive = Math.max(1, g.totalAlive - 1);
            setAliveCount(g.totalAlive);
            pushKillFeed(`☣️ ${b.name} fell to the Playzone`);
            if (g.totalAlive === 1 && g.player.hp > 0) setPhase('VICTORY');
          }
        }
      });
    }
  };

  const updateErangelBotAI = (dt: number, g: any) => {
    const p = g.player;
    g.bots.forEach((b: EnemyBot) => {
      if (b.isDead) return;
      const dist = b.position.distanceTo(p.position);
      if (dist < 45) {
        b.state = 'ATTACK';
        b.rig.root.lookAt(p.position.x, b.position.y, p.position.z);
        b.shootCooldown -= dt;
        if (b.shootCooldown <= 0) {
          b.shootCooldown = 1.0 + Math.random() * 0.8;
          playGunshotSound(b.weapon);

          if (dist < 35 && Math.random() < 0.5) {
            const dmg = 14;
            p.hp = Math.max(0, p.hp - dmg);
            setPlayerHp(p.hp);
            setDamageFlash(true);
            setTimeout(() => setDamageFlash(false), 80);
            if (p.hp <= 0) setPhase('GAMEOVER');
          }
        }
      } else {
        b.state = 'PATROL';
        const toTarget = b.patrolTarget.clone().sub(b.position);
        if (toTarget.length() < 2) {
          b.patrolTarget.set(b.position.x + (Math.random() - 0.5) * 45, 0, b.position.z + (Math.random() - 0.5) * 45);
        } else {
          toTarget.normalize();
          b.position.add(toTarget.multiplyScalar(3.2 * dt));
          b.position.y = getErangelTerrainHeight(b.position.x, b.position.z);
          b.rig.root.position.copy(b.position);
          b.rig.root.rotation.y = Math.atan2(-toTarget.x, -toTarget.z);
        }
      }
    });
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

    // Enemy Bot Blips (Red Dots)
    ctx.fillStyle = '#ef4444';
    g.bots.forEach((b: EnemyBot) => {
      if (b.isDead) return;
      const bx = cx + (b.position.x - g.player.position.x) * scale;
      const by = cy + (b.position.z - g.player.position.z) * scale;
      if (Math.hypot(bx - cx, by - cy) < radius) {
        ctx.beginPath();
        ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
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
    if (g.phase !== 'PLAYING' || p.reloading || p.clip <= 0) return;

    const now = g.elapsedTime;
    if (now - p.lastShotTime < p.currentWeapon.fireRate) return;
    p.lastShotTime = now;

    p.clip -= 1;
    setAmmoClip(p.clip);
    playGunshotSound(p.currentWeapon.id);

    if (!g.camera || !g.scene) return;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), g.camera);

    const hits = ray.intersectObjects(g.scene.children, true);
    if (hits.length > 0) {
      for (let hit of hits) {
        if (hit.object !== g.playerRig?.root) {
          const struckBot = g.bots.find((b: EnemyBot) => b.rig.root === hit.object.parent?.parent?.parent || b.rig.root === hit.object.parent?.parent);
          if (struckBot && !struckBot.isDead) {
            struckBot.hp -= p.currentWeapon.damage;
            playHitMarkerSound();
            setHitMarker(true);
            setTimeout(() => setHitMarker(false), 70);

            if (struckBot.hp <= 0 && !struckBot.isDead) {
              struckBot.isDead = true;
              struckBot.state = 'DEAD';
              if (struckBot.rig) {
                struckBot.rig.root.rotation.x = Math.PI / 2;
                struckBot.rig.root.position.y = 0.2;
              }
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
              pushKillFeed(`SMxTHUG eliminated ${struckBot.name} with M416 Glacier`);

              if (g.totalAlive === 1 && p.hp > 0) setPhase('VICTORY');
            }
          }
          break;
        }
      }
    }
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

  const setupInputControls = (canvas: HTMLCanvasElement, g: any) => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w') g.keys.w = true;
      if (k === 'a') g.keys.a = true;
      if (k === 's') g.keys.s = true;
      if (k === 'd') g.keys.d = true;
      if (e.key === 'Shift') g.keys.shift = true;
      if (e.key === ' ') {
        e.preventDefault();
        if (g.phase === 'AIRPLANE') jumpFromAirplane();
        else if (g.phase === 'FREEFALL') {
          g.phase = 'PARACHUTE';
          setPhase('PARACHUTE');
        }
      }
      if (k === 'm') setShowFullMap((m) => !m);
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
      if (e.key === 'Shift') g.keys.shift = false;
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

    const onMouseUp = () => {
      isDraggingLobbyRef.current = false;
      g.isFiring = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (g.phase === 'LOBBY' && isDraggingLobbyRef.current) {
        const deltaX = e.clientX - lastMouseXRef.current;
        lastMouseXRef.current = e.clientX;
        lobbyRotationRef.current += deltaX * 0.012;
      } else if (g.phase === 'PLAYING' && document.pointerLockElement === canvas) {
        g.mouseLook.yaw -= e.movementX * 0.0022;
        g.mouseLook.pitch -= e.movementY * 0.0022;
        g.mouseLook.pitch = Math.max(-0.6, Math.min(0.85, g.mouseLook.pitch));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
  };

  const pushKillFeed = (msg: string) => {
    setKillFeed((prev) => [msg, ...prev.slice(0, 4)]);
  };

  const startErangelMatch = () => {
    playStartMatchSound();
    const g = gameRef.current;
    g.phase = 'AIRPLANE';
    setPhase('AIRPLANE');
    g.airplane.position.set(0, 180, -380);
    g.airplane.hasJumped = false;
    g.player.hp = 100;
    g.player.armor = 100;
    setPlayerHp(100);
    setPlayerArmor(100);
    setKillsCount(0);
    setAliveCount(100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />

      <View style={styles.canvasContainer}>
        {/* Exact BGMI Lobby Backdrop Image from Image 1 */}
        {phase === 'LOBBY' && !is3DInspect && (
          <Image
            source={{ uri: BGMI_LOBBY_BG_BASE64 }}
            style={styles.bgmiLobbyBackdropImage}
            resizeMode="cover"
          />
        )}

        {/* 3D WebGL Canvas */}
        <div
          ref={mountRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            display: (phase === 'LOBBY' && !is3DInspect) ? 'none' : 'block',
            cursor: phase === 'PLAYING' ? 'crosshair' : 'default',
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
        {/* EXACT BGMI LOBBY UI REPLICA (IMAGE 1) */}
        {/* ==================================================================== */}
        {phase === 'LOBBY' && (
          <View style={styles.bgmiLobbyUI} pointerEvents="box-none">
            {/* TOP BAR */}
            <View style={styles.bgmiTopBar}>
              {/* Profile Card (Left) */}
              <View style={styles.profileSection}>
                <View style={styles.avatarFrameGold}>
                  <Text style={styles.avatarIcon}>👑</Text>
                  <View style={styles.lvlBadge}><Text style={styles.lvlText}>75</Text></View>
                </View>
                <View style={styles.profileDetails}>
                  <Text style={styles.profileName}>SMxTHUG</Text>
                  <View style={styles.onlineStatusRow}>
                    <Text style={styles.onlineCountText}>12/62</Text>
                    <Text style={styles.bellIcon}>🔔</Text>
                  </View>
                </View>
                {/* Team slots / icons */}
                <TouchableOpacity style={styles.findTeamBtn}>
                  <Text style={styles.findTeamText}>Find Teammates</Text>
                </TouchableOpacity>
              </View>

              {/* Center Icons & 3D Inspect Mode Switcher */}
              <View style={styles.centerIconsRow}>
                <TouchableOpacity
                  style={styles.inspectModeToggleBtn}
                  onPress={() => setIs3DInspect(!is3DInspect)}
                >
                  <Text style={styles.inspectModeToggleText}>
                    {is3DInspect ? '🎪 BGMI REAL LOBBY' : '🔄 3D INSPECT SKIN'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.topUtilityIcon}><Text>🏠 Home</Text></TouchableOpacity>
                <TouchableOpacity style={styles.topUtilityIcon}><Text>☁️</Text></TouchableOpacity>
                <TouchableOpacity style={styles.topUtilityIcon}><Text>🪖</Text></TouchableOpacity>
                <TouchableOpacity style={styles.topUtilityIcon}><Text>⚙️</Text></TouchableOpacity>
              </View>

              {/* Currency & RP Section (Right) */}
              <View style={styles.currencySection}>
                <View style={styles.currencyPill}>
                  <Text style={styles.currencyLabel}>G</Text>
                  <Text style={styles.currencyVal}>289</Text>
                </View>
                <View style={styles.currencyPill}>
                  <Text style={styles.currencyLabelUC}>UC</Text>
                  <Text style={styles.currencyVal}>1+</Text>
                </View>
                <View style={styles.rpShieldBadge}>
                  <Text style={styles.rpText}>RP</Text>
                </View>
                <View style={styles.luckyCrateBadge}>
                  <Text style={styles.crateText}>🎁</Text>
                </View>
              </View>
            </View>

            {/* RIGHT SIDE EVENT BANNERS (FROSTY VOYAGER SET) */}
            <View style={styles.rightBannersColumn}>
              <TouchableOpacity style={styles.eventBannerCard} activeOpacity={0.85}>
                <View style={styles.eventBannerInner}>
                  <Text style={styles.eventTag}>FROSTY</Text>
                  <Text style={styles.eventTitle}>VOYAGER SET</Text>
                  <Text style={styles.eventSub}>12 ❯</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.subBannerRow}>
                <TouchableOpacity style={styles.subBanner}><Text style={styles.subBannerText}>🏷 Deals</Text></TouchableOpacity>
                <TouchableOpacity style={styles.subBanner}><Text style={styles.subBannerText}>🎮 Play & Win</Text></TouchableOpacity>
              </View>
            </View>

            {/* BOTTOM LEFT: ICEMIRE / ARENA SELECTOR & START BUTTON */}
            <View style={styles.bottomLeftControls}>
              {/* Map & Mode Card */}
              <TouchableOpacity
                style={styles.modeSelectorCard}
                onPress={() => setPhase('MAP_SELECT')}
                activeOpacity={0.8}
              >
                <View style={styles.modeCrestRow}>
                  <Text style={styles.modeCrestIcon}>🐉</Text>
                  <Text style={styles.modeCrestTitle}>Icemire Frontier</Text>
                </View>
                <Text style={styles.modeMainTitle}>
                  {selectedMapId === 'ERANGEL' ? 'Classic - Erangel' : FOUR_MAPS[selectedMapId].name}
                </Text>
                <View style={styles.modeSubInfoRow}>
                  <Text style={styles.modeSubText}>👥 4 TPP | {selectedMapId}</Text>
                </View>
              </TouchableOpacity>

              {/* THE ICONIC YELLOW START BUTTON */}
              <TouchableOpacity
                style={styles.bgmiStartBtn}
                onPress={startErangelMatch}
                activeOpacity={0.85}
              >
                <Text style={styles.bgmiStartBtnText}>START</Text>
              </TouchableOpacity>
            </View>

            {/* BOTTOM NAV BAR & RECRUITMENT TICKER */}
            <View style={styles.bottomBarContainer}>
              <View style={styles.recruitmentTicker}>
                <Text style={styles.tickerText}>
                  Team Up: [TABAAHIfm]: [Recruitment] Team Deathmatch - Warehouse
                </Text>
              </View>

              <View style={styles.bottomMenuRow}>
                <TouchableOpacity style={styles.botNavBtn}><Text style={styles.botNavText}>REGION</Text></TouchableOpacity>
                <TouchableOpacity style={styles.botNavBtn}><Text style={styles.botNavText}>CLAN</Text></TouchableOpacity>
                <TouchableOpacity style={styles.botNavBtn}><Text style={[styles.botNavText, { color: '#ffd700' }]}>C7S20 SEASON</Text></TouchableOpacity>
                <TouchableOpacity style={styles.botNavBtn}><Text style={styles.botNavText}>WORKSHOP</Text></TouchableOpacity>
                <TouchableOpacity style={styles.botNavBtn}>
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
                <TouchableOpacity style={styles.botNavBtn}><Text style={styles.botNavText}>😀</Text></TouchableOpacity>
              </View>

              {/* Network Status Stamp */}
              <View style={styles.networkStatusStamp}>
                <Text style={styles.networkText}>📶 India HD 2024/11/29 15:58</Text>
              </View>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* ERANGEL MAP SELECTOR MODAL (IMAGE 2) */}
        {/* ==================================================================== */}
        {phase === 'MAP_SELECT' && (
          <View style={styles.modalBackdrop}>
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
                onPress={() => setSelectedMapId('ERANGEL')}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: ERANGEL_MAP_BASE64 }}
                  style={styles.erangelPreviewImg}
                  resizeMode="cover"
                />
                <View style={styles.erangelFeatureOverlay}>
                  <View style={styles.erangelTagPill}>
                    <Text style={styles.erangelTagText}>★ SIGNATURE 8x8 ISLAND ★</Text>
                  </View>
                  <Text style={styles.erangelTitleText}>ERANGEL 8x8 (CLASSIC)</Text>
                  <Text style={styles.erangelDescText}>
                    Featuring Pochinki, Sosnovka Military Base Island, Georgopol Docks, School, Rozhok, and twin sea bridges.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Other Maps List */}
              <ScrollView style={{ maxHeight: 200, width: '100%' }} showsVerticalScrollIndicator={false}>
                {Object.values(FOUR_MAPS)
                  .filter((m) => m.id !== 'ERANGEL')
                  .map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.mapOptionRow, selectedMapId === m.id && styles.mapOptionRowActive]}
                      onPress={() => setSelectedMapId(m.id)}
                    >
                      <Text style={styles.mapOptionName}>{m.name}</Text>
                      <Text style={styles.mapOptionTag}>{m.tagline}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <TouchableOpacity style={styles.confirmMapBtn} onPress={() => setPhase('LOBBY')}>
                <Text style={styles.confirmMapBtnText}>✓ CONFIRM THEATRE ({FOUR_MAPS[selectedMapId].name})</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ==================================================================== */}
        {/* INVENTORY / SKIN SWITCHER MODAL */}
        {/* ==================================================================== */}
        <Modal visible={showInventoryModal} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
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
                        setSelectedSkinId(s.id);
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
          <View style={styles.inGameHUD} pointerEvents="box-none">
            {/* Top Bar */}
            <View style={styles.inGameTopBar}>
              <View style={styles.hudAliveCard}>
                <Text style={styles.hudAliveText}>ALIVE: {aliveCount}</Text>
                <Text style={styles.hudKillsText}>KILLS: {killsCount}</Text>
              </View>

              <View style={styles.hudStormCard}>
                <Text style={styles.hudStormText}>
                  PLAYZONE: {Math.floor(safeZoneTime / 60)}:{String(safeZoneTime % 60).padStart(2, '0')}
                </Text>
                {isOutsideSafeZone && <Text style={styles.stormWarning}>⚠️ TAKING ZONE DAMAGE!</Text>}
              </View>

              {/* Erangel Satellite Radar */}
              <TouchableOpacity onPress={() => setShowFullMap(true)}>
                <canvas ref={minimapCanvasRef} width={130} height={130} style={{ width: 130, height: 130, borderRadius: 65, borderWidth: 2, borderColor: '#00f0ff' }} />
              </TouchableOpacity>
            </View>

            {/* Killfeed */}
            <View style={styles.killFeedBox} pointerEvents="none">
              {killFeed.map((m, idx) => (
                <Text key={idx} style={styles.killFeedText}>{m}</Text>
              ))}
            </View>

            {/* Reticle */}
            <View style={styles.reticleCenter} pointerEvents="none">
              <View style={[styles.reticleDot, hitMarker && styles.reticleHit]} />
            </View>

            {/* Bottom HUD: 5 Weapon Slots & Health */}
            <View style={styles.inGameBottomBar}>
              {/* HP & Armor */}
              <View style={styles.vitalsBox}>
                <View style={styles.barRow}>
                  <Text style={styles.barLbl}>HP</Text>
                  <View style={styles.barTrack}><View style={[styles.barFill, { width: `${playerHp}%`, backgroundColor: '#22c55e' }]} /></View>
                  <Text style={styles.barVal}>{playerHp}</Text>
                </View>
                <View style={styles.barRow}>
                  <Text style={styles.barLbl}>AP</Text>
                  <View style={styles.barTrack}><View style={[styles.barFill, { width: `${playerArmor}%`, backgroundColor: '#00f0ff' }]} /></View>
                  <Text style={styles.barVal}>{playerArmor}</Text>
                </View>
              </View>

              {/* 5 Weapon Switcher */}
              <View style={styles.weaponSlotsRow}>
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
              </View>

              {/* Ammo Box */}
              <View style={styles.ammoBox}>
                <Text style={styles.ammoWeaponTitle}>{currentWeapon.name}</Text>
                <Text style={styles.ammoCount}>{ammoClip} <Text style={styles.ammoReserve}>/ {ammoReserve}</Text></Text>
              </View>
            </View>
          </View>
        )}

        {/* AIRPLANE DROP OVERLAY */}
        {phase === 'AIRPLANE' && (
          <View style={styles.airplaneOverlay} pointerEvents="box-none">
            <Text style={styles.flightTitle}>C-130 HERCULES OVER ERANGEL</Text>
            <TouchableOpacity style={styles.jumpActionBtn} onPress={jumpFromAirplane}>
              <Text style={styles.jumpActionBtnText}>🪂 PRESS [SPACE] TO JUMP (HOT DROP)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* VICTORY MODAL */}
        <Modal visible={phase === 'VICTORY'} transparent animationType="slide">
          <View style={styles.modalBackdrop}>
            <View style={[styles.endModalCard, { borderColor: '#ffd700' }]}>
              <Text style={styles.victoryTitle}>🏆 WINNER WINNER 🏆</Text>
              <Text style={styles.victorySub}>CHICKEN DINNER!</Text>
              <Text style={styles.victoryMap}>MAP: ERANGEL 8x8 • RANK #1</Text>
              <TouchableOpacity style={styles.bgmiStartBtn} onPress={() => setPhase('LOBBY')}>
                <Text style={styles.bgmiStartBtnText}>RETURN TO LOBBY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* DEFEAT MODAL */}
        <Modal visible={phase === 'GAMEOVER'} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.endModalCard, { borderColor: '#ef4444' }]}>
              <Text style={styles.defeatTitle}>BETTER LUCK NEXT TIME</Text>
              <Text style={styles.victoryMap}>MAP: ERANGEL 8x8</Text>
              <TouchableOpacity style={styles.bgmiStartBtn} onPress={() => setPhase('LOBBY')}>
                <Text style={styles.bgmiStartBtnText}>RETURN TO LOBBY</Text>
              </TouchableOpacity>
            </View>
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
  erangelModalCard: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: '#0a1220',
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
    backgroundColor: '#0a1220',
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
    backgroundColor: '#0a1220',
    borderWidth: 2,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  victoryTitle: { color: '#ffd700', fontSize: 26, fontWeight: '900', letterSpacing: 1.5 },
  victorySub: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  defeatTitle: { color: '#ef4444', fontSize: 22, fontWeight: '900' },
  victoryMap: { color: '#38bdf8', fontSize: 12, fontWeight: '800', marginVertical: 10 },
});
