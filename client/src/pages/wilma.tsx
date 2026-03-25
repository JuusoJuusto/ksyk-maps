import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { 
  Calendar, 
  Clock, 
  BookOpen,
  FileText, 
  MessageSquare,
  User,
  ChevronRight,
  Home,
  BarChart3,
  Bell
} from 'lucide-react';

export default function Wilma() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('frontpage');

  // Mock student data
  const studentData = {
    name: 'Student Name',
    class: '9A',
    school: 'Kulosaaren yhteiskoulu'
  };

  const upcomingLessons = [
    { time: '08:00 - 08:45', subject: 'Mathematics', room: 'Room 301', teacher: 'Anderson' },
    { time: '09:00 - 09:45', subject: 'English', room: 'Room 205', teacher: 'Smith' },
    { time: '10:00 - 10:45', subject: 'Physics', room: 'Lab 102', teacher: 'Johnson' },
    { time: '11:00 - 11:45', subject: 'History', room: 'Room 401', teacher: 'Brown' },
  ];

  const recentGrades = [
    { date: '20.03.2024', subject: 'Mathematics', assignment: 'Chapter 5 Test', grade: '9' },
    { date: '18.03.2024', subject: 'English', assignment: 'Essay', grade: '10' },
    { date: '15.03.2024', subject: 'Physics', assignment: 'Lab Report', grade: '8' },
  ];

  const messages = [
    { date: '24.03.2024', from: 'Anderson', subject: 'Math Test Results', unread: true },
    { date: '23.03.2024', from: 'Smith', subject: 'English Assignment Feedback', unread: true },
    { date: '22.03.2024', from: 'School Office', subject: 'Parent-Teacher Meeting', unread: false },
  ];

  const assignments = [
    { subject: 'Mathematics', task: 'Homework Chapter 5', due: '28.03.2024', status: 'Not returned' },
    { subject: 'English', task: 'Essay: Climate Change', due: '30.03.2024', status: 'Not returned' },
    { subject: 'Physics', task: 'Lab Report', due: '26.03.2024', status: 'Returned' },
  ];

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
                Notifications (3)
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
              Frontpage
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
              Schedule
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
              Grades
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
              Assignments
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
              Messages (2)
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
                <h2 className="text-base font-semibold text-gray-800">Today's Lessons</h2>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Time</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Subject</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Room</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Teacher</th>
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
                <h2 className="text-base font-semibold text-gray-800">Recent Grades</h2>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Subject</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Assignment</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Grade</th>
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
                <h2 className="text-base font-semibold text-gray-800">Messages</h2>
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
              <h2 className="text-base font-semibold text-gray-800">Weekly Schedule</h2>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Time</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Subject</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Room</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Teacher</th>
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
              <h2 className="text-base font-semibold text-gray-800">Grades</h2>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Subject</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Assignment</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Grade</th>
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
              <h2 className="text-base font-semibold text-gray-800">Assignments</h2>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Subject</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Task</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Due Date</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-2 px-2">{assignment.subject}</td>
                      <td className="py-2 px-2">{assignment.task}</td>
                      <td className="py-2 px-2">{assignment.due}</td>
                      <td className="py-2 px-2">
                        <span className={assignment.status === 'Returned' ? 'text-green-600' : 'text-red-600'}>
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
              <h2 className="text-base font-semibold text-gray-800">Messages</h2>
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
        )}
      </main>
    </div>
  );
}
