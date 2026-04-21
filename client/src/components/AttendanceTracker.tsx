import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { 
  CheckCircle, XCircle, Clock, BookOpen, Smartphone, 
  MessageCircle, AlertTriangle, Moon, Calendar, User, Filter
} from 'lucide-react';

interface AttendanceMark {
  id?: string;
  studentId: string;
  studentName?: string;
  date: string;
  timeSlot: string;
  subject: string;
  markType: 'present' | 'absent' | 'late' | 'forgot_books' | 'forgot_homework' | 'sleeping' | 'phone_use' | 'talking' | 'bad_behavior';
  severity: 'normal' | 'warning' | 'serious';
  notes: string;
  teacherId: string;
  teacherName: string;
}

const MARK_TYPES = [
  { value: 'present', label: 'Present', icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'absent', label: 'Absent', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'late', label: 'Late', icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'forgot_books', label: 'Forgot Books', icon: BookOpen, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'forgot_homework', label: 'Forgot Homework', icon: BookOpen, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'sleeping', label: 'Sleeping', icon: Moon, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'phone_use', label: 'Phone Use', icon: Smartphone, color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'talking', label: 'Talking', icon: MessageCircle, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'bad_behavior', label: 'Bad Behavior', icon: AlertTriangle, color: 'bg-red-100 text-red-700 border-red-300' },
];

export default function AttendanceTracker({ studentId, teacherMode = false }: { studentId?: string; teacherMode?: boolean }) {
  const [marks, setMarks] = useState<AttendanceMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMark, setNewMark] = useState<Partial<AttendanceMark>>({
    date: new Date().toISOString().split('T')[0],
    markType: 'present',
    severity: 'normal',
    notes: '',
  });

  useEffect(() => {
    fetchMarks();
  }, [studentId, selectedDate]);

  const fetchMarks = async () => {
    try {
      const params = new URLSearchParams();
      if (studentId) params.append('studentId', studentId);
      if (selectedDate) params.append('date', selectedDate);

      const response = await fetch(`/api/attendance-marks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMarks(data);
      }
    } catch (error) {
      console.error('Error fetching attendance marks:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMark = async () => {
    if (!newMark.studentId || !newMark.subject || !newMark.timeSlot) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch('/api/attendance-marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMark),
      });

      if (response.ok) {
        toast.success('Attendance mark added');
        setShowAddForm(false);
        setNewMark({
          date: new Date().toISOString().split('T')[0],
          markType: 'present',
          severity: 'normal',
          notes: '',
        });
        fetchMarks();
      } else {
        toast.error('Failed to add mark');
      }
    } catch (error) {
      console.error('Error adding mark:', error);
      toast.error('Failed to add mark');
    }
  };

  const deleteMark = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mark?')) return;

    try {
      const response = await fetch(`/api/attendance-marks/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Mark deleted');
        fetchMarks();
      } else {
        toast.error('Failed to delete mark');
      }
    } catch (error) {
      console.error('Error deleting mark:', error);
      toast.error('Failed to delete mark');
    }
  };

  const getMarkConfig = (type: string) => {
    return MARK_TYPES.find(m => m.value === type) || MARK_TYPES[0];
  };

  const filteredMarks = filterType === 'all' 
    ? marks 
    : marks.filter(m => m.markType === filterType);

  const getStats = () => {
    const total = marks.length;
    const present = marks.filter(m => m.markType === 'present').length;
    const absent = marks.filter(m => m.markType === 'absent').length;
    const late = marks.filter(m => m.markType === 'late').length;
    const behavioral = marks.filter(m => 
      ['sleeping', 'phone_use', 'talking', 'bad_behavior'].includes(m.markType)
    ).length;

    return { total, present, absent, late, behavioral };
  };

  const stats = getStats();

  if (loading) {
    return <div className="p-8 text-center">Loading attendance data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attendance Tracking</h2>
          <p className="text-muted-foreground">Color-coded attendance marks and behavior tracking</p>
        </div>
        {teacherMode && (
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : 'Add Mark'}
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Present</p>
                <p className="text-2xl font-bold text-green-800">{stats.present}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Absent</p>
                <p className="text-2xl font-bold text-red-800">{stats.absent}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Late</p>
                <p className="text-2xl font-bold text-yellow-800">{stats.late}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700">Behavioral</p>
                <p className="text-2xl font-bold text-purple-800">{stats.behavioral}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="p-2 border rounded-md"
              >
                <option value="all">All Marks</option>
                {MARK_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Mark Form */}
      {showAddForm && teacherMode && (
        <Card className="border-2 border-blue-500">
          <CardHeader className="bg-blue-50">
            <CardTitle>Add Attendance Mark</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Student ID</Label>
                <Input
                  value={newMark.studentId || ''}
                  onChange={(e) => setNewMark({ ...newMark, studentId: e.target.value })}
                  placeholder="e.g., 123456"
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newMark.date}
                  onChange={(e) => setNewMark({ ...newMark, date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time Slot</Label>
                <Input
                  value={newMark.timeSlot || ''}
                  onChange={(e) => setNewMark({ ...newMark, timeSlot: e.target.value })}
                  placeholder="e.g., 08:00-09:30"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={newMark.subject || ''}
                  onChange={(e) => setNewMark({ ...newMark, subject: e.target.value })}
                  placeholder="e.g., Mathematics"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mark Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {MARK_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setNewMark({ ...newMark, markType: type.value as any })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        newMark.markType === type.value 
                          ? type.color + ' border-current' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-xs font-semibold">{type.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <select
                value={newMark.severity}
                onChange={(e) => setNewMark({ ...newMark, severity: e.target.value as any })}
                className="w-full p-2 border rounded-md"
              >
                <option value="normal">Normal</option>
                <option value="warning">Warning</option>
                <option value="serious">Serious</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                value={newMark.notes}
                onChange={(e) => setNewMark({ ...newMark, notes: e.target.value })}
                className="w-full p-2 border rounded-md min-h-[80px]"
                placeholder="Additional notes..."
              />
            </div>

            <Button onClick={addMark} className="w-full">
              Add Mark
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Marks List */}
      <div className="space-y-3">
        {filteredMarks.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Attendance Marks</h3>
              <p className="text-gray-500">No marks found for the selected date and filter</p>
            </CardContent>
          </Card>
        ) : (
          filteredMarks.map((mark) => {
            const config = getMarkConfig(mark.markType);
            const Icon = config.icon;
            
            return (
              <Card key={mark.id} className={`border-2 ${config.color}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{config.label}</h3>
                          {mark.severity !== 'normal' && (
                            <Badge className={
                              mark.severity === 'serious' 
                                ? 'bg-red-600' 
                                : 'bg-yellow-600'
                            }>
                              {mark.severity}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {mark.subject} • {mark.timeSlot}
                        </p>
                        {mark.studentName && (
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <User className="w-3 h-3" />
                            {mark.studentName}
                          </p>
                        )}
                        {mark.notes && (
                          <p className="text-sm text-gray-700 mt-2 italic">"{mark.notes}"</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Marked by {mark.teacherName} on {mark.date}
                        </p>
                      </div>
                    </div>
                    {teacherMode && mark.id && (
                      <Button
                        onClick={() => deleteMark(mark.id!)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
