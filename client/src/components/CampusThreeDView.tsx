/**
 * KSYK Maps — In-browser 3D campus view.
 *
 * v4.7.49 — uses POLYGON POINTS (lat/lng), which is how real rooms and
 * buildings are stored. The previous versions relied on
 * mapPositionX/Y + width/height (an old rectangle-based layout) that
 * modern rooms don't have, so nothing showed up.
 *
 * How it works:
 *   - Every building and room has a `points: {lat, lng}[]` polygon
 *   - We compute a bounding box, pick a centre, then project every
 *     lat/lng to metres via a local equirectangular scale
 *     (dx = Δlng·cos(centre.lat)·R, dz = -Δlat·R)
 *   - Each polygon becomes a THREE.Shape → ExtrudeGeometry
 *   - Buildings extrude to (floors × floorHeight); rooms extrude a
 *     small slab that sits on the correct floor plate
 *   - No shadows, flat soft lighting, camera auto-fits everything
 *   - Orbit + walk modes with subtle auto-rotate on entry
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Eye, LocateFixed, Mountain, X } from "lucide-react";
import { cn } from "@/lib/utils";

// v4.7.50 — Three.js is now a real npm dependency and imported at build
// time. The old CDN loader tripped our CSP script-src-elem allowlist and
// was refused by the browser in production.
import * as THREE_MODULE from "three";

interface LatLng { lat: number; lng: number }

interface Room {
  id: string;
  buildingId?: string;
  roomNumber: string;
  name?: string;
  floor: number;
  type?: string;
  points?: LatLng[] | null;
  metadata?: { style?: Record<string, unknown> } | null;
}

interface Building {
  id: string;
  name?: string;
  floors?: number | null;
  colorCode?: string | null;
  points?: LatLng[] | null;
  metadata?: { style?: Record<string, unknown> } | null;
}

/** Local, ESM-bundled Three.js — no CDN, no CSP surprises. */
const THREE: any = THREE_MODULE;

type CameraMode = "orbit" | "walk";

/** Muted Apple-Maps-inspired palette. */
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
  bathroom:   0xa89bc8,
  lobby:      0xd4a15e,
  other:      0x9ba5b5,
};

const EARTH_R = 6371000; // metres

/** Convert a lat/lng to metres relative to a centre point. Simple
 *  equirectangular scale — accurate at campus scale. */
function project(p: LatLng, centre: LatLng): { x: number; z: number } {
  const dLng = (p.lng - centre.lng) * Math.PI / 180;
  const dLat = (p.lat - centre.lat) * Math.PI / 180;
  return {
    x: dLng * Math.cos(centre.lat * Math.PI / 180) * EARTH_R,
    z: -dLat * EARTH_R, // negate so north is -Z (screen-up-ish)
  };
}

/** Polygon centroid in lat/lng. */
function centroid(points: LatLng[]): LatLng {
  let lat = 0, lng = 0;
  for (const p of points) { lat += p.lat; lng += p.lng; }
  return { lat: lat / points.length, lng: lng / points.length };
}

export default function CampusThreeDView({ onClose }: { onClose: () => void }) {
  const { darkMode } = useDarkMode();
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<CameraMode>("orbit");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [debugInfo, setDebugInfo] = useState<{ rooms: number; buildings: number }>({ rooms: 0, buildings: 0 });
  const resetRef = useRef<(() => void) | null>(null);

  const { data: rooms = [], isError: roomsError } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const r = await fetch("/api/rooms");
      if (!r.ok) throw new Error("rooms " + r.status);
      return r.json();
    },
    staleTime: 60_000,
  });

  const { data: buildings = [], isError: buildingsError } = useQuery<Building[]>({
    queryKey: ["buildings"],
    queryFn: async () => {
      const r = await fetch("/api/buildings");
      if (!r.ok) throw new Error("buildings " + r.status);
      return r.json();
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, [mode]);

  useEffect(() => {
    if (roomsError || buildingsError) {
      setError("Couldn't load campus data. Check your connection and try again.");
    }
  }, [roomsError, buildingsError]);

  const palette = useMemo(() => darkMode ? {
    ground:      0x0f1420,
    plate:       0x1a2334,
    edge:        0x0a0f18,
    ambient1:    0xeef2ff,
    ambient2:    0x2a3448,
    label:       "rgba(15,20,30,0.94)",
    labelText:   "#f1f5f9",
    labelBorder: "rgba(255,255,255,0.12)",
  } : {
    ground:      0xf1f3f7,
    plate:       0xffffff,
    edge:        0xc9d0dc,
    ambient1:    0xffffff,
    ambient2:    0xe4e9f2,
    label:       "rgba(255,255,255,0.98)",
    labelText:   "#111827",
    labelBorder: "rgba(0,0,0,0.10)",
  }, [darkMode]);

  useEffect(() => {
    if (!canvasHostRef.current) return;
    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;

    (() => {
      if (disposed) return;

      const host = canvasHostRef.current!;
      const w = host.clientWidth, h = host.clientHeight;

      // ── Data prep ────────────────────────────────────────────────
      const validBuildings = buildings.filter(
        (b) => Array.isArray(b.points) && b.points!.length >= 3,
      );
      const validRooms = rooms.filter(
        (r) => Array.isArray(r.points) && r.points!.length >= 3,
      );

      if (validBuildings.length === 0 && validRooms.length === 0) {
        setError("No campus geometry to render. Ask an admin to add rooms in the builder.");
        setReady(true);
        return;
      }

      // Pick a projection centre. Prefer the average building centroid;
      // fall back to rooms if no buildings.
      const centreSource = validBuildings.length > 0 ? validBuildings : validRooms;
      const centreLatLng = (() => {
        let lat = 0, lng = 0, n = 0;
        for (const b of centreSource) {
          const c = centroid(b.points!);
          lat += c.lat; lng += c.lng; n++;
        }
        return { lat: lat / n, lng: lng / n };
      })();

      // Project + compute scene extent for auto-fit.
      const projectRing = (pts: LatLng[]) => pts.map((p) => project(p, centreLatLng));
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const b of validBuildings) {
        for (const p of projectRing(b.points!)) {
          if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
          if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
        }
      }
      if (!isFinite(minX)) {
        for (const r of validRooms) {
          for (const p of projectRing(r.points!)) {
            if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
            if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
          }
        }
      }

      const extentW = Math.max(20, maxX - minX);
      const extentD = Math.max(20, maxZ - minZ);
      const extentR = Math.max(extentW, extentD) * 0.75;
      const camDist = Math.max(60, extentR * 1.8);

      setDebugInfo({ rooms: validRooms.length, buildings: validBuildings.length });

      // ── Scene setup ─────────────────────────────────────────────
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(palette.ground);
      // Fog kicks in past 2× extent so nothing useful is occluded.
      scene.fog = new THREE.Fog(palette.ground, extentR * 2, extentR * 6);

      const camera = new THREE.PerspectiveCamera(50, w / h, 0.5, extentR * 20);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = false;
      host.appendChild(renderer.domElement);

      // Soft flat lighting — no shadows anywhere.
      scene.add(new THREE.HemisphereLight(palette.ambient1, palette.ambient2, 1.15));
      const sun = new THREE.DirectionalLight(0xffffff, 0.35);
      sun.position.set(extentR, extentR * 1.5, extentR * 0.6);
      scene.add(sun);

      // Ground plane.
      const groundSize = Math.max(2000, extentR * 8);
      const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
      const groundMat = new THREE.MeshBasicMaterial({ color: palette.ground });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.05;
      scene.add(ground);

      // Constants tuned to metric units. Real buildings are ~4m per
      // floor; a school block is ~3–4 floors. Rooms sit on top of the
      // building's floor plates.
      const FLOOR_H = 3.6;
      const ROOM_SLAB = 1.0;

      const buildingHeightById = new Map<string, number>();

      // ── Build buildings ────────────────────────────────────────
      const buildingGroup = new THREE.Group();
      scene.add(buildingGroup);

      const makeShape = (pts: LatLng[]) => {
        const projected = projectRing(pts);
        const shape = new THREE.Shape();
        projected.forEach((p, i) => {
          if (i === 0) shape.moveTo(p.x, p.z);
          else shape.lineTo(p.x, p.z);
        });
        shape.closePath();
        return shape;
      };

      for (const b of validBuildings) {
        const floors = Math.max(1, b.floors ?? 1);
        const style = (b.metadata?.style ?? {}) as Record<string, unknown>;
        const perFloor = typeof style.heightPerFloor === "number" && style.heightPerFloor > 0
          ? Number(style.heightPerFloor)
          : FLOOR_H;
        const total = floors * perFloor;
        buildingHeightById.set(b.id, perFloor);

        const shape = makeShape(b.points!);

        // Floor plate per floor — very light cream, subtle. Uses tiny
        // extrusion so it reads as a slab, not a line.
        for (let f = 0; f < floors; f++) {
          const plateGeo = new THREE.ExtrudeGeometry(shape, {
            depth: 0.25,
            bevelEnabled: false,
          });
          plateGeo.rotateX(-Math.PI / 2);
          const plateMat = new THREE.MeshStandardMaterial({
            color: palette.plate,
            roughness: 0.98,
            metalness: 0,
          });
          const plate = new THREE.Mesh(plateGeo, plateMat);
          plate.position.y = f * perFloor;
          buildingGroup.add(plate);

          // Hairline edge.
          const edgeGeo = new THREE.EdgesGeometry(plateGeo);
          const edgeMat = new THREE.LineBasicMaterial({
            color: palette.edge,
            transparent: true,
            opacity: darkMode ? 0.5 : 0.35,
          });
          const edges = new THREE.LineSegments(edgeGeo, edgeMat);
          edges.position.y = f * perFloor;
          buildingGroup.add(edges);
        }

        // Roof cap — colored (building brand).
        const roofGeo = new THREE.ExtrudeGeometry(shape, {
          depth: 0.4,
          bevelEnabled: false,
        });
        roofGeo.rotateX(-Math.PI / 2);
        const brand = new THREE.Color(b.colorCode ?? "#6b8ac5");
        const roofMat = new THREE.MeshStandardMaterial({
          color: brand,
          roughness: 0.7,
          metalness: 0.04,
          transparent: true,
          opacity: 0.9,
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = total;
        buildingGroup.add(roof);
      }

      // ── Build rooms ────────────────────────────────────────────
      const roomGroup = new THREE.Group();
      scene.add(roomGroup);
      const labelSprites: any[] = [];

      for (const r of validRooms) {
        const floor = r.floor ?? 1;
        const parentPerFloor = (r.buildingId && buildingHeightById.get(r.buildingId)) || FLOOR_H;
        const baseY = (floor - 1) * parentPerFloor + 0.3;

        const style = (r.metadata?.style ?? {}) as Record<string, unknown>;
        const customSlab = typeof style.slabHeight === "number" && style.slabHeight > 0
          ? Number(style.slabHeight)
          : null;
        const slabH = customSlab ?? (
          (r.type === "hallway" || r.type === "stairs") ? ROOM_SLAB * 0.4 : ROOM_SLAB
        );

        const color = TYPE_COLORS[r.type ?? "other"] ?? TYPE_COLORS.other;
        const shape = makeShape(r.points!);
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: slabH,
          bevelEnabled: false,
        });
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.7,
          metalness: 0.03,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = baseY;
        mesh.userData = { room: r };
        roomGroup.add(mesh);

        const edgeGeo = new THREE.EdgesGeometry(geo);
        const edgeMat = new THREE.LineBasicMaterial({
          color: palette.edge,
          transparent: true,
          opacity: darkMode ? 0.6 : 0.45,
        });
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        edges.position.copy(mesh.position);
        roomGroup.add(edges);

        // Room label — canvas sprite. Positioned above the slab centre.
        if (r.roomNumber) {
          const c = centroid(r.points!);
          const p = project(c, centreLatLng);

          const canvas = document.createElement("canvas");
          canvas.width = 192; canvas.height = 64;
          const ctx = canvas.getContext("2d")!;
          ctx.font = "600 32px -apple-system, Segoe UI, Roboto, sans-serif";
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";
          const m = ctx.measureText(r.roomNumber);
          const pillW = m.width + 26;
          const pillH = 44;
          const pillX = (192 - pillW) / 2;
          const pillY = (64 - pillH) / 2;
          ctx.fillStyle = palette.label;
          ctx.beginPath();
          // @ts-ignore roundRect exists on modern canvas
          ctx.roundRect?.(pillX, pillY, pillW, pillH, 11);
          ctx.fill();
          ctx.strokeStyle = palette.labelBorder;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = palette.labelText;
          ctx.fillText(r.roomNumber, 96, 32);

          const tex = new THREE.CanvasTexture(canvas);
          tex.minFilter = THREE.LinearFilter;
          const spriteMat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthTest: false,
            depthWrite: false,
          });
          const sprite = new THREE.Sprite(spriteMat);
          const labelScale = Math.max(4, Math.min(16, extentR * 0.04));
          sprite.scale.set(labelScale, labelScale * 0.33, 1);
          sprite.position.set(p.x, baseY + slabH + labelScale * 0.35, p.z);
          sprite.renderOrder = 999;
          roomGroup.add(sprite);
          labelSprites.push(sprite);
        }
      }

      // ── Camera ─────────────────────────────────────────────────
      const initialYaw = -Math.PI / 4;
      const initialPitch = Math.PI / 4;
      let yaw = initialYaw, pitch = initialPitch, dist = camDist;

      // Aim at the middle of the extent (relative to our centre).
      const target = new THREE.Vector3(
        (minX + maxX) / 2,
        Math.max(6, extentR * 0.05),
        (minZ + maxZ) / 2,
      );

      const walkPos = new THREE.Vector3(target.x, 4, target.z + extentD * 0.35);
      const walkLook = { yaw: 0, pitch: 0 };
      const keys = new Set<string>();
      let autoRotate = true;
      const AUTO_ROTATE_SPEED = 0.08;

      function updateOrbit() {
        camera.position.set(
          target.x + dist * Math.cos(pitch) * Math.cos(yaw),
          target.y + dist * Math.sin(pitch),
          target.z + dist * Math.cos(pitch) * Math.sin(yaw),
        );
        camera.lookAt(target);
      }
      function updateWalk() {
        camera.position.copy(walkPos);
        const cy = Math.cos(walkLook.yaw), sy = Math.sin(walkLook.yaw);
        const cp = Math.cos(walkLook.pitch), sp = Math.sin(walkLook.pitch);
        camera.lookAt(
          walkPos.x + cy * cp,
          walkPos.y + sp,
          walkPos.z + sy * cp,
        );
      }
      updateOrbit();

      resetRef.current = () => {
        yaw = initialYaw;
        pitch = initialPitch;
        dist = camDist;
        autoRotate = true;
        updateOrbit();
      };

      // Collidables for walk mode.
      const collidables: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }[] = [];
      roomGroup.traverse((o: any) => {
        if (o.isMesh && o.userData?.room) {
          const box = new THREE.Box3().setFromObject(o);
          collidables.push({
            minX: box.min.x - 0.5, maxX: box.max.x + 0.5,
            minY: box.min.y,       maxY: box.max.y,
            minZ: box.min.z - 0.5, maxZ: box.max.z + 0.5,
          });
        }
      });
      const blocked = (nx: number, ny: number, nz: number) => {
        for (const b of collidables) {
          if (nx >= b.minX && nx <= b.maxX && ny >= b.minY && ny <= b.maxY && nz >= b.minZ && nz <= b.maxZ) return true;
        }
        return false;
      };

      // Input.
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
          dist = Math.max(camDist * 0.15, Math.min(camDist * 4, dist * (1 + e.deltaY * 0.001)));
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

      // Minimap.
      const minRooms = validRooms.map((r) => {
        const c = centroid(r.points!);
        return { p: project(c, centreLatLng), color: TYPE_COLORS[r.type ?? "other"] ?? TYPE_COLORS.other };
      });
      const minBuildings = validBuildings.map((b) => {
        const projected = projectRing(b.points!);
        return { points: projected, color: b.colorCode ?? "#6b8ac5" };
      });

      // Render loop.
      let lastTs = performance.now();
      const tick = () => {
        if (disposed) return;
        raf = requestAnimationFrame(tick);
        const now = performance.now();
        const dt = (now - lastTs) / 1000;
        lastTs = now;

        // Paint minimap.
        const mm = minimapRef.current;
        if (mm) {
          const ctx = mm.getContext("2d");
          if (ctx) {
            const W = mm.width, H = mm.height;
            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = darkMode ? "rgba(15,20,30,0.95)" : "rgba(240,243,247,0.96)";
            ctx.fillRect(0, 0, W, H);
            const bw = maxX - minX;
            const bh = maxZ - minZ;
            const scale = Math.min((W - 10) / Math.max(1, bw), (H - 10) / Math.max(1, bh));
            const cx = W / 2, cy = H / 2;
            const bcx = (minX + maxX) / 2;
            const bcz = (minZ + maxZ) / 2;
            for (const bl of minBuildings) {
              ctx.fillStyle = bl.color;
              ctx.globalAlpha = darkMode ? 0.28 : 0.18;
              ctx.beginPath();
              bl.points.forEach((p, i) => {
                const px = cx + (p.x - bcx) * scale;
                const py = cy + (p.z - bcz) * scale;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              });
              ctx.closePath();
              ctx.fill();
              ctx.globalAlpha = 1;
            }
            for (const r of minRooms) {
              const px = cx + (r.p.x - bcx) * scale;
              const py = cy + (r.p.z - bcz) * scale;
              ctx.fillStyle = "#" + r.color.toString(16).padStart(6, "0");
              ctx.globalAlpha = 0.85;
              ctx.beginPath();
              ctx.arc(px, py, 1.2, 0, Math.PI * 2);
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
          updateOrbit();
        } else {
          const speed = 8 * dt * (keys.has("shift") ? 3 : 1);
          const cy = Math.cos(walkLook.yaw), sy = Math.sin(walkLook.yaw);
          let ddx = 0, ddz = 0;
          if (keys.has("w") || keys.has("arrowup"))    { ddx += cy * speed; ddz += sy * speed; }
          if (keys.has("s") || keys.has("arrowdown"))  { ddx -= cy * speed; ddz -= sy * speed; }
          if (keys.has("a") || keys.has("arrowleft"))  { ddx += sy * speed; ddz -= cy * speed; }
          if (keys.has("d") || keys.has("arrowright")) { ddx -= sy * speed; ddz += cy * speed; }
          if (ddx !== 0 && !blocked(walkPos.x + ddx, walkPos.y, walkPos.z)) walkPos.x += ddx;
          if (ddz !== 0 && !blocked(walkPos.x, walkPos.y, walkPos.z + ddz)) walkPos.z += ddz;
          if (keys.has(" ") || keys.has("e"))          { walkPos.y += speed * 0.5; }
          if (keys.has("q") || keys.has("control"))    { walkPos.y = Math.max(1.2, walkPos.y - speed * 0.5); }
          updateWalk();
        }

        // Fade room labels with camera distance.
        if (mode === "orbit") {
          const labelOpacity = Math.max(0, Math.min(1, 1.4 - dist / (camDist * 1.5)));
          for (const s of labelSprites) {
            (s.material as any).opacity = labelOpacity;
            s.visible = labelOpacity > 0.02;
          }
        } else {
          for (const s of labelSprites) {
            (s.material as any).opacity = 1;
            s.visible = true;
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

        {/* Top-right: Reset + Close. */}
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

        {/* Top-left: minimap + stats. */}
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
          <p className={cn(
            "text-[10px] font-medium text-center mt-1 tabular-nums",
            darkMode ? "text-gray-400" : "text-gray-500",
          )}>
            {debugInfo.rooms} rooms · {debugInfo.buildings} buildings
          </p>
        </div>

        {/* Bottom-centre: mode toggle. */}
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

        {/* Hint. */}
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
            <div className={cn(
              "rounded-2xl border p-6 max-w-md text-center",
              darkMode ? "bg-gray-900 border-gray-800 text-gray-200" : "bg-white border-gray-200 text-gray-800",
            )}>
              <p className="font-semibold text-[15px] mb-2">3D view unavailable</p>
              <p className="text-[13px] text-muted-foreground mb-4">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-xl text-[13px] font-semibold bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.97] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
