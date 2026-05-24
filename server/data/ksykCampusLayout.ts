/**
 * KSYK campus — building outlines A, U, K, M, R, B (from floor plans)
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
};

export const KSYK_CAMPUS_BUILDINGS: CampusBuildingSeed[] = [
  {
    name: "B",
    nameEn: "B Wing",
    nameFi: "B-siipi",
    floors: 3,
    mapPositionX: 80,
    mapPositionY: 240,
    colorCode: "#059669",
    descriptionEn: "Liikunta ja näyttämö",
    customShape: [
      { x: 80, y: 240 },
      { x: 380, y: 240 },
      { x: 380, y: 530 },
      { x: 80, y: 530 },
    ],
  },
  {
    name: "R",
    nameEn: "R Wing",
    nameFi: "R-siipi",
    floors: 2,
    mapPositionX: 80,
    mapPositionY: 50,
    colorCode: "#F59E0B",
    descriptionEn: "Ravintola ja laboratoriot",
    customShape: [
      { x: 80, y: 50 },
      { x: 350, y: 50 },
      { x: 350, y: 220 },
      { x: 80, y: 220 },
    ],
  },
  {
    name: "K",
    nameEn: "K Wing",
    nameFi: "K-siipi",
    floors: 4,
    mapPositionX: 400,
    mapPositionY: 190,
    colorCode: "#DC2626",
    descriptionEn: "Keskushalli",
    customShape: [
      { x: 400, y: 190 },
      { x: 950, y: 190 },
      { x: 950, y: 510 },
      { x: 710, y: 510 },
      { x: 710, y: 370 },
      { x: 490, y: 370 },
      { x: 490, y: 510 },
      { x: 400, y: 510 },
    ],
  },
  {
    name: "M",
    nameEn: "M Wing",
    nameFi: "M-siipi",
    floors: 2,
    mapPositionX: 210,
    mapPositionY: 560,
    colorCode: "#EC4899",
    descriptionEn: "Musiikki",
    customShape: [
      { x: 210, y: 560 },
      { x: 410, y: 560 },
      { x: 410, y: 700 },
      { x: 210, y: 700 },
    ],
  },
  {
    name: "U",
    nameEn: "U Wing",
    nameFi: "U-siipi",
    floors: 4,
    mapPositionX: 970,
    mapPositionY: 130,
    colorCode: "#2563EB",
    descriptionEn: "Luokkahuoneet",
    customShape: [
      { x: 970, y: 130 },
      { x: 1320, y: 130 },
      { x: 1320, y: 490 },
      { x: 970, y: 490 },
    ],
  },
  {
    name: "A",
    nameEn: "A Wing",
    nameFi: "A-siipi",
    floors: 4,
    mapPositionX: 1280,
    mapPositionY: 190,
    colorCode: "#7C3AED",
    descriptionEn: "Hallinto ja toimistot",
    customShape: [
      { x: 1280, y: 190 },
      { x: 1520, y: 190 },
      { x: 1520, y: 620 },
      { x: 1280, y: 620 },
    ],
  },
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
  { roomNumber: "K-HALL", name: "Central Hall", nameFi: "Keskushalli", floor: 1, type: "hallway", mapPositionX: 560, mapPositionY: 320, width: 280, height: 120 },
];
