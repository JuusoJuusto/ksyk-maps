import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Plus, Edit, Trash2, Users, Calendar, Clock, MapPin, 
  GraduationCap, Save, X, UserPlus
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  code: string;
  subject: string;
  description: string;
  teacherId: string;
  teacherName: string;
  room: string;
  grade: string;
  maxStudents: number;
  schedule: Array<{
    day: string;
    startTime: string;
    endTime: string;
    room?: string;
  }>;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export default function CourseManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    subject: '',
    description: '',
    teacherId: '',
    teacherName: '',
    room: '',
    grade: '',
    maxStudents: 30,
    startDate: '',
    endDate: '',
    isActive: true
  });

  const [scheduleSlots, setScheduleSlots] = useState<Array<{
    day: string;
    startTime: string;
    endTime: string;
    room: string;
  }>>([]);

  // Fetch courses
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['wilma-courses'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/courses');
      if (!response.ok) throw new Error('Failed to fetch courses');
      return response.json();
    }
  });

  // Fetch teachers
  const { data: teachers = [] } = useQuery({
    queryKey: ['wilma-teachers'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users?role=teacher');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch students enrolled in selected course
  const { data: enrolledStudents = [] } = useQuery({
    queryKey: ['course-students', selectedCourse],
    queryFn: async () => {
      if (!selectedCourse) return [];
      const response = await fetch(`/api/wilma/courses/${selectedCourse}/students`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedCourse
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingCourse 
        ? `/api/wilma/courses/${editingCourse.id}`
        : '/api/wilma/courses';
      const method = editingCourse ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, schedule: scheduleSlots })
      });
      
      if (!response.ok) throw new Error('Failed to save course');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wilma-courses'] });
      resetForm();
      alert('✅ Kurssi tallennettu!');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/courses/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete course');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wilma-courses'] });
      alert('✅ Kurssi poistettu!');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      subject: '',
      description: '',
      teacherId: '',
      teacherName: '',
      room: '',
      grade: '',
      maxStudents: 30,
      startDate: '',
      endDate: '',
      isActive: true
    });
    setScheduleSlots([]);
    setEditingCourse(null);
    setShowForm(false);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name,
      code: course.code,
      subject: course.subject,
      description: course.description,
      teacherId: course.teacherId,
      teacherName: course.teacherName,
      room: course.room,
      grade: course.grade,
      maxStudents: course.maxStudents,
      startDate: course.startDate,
      endDate: course.endDate,
      isActive: course.isActive
    });
    setScheduleSlots(course.schedule || []);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const addScheduleSlot = () => {
    setScheduleSlots([...scheduleSlots, {
      day: 'monday',
      startTime: '08:00',
      endTime: '09:30',
      room: formData.room
    }]);
  };

  const removeScheduleSlot = (index: number) => {
    setScheduleSlots(scheduleSlots.filter((_, i) => i !== index));
  };

  const updateScheduleSlot = (index: number, field: string, value: string) => {
    const updated = [...scheduleSlots];
    updated[index] = { ...updated[index], [field]: value };
    setScheduleSlots(updated);
  };

  const dayNames = {
    monday: 'Maanantai',
    tuesday: 'Tiistai',
    wednesday: 'Keskiviikko',
    thursday: 'Torstai',
    friday: 'Perjantai'
  };

  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            {editingCourse ? 'Muokkaa kurssia' : 'Lisää uusi kurssi'}
          </h2>
          <Button variant="outline" onClick={resetForm}>
            <X className="w-4 h-4 mr-2" />
            Peruuta
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle>Perustiedot</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Kurssin nimi *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="esim. Matematiikka 1"
                    required
                  />
                </div>
                <div>
                  <Label>Kurssikoodi *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="esim. MAA1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Aine *</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="esim. Matematiikka"
                    required
                  />
                </div>
                <div>
                  <Label>Luokka-aste</Label>
                  <Input
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="esim. 7-9"
                  />
                </div>
              </div>

              <div>
                <Label>Kuvaus</Label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kurssin kuvaus..."
                  className="w-full border rounded-md px-3 py-2 min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Opettaja *</Label>
                  <select
                    value={formData.teacherId}
                    onChange={(e) => {
                      const teacher = teachers.find((t: any) => t.id === e.target.value);
                      setFormData({
                        ...formData,
                        teacherId: e.target.value,
                        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : ''
                      });
                    }}
                    className="w-full border rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Valitse opettaja</option>
                    {teachers.map((teacher: any) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.firstName} {teacher.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Luokkahuone</Label>
                  <Input
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder="esim. Luokka 301"
                  />
                </div>
                <div>
                  <Label>Max oppilasmäärä</Label>
                  <Input
                    type="number"
                    value={formData.maxStudents}
                    onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Alkamispäivä</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Päättymispäivä</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card className="border-2 border-green-200">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center justify-between">
                <span>Lukujärjestys</span>
                <Button type="button" onClick={addScheduleSlot} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Lisää tunti
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {scheduleSlots.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Ei tunteja. Lisää tunteja yllä olevalla painikkeella.</p>
              ) : (
                scheduleSlots.map((slot, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Päivä</Label>
                      <select
                        value={slot.day}
                        onChange={(e) => updateScheduleSlot(index, 'day', e.target.value)}
                        className="w-full border rounded-md px-3 py-2"
                      >
                        {Object.entries(dayNames).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Alkaa</Label>
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateScheduleSlot(index, 'startTime', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Päättyy</Label>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateScheduleSlot(index, 'endTime', e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Luokka</Label>
                      <Input
                        value={slot.room}
                        onChange={(e) => updateScheduleSlot(index, 'room', e.target.value)}
                        placeholder="Luokka"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeScheduleSlot(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={resetForm}>
              Peruuta
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Tallennetaan...' : 'Tallenna kurssi'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-600" />
          Kurssit / Ryhmät
        </h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Lisää kurssi
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ladataan kursseja...</p>
        </div>
      ) : courses.length === 0 ? (
        <Card className="border-2 border-gray-200">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">Ei kursseja. Lisää ensimmäinen kurssi!</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Lisää kurssi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course: Course) => (
            <Card key={course.id} className="border-2 border-blue-200 hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{course.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{course.code}</p>
                  </div>
                  <Badge className={course.isActive ? 'bg-green-600' : 'bg-gray-600'}>
                    {course.isActive ? 'Aktiivinen' : 'Ei aktiivinen'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">{course.subject}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{course.teacherName}</span>
                </div>
                {course.room && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{course.room}</span>
                  </div>
                )}
                {course.schedule && course.schedule.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{course.schedule.length} tuntia viikossa</span>
                  </div>
                )}
                
                <div className="flex gap-2 pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(course)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Muokkaa
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Haluatko varmasti poistaa kurssin "${course.name}"?`)) {
                        deleteMutation.mutate(course.id);
                      }
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
