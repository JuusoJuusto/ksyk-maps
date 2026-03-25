import { useState } from 'react';
import { 
  Calendar, 
  FileText, 
  MessageSquare,
  Home,
  BarChart3,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  BookOpen,
  LogOut,
  User,
  TrendingUp,
  Award,
  Target
} from 'lucide-react';

export default function Wilma() {
  const [activeSection, setActiveSection] = useState('frontpage');
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');
  const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
  const [currentWeek, setCurrentWeek] = useState(12); // Week 12 of 2026

  // Translation object
  const tr = {
    fi: {
      school: 'Brando',
      studentName: 'Matti Meikäläinen',
      class: 'Luokka',
      notifications: 'Ilmoitukset',
      frontpage: 'Etusivu',
      schedule: 'Lukujärjestys',
      grades: 'Arvosanat',
      assignments: 'Tehtävät',
      messages: 'Viestit',
      attendance: 'Poissaolot',
      exams: 'Kokeet',
      settings: 'Asetukset',
      todaysLessons: 'Tämän päivän tunnit',
      recentGrades: 'Viimeisimmät arvosanat',
      weeklySchedule: 'Viikko-ohjelma',
      time: 'Aika',
      subject: 'Aine',
      room: 'Luokka',
      teacher: 'Opettaja',
      date: 'Päivämäärä',
      assignment: 'Tehtävä',
      grade: 'Arvosana',
      from: 'Lähettäjä',
      task: 'Tehtävä',
      dueDate: 'Palautuspäivä',
      status: 'Tila',
      returned: 'Palautettu',
      notReturned: 'Ei palautettu',
      attendanceRecords: 'Poissaolokirjaukset',
      type: 'Tyyppi',
      reason: 'Syy',
      absent: 'Poissa',
      late: 'Myöhässä',
      illness: 'Sairaus',
      other: 'Muu',
      upcomingExams: 'Tulevat kokeet',
      examType: 'Kokeen tyyppi',
      test: 'Koe',
      exam: 'Tentti',
      languageSettings: 'Kieliasetukset',
      language: 'Kieli',
      finnish: 'Suomi',
      english: 'Englanti',
      notificationSettings: 'Ilmoitusasetukset',
      emailNotifications: 'Sähköposti-ilmoitukset',
      enabled: 'Käytössä',
      disabled: 'Pois käytöstä',
      changePassword: 'Vaihda salasana',
      currentPassword: 'Nykyinen salasana',
      newPassword: 'Uusi salasana',
      confirmPassword: 'Vahvista salasana',
      save: 'Tallenna',
      attendanceStats: 'Poissaolotilastot',
      totalAbsences: 'Poissaoloja yhteensä',
      totalLates: 'Myöhästymisiä yhteensä',
      days: 'päivää',
      times: 'kertaa',
      logout: 'Kirjaudu ulos',
      profile: 'Profiili',
      gradeAverage: 'Keskiarvo',
      performance: 'Suorituskyky',
      topic: 'Aihe',
      description: 'Kuvaus',
      priority: 'Prioriteetti',
      high: 'Korkea',
      medium: 'Keskitaso',
      low: 'Matala',
      courseGrades: 'Kurssiarvosanat',
      termGrades: 'Lukukauden arvosanat',
      yearGrades: 'Vuoden arvosanat',
      back: 'Takaisin',
      reply: 'Vastaa',
      forward: 'Välitä',
      delete: 'Poista',
      messageContent: 'Viestin sisältö',
      previousWeek: 'Edellinen viikko',
      nextWeek: 'Seuraava viikko',
      noLessons: 'Ei tunteja',
      week: 'Viikko',
      monday: 'Maanantai',
      tuesday: 'Tiistai',
      wednesday: 'Keskiviikko',
      thursday: 'Torstai',
      friday: 'Perjantai'
    },
    en: {
      school: 'Brando',
      studentName: 'John Student',
      class: 'Class',
      notifications: 'Notifications',
      frontpage: 'Frontpage',
      schedule: 'Schedule',
      grades: 'Grades',
      assignments: 'Assignments',
      messages: 'Messages',
      attendance: 'Attendance',
      exams: 'Exams',
      settings: 'Settings',
      todaysLessons: "Today's Lessons",
      recentGrades: 'Recent Grades',
      weeklySchedule: 'Weekly Schedule',
      time: 'Time',
      subject: 'Subject',
      room: 'Room',
      teacher: 'Teacher',
      date: 'Date',
      assignment: 'Assignment',
      grade: 'Grade',
      from: 'From',
      task: 'Task',
      dueDate: 'Due Date',
      status: 'Status',
      returned: 'Returned',
      notReturned: 'Not returned',
      attendanceRecords: 'Attendance Records',
      type: 'Type',
      reason: 'Reason',
      absent: 'Absent',
      late: 'Late',
      illness: 'Illness',
      other: 'Other',
      upcomingExams: 'Upcoming Exams',
      examType: 'Exam Type',
      test: 'Test',
      exam: 'Exam',
      languageSettings: 'Language Settings',
      language: 'Language',
      finnish: 'Finnish',
      english: 'English',
      notificationSettings: 'Notification Settings',
      emailNotifications: 'Email Notifications',
      enabled: 'Enabled',
      disabled: 'Disabled',
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      save: 'Save',
      attendanceStats: 'Attendance Statistics',
      totalAbsences: 'Total Absences',
      totalLates: 'Total Lates',
      days: 'days',
      times: 'times',
      logout: 'Logout',
      profile: 'Profile',
      gradeAverage: 'Average',
      performance: 'Performance',
      topic: 'Topic',
      description: 'Description',
      priority: 'Priority',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      courseGrades: 'Course Grades',
      termGrades: 'Term Grades',
      yearGrades: 'Year Grades',
      back: 'Back',
      reply: 'Reply',
      forward: 'Forward',
      delete: 'Delete',
      messageContent: 'Message Content',
      previousWeek: 'Previous Week',
      nextWeek: 'Next Week',
      noLessons: 'No lessons',
      week: 'Week',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday'
    }
  };

  const t = tr[language];

  // Student data
  const studentData = {
    name: t.studentName,
    class: '9A',
    school: t.school,
    gradeAverage: '8.7'
  };

  // Mock data with more comprehensive information
  const weeklySchedule = {
    monday: [
      { time: '08:00 - 08:45', subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', room: 'Luokka 301', teacher: 'Andersson' },
      { time: '09:00 - 09:45', subject: language === 'fi' ? 'Englanti' : 'English', room: 'Luokka 205', teacher: 'Smith' },
      { time: '10:00 - 10:45', subject: language === 'fi' ? 'Fysiikka' : 'Physics', room: 'Lab 102', teacher: 'Johansson' },
      { time: '11:00 - 11:45', subject: language === 'fi' ? 'Historia' : 'History', room: 'Luokka 401', teacher: 'Virtanen' },
    ],
    tuesday: [
      { time: '08:00 - 08:45', subject: language === 'fi' ? 'Ruotsi' : 'Swedish', room: 'Luokka 303', teacher: 'Lindström' },
      { time: '09:00 - 09:45', subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', room: 'Luokka 301', teacher: 'Andersson' },
      { time: '10:00 - 10:45', subject: language === 'fi' ? 'Liikunta' : 'PE', room: 'Sali', teacher: 'Mäkinen' },
      { time: '11:00 - 11:45', subject: language === 'fi' ? 'Englanti' : 'English', room: 'Luokka 205', teacher: 'Smith' },
    ],
    wednesday: [
      { time: '08:00 - 08:45', subject: language === 'fi' ? 'Fysiikka' : 'Physics', room: 'Lab 102', teacher: 'Johansson' },
      { time: '09:00 - 09:45', subject: language === 'fi' ? 'Historia' : 'History', room: 'Luokka 401', teacher: 'Virtanen' },
      { time: '10:00 - 10:45', subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', room: 'Luokka 301', teacher: 'Andersson' },
    ],
    thursday: [
      { time: '08:00 - 08:45', subject: language === 'fi' ? 'Englanti' : 'English', room: 'Luokka 205', teacher: 'Smith' },
      { time: '09:00 - 09:45', subject: language === 'fi' ? 'Ruotsi' : 'Swedish', room: 'Luokka 303', teacher: 'Lindström' },
      { time: '10:00 - 10:45', subject: language === 'fi' ? 'Fysiikka' : 'Physics', room: 'Lab 102', teacher: 'Johansson' },
      { time: '11:00 - 11:45', subject: language === 'fi' ? 'Liikunta' : 'PE', room: 'Sali', teacher: 'Mäkinen' },
    ],
    friday: [
      { time: '08:00 - 08:45', subject: language === 'fi' ? 'Historia' : 'History', room: 'Luokka 401', teacher: 'Virtanen' },
      { time: '09:00 - 09:45', subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', room: 'Luokka 301', teacher: 'Andersson' },
      { time: '10:00 - 10:45', subject: language === 'fi' ? 'Englanti' : 'English', room: 'Luokka 205', teacher: 'Smith' },
    ],
  };

  const upcomingLessons = [
    { time: '08:00 - 08:45', subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', room: 'Luokka 301', teacher: 'Andersson', description: language === 'fi' ? 'Geometria: Kolmiot' : 'Geometry: Triangles' },
    { time: '09:00 - 09:45', subject: language === 'fi' ? 'Englanti' : 'English', room: 'Luokka 205', teacher: 'Smith', description: language === 'fi' ? 'Kielioppi: Present Perfect' : 'Grammar: Present Perfect' },
    { time: '10:00 - 10:45', subject: language === 'fi' ? 'Fysiikka' : 'Physics', room: 'Laboratorio 102', teacher: 'Johansson', description: language === 'fi' ? 'Sähköoppi' : 'Electricity' },
    { time: '11:00 - 11:45', subject: language === 'fi' ? 'Historia' : 'History', room: 'Luokka 401', teacher: 'Virtanen', description: language === 'fi' ? 'Kylmä sota' : 'Cold War' },
    { time: '12:00 - 12:45', subject: language === 'fi' ? 'Ruotsi' : 'Swedish', room: 'Luokka 303', teacher: 'Lindström', description: language === 'fi' ? 'Keskustelu' : 'Conversation' },
    { time: '13:00 - 13:45', subject: language === 'fi' ? 'Liikunta' : 'Physical Education', room: 'Sali', teacher: 'Mäkinen', description: language === 'fi' ? 'Koripallo' : 'Basketball' },
  ];

  const recentGrades = [
    { date: '20.03.2026', subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', assignment: language === 'fi' ? 'Luku 5 koe' : 'Chapter 5 Test', grade: '9', teacher: 'Andersson' },
    { date: '18.03.2026', subject: language === 'fi' ? 'Englanti' : 'English', assignment: language === 'fi' ? 'Essee' : 'Essay', grade: '10', teacher: 'Smith' },
    { date: '15.03.2026', subject: language === 'fi' ? 'Fysiikka' : 'Physics', assignment: language === 'fi' ? 'Laboratorioraportti' : 'Lab Report', grade: '8', teacher: 'Johansson' },
    { date: '12.03.2026', subject: language === 'fi' ? 'Historia' : 'History', assignment: language === 'fi' ? 'Toisen maailmansodan koe' : 'WWII Test', grade: '9', teacher: 'Virtanen' },
    { date: '10.03.2026', subject: language === 'fi' ? 'Ruotsi' : 'Swedish', assignment: language === 'fi' ? 'Suullinen esitys' : 'Oral Presentation', grade: '8', teacher: 'Lindström' },
    { date: '08.03.2026', subject: language === 'fi' ? 'Liikunta' : 'Physical Education', assignment: language === 'fi' ? 'Kuntotesti' : 'Fitness Test', grade: '9', teacher: 'Mäkinen' },
  ];

  const messages = [
    { 
      id: 1,
      date: '24.03.2026', 
      from: 'Andersson', 
      subject: language === 'fi' ? 'Matematiikan kokeen tulokset' : 'Math Test Results', 
      unread: true, 
      preview: language === 'fi' ? 'Hyvää työtä kokeessa!' : 'Good work on the test!',
      content: language === 'fi' ? 'Hei Matti,\n\nHyvää työtä viime viikon kokeessa! Sait arvosanaksi 9, mikä on erinomainen tulos. Erityisesti geometrian tehtävät olivat hyvin ratkottuja.\n\nJatka samaan malliin!\n\nTerveisin,\nAndersson' : 'Hi John,\n\nGreat work on last week\'s test! You got a grade of 9, which is an excellent result. Especially the geometry problems were well solved.\n\nKeep up the good work!\n\nBest regards,\nAndersson'
    },
    { 
      id: 2,
      date: '23.03.2026', 
      from: 'Smith', 
      subject: language === 'fi' ? 'Esseen palaute' : 'Essay Feedback', 
      unread: true, 
      preview: language === 'fi' ? 'Erinomainen essee' : 'Excellent essay',
      content: language === 'fi' ? 'Hei,\n\nEsseesi ilmastonmuutoksesta oli erinomainen! Argumentaatiosi oli selkeää ja käytit hyviä lähteitä. Arvosanaksi 10.\n\nPieniä parannusehdotuksia:\n- Lisää esimerkkejä\n- Tarkista pilkutus\n\nHyvää työtä!\n\nSmith' : 'Hi,\n\nYour essay on climate change was excellent! Your argumentation was clear and you used good sources. Grade: 10.\n\nSmall suggestions for improvement:\n- Add more examples\n- Check punctuation\n\nGreat work!\n\nSmith'
    },
    { 
      id: 3,
      date: '22.03.2026', 
      from: language === 'fi' ? 'Koulun toimisto' : 'School Office', 
      subject: language === 'fi' ? 'Vanhempainilta' : 'Parent-Teacher Meeting', 
      unread: false, 
      preview: language === 'fi' ? 'Vanhempainilta 30.3.' : 'Parent meeting 30.3.',
      content: language === 'fi' ? 'Hyvä huoltaja,\n\nVanhempainilta järjestetään 30.3.2026 klo 18:00 koulun auditoriossa.\n\nOhjelma:\n- Tervetuloa ja esittely\n- Kevään tapahtumat\n- Kysymyksiä ja vastauksia\n\nToivomme runsasta osallistumista!\n\nKoulun toimisto' : 'Dear guardian,\n\nParent-teacher meeting will be held on 30.3.2026 at 18:00 in the school auditorium.\n\nProgram:\n- Welcome and introduction\n- Spring events\n- Q&A\n\nWe hope for good attendance!\n\nSchool Office'
    },
    { 
      id: 4,
      date: '20.03.2026', 
      from: 'Virtanen', 
      subject: language === 'fi' ? 'Historian projekti' : 'History Project', 
      unread: false, 
      preview: language === 'fi' ? 'Projektin ohjeistus' : 'Project instructions',
      content: language === 'fi' ? 'Hei oppilaat,\n\nHistorian projektin aihe on "Suomen itsenäisyys". Projekti tulee palauttaa 2.4.2026 mennessä.\n\nVaatimukset:\n- 5-10 sivua\n- Vähintään 5 lähdettä\n- Kuvat ja kaaviot\n\nOnnea projektiin!\n\nVirtanen' : 'Hi students,\n\nThe history project topic is "Finnish Independence". The project must be submitted by 2.4.2026.\n\nRequirements:\n- 5-10 pages\n- At least 5 sources\n- Images and charts\n\nGood luck with the project!\n\nVirtanen'
    },
    { 
      id: 5,
      date: '18.03.2026', 
      from: 'Johansson', 
      subject: language === 'fi' ? 'Laboratoriotyö' : 'Lab Work', 
      unread: false, 
      preview: language === 'fi' ? 'Seuraavan viikon laboratorio' : 'Next week lab',
      content: language === 'fi' ? 'Hei,\n\nEnsi viikon laboratoriossa tutkimme sähkövirtaa ja jännitettä. Muistakaa tuoda:\n- Työvaatteet\n- Muistiinpanovälineet\n- Laskin\n\nLaboratorio alkaa täsmällisesti klo 10:00.\n\nJohansson' : 'Hi,\n\nNext week\'s lab will study electric current and voltage. Remember to bring:\n- Work clothes\n- Note-taking materials\n- Calculator\n\nLab starts promptly at 10:00.\n\nJohansson'
    },
  ];

  const assignments = [
    { subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', task: language === 'fi' ? 'Kotitehtävät luku 5' : 'Homework Chapter 5', due: '28.03.2026', status: t.notReturned, priority: t.high },
    { subject: language === 'fi' ? 'Englanti' : 'English', task: language === 'fi' ? 'Essee: Ilmastonmuutos' : 'Essay: Climate Change', due: '30.03.2026', status: t.notReturned, priority: t.high },
    { subject: language === 'fi' ? 'Fysiikka' : 'Physics', task: language === 'fi' ? 'Laboratorioraportti' : 'Lab Report', due: '26.03.2026', status: t.returned, priority: t.medium },
    { subject: language === 'fi' ? 'Historia' : 'History', task: language === 'fi' ? 'Tutkielma: Suomen itsenäisyys' : 'Essay: Finnish Independence', due: '02.04.2026', status: t.notReturned, priority: t.medium },
    { subject: language === 'fi' ? 'Ruotsi' : 'Swedish', task: language === 'fi' ? 'Sanakoe' : 'Vocabulary Test', due: '29.03.2026', status: t.notReturned, priority: t.low },
  ];

  const attendanceRecords = [
    { date: '22.03.2026', type: t.absent, subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', reason: t.illness },
    { date: '20.03.2026', type: t.late, subject: language === 'fi' ? 'Englanti' : 'English', reason: t.other },
    { date: '18.03.2026', type: t.absent, subject: language === 'fi' ? 'Fysiikka' : 'Physics', reason: t.illness },
    { date: '15.03.2026', type: t.late, subject: language === 'fi' ? 'Historia' : 'History', reason: t.other },
    { date: '12.03.2026', type: t.absent, subject: language === 'fi' ? 'Ruotsi' : 'Swedish', reason: t.illness },
  ];

  const upcomingExams = [
    { date: '28.03.2026', subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', topic: language === 'fi' ? 'Geometria' : 'Geometry', type: t.test, description: language === 'fi' ? 'Kolmiot ja nelikulmiot' : 'Triangles and quadrilaterals' },
    { date: '30.03.2026', subject: language === 'fi' ? 'Englanti' : 'English', topic: language === 'fi' ? 'Kielioppi' : 'Grammar', type: t.test, description: 'Present Perfect & Past Simple' },
    { date: '05.04.2026', subject: language === 'fi' ? 'Fysiikka' : 'Physics', topic: language === 'fi' ? 'Sähköoppi' : 'Electricity', type: t.exam, description: language === 'fi' ? 'Sähkövirta ja jännite' : 'Current and voltage' },
    { date: '08.04.2026', subject: language === 'fi' ? 'Historia' : 'History', topic: language === 'fi' ? 'Kylmä sota' : 'Cold War', type: t.test, description: language === 'fi' ? '1945-1991' : '1945-1991' },
  ];

  const attendanceStats = {
    totalAbsences: 3,
    totalLates: 2,
    attendancePercentage: 96
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Wilma Header - NO KSYKMAPS HEADER */}
      <div className="bg-[#003d82] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-semibold">{studentData.school}</h1>
                <p className="text-sm text-blue-200 mt-1">
                  <User className="w-4 h-4 inline mr-1" />
                  {studentData.name} • {studentData.class} • {t.gradeAverage}: {studentData.gradeAverage}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">{t.notifications}</span>
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">3</span>
              </button>
              <button 
                onClick={() => setLanguage(language === 'fi' ? 'en' : 'fi')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold transition-colors"
              >
                {language === 'fi' ? '🇬🇧 EN' : '🇫🇮 FI'}
              </button>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t.logout}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-[#0052a3] border-b-2 border-[#003d82] shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'frontpage', icon: Home, label: t.frontpage },
              { id: 'schedule', icon: Calendar, label: t.schedule },
              { id: 'grades', icon: BarChart3, label: t.grades },
              { id: 'assignments', icon: FileText, label: t.assignments },
              { id: 'messages', icon: MessageSquare, label: t.messages, badge: 2 },
              { id: 'attendance', icon: CheckCircle, label: t.attendance },
              { id: 'exams', icon: BookOpen, label: t.exams },
              { id: 'settings', icon: Settings, label: t.settings },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`px-4 py-3 text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeSection === item.id
                    ? 'bg-white text-[#003d82] font-semibold shadow-sm'
                    : 'text-white hover:bg-[#003d82]'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Frontpage */}
        {activeSection === 'frontpage' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">{t.gradeAverage}</p>
                    <p className="text-3xl font-bold mt-1">{studentData.gradeAverage}</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-blue-200" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">{t.attendance}</p>
                    <p className="text-3xl font-bold mt-1">{attendanceStats.attendancePercentage}%</p>
                  </div>
                  <Award className="w-10 h-10 text-green-200" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">{t.assignments}</p>
                    <p className="text-3xl font-bold mt-1">{assignments.filter(a => a.status === t.notReturned).length}</p>
                  </div>
                  <Target className="w-10 h-10 text-purple-200" />
                </div>
              </div>
            </div>

            {/* Today's Lessons */}
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-6 py-3">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {t.todaysLessons}
                </h2>
              </div>
              <div className="p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.time}</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.subject}</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.room}</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.teacher}</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.description}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingLessons.map((lesson, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                        <td className="py-3 px-3 font-medium text-gray-900">{lesson.time}</td>
                        <td className="py-3 px-3 font-semibold text-blue-600">{lesson.subject}</td>
                        <td className="py-3 px-3 text-gray-700">{lesson.room}</td>
                        <td className="py-3 px-3 text-gray-700">{lesson.teacher}</td>
                        <td className="py-3 px-3 text-gray-600 text-xs">{lesson.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Grades */}
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-6 py-3">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  {t.recentGrades}
                </h2>
              </div>
              <div className="p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.date}</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.subject}</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.assignment}</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.teacher}</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.grade}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentGrades.map((grade, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                        <td className="py-3 px-3 text-gray-700">{grade.date}</td>
                        <td className="py-3 px-3 font-semibold text-blue-600">{grade.subject}</td>
                        <td className="py-3 px-3 text-gray-700">{grade.assignment}</td>
                        <td className="py-3 px-3 text-gray-600">{grade.teacher}</td>
                        <td className="py-3 px-3">
                          <span className={`font-bold text-lg ${
                            parseInt(grade.grade) >= 9 ? 'text-green-600' : 
                            parseInt(grade.grade) >= 7 ? 'text-blue-600' : 
                            'text-orange-600'
                          }`}>
                            {grade.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Messages Preview */}
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-6 py-3">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {t.messages}
                </h2>
              </div>
              <div className="p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.date}</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.from}</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.subject}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.slice(0, 3).map((msg) => (
                      <tr 
                        key={msg.id}
                        onClick={() => {
                          setActiveSection('messages');
                          setSelectedMessage(msg.id);
                        }}
                        className={`border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors ${msg.unread ? 'bg-blue-50/50' : ''}`}
                      >
                        <td className="py-3 px-3 text-gray-700">{msg.date}</td>
                        <td className="py-3 px-3 font-medium text-gray-900">{msg.from}</td>
                        <td className="py-3 px-3">
                          {msg.unread && <span className="text-red-500 mr-2 font-bold">●</span>}
                          <span className={msg.unread ? 'font-semibold text-gray-900' : 'text-gray-700'}>{msg.subject}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* All other sections - Schedule, Grades, Assignments, Messages, Attendance, Exams, Settings */}
        {activeSection === 'schedule' && (
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-[#e8f0f8] border-b border-gray-300 px-6 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">{t.weeklySchedule}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentWeek(currentWeek - 1)} className="px-3 py-1 bg-[#003d82] text-white rounded hover:bg-[#0052a3] text-sm">
                  ← {t.previousWeek}
                </button>
                <span className="px-4 py-1 bg-white border border-gray-300 rounded font-semibold text-sm">
                  {t.week} {currentWeek}
                </span>
                <button onClick={() => setCurrentWeek(currentWeek + 1)} className="px-3 py-1 bg-[#003d82] text-white rounded hover:bg-[#0052a3] text-sm">
                  {t.nextWeek} →
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-5 gap-4">
                {[
                  { day: t.monday, lessons: weeklySchedule.monday },
                  { day: t.tuesday, lessons: weeklySchedule.tuesday },
                  { day: t.wednesday, lessons: weeklySchedule.wednesday },
                  { day: t.thursday, lessons: weeklySchedule.thursday },
                  { day: t.friday, lessons: weeklySchedule.friday },
                ].map((dayData, dayIndex) => (
                  <div key={dayIndex} className="border border-gray-300 rounded-lg overflow-hidden">
                    <div className="bg-[#e8f0f8] px-3 py-2 border-b border-gray-300">
                      <h3 className="font-semibold text-sm text-gray-800">{dayData.day}</h3>
                    </div>
                    <div className="p-2 space-y-2">
                      {dayData.lessons.length > 0 ? dayData.lessons.map((lesson, lessonIndex) => (
                        <div key={lessonIndex} className="bg-blue-50 border border-blue-200 rounded p-2 hover:bg-blue-100 transition-colors">
                          <p className="text-xs text-gray-600 font-medium">{lesson.time}</p>
                          <p className="text-sm font-semibold text-blue-700 mt-1">{lesson.subject}</p>
                          <p className="text-xs text-gray-600 mt-1">{lesson.room}</p>
                          <p className="text-xs text-gray-500">{lesson.teacher}</p>
                        </div>
                      )) : (
                        <p className="text-xs text-gray-400 text-center py-4">{t.noLessons}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'grades' && (
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-[#e8f0f8] border-b border-gray-300 px-6 py-3">
              <h2 className="text-lg font-semibold text-gray-800">{t.grades}</h2>
            </div>
            <div className="p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.date}</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.subject}</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.assignment}</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.teacher}</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.grade}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGrades.map((grade, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-blue-50">
                      <td className="py-3 px-3">{grade.date}</td>
                      <td className="py-3 px-3 font-semibold text-blue-600">{grade.subject}</td>
                      <td className="py-3 px-3">{grade.assignment}</td>
                      <td className="py-3 px-3 text-gray-600">{grade.teacher}</td>
                      <td className="py-3 px-3">
                        <span className={`font-bold text-lg ${parseInt(grade.grade) >= 9 ? 'text-green-600' : parseInt(grade.grade) >= 7 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {grade.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'assignments' && (
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-[#e8f0f8] border-b border-gray-300 px-6 py-3">
              <h2 className="text-lg font-semibold text-gray-800">{t.assignments}</h2>
            </div>
            <div className="p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.subject}</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.task}</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.dueDate}</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.priority}</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-blue-50">
                      <td className="py-3 px-3 font-semibold text-blue-600">{assignment.subject}</td>
                      <td className="py-3 px-3">{assignment.task}</td>
                      <td className="py-3 px-3">{assignment.due}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          assignment.priority === t.high ? 'bg-red-100 text-red-700' :
                          assignment.priority === t.medium ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {assignment.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={assignment.status === t.returned ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {assignment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'messages' && (
          <div className="space-y-4">
            {selectedMessage === null ? (
              <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-[#e8f0f8] border-b border-gray-300 px-6 py-3">
                  <h2 className="text-lg font-semibold text-gray-800">{t.messages}</h2>
                </div>
                <div className="p-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.date}</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.from}</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.subject}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {messages.map((msg) => (
                        <tr 
                          key={msg.id}
                          onClick={() => setSelectedMessage(msg.id)}
                          className={`border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors ${msg.unread ? 'bg-blue-50/50' : ''}`}
                        >
                          <td className="py-3 px-3">{msg.date}</td>
                          <td className="py-3 px-3 font-medium">{msg.from}</td>
                          <td className="py-3 px-3">
                            {msg.unread && <span className="text-red-500 mr-2 font-bold">●</span>}
                            <span className={msg.unread ? 'font-semibold' : ''}>{msg.subject}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-[#e8f0f8] border-b border-gray-300 px-6 py-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">{t.messageContent}</h2>
                  <button 
                    onClick={() => setSelectedMessage(null)}
                    className="px-4 py-2 bg-[#003d82] text-white rounded-lg hover:bg-[#0052a3] transition-colors text-sm flex items-center gap-2"
                  >
                    ← {t.back}
                  </button>
                </div>
                <div className="p-6">
                  {messages.find(m => m.id === selectedMessage) && (
                    <div className="space-y-4">
                      <div className="border-b border-gray-300 pb-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                          {messages.find(m => m.id === selectedMessage)!.subject}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span className="font-medium">{messages.find(m => m.id === selectedMessage)!.from}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{messages.find(m => m.id === selectedMessage)!.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <p className="text-gray-800 whitespace-pre-line leading-relaxed">
                          {messages.find(m => m.id === selectedMessage)!.content}
                        </p>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button className="px-4 py-2 bg-[#003d82] text-white rounded-lg hover:bg-[#0052a3] transition-colors text-sm flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          {t.reply}
                        </button>
                        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {t.forward}
                        </button>
                        <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          {t.delete}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'attendance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">{t.attendance}</p>
                    <p className="text-2xl font-bold text-green-600">{attendanceStats.attendancePercentage}%</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">{t.totalAbsences}</p>
                    <p className="text-2xl font-bold text-red-600">{attendanceStats.totalAbsences} {t.days}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-300 rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">{t.totalLates}</p>
                    <p className="text-2xl font-bold text-orange-600">{attendanceStats.totalLates} {t.times}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-6 py-3">
                <h2 className="text-lg font-semibold text-gray-800">{t.attendanceRecords}</h2>
              </div>
              <div className="p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.date}</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.type}</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.subject}</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.reason}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-blue-50">
                        <td className="py-3 px-3">{record.date}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${record.type === t.absent ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                            {record.type}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium">{record.subject}</td>
                        <td className="py-3 px-3 text-gray-600">{record.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'exams' && (
          <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-[#e8f0f8] border-b border-gray-300 px-6 py-3">
              <h2 className="text-lg font-semibold text-gray-800">{t.upcomingExams}</h2>
            </div>
            <div className="p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.date}</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.subject}</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.topic}</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.examType}</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">{t.description}</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingExams.map((exam, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-blue-50">
                      <td className="py-3 px-3 font-medium">{exam.date}</td>
                      <td className="py-3 px-3 font-semibold text-blue-600">{exam.subject}</td>
                      <td className="py-3 px-3">{exam.topic}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${exam.type === t.exam ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {exam.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 text-xs">{exam.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-6 py-3">
                <h2 className="text-lg font-semibold text-gray-800">{t.languageSettings}</h2>
              </div>
              <div className="p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.language}</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value as 'fi' | 'en')} className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg">
                  <option value="fi">🇫🇮 {t.finnish}</option>
                  <option value="en">🇬🇧 {t.english}</option>
                </select>
              </div>
            </div>

            <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-6 py-3">
                <h2 className="text-lg font-semibold text-gray-800">{t.notificationSettings}</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">{t.emailNotifications}</label>
                  <select className="px-4 py-2 border border-gray-300 rounded-lg">
                    <option>{t.enabled}</option>
                    <option>{t.disabled}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-6 py-3">
                <h2 className="text-lg font-semibold text-gray-800">{t.changePassword}</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.currentPassword}</label>
                    <input type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.newPassword}</label>
                    <input type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.confirmPassword}</label>
                    <input type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <button className="px-6 py-2 bg-[#003d82] text-white rounded-lg hover:bg-[#0052a3] transition-colors font-medium">
                    {t.save}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
