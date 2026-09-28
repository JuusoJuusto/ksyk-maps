/**
 * KSYK Maps — In-browser 3D campus view (MazeMap-inspired).
 *
 * Renders the campus as a set of soft, opaque building shells with
 * subtle floor plates and low-saturation room slabs. Two camera modes
 * share the scene:
 *
 *   • Orbit — top-down / orbit camera; entry point for browsing.
 *   • Walk  — first-person WASD camera for exploring interior corridors.
 *
 * Visual language:
 *   - Warm neutral ground + fog (no dashed grid)
 *   - Building walls at 65% opacity in the building's brand color
 *   - Cream floor plates, hairline separation between floors
 *   - Muted Apple-Maps-style room palette
 *   - Small room-number pills that fade out when the camera pulls back
 *   - Single subtle chrome family: same border, radius, shadow everywhere
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Eye, LocateFixed, Mountain, X } from "lucide-react";
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
  metadata?: { style?: Record<string, unknown> } | null;
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
  metadata?: { style?: Record<string, unknown> } | null;
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

/** Muted Apple-Maps / MazeMap-inspired palette. All values are lightly
 *  desaturated so no single room screams; the building shells do the
 *  heavy visual grouping. */
const TYPE_COLORS: Record<string, number> = {
  classroom:  0x6b8ac5,
  office:     0x8b7bb8,
  lab:        0x5eaab3,
  library:    0xc99c5b,
  cafeteria:  0xc47070,
  auditorium: 0xb76a90,
  gym:        0x5faa8a,
  hallway:    0xa8b0be,
  stairs:     0x7c8695,
  wc:         0x9c93c4,
  other:      0x94a3b8,
};

const STATUS_TINT: Record<string, number> = {
  available: 0x5faa8a,
  occupied:  0xc47070,
  busy:      0xc99c5b,
  closed:    0x7c8695,
  unknown:   0xa8b0be,
};

export default function CampusThreeDView({ onClose }: { onClose: () => void }) {
  const { darkMode } = useDarkMode();
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<CameraMode>("orbit");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
  // Store handles set by the render effect so we can reset the camera
  // from the top-right button without tearing the whole scene down.
  const resetRef = useRef<(() => void) | null>(null);

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const r = await fetch("/api/rooms");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["buildings"],
    queryFn: async () => {
      const r = await fetch("/api/buildings");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  // Auto-hide the mode hint after 4s each time the mode changes.
  useEffect(() => {
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, [mode]);

  // Memoised palette so the useEffect deps stay stable.
  const palette = useMemo(() => darkMode ? {
    ground:      0x101623,
    fog:         0x0f1420,
    plate:       0x1d2739,
    edge:        0x0b1220,
    ambient1:    0xe8ecf5,
    ambient2:    0x2a3448,
  } : {
    ground:      0xeef1f4,
    fog:         0xe4e8ef,
    plate:       0xf5f2ec,
    edge:        0xd6dbe4,
    ambient1:    0xffffff,
    ambient2:    0xd8dee9,
  }, [darkMode]);

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
      scene.background = new THREE.Color(palette.ground);
      scene.fog = new THREE.Fog(palette.fog, 400, 2200);

      const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 5000);
      camera.position.set(0, 550, 550);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);

      // Warm, even lighting — one soft hemisphere + a single sun casting
      // gentle shadows. No harsh contrast.
      scene.add(new THREE.HemisphereLight(palette.ambient1, palette.ambient2, 0.75));
      const sun = new THREE.DirectionalLight(0xffffff, 0.6);
      sun.position.set(300, 700, 250);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 1024;
      sun.shadow.mapSize.height = 1024;
      sun.shadow.camera.left = -800;
      sun.shadow.camera.right = 800;
      sun.shadow.camera.top = 800;
      sun.shadow.camera.bottom = -800;
      sun.shadow.bias = -0.0005;
      scene.add(sun);

      // Ground plane — matches the sky/fog so distant edges dissolve.
      // No grid helper: the buildings themselves supply the reference.
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(4000, 4000),
        new THREE.MeshStandardMaterial({
          color: palette.ground,
          roughness: 0.98,
          metalness: 0,
        }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

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

      const FLOOR_HEIGHT = 12;
      const ROOM_SLAB = 2.5;
      const SCALE = 1;

      // Pre-computed room / building rectangles for the minimap.
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
      const miniBuildings = buildings
        .filter((b) => b.mapPositionX != null && b.mapPositionY != null)
        .map((b) => ({
          x: (b.mapPositionX! + (b.width ?? 160) / 2) - sceneCentre.x,
          z: (b.mapPositionY! + (b.height ?? 120) / 2) - sceneCentre.y,
          w: b.width ?? 160,
          h: b.height ?? 120,
          color: b.colorCode ?? "#6b8ac5",
        }));
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

      // Track disposables so cleanup can reach every resource.
      const disposables: any[] = [];
      const dispose = (obj: any) => { if (obj) disposables.push(obj); };

      // ── Buildings first — opaque low-saturation shells with floor
      //    plates and a colored cap. Matches the MazeMap "block of
      //    stacked platforms" look at a very quiet volume.
      const buildingGroup = new THREE.Group();
      scene.add(buildingGroup);
      for (const b of buildings) {
        if (b.mapPositionX == null || b.mapPositionY == null) continue;
        const bw = (b.width ?? 160) * SCALE;
        const bd = (b.height ?? 120) * SCALE;
        const cx = (b.mapPositionX + (b.width ?? 160) / 2) - sceneCentre.x;
        const cz = (b.mapPositionY + (b.height ?? 120) / 2) - sceneCentre.y;
        const floors = Math.max(1, b.floors ?? 1);
        const bStyle = b.metadata?.style ?? {};
        const perFloor = typeof bStyle.heightPerFloor === "number" && bStyle.heightPerFloor > 0
          ? bStyle.heightPerFloor * 4
          : FLOOR_HEIGHT;
        const heightOverride = typeof bStyle.totalHeight === "number" && bStyle.totalHeight > 0
          ? bStyle.totalHeight * 4
          : null;
        const totalHeight = heightOverride ?? (floors * perFloor);
        const brand = new THREE.Color(b.colorCode ?? "#6b8ac5");
        // Desaturate the brand color a touch so wall opacity reads as
        // architectural volume, not saturation.
        const hsl = { h: 0, s: 0, l: 0 };
        brand.getHSL(hsl);
        brand.setHSL(hsl.h, Math.min(0.55, hsl.s * 0.8), darkMode ? 0.42 : 0.68);

        // Wall shell — hollow extrusion.
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
        shellGeo.rotateX(-Math.PI / 2);
        const shellMat = new THREE.MeshStandardMaterial({
          color: brand,
          roughness: 0.85,
          metalness: 0.02,
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
        });
        const shell = new THREE.Mesh(shellGeo, shellMat);
        shell.position.set(cx, 0, cz);
        shell.receiveShadow = true;
        buildingGroup.add(shell);
        dispose(shellGeo); dispose(shellMat);

        // Floor plates — cream/near-black slabs, one per floor.
        for (let f = 0; f < floors; f++) {
          const plateGeo = new THREE.BoxGeometry(bw - 0.4, 0.35, bd - 0.4);
          const plateMat = new THREE.MeshStandardMaterial({
            color: palette.plate,
            roughness: 0.95,
            metalness: 0,
          });
          const plate = new THREE.Mesh(plateGeo, plateMat);
          plate.position.set(cx, f * perFloor, cz);
          plate.receiveShadow = true;
          buildingGroup.add(plate);
          dispose(plateGeo); dispose(plateMat);
        }

        // Colored roof cap — reads as the building's brand mark.
        const roofGeo = new THREE.BoxGeometry(bw, 0.4, bd);
        const roofMat = new THREE.MeshStandardMaterial({
          color: brand,
          roughness: 0.7,
          metalness: 0.04,
          transparent: true,
          opacity: 0.72,
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(cx, totalHeight, cz);
        buildingGroup.add(roof);
        dispose(roofGeo); dispose(roofMat);
      }

      const buildingHeightById = new Map<string, number>();
      for (const b of buildings) {
        const s = b.metadata?.style ?? {};
        const pf = typeof s.heightPerFloor === "number" && s.heightPerFloor > 0
          ? s.heightPerFloor * 4
          : FLOOR_HEIGHT;
        buildingHeightById.set(b.id, pf);
      }

      // Track sprites so we can fade them by camera distance.
      const labelSprites: { sprite: any; center: any }[] = [];

      for (const r of rooms) {
        if (r.mapPositionX == null || r.mapPositionY == null) continue;
        const w = (r.width ?? 56) * SCALE;
        const d = (r.height ?? 40) * SCALE;
        const floor = r.floor ?? 1;
        const rStyle = r.metadata?.style ?? {};
        const customSlab = typeof rStyle.slabHeight === "number" && rStyle.slabHeight > 0
          ? rStyle.slabHeight * 4
          : null;
        const tall = customSlab ?? (
          (r.type === "hallway" || r.type === "stairs") ? ROOM_SLAB * 0.5 : ROOM_SLAB
        );
        const baseColor = TYPE_COLORS[r.type ?? "other"] ?? TYPE_COLORS.other;
        const tint = STATUS_TINT[r.currentStatus ?? "unknown"] ?? STATUS_TINT.unknown;
        const mixed = mixColor(baseColor, tint, 0.22);

        const geo = new THREE.BoxGeometry(w, tall, d);
        const mat = new THREE.MeshStandardMaterial({
          color: mixed,
          roughness: 0.72,
          metalness: 0.04,
        });
        const cube = new THREE.Mesh(geo, mat);
        cube.position.x = (r.mapPositionX + (r.width ?? 56) / 2) - sceneCentre.x;
        cube.position.z = (r.mapPositionY + (r.height ?? 40) / 2) - sceneCentre.y;
        const parentPerFloor = (r.buildingId && buildingHeightById.get(r.buildingId)) || FLOOR_HEIGHT;
        cube.position.y = (floor - 1) * parentPerFloor + 0.4 + tall / 2;
        cube.castShadow = true;
        cube.receiveShadow = true;
        cube.userData = { room: r };
        roomGroup.add(cube);
        dispose(geo); dispose(mat);

        // Hairline edge — reads as architecture.
        const edgeGeo = new THREE.EdgesGeometry(geo);
        const edgeMat = new THREE.LineBasicMaterial({
          color: palette.edge,
          transparent: true,
          opacity: darkMode ? 0.35 : 0.25,
        });
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        edges.position.copy(cube.position);
        roomGroup.add(edges);
        dispose(edgeGeo); dispose(edgeMat);

        // Compact room-number pill. Smaller than the previous version;
        // fades out when the camera is far so labels don't overwhelm the
        // orbit view.
        if (r.roomNumber) {
          const labelCanvas = document.createElement("canvas");
          labelCanvas.width = 192; labelCanvas.height = 64;
          const ctx = labelCanvas.getContext("2d")!;
          ctx.font = "600 32px -apple-system, Segoe UI, Roboto, sans-serif";
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";
          const m = ctx.measureText(r.roomNumber);
          const pillW = m.width + 26;
          const pillH = 44;
          const pillX = (192 - pillW) / 2;
          const pillY = (64 - pillH) / 2;
          // Soft white pill, no drop shadow.
          ctx.fillStyle = darkMode ? "rgba(23,32,51,0.94)" : "rgba(255,255,255,0.96)";
          ctx.beginPath();
          // @ts-ignore — roundRect is available in modern Canvas
          ctx.roundRect?.(pillX, pillY, pillW, pillH, 10);
          ctx.fill();
          ctx.strokeStyle = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = darkMode ? "#f1f5f9" : "#111827";
          ctx.fillText(r.roomNumber, 96, 33);
          const tex = new THREE.CanvasTexture(labelCanvas);
          tex.minFilter = THREE.LinearFilter;
          const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.position.set(cube.position.x, cube.position.y + tall / 2 + 2.6, cube.position.z);
          sprite.scale.set(16, 5.5, 1);
          roomGroup.add(sprite);
          labelSprites.push({ sprite, center: sprite.position.clone() });
          dispose(spriteMat); dispose(tex);
        }
      }

      // Collidables for walk-camera wall clipping.
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
      const initialYaw = -Math.PI / 4;
      const initialPitch = Math.PI / 3.2;
      const initialDist = 480;
      let yaw = initialYaw, pitch = initialPitch, dist = initialDist;
      const walkPos = new THREE.Vector3(0, 5, 120);
      const walkLook = { yaw: 0, pitch: 0 };
      const keys = new Set<string>();
      // Subtle auto-rotate on entry. Stops after the first user drag.
      let autoRotate = true;
      const AUTO_ROTATE_SPEED = 0.06;

      function updateCameraOrbit() {
        const x = dist * Math.cos(pitch) * Math.cos(yaw);
        const y = dist * Math.sin(pitch);
        const z = dist * Math.cos(pitch) * Math.sin(yaw);
        camera.position.set(x, y, z);
        camera.lookAt(0, 40, 0);
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

      // Reset — restores initial orbit framing and returns to orbit mode.
      resetRef.current = () => {
        yaw = initialYaw;
        pitch = initialPitch;
        dist = initialDist;
        autoRotate = true;
        updateCameraOrbit();
      };

      // ── Input ─────────────────────────────────────────────────
      let dragging = false;
      let lastX = 0, lastY = 0;
      const cv = renderer.domElement;
      cv.style.cursor = "grab";

      const onPointerDown = (e: PointerEvent) => {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        cv.style.cursor = "grabbing";
        cv.setPointerCapture?.(e.pointerId);
        autoRotate = false;
      };
      const onPointerUp = () => { dragging = false; cv.style.cursor = "grab"; };
      const onPointerMove = (e: PointerEvent) => {
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
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        autoRotate = false;
        if (mode === "orbit") {
          dist = Math.max(40, Math.min(1400, dist * (1 + e.deltaY * 0.001)));
        }
      };
      cv.addEventListener("pointerdown", onPointerDown);
      cv.addEventListener("pointerup", onPointerUp);
      cv.addEventListener("pointermove", onPointerMove);
      cv.addEventListener("wheel", onWheel, { passive: false });

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
      const tick = () => {
        if (disposed) return;
        raf = requestAnimationFrame(tick);
        const now = performance.now();
        const dt = (now - last) / 1000;
        last = now;

        // Minimap paint — flat rectangles, no dashed strokes, no title.
        const mm = minimapRef.current;
        if (mm) {
          const ctx = mm.getContext("2d");
          if (ctx) {
            const W = mm.width, H = mm.height;
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = darkMode ? "rgba(16,22,35,0.94)" : "rgba(240,243,247,0.96)";
            ctx.fillRect(0, 0, W, H);
            const bw = miniBounds.maxX - miniBounds.minX;
            const bh = miniBounds.maxZ - miniBounds.minZ;
            const scale = Math.min((W - 10) / Math.max(1, bw), (H - 10) / Math.max(1, bh));
            const cx = W / 2, cy = H / 2;
            const bcx = (miniBounds.minX + miniBounds.maxX) / 2;
            const bcz = (miniBounds.minZ + miniBounds.maxZ) / 2;
            // Building fills — muted brand tint at low opacity, no stroke.
            for (const bl of miniBuildings) {
              const px = cx + (bl.x - bcx) * scale;
              const py = cy + (bl.z - bcz) * scale;
              const pw = bl.w * scale;
              const ph = bl.h * scale;
              ctx.fillStyle = bl.color;
              ctx.globalAlpha = darkMode ? 0.28 : 0.20;
              ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
              ctx.globalAlpha = 1;
            }
            // Rooms as tiny dots — read as density.
            for (const r of miniRooms) {
              const px = cx + (r.x - bcx) * scale;
              const py = cy + (r.z - bcz) * scale;
              ctx.fillStyle = "#" + r.color.toString(16).padStart(6, "0");
              ctx.globalAlpha = 0.85;
              ctx.beginPath();
              ctx.arc(px, py, 1.4, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1;
            }
            if (mode === "walk") {
              const px = cx + (walkPos.x - bcx) * scale;
              const py = cy + (walkPos.z - bcz) * scale;
              ctx.save();
              ctx.translate(px, py);
              ctx.rotate(walkLook.yaw + Math.PI / 2);
              ctx.fillStyle = "#2563eb";
              ctx.strokeStyle = darkMode ? "#0b1220" : "#ffffff";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(0, -7);
              ctx.lineTo(-4.5, 5);
              ctx.lineTo(4.5, 5);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            }
          }
        }

        if (mode === "orbit") {
          if (autoRotate) yaw -= AUTO_ROTATE_SPEED * dt;
          updateCameraOrbit();
        } else {
          const speed = 40 * dt * (keys.has("shift") ? 2.5 : 1);
          const cy = Math.cos(walkLook.yaw), sy = Math.sin(walkLook.yaw);
          let dx = 0, dz = 0;
          if (keys.has("w") || keys.has("arrowup"))    { dx += cy * speed; dz += sy * speed; }
          if (keys.has("s") || keys.has("arrowdown"))  { dx -= cy * speed; dz -= sy * speed; }
          if (keys.has("a") || keys.has("arrowleft"))  { dx += sy * speed; dz -= cy * speed; }
          if (keys.has("d") || keys.has("arrowright")) { dx -= sy * speed; dz += cy * speed; }
          if (dx !== 0 && !blocked(walkPos.x + dx, walkPos.y, walkPos.z)) walkPos.x += dx;
          if (dz !== 0 && !blocked(walkPos.x, walkPos.y, walkPos.z + dz)) walkPos.z += dz;
          if (keys.has(" ") || keys.has("e"))          { walkPos.y += speed * 0.6; }
          if (keys.has("q") || keys.has("control"))    { walkPos.y = Math.max(1.2, walkPos.y - speed * 0.6); }
          updateCameraWalk();
        }

        // Fade the room-number pills as the camera pulls back — keeps
        // the orbit view calm and the walk view legible.
        const camY = camera.position.y;
        const labelOpacity = mode === "walk"
          ? 1
          : Math.max(0, Math.min(1, 1 - (dist - 220) / 320));
        for (const { sprite } of labelSprites) {
          (sprite.material as any).opacity = labelOpacity;
          sprite.visible = labelOpacity > 0.02;
        }
        // Silence lint about unused camY — reserved for future dynamic scale.
        void camY;

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
        cv.removeEventListener("pointerdown", onPointerDown);
        cv.removeEventListener("pointerup", onPointerUp);
        cv.removeEventListener("pointermove", onPointerMove);
        cv.removeEventListener("wheel", onWheel);
        cancelAnimationFrame(raf);
        for (const d of disposables) d.dispose?.();
        renderer.dispose();
        try { host.removeChild(renderer.domElement); } catch { /* already gone */ }
        scene.traverse((o: any) => {
          if (o.geometry) o.geometry.dispose?.();
          if (o.material) {
            const m = o.material;
            (Array.isArray(m) ? m : [m]).forEach((mm: any) => mm.dispose?.());
          }
        });
        resetRef.current = null;
      };
    })();

    return () => { disposed = true; cleanup?.(); };
  }, [rooms, buildings, mode, darkMode, palette]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className={cn(
        "relative w-full h-full rounded-2xl overflow-hidden border shadow-2xl",
        darkMode ? "bg-gray-950 border-gray-800/70" : "bg-white border-gray-200/70",
      )}>
        {/* 3D canvas host */}
        <div ref={canvasHostRef} className="absolute inset-0" />

        {/* Top-right controls — Reset + Close, as a unified pill. */}
        <div className={cn(
          "absolute top-3 right-3 z-10 flex flex-row rounded-[14px] overflow-hidden backdrop-blur-xl",
          "border border-black/[0.08] dark:border-white/[0.08]",
          "shadow-[0_2px_10px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]",
          "divide-x divide-black/[0.06] dark:divide-white/[0.06]",
          darkMode ? "bg-gray-900/90" : "bg-white/95",
        )}>
          <button
            type="button"
            onClick={() => resetRef.current?.()}
            aria-label="Reset camera"
            title="Reset camera"
            className="h-10 w-10 flex items-center justify-center text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors active:scale-[0.94]"
          >
            <LocateFixed className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close 3D view"
            title="Close"
            className="h-10 w-10 flex items-center justify-center text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors active:scale-[0.94]"
          >
            <X className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>
        </div>

        {/* Minimap — clean, no title, hairline border. */}
        <div className={cn(
          "absolute top-3 left-3 z-10 p-1.5 rounded-[14px] backdrop-blur-xl",
          "border border-black/[0.08] dark:border-white/[0.08]",
          "shadow-[0_2px_10px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]",
          darkMode ? "bg-gray-900/90" : "bg-white/95",
        )}>
          <canvas
            ref={minimapRef}
            width={160}
            height={160}
            className="rounded-lg block"
          />
        </div>

        {/* Mode toggle — segmented control at the bottom-center. */}
        <div className={cn(
          "absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-row rounded-full p-1 backdrop-blur-xl",
          "border border-black/[0.08] dark:border-white/[0.08]",
          "shadow-[0_2px_10px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]",
          darkMode ? "bg-gray-900/90" : "bg-white/95",
        )}>
          <button
            type="button"
            onClick={() => setMode("orbit")}
            aria-pressed={mode === "orbit"}
            className={cn(
              "h-9 px-4 rounded-full text-[13px] font-semibold gap-2 inline-flex items-center transition-colors active:scale-[0.97]",
              mode === "orbit"
                ? "bg-blue-600 text-white"
                : "text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
            )}
          >
            <Mountain className="h-4 w-4" strokeWidth={2} />
            Overview
          </button>
          <button
            type="button"
            onClick={() => setMode("walk")}
            aria-pressed={mode === "walk"}
            className={cn(
              "h-9 px-4 rounded-full text-[13px] font-semibold gap-2 inline-flex items-center transition-colors active:scale-[0.97]",
              mode === "walk"
                ? "bg-blue-600 text-white"
                : "text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
            )}
          >
            <Eye className="h-4 w-4" strokeWidth={2} />
            Walk
          </button>
        </div>

        {/* Mode hint — fades in on mode change, fades out after 4s. */}
        <div
          className={cn(
            "absolute bottom-16 left-1/2 -translate-x-1/2 z-10 px-3.5 py-2 rounded-full text-[12px] font-medium pointer-events-none transition-opacity duration-500 backdrop-blur-xl border",
            showHint ? "opacity-100" : "opacity-0",
            darkMode
              ? "bg-gray-900/85 border-white/[0.08] text-gray-200"
              : "bg-white/90 border-black/[0.08] text-gray-700",
          )}
        >
          {mode === "orbit"
            ? "Drag to rotate · Scroll to zoom"
            : "W A S D to move · Drag to look · Shift to run"}
        </div>

        {/* Loading + error overlays. */}
        {(!ready && !error) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={cn(
              "text-[13px] font-medium px-4 py-2.5 rounded-full backdrop-blur-xl border",
              darkMode
                ? "bg-gray-900/85 border-white/[0.08] text-gray-200"
                : "bg-white/90 border-black/[0.08] text-gray-700",
            )}>
              Loading 3D view…
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl p-5 max-w-md text-sm">
              <p className="font-semibold text-red-700 dark:text-red-300 mb-1">3D failed to load</p>
              <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-semibold text-red-700 dark:text-red-300 underline"
              >
                Close and try again
              </button>
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
