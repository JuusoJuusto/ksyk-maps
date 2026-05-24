/**
 * Seed full KSYK campus layout (buildings + key rooms) to Firebase
 * Based on Kulosaaren yhteiskoulu floor plans
 */

import { firebaseStorage } from "./firebaseStorage.js";
import { KSYK_CAMPUS_BUILDINGS, KSYK_SPECIAL_ROOMS } from "./data/ksykCampusLayout.js";

async function seedKSYKCampus() {
  console.log("🏫 Seeding KSYK campus layout...");

  const existing = await firebaseStorage.getBuildings();
  const byName = new Map(existing.map((b) => [b.name, b]));

  for (const wing of KSYK_CAMPUS_BUILDINGS) {
    const payload = {
      name: wing.name,
      nameEn: wing.nameEn,
      nameFi: wing.nameFi,
      floors: wing.floors,
      mapPositionX: wing.mapPositionX,
      mapPositionY: wing.mapPositionY,
      colorCode: wing.colorCode,
      descriptionEn: wing.descriptionEn,
      description: JSON.stringify({ customShape: wing.customShape }),
      isActive: true,
    };

    const current = byName.get(wing.name);
    if (current) {
      await firebaseStorage.updateBuilding(current.id, { ...current, ...payload });
      console.log(`🔄 Updated wing ${wing.name}`);
      byName.set(wing.name, { ...current, ...payload });
    } else {
      const created = await firebaseStorage.createBuilding(payload as any);
      console.log(`✅ Created wing ${wing.name}`);
      byName.set(wing.name, created);
    }
  }

  const existingRooms = await firebaseStorage.getRooms();
  const roomNums = new Set(existingRooms.map((r) => r.roomNumber));

  for (const room of KSYK_SPECIAL_ROOMS) {
    if (roomNums.has(room.roomNumber)) continue;

    let wing = room.roomNumber.match(/^([A-Z])/)?.[1] || "K";
    if (room.roomNumber.startsWith("K-") || room.roomNumber === "PIKKUSALI") wing = "K";
    if (room.roomNumber === "RAVINTOLA") wing = "R";
    if (room.roomNumber === "KANSLIA") wing = "A";
    if (room.roomNumber.startsWith("L")) wing = "L";
    const building = byName.get(wing);
    if (!building?.id) {
      console.warn(`⚠️ No building for room ${room.roomNumber}`);
      continue;
    }

    await firebaseStorage.createRoom({
      buildingId: building.id,
      roomNumber: room.roomNumber,
      name: room.name,
      nameEn: room.name,
      nameFi: room.nameFi,
      floor: room.floor,
      type: room.type,
      capacity: room.capacity ?? 30,
      mapPositionX: room.mapPositionX,
      mapPositionY: room.mapPositionY,
      width: room.width,
      height: room.height,
      isActive: true,
      isPublic: true,
      currentStatus: "free",
    } as any);
    console.log(`✅ Room ${room.roomNumber}`);
  }

  console.log("🎉 KSYK campus seed complete");
}

seedKSYKCampus()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

export { seedKSYKCampus };
