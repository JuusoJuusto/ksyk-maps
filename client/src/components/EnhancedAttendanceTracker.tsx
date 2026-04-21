import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import EnhancedUserSelector from '@/components/EnhancedUserSelector';
import { 
  CheckCircle, XCircle, Clock, BookOpen, Smartphone, 
  MessageCircle, AlertTriangle, Moon, Calendar, User, Filter,
  Plus, Edit, Trash2, Search, Download, TrendingUp, AlertCircle as AlertIcon
} from 'lucide-react';

interface AttendanceMark {
  id: string;
  studentId: string;
  studentName: string;
  classId?: string;
  date: string;
  timeSlot: string;
  subject: string;
  markType: 'present' | 'absent' | 'late' | 'forgot_books' | 'forgot_homework' | 'sleeping' | 'phone_use' | 'talking' | 'bad_behavior' | 'good_behavior' | 'active_participation' | 'excellent_performance';
  severity: 'normal' | 'warning' | 'serious';
  notes: string;
  teacherId: string;
  teacherName: string;
  notifiedParent: boolean;
  createdAt: string;
}

const MARK_TYPES_FI = [
  { value: 'present', label: 'Läsnä', icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'absent', label: 'Poissa', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'late', label: 'Myöhässä', icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'forgot_books', label: 'Unohtui kirjat', icon: BookOpen, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'forgot_homework', label: 'Unohtui läksyt', icon: BookOpen, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'sleeping', label: 'Nukkui', icon: Moon, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'phone_use', label: 'Puhelimen käyttö', icon: Smartphone, color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'talking', label: 'Puhuminen', icon: MessageCircle, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'bad_behavior', label: 'Huono käytös', icon: AlertTriangle, color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'good_behavior', label: 'Hyvä käytös', icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'active_participation', label: 'Aktiivinen osallistuminen', icon: MessageCircle, color: 'bg-sky-100 text-sky-700 border-sky-300' },
  { value: 'excellent_performance', label: 'Erinomainen suoritus', icon: AlertTriangle, color: 'bg-amber-100 text-amber-700 border-amber-300' },
];

const PERIODS = ['Kaikki', 'Jakso 1', 'Jakso 2', 'Jakso 3', 'Jakso 4', 'Jakso 5'];
const SCHOOL_YEARS = ['Kaikki', 'Syksy 2026', 'Kevät 2026', 'Syksy 2025', 'Kevät 2025'];

export default function EnhancedAttendanceTracker() {
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState('Kaikki');
  const [selectedYear, setSelectedYear] = useState('Kaikki');
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMark, setEditingMark] = useState<AttendanceMark | null>(null);
  
  const [formData, setFormData] = useState({
    studentId: '',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '08:00-09:30',
    subject: '',
    markType: 'present' as const,
    severity: 'normal' as const,
    notes: '',
  });

  // Fetch attendance marks
  const { data: marks = [], isLoading } = useQuery({
    queryKey: ['attendance-marks', selectedPeriod, selectedYear, selectedDate, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPeriod !== 'Kaikki') params.append('period', selectedPeriod);
      if (selectedYear !== 'Kaikki') params.append('schoolYear', selectedYear);
      if (selectedDate) params.append('date', selectedDate);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/wilma/attendance-marks?${params}`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch students for dropdown
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users?role=student');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Create mark mutation
  const createMarkMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/wilma/attendance-marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create mark');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-marks'] });
      alert('✅ Merkintä lisätty!');
      resetForm();
    },
    onError: () => {
      alert('❌ Merkinnän lisääminen epäonnistui');
    }
  });

  // Update mark mutation
  const updateMarkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/wilma/attendance-marks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update mark');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-marks'] });
      alert('✅ Merkintä päivitetty!');
      resetForm();
    },
    onError: () => {
      alert('❌ Merkinnän päivittäminen epäonnistui');
    }
  });

  // Delete mark mutation
  const deleteMarkMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/attendance-marks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete mark');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-marks'] });
      alert('✅ Merkintä poistettu!');
    }
  });

  const resetForm = () => {
    setFormData({
      studentId: '',
      date: new Date().toISOString().split('T')[0],
      timeSlot: '08:00-09:30',
      subject: '',
      markType: 'present',
      severity: 'normal',
      notes: '',
    });
    setShowAddForm(false);
    setEditingMark(null);
  };

  const handleEdit = (mark: AttendanceMark) => {
    setEditingMark(mark);
    setFormData({
      studentId: mark.studentId,
      date: mark.date,
      timeSlot: mark.timeSlot,
      subject: mark.subject,
      markType: mark.markType,
      severity: mark.severity,
      notes: mark.notes,
    });
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!formData.studentId || !formData.subject) {
      alert('Täytä pakolliset kentät');
      return;
    }

    if (editingMark) {
      updateMarkMutation.mutate({ id: editingMark.id, data: formData });
    } else {
      createMarkMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Haluatko varmasti poistaa tämän merkinnän?')) {
      deleteMarkMutation.mutate(id);
    }
  };

  const getMarkConfig = (type: string) => {
    return MARK_TYPES_FI.find(m => m.value === type) || MARK_TYPES_FI[0];
  };

  const filteredMarks = marks
    .filter((m: AttendanceMark) => filterType === 'all' || m.markType === filterType)
    .filter((m: AttendanceMark) => 
      searchTerm === '' || 
      m.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.studentId.includes(searchTerm) ||
      m.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getStats = () => {
    const total = marks.length;
    const present = marks.filter((m: AttendanceMark) => m.markType === 'present').length;
    const absent = marks.filter((m: AttendanceMark) => m.markType === 'absent').length;
    const late = marks.filter((m: AttendanceMark) => m.markType === 'late').length;
    const behavioral = marks.filter((m: AttendanceMark) => 
      ['sleeping', 'phone_use', 'talking', 'bad_behavior'].includes(m.markType)
    ).length;
    const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : '0';

    return { total, present, absent, late, behavioral, attendanceRate };
  };

  const stats = getStats();

  if (showAddForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-red-600" />
            {editingMark ? 'Muokkaa merkintää' : 'Lisää uusi merkintä'}
          </h2>
          <Button variant="outline" onClick={resetForm}>
            Peruuta
          </Button>
        </div>

        <Card className="border-2 border-red-200 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <EnhancedUserSelector
                  users={students}
                  value={formData.studentId}
                  onChange={(value) => setFormData({ ...formData, studentId: value })}
                  label="Opiskelija"
                  placeholder="Valitse opiskelija..."
                  required={true}
                  filterRole="student"
                  showDetails={true}
                />
              </div>
              <div>
                <Label>Päivämäärä *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Aika *</Label>
                <Input
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                  placeholder="esim. 08:00-09:30"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Aine *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="esim. Matematiikka"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Merkinnän tyyppi *</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {MARK_TYPES_FI.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setFormData({ ...formData, markType: type.value as any })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.markType === type.value 
                          ? type.color + ' border-current shadow-md' 
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

            <div>
              <Label>Vakavuus</Label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="normal">Normaali</option>
                <option value="warning">Varoitus</option>
                <option value="serious">Vakava</option>
              </select>
            </div>

            <div>
              <Label>Lisätiedot</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md min-h-[100px] focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Kirjoita lisätietoja..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={createMarkMutation.isPending || updateMarkMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {createMarkMutation.isPending || updateMarkMutation.isPending ? 'Tallennetaan...' : 'Tallenna'}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Peruuta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-red-600" />
            Tuntimerkinnät
          </h2>
          <p className="text-gray-600">Hallinnoi läsnäoloja ja käyttäytymismerkintöjä</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-2" />
          Lisää merkintä
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Yhteensä</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Läsnä</p>
                <p className="text-3xl font-bold mt-1">{stats.present}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Poissa</p>
                <p className="text-3xl font-bold mt-1">{stats.absent}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Myöhässä</p>
                <p className="text-3xl font-bold mt-1">{stats.late}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Läsnäolo-%</p>
                <p className="text-3xl font-bold mt-1">{stats.attendanceRate}%</p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-2 border-red-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-sm mb-1 block">Jakso</Label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {PERIODS.map(period => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm mb-1 block">Lukuvuosi</Label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {SCHOOL_YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm mb-1 block">Merkinnän tyyppi</Label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="all">Kaikki merkinnät</option>
                {MARK_TYPES_FI.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm mb-1 block">Haku</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Hae opiskelijaa..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div>
              <Label className="text-sm mb-1 block">Päivämäärä</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">Alkaen</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">Päättyen</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPeriod('Kaikki');
                setSelectedYear('Kaikki');
                setSelectedDate('');
                setStartDate('');
                setEndDate('');
                setFilterType('all');
                setSearchTerm('');
              }}
            >
              Tyhjennä suodattimet
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Vie Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Marks List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ladataan merkintöjä...</p>
        </div>
      ) : filteredMarks.length === 0 ? (
        <Card className="border-2 border-gray-200">
          <CardContent className="p-12 text-center">
            <AlertIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Ei merkintöjä</h3>
            <p className="text-gray-500">Valituilla suodattimilla ei löytynyt merkintöjä</p>
            <Button onClick={() => setShowAddForm(true)} className="mt-4 bg-red-600 hover:bg-red-700">
              Lisää ensimmäinen merkintä
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMarks.map((mark: AttendanceMark) => {
            const config = getMarkConfig(mark.markType);
            const Icon = config.icon;
            
            return (
              <Card key={mark.id} className={`border-2 ${config.color} hover:shadow-lg transition-all`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-3 rounded-lg ${config.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{config.label}</h3>
                          {mark.severity !== 'normal' && (
                            <Badge className={
                              mark.severity === 'serious' 
                                ? 'bg-red-600' 
                                : 'bg-yellow-600'
                            }>
                              {mark.severity === 'serious' ? 'Vakava' : 'Varoitus'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                          {mark.studentName} ({mark.studentId})
                        </p>
                        <p className="text-sm text-gray-600">
                          {mark.subject} • {mark.timeSlot} • {mark.date}
                        </p>
                        {mark.notes && (
                          <p className="text-sm text-gray-700 mt-2 p-2 bg-white/50 rounded italic">
                            "{mark.notes}"
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Merkinnyt: {mark.teacherName}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(mark)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(mark.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
