import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import type { HumanRig } from '../screen/shadow_strike';

const SOLDIER_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/Soldier.glb';
const HDR_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/equirectangular/venice_sunset_1k.hdr';

let cachedSoldierGltf: { scene: THREE.Group; animations: THREE.AnimationClip[] } | null = null;
let soldierPromise: Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> | null = null;
let cachedEnvTexture: THREE.Texture | null = null;
let envPromise: Promise<THREE.Texture | null> | null = null;

export async function loadSoldierGLTF(): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  if (cachedSoldierGltf) return cachedSoldierGltf;
  if (soldierPromise) return soldierPromise;
  soldierPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      SOLDIER_URL,
      (gltf) => {
        const scene = gltf.scene as THREE.Group;
        scene.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat && 'roughness' in mat) {
              mat.roughness = Math.max(0.4, mat.roughness ?? 0.7);
              mat.metalness = Math.min(0.15, mat.metalness ?? 0.05);
            }
          }
        });
        cachedSoldierGltf = { scene, animations: gltf.animations };
        resolve(cachedSoldierGltf);
      },
      undefined,
      (err) => {
        soldierPromise = null;
        reject(err);
      }
    );
  });
  return soldierPromise;
}

export async function loadHDREnvironment(renderer: THREE.WebGLRenderer): Promise<THREE.Texture | null> {
  if (cachedEnvTexture) return cachedEnvTexture;
  if (envPromise) return envPromise;
  envPromise = new Promise((resolve) => {
    const loader = new RGBELoader();
    loader.load(
      HDR_URL,
      (texture) => {
        try {
          const pmrem = new THREE.PMREMGenerator(renderer);
          pmrem.compileEquirectangularShader();
          const envMap = pmrem.fromEquirectangular(texture).texture;
          texture.dispose();
          pmrem.dispose();
          cachedEnvTexture = envMap;
          resolve(envMap);
        } catch (_) {
          resolve(null);
        }
      },
      undefined,
      () => {
        envPromise = null;
        resolve(null);
      }
    );
  });
  return envPromise;
}

// Map Soldier.glb's Mixamo bones to our HumanRig interface.
export function buildGLTFSoldierRig(
  gltfScene: THREE.Group,
  animations: THREE.AnimationClip[]
): HumanRig & { mixer: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction> } {
  const root = new THREE.Group();
  const clone = gltfScene.clone(true);
  // Soldier.glb is authored at real human scale (~1.7m). No downscaling needed.
  clone.scale.setScalar(1);
  clone.rotation.y = Math.PI;
  root.add(clone);

  const find = (name: string) => root.getObjectByName(name) as THREE.Object3D | undefined;
  const hips = find('mixamorigHips') || find('Hips');
  const spine = find('mixamorigSpine') || find('Spine');
  const head = find('mixamorigHead') || find('Head');
  const armL = find('mixamorigLeftArm') || find('LeftArm');
  const armR = find('mixamorigRightArm') || find('RightArm');
  const handR = find('mixamorigRightHand') || find('RightHand');
  const legL = find('mixamorigLeftUpLeg') || find('LeftUpLeg');
  const legR = find('mixamorigRightUpLeg') || find('RightUpLeg');

  const torsoGroup = (spine as THREE.Group) || (hips as THREE.Group) || new THREE.Group();
  const headGroup = (head as THREE.Group) || new THREE.Group();
  const armLGroup = (armL as THREE.Group) || new THREE.Group();
  const armRGroup = (armR as THREE.Group) || new THREE.Group();
  const handRGroup = (handR as THREE.Group) || new THREE.Group();
  const legLGroup = (legL as THREE.Group) || new THREE.Group();
  const legRGroup = (legR as THREE.Group) || new THREE.Group();

  const weaponAnchor = new THREE.Group();
  weaponAnchor.position.set(0, -0.05, 0.15);
  handRGroup.add(weaponAnchor);

  const mixer = new THREE.AnimationMixer(clone);
  const actions: Record<string, THREE.AnimationAction> = {};
  animations.forEach((clip) => {
    const key = clip.name.toLowerCase();
    const action = mixer.clipAction(clip);
    actions[key] = action;
  });

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
    currentWeaponMesh: null,
    mixer,
    actions,
  };
}

export function playSoldierAnim(
  rig: { mixer?: THREE.AnimationMixer; actions?: Record<string, THREE.AnimationAction> },
  name: 'idle' | 'walk' | 'run',
  crossFadeDuration = 0.25
) {
  if (!rig.mixer || !rig.actions) return;
  const target = rig.actions[name];
  if (!target || target.isRunning()) return;
  Object.values(rig.actions).forEach((a) => {
    if (a !== target && a.isRunning()) {
      a.fadeOut(crossFadeDuration);
    }
  });
  target.reset().fadeIn(crossFadeDuration).play();
}
