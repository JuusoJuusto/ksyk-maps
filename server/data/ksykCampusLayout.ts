/**
 * Kulosaaren yhteiskoulu (KSYK) campus layout from official floor plans.
 * Building wings: S, R, K, H, A, U, M, L
 */

export type CampusBuildingSeed = {
  name: string;
  nameEn: string;
  nameFi: string;
  floors: number;
  mapPositionX: number;
  mapPositionY: number;
  colorCode: string;
  descriptionEn: string;
  customShape: { x: number; y: number }[];
  entrances?: string[];
};

export const KSYK_CAMPUS_BUILDINGS: CampusBuildingSeed[] = [
  {
    name: "R",
    nameEn: "R Wing — Restaurant & Labs",
    nameFi: "R-siipi — Ravintola",
    floors: 2,
    mapPositionX: 80,
    mapPositionY: 60,
    colorCode: "#F59E0B",
    descriptionEn: "Ravintola, keittiö, laboratoriot",
    entrances: ["G"],
    customShape: [
      { x: 80, y: 60 },
      { x: 340, y: 60 },
      { x: 340, y: 220 },
      { x: 80, y: 220 },
    ],
  },
  {
    name: "H",
    nameEn: "H Wing — Assembly",
    nameFi: "H-siipi — Juhlasali",
    floors: 2,
    mapPositionX: 380,
    mapPositionY: 60,
    colorCode: "#7C3AED",
    descriptionEn: "Pikkusali, juhlasali",
    entrances: ["H"],
    customShape: [
      { x: 380, y: 60 },
      { x: 760, y: 60 },
      { x: 760, y: 200 },
      { x: 380, y: 200 },
    ],
  },
  {
    name: "K",
    nameEn: "K Wing — Central Hall",
    nameFi: "K-siipi — Keskushalli",
    floors: 4,
    mapPositionX: 420,
    mapPositionY: 200,
    colorCode: "#DC2626",
    descriptionEn: "Keskushalli, luokkahuoneet, pääaula",
    entrances: ["A", "K", "L"],
    customShape: [
      { x: 420, y: 200 },
      { x: 960, y: 200 },
      { x: 960, y: 520 },
      { x: 720, y: 520 },
      { x: 720, y: 400 },
      { x: 560, y: 400 },
      { x: 560, y: 520 },
      { x: 420, y: 520 },
    ],
  },
  {
    name: "L",
    nameEn: "L Wing — Library",
    nameFi: "L-siipi — Kirjasto",
    floors: 2,
    mapPositionX: 300,
    mapPositionY: 320,
    colorCode: "#10B981",
    descriptionEn: "Kirjasto L21",
    entrances: ["F"],
    customShape: [
      { x: 300, y: 320 },
      { x: 420, y: 320 },
      { x: 420, y: 440 },
      { x: 300, y: 440 },
    ],
  },
  {
    name: "S",
    nameEn: "S Wing — Sports & Stage",
    nameFi: "S-siipi — Liikunta",
    floors: 3,
    mapPositionX: 60,
    mapPositionY: 260,
    colorCode: "#059669",
    descriptionEn: "Liikuntahalli, S21, näyttämö",
    entrances: ["B", "C", "D", "E", "F"],
    customShape: [
      { x: 60, y: 260 },
      { x: 360, y: 260 },
      { x: 360, y: 540 },
      { x: 60, y: 540 },
    ],
  },
  {
    name: "U",
    nameEn: "U Wing — Classrooms",
    nameFi: "U-siipi — Luokat",
    floors: 4,
    mapPositionX: 1000,
    mapPositionY: 140,
    colorCode: "#2563EB",
    descriptionEn: "Luokkahuoneet U11–U43",
    entrances: ["I", "K"],
    customShape: [
      { x: 1000, y: 140 },
      { x: 1360, y: 140 },
      { x: 1360, y: 500 },
      { x: 1000, y: 500 },
    ],
  },
  {
    name: "A",
    nameEn: "A Wing — Admin",
    nameFi: "A-siipi — Hallinto",
    floors: 4,
    mapPositionX: 1320,
    mapPositionY: 220,
    colorCode: "#8B5CF6",
    descriptionEn: "Kanslia, toimistot, katto-terassi",
    entrances: ["J", "I"],
    customShape: [
      { x: 1320, y: 220 },
      { x: 1540, y: 220 },
      { x: 1540, y: 640 },
      { x: 1320, y: 640 },
    ],
  },
  {
    name: "M",
    nameEn: "M Wing — Music",
    nameFi: "M-siipi — Musiikki",
    floors: 2,
    mapPositionX: 220,
    mapPositionY: 580,
    colorCode: "#EC4899",
    descriptionEn: "Musiikkiluokat M1, M2",
    entrances: ["M"],
    customShape: [
      { x: 220, y: 580 },
      { x: 400, y: 580 },
      { x: 400, y: 700 },
      { x: 220, y: 700 },
    ],
  },
];

export const KSYK_ENTRANCES = [
  { id: "A", label: "A", x: 700, y: 540 },
  { id: "B", label: "B", x: 120, y: 400 },
  { id: "C", label: "C", x: 100, y: 350 },
  { id: "G", label: "G", x: 200, y: 80 },
  { id: "H", label: "H", x: 560, y: 80 },
  { id: "I", label: "I", x: 1200, y: 120 },
  { id: "J", label: "J", x: 1400, y: 600 },
  { id: "M", label: "M", x: 310, y: 700 },
];

export const KSYK_SPECIAL_ROOMS: Array<{
  roomNumber: string;
  name: string;
  nameFi: string;
  floor: number;
  type: string;
  mapPositionX: number;
  mapPositionY: number;
  width: number;
  height: number;
  capacity?: number;
}> = [
  { roomNumber: "K-HALL", name: "Central Hall", nameFi: "Keskushalli", floor: 1, type: "hallway", mapPositionX: 580, mapPositionY: 340, width: 300, height: 140, capacity: 200 },
  { roomNumber: "K-HALL-2", name: "Central Hall", nameFi: "Keskushalli", floor: 2, type: "hallway", mapPositionX: 580, mapPositionY: 340, width: 300, height: 140, capacity: 200 },
  { roomNumber: "K-HALL-3", name: "Central Hall", nameFi: "Keskushalli", floor: 3, type: "hallway", mapPositionX: 580, mapPositionY: 340, width: 300, height: 140, capacity: 200 },
  { roomNumber: "L21", name: "Library", nameFi: "Kirjasto", floor: 2, type: "library", mapPositionX: 310, mapPositionY: 330, width: 100, height: 90, capacity: 80 },
  { roomNumber: "S21", name: "New Hall", nameFi: "Uusi sali", floor: 2, type: "hallway", mapPositionX: 100, mapPositionY: 340, width: 220, height: 150, capacity: 150 },
  { roomNumber: "R11", name: "Gym", nameFi: "Kuntosali", floor: 1, type: "gym", mapPositionX: 90, mapPositionY: 320, width: 110, height: 200, capacity: 60 },
  { roomNumber: "RAVINTOLA", name: "Cafeteria", nameFi: "Ravintola", floor: 2, type: "cafeteria", mapPositionX: 100, mapPositionY: 80, width: 140, height: 120, capacity: 200 },
  { roomNumber: "M1", name: "Music Room", nameFi: "Musiikkihuone", floor: 1, type: "classroom", mapPositionX: 240, mapPositionY: 600, width: 70, height: 50, capacity: 25 },
  { roomNumber: "M2", name: "Music Room", nameFi: "Musiikkihuone", floor: 1, type: "classroom", mapPositionX: 320, mapPositionY: 600, width: 70, height: 50, capacity: 25 },
  { roomNumber: "PIKKUSALI", name: "Small Hall", nameFi: "Pikkusali", floor: 3, type: "hallway", mapPositionX: 400, mapPositionY: 70, width: 320, height: 100, capacity: 100 },
  { roomNumber: "KANSLIA", name: "Office", nameFi: "Kanslia", floor: 2, type: "office", mapPositionX: 1340, mapPositionY: 500, width: 90, height: 110, capacity: 20 },
];
