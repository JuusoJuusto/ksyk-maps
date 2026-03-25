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
  User
} from 'lucide-react';

export default function Wilma() {
  const [activeSection, setActiveSection] = useState('frontpage');
  const [language, setLanguage] = useState<'fi' | 'en'>('fi');

  // Translation object
  const tr = {
    fi: {
      school: 'Kulosaaren yhteiskoulu',
      studentName: 'Oppilas Nimi',
      class: 'Luokka',
      notifications: 'Ilmoitukset',
      frontpage: 'Etusivu',
      schedule: 'Lukujärjestys',
      grades: 'Arvosanat',
      assignments: 'Tehtävät',
      messages: 'Viestit',
      attendance: 'Tuntimerkinnät',
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
      attendanceRecords: 'Tuntimerkinnät',
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
      attendanceStats: 'Tilastot',
      totalAbsences: 'Poissaoloja',
      totalLates: 'Myöhästymisiä',
      present: 'Läsnä',
      week: 'Viikko',
      monday: 'Maanantai',
      tuesday: 'Tiistai',
      wednesday: 'Keskiviikko',
      thursday: 'Torstai',
      friday: 'Perjantai',
      logout: 'Kirjaudu ulos',
      profile: 'Profiili',
      days: 'päivää',
      times: 'kertaa'
    },
    en: {
      school: 'Kulosaari Joint School',
      studentName: 'Student Name',
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
      attendanceStats: 'Statistics',
      totalAbsences: 'Absences',
      totalLates: 'Lates',
      present: 'Present',
      week: 'Week',
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      logout: 'Logout',
      profile: 'Profile',
      days: 'days',
      times: 'times'
    }
  };

  const t = tr[language];

  // Mock student data
  const studentData = {
    name: t.studentName,
    class: '9A',
    school: t.school
  };

  const upcomingLessons = [
    { time: '08:00 - 08:45', subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', room: 'Luokka 301', teacher: 'Andersson' },
    { time: '09:00 - 09:45', subject: language === 'fi' ? 'Englanti' : 'English', room: 'Luokka 205', teacher: 'Smith' },
    { time: '10:00 - 10:45', subject: language === 'fi' ? 'Fysiikka' : 'Physics', room: 'Laboratorio 102', teacher: 'Johansson' },
    { time: '11:00 - 11:45', subject: language === 'fi' ? 'Historia' : 'History', room: 'Luokka 401', teacher: 'Virtanen' },
    { time: '12:00 - 12:45', subject: language === 'fi' ? 'Ruotsi' : 'Swedish', room: 'Luokka 303', teacher: 'Lindström' },
    { time: '13:00 - 13:45', subject: language === 'fi' ? 'Liikunta' : 'Physical Education', room: 'Sali', teacher: 'Mäkinen' },
  ];

  const recentGrades = [
    { date: '20.03.2026', subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', assignment: language === 'fi' ? 'Luku 5 koe' : 'Chapter 5 Test', grade: '9' },
    { date: '18.03.2026', subject: language === 'fi' ? 'Englanti' : 'English', assignment: language === 'fi' ? 'Essee' : 'Essay', grade: '10' },
    { date: '15.03.2026', subject: language === 'fi' ? 'Fysiikka' : 'Physics', assignment: language === 'fi' ? 'Laboratorioraportti' : 'Lab Report', grade: '8' },
    { date: '12.03.2026', subject: language === 'fi' ? 'Historia' : 'History', assignment: language === 'fi' ? 'Toisen maailmansodan koe' : 'WWII Test', grade: '9' },
    { date: '10.03.2026', subject: language === 'fi' ? 'Ruotsi' : 'Swedish', assignment: language === 'fi' ? 'Suullinen esitys' : 'Oral Presentation', grade: '8' },
  ];

  const messages = [
    { date: '24.03.2026', from: 'Andersson', subject: language === 'fi' ? 'Matematiikan kokeen tulokset' : 'Math Test Results', unread: true },
    { date: '23.03.2026', from: 'Smith', subject: language === 'fi' ? 'Esseen palaute' : 'Essay Feedback', unread: true },
    { date: '22.03.2026', from: language === 'fi' ? 'Koulun toimisto' : 'School Office', subject: language === 'fi' ? 'Vanhempainilta' : 'Parent-Teacher Meeting', unread: false },
    { date: '20.03.2026', from: 'Virtanen', subject: language === 'fi' ? 'Historian projekti' : 'History Project', unread: false },
  ];

  const assignments = [
    { subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', task: language === 'fi' ? 'Kotitehtävät luku 5' : 'Homework Chapter 5', due: '28.03.2026', status: t.notReturned },
    { subject: language === 'fi' ? 'Englanti' : 'English', task: language === 'fi' ? 'Essee: Ilmastonmuutos' : 'Essay: Climate Change', due: '30.03.2026', status: t.notReturned },
    { subject: language === 'fi' ? 'Fysiikka' : 'Physics', task: language === 'fi' ? 'Laboratorioraportti' : 'Lab Report', due: '26.03.2026', status: t.returned },
    { subject: language === 'fi' ? 'Historia' : 'History', task: language === 'fi' ? 'Tutkielma: Suomen itsenäisyys' : 'Essay: Finnish Independence', due: '02.04.2026', status: t.notReturned },
  ];

  const attendanceRecords = [
    { date: '22.03.2026', type: t.absent, subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', reason: t.illness },
    { date: '20.03.2026', type: t.late, subject: language === 'fi' ? 'Englanti' : 'English', reason: t.other },
    { date: '18.03.2026', type: t.absent, subject: language === 'fi' ? 'Fysiikka' : 'Physics', reason: t.illness },
    { date: '15.03.2026', type: t.late, subject: language === 'fi' ? 'Historia' : 'History', reason: t.other },
    { date: '12.03.2026', type: t.absent, subject: language === 'fi' ? 'Ruotsi' : 'Swedish', reason: t.illness },
  ];

  const upcomingExams = [
    { date: '28.03.2026', subject: language === 'fi' ? 'Matematiikka' : 'Mathematics', topic: language === 'fi' ? 'Geometria' : 'Geometry', type: t.test },
    { date: '30.03.2026', subject: language === 'fi' ? 'Englanti' : 'English', topic: language === 'fi' ? 'Kielioppi' : 'Grammar', type: t.test },
    { date: '05.04.2026', subject: language === 'fi' ? 'Fysiikka' : 'Physics', topic: language === 'fi' ? 'Sähköoppi' : 'Electricity', type: t.exam },
    { date: '08.04.2026', subject: language === 'fi' ? 'Historia' : 'History', topic: language === 'fi' ? 'Kylmä sota' : 'Cold War', type: t.test },
  ];

  const attendanceStats = {
    totalAbsences: 3,
    totalLates: 2
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <AnnouncementBanner />
      <Header />
      
      {/* Wilma Classic Header */}
      <div className="bg-[#003d82] text-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-normal">{studentData.school}</h1>
              <p className="text-sm text-blue-200">{studentData.name} • {studentData.class}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm">
                <Bell className="w-4 h-4 inline mr-1" />
                {t.notifications} (3)
              </button>
              <button 
                onClick={() => setLanguage(language === 'fi' ? 'en' : 'fi')}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-sm"
              >
                {language === 'fi' ? 'EN' : 'FI'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-[#0052a3] border-b border-[#003d82]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveSection('frontpage')}
              className={`px-4 py-2 text-sm ${
                activeSection === 'frontpage'
                  ? 'bg-white text-[#003d82] font-semibold'
                  : 'text-white hover:bg-[#003d82]'
              }`}
            >
              <Home className="w-4 h-4 inline mr-1" />
              {t.frontpage}
            </button>
            <button
              onClick={() => setActiveSection('schedule')}
              className={`px-4 py-2 text-sm ${
                activeSection === 'schedule'
                  ? 'bg-white text-[#003d82] font-semibold'
                  : 'text-white hover:bg-[#003d82]'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1" />
              {t.schedule}
            </button>
            <button
              onClick={() => setActiveSection('grades')}
              className={`px-4 py-2 text-sm ${
                activeSection === 'grades'
                  ? 'bg-white text-[#003d82] font-semibold'
                  : 'text-white hover:bg-[#003d82]'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-1" />
              {t.grades}
            </button>
            <button
              onClick={() => setActiveSection('assignments')}
              className={`px-4 py-2 text-sm ${
                activeSection === 'assignments'
                  ? 'bg-white text-[#003d82] font-semibold'
                  : 'text-white hover:bg-[#003d82]'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              {t.assignments}
            </button>
            <button
              onClick={() => setActiveSection('messages')}
              className={`px-4 py-2 text-sm ${
                activeSection === 'messages'
                  ? 'bg-white text-[#003d82] font-semibold'
                  : 'text-white hover:bg-[#003d82]'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-1" />
              {t.messages} (2)
            </button>
            <button
              onClick={() => setActiveSection('attendance')}
              className={`px-4 py-2 text-sm ${
                activeSection === 'attendance'
                  ? 'bg-white text-[#003d82] font-semibold'
                  : 'text-white hover:bg-[#003d82]'
              }`}
            >
              <CheckCircle className="w-4 h-4 inline mr-1" />
              {t.attendance}
            </button>
            <button
              onClick={() => setActiveSection('exams')}
              className={`px-4 py-2 text-sm ${
                activeSection === 'exams'
                  ? 'bg-white text-[#003d82] font-semibold'
                  : 'text-white hover:bg-[#003d82]'
              }`}
            >
              <BookOpen className="w-4 h-4 inline mr-1" />
              {t.exams}
            </button>
            <button
              onClick={() => setActiveSection('settings')}
              className={`px-4 py-2 text-sm ${
                activeSection === 'settings'
                  ? 'bg-white text-[#003d82] font-semibold'
                  : 'text-white hover:bg-[#003d82]'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-1" />
              {t.settings}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Frontpage */}
        {activeSection === 'frontpage' && (
          <div className="space-y-4">
            {/* Today's Lessons */}
            <div className="bg-white border border-gray-300">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-4 py-2">
                <h2 className="text-base font-semibold text-gray-800">{t.todaysLessons}</h2>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.time}</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.subject}</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.room}</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.teacher}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingLessons.map((lesson, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-2">{lesson.time}</td>
                        <td className="py-2 px-2 font-medium">{lesson.subject}</td>
                        <td className="py-2 px-2">{lesson.room}</td>
                        <td className="py-2 px-2">{lesson.teacher}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Grades */}
            <div className="bg-white border border-gray-300">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-4 py-2">
                <h2 className="text-base font-semibold text-gray-800">{t.recentGrades}</h2>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.date}</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.subject}</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.assignment}</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.grade}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentGrades.map((grade, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-2">{grade.date}</td>
                        <td className="py-2 px-2">{grade.subject}</td>
                        <td className="py-2 px-2">{grade.assignment}</td>
                        <td className="py-2 px-2 font-bold text-[#003d82]">{grade.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Messages */}
            <div className="bg-white border border-gray-300">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-4 py-2">
                <h2 className="text-base font-semibold text-gray-800">{t.messages}</h2>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">From</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((msg, index) => (
                      <tr 
                        key={index} 
                        className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                          msg.unread ? 'font-semibold' : ''
                        }`}
                      >
                        <td className="py-2 px-2">{msg.date}</td>
                        <td className="py-2 px-2">{msg.from}</td>
                        <td className="py-2 px-2">
                          {msg.unread && <span className="text-[#003d82] mr-1">●</span>}
                          {msg.subject}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Section */}
        {activeSection === 'schedule' && (
          <div className="bg-white border border-gray-300">
            <div className="bg-[#e8f0f8] border-b border-gray-300 px-4 py-2">
              <h2 className="text-base font-semibold text-gray-800">{t.weeklySchedule}</h2>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.time}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.subject}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.room}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.teacher}</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingLessons.map((lesson, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-2 px-2">{lesson.time}</td>
                      <td className="py-2 px-2 font-medium">{lesson.subject}</td>
                      <td className="py-2 px-2">{lesson.room}</td>
                      <td className="py-2 px-2">{lesson.teacher}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Grades Section */}
        {activeSection === 'grades' && (
          <div className="bg-white border border-gray-300">
            <div className="bg-[#e8f0f8] border-b border-gray-300 px-4 py-2">
              <h2 className="text-base font-semibold text-gray-800">{t.grades}</h2>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.date}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.subject}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.assignment}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.grade}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGrades.map((grade, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-2 px-2">{grade.date}</td>
                      <td className="py-2 px-2">{grade.subject}</td>
                      <td className="py-2 px-2">{grade.assignment}</td>
                      <td className="py-2 px-2 font-bold text-[#003d82]">{grade.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Assignments Section */}
        {activeSection === 'assignments' && (
          <div className="bg-white border border-gray-300">
            <div className="bg-[#e8f0f8] border-b border-gray-300 px-4 py-2">
              <h2 className="text-base font-semibold text-gray-800">{t.assignments}</h2>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.subject}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.task}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.dueDate}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-2 px-2">{assignment.subject}</td>
                      <td className="py-2 px-2">{assignment.task}</td>
                      <td className="py-2 px-2">{assignment.due}</td>
                      <td className="py-2 px-2">
                        <span className={assignment.status === t.returned ? 'text-green-600' : 'text-red-600'}>
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

        {/* Messages Section */}
        {activeSection === 'messages' && (
          <div className="bg-white border border-gray-300">
            <div className="bg-[#e8f0f8] border-b border-gray-300 px-4 py-2">
              <h2 className="text-base font-semibold text-gray-800">{t.messages}</h2>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.date}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.from}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.subject}</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg, index) => (
                    <tr 
                      key={index} 
                      className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                        msg.unread ? 'font-semibold' : ''
                      }`}
                    >
                      <td className="py-2 px-2">{msg.date}</td>
                      <td className="py-2 px-2">{msg.from}</td>
                      <td className="py-2 px-2">
                        {msg.unread && <span className="text-[#003d82] mr-1">●</span>}
                        {msg.subject}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attendance Section */}
        {activeSection === 'attendance' && (
          <div className="space-y-4">
            {/* Attendance Statistics */}
            <div className="bg-white border border-gray-300">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-4 py-2">
                <h2 className="text-base font-semibold text-gray-800">{t.attendanceStats}</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm text-gray-600">{t.totalAbsences}</p>
                      <p className="text-xl font-bold text-[#003d82]">{attendanceStats.totalAbsences} {t.days}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">{t.totalLates}</p>
                      <p className="text-xl font-bold text-[#003d82]">{attendanceStats.totalLates} {t.times}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Records */}
            <div className="bg-white border border-gray-300">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-4 py-2">
                <h2 className="text-base font-semibold text-gray-800">{t.attendanceRecords}</h2>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.date}</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.type}</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.subject}</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.reason}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2 px-2">{record.date}</td>
                        <td className="py-2 px-2">
                          <span className={record.type === t.absent ? 'text-red-600 font-medium' : 'text-orange-600 font-medium'}>
                            {record.type}
                          </span>
                        </td>
                        <td className="py-2 px-2">{record.subject}</td>
                        <td className="py-2 px-2">{record.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Exams Section */}
        {activeSection === 'exams' && (
          <div className="bg-white border border-gray-300">
            <div className="bg-[#e8f0f8] border-b border-gray-300 px-4 py-2">
              <h2 className="text-base font-semibold text-gray-800">{t.upcomingExams}</h2>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.date}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.subject}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.subject}</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">{t.examType}</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingExams.map((exam, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-2 px-2">{exam.date}</td>
                      <td className="py-2 px-2 font-medium">{exam.subject}</td>
                      <td className="py-2 px-2">{exam.topic}</td>
                      <td className="py-2 px-2">
                        <span className={exam.type === t.exam ? 'text-red-600 font-medium' : 'text-blue-600 font-medium'}>
                          {exam.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <div className="space-y-4">
            {/* Language Settings */}
            <div className="bg-white border border-gray-300">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-4 py-2">
                <h2 className="text-base font-semibold text-gray-800">{t.languageSettings}</h2>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t.language}</label>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'fi' | 'en')}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="fi">{t.finnish}</option>
                      <option value="en">{t.english}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white border border-gray-300">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-4 py-2">
                <h2 className="text-base font-semibold text-gray-800">{t.notificationSettings}</h2>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">{t.emailNotifications}</label>
                    <select className="px-3 py-2 border border-gray-300 rounded text-sm">
                      <option>{t.enabled}</option>
                      <option>{t.disabled}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white border border-gray-300">
              <div className="bg-[#e8f0f8] border-b border-gray-300 px-4 py-2">
                <h2 className="text-base font-semibold text-gray-800">{t.changePassword}</h2>
              </div>
              <div className="p-4">
                <div className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.currentPassword}</label>
                    <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.newPassword}</label>
                    <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.confirmPassword}</label>
                    <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
                  </div>
                  <button className="px-4 py-2 bg-[#003d82] text-white rounded text-sm hover:bg-[#0052a3]">
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
