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

/** MazeMap-inspired palette — heavily desaturated tints, closer to
 *  greys than to their nominal hue. Rooms should read as "different
 *  functions of the same building", not as a rainbow. */
const TYPE_COLORS: Record<string, number> = {
  classroom:  0xc0c8d4, // muted blue-grey (default rooms)
  office:     0xc8c4d0, // muted purple-grey
  lab:        0xc0d0d0, // muted teal-grey
  library:    0xd0c8b8, // warm cream
  cafeteria:  0xd4c4c4, // muted red-grey
  auditorium: 0xccc4d0, // muted magenta-grey
  gym:        0xc4d0c8, // muted green-grey
  hallway:    0xe4e4e0, // very light warm grey (circulation)
  stairs:     0xd0d4d8, // near-white
  wc:         0xd0ccd4, // muted purple-grey
  bathroom:   0xd0ccd4,
  lobby:      0xd8d0c4, // warm cream
  other:      0xd4d4d0, // neutral
};

const EARTH_R = 6371000; // metres

/** Convert a lat/lng to metres relative to a centre point.
 *
 *  Shape → world axis mapping (after `rotateX(-Math.PI/2)` on the
 *  extrude geometry):
 *    - shape.x  → world +X (east)
 *    - shape.y  → world -Z (i.e. positive shape.y goes into the screen)
 *
 *  We want increasing lng → east → world +X and increasing lat →
 *  north → world -Z. So the shape's y coordinate must be POSITIVE
 *  when we're south of the centre and NEGATIVE when we're north of
 *  it. `dLat` is positive north → we return positive z when SOUTH
 *  (i.e. `-dLat`), and the shape/rotation flip lands north at world
 *  -Z automatically.  Getting this right removes the horizontal
 *  mirror the earlier v4.7.49 build had.
 */
function project(p: LatLng, centre: LatLng): { x: number; z: number } {
  const dLng = (p.lng - centre.lng) * Math.PI / 180;
  const dLat = (p.lat - centre.lat) * Math.PI / 180;
  return {
    x: dLng * Math.cos(centre.lat * Math.PI / 180) * EARTH_R,
    z: dLat * EARTH_R,
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

  // MazeMap-inspired palette — warm off-whites, cream tones, soft
  // shadows.  Buildings default to a neutral warm ivory (like real
  // wall plaster) with slightly darker roofs.
  const palette = useMemo(() => darkMode ? {
    sky:         0x1a1f28,
    ground:      0x1e2028,
    plate:       0x2c2f38, // building wall
    plateTop:    0x252831, // building roof (slightly darker than wall)
    edge:        0x121620,
    ambient1:    0xffffff,
    ambient2:    0x1a1f28,
    label:       "rgba(20,24,32,0.94)",
    labelText:   "#f1f5f9",
    labelBorder: "rgba(255,255,255,0.10)",
    shadow:      0x000000,
    shadowOpacity: 0.35,
  } : {
    sky:         0xf7f5f0, // very soft warm off-white
    ground:      0xe8e5e0, // MazeMap ground — warm neutral
    plate:       0xf5f2ec, // building wall — ivory
    plateTop:    0xe4e1db, // building roof — slightly darker cream
    edge:        0xc9c5be, // wall edge — muted warm grey
    ambient1:    0xffffff,
    ambient2:    0xe0dcd4,
    label:       "rgba(255,255,255,0.97)",
    labelText:   "#2c2f38",
    labelBorder: "rgba(0,0,0,0.08)",
    shadow:      0x000000,
    shadowOpacity: 0.15,
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
        // v1.0.6 — stay in loading state rather than showing the
        // "3D view unavailable" error card.  Arrays are empty either
        // because the fetch is in flight (common on cold load) or the
        // published snapshot is empty.  Either way the parent re-runs
        // this effect when `rooms`/`buildings` resolve.  Leaving
        // `error` null and `ready` false keeps the inline spinner up.
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
      // MazeMap-style: warm sky, warm ground, soft directional sun
      // casting a gentle shadow. Buildings cast + ground receives so
      // the campus reads as a real 3D model rather than flat shapes.
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(palette.sky);
      // Very soft distance fog that only begins past 3× the campus
      // extent — distant buildings dissolve into the sky instead of
      // cutting off sharply, but anything close stays crisp.
      scene.fog = new THREE.Fog(palette.sky, extentR * 3, extentR * 8);

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.5, extentR * 20);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);

      // Hemisphere light fills in ambient; sun is a soft directional
      // for subtle shading on building sides + the ground shadow.
      scene.add(new THREE.HemisphereLight(palette.ambient1, palette.ambient2, 0.9));
      const sun = new THREE.DirectionalLight(0xffffff, 0.55);
      sun.position.set(extentR * 0.9, extentR * 2.5, extentR * 1.3);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = extentR * 8;
      // Fit the shadow frustum to the campus extent so the shadow is
      // sharp instead of blurry-everything-at-once.
      const shadowFit = extentR * 1.4;
      sun.shadow.camera.left = -shadowFit;
      sun.shadow.camera.right = shadowFit;
      sun.shadow.camera.top = shadowFit;
      sun.shadow.camera.bottom = -shadowFit;
      sun.shadow.bias = -0.0005;
      sun.shadow.radius = 2.5;
      scene.add(sun);

      // Ground plane. Receives shadows from buildings — this is what
      // makes the scene feel grounded like MazeMap does.
      const groundSize = Math.max(2000, extentR * 8);
      const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
      const groundMat = new THREE.MeshStandardMaterial({
        color: palette.ground,
        roughness: 1,
        metalness: 0,
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.05;
      ground.receiveShadow = true;
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

        // Wall extrusion — solid opaque matte ivory. MazeMap-style:
        // walls stop just short of the top so the roof cap reads as a
        // distinct lid.
        const wallHeight = Math.max(0.1, total - 0.4);
        const wallGeo = new THREE.ExtrudeGeometry(shape, {
          depth: wallHeight,
          bevelEnabled: false,
        });
        wallGeo.rotateX(-Math.PI / 2);
        const wallMat = new THREE.MeshStandardMaterial({
          color: palette.plate,
          roughness: 0.96,
          metalness: 0,
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.castShadow = true;
        wall.receiveShadow = true;
        buildingGroup.add(wall);

        // Hairline edges only on the top ring of the walls — a crisp
        // "where the roof meets the wall" line without the full-height
        // outline that was turning buildings into wireframe boxes.
        const wallEdgeGeo = new THREE.EdgesGeometry(wallGeo, 20);
        const wallEdgeMat = new THREE.LineBasicMaterial({
          color: palette.edge,
          transparent: true,
          opacity: darkMode ? 0.5 : 0.35,
        });
        const wallEdges = new THREE.LineSegments(wallEdgeGeo, wallEdgeMat);
        buildingGroup.add(wallEdges);

        // Roof cap — slightly darker than the wall, same shape. This
        // is MazeMap's signature: a quiet, slightly darker lid that
        // reads as the top of the building, never a bright accent.
        // Admin-set brand colour (if any) tints the roof subtly so a
        // building keeps its identity on the campus overview.
        const roofColour = new THREE.Color(palette.plateTop);
        if (b.colorCode) {
          const brand = new THREE.Color(b.colorCode);
          // Mix 85% plate-top + 15% brand so the tint is a hint, not
          // a scream. Produces the MazeMap "warm cream with a
          // whisper of blue/red/green" look.
          roofColour.lerp(brand, 0.15);
        }
        const roofGeo = new THREE.ExtrudeGeometry(shape, {
          depth: 0.4,
          bevelEnabled: false,
        });
        roofGeo.rotateX(-Math.PI / 2);
        const roofMat = new THREE.MeshStandardMaterial({
          color: roofColour,
          roughness: 0.92,
          metalness: 0,
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = wallHeight;
        roof.castShadow = true;
        roof.receiveShadow = true;
        buildingGroup.add(roof);

        // Roof top outline — slightly darker than the roof itself to
        // give the top edge definition without a hard line.
        const roofEdgeGeo = new THREE.EdgesGeometry(roofGeo, 20);
        const roofEdgeMat = new THREE.LineBasicMaterial({
          color: roofColour.clone().multiplyScalar(0.78),
          transparent: true,
          opacity: 0.5,
        });
        const roofEdges = new THREE.LineSegments(roofEdgeGeo, roofEdgeMat);
        roofEdges.position.y = wallHeight;
        buildingGroup.add(roofEdges);
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
          roughness: 0.92,
          metalness: 0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = baseY;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { room: r };
        roomGroup.add(mesh);

        // Subtle hairline on room edges — same muted tone as building
        // walls so the whole scene reads coherent.
        const edgeGeo = new THREE.EdgesGeometry(geo);
        const edgeMat = new THREE.LineBasicMaterial({
          color: palette.edge,
          transparent: true,
          opacity: darkMode ? 0.55 : 0.4,
        });
        const edges = new THREE.LineSegments(edgeGeo, edgeMat);
        edges.position.copy(mesh.position);
        roomGroup.add(edges);

        // Room label — a tight MazeMap-style white pill with a hairline
        // border. Smaller than before, always face camera, depth-tested
        // so it occludes behind building roofs when a room is on a
        // lower floor hidden by a storey above.
        if (r.roomNumber) {
          const c = centroid(r.points!);
          const p = project(c, centreLatLng);

          // 2× resolution for crisp text on retina displays.
          const DPR = 2;
          const canvas = document.createElement("canvas");
          canvas.width = 160 * DPR; canvas.height = 48 * DPR;
          const ctx = canvas.getContext("2d")!;
          ctx.scale(DPR, DPR);
          ctx.font = "600 22px -apple-system, system-ui, Segoe UI, Roboto, sans-serif";
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";
          const m = ctx.measureText(r.roomNumber);
          const pillW = Math.max(44, m.width + 20);
          const pillH = 30;
          const pillX = (160 - pillW) / 2;
          const pillY = (48 - pillH) / 2;
          ctx.fillStyle = palette.label;
          ctx.beginPath();
          // @ts-ignore roundRect exists on modern canvas
          ctx.roundRect?.(pillX, pillY, pillW, pillH, 8);
          ctx.fill();
          ctx.strokeStyle = palette.labelBorder;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = palette.labelText;
          ctx.fillText(r.roomNumber, 80, 24);

          const tex = new THREE.CanvasTexture(canvas);
          tex.minFilter = THREE.LinearFilter;
          tex.anisotropy = Math.max(1, renderer.capabilities.getMaxAnisotropy?.() ?? 1);
          const spriteMat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthTest: false,
            depthWrite: false,
          });
          const sprite = new THREE.Sprite(spriteMat);
          // Smaller than v4.7.54 — MazeMap labels are discreet.
          const labelScale = Math.max(3.5, Math.min(10, extentR * 0.025));
          sprite.scale.set(labelScale, labelScale * 0.3, 1);
          sprite.position.set(p.x, baseY + slabH + labelScale * 0.5, p.z);
          sprite.renderOrder = 999;
          roomGroup.add(sprite);
          labelSprites.push(sprite);
        }
      }

      // ── Camera ─────────────────────────────────────────────────
      //
      // yaw = π/4 puts the camera SE of target, looking NW. Combined
      // with our project() sign convention (north = world -Z), this
      // lands north at the TOP of the screen and east on the RIGHT
      // — the intuitive map orientation everyone expects.
      const initialYaw = Math.PI / 4;
      const initialPitch = Math.PI / 4;
      let yaw = initialYaw, pitch = initialPitch, dist = camDist;

      // Aim at the middle of the extent (relative to our centre).
      // minZ/maxZ are project-space (shape.y); world Z = -shape.y, so
      // we negate the mid to get the world-space target.
      const target = new THREE.Vector3(
        (minX + maxX) / 2,
        Math.max(6, extentR * 0.05),
        -(minZ + maxZ) / 2,
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

      // Input with MazeMap-style inertia — camera keeps gliding after
      // you let go of the mouse, decaying smoothly.
      let dragging = false;
      let lastX = 0, lastY = 0;
      let yawVel = 0, pitchVel = 0; // orbit inertia
      let lookYawVel = 0, lookPitchVel = 0; // walk inertia
      const INERTIA_DECAY = 0.90; // per-frame damping (approx 60fps)
      const cv = renderer.domElement;
      cv.style.cursor = "grab";

      const onPointerDown = (e: PointerEvent) => {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        cv.style.cursor = "grabbing";
        cv.setPointerCapture?.(e.pointerId);
        autoRotate = false;
        yawVel = 0; pitchVel = 0; lookYawVel = 0; lookPitchVel = 0;
      };
      const onPointerUp = () => { dragging = false; cv.style.cursor = "grab"; };
      const onPointerMove = (e: PointerEvent) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        if (mode === "orbit") {
          const yawDelta = -dx * 0.005;
          const pitchDelta = dy * 0.004;
          yaw += yawDelta;
          pitch = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, pitch + pitchDelta));
          // Store the last applied delta as velocity for inertia.
          yawVel = yawDelta;
          pitchVel = pitchDelta;
        } else {
          const yawDelta = dx * 0.004;
          const pitchDelta = -dy * 0.004;
          walkLook.yaw += yawDelta;
          walkLook.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, walkLook.pitch + pitchDelta));
          lookYawVel = yawDelta;
          lookPitchVel = pitchDelta;
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
          // Apply inertia from the last drag — camera keeps gliding
          // after release and decays over a few frames. Threshold
          // kills tiny velocities so we don't thrash.
          if (!dragging) {
            if (Math.abs(yawVel) > 0.0001) {
              yaw += yawVel;
              yawVel *= INERTIA_DECAY;
            } else {
              yawVel = 0;
            }
            if (Math.abs(pitchVel) > 0.0001) {
              pitch = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, pitch + pitchVel));
              pitchVel *= INERTIA_DECAY;
            } else {
              pitchVel = 0;
            }
          }
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
          // Look inertia for walk mode.
          if (!dragging) {
            if (Math.abs(lookYawVel) > 0.0001) {
              walkLook.yaw += lookYawVel;
              lookYawVel *= INERTIA_DECAY;
            } else {
              lookYawVel = 0;
            }
            if (Math.abs(lookPitchVel) > 0.0001) {
              walkLook.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, walkLook.pitch + lookPitchVel));
              lookPitchVel *= INERTIA_DECAY;
            } else {
              lookPitchVel = 0;
            }
          }
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

        {/* v1.0.6 — Wilma-style loading + error overlays */}
        {(!ready && !error) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={cn(
              "inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] px-3 py-2 rounded-[6px] border",
              darkMode
                ? "bg-gray-950 border-[#2a3040] text-gray-200"
                : "bg-white border-[#d5dae0] text-gray-700",
            )}>
              <span className="h-3 w-3 rounded-full border-2 border-[#003d82] dark:border-[#4a90d9] border-t-transparent animate-spin" />
              Loading 3D view
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className={cn(
              "rounded-[6px] border max-w-md w-full overflow-hidden text-left",
              darkMode ? "bg-gray-950 border-[#2a3040]" : "bg-white border-[#d5dae0]",
              "border-t-[3px] border-t-[#003d82]",
            )}>
              <div className="p-5">
                <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#003d82] dark:text-[#4a90d9] mb-1">
                  3D view
                </p>
                <p className="font-bold text-[18px] tracking-tight text-gray-900 dark:text-white mb-2">
                  Can't open 3D right now
                </p>
                <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed">
                  {error}
                </p>
              </div>
              <div className="border-t border-[#d5dae0] dark:border-[#2a3040] p-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full h-10 rounded-[6px] bg-[#003d82] hover:bg-[#002d5f] text-white text-[13px] font-bold inline-flex items-center justify-center transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
