import { storage } from "./storage";
import { createOwnerAdmin } from "./createOwnerAdmin";

export async function seedDatabase() {
  try {
    console.log("🌱 Seeding database with sample data...");
    
    // Create owner admin first
    await createOwnerAdmin();

    // Create sample announcements
    const announcements = [
      {
        title: "Welcome to KSYK Map!",
        titleEn: "Welcome to KSYK Map!",
        titleFi: "Tervetuloa KSYK Karttaan!",
        content: "The new campus navigation system is now live. Find rooms, staff, and navigate the campus with ease.",
        contentEn: "The new campus navigation system is now live. Find rooms, staff, and navigate the campus with ease.",
        contentFi: "Uusi kampuksen navigointijärjestelmä on nyt käytössä. Löydä huoneita, henkilökuntaa ja navigoi kampuksella helposti.",
        priority: "high",
        authorId: "owner-admin-user"
      },
      {
        title: "Library Hours Extended",
        titleEn: "Library Hours Extended",
        titleFi: "Kirjaston aukioloaikoja pidennetty",
        content: "The library (Room U40) is now open until 8 PM on weekdays to support student studies.",
        contentEn: "The library (Room U40) is now open until 8 PM on weekdays to support student studies.",
        contentFi: "Kirjasto (Huone U40) on nyt auki arkisin kello 20:00 asti tukemaan opiskelijoiden opiskelua.",
        priority: "normal",
        authorId: "owner-admin-user"
      },
      {
        title: "Fire Drill Next Week",
        titleEn: "Fire Drill Next Week",
        titleFi: "Paloharjoitus ensi viikolla",
        content: "A fire drill will be conducted next Tuesday at 2 PM. Please follow emergency exit signs and gather at the main courtyard.",
        contentEn: "A fire drill will be conducted next Tuesday at 2 PM. Please follow emergency exit signs and gather at the main courtyard.",
        contentFi: "Paloharjoitus järjestetään ensi tiistaina kello 14:00. Seuraa hätäpoistumismerkkejä ja kokoonnu pääpihalle.",
        priority: "urgent",
        authorId: "owner-admin-user"
      },
      {
        title: "New Art Exhibition",
        titleEn: "New Art Exhibition",
        titleFi: "Uusi taidenäyttely",
        content: "Student artwork is now on display in the Art Studio (K35). Come see the amazing creativity of our students!",
        contentEn: "Student artwork is now on display in the Art Studio (K35). Come see the amazing creativity of our students!",
        contentFi: "Opiskelijoiden taideteoksia on nyt esillä Taidestudiossa (K35). Tule katsomaan opiskelijoidemme hämmästyttävää luovuutta!",
        priority: "low",
        authorId: "owner-admin-user"
      }
    ];

    // Create sample staff members
    const staffMembers = [
      {
        firstName: "Maria",
        lastName: "Virtanen",
        email: "maria.virtanen@ksyk.fi",
        position: "Principal",
        positionEn: "Principal",
        positionFi: "Rehtori",
        department: "Administration",
        departmentEn: "Administration",
        departmentFi: "Hallinto",
        officeRoomId: "17" // A35 - Principal's Office
      },
      {
        firstName: "Jukka",
        lastName: "Korhonen",
        email: "jukka.korhonen@ksyk.fi",
        position: "Music Teacher",
        positionEn: "Music Teacher",
        positionFi: "Musiikinopettaja",
        department: "Arts",
        departmentEn: "Arts",
        departmentFi: "Taiteet",
        officeRoomId: "1" // M12 - Music Room
      },
      {
        firstName: "Anna",
        lastName: "Lindström",
        email: "anna.lindstrom@ksyk.fi",
        position: "Science Teacher",
        positionEn: "Science Teacher",
        positionFi: "Luonnontieteiden opettaja",
        department: "Sciences",
        departmentEn: "Sciences",
        departmentFi: "Luonnontieteet",
        officeRoomId: "12" // R10 - Chemistry Lab
      },
      {
        firstName: "Mikael",
        lastName: "Andersson",
        email: "mikael.andersson@ksyk.fi",
        position: "Physical Education Teacher",
        positionEn: "Physical Education Teacher",
        positionFi: "Liikunnanopettaja",
        department: "Physical Education",
        departmentEn: "Physical Education",
        departmentFi: "Liikunta",
        officeRoomId: "9" // L01 - Main Gymnasium
      },
      {
        firstName: "Liisa",
        lastName: "Hakkarainen",
        email: "liisa.hakkarainen@ksyk.fi",
        position: "Librarian",
        positionEn: "Librarian",
        positionFi: "Kirjastonhoitaja",
        department: "Library Services",
        departmentEn: "Library Services",
        departmentFi: "Kirjastopalvelut",
        officeRoomId: "20" // U40 - Library
      },
      {
        firstName: "Petri",
        lastName: "Mäkinen",
        email: "petri.makinen@ksyk.fi",
        position: "IT Coordinator",
        positionEn: "IT Coordinator",
        positionFi: "IT-koordinaattori",
        department: "Technology",
        departmentEn: "Technology",
        departmentFi: "Teknologia",
        officeRoomId: "18" // U30 - Computer Lab
      }
    ];

    // Create sample events
    const events = [
      {
        title: "School Assembly",
        titleEn: "School Assembly",
        titleFi: "Koulukokous",
        description: "Monthly school assembly for all students and staff",
        descriptionEn: "Monthly school assembly for all students and staff",
        descriptionFi: "Kuukausittainen koulukokous kaikille opiskelijoille ja henkilökunnalle",
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour later
        location: "Main Gymnasium",
        roomId: "9", // L01 - Main Gymnasium
        organizerId: null,
        isPublic: true
      },
      {
        title: "Science Fair",
        titleEn: "Science Fair",
        titleFi: "Tiedemessut",
        description: "Annual science fair showcasing student projects",
        descriptionEn: "Annual science fair showcasing student projects",
        descriptionFi: "Vuosittaiset tiedemessut, joissa esitellään opiskelijoiden projekteja",
        startTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // In 2 weeks
        endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
        location: "Central Hall",
        roomId: "5", // K15 - Main Classroom
        organizerId: null,
        isPublic: true
      }
    ];

    // Seed announcements
    for (const announcement of announcements) {
      try {
        await storage.createAnnouncement(announcement);
        console.log(`✅ Created announcement: ${announcement.title}`);
      } catch (error) {
        console.log(`⚠️ Announcement already exists or error: ${announcement.title}`);
      }
    }

    // Seed staff members
    for (const staff of staffMembers) {
      try {
        await storage.createStaffMember(staff);
        console.log(`✅ Created staff member: ${staff.firstName} ${staff.lastName}`);
      } catch (error) {
        console.log(`⚠️ Staff member already exists or error: ${staff.firstName} ${staff.lastName}`);
      }
    }

    // Seed events
    for (const event of events) {
      try {
        await storage.createEvent(event);
        console.log(`✅ Created event: ${event.title}`);
      } catch (error) {
        console.log(`⚠️ Event already exists or error: ${event.title}`);
      }
    }

    console.log("🎉 Database seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}