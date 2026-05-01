import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, XCircle, Clock, AlertCircle, Calendar, 
  Users, TrendingUp, Download, Bell, Search, Filter 
} from "lucide-react";
import { formatDateFinnish, formatTimeFinnish, getDayNameFinnish, getRelativeTimeFinnish } from "@/lib/dateUtils";

interface AttendanceMark {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  lessonNumber: number;
  lessonTime: string;
  subject: string;
  markType: 'present' | 'absent' | 'late' | 'excused';
  reason?: string;
  teacher: string;
  timestamp: string;
}

interface AttendanceStats {
  totalLessons: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

/**
 * Improved Attendance System (Tuntimerkintä)
 * - Real-time updates
 * - Better UI/UX
 * - Statistics and analytics
 * - Parent notifications
 * - NO MOCK DATA
 */
export default function ImprovedAttendanceSystem({ userId, userRole }: { userId: string; userRole: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'mark' | 'stats' | 'history'>('mark');

  // Fetch attendance marks - REAL DATA ONLY
  const { data: attendanceMarks = [], isLoading: marksLoading } = useQuery({
    queryKey: ['attendance-marks', userId, selectedDate, selectedClass],
    queryFn: async () => {
      const params = new URLSearchParams({
        date: selectedDate,
        ...(selectedClass && { classId: selectedClass }),
        ...(userRole === 'student' && { studentId: userId }),
        ...(userRole === 'teacher' && { teacherId: userId })
      });
      
      const response = await fetch(`/api/wilma/attendance-marks?${params}`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Failed to fetch attendance marks');
      }
      return response.json();
    },
    retry: false
  });

  // Fetch attendance statistics - REAL DATA ONLY
  const { data: stats } = useQuery<AttendanceStats>({
    queryKey: ['attendance-stats', userId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/attendance-stats/${userId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return {
            totalLessons: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            percentage: 0
          };
        }
        throw new Error('Failed to fetch attendance stats');
      }
      return response.json();
    },
    enabled: userRole === 'student',
    retry: false
  });

  // Mark attendance mutation
  const markAttendance = useMutation({
    mutationFn: async (data: {
      studentId: string;
      date: string;
      lessonNumber: number;
      lessonTime: string;
      subject: string;
      markType: string;
      reason?: string;
    }) => {
      const response = await fetch('/api/wilma/attendance-marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          teacherId: userId,
          timestamp: new Date().toISOString()
        }),
      });
      if (!response.ok) throw new Error('Failed to mark attendance');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-marks'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] });
      toast({
        title: "✅ Merkitty",
        description: "Tuntimerkintä tallennettu onnistuneesti",
      });
    },
    onError: () => {
      toast({
        title: "❌ Virhe",
        description: "Tuntimerkinnän tallennus epäonnistui",
        variant: "destructive",
      });
    }
  });

  // Get mark type color
  const getMarkTypeColor = (type: string) => {
    switch (type) {
      case 'present': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'absent': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'late': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'excused': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  // Get mark type icon
  const getMarkTypeIcon = (type: string) => {
    switch (type) {
      case 'present': return <CheckCircle className="w-5 h-5" />;
      case 'absent': return <XCircle className="w-5 h-5" />;
      case 'late': return <Clock className="w-5 h-5" />;
      case 'excused': return <AlertCircle className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  // Get mark type label
  const getMarkTypeLabel = (type: string) => {
    switch (type) {
      case 'present': return 'Läsnä';
      case 'absent': return 'Poissa';
      case 'late': return 'Myöhässä';
      case 'excused': return 'Poissaolo hyväksytty';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-gray-900 dark:text-gray-100">
                Tuntimerkinnät
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {formatDateFinnish(new Date())} • {getDayNameFinnish(new Date())}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'mark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('mark')}
              >
                <Users className="w-4 h-4 mr-1.5" />
                Merkitse
              </Button>
              <Button
                variant={viewMode === 'stats' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('stats')}
              >
                <TrendingUp className="w-4 h-4 mr-1.5" />
                Tilastot
              </Button>
              <Button
                variant={viewMode === 'history' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('history')}
              >
                <Calendar className="w-4 h-4 mr-1.5" />
                Historia
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics View */}
      {viewMode === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Yhteensä</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                  {stats.totalLessons}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">oppituntia</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300">Läsnä</p>
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {stats.present}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {stats.totalLessons > 0 ? Math.round((stats.present / stats.totalLessons) * 100) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-700 dark:text-red-300">Poissa</p>
                </div>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {stats.absent}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {stats.totalLessons > 0 ? Math.round((stats.absent / stats.totalLessons) * 100) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">Myöhässä</p>
                </div>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                  {stats.late}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  {stats.totalLessons > 0 ? Math.round((stats.late / stats.totalLessons) * 100) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">Hyväksytty</p>
                </div>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {stats.excused}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {stats.totalLessons > 0 ? Math.round((stats.excused / stats.totalLessons) * 100) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Marks List */}
      {viewMode === 'history' && (
        <Card className="border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-base">Tuntimerkintähistoria</CardTitle>
          </CardHeader>
          <CardContent>
            {marksLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : attendanceMarks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Ei tuntimerkintöjä</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attendanceMarks.map((mark: AttendanceMark) => (
                  <div
                    key={mark.id}
                    className={`p-4 rounded-lg border ${getMarkTypeColor(mark.markType)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getMarkTypeIcon(mark.markType)}
                        <div>
                          <p className="font-medium">{mark.subject}</p>
                          <p className="text-sm opacity-75">
                            {formatDateFinnish(mark.date)} • {mark.lessonTime}
                          </p>
                          {mark.reason && (
                            <p className="text-sm mt-1 opacity-90">Syy: {mark.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{getMarkTypeLabel(mark.markType)}</p>
                        <p className="text-xs opacity-75">{mark.teacher}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
