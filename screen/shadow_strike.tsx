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

    // Player Physics
    player: {
      position: new THREE.Vector3(0, 2, 45),
      velocity: new THREE.Vector3(0, 0, 0),
      mesh: null as THREE.Group | null,
      bodyMesh: null as THREE.Mesh | null,
      gunMesh: null as THREE.Mesh | null,
      muzzleLight: null as THREE.PointLight | null,
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

    // World & Entities
    terrainMesh: null as THREE.Mesh | null,
    obstacles: [] as THREE.Box3[],
    enemies: [] as EnemyEntity[],
    particles: [] as ParticleItem[],
    bulletTracers: [] as { line: THREE.Line; life: number }[],
    explosiveBarrels: [] as ExplosiveBarrel[],
    searchlights: [] as THREE.SpotLight[],

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
    scene.background = new THREE.Color('#0b1324');
    scene.fog = new THREE.FogExp2('#0e182c', 0.0075);
    g.scene = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 900);
    camera.position.set(0, 3, 50);
    g.camera = camera;

    // 3. Renderer with HIGH PRO MAX Filmic Tone Mapping & Shadows
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Photorealistic console tone mapping
    renderer.toneMappingExposure = 1.35;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    g.renderer = renderer;

    // Mount canvas to DOM
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 4. Photorealistic Cinematic Lighting Rig
    const ambientLight = new THREE.HemisphereLight('#87b5ff', '#33271d', 0.85);
    scene.add(ambientLight);

    const dirSun = new THREE.DirectionalLight('#ffe8d6', 2.2);
    dirSun.position.set(80, 130, 60);
    dirSun.castShadow = true;
    dirSun.shadow.mapSize.width = 2048;
    dirSun.shadow.mapSize.height = 2048;
    dirSun.shadow.camera.near = 10;
    dirSun.shadow.camera.far = 380;
    const d = 120;
    dirSun.shadow.camera.left = -d;
    dirSun.shadow.camera.right = d;
    dirSun.shadow.camera.top = d;
    dirSun.shadow.camera.bottom = -d;
    dirSun.shadow.bias = -0.0004;
    scene.add(dirSun);

    // Sun flare glow
    const sunOrb = new THREE.Mesh(
      new THREE.SphereGeometry(14, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#ffea9f' })
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

      if (g.state === 'PLAYING') {
        updatePlayerPhysics(dt, g);
        updateCombatAndWeapons(dt, g);
        updateEnemyAI(dt, g);
        updateMissionProgress(g);
        updateParticles(dt, g);
        updateTacticalLaser(g);

        // Animate searchlights swinging
        const t = g.clock.getElapsedTime();
        g.searchlights.forEach((sl: any, idx: number) => {
          sl.target.position.x = Math.sin(t * 0.8 + idx * 2) * 25;
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
  // PROCEDURAL OPEN-WORLD TERRAIN GENERATION
  // ==========================================
  const buildOpenWorldTerrain = (scene: THREE.Scene, g: any) => {
    const size = 340;
    const segments = 90;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Distance from center facility
      const distFromCenter = Math.sqrt(x * x + z * z);

      let height = 0;
      if (distFromCenter > 35) {
        height =
          Math.sin(x * 0.04) * Math.cos(z * 0.04) * 8 +
          Math.sin(x * 0.08 + 1.2) * Math.cos(z * 0.08) * 4;

        if (distFromCenter > 115) {
          height += Math.pow((distFromCenter - 115) * 0.28, 1.85);
        }
      } else {
        height = Math.sin(x * 0.02) * 0.4;
      }

      pos.setY(i, height);
    }
    geo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: '#283823',
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });
    const terrain = new THREE.Mesh(geo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);
    g.terrainMesh = terrain;

    // Pine Trees & Boulders
    const treeTrunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 4, 6);
    const treeFoliageGeo = new THREE.ConeGeometry(3.2, 7.5, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#3d2b1f', roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: '#16381e', roughness: 0.8 });
    const rockGeo = new THREE.DodecahedronGeometry(1.6, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: '#4a4f54', roughness: 0.85, flatShading: true });

    for (let i = 0; i < 95; i++) {
      const tx = (Math.random() - 0.5) * 240;
      const tz = (Math.random() - 0.5) * 240;
      const dCenter = Math.sqrt(tx * tx + tz * tz);

      if (dCenter > 38 && dCenter < 125) {
        const ty = getTerrainHeight(tx, tz);

        const treeGroup = new THREE.Group();
        treeGroup.position.set(tx, ty, tz);

        const trunk = new THREE.Mesh(treeTrunkGeo, trunkMat);
        trunk.position.y = 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        treeGroup.add(trunk);

        const foliage = new THREE.Mesh(treeFoliageGeo, foliageMat);
        foliage.position.y = 6.5;
        foliage.castShadow = true;
        treeGroup.add(foliage);

        scene.add(treeGroup);

        g.obstacles.push(new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(tx, ty + 2, tz),
          new THREE.Vector3(1.2, 5, 1.2)
        ));

        if (Math.random() < 0.45) {
          const rx = tx + (Math.random() - 0.5) * 6;
          const rz = tz + (Math.random() - 0.5) * 6;
          const ry = getTerrainHeight(rx, rz);
          const rock = new THREE.Mesh(rockGeo, rockMat);
          const rScale = 0.8 + Math.random() * 1.4;
          rock.scale.set(rScale, rScale * 0.8, rScale);
          rock.position.set(rx, ry + rScale * 0.7, rz);
          rock.rotation.set(Math.random(), Math.random(), Math.random());
          rock.castShadow = true;
          rock.receiveShadow = true;
          scene.add(rock);
          g.obstacles.push(new THREE.Box3().setFromObject(rock));
        }
      }
    }
  };

  // Terrain height query helper
  const getTerrainHeight = (x: number, z: number): number => {
    const dist = Math.sqrt(x * x + z * z);
    if (dist <= 35) return 0;
    let h = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 8 + Math.sin(x * 0.08 + 1.2) * Math.cos(z * 0.08) * 4;
    if (dist > 115) h += Math.pow((dist - 115) * 0.28, 1.85);
    return Math.max(0, h);
  };

  // ==========================================
  // REALISTIC ASPHALT ROAD WITH HIGHWAY MARKINGS
  // ==========================================
  const buildAsphaltRoad = (scene: THREE.Scene, g: any) => {
    const roadMat = new THREE.MeshStandardMaterial({ color: '#16191f', roughness: 0.85 });
    const lineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const yellowMat = new THREE.MeshBasicMaterial({ color: '#ffcc00' });

    // Road segment leading from spawn to gate
    const roadGeo = new THREE.BoxGeometry(9, 0.15, 75);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, 0.08, 38);
    road.receiveShadow = true;
    scene.add(road);

    // Center dashed lines
    for (let z = 5; z <= 70; z += 6) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 2.8), yellowMat);
      dash.position.set(0, 0.1, z);
      scene.add(dash);
    }
  };

  // ==========================================
  // BUILD ABANDONED MILITARY COMPLEX
  // ==========================================
  const buildAbandonedFacility = (scene: THREE.Scene, g: any) => {
    const concreteMat = new THREE.MeshStandardMaterial({ color: '#4f5761', roughness: 0.75 });
    const rustMetalMat = new THREE.MeshStandardMaterial({ color: '#38251e', roughness: 0.6, metalness: 0.7 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: '#1b2026', roughness: 0.4, metalness: 0.9 });
    const hazardMat = new THREE.MeshBasicMaterial({ color: '#ffcc00' });
    const redLightMat = new THREE.MeshBasicMaterial({ color: '#ff0033' });

    // 1. Concrete Compound Floor Slab
    const slab = new THREE.Mesh(new THREE.BoxGeometry(66, 0.4, 66), concreteMat);
    slab.position.set(0, 0.1, -15);
    slab.receiveShadow = true;
    scene.add(slab);

    // 2. Central Reinforced Bunker (HQ Facility)
    const bunkerGroup = new THREE.Group();
    bunkerGroup.position.set(0, 0, -25);

    const bunker = new THREE.Mesh(new THREE.BoxGeometry(25, 7.5, 19), concreteMat);
    bunker.position.y = 3.75;
    bunker.castShadow = true;
    bunker.receiveShadow = true;
    bunkerGroup.add(bunker);

    // Hazard warning stripe above bunker entrance
    const hazardStripe = new THREE.Mesh(new THREE.BoxGeometry(12, 0.8, 0.2), hazardMat);
    hazardStripe.position.set(0, 6.2, 9.6);
    bunkerGroup.add(hazardStripe);

    // Satellite Dish on Roof
    const dishMast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3), darkSteelMat);
    dishMast.position.set(0, 9, 0);
    bunkerGroup.add(dishMast);

    const dish = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), darkSteelMat);
    dish.position.set(0, 10.5, 0);
    dish.rotation.x = 0.55;
    bunkerGroup.add(dish);

    scene.add(bunkerGroup);
    g.obstacles.push(new THREE.Box3().setFromObject(bunker));

    // 3. Security Blast Gate
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, 5);

    const pillarGeo = new THREE.BoxGeometry(2.2, 6.5, 2.2);
    const pillarL = new THREE.Mesh(pillarGeo, concreteMat);
    pillarL.position.set(-6, 3.2, 0);
    pillarL.castShadow = true;
    gateGroup.add(pillarL);

    const pillarR = new THREE.Mesh(pillarGeo, concreteMat);
    pillarR.position.set(6, 3.2, 0);
    pillarR.castShadow = true;
    gateGroup.add(pillarR);

    // Sliding Door Gate
    const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 0.4), rustMetalMat);
    gateDoor.position.set(0, 2.5, 0);
    gateDoor.castShadow = true;
    gateGroup.add(gateDoor);

    // Red Security Warning Beacon
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5), redLightMat);
    beacon.position.set(-6, 6.6, 0);
    gateGroup.add(beacon);

    scene.add(gateGroup);
    g.gateMesh = gateGroup;
    g.obstacles.push(new THREE.Box3().setFromObject(gateDoor));

    // 4. Guard Watchtowers with Real Searchlights
    [-22, 22].forEach((xPos) => {
      const tower = new THREE.Group();
      tower.position.set(xPos, 0, -2);

      for (let lx = -1.8; lx <= 1.8; lx += 3.6) {
        for (let lz = -1.8; lz <= 1.8; lz += 3.6) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 12), darkSteelMat);
          leg.position.set(lx, 6, lz);
          leg.castShadow = true;
          tower.add(leg);
        }
      }

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3, 4.8), concreteMat);
      cabin.position.set(0, 13, 0);
      cabin.castShadow = true;
      tower.add(cabin);

      // Searchlight Spotlight
      const spotlight = new THREE.SpotLight('#ffffcc', 3.0, 50, Math.PI * 0.24, 0.35);
      spotlight.position.set(0, 11.5, 0);
      spotlight.target.position.set(xPos * 0.4, 0, 14);
      scene.add(spotlight.target);
      tower.add(spotlight);
      g.searchlights.push(spotlight);

      scene.add(tower);
      g.obstacles.push(new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(xPos, 6, -2),
        new THREE.Vector3(4.2, 14, 4.2)
      ));
    });

    // 5. Military Storage Warehouse & Cargo Crates
    const hangar = new THREE.Mesh(new THREE.BoxGeometry(16, 6.5, 14), rustMetalMat);
    hangar.position.set(-20, 3.25, -30);
    hangar.castShadow = true;
    hangar.receiveShadow = true;
    scene.add(hangar);
    g.obstacles.push(new THREE.Box3().setFromObject(hangar));

    // Scatter Explosive Fuel Barrels
    const barrelGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.8, 12);
    const barrelMat = new THREE.MeshStandardMaterial({ color: '#e63946', roughness: 0.35, metalness: 0.6 });

    const barrelPositions = [
      new THREE.Vector3(-7, 0.9, 2),
      new THREE.Vector3(8, 0.9, 1),
      new THREE.Vector3(-10, 0.9, -18),
      new THREE.Vector3(12, 0.9, -15),
      new THREE.Vector3(-5, 0.9, -35),
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

    const padSlab = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 0.8, 24), concreteMat);
    padSlab.receiveShadow = true;
    helipadGroup.add(padSlab);

    // Glowing Yellow "H" Marking
    const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 5), new THREE.MeshBasicMaterial({ color: '#ffea00' }));
    hBar1.position.set(-1.8, 0.45, 0);
    helipadGroup.add(hBar1);

    const hBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 5), new THREE.MeshBasicMaterial({ color: '#ffea00' }));
    hBar2.position.set(1.8, 0.45, 0);
    helipadGroup.add(hBar2);

    const hBarCross = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 0.8), new THREE.MeshBasicMaterial({ color: '#ffea00' }));
    hBarCross.position.set(0, 0.45, 0);
    helipadGroup.add(hBarCross);

    // Pulsing Green Extraction Beacon Light
    const beaconLight = new THREE.PointLight('#00ff66', 4.0, 35);
    beaconLight.position.set(0, 4, 0);
    helipadGroup.add(beaconLight);

    scene.add(helipadGroup);
    g.extractionMesh = helipadGroup;
  };

  // ==========================================
  // THIRD-PERSON PLAYER CHARACTER RIG
  // ==========================================
  const buildPlayerCharacter = (scene: THREE.Scene, g: any) => {
    const playerGroup = new THREE.Group();
    playerGroup.position.copy(g.player.position);

    const armorMat = new THREE.MeshStandardMaterial({ color: '#1a222c', roughness: 0.55 });
    const visorMat = new THREE.MeshStandardMaterial({ color: '#00f0ff', emissive: '#00b4d8', roughness: 0.2 });
    const weaponMat = new THREE.MeshStandardMaterial({ color: '#090c0f', roughness: 0.3, metalness: 0.85 });

    // Torso (Armor Vest)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.6), armorMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    playerGroup.add(torso);
    g.player.bodyMesh = torso;

    // Tactical Backpack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.8, 0.35), new THREE.MeshStandardMaterial({ color: '#2d3748' }));
    pack.position.set(0, 1.4, -0.4);
    playerGroup.add(pack);

    // Head with Tactical Helmet & Double Visor
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), armorMat);
    head.position.y = 2.15;
    head.castShadow = true;
    playerGroup.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.2), visorMat);
    visor.position.set(0, 2.18, 0.25);
    playerGroup.add(visor);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35);
    const legL = new THREE.Mesh(legGeo, armorMat);
    legL.position.set(-0.25, 0.5, 0);
    legL.castShadow = true;
    playerGroup.add(legL);

    const legR = new THREE.Mesh(legGeo, armorMat);
    legR.position.set(0.25, 0.5, 0);
    legR.castShadow = true;
    playerGroup.add(legR);

    // Tactical Assault Rifle
    const gunGroup = new THREE.Group();
    gunGroup.position.set(0.45, 1.25, 0.4);

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.9), weaponMat);
    gunGroup.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6), weaponMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.6);
    gunGroup.add(barrel);

    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.25), darkSteelMat());
    optic.position.set(0, 0.15, 0);
    gunGroup.add(optic);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.18), darkSteelMat());
    mag.position.set(0, -0.2, 0.1);
    gunGroup.add(mag);

    // Muzzle Flash Point Light
    const muzzleLight = new THREE.PointLight('#ffe066', 0, 8);
    muzzleLight.position.set(0, 0.05, 0.95);
    gunGroup.add(muzzleLight);

    playerGroup.add(gunGroup);
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
      p.walkCycle += dt * (g.keys.shift ? 14 : 9);
      if (Math.sin(p.walkCycle) > 0.95 && g.lastStepTime + 0.28 < g.elapsedTime) {
        gameSounds.playFootstep();
        g.lastStepTime = g.elapsedTime;
      }
      if (p.bodyMesh) {
        p.bodyMesh.position.y = 1.35 + Math.sin(p.walkCycle * 2) * 0.06;
      }
    }

    const camDist = g.mouseLook.isAiming ? 1.8 : 3.8;
    const camHeight = g.mouseLook.isAiming ? 1.6 : 2.1;
    const shoulderOffset = g.mouseLook.isAiming ? 0.65 : 0.85;

    const camX = p.position.x + Math.sin(g.mouseLook.yaw) * camDist + Math.cos(g.mouseLook.yaw) * shoulderOffset;
    const camZ = p.position.z + Math.cos(g.mouseLook.yaw) * camDist - Math.sin(g.mouseLook.yaw) * shoulderOffset;
    const camY = p.position.y + camHeight + Math.sin(g.mouseLook.pitch) * 2.5;

    g.currentCamPos.lerp(new THREE.Vector3(camX, camY, camZ), 0.2);
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
  // COMBAT & WEAPON FIRING SYSTEM
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

    // Muzzle Flash
    if (p.muzzleLight) {
      p.muzzleLight.intensity = 5.0;
      setTimeout(() => {
        if (p.muzzleLight) p.muzzleLight.intensity = 0;
      }, 50);
    }

    // Ejecting golden brass casing particle
    spawnBulletCasing(p.position.clone().add(new THREE.Vector3(0, 1.3, 0)), g);

    // Weapon Recoil Kick
    g.mouseLook.pitch += 0.02;

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
                    setGraphicsQuality(next);
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
