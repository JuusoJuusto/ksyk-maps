import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Info
} from "lucide-react";
import { ATTENDANCE_MARKS, getMarkColor, getMarkLabel } from "@shared/attendanceMarks";

interface AttendanceMark {
  id: string;
  date: string;
  lessonNumber: number;
  lessonTime: string;
  subject: string;
  markType: string;
  reason?: string;
  teacher?: string;
}

interface WilmaAttendanceCalendarProps {
  userRole?: 'student' | 'teacher' | 'admin';
  studentId?: string;
}

export default function WilmaAttendanceCalendar({ 
  userRole = 'student',
  studentId 
}: WilmaAttendanceCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(0); // 0 = current week, -1 = last week, etc.
  const [selectedPeriod, setSelectedPeriod] = useState('5'); // Current period

  // Mock attendance data - in real app, fetch from API
  const mockAttendance: AttendanceMark[] = [
    { id: '1', date: '2026-05-20', lessonNumber: 8, lessonTime: '08:00-08:45', subject: 'Matematiikka', markType: 'P', teacher: 'Virtanen' },
    { id: '2', date: '2026-05-20', lessonNumber: 9, lessonTime: '09:00-09:45', subject: 'Englanti', markType: 'P', teacher: 'Korhonen' },
    { id: '3', date: '2026-05-20', lessonNumber: 10, lessonTime: '10:00-10:45', subject: 'Fysiikka', markType: 'P', teacher: 'Nieminen' },
    { id: '4', date: '2026-05-20', lessonNumber: 11, lessonTime: '11:00-11:45', subject: 'Historia', markType: 'P', teacher: 'Mäkinen' },
    { id: '5', date: '2026-05-20', lessonNumber: 12, lessonTime: '12:00-12:45', subject: 'Kemia', markType: 'P', teacher: 'Salo' },
    
    { id: '6', date: '2026-05-18', lessonNumber: 8, lessonTime: '08:00-08:45', subject: 'Matematiikka', markType: 'M', reason: 'Myöhästyi bussista', teacher: 'Virtanen' },
    { id: '7', date: '2026-05-18', lessonNumber: 9, lessonTime: '09:00-09:45', subject: 'Englanti', markType: 'P', teacher: 'Korhonen' },
    
    { id: '8', date: '2026-05-24', lessonNumber: 8, lessonTime: '08:00-08:45', subject: 'Matematiikka', markType: 'SPe1', reason: 'Lääkärikäynti', teacher: 'Virtanen' },
    { id: '9', date: '2026-05-24', lessonNumber: 9, lessonTime: '09:00-09:45', subject: 'Englanti', markType: 'SPe2', reason: 'Lääkärikäynti', teacher: 'Korhonen' },
  ];

  // Get current week dates
  const getWeekDates = (weekOffset: number) => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1 + (weekOffset * 7));
    
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentWeek);
  const weekDayNames = ['Ma', 'Ti', 'Ke', 'To', 'Pe'];

  // Get lessons for the week (8-15 typically)
  const lessonNumbers = [8, 9, 10, 11, 12, 13, 14, 15];

  // Get mark for specific date and lesson
  const getMark = (date: Date, lessonNum: number): AttendanceMark | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return mockAttendance.find(m => m.date === dateStr && m.lessonNumber === lessonNum);
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <div className="space-y-4">
      {/* Header with period selector and week navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-[#003d82]" />
          <div>
            <h2 className="text-xl font-bold text-gray-800">Tuntimerkinnät</h2>
            <p className="text-sm text-gray-600">Selväämäärä</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="1">1. jakso</option>
            <option value="2">2. jakso</option>
            <option value="3">3. jakso</option>
            <option value="4">4. jakso</option>
            <option value="5">5. jakso</option>
          </select>

          <div className="flex items-center gap-2 border border-gray-300 rounded-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentWeek(currentWeek - 1)}
              className="hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-2 whitespace-nowrap">
              Viikko {currentWeek === 0 ? 'Tämä' : currentWeek > 0 ? `+${currentWeek}` : currentWeek}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentWeek(currentWeek + 1)}
              className="hover:bg-gray-100"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {currentWeek !== 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(0)}
            >
              Tämä viikko
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button className="px-4 py-2 text-sm font-medium text-[#003d82] border-b-2 border-[#003d82]">
          Selvittämättä
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
          Kaikki merkinnät
        </button>
      </div>

      {/* Calendar Grid */}
      <Card className="border-2 border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-2 text-left text-sm font-semibold text-gray-700 w-32">
                  Päivämäärä
                </th>
                {weekDates.map((date, idx) => (
                  <th 
                    key={idx} 
                    className={`border border-gray-300 p-2 text-center text-sm font-semibold ${
                      isToday(date) ? 'bg-green-100 text-green-800' : 'text-gray-700'
                    }`}
                  >
                    <div>{weekDayNames[idx]}</div>
                    <div className="text-xs font-normal">{formatDate(date)}</div>
                  </th>
                ))}
                <th className="border border-gray-300 p-2 text-center text-sm font-semibold text-gray-700 w-20">
                  Yhteensä
                </th>
                <th className="border border-gray-300 p-2 text-center text-sm font-semibold text-gray-700 w-32">
                  Huomioita
                </th>
              </tr>
            </thead>
            <tbody>
              {lessonNumbers.map((lessonNum) => {
                const marksThisLesson = weekDates.map(date => getMark(date, lessonNum));
                const hasAnyMarks = marksThisLesson.some(m => m !== undefined);
                
                if (!hasAnyMarks) return null;

                return (
                  <tr key={lessonNum} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 text-sm font-medium text-gray-700">
                      {lessonNum}
                    </td>
                    {weekDates.map((date, idx) => {
                      const mark = getMark(date, lessonNum);
                      
                      return (
                        <td 
                          key={idx} 
                          className={`border border-gray-300 p-1 text-center ${
                            isToday(date) ? 'bg-green-50' : ''
                          }`}
                        >
                          {mark ? (
                            <div className="group relative">
                              <Badge
                                className={`${getMarkColor(mark.markType)} cursor-pointer text-xs font-bold px-2 py-1`}
                                title={`${mark.subject}\n${getMarkLabel(mark.markType)}${mark.reason ? `\n${mark.reason}` : ''}`}
                              >
                                {mark.markType}
                              </Badge>
                              {/* Tooltip on hover */}
                              <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded p-2 -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full whitespace-nowrap">
                                <div className="font-semibold">{mark.subject}</div>
                                <div>{mark.lessonTime}</div>
                                <div>{getMarkLabel(mark.markType)}</div>
                                {mark.reason && <div className="text-yellow-300">{mark.reason}</div>}
                                {mark.teacher && <div className="text-gray-400">{mark.teacher}</div>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border border-gray-300 p-2 text-center text-sm">
                      <span className="text-gray-600">0</span>
                    </td>
                    <td className="border border-gray-300 p-2 text-sm text-gray-600">
                      {marksThisLesson.find(m => m?.reason)?.reason || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legend */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="w-4 h-4" />
            Merkintöjen selitykset
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Object.entries(ATTENDANCE_MARKS).slice(0, 12).map(([code, mark]) => (
              <div key={code} className="flex items-center gap-2">
                <Badge className={`${getMarkColor(code)} text-xs font-bold px-2 py-1`}>
                  {code}
                </Badge>
                <span className="text-xs text-gray-700">{mark.label}</span>
              </div>
            ))}
          </div>
          <Button
            variant="link"
            size="sm"
            className="mt-2 text-xs text-[#003d82]"
          >
            Näytä kaikki merkinnät ({Object.keys(ATTENDANCE_MARKS).length})
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
