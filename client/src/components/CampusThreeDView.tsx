/**
 * KSYK Maps — In-browser 3D campus view.
 *
 * Renders the entire campus as extruded coloured rectangles in Three.js
 * (loaded from a CDN script tag so we don't need a Vite/npm install).
 * Two camera modes share the scene:
 *
 *   • Top-down  — orbit camera locked to a downward gaze; great for the
 *                 admin or a desk-bound visitor.
 *   • Walk      — first-person camera with WASD / arrow movement and
 *                 mouse-look; this is the "Street View" the user asked
 *                 for, except entirely native to our own rooms.
 *
 * The component is mounted from KSYKMapView when the user clicks the
 * "3D walkthrough" button. It pulls /api/rooms once and rebuilds the
 * scene; any subsequent room edits show up after the next mount.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight, ArrowUpDown, Box, Eye, KeyRound, Layers,
  Mountain, MoveVertical, RotateCw, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Room {
  id: string;
  buildingId?: string;
  roomNumber: string;
  name?: string;
  floor: number;
  type?: string;
  currentStatus?: string;
  mapPositionX?: number;
  mapPositionY?: number;
  width?: number;
  height?: number;
}

interface Building {
  id: string;
  name?: string;
  floors?: number | null;
  colorCode?: string | null;
  mapPositionX?: number;
  mapPositionY?: number;
  width?: number;
  height?: number;
}

/** Loads three.js once from a CDN. Returns a promise that resolves to
 *  whatever lives at window.THREE. */
let threeReady: Promise<any> | null = null;
function loadThree(): Promise<any> {
  if (threeReady) return threeReady;
  threeReady = new Promise((resolve, reject) => {
    const w = window as any;
    if (w.THREE) { resolve(w.THREE); return; }
    const tag = document.createElement("script");
    tag.src = "https://unpkg.com/three@0.160.0/build/three.min.js";
    tag.onload = () => {
      if (w.THREE) resolve(w.THREE);
      else reject(new Error("three.js loaded but window.THREE is empty"));
    };
    tag.onerror = () => reject(new Error("Failed to load three.js from CDN"));
    document.head.appendChild(tag);
  });
  return threeReady;
}

type CameraMode = "orbit" | "walk";

const TYPE_COLORS: Record<string, number> = {
  classroom:  0x3b82f6,
  office:     0x8b5cf6,
  lab:        0x06b6d4,
  library:    0xf59e0b,
  cafeteria:  0xef4444,
  auditorium: 0xec4899,
  gym:        0x10b981,
  hallway:    0x94a3b8,
  stairs:     0x64748b,
  wc:         0xa78bfa,
  other:      0x6b7280,
};

const STATUS_TINT: Record<string, number> = {
  available: 0x10b981,
  occupied:  0xef4444,
  busy:      0xf59e0b,
  closed:    0x6b7280,
  unknown:   0x94a3b8,
};

export default function CampusThreeDView({ onClose }: { onClose: () => void }) {
  const { darkMode } = useDarkMode();
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<CameraMode>("orbit");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ rooms: 0, fps: 0 });

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const r = await fetch("/api/rooms");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  // Buildings — used as translucent "shells" so a room reads as sitting
  // ON its parent building's footprint instead of floating alone.
  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["buildings"],
    queryFn: async () => {
      const r = await fetch("/api/buildings");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  // ── Three.js scene + animation loop ───────────────────────────────

  useEffect(() => {
    if (!canvasHostRef.current) return;
    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;

    (async () => {
      let THREE: any;
      try { THREE = await loadThree(); }
      catch (e) { setError((e as Error).message); return; }
      if (disposed) return;

      const host = canvasHostRef.current!;
      const w = host.clientWidth, h = host.clientHeight;

      const scene = new THREE.Scene();
      // Sky gradient texture — 2px tall canvas, top = sky, bottom = horizon.
      // Way nicer than a flat colour and costs nothing per frame.
      const skyCanvas = document.createElement("canvas");
      skyCanvas.width = 2; skyCanvas.height = 256;
      const skyCtx = skyCanvas.getContext("2d")!;
      const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
      if (darkMode) {
        skyGrad.addColorStop(0, "#0b1320");
        skyGrad.addColorStop(0.7, "#172033");
        skyGrad.addColorStop(1, "#1f2d4a");
      } else {
        skyGrad.addColorStop(0, "#7eb1ff");
        skyGrad.addColorStop(0.5, "#b4d2ff");
        skyGrad.addColorStop(1, "#e9f1ff");
      }
      skyCtx.fillStyle = skyGrad;
      skyCtx.fillRect(0, 0, 2, 256);
      const skyTex = new THREE.CanvasTexture(skyCanvas);
      skyTex.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = skyTex;
      scene.fog = new THREE.Fog(darkMode ? 0x172033 : 0xb4d2ff, 800, 3000);

      const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 5000);
      camera.position.set(0, 600, 600);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);

      // Lighting — soft hemisphere + a hard sun for shadows.
      scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.6));
      const sun = new THREE.DirectionalLight(0xffffff, 0.85);
      sun.position.set(400, 800, 200);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 1024;
      sun.shadow.mapSize.height = 1024;
      sun.shadow.camera.left = -800;
      sun.shadow.camera.right = 800;
      sun.shadow.camera.top = 800;
      sun.shadow.camera.bottom = -800;
      scene.add(sun);

      // Ground plane — large, slightly darker than the sky.
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(4000, 4000),
        new THREE.MeshStandardMaterial({
          color: darkMode ? 0x172033 : 0xcfd9e8,
          roughness: 0.95,
        }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Grid overlay
      const grid = new THREE.GridHelper(2000, 100,
        darkMode ? 0x223044 : 0xaab4c4,
        darkMode ? 0x1a2235 : 0xbcc5d4);
      (grid.material as any).opacity = 0.6;
      (grid.material as any).transparent = true;
      scene.add(grid);

      // ── Build a mesh per room ──────────────────────────────────
      const sceneCentre = (() => {
        const placed = rooms.filter((r) => r.mapPositionX != null && r.mapPositionY != null);
        if (placed.length === 0) return { x: 0, y: 0 };
        const xs = placed.map((r) => (r.mapPositionX ?? 0) + (r.width ?? 56) / 2);
        const ys = placed.map((r) => (r.mapPositionY ?? 0) + (r.height ?? 40) / 2);
        return {
          x: (Math.min(...xs) + Math.max(...xs)) / 2,
          y: (Math.min(...ys) + Math.max(...ys)) / 2,
        };
      })();

      // MazeMap-style short floors: 12 units per floor is enough to read
      // the stacked platforms without towering over rooms. Rooms
      // extrude an even shorter slab so they read as raised floor
      // plates inside the building, not skyscraper cubes.
      const FLOOR_HEIGHT = 12;       // metres per floor in the scene
      const ROOM_SLAB = 2.5;         // room extrusion above its floor
      const SCALE = 1;               // svg→world unit ratio

      // Pre-computed room rectangles for the minimap, in scene-centred coords.
      const miniRooms = rooms
        .filter((r) => r.mapPositionX != null && r.mapPositionY != null)
        .map((r) => ({
          x: (r.mapPositionX! + (r.width ?? 56) / 2) - sceneCentre.x,
          z: (r.mapPositionY! + (r.height ?? 40) / 2) - sceneCentre.y,
          w: r.width ?? 56,
          h: r.height ?? 40,
          color: TYPE_COLORS[r.type ?? "other"] ?? TYPE_COLORS.other,
          floor: r.floor ?? 1,
        }));

      // Pre-computed building rectangles for the minimap.
      const miniBuildings = buildings
        .filter((b) => b.mapPositionX != null && b.mapPositionY != null)
        .map((b) => ({
          x: (b.mapPositionX! + (b.width ?? 160) / 2) - sceneCentre.x,
          z: (b.mapPositionY! + (b.height ?? 120) / 2) - sceneCentre.y,
          w: b.width ?? 160,
          h: b.height ?? 120,
          color: b.colorCode ?? "#2563eb",
        }));
      // Compute mini bounds once — the minimap fits everything in.
      const miniBounds = (() => {
        if (miniRooms.length === 0) return { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
        return {
          minX: Math.min(...miniRooms.map(r => r.x - r.w / 2)),
          maxX: Math.max(...miniRooms.map(r => r.x + r.w / 2)),
          minZ: Math.min(...miniRooms.map(r => r.z - r.h / 2)),
          maxZ: Math.max(...miniRooms.map(r => r.z + r.h / 2)),
        };
      })();

      const roomGroup = new THREE.Group();
      scene.add(roomGroup);

      // ── Buildings first — translucent hollow shells with floor
      //    plates, so rooms visibly stack ON their building. Each
      //    building becomes a shell (walls only) + one floor plate per
      //    level + a roof cap, matching the MazeMap "glass box with
      //    stacked platforms" look.
      const buildingGroup = new THREE.Group();
      scene.add(buildingGroup);
      for (const b of buildings) {
        if (b.mapPositionX == null || b.mapPositionY == null) continue;
        const bw = (b.width ?? 160) * SCALE;
        const bd = (b.height ?? 120) * SCALE;
        const cx = (b.mapPositionX + (b.width ?? 160) / 2) - sceneCentre.x;
        const cz = (b.mapPositionY + (b.height ?? 120) / 2) - sceneCentre.y;
        const floors = Math.max(1, b.floors ?? 1);
        const totalHeight = floors * FLOOR_HEIGHT;
        const shellColor = new THREE.Color(b.colorCode ?? "#2563eb");

        // Hollow wall shell — Shape with a hole extruded up. This is
        // the "glass wall" that surrounds every floor.
        const outer = new THREE.Shape([
          new THREE.Vector2(-bw / 2, -bd / 2),
          new THREE.Vector2( bw / 2, -bd / 2),
          new THREE.Vector2( bw / 2,  bd / 2),
          new THREE.Vector2(-bw / 2,  bd / 2),
        ]);
        const wallThickness = 1.6;
        const holeW = Math.max(0, bw - wallThickness * 2);
        const holeD = Math.max(0, bd - wallThickness * 2);
        if (holeW > 0 && holeD > 0) {
          const hole = new THREE.Path([
            new THREE.Vector2(-holeW / 2, -holeD / 2),
            new THREE.Vector2( holeW / 2, -holeD / 2),
            new THREE.Vector2( holeW / 2,  holeD / 2),
            new THREE.Vector2(-holeW / 2,  holeD / 2),
          ]);
          outer.holes.push(hole);
        }
        const shellGeo = new THREE.ExtrudeGeometry(outer, {
          depth: totalHeight,
          bevelEnabled: false,
        });
        // ExtrudeGeometry extrudes along +Z; rotate so it stands up (+Y).
        shellGeo.rotateX(-Math.PI / 2);
        const shellMat = new THREE.MeshStandardMaterial({
          color: shellColor,
          roughness: 0.7,
          metalness: 0.05,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        });
        const shell = new THREE.Mesh(shellGeo, shellMat);
        shell.position.set(cx, 0, cz);
        shell.castShadow = false;
        shell.receiveShadow = true;
        buildingGroup.add(shell);

        // Floor plates — one thin slab per floor. Cream-colored so
        // they read as "the deck of this floor".
        for (let f = 0; f < floors; f++) {
          const plateGeo = new THREE.BoxGeometry(bw - 0.3, 0.4, bd - 0.3);
          const plateMat = new THREE.MeshStandardMaterial({
            color: darkMode ? 0x2a3448 : 0xe8edf5,
            roughness: 0.9,
            metalness: 0,
          });
          const plate = new THREE.Mesh(plateGeo, plateMat);
          plate.position.set(cx, f * FLOOR_HEIGHT, cz);
          plate.receiveShadow = true;
          buildingGroup.add(plate);
        }

        // Roof cap — colored plate matching the building tint at the
        // top of the shell so the building reads as enclosed.
        const roofGeo = new THREE.BoxGeometry(bw, 0.4, bd);
        const roofMat = new THREE.MeshStandardMaterial({
          color: shellColor,
          roughness: 0.6,
          metalness: 0.05,
          transparent: true,
          opacity: 0.45,
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(cx, totalHeight, cz);
        roof.receiveShadow = false;
        buildingGroup.add(roof);
      }

      for (const r of rooms) {
        if (r.mapPositionX == null || r.mapPositionY == null) continue;
        const w = (r.width ?? 56) * SCALE;
        const d = (r.height ?? 40) * SCALE;
        const floor = r.floor ?? 1;
        // Rooms sit as short "platforms" on the building's floor plate.
        // Hallways/stairs go even shorter so real rooms stand out.
        const tall = (r.type === "hallway" || r.type === "stairs") ? ROOM_SLAB * 0.5 : ROOM_SLAB;
        const baseColor = TYPE_COLORS[r.type ?? "other"] ?? TYPE_COLORS.other;
        const tint = STATUS_TINT[r.currentStatus ?? "unknown"] ?? STATUS_TINT.unknown;
        // 70% type colour mixed with 30% status colour so both are legible.
        const mixed = mixColor(baseColor, tint, 0.3);

        const geo = new THREE.BoxGeometry(w, tall, d);
        const mat = new THREE.MeshStandardMaterial({
          color: mixed,
          roughness: 0.55,
          metalness: 0.06,
        });
        const cube = new THREE.Mesh(geo, mat);
        cube.position.x = (r.mapPositionX + (r.width ?? 56) / 2) - sceneCentre.x;
        cube.position.z = (r.mapPositionY + (r.height ?? 40) / 2) - sceneCentre.y;
        // Sit ON the correct floor plate: base = floor plate top + half slab.
        cube.position.y = (floor - 1) * FLOOR_HEIGHT + 0.4 + tall / 2;
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.userData = { room: r };
        roomGroup.add(cube);

        // Edges so the rooms read as architecture, not blobs.
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: darkMode ? 0x0b1220 : 0x1f2937, transparent: true, opacity: 0.4 }),
        );
        edges.position.copy(cube.position);
        roomGroup.add(edges);

        // Room number floating above each cube — a tiny canvas turned into
        // a sprite. Keeps text crisp at every zoom and rotates to face the
        // camera for free.
        if (r.roomNumber) {
          const labelCanvas = document.createElement("canvas");
          labelCanvas.width = 256; labelCanvas.height = 96;
          const ctx = labelCanvas.getContext("2d")!;
          ctx.font = "bold 56px -apple-system, Segoe UI, Roboto, sans-serif";
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";
          // Pill background
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          const m = ctx.measureText(r.roomNumber);
          const pillW = m.width + 36;
          const pillH = 70;
          const pillX = (256 - pillW) / 2;
          ctx.beginPath();
          // @ts-ignore — roundRect is available in modern Canvas
          ctx.roundRect?.(pillX, (96 - pillH) / 2, pillW, pillH, 14);
          ctx.fill();
          ctx.fillStyle = "#0f172a";
          ctx.fillText(r.roomNumber, 128, 48);
          const tex = new THREE.CanvasTexture(labelCanvas);
          tex.minFilter = THREE.LinearFilter;
          const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
          const sprite = new THREE.Sprite(spriteMat);
          // Float the label a bit above the room slab so pitched views
          // still read it. Scale down proportionally to the new smaller
          // floor height so labels aren't oversized against short slabs.
          sprite.position.set(cube.position.x, cube.position.y + tall / 2 + 3, cube.position.z);
          sprite.scale.set(22, 8.25, 1);
          roomGroup.add(sprite);
        }
      }

      setStats((s) => ({ ...s, rooms: roomGroup.children.length / 2 }));

      // Collidable AABBs harvested from the room cubes so the walk camera
      // can't phase through walls. We expand each box by 6 world units so
      // the user keeps a comfortable buffer.
      const collidables: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }[] = [];
      roomGroup.traverse((o: any) => {
        if (o.isMesh && o.userData?.room) {
          const box = new THREE.Box3().setFromObject(o);
          collidables.push({
            minX: box.min.x - 6, maxX: box.max.x + 6,
            minY: box.min.y,     maxY: box.max.y,
            minZ: box.min.z - 6, maxZ: box.max.z + 6,
          });
        }
      });
      function blocked(nx: number, ny: number, nz: number): boolean {
        for (const b of collidables) {
          if (nx >= b.minX && nx <= b.maxX && ny >= b.minY && ny <= b.maxY && nz >= b.minZ && nz <= b.maxZ) {
            return true;
          }
        }
        return false;
      }

      // ── Cameras ──────────────────────────────────────────────
      // Orbit camera state — shorter world so start closer.
      let yaw = -Math.PI / 4, pitch = Math.PI / 3.2, dist = 450;
      // Walk camera state — eye height ≈ 1.7 in the shortened world
      // means "5 or 6 units above the floor plate" reads as human eye
      // level. Start just above the ground plane.
      const walkPos = new THREE.Vector3(0, 5, 120);
      const walkLook = { yaw: 0, pitch: 0 };
      const keys = new Set<string>();

      function updateCameraOrbit() {
        const x = dist * Math.cos(pitch) * Math.cos(yaw);
        const y = dist * Math.sin(pitch);
        const z = dist * Math.cos(pitch) * Math.sin(yaw);
        camera.position.set(x, y, z);
        camera.lookAt(0, 50, 0);
      }
      function updateCameraWalk() {
        camera.position.copy(walkPos);
        const cy = Math.cos(walkLook.yaw), sy = Math.sin(walkLook.yaw);
        const cp = Math.cos(walkLook.pitch), sp = Math.sin(walkLook.pitch);
        const target = new THREE.Vector3(
          walkPos.x + cy * cp,
          walkPos.y + sp,
          walkPos.z + sy * cp,
        );
        camera.lookAt(target);
      }
      updateCameraOrbit();

      // ── Input ─────────────────────────────────────────────────
      let dragging = false;
      let lastX = 0, lastY = 0;
      const cv = renderer.domElement;
      cv.style.cursor = "grab";

      cv.addEventListener("pointerdown", (e) => {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        cv.style.cursor = "grabbing";
        cv.setPointerCapture?.(e.pointerId);
      });
      cv.addEventListener("pointerup", () => { dragging = false; cv.style.cursor = "grab"; });
      cv.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        if (mode === "orbit") {
          yaw -= dx * 0.005;
          pitch = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, pitch + dy * 0.004));
        } else {
          walkLook.yaw += dx * 0.004;
          walkLook.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, walkLook.pitch - dy * 0.004));
        }
      });
      cv.addEventListener("wheel", (e) => {
        e.preventDefault();
        if (mode === "orbit") {
          dist = Math.max(40, Math.min(1400, dist * (1 + e.deltaY * 0.001)));
        }
      }, { passive: false });

      const onKey = (down: boolean) => (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        const k = e.key.toLowerCase();
        if (down) keys.add(k); else keys.delete(k);
      };
      const downH = onKey(true), upH = onKey(false);
      window.addEventListener("keydown", downH);
      window.addEventListener("keyup", upH);

      // ── Render loop ───────────────────────────────────────────
      let last = performance.now();
      let frames = 0;
      const tick = () => {
        if (disposed) return;
        raf = requestAnimationFrame(tick);
        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;
        frames++;
        if (frames % 30 === 0) setStats((s) => ({ ...s, fps: Math.round(1 / Math.max(0.001, dt)) }));

        // Minimap paint — always fresh, cheap enough per frame.
        const mm = minimapRef.current;
        if (mm) {
          const ctx = mm.getContext("2d");
          if (ctx) {
            const W = mm.width, H = mm.height;
            ctx.clearRect(0, 0, W, H);
            // Sky-ish background so it reads as a top-down blueprint
            ctx.fillStyle = darkMode ? "rgba(15,25,45,0.9)" : "rgba(240,246,255,0.95)";
            ctx.fillRect(0, 0, W, H);
            // Room boxes projected into the minimap
            const bw = miniBounds.maxX - miniBounds.minX;
            const bh = miniBounds.maxZ - miniBounds.minZ;
            const scale = Math.min((W - 8) / Math.max(1, bw), (H - 8) / Math.max(1, bh));
            const cx = W / 2, cy = H / 2;
            const bcx = (miniBounds.minX + miniBounds.maxX) / 2;
            const bcz = (miniBounds.minZ + miniBounds.maxZ) / 2;
            // Building outlines first — a soft dashed rectangle around
            // each footprint so the campus reads as clusters of
            // buildings, not just a floating grid of rooms.
            for (const bl of miniBuildings) {
              const px = cx + (bl.x - bcx) * scale;
              const py = cy + (bl.z - bcz) * scale;
              const pw = bl.w * scale;
              const ph = bl.h * scale;
              ctx.strokeStyle = bl.color;
              ctx.setLineDash([3, 2]);
              ctx.lineWidth = 1.5;
              ctx.globalAlpha = 0.75;
              ctx.strokeRect(px - pw / 2, py - ph / 2, pw, ph);
              ctx.setLineDash([]);
              ctx.globalAlpha = 1;
            }
            for (const r of miniRooms) {
              const px = cx + (r.x - bcx) * scale;
              const py = cy + (r.z - bcz) * scale;
              const pw = r.w * scale;
              const ph = r.h * scale;
              ctx.fillStyle = "#" + r.color.toString(16).padStart(6, "0");
              ctx.globalAlpha = 0.75;
              ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
              ctx.globalAlpha = 1;
              ctx.strokeStyle = darkMode ? "rgba(15,25,45,0.5)" : "rgba(255,255,255,0.7)";
              ctx.lineWidth = 0.5;
              ctx.strokeRect(px - pw / 2, py - ph / 2, pw, ph);
            }
            // Walker arrow (in walk mode) — position + heading
            if (mode === "walk") {
              const px = cx + (walkPos.x - bcx) * scale;
              const py = cy + (walkPos.z - bcz) * scale;
              ctx.save();
              ctx.translate(px, py);
              ctx.rotate(walkLook.yaw + Math.PI / 2);
              ctx.fillStyle = "#3b82f6";
              ctx.strokeStyle = "white";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(0, -8);
              ctx.lineTo(-5, 6);
              ctx.lineTo(5, 6);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            }
          }
        }

        if (mode === "orbit") updateCameraOrbit();
        else {
          // WASD / arrows movement, relative to walk yaw. Each axis is
          // committed independently so a wall blocking forward motion
          // doesn't also stop strafing — feels less stuck.
          // Walking speed tuned for the shorter (12 units/floor) scene
          // so getting between rooms feels natural rather than sprinting.
          const speed = 40 * dt * (keys.has("shift") ? 2.5 : 1);
          const cy = Math.cos(walkLook.yaw), sy = Math.sin(walkLook.yaw);
          let dx = 0, dz = 0;
          if (keys.has("w") || keys.has("arrowup"))    { dx += cy * speed; dz += sy * speed; }
          if (keys.has("s") || keys.has("arrowdown"))  { dx -= cy * speed; dz -= sy * speed; }
          if (keys.has("a") || keys.has("arrowleft"))  { dx += sy * speed; dz -= cy * speed; }
          if (keys.has("d") || keys.has("arrowright")) { dx -= sy * speed; dz += cy * speed; }
          // Try the X step alone, then the Z step alone — sliding along walls.
          if (dx !== 0 && !blocked(walkPos.x + dx, walkPos.y, walkPos.z)) walkPos.x += dx;
          if (dz !== 0 && !blocked(walkPos.x, walkPos.y, walkPos.z + dz)) walkPos.z += dz;
          if (keys.has(" ") || keys.has("e"))          { walkPos.y += speed * 0.6; }
          if (keys.has("q") || keys.has("control"))    { walkPos.y = Math.max(1.2, walkPos.y - speed * 0.6); }
          updateCameraWalk();
        }
        renderer.render(scene, camera);
      };
      tick();

      // ── Resize ────────────────────────────────────────────────
      const ro = new ResizeObserver(() => {
        const ww = host.clientWidth, hh = host.clientHeight;
        renderer.setSize(ww, hh);
        camera.aspect = ww / hh;
        camera.updateProjectionMatrix();
      });
      ro.observe(host);

      setReady(true);

      cleanup = () => {
        ro.disconnect();
        window.removeEventListener("keydown", downH);
        window.removeEventListener("keyup", upH);
        cancelAnimationFrame(raf);
        renderer.dispose();
        host.removeChild(renderer.domElement);
        scene.traverse((o: any) => {
          if (o.geometry) o.geometry.dispose?.();
          if (o.material) {
            const m = o.material;
            (Array.isArray(m) ? m : [m]).forEach((mm: any) => mm.dispose?.());
          }
        });
      };
    })();

    return () => { disposed = true; cleanup?.(); };
  }, [rooms, buildings, mode, darkMode]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-2 sm:p-6">
      <div className={cn(
        "relative w-full h-full rounded-xl overflow-hidden shadow-2xl border",
        darkMode ? "bg-gray-950 border-gray-800" : "bg-white border-gray-200",
      )}>
        {/* 3D canvas host */}
        <div ref={canvasHostRef} className="absolute inset-0" />

        {/* Top-left brand + close */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          <div className={cn(
            "px-3 py-1.5 rounded-lg shadow-md flex items-center gap-2 text-sm font-semibold",
            darkMode ? "bg-gray-900/90 text-gray-200" : "bg-white/95 text-gray-700",
          )}>
            <Box className="h-4 w-4 text-blue-600" />
            KSYK · 3D campus
            <span className="text-[10px] font-mono text-gray-400 ml-1">{stats.rooms} rooms · {stats.fps} fps</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close 3D view"
          className={cn(
            "absolute top-3 right-3 z-10 h-9 w-9 rounded-lg shadow-md inline-flex items-center justify-center transition-colors",
            darkMode ? "bg-gray-900/90 text-gray-300 hover:bg-gray-800" : "bg-white/95 text-gray-700 hover:bg-gray-100",
          )}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Minimap — top-right, below the close button. Always visible so
         *  users have a fixed reference point; the walker triangle only
         *  appears when in walk mode (in orbit the whole scene rotates). */}
        <div className={cn(
          "absolute top-16 right-3 z-10 p-1 rounded-lg shadow-lg backdrop-blur-md border",
          darkMode ? "bg-gray-900/90 border-gray-700" : "bg-white/95 border-gray-200",
        )}>
          <canvas
            ref={minimapRef}
            width={168}
            height={168}
            className="rounded-md block"
          />
          <p className={cn(
            "text-[9px] font-bold tracking-widest uppercase text-center mt-1",
            darkMode ? "text-gray-400" : "text-gray-500",
          )}>
            Campus minimap
          </p>
        </div>

        {/* Mode toggle (bottom centre) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1 rounded-xl shadow-lg backdrop-blur-md bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setMode("orbit")}
            className={cn(
              "h-9 px-4 text-sm font-semibold rounded-lg gap-1.5 inline-flex items-center transition-colors",
              mode === "orbit"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white",
            )}
          >
            <Mountain className="h-4 w-4" />
            Top-down / orbit
          </button>
          <button
            type="button"
            onClick={() => setMode("walk")}
            className={cn(
              "h-9 px-4 text-sm font-semibold rounded-lg gap-1.5 inline-flex items-center transition-colors",
              mode === "walk"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white",
            )}
          >
            <Eye className="h-4 w-4" />
            Street view (walk)
          </button>
        </div>

        {/* Help (bottom right) */}
        <div className="absolute bottom-3 right-3 z-10 max-w-[280px] p-3 rounded-xl shadow-lg backdrop-blur-md bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700 text-xs">
          <p className="font-bold text-[10px] tracking-[0.15em] text-gray-400 uppercase mb-1.5 flex items-center gap-1">
            <KeyRound className="h-3 w-3" /> Controls
          </p>
          {mode === "orbit" ? (
            <ul className="text-gray-700 dark:text-gray-300 space-y-0.5">
              <li className="flex items-center gap-1.5"><RotateCw className="h-3 w-3" /> Drag to orbit</li>
              <li className="flex items-center gap-1.5"><Layers className="h-3 w-3" /> Scroll to zoom</li>
              <li className="flex items-center gap-1.5 text-gray-400">Click <strong className="text-blue-600">Street view</strong> to walk inside</li>
            </ul>
          ) : (
            <ul className="text-gray-700 dark:text-gray-300 space-y-0.5">
              <li className="flex items-center gap-1.5"><ArrowLeftRight className="h-3 w-3" /> W / A / S / D · arrows → move</li>
              <li className="flex items-center gap-1.5"><ArrowUpDown className="h-3 w-3" /> Drag → look around</li>
              <li className="flex items-center gap-1.5"><MoveVertical className="h-3 w-3" /> Space / Ctrl → up / down</li>
              <li className="flex items-center gap-1.5 text-gray-400">Hold Shift → run</li>
            </ul>
          )}
        </div>

        {/* Error / loading overlay */}
        {(!ready && !error) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={cn(
              "text-sm font-semibold px-4 py-3 rounded-xl shadow-md",
              darkMode ? "bg-gray-900/90 text-gray-200" : "bg-white/95 text-gray-700",
            )}>
              Loading 3D scene…
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl p-4 max-w-md text-sm">
              <p className="font-bold text-red-700 dark:text-red-300 mb-1">3D failed to load</p>
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}
