import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Calendar, Users, FileText, Clock, AlertCircle } from "lucide-react";

interface SubstituteAssignment {
  id: string;
  teacherName: string;
  teacherId: string;
  date: string;
  classes: string[];
  subjects: string[];
  notes?: string;
}

export default function SubstituteTeacherMode() {
  const [isSubstituting, setIsSubstituting] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  
  // Mock data - teachers who need substitutes
  const availableSubstitutions: SubstituteAssignment[] = [
    {
      id: '1',
      teacherName: 'Matti Virtanen',
      teacherId: 'teacher1',
      date: '2026-04-23',
      classes: ['7A', '8B', '9A'],
      subjects: ['Matematiikka'],
      notes: 'Sairasloma - jatkuu huomiseen'
    },
    {
      id: '2',
      teacherName: 'Anna Korhonen',
      teacherId: 'teacher2',
      date: '2026-04-23',
      classes: ['7B', '8A'],
      subjects: ['Äidinkieli'],
      notes: 'Koulutuspäivä'
    }
  ];

  // Today's schedule for substitute
  const todaySchedule = [
    { time: '08:00-09:30', class: '7A', subject: 'Matematiikka', room: 'A301', topic: 'Yhtälöt' },
    { time: '09:45-11:15', class: '8B', subject: 'Matematiikka', room: 'A301', topic: 'Geometria' },
    { time: '11:30-13:00', class: '9A', subject: 'Matematiikka', room: 'A301', topic: 'Funktiot' },
  ];

  const handleStartSubstituting = (assignment: SubstituteAssignment) => {
    setSelectedTeacher(assignment.teacherName);
    setIsSubstituting(true);
  };

  const handleStopSubstituting = () => {
    setIsSubstituting(false);
    setSelectedTeacher('');
  };

  if (isSubstituting) {
    return (
      <div className="space-y-6">
        {/* Active Substitution Banner */}
        <Card className="border-2 border-green-500 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-green-900">Sijaisuus aktiivinen</p>
                  <p className="text-sm text-green-700">Sijaistat: {selectedTeacher}</p>
                </div>
              </div>
              <Button onClick={handleStopSubstituting} variant="outline" className="border-green-600 text-green-600">
                Lopeta sijaisuus
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Tämän päivän tunnit
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {todaySchedule.map((lesson, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <Clock className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                          <p className="text-sm font-semibold text-gray-700">{lesson.time}</p>
                        </div>
                        <div className="h-12 w-px bg-gray-300"></div>
                        <div>
                          <p className="font-bold text-gray-900">{lesson.subject}</p>
                          <p className="text-sm text-gray-600">
                            Luokka {lesson.class} • {lesson.room}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Aihe: {lesson.topic}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <FileText className="w-4 h-4 mr-1" />
                          Tuntisuunnitelma
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <Users className="w-4 h-4 mr-1" />
                          Poissaolot
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Luokat tänään</p>
                  <p className="text-2xl font-bold text-blue-900">3</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Tuntisuunnitelmat</p>
                  <p className="text-2xl font-bold text-green-900">3</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Tunteja yhteensä</p>
                  <p className="text-2xl font-bold text-purple-900">4.5h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Important Notes */}
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="w-5 h-5" />
              Tärkeää huomioitavaa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-orange-900">
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                <span>Luokka 7A: Kaksi oppilasta erityisjärjestelyin (katso oppilaslista)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                <span>Luokka 8B: Koe ensi viikolla, jatka harjoittelua</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600">•</span>
                <span>Kaikki materiaalit löytyvät opettajan pöydältä huoneesta A301</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Sijaisuudet</h2>
        <p className="text-gray-600 mt-1">Valitse opettaja, jota sijaistat tänään</p>
      </div>

      {/* Available Substitutions */}
      <div className="space-y-4">
        {availableSubstitutions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Ei avoimia sijaisuuksia tänään</p>
            </CardContent>
          </Card>
        ) : (
          availableSubstitutions.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-lg transition-shadow border-2 border-gray-200 hover:border-blue-400">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCheck className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{assignment.teacherName}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(assignment.date).toLocaleDateString('fi-FI', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Luokat</p>
                        <div className="flex flex-wrap gap-1">
                          {assignment.classes.map((cls) => (
                            <Badge key={cls} variant="outline" className="bg-blue-50">
                              {cls}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Aineet</p>
                        <div className="flex flex-wrap gap-1">
                          {assignment.subjects.map((subject) => (
                            <Badge key={subject} variant="outline" className="bg-green-50">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {assignment.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <p className="text-sm text-yellow-900">
                          <AlertCircle className="w-4 h-4 inline mr-1" />
                          {assignment.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={() => handleStartSubstituting(assignment)}
                    className="ml-4 bg-blue-600 hover:bg-blue-700"
                  >
                    Aloita sijaisuus
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900">
            <strong>Huom!</strong> Kun aloitat sijaisuuden, näet opettajan tuntisuunnitelmat, 
            oppilaslistan ja muut tarvittavat materiaalit. Voit merkitä poissaolot ja antaa 
            palautetta tunnista.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
