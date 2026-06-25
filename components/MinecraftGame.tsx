'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Block type IDs
const AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, WOOD = 4,
  LEAVES = 5, SAND = 6, PLANKS = 7, GLASS = 8, BEDROCK = 9;

const HOTBAR = [GRASS, DIRT, STONE, WOOD, LEAVES, SAND, PLANKS, GLASS, BEDROCK];
const BLOCK_NAMES = ['', 'Grass', 'Dirt', 'Stone', 'Wood', 'Leaves', 'Sand', 'Planks', 'Glass', 'Bedrock'];

// Colors: [top, side, bottom]
const BLOCK_COLORS: Record<number, [number, number, number]> = {
  [GRASS]:   [0x5d9e3a, 0x7a8a4e, 0x8b5a2b],
  [DIRT]:    [0x8b5a2b, 0x8b5a2b, 0x8b5a2b],
  [STONE]:   [0x808080, 0x808080, 0x808080],
  [WOOD]:    [0x6b4e23, 0x8b6914, 0x6b4e23],
  [LEAVES]:  [0x2d7a1f, 0x2d7a1f, 0x2d7a1f],
  [SAND]:    [0xe8c87a, 0xe8c87a, 0xe8c87a],
  [PLANKS]:  [0xc8a55a, 0xc8a55a, 0xc8a55a],
  [GLASS]:   [0x9fd8e8, 0x9fd8e8, 0x9fd8e8],
  [BEDROCK]: [0x444444, 0x444444, 0x444444],
};

const TRANSPARENT = new Set([GLASS, LEAVES]);

const W = 64, D = 64, H = 32;
type World = Uint8Array; // [x + z*W + y*W*D]

function idx(x: number, z: number, y: number) { return x + z * W + y * W * D; }

function getBlock(world: World, x: number, z: number, y: number): number {
  if (x < 0 || x >= W || z < 0 || z >= D || y < 0 || y >= H) return y < 0 ? STONE : AIR;
  return world[idx(x, z, y)];
}
function setBlock(world: World, x: number, z: number, y: number, type: number) {
  if (x < 0 || x >= W || z < 0 || z >= D || y < 0 || y >= H) return;
  world[idx(x, z, y)] = type;
}

// Simple noise
function noise(x: number, z: number): number {
  const s1 = Math.sin(x * 0.13 + z * 0.07) * 43758.5453;
  const s2 = Math.sin(x * 0.07 - z * 0.11) * 23421.631;
  const s3 = Math.sin(x * 0.19 + z * 0.23) * 17853.2;
  return (Math.sin(s1) + Math.sin(s2) + Math.sin(s3)) / 3;
}
function terrainHeight(x: number, z: number): number {
  const n = noise(x, z) * 0.5 + 0.5;
  const n2 = noise(x * 2, z * 2) * 0.5 + 0.5;
  return Math.floor(6 + n * 6 + n2 * 3);
}

function generateWorld(): World {
  const world = new Uint8Array(W * D * H);

  for (let x = 0; x < W; x++) {
    for (let z = 0; z < D; z++) {
      const top = terrainHeight(x, z);
      setBlock(world, x, z, 0, BEDROCK);
      for (let y = 1; y < top - 2; y++) setBlock(world, x, z, y, STONE);
      for (let y = Math.max(1, top - 2); y < top; y++) setBlock(world, x, z, y, DIRT);
      if (top < H) setBlock(world, x, z, top, GRASS);
    }
  }

  // Trees
  for (let t = 0; t < 40; t++) {
    const tx = 5 + Math.floor(Math.random() * (W - 10));
    const tz = 5 + Math.floor(Math.random() * (D - 10));
    const ground = terrainHeight(tx, tz) + 1;
    const treeH = 4 + Math.floor(Math.random() * 3);
    for (let y = ground; y < ground + treeH && y < H; y++) setBlock(world, tx, tz, y, WOOD);
    for (let lx = -2; lx <= 2; lx++)
      for (let lz = -2; lz <= 2; lz++)
        for (let ly = treeH - 2; ly <= treeH; ly++)
          if (lx !== 0 || lz !== 0)
            if (ground + ly < H) setBlock(world, tx + lx, tz + lz, ground + ly, LEAVES);
  }

  return world;
}

// Build merged geometry for all visible blocks
function buildGeometry(world: World): Map<number, THREE.BufferGeometry> {
  const faceNormals = [
    [0, 1, 0], [0, -1, 0], [-1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1]
  ];
  const faceOffsets = [
    [0, 1, 0], [0, -1, 0], [-1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1]
  ];
  // Vertices for each face of a unit cube at origin
  const faceVerts = [
    // top (+y)
    [[0,1,0],[1,1,0],[1,1,1],[0,1,1]],
    // bottom (-y)
    [[0,0,1],[1,0,1],[1,0,0],[0,0,0]],
    // left (-x)
    [[0,0,0],[0,0,1],[0,1,1],[0,1,0]],
    // right (+x)
    [[1,0,1],[1,0,0],[1,1,0],[1,1,1]],
    // back (-z)
    [[1,0,0],[0,0,0],[0,1,0],[1,1,0]],
    // front (+z)
    [[0,0,1],[1,0,1],[1,1,1],[0,1,1]],
  ];

  const positions: Map<number, number[]> = new Map();
  const colors: Map<number, number[]> = new Map();
  const indices: Map<number, number[]> = new Map();
  const counts: Map<number, number> = new Map();

  for (let blockType = 1; blockType <= 9; blockType++) {
    positions.set(blockType, []);
    colors.set(blockType, []);
    indices.set(blockType, []);
    counts.set(blockType, 0);
  }

  for (let x = 0; x < W; x++) {
    for (let z = 0; z < D; z++) {
      for (let y = 0; y < H; y++) {
        const b = getBlock(world, x, z, y);
        if (b === AIR) continue;

        const [tr, tg, tb] = decodeColor(BLOCK_COLORS[b][1]);
        const [topR, topG, topB] = decodeColor(BLOCK_COLORS[b][0]);
        const [botR, botG, botB] = decodeColor(BLOCK_COLORS[b][2]);

        const pos = positions.get(b)!;
        const col = colors.get(b)!;
        const ind = indices.get(b)!;

        for (let f = 0; f < 6; f++) {
          const [nx, nz, ny] = faceNormals[f]; // note: my normals are [x,y,z] but stored as [x,z,y]
          const [ox, oz, oy] = faceOffsets[f];
          const nb = getBlock(world, x + ox, z + oz, y + oy);
          if (nb !== AIR && !TRANSPARENT.has(nb)) continue;

          const verts = faceVerts[f];
          const base = counts.get(b)!;
          let r = tr, g = tg, bCh = tb;
          if (f === 0) { r = topR; g = topG; bCh = topB; }
          else if (f === 1) { r = botR; g = botG; bCh = botB; }
          // darken side faces slightly
          if (f >= 2) { r *= 0.8; g *= 0.8; bCh *= 0.8; }

          for (const v of verts) {
            pos.push(x + v[0], y + v[1], z + v[2]);
            col.push(r, g, bCh);
          }
          ind.push(base, base+1, base+2, base, base+2, base+3);
          counts.set(b, base + 4);
        }
      }
    }
  }

  const geos = new Map<number, THREE.BufferGeometry>();
  for (let blockType = 1; blockType <= 9; blockType++) {
    const pos = positions.get(blockType)!;
    if (pos.length === 0) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors.get(blockType)!, 3));
    geo.setIndex(indices.get(blockType)!);
    geo.computeVertexNormals();
    geos.set(blockType, geo);
  }
  return geos;
}

function decodeColor(hex: number): [number, number, number] {
  return [((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255];
}

export default function MinecraftGame() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hotbarSlot, setHotbarSlot] = useState(0);
  const [blockName, setBlockName] = useState('Grass');
  const [locked, setLocked] = useState(false);
  const stateRef = useRef({
    hotbarSlot: 0,
    world: null as World | null,
    worldMesh: null as THREE.Mesh | null,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    keys: {} as Record<string, boolean>,
    velocity: new THREE.Vector3(),
    onGround: false,
    yaw: 0,
    pitch: 0,
    highlightMesh: null as THREE.Mesh | null,
    highlightPos: null as THREE.Vector3 | null,
    highlightFace: null as THREE.Vector3 | null,
    meshes: new Map<number, THREE.Mesh>(),
    needsRebuild: false,
  });

  useEffect(() => {
    const s = stateRef.current;
    const mount = mountRef.current!;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);
    s.renderer = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 30, 80);
    s.scene = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 200);
    s.camera = camera;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(30, 60, 20);
    scene.add(sun);

    // Generate world
    const world = generateWorld();
    s.world = world;

    // Build and add meshes
    rebuildMeshes(s, scene);

    // Highlight box
    const hlGeo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    const hlMesh = new THREE.Mesh(hlGeo, hlMat);
    hlMesh.visible = false;
    scene.add(hlMesh);
    s.highlightMesh = hlMesh;

    // Place camera above spawn
    const spawnX = W / 2, spawnZ = D / 2;
    const spawnY = terrainHeight(spawnX, spawnZ) + 2;
    camera.position.set(spawnX + 0.5, spawnY, spawnZ + 0.5);

    // Pointer lock
    const canvas = renderer.domElement;
    const lockHandler = () => {
      document.pointerLockElement === canvas ? setLocked(true) : setLocked(false);
    };
    document.addEventListener('pointerlockchange', lockHandler);
    canvas.addEventListener('click', () => canvas.requestPointerLock());

    // Mouse look
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      s.yaw -= e.movementX * 0.002;
      s.pitch -= e.movementY * 0.002;
      s.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, s.pitch));
    };
    document.addEventListener('mousemove', onMouseMove);

    // Block interaction
    const onMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      if (!s.highlightPos || !s.world) return;
      const { x, y, z } = s.highlightPos;
      if (e.button === 0) {
        // Break
        const b = getBlock(s.world, x, z, y);
        if (b !== BEDROCK) {
          setBlock(s.world, x, z, y, AIR);
          s.needsRebuild = true;
        }
      } else if (e.button === 2 && s.highlightFace) {
        // Place
        const px = x + s.highlightFace.x;
        const py = y + s.highlightFace.y;
        const pz = z + s.highlightFace.z;
        const cam = s.camera!;
        const cx = Math.floor(cam.position.x), cy = Math.floor(cam.position.y - 0.7), cz = Math.floor(cam.position.z);
        if (!(px === cx && py === cy && pz === cz) &&
            !(px === cx && py === cy + 1 && pz === cz)) {
          setBlock(s.world, px, pz, py, HOTBAR[s.hotbarSlot]);
          s.needsRebuild = true;
        }
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    const noCtx = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', noCtx);

    // Keys
    const onKeyDown = (e: KeyboardEvent) => {
      s.keys[e.code] = true;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        s.hotbarSlot = num - 1;
        setHotbarSlot(num - 1);
        setBlockName(BLOCK_NAMES[HOTBAR[num - 1]]);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { s.keys[e.code] = false; };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Resize
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Animation loop
    const clock = new THREE.Clock();
    let frameId: number;
    const loop = () => {
      frameId = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.1);

      // Rebuild if needed
      if (s.needsRebuild) {
        s.needsRebuild = false;
        rebuildMeshes(s, scene);
      }

      // Camera rotation
      camera.rotation.order = 'YXZ';
      camera.rotation.y = s.yaw;
      camera.rotation.x = s.pitch;

      // Movement
      const speed = s.keys['ShiftLeft'] ? 8 : 4.5;
      const forward = new THREE.Vector3(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
      const right = new THREE.Vector3(Math.cos(s.yaw), 0, -Math.sin(s.yaw));
      const move = new THREE.Vector3();
      if (s.keys['KeyW'] || s.keys['ArrowUp']) move.add(forward);
      if (s.keys['KeyS'] || s.keys['ArrowDown']) move.sub(forward);
      if (s.keys['KeyA'] || s.keys['ArrowLeft']) move.sub(right);
      if (s.keys['KeyD'] || s.keys['ArrowRight']) move.add(right);
      if (move.length() > 0) move.normalize().multiplyScalar(speed);
      s.velocity.x = move.x;
      s.velocity.z = move.z;

      // Gravity
      s.velocity.y -= 22 * dt;
      if (s.keys['Space'] && s.onGround) s.velocity.y = 8;

      // Collide & move
      moveAndCollide(s, dt);

      // Raycast for highlight
      rayCast(s);

      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener('pointerlockchange', lockHandler);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('contextmenu', noCtx);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mount.contains(canvas)) mount.removeChild(canvas);
    };
  }, []);

  function rebuildMeshes(s: typeof stateRef.current, scene: THREE.Scene) {
    // Remove old meshes
    s.meshes.forEach(m => scene.remove(m));
    s.meshes.clear();

    const geos = buildGeometry(s.world!);
    geos.forEach((geo, blockType) => {
      const transparent = TRANSPARENT.has(blockType);
      const mat = new THREE.MeshLambertMaterial({
        vertexColors: true,
        transparent,
        opacity: blockType === GLASS ? 0.5 : 0.85,
        side: transparent ? THREE.DoubleSide : THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      s.meshes.set(blockType, mesh);
    });
  }

  function moveAndCollide(s: typeof stateRef.current, dt: number) {
    const cam = s.camera!;
    const world = s.world!;
    const PLAYER_H = 1.8, PLAYER_R = 0.3;

    const next = cam.position.clone().addScaledVector(s.velocity, dt);

    // Y collision
    const feet = next.y - PLAYER_H;
    const head = next.y + 0.1;
    const bx = Math.floor(cam.position.x);
    const bz = Math.floor(cam.position.z);

    if (s.velocity.y <= 0) {
      const fy = Math.floor(feet);
      if (getBlock(world, bx, bz, fy) !== AIR) {
        next.y = fy + 1 + PLAYER_H;
        s.velocity.y = 0;
        s.onGround = true;
      } else {
        s.onGround = false;
      }
    } else {
      s.onGround = false;
      const hy = Math.floor(head);
      if (getBlock(world, bx, bz, hy) !== AIR) {
        next.y = hy - 0.1;
        s.velocity.y = 0;
      }
    }
    // Clamp y
    next.y = Math.max(PLAYER_H + 0.01, Math.min(H - 0.1, next.y));

    // X collision
    const playerY = Math.floor(next.y - PLAYER_H / 2);
    const playerY2 = Math.floor(next.y - 0.1);
    const testX = (dx: number) => {
      const bxn = Math.floor(next.x + dx);
      return getBlock(world, bxn, bz, playerY) !== AIR || getBlock(world, bxn, bz, playerY2) !== AIR;
    };
    if (s.velocity.x > 0 && testX(PLAYER_R)) { next.x = Math.floor(next.x) + 1 - PLAYER_R - 0.001; s.velocity.x = 0; }
    if (s.velocity.x < 0 && testX(-PLAYER_R)) { next.x = Math.floor(next.x) + PLAYER_R + 0.001; s.velocity.x = 0; }

    // Z collision
    const testZ = (dz: number) => {
      const bzn = Math.floor(next.z + dz);
      return getBlock(world, bx, bzn, playerY) !== AIR || getBlock(world, bx, bzn, playerY2) !== AIR;
    };
    if (s.velocity.z > 0 && testZ(PLAYER_R)) { next.z = Math.floor(next.z) + 1 - PLAYER_R - 0.001; s.velocity.z = 0; }
    if (s.velocity.z < 0 && testZ(-PLAYER_R)) { next.z = Math.floor(next.z) + PLAYER_R + 0.001; s.velocity.z = 0; }

    cam.position.copy(next);
  }

  function rayCast(s: typeof stateRef.current) {
    const cam = s.camera!;
    const world = s.world!;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const pos = cam.position.clone();
    const MAX = 6;
    const STEP = 0.05;

    s.highlightPos = null;
    s.highlightFace = null;

    let prev = pos.clone();
    for (let t = 0; t < MAX; t += STEP) {
      const cur = pos.clone().addScaledVector(dir, t);
      const bx = Math.floor(cur.x), by = Math.floor(cur.y), bz = Math.floor(cur.z);
      if (getBlock(world, bx, bz, by) !== AIR) {
        s.highlightPos = new THREE.Vector3(bx, by, bz);
        const pbx = Math.floor(prev.x), pby = Math.floor(prev.y), pbz = Math.floor(prev.z);
        s.highlightFace = new THREE.Vector3(pbx - bx, pby - by, pbz - bz);
        if (s.highlightMesh) {
          s.highlightMesh.position.set(bx + 0.5, by + 0.5, bz + 0.5);
          s.highlightMesh.visible = true;
        }
        return;
      }
      prev = cur;
    }
    if (s.highlightMesh) s.highlightMesh.visible = false;
  }

  const handleScroll = (e: React.WheelEvent) => {
    const s = stateRef.current;
    const next = (s.hotbarSlot + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
    s.hotbarSlot = next;
    setHotbarSlot(next);
    setBlockName(BLOCK_NAMES[HOTBAR[next]]);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', position: 'relative' }} onWheel={handleScroll}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Crosshair */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
        <div style={{ width: 20, height: 2, background: 'white', opacity: 0.8, position: 'absolute', top: 9, left: 0 }} />
        <div style={{ width: 2, height: 20, background: 'white', opacity: 0.8, position: 'absolute', top: 0, left: 9 }} />
      </div>

      {/* Click to play overlay */}
      {!locked && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', color: 'white' }}>
          <div style={{ fontSize: 48, fontFamily: 'monospace', fontWeight: 'bold', marginBottom: 16, textShadow: '3px 3px 0 #000, -1px -1px 0 #555' }}>MINECRAFT</div>
          <div style={{ fontSize: 18, fontFamily: 'monospace', opacity: 0.9 }}>Click to Play</div>
          <div style={{ fontSize: 13, fontFamily: 'monospace', opacity: 0.6, marginTop: 24, textAlign: 'center', lineHeight: 1.8 }}>
            WASD — Move &nbsp;|&nbsp; Space — Jump &nbsp;|&nbsp; Shift — Sprint<br />
            Left Click — Break &nbsp;|&nbsp; Right Click — Place<br />
            1-9 or Scroll — Select Block &nbsp;|&nbsp; Esc — Release Mouse
          </div>
        </div>
      )}

      {/* Hotbar */}
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4, pointerEvents: 'none' }}>
        {HOTBAR.map((blockType, i) => {
          const [cr, cg, cb] = decodeColor(BLOCK_COLORS[blockType][0]);
          const color = `rgb(${Math.round(cr*255)},${Math.round(cg*255)},${Math.round(cb*255)})`;
          return (
            <div key={i} style={{
              width: 50, height: 50,
              background: color,
              border: i === hotbarSlot ? '3px solid white' : '2px solid rgba(255,255,255,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: 'white', fontFamily: 'monospace', fontWeight: 'bold',
              textShadow: '1px 1px 0 #000',
              boxShadow: i === hotbarSlot ? '0 0 8px rgba(255,255,255,0.6)' : 'none',
            }}>
              {i + 1}
            </div>
          );
        })}
      </div>

      {/* Block name */}
      {locked && (
        <div style={{ position: 'absolute', bottom: 84, left: '50%', transform: 'translateX(-50%)', color: 'white', fontFamily: 'monospace', fontSize: 14, textShadow: '1px 1px 2px #000', opacity: 0.8 }}>
          {blockName}
        </div>
      )}

      {/* Coordinates */}
      {locked && (
        <div style={{ position: 'absolute', top: 12, left: 12, color: 'white', fontFamily: 'monospace', fontSize: 12, textShadow: '1px 1px 1px #000', opacity: 0.75, lineHeight: 1.6 }}>
          F3-debug<br />
          Minecraft Clone
        </div>
      )}
    </div>
  );
}
