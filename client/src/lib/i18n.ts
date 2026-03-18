import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Navigation
      'nav.map': 'Map',
      'nav.directory': 'Directory',
      'nav.schedule': 'Schedule',
      'nav.events': 'Events',
      'nav.information': 'Information',
      'nav.admin': 'Admin',
      
      // Hero section
      'hero.title': 'Welcome to KSYK Map',
      'hero.subtitle': 'Navigate our campus with ease • 1151 students • 40+ nationalities',
      
      // Search
      'search.placeholder': 'Search for rooms, staff, facilities...',
      'search.rooms': 'Search Rooms',
      'search.navigate': 'Navigate',
      
      // Map
      'map.title': 'Campus Map',
      'map.zoomIn': 'Zoom In',
      'map.floors': 'Floors',
      'map.legend': 'Legend',
      'map.academic': 'Academic',
      'map.sports': 'Sports',
      'map.library': 'Library',
      'map.music': 'Music',
      
      // Buildings
      'building.uwing': 'U-Wing',
      'building.uwing.desc': 'Classrooms',
      'building.main': 'Main Building',
      'building.main.desc': 'Administration',
      'building.library': 'Library',
      'building.library.desc': 'Study Spaces',
      'building.music': 'School of Rock',
      'building.music.desc': 'Music Building',
      'building.gym': 'Gymnasiums',
      'building.gym.desc': 'Sports Facilities',
      'building.lab': 'Laboratories',
      'building.lab.desc': 'Science Labs',
      
      // Quick Actions
      'actions.title': 'Quick Actions',
      'actions.directions': 'Get Directions',
      'actions.findStaff': 'Find Staff',
      'actions.events': "Today's Events",
      'actions.emergency': 'Emergency Info',
      
      // Status
      'status.title': 'Campus Status',
      'status.buildingHours': 'Building Hours',
      'status.library': 'Library',
      'status.cafeteria': 'Cafeteria',
      'status.itSupport': 'IT Support',
      'status.open': 'Open',
      'status.closed': 'Closed',
      'status.available': 'Available',
      'status.openUntil': 'Open until 20:00',
      
      // Announcements
      'announcements.title': 'Announcements',
      'announcements.clickDetails': 'Click for more details',
      'announcements.recently': 'Recently',
      'announcements.urgent': 'This is an urgent announcement. Please take immediate action if required.',
      'announcements.high': 'This is a high priority announcement. Please review carefully.',
      
      // Staff Directory
      'staff.title': 'Staff Directory',
      'staff.add': 'Add Staff',
      'staff.search': 'Search staff...',
      'staff.allDepartments': 'All Departments',
      'staff.administration': 'Administration',
      'staff.teaching': 'Teaching Staff',
      'staff.support': 'Support Staff',
      'staff.locate': 'Locate',
      'staff.contact': 'Contact',
      
      // Admin
      'admin.title': 'Admin Dashboard',
      'admin.totalStudents': 'Total Students',
      'admin.staffMembers': 'Staff Members',
      'admin.buildings': 'Buildings',
      'admin.recentActivity': 'Recent Activity',
      'admin.adminTools': 'Admin Tools',
      'admin.editMap': 'Edit Map',
      'admin.addStaff': 'Add Staff',
      'admin.announcements': 'Announcements',
      'admin.settings': 'Settings',
      
      // Mobile Menu & Themes
      'mobile.menu': 'Menu',
      'mobile.close': 'Close',
      'mobile.theme': 'Theme',
      'mobile.language': 'Language',
      'mobile.quickActions': 'Quick Actions',
      'theme.light': 'Light',
      'theme.dark': 'Dark',
      'theme.light.desc': 'Clean & bright interface',
      'theme.dark.desc': 'Easy on the eyes',
      'theme.current': 'Current theme',
      'theme.clickToCycle': 'Click to cycle themes',
      
      // Languages
      'language.english': 'English',
      'language.finnish': 'Finnish',
      'language.suomi': 'Suomi',
      
      // Quick Actions Mobile
      'quickActions.lunch': 'Lunch Menu',
      'quickActions.transport': 'HSL Transport',
      'quickActions.admin': 'Admin Panel',
      
      // Common
      'login': 'Log In',
      'logout': 'Log Out',
      'close': 'Close',
      'save': 'Save',
      'cancel': 'Cancel',
      'loading': 'Loading...',
      'unauthorized': 'Unauthorized',
      'unauthorized.desc': 'You are logged out. Logging in again...',
    }
  },
  fi: {
    translation: {
      // Navigation
      'nav.map': 'Kartta',
      'nav.directory': 'Henkilöstö',
      'nav.schedule': 'Lukujärjestys',
      'nav.events': 'Tapahtumat',
      'nav.information': 'Tietoa',
      'nav.admin': 'Hallinta',
      
      // Hero section
      'hero.title': 'Tervetuloa KSYK Map',
      'hero.subtitle': 'Navigoi kampuksella helposti • 1151 oppilasta • 40+ kansallisuutta',
      
      // Search
      'search.placeholder': 'Etsi luokkia, henkilöstöä, tiloja...',
      'search.rooms': 'Etsi huoneita',
      'search.navigate': 'Navigoi',
      
      // Map
      'map.title': 'Kampuskartta',
      'map.zoomIn': 'Lähennä',
      'map.floors': 'Kerrokset',
      'map.legend': 'Selite',
      'map.academic': 'Opetus',
      'map.sports': 'Liikunta',
      'map.library': 'Kirjasto',
      'map.music': 'Musiikki',
      
      // Buildings
      'building.uwing': 'U-siipi',
      'building.uwing.desc': 'Luokkahuoneet',
      'building.main': 'Päärakennus',
      'building.main.desc': 'Hallinto',
      'building.library': 'Kirjasto',
      'building.library.desc': 'Opiskelutilat',
      'building.music': 'School of Rock',
      'building.music.desc': 'Musiikkirakennus',
      'building.gym': 'Liikuntasalit',
      'building.gym.desc': 'Liikuntatilat',
      'building.lab': 'Laboratoriot',
      'building.lab.desc': 'Tieteen laboratoriot',
      
      // Quick Actions
      'actions.title': 'Pikatoiminnot',
      'actions.directions': 'Hae reittiohjeet',
      'actions.findStaff': 'Etsi henkilöstöä',
      'actions.events': 'Tämän päivän tapahtumat',
      'actions.emergency': 'Hätätiedot',
      
      // Status
      'status.title': 'Kampuksen tila',
      'status.buildingHours': 'Rakennuksen aukioloajat',
      'status.library': 'Kirjasto',
      'status.cafeteria': 'Ruokala',
      'status.itSupport': 'IT-tuki',
      'status.open': 'Avoinna',
      'status.closed': 'Suljettu',
      'status.available': 'Saatavilla',
      'status.openUntil': 'Avoinna klo 20:00 asti',
      
      // Announcements
      'announcements.title': 'Ilmoitukset',
      'announcements.clickDetails': 'Klikkaa lisätietoja varten',
      'announcements.recently': 'Äskettäin',
      'announcements.urgent': 'Tämä on kiireellinen ilmoitus. Ryhdy välittömiin toimiin tarvittaessa.',
      'announcements.high': 'Tämä on tärkeä ilmoitus. Tarkista huolellisesti.',
      
      // Staff Directory
      'staff.title': 'Henkilöstöhakemisto',
      'staff.add': 'Lisää henkilöstö',
      'staff.search': 'Etsi henkilöstöä...',
      'staff.allDepartments': 'Kaikki osastot',
      'staff.administration': 'Hallinto',
      'staff.teaching': 'Opetushenkilöstö',
      'staff.support': 'Tukihenkilöstö',
      'staff.locate': 'Paikanna',
      'staff.contact': 'Ota yhteyttä',
      
      // Admin
      'admin.title': 'Hallintapaneeli',
      'admin.totalStudents': 'Oppilaita yhteensä',
      'admin.staffMembers': 'Henkilöstöjäsenet',
      'admin.buildings': 'Rakennukset',
      'admin.recentActivity': 'Viimeaikaiset toiminnot',
      'admin.adminTools': 'Hallintatyökalut',
      'admin.editMap': 'Muokkaa karttaa',
      'admin.addStaff': 'Lisää henkilöstö',
      'admin.announcements': 'Ilmoitukset',
      'admin.settings': 'Asetukset',
      
      // Mobile Menu & Themes
      'mobile.menu': 'Valikko',
      'mobile.close': 'Sulje',
      'mobile.theme': 'Teema',
      'mobile.language': 'Kieli',
      'mobile.quickActions': 'Pikatoiminnot',
      'theme.light': 'Vaalea',
      'theme.dark': 'Tumma',
      'theme.light.desc': 'Puhdas ja kirkas käyttöliittymä',
      'theme.dark.desc': 'Hellävarainen silmille',
      'theme.current': 'Nykyinen teema',
      'theme.clickToCycle': 'Klikkaa vaihtaaksesi teemoja',
      
      // Languages
      'language.english': 'Englanti',
      'language.finnish': 'Suomi',
      'language.suomi': 'Suomi',
      
      // Quick Actions Mobile
      'quickActions.lunch': 'Ruokalista',
      'quickActions.transport': 'HSL Liikenne',
      'quickActions.admin': 'Hallintapaneeli',
      
      // Common
      'login': 'Kirjaudu sisään',
      'logout': 'Kirjaudu ulos',
      'close': 'Sulje',
      'save': 'Tallenna',
      'cancel': 'Peruuta',
      'loading': 'Ladataan...',
      'unauthorized': 'Ei käyttöoikeutta',
      'unauthorized.desc': 'Olet kirjautunut ulos. Kirjaudutaan sisään uudelleen...',
    }
  },
  'en-GB': {
    translation: {
      // Navigation
      'nav.map': 'Map',
      'nav.directory': 'Directory',
      'nav.schedule': 'Schedule',
      'nav.events': 'Events',
      'nav.information': 'Information',
      'nav.admin': 'Admin',
      
      // Hero section
      'hero.title': 'Welcome to KSYK Map, innit',
      'hero.subtitle': 'Navigate our campus with ease, bruv • 1151 students • 40+ nationalities',
      
      // Search
      'search.placeholder': 'Search for rooms, staff, facilities, mate...',
      'search.rooms': 'Search Rooms',
      'search.navigate': 'Navigate',
      
      // Map
      'map.title': 'Campus Map',
      'map.zoomIn': 'Zoom In',
      'map.floors': 'Floors',
      'map.legend': 'Legend',
      'map.academic': 'Academic',
      'map.sports': 'Sports',
      'map.library': 'Library',
      'map.music': 'Music',
      
      // Buildings
      'building.uwing': 'U-Wing',
      'building.uwing.desc': 'Classrooms',
      'building.main': 'Main Building',
      'building.main.desc': 'Administration',
      'building.library': 'Library',
      'building.library.desc': 'Study Spaces',
      'building.music': 'School of Rock',
      'building.music.desc': 'Music Building',
      'building.gym': 'Gymnasiums',
      'building.gym.desc': 'Sports Facilities',
      'building.lab': 'Laboratories',
      'building.lab.desc': 'Science Labs',
      
      // Quick Actions
      'actions.title': 'Quick Actions',
      'actions.directions': 'Get Directions, innit',
      'actions.findStaff': 'Find Staff',
      'actions.events': "Today's Events",
      'actions.emergency': 'Emergency Info',
      
      // Status
      'status.title': 'Campus Status',
      'status.buildingHours': 'Building Hours',
      'status.library': 'Library',
      'status.cafeteria': 'Cafeteria',
      'status.itSupport': 'IT Support',
      'status.open': 'Open',
      'status.closed': 'Closed',
      'status.available': 'Available',
      'status.openUntil': 'Open until 20:00',
      
      // Announcements
      'announcements.title': 'Announcements',
      'announcements.clickDetails': 'Click for more details, mate',
      'announcements.recently': 'Recently',
      'announcements.urgent': 'This is proper urgent, innit. Please take immediate action if required, bruv.',
      'announcements.high': 'This is well important, mate. Please review carefully, yeah?',
      
      // Staff Directory
      'staff.title': 'Staff Directory',
      'staff.add': 'Add Staff',
      'staff.search': 'Search staff...',
      'staff.allDepartments': 'All Departments',
      'staff.administration': 'Administration',
      'staff.teaching': 'Teaching Staff',
      'staff.support': 'Support Staff',
      'staff.locate': 'Locate',
      'staff.contact': 'Contact',
      
      // Admin
      'admin.title': 'Admin Dashboard',
      'admin.totalStudents': 'Total Students',
      'admin.staffMembers': 'Staff Members',
      'admin.buildings': 'Buildings',
      'admin.recentActivity': 'Recent Activity',
      'admin.adminTools': 'Admin Tools',
      'admin.editMap': 'Edit Map',
      'admin.addStaff': 'Add Staff',
      'admin.announcements': 'Announcements',
      'admin.settings': 'Settings',
      
      // Mobile Menu & Themes
      'mobile.menu': 'Menu',
      'mobile.close': 'Close',
      'mobile.theme': 'Theme',
      'mobile.language': 'Language',
      'mobile.quickActions': 'Quick Actions',
      'theme.light': 'Light',
      'theme.dark': 'Dark',
      'theme.light.desc': 'Proper bright, innit',
      'theme.dark.desc': 'Easy on the eyes, mate',
      'theme.current': 'Current theme',
      'theme.clickToCycle': 'Click to cycle themes',
      
      // Languages
      'language.english': 'English',
      'language.finnish': 'Finnish',
      'language.suomi': 'Suomi',
      'language.british': 'British English (Bri\'ish)',
      
      // Quick Actions Mobile
      'quickActions.lunch': 'Lunch Menu',
      'quickActions.transport': 'HSL Transport',
      'quickActions.admin': 'Admin Panel',
      
      // Common
      'login': 'Log In',
      'logout': 'Log Out',
      'close': 'Close',
      'save': 'Save',
      'cancel': 'Cancel',
      'loading': 'Loading, innit...',
      'unauthorized': 'Unauthorised',
      'unauthorized.desc': 'You\'re logged out, bruv. Logging in again...',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
