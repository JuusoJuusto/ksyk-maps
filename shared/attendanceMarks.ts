// Wilma Attendance Marks Configuration
// Based on real Wilma system with all mark types and colors

export interface AttendanceMark {
  id: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  category: 'present' | 'late' | 'absence' | 'explained' | 'unauthorized' | 'other';
  icon: string;
}

export const ATTENDANCE_MARKS: AttendanceMark[] = [
  // Läsnäolo (Present)
  {
    id: 'present',
    label: 'Läsnä',
    description: 'Oppilas läsnä tunnilla',
    color: '#ffffff',
    bgColor: '#ffffff',
    borderColor: '#000000',
    category: 'present',
    icon: '✓'
  },
  
  // Myöhästymiset (Late)
  {
    id: 'late_under_15',
    label: 'Myöhässä alle 15 min',
    description: 'Myöhästynyt alle 15 minuuttia',
    color: '#000000',
    bgColor: '#FFB6C1', // Light pink
    borderColor: '#FF69B4',
    category: 'late',
    icon: '⏰'
  },
  {
    id: 'late_over_15',
    label: 'Myöhässä yli 15 min',
    description: 'Myöhästynyt yli 15 minuuttia',
    color: '#000000',
    bgColor: '#FFA500', // Orange
    borderColor: '#FF8C00',
    category: 'late',
    icon: '⏰'
  },
  
  // Poissaolot (Absences)
  {
    id: 'unexplained_absence',
    label: 'Selvittämätön poissaolo',
    description: 'Poissaolo ilman selvitystä',
    color: '#ffffff',
    bgColor: '#FF0000', // Red
    borderColor: '#CC0000',
    category: 'absence',
    icon: '❌'
  },
  {
    id: 'explained_absence',
    label: 'Selvittämätön poissaolo',
    description: 'Poissaolo selvitetty',
    color: '#000000',
    bgColor: '#D3D3D3', // Light gray
    borderColor: '#A9A9A9',
    category: 'explained',
    icon: '✓'
  },
  
  // Opetus muualla
  {
    id: 'teaching_elsewhere',
    label: 'Opetus muualla',
    description: 'Opetus järjestetty muualla',
    color: '#000000',
    bgColor: '#00FFFF', // Cyan
    borderColor: '#00CED1',
    category: 'explained',
    icon: '📍'
  },
  
  // Koulun toiminta
  {
    id: 'school_activity',
    label: 'Koulun muussa toiminnassa',
    description: 'Osallistuu koulun muuhun toimintaan',
    color: '#000000',
    bgColor: '#ADD8E6', // Light blue
    borderColor: '#87CEEB',
    category: 'explained',
    icon: '🏫'
  },
  
  // Ennalta anottu
  {
    id: 'pre_approved',
    label: 'Ennalta anottu vapaa',
    description: 'Ennalta hyväksytty poissaolo',
    color: '#000000',
    bgColor: '#00FF00', // Bright green
    borderColor: '#00CC00',
    category: 'explained',
    icon: '✓'
  },
  
  // Terveydellinen
  {
    id: 'health_related',
    label: 'Terveydellisiin syihin liittyvä poissaolo',
    description: 'Terveydellinen syy',
    color: '#ffffff',
    bgColor: '#006400', // Dark green
    borderColor: '#004d00',
    category: 'explained',
    icon: '🏥'
  },
  
  // Koulu selvittänyt
  {
    id: 'school_explained',
    label: 'Koulu selvittänyt',
    description: 'Koulu on selvittänyt poissaolon',
    color: '#000000',
    bgColor: '#90EE90', // Light green
    borderColor: '#7CFC00',
    category: 'explained',
    icon: '✓'
  },
  
  // Muu selvitetty
  {
    id: 'other_explained',
    label: 'Muu selvitetty poissaolo',
    description: 'Muu selvitetty syy',
    color: '#000000',
    bgColor: '#00FF00', // Green
    borderColor: '#00CC00',
    category: 'explained',
    icon: '✓'
  },
  
  // Luvaton (selvitetty)
  {
    id: 'unauthorized_explained',
    label: 'Luvaton poissaolo (selvitetty)',
    description: 'Luvaton mutta selvitetty',
    color: '#ffffff',
    bgColor: '#FF00FF', // Magenta
    borderColor: '#CC00CC',
    category: 'unauthorized',
    icon: '⚠️'
  },
  
  // Poistettu
  {
    id: 'removed',
    label: 'Poistettu',
    description: 'Poistettu luokasta',
    color: '#ffffff',
    bgColor: '#8B4513', // Brown
    borderColor: '#654321',
    category: 'unauthorized',
    icon: '🚫'
  },
  
  // PoislAlue
  {
    id: 'removed_area',
    label: 'PoislAlue',
    description: 'Poistunut koulun alueelta ilman lupaa',
    color: '#000000',
    bgColor: '#FFA500', // Orange
    borderColor: '#FF8C00',
    category: 'unauthorized',
    icon: '🚪'
  },
  
  // Kotitehtävät tekemättä
  {
    id: 'homework_missing',
    label: 'Kotitehtävät tekemättä',
    description: 'Kotitehtävät tekemättä',
    color: '#000000',
    bgColor: '#D3D3D3', // Gray
    borderColor: '#A9A9A9',
    category: 'other',
    icon: '📝'
  },
  
  // Tiedoksi
  {
    id: 'notification',
    label: 'Tiedoksi',
    description: 'Tiedoksi huoltajalle',
    color: '#000000',
    bgColor: '#FFB6C1', // Pink
    borderColor: '#FF69B4',
    category: 'other',
    icon: 'ℹ️'
  },
  
  // Hyvä
  {
    id: 'good',
    label: 'Hyvä',
    description: 'Tunti sujui hyvin',
    color: '#000000',
    bgColor: '#FFFF00', // Yellow
    borderColor: '#FFD700',
    category: 'other',
    icon: '😊'
  },
  
  // Olit hyvä kaveri välitunnilla
  {
    id: 'good_friend',
    label: 'Olit hyvä kaveri välitunnilla',
    description: 'Hyvä käytös välitunnilla',
    color: '#000000',
    bgColor: '#FFFF00', // Yellow
    borderColor: '#FFD700',
    category: 'other',
    icon: '👍'
  },
  
  // Työskentelit hienosti yhdessä
  {
    id: 'good_teamwork',
    label: 'Työskentelit hienosti yhdessä',
    description: 'Hyvä yhteistyö',
    color: '#000000',
    bgColor: '#FFFF00', // Yellow
    borderColor: '#FFD700',
    category: 'other',
    icon: '🤝'
  },
  
  // Tsemppasit tänään
  {
    id: 'encouraged',
    label: 'Tsemppasit tänään',
    description: 'Kannusti muita',
    color: '#000000',
    bgColor: '#FFFF00', // Yellow
    borderColor: '#FFD700',
    category: 'other',
    icon: '💪'
  },
  
  // Otit toiset huomioon
  {
    id: 'considerate',
    label: 'Otit toiset huomioon',
    description: 'Huomioi muita',
    color: '#000000',
    bgColor: '#FFFF00', // Yellow
    borderColor: '#FFD700',
    category: 'other',
    icon: '❤️'
  },
  
  // Autoit toisia oppilaita
  {
    id: 'helped_others',
    label: 'Autoit toisia oppilaita',
    description: 'Auttoi muita oppilaita',
    color: '#000000',
    bgColor: '#FFFF00', // Yellow
    borderColor: '#FFD700',
    category: 'other',
    icon: '🤲'
  },
  
  // Osasit keskustella asioista
  {
    id: 'good_discussion',
    label: 'Osasit keskustella asioista',
    description: 'Hyvä keskustelutaito',
    color: '#000000',
    bgColor: '#FFFF00', // Yellow
    borderColor: '#FFD700',
    category: 'other',
    icon: '💬'
  },
  
  // Osallistuit aktiivisesti
  {
    id: 'active_participation',
    label: 'Osallistuit aktiivisesti',
    description: 'Aktiivinen osallistuminen',
    color: '#000000',
    bgColor: '#FFFF00', // Yellow
    borderColor: '#FFD700',
    category: 'other',
    icon: '🙋'
  },
  
  // Otit vastuuta opiskelustasi
  {
    id: 'took_responsibility',
    label: 'Otit vastuuta opiskelustasi',
    description: 'Vastuullinen opiskelu',
    color: '#000000',
    bgColor: '#FFFF00', // Yellow
    borderColor: '#FFD700',
    category: 'other',
    icon: '📚'
  },
  
  // Kiinnitä jatkossa huomiota
  {
    id: 'needs_attention',
    label: 'Kiinnitä jatkossa huomiota',
    description: 'Vaatii huomiota jatkossa',
    color: '#000000',
    bgColor: '#D3D3D3', // Gray
    borderColor: '#A9A9A9',
    category: 'other',
    icon: '⚠️'
  },
  
  // Opiskeluvälineitä puuttuu
  {
    id: 'missing_materials',
    label: 'Opiskeluvälineitä puuttuu',
    description: 'Puuttuvia välineitä',
    color: '#000000',
    bgColor: '#D3D3D3', // Gray
    borderColor: '#A9A9A9',
    category: 'other',
    icon: '📦'
  },
  
  // Asiaton tai häiritsevä käytös
  {
    id: 'inappropriate_behavior',
    label: 'Asiaton tai häiritsevä käytös',
    description: 'Häiritsevä käytös',
    color: '#ffffff',
    bgColor: '#8B4513', // Brown
    borderColor: '#654321',
    category: 'other',
    icon: '⛔'
  },
  
  // TET
  {
    id: 'tet',
    label: 'TET',
    description: 'Työelämään tutustuminen',
    color: '#ffffff',
    bgColor: '#8B4513', // Brown
    borderColor: '#654321',
    category: 'explained',
    icon: '💼'
  }
];

// Helper function to get mark by ID
export function getAttendanceMark(id: string): AttendanceMark | undefined {
  return ATTENDANCE_MARKS.find(mark => mark.id === id);
}

// Helper function to get marks by category
export function getMarksByCategory(category: AttendanceMark['category']): AttendanceMark[] {
  return ATTENDANCE_MARKS.filter(mark => mark.category === category);
}

// Color chart for visualization
export const ATTENDANCE_COLOR_CHART = {
  present: { label: 'Läsnä', color: '#ffffff', count: 1 },
  late: { label: 'Myöhässä', color: '#FFB6C1', count: 2 },
  absence: { label: 'Poissaolot', color: '#FF0000', count: 1 },
  explained: { label: 'Selvitetyt', color: '#00FF00', count: 8 },
  unauthorized: { label: 'Luvattomat', color: '#FF00FF', count: 3 },
  other: { label: 'Muut merkinnät', color: '#FFFF00', count: 13 }
};
