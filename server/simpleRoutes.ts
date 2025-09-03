import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple test route that works without database
  app.get('/api/test', (req, res) => {
    res.json({ message: "Server is working!", timestamp: new Date().toISOString() });
  });

  // Simple hardcoded data routes for the frontend
  app.get('/api/buildings', (req, res) => {
    const buildings = [
      { id: "1", name: "M", nameEn: "Music Building", nameFi: "Musiikkirakennus" },
      { id: "2", name: "K", nameEn: "Central Hall", nameFi: "Keskusaula" },
      { id: "3", name: "L", nameEn: "Gymnasium", nameFi: "Liikuntasali" },
      { id: "4", name: "R", nameEn: "R Building", nameFi: "R-rakennus" },
      { id: "5", name: "A", nameEn: "A Building", nameFi: "A-rakennus" },
      { id: "6", name: "U", nameEn: "U Building", nameFi: "U-rakennus" },
      { id: "7", name: "OG", nameEn: "Old Gymnasium", nameFi: "Vanha Liikuntasali" }
    ];
    res.json(buildings);
  });

  app.get('/api/rooms', (req, res) => {
    const rooms = [
      { id: "1", buildingId: "1", roomNumber: "M12", nameEn: "Music Room 12", nameFi: "Musiikkiluokka 12", floor: 1 },
      { id: "2", buildingId: "2", roomNumber: "K15", nameEn: "Central Hall 15", nameFi: "Keskusaula 15", floor: 1 },
      { id: "3", buildingId: "3", roomNumber: "L01", nameEn: "Gymnasium 1", nameFi: "Liikuntasali 1", floor: 1 },
      { id: "4", buildingId: "4", roomNumber: "R10", nameEn: "Room R10", nameFi: "Luokka R10", floor: 1 },
      { id: "5", buildingId: "5", roomNumber: "A20", nameEn: "Room A20", nameFi: "Luokka A20", floor: 1 },
      { id: "6", buildingId: "6", roomNumber: "U30", nameEn: "Room U30", nameFi: "Luokka U30", floor: 1 }
    ];
    res.json(rooms);
  });

  // Return a simple HTTP server
  const httpServer = createServer(app);
  return httpServer;
}