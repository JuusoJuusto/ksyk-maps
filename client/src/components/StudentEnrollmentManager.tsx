import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Search, BookOpen, Users, Calendar } from 'lucide-react';
import EnhancedUserSelector from '@/components/EnhancedUserSelector';

export default function StudentEnrollmentManager() {
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ['wilma-students'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users?role=student');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch courses
  const { data: courses = [] } = useQuery({
    queryKey: ['wilma-courses'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/courses');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch enrollments for selected student
  const { data: enrollments = [] } = useQuery({
    queryKey: ['student-enrollments', selectedStudent],
    queryFn: async () => {
      if (!selectedStudent) return [];
      const response = await fetch(`/api/wilma/students/${selectedStudent}/enrollments`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedStudent
  });

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/wilma/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] });
      setSelectedCourse('');
      alert('✅ Opiskelija ilmoitettu kurssille!');
    },
    onError: (error: any) => {
      alert(`❌ ${error.message}`);
    }
  });

  // Unenroll mutation
  const unenrollMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const response = await fetch(`/api/wilma/enrollments/${enrollmentId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to remove enrollment');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] });
      alert('✅ Ilmoittautuminen poistettu!');
    }
  });

  const handleEnroll = () => {
    if (!selectedStudent || !selectedCourse) {
      alert('Valitse opiskelija ja kurssi');
      return;
    }

    const student = students.find((s: any) => s.id === selectedStudent);
    const course = courses.find((c: any) => c.id === selectedCourse);

    if (!student || !course) return;

    enrollMutation.mutate({
      studentId: selectedStudent,
      courseId: selectedCourse,
      studentName: `${student.firstName} ${student.lastName}`,
      courseName: course.name
    });
  };

  const selectedStudentData = students.find((s: any) => s.id === selectedStudent);
  const filteredCourses = courses.filter((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserPlus className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Kurssi-ilmoittautumiset</h2>
      </div>

      {/* Student Selector */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle>1. Valitse opiskelija</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <EnhancedUserSelector
            users={students}
            value={selectedStudent}
            onChange={setSelectedStudent}
            placeholder="Hae ja valitse opiskelija..."
            roleFilter="student"
          />
        </CardContent>
      </Card>

      {selectedStudent && (
        <>
          {/* Current Enrollments */}
          <Card className="border-2 border-green-200">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center justify-between">
                <span>Nykyiset kurssit</span>
                <Badge variant="outline">{enrollments.length} kurssia</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {enrollments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Ei ilmoittautumisia. Lisää kursseja alla.
                </p>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((enrollment: any) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between p-4 border-2 border-green-200 rounded-lg bg-green-50"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{enrollment.course?.name}</p>
                        <p className="text-sm text-gray-600">
                          {enrollment.course?.code} • {enrollment.course?.subject}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Opettaja: {enrollment.course?.teacherName}
                        </p>
                        {enrollment.course?.schedule && enrollment.course.schedule.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-600">
                              {enrollment.course.schedule.length} tuntia viikossa
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Haluatko varmasti poistaa ilmoittautumisen kurssille "${enrollment.course?.name}"?`)) {
                            unenrollMutation.mutate(enrollment.id);
                          }
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add New Enrollment */}
          <Card className="border-2 border-purple-200">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle>2. Lisää uusi kurssi</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Hae kursseja nimellä, koodilla tai aineella..."
                  className="pl-10"
                />
              </div>

              {filteredCourses.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {searchTerm ? 'Ei hakutuloksia' : 'Ei saatavilla olevia kursseja'}
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredCourses.map((course: any) => {
                    const isEnrolled = enrollments.some((e: any) => e.courseId === course.id);
                    
                    return (
                      <div
                        key={course.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedCourse === course.id
                            ? 'border-purple-500 bg-purple-50'
                            : isEnrolled
                            ? 'border-gray-300 bg-gray-100 opacity-50'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                        onClick={() => !isEnrolled && setSelectedCourse(course.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{course.name}</p>
                              {isEnrolled && (
                                <Badge className="bg-green-600">Ilmoittautunut</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {course.code} • {course.subject}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Opettaja: {course.teacherName}
                            </p>
                            {course.room && (
                              <p className="text-sm text-gray-600">
                                Luokka: {course.room}
                              </p>
                            )}
                            {course.schedule && course.schedule.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="text-xs text-gray-600">
                                  {course.schedule.length} tuntia viikossa
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button
                onClick={handleEnroll}
                disabled={!selectedCourse || enrollMutation.isPending}
                className="w-full"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {enrollMutation.isPending ? 'Ilmoitetaan...' : 'Ilmoita kurssille'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
