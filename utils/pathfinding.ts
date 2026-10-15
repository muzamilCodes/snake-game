import * as THREE from 'three';

// Grid-based A* pathfinder over the Erangel battleground.
// Cell size 4m, world range roughly -100..100 → 50x50 grid.
const CELL = 4;
const HALF = 100;
const GRID = Math.floor((HALF * 2) / CELL); // 50

const toCell = (v: number) => Math.max(0, Math.min(GRID - 1, Math.floor((v + HALF) / CELL)));
const toWorld = (c: number) => c * CELL - HALF + CELL / 2;

export interface PathNode { x: number; z: number }

// Obstacles: buildings/rocks registered by the scene builder.
const obstacles: { x: number; z: number; r: number }[] = [];

export function registerObstacle(x: number, z: number, r: number) {
  obstacles.push({ x, z, r });
}

export function clearObstacles() {
  obstacles.length = 0;
}

function isBlocked(cx: number, cz: number): boolean {
  const wx = toWorld(cx);
  const wz = toWorld(cz);
  for (const o of obstacles) {
    const dx = wx - o.x;
    const dz = wz - o.z;
    if (dx * dx + dz * dz < o.r * o.r) return true;
  }
  return false;
}

// 8-directional A* with octile heuristic.
export function findPath(sx: number, sz: number, tx: number, tz: number): PathNode[] {
  const start = { x: toCell(sx), z: toCell(sz) };
  const goal = { x: toCell(tx), z: toCell(tz) };
  if (start.x === goal.x && start.z === goal.z) return [];

  const key = (x: number, z: number) => x * 1000 + z;
  const open: { x: number; z: number; g: number; f: number }[] = [{ ...start, g: 0, f: 0 }];
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>([[key(start.x, start.z), 0]]);
  const closed = new Set<number>();

  const h = (x: number, z: number) => {
    const dx = Math.abs(x - goal.x);
    const dz = Math.abs(z - goal.z);
    return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz);
  };

  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];

  let iter = 0;
  while (open.length > 0 && iter++ < 800) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    const ck = key(cur.x, cur.z);
    if (cur.x === goal.x && cur.z === goal.z) {
      const path: PathNode[] = [];
      let k = ck;
      while (k !== undefined) {
        const x = Math.floor(k / 1000);
        const z = k % 1000;
        path.unshift({ x: toWorld(x), z: toWorld(z) });
        k = cameFrom.get(k)!;
        if (k === undefined) break;
      }
      return path;
    }
    if (closed.has(ck)) continue;
    closed.add(ck);

    for (const [dx, dz] of dirs) {
      const nx = cur.x + dx;
      const nz = cur.z + dz;
      if (nx < 0 || nz < 0 || nx >= GRID || nz >= GRID) continue;
      if (isBlocked(nx, nz)) continue;
      const nk = key(nx, nz);
      if (closed.has(nk)) continue;
      const step = (dx !== 0 && dz !== 0) ? Math.SQRT2 : 1;
      const tentative = (gScore.get(ck) ?? Infinity) + step;
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, ck);
        gScore.set(nk, tentative);
        open.push({ x: nx, z: nz, g: tentative, f: tentative + h(nx, nz) });
      }
    }
  }
  return []; // no path found
}

// Line-of-sight: sample along the segment, blocked if any obstacle circle intersects.
export function hasLineOfSight(ax: number, az: number, bx: number, bz: number): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  const dist = Math.hypot(dx, dz);
  const steps = Math.min(40, Math.ceil(dist / 2));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = ax + dx * t;
    const pz = az + dz * t;
    for (const o of obstacles) {
      const ox = px - o.x;
      const oz = pz - o.z;
      if (ox * ox + oz * oz < o.r * o.r) return false;
    }
  }
  return true;
}

// Find nearest cover point away from a threat.
export function findCover(fromX: number, fromZ: number, threatX: number, threatZ: number): PathNode | null {
  let best: PathNode | null = null;
  let bestScore = Infinity;
  for (const o of obstacles) {
    const dx = o.x - fromX;
    const dz = o.z - fromZ;
    const distToObj = Math.hypot(dx, dz);
    if (distToObj > 25) continue;
    // Cover point is on the opposite side of the obstacle from the threat.
    const ox = o.x - threatX;
    const oz = o.z - threatZ;
    const ol = Math.hypot(ox, oz) || 1;
    const cx = o.x + (ox / ol) * (o.r + 1.5);
    const cz = o.z + (oz / ol) * (o.r + 1.5);
    if (hasLineOfSight(cx, cz, threatX, threatZ)) continue;
    const score = distToObj;
    if (score < bestScore) {
      bestScore = score;
      best = { x: cx, z: cz };
    }
  }
  return best;
}
