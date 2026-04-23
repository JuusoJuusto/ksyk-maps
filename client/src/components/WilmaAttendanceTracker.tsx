import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  hours: number;
  reason?: string;
  subject?: string;
}

export default function WilmaAttendanceTracker() {
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'late' | 'excused'>('all');

  // Mock data
  const attendance: AttendanceRecord[] = [
    { id: "1", date: "22.04.2026", status: "present", hours: 0, subject: "Kaikki tunnit" },
    { id: "2", date: "21.04.2026", status: "present", hours: 0, subject: "Kaikki tunnit" },
    { id: "3", date: "18.04.2026", status: "late", hours: 1, reason: "Myöhästyi bussista", subject: "Matematiikka" },
    { id: "4", date: "17.04.2026", status: "present", hours: 0, subject: "Kaikki tunnit" },
    { id: "5", date: "16.04.2026", status: "absent", hours: 6, reason: "Sairaana", subject: "Kaikki tunnit" },
    { id: "6", date: "15.04.2026", status: "excused", hours: 3, reason: "Lääkärikäynti", subject: "Iltapäivän tunnit" },
    { id: "7", date: "14.04.2026", status: "present", hours: 0, subject: "Kaikki tunnit" },
    { id: "8", date: "11.04.2026", status: "present", hours: 0, subject: "Kaikki tunnit" },
  ];

  const stats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
    excused: attendance.filter(a => a.status === 'excused').length,
    totalHours: attendance.reduce((sum, a) => sum + a.hours, 0),
    percentage: ((attendance.filter(a => a.status === 'present').length / attendance.length) * 100).toFixed(1),
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'absent': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'late': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'excused': return <AlertCircle className="w-5 h-5 text-blue-600" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Läsnä';
      case 'absent': return 'Poissa';
      case 'late': return 'Myöhässä';
      case 'excused': return 'Hyväksytty poissaolo';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-50 text-green-700 border-green-200';
      case 'absent': return 'bg-red-50 text-red-700 border-red-200';
      case 'late': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'excused': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const filteredAttendance = filter === 'all' 
    ? attendance 
    : attendance.filter(a => a.status === filter);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Läsnä</p>
                <p className="text-xl font-bold text-green-600">{stats.present}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-xs text-gray-600">Poissa</p>
                <p className="text-xl font-bold text-red-600">{stats.absent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-xs text-gray-600">Myöhässä</p>
                <p className="text-xl font-bold text-yellow-600">{stats.late}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Hyväksytty</p>
                <p className="text-xl font-bold text-blue-600">{stats.excused}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div>
              <p className="text-xs text-gray-600">Läsnäolo-%</p>
              <p className="text-xl font-bold text-[#003d82]">{stats.percentage}%</p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalHours}h poissa</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-[#dddddd]">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-[#003d82] text-white' : ''}
            >
              Kaikki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('present')}
              className={filter === 'present' ? 'bg-green-600 text-white' : ''}
            >
              Läsnä
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('absent')}
              className={filter === 'absent' ? 'bg-red-600 text-white' : ''}
            >
              Poissa
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('late')}
              className={filter === 'late' ? 'bg-yellow-600 text-white' : ''}
            >
              Myöhässä
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('excused')}
              className={filter === 'excused' ? 'bg-blue-600 text-white' : ''}
            >
              Hyväksytty
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance List */}
      <Card className="border-[#dddddd]">
        <CardHeader className="p-4 bg-[#003d82] text-white">
          <CardTitle className="text-base">Poissaolohistoria</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {filteredAttendance.map((record) => (
              <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(record.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{record.date}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                          {getStatusText(record.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{record.subject}</p>
                      {record.reason && (
                        <p className="text-sm text-gray-500 mt-1">Syy: {record.reason}</p>
                      )}
                      {record.hours > 0 && (
                        <p className="text-xs text-gray-500 mt-1">{record.hours} tuntia</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
