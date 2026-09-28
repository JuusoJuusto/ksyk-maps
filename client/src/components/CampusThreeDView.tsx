/**
 * KSYK Maps — In-browser 3D campus view.
 *
 * Fully rewritten for visibility and Apple-Maps / MazeMap aesthetics:
 *
 *   - NO wall shells (the old glass boxes hid the rooms). Buildings are
 *     represented by a soft floor plate per floor + a colored roof cap
 *     ONLY on the top floor. Rooms are the primary visual element.
 *   - Rooms are chunky slabs (5 units tall) so they read clearly at
 *     any camera angle. Colored by type, muted palette.
 *   - Room-number pills are always visible in orbit mode; scale
 *     smoothly with distance.
 *   - NO shadows. Flat, soft, even lighting.
 *   - Warm neutral ground (no fog occluding rooms).
 *   - Camera framing auto-fits every mount so the whole campus is
 *     visible on load.
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

/** Loads three.js once from a CDN. */
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

/** Muted palette — reads clean at low saturation, still colorful enough
 *  to distinguish room types at a glance. */
const TYPE_COLORS: Record<string, number> = {
  classroom:  0x6b8ac5,
  office:     0x8b7bb8,
  lab:        0x5eaab3,
  library:    0xd4a15e,
  cafeteria:  0xd97878,
  auditorium: 0xc27ba0,
  gym:        0x6bb598,
  hallway:    0xbcc4d0,
  stairs:     0x8994a3,
  wc:         0xa89bc8,
  other:      0x9ba5b5,
};

export default function CampusThreeDView({ onClose }: { onClose: () => void }) {
  const { darkMode } = useDarkMode();
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<CameraMode>("orbit");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
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

  useEffect(() => {
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, [mode]);

  const palette = useMemo(() => darkMode ? {
    ground:      0x0f1420,
    plate:       0x1a2334,
    edge:        0x0a0f18,
    ambient1:    0xe8ecf5,
    ambient2:    0x2a3448,
    label:       "rgba(15,20,30,0.94)",
    labelText:   "#f1f5f9",
    labelBorder: "rgba(255,255,255,0.12)",
  } : {
    ground:      0xf1f3f7,
    plate:       0xffffff,
    edge:        0xc9d0dc,
    ambient1:    0xffffff,
    ambient2:    0xe0e4ec,
    label:       "rgba(255,255,255,0.98)",
    labelText:   "#111827",
    labelBorder: "rgba(0,0,0,0.10)",
  }, [darkMode]);

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
      // Very light fog for depth cues; kicks in far away so nothing
      // useful gets occluded.
      scene.fog = new THREE.Fog(palette.ground, 900, 3000);

      const camera = new THREE.PerspectiveCamera(50, w / h, 1, 8000);

      // NO shadows. Flat, soft, even lighting: bright hemisphere + weak
      // sun so extrusions still get a subtle facing gradient.
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = false;
      host.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(palette.ambient1, palette.ambient2, 1.0));
      const sun = new THREE.DirectionalLight(0xffffff, 0.35);
      sun.position.set(300, 800, 300);
      scene.add(sun);

      // Ground plane — matches sky. No grid.
      const groundGeo = new THREE.PlaneGeometry(6000, 6000);
      const groundMat = new THREE.MeshStandardMaterial({
        color: palette.ground,
        roughness: 1,
        metalness: 0,
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);

      // Scene centre — average of all placed rooms so the camera looks
      // at the middle of what actually exists.
      const placed = rooms.filter((r) => r.mapPositionX != null && r.mapPositionY != null);
      const sceneCentre = (() => {
        if (placed.length === 0) return { x: 0, y: 0 };
        const xs = placed.map((r) => (r.mapPositionX ?? 0) + (r.width ?? 56) / 2);
        const ys = placed.map((r) => (r.mapPositionY ?? 0) + (r.height ?? 40) / 2);
        return {
          x: (Math.min(...xs) + Math.max(...xs)) / 2,
          y: (Math.min(...ys) + Math.max(...ys)) / 2,
        };
      })();

      const FLOOR_HEIGHT = 14;   // per-floor world units
      const ROOM_SLAB    = 5.5;  // room extrusion — chunky, visible from any angle
      const SCALE = 1;

      // Scene-space extent so we can auto-fit the camera.
      let extentMin = { x: Infinity, z: Infinity };
      let extentMax = { x: -Infinity, z: -Infinity };
      const bumpExtent = (cx: number, cz: number, w: number, d: number) => {
        extentMin.x = Math.min(extentMin.x, cx - w / 2);
        extentMin.z = Math.min(extentMin.z, cz - d / 2);
        extentMax.x = Math.max(extentMax.x, cx + w / 2);
        extentMax.z = Math.max(extentMax.z, cz + d / 2);
      };

      // ── Buildings — floor plates + optional roof cap. NO WALLS.
      //   Rooms sit ON these plates and are fully visible from any
      //   viewing angle because nothing occludes them.
      const buildingGroup = new THREE.Group();
      scene.add(buildingGroup);
      const buildingHeightById = new Map<string, number>();

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
        buildingHeightById.set(b.id, perFloor);
        bumpExtent(cx, cz, bw, bd);

        const brand = new THREE.Color(b.colorCode ?? "#6b8ac5");

        // One thin plate per floor. Very subtle — reads as "this is
        // where floor N sits".
        for (let f = 0; f < floors; f++) {
          const plateGeo = new THREE.BoxGeometry(bw, 0.6, bd);
          const plateMat = new THREE.MeshStandardMaterial({
            color: palette.plate,
            roughness: 0.98,
            metalness: 0,
          });
          const plate = new THREE.Mesh(plateGeo, plateMat);
          plate.position.set(cx, f * perFloor, cz);
          buildingGroup.add(plate);
          // Hairline plate edge so floors don't melt into their rooms.
          const plateEdgeGeo = new THREE.EdgesGeometry(plateGeo);
          const plateEdgeMat = new THREE.LineBasicMaterial({
            color: palette.edge,
            transparent: true,
            opacity: 0.5,
          });
          const plateEdges = new THREE.LineSegments(plateEdgeGeo, plateEdgeMat);
          plateEdges.position.copy(plate.position);
          buildingGroup.add(plateEdges);
        }

        // Roof cap — colored (brand) at the very top so the campus
        // reads as clusters of colored buildings from far away.
        const roofGeo = new THREE.BoxGeometry(bw, 0.7, bd);
        const roofMat = new THREE.MeshStandardMaterial({
          color: brand,
          roughness: 0.7,
          metalness: 0.03,
          transparent: true,
          opacity: 0.85,
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(cx, floors * perFloor, cz);
        buildingGroup.add(roof);
      }

      // ── Rooms — chunky slabs, fully visible.
      const roomGroup = new THREE.Group();
      scene.add(roomGroup);
      const labelSprites: any[] = [];

      for (const r of rooms) {
        if (r.mapPositionX == null || r.mapPositionY == null) continue;
        const w = (r.width ?? 56) * SCALE;
        const d = (r.height ?? 40) * SCALE;
        const floor = r.floor ?? 1;
        const rStyle = r.metadata?.style ?? {};
        const customSlab = typeof rStyle.slabHeight === "number" && rStyle.slabHeight > 0
          ? rStyle.slabHeight * 4
          : null;
        // Rooms are chunky. Hallways/stairs a bit shorter so they read
        // as circulation vs. actual rooms.
        const tall = customSlab ?? (
          (r.type === "hallway" || r.type === "stairs") ? ROOM_SLAB * 0.4 : ROOM_SLAB
        );
        const base = TYPE_COLORS[r.type ?? "other"] ?? TYPE_COLORS.other;

        const cx = (r.mapPositionX + (r.width ?? 56) / 2) - sceneCentre.x;
        const cz = (r.mapPositionY + (r.height ?? 40) / 2) - sceneCentre.y;
        bumpExtent(cx, cz, w, d);

        const parentPerFloor = (r.buildingId && buildingHeightById.get(r.buildingId)) || FLOOR_HEIGHT;
        const cy = (floor - 1) * parentPerFloor + 0.6 + tall / 2;

        const geo = new THREE.BoxGeometry(w, tall, d);
        const mat = new THREE.MeshStandardMaterial({
          color: base,
          roughness: 0.7,
          metalness: 0.02,
        });
        const cube = new THREE.Mesh(geo, mat);
        cube.position.set(cx, cy, cz);
        cube.userData = { room: r };
        roomGroup.add(cube);

        const edgeGeo = new THREE.EdgesGeometry(geo);
        const edgeMat = new THREE.LineBasicMaterial({
          color: palette.edge,
          transparent: true,
          opacity: darkMode ? 0.55 : 0.42,
        });
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        edges.position.copy(cube.position);
        roomGroup.add(edges);

        // Room-number pill — draw canvas, wrap in a sprite. Always
        // rendered on top by disabling depth test.
        if (r.roomNumber) {
          const labelCanvas = document.createElement("canvas");
          labelCanvas.width = 192; labelCanvas.height = 64;
          const ctx = labelCanvas.getContext("2d")!;
          ctx.font = "600 34px -apple-system, Segoe UI, Roboto, sans-serif";
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";
          const m = ctx.measureText(r.roomNumber);
          const pillW = m.width + 30;
          const pillH = 48;
          const pillX = (192 - pillW) / 2;
          const pillY = (64 - pillH) / 2;
          ctx.fillStyle = palette.label;
          ctx.beginPath();
          // @ts-ignore roundRect is fine in modern browsers
          ctx.roundRect?.(pillX, pillY, pillW, pillH, 12);
          ctx.fill();
          ctx.strokeStyle = palette.labelBorder;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = palette.labelText;
          ctx.fillText(r.roomNumber, 96, 34);

          const tex = new THREE.CanvasTexture(labelCanvas);
          tex.minFilter = THREE.LinearFilter;
          const spriteMat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthTest: false,       // always on top
            depthWrite: false,
          });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.position.set(cx, cy + tall / 2 + 3.2, cz);
          sprite.scale.set(15, 5, 1);
          sprite.renderOrder = 999;
          roomGroup.add(sprite);
          labelSprites.push(sprite);
        }
      }

      // Auto-fit camera on load so everything is visible.
      const extentW = Math.max(80, extentMax.x - extentMin.x);
      const extentD = Math.max(80, extentMax.z - extentMin.z);
      const extentR = Math.max(extentW, extentD) * 0.75;
      const initialYaw = -Math.PI / 4;
      const initialPitch = Math.PI / 4;
      const initialDist = Math.max(220, extentR * 1.6);
      let yaw = initialYaw, pitch = initialPitch, dist = initialDist;

      const walkStart = placed.length > 0 ? {
        x: 0, y: 4, z: extentD * 0.35,
      } : { x: 0, y: 4, z: 120 };
      const walkPos = new THREE.Vector3(walkStart.x, walkStart.y, walkStart.z);
      const walkLook = { yaw: 0, pitch: 0 };
      const keys = new Set<string>();
      let autoRotate = true;
      const AUTO_ROTATE_SPEED = 0.05;

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

      resetRef.current = () => {
        yaw = initialYaw;
        pitch = initialPitch;
        dist = initialDist;
        autoRotate = true;
        updateCameraOrbit();
      };

      // Walk collidables — rooms as AABBs, expanded a bit so the camera
      // slides along walls smoothly.
      const collidables: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }[] = [];
      roomGroup.traverse((o: any) => {
        if (o.isMesh && o.userData?.room) {
          const box = new THREE.Box3().setFromObject(o);
          collidables.push({
            minX: box.min.x - 4, maxX: box.max.x + 4,
            minY: box.min.y,     maxY: box.max.y,
            minZ: box.min.z - 4, maxZ: box.max.z + 4,
          });
        }
      });
      const blocked = (nx: number, ny: number, nz: number) => {
        for (const b of collidables) {
          if (nx >= b.minX && nx <= b.maxX && ny >= b.minY && ny <= b.maxY && nz >= b.minZ && nz <= b.maxZ) {
            return true;
          }
        }
        return false;
      };

      // Input handlers.
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
          pitch = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, pitch + dy * 0.004));
        } else {
          walkLook.yaw += dx * 0.004;
          walkLook.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, walkLook.pitch - dy * 0.004));
        }
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        autoRotate = false;
        if (mode === "orbit") {
          dist = Math.max(50, Math.min(2200, dist * (1 + e.deltaY * 0.001)));
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

      // Minimap paint.
      const miniRooms = placed.map((r) => ({
        x: (r.mapPositionX! + (r.width ?? 56) / 2) - sceneCentre.x,
        z: (r.mapPositionY! + (r.height ?? 40) / 2) - sceneCentre.y,
        w: r.width ?? 56,
        h: r.height ?? 40,
        color: TYPE_COLORS[r.type ?? "other"] ?? TYPE_COLORS.other,
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

      const tick = () => {
        if (disposed) return;
        raf = requestAnimationFrame(tick);
        const dt = 1 / 60;

        const mm = minimapRef.current;
        if (mm) {
          const ctx = mm.getContext("2d");
          if (ctx) {
            const W = mm.width, H = mm.height;
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = darkMode ? "rgba(15,20,30,0.95)" : "rgba(240,243,247,0.96)";
            ctx.fillRect(0, 0, W, H);
            const bw = miniBounds.maxX - miniBounds.minX;
            const bh = miniBounds.maxZ - miniBounds.minZ;
            const scale = Math.min((W - 10) / Math.max(1, bw), (H - 10) / Math.max(1, bh));
            const cx = W / 2, cy = H / 2;
            const bcx = (miniBounds.minX + miniBounds.maxX) / 2;
            const bcz = (miniBounds.minZ + miniBounds.maxZ) / 2;
            for (const bl of miniBuildings) {
              const px = cx + (bl.x - bcx) * scale;
              const py = cy + (bl.z - bcz) * scale;
              const pw = bl.w * scale;
              const ph = bl.h * scale;
              ctx.fillStyle = bl.color;
              ctx.globalAlpha = darkMode ? 0.28 : 0.18;
              ctx.fillRect(px - pw / 2, py - ph / 2, pw, ph);
              ctx.globalAlpha = 1;
            }
            for (const r of miniRooms) {
              const px = cx + (r.x - bcx) * scale;
              const py = cy + (r.z - bcz) * scale;
              ctx.fillStyle = "#" + r.color.toString(16).padStart(6, "0");
              ctx.globalAlpha = 0.85;
              ctx.beginPath();
              ctx.arc(px, py, 1.5, 0, Math.PI * 2);
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
              ctx.lineTo(-5, 5);
              ctx.lineTo(5, 5);
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
          const speed = 45 * dt * (keys.has("shift") ? 2.5 : 1);
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

        // Fade labels smoothly with camera distance in orbit mode; in
        // walk mode keep them fully visible up close, invisible far.
        if (mode === "orbit") {
          const labelOpacity = Math.max(0, Math.min(1, 1.15 - (dist - 200) / (initialDist * 1.2)));
          for (const sprite of labelSprites) {
            (sprite.material as any).opacity = labelOpacity;
            sprite.visible = labelOpacity > 0.02;
          }
        } else {
          for (const sprite of labelSprites) {
            (sprite.material as any).opacity = 1;
            sprite.visible = true;
          }
        }

        renderer.render(scene, camera);
      };
      tick();

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
        scene.traverse((o: any) => {
          if (o.geometry) o.geometry.dispose?.();
          if (o.material) {
            const m = o.material;
            (Array.isArray(m) ? m : [m]).forEach((mm: any) => {
              if (mm?.map) mm.map.dispose?.();
              mm.dispose?.();
            });
          }
        });
        renderer.dispose();
        try { host.removeChild(renderer.domElement); } catch { /* already gone */ }
        resetRef.current = null;
      };
    })();

    return () => { disposed = true; cleanup?.(); };
  }, [rooms, buildings, mode, darkMode, palette]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className={cn(
        "relative w-full h-full rounded-2xl overflow-hidden border",
        darkMode ? "bg-gray-950 border-gray-800/70" : "bg-white border-gray-200/70",
      )}>
        <div ref={canvasHostRef} className="absolute inset-0" />

        {/* Top-right: Reset + Close as a unified pill. */}
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

        {/* Minimap — top-left, clean. */}
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

        {/* Segmented mode toggle — bottom centre. */}
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

        {/* Mode hint — fades in on change, out after 4s. */}
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
