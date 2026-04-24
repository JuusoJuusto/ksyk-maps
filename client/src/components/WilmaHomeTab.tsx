import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { 
  Calendar, BookOpen, Mail, Clock, 
  Award, CheckCircle, 
  MessageSquare, FileText, BarChart3, Users, ExternalLink
} from "lucide-react";

interface WilmaHomeTabProps {
  userRole?: string;
  userRoles?: string[];
}

export default function WilmaHomeTab({ userRole, userRoles = [] }: WilmaHomeTabProps) {
  // Determine if user is admin/principal (no grades)
  const roles = userRoles.length > 0 ? userRoles : [userRole];
  const isAdmin = roles.some((r: string) => ['admin', 'principal', 'vice_principal'].includes(r));
  const isStudent = roles.includes('student');
  const isTeacher = roles.includes('teacher');

  // Fetch real data from API
  const { data: studentsData } = useQuery({
    queryKey: ['wilma-students-count'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users?role=student');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isAdmin || isTeacher
  });

  const { data: teachersData } = useQuery({
    queryKey: ['wilma-teachers-count'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users?role=teacher');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isAdmin
  });

  const { data: allUsersData } = useQuery({
    queryKey: ['wilma-all-users-count'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users');
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isAdmin
  });

  const studentsCount = studentsData?.length || 0;
  const teachersCount = teachersData?.length || 0;
  const totalUsersCount = allUsersData?.length || 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* School Website Link Banner */}
      <Card className="border-2 border-[#003d82] bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg text-[#003d82] mb-1">Kulosaaren yhteiskoulu</h3>
              <p className="text-sm text-gray-700">
                Vieraile koulumme verkkosivuilla saadaksesi lisätietoja tapahtumista ja uutisista
              </p>
            </div>
            <Button
              onClick={() => window.open('https://ksyk.fi', '_blank')}
              className="bg-[#003d82] hover:bg-[#0052a3] flex items-center gap-2 whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4" />
              ksyk.fi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-[#003d82] text-white border-0 rounded-lg shadow-md">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs md:text-sm">
                  {isAdmin ? 'Käyttäjiä' : 'Tänään'}
                </p>
                <p className="text-2xl md:text-3xl font-bold mt-1">
                  {isAdmin ? totalUsersCount : '5'}
                </p>
                <p className="text-white/80 text-xs md:text-sm mt-1">
                  {isAdmin ? 'Yhteensä' : 'Oppituntia'}
                </p>
              </div>
              {isAdmin ? (
                <Users className="w-8 h-8 md:w-12 md:h-12 text-white/60" />
              ) : (
                <Calendar className="w-8 h-8 md:w-12 md:h-12 text-white/60" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#7cb342] text-white border-0 rounded-lg shadow-md">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs md:text-sm">
                  {isAdmin ? 'Opiskelijat' : 'Läsnäolo'}
                </p>
                <p className="text-2xl md:text-3xl font-bold mt-1">
                  {isAdmin ? studentsCount : '95%'}
                </p>
                <p className="text-white/80 text-xs md:text-sm mt-1">
                  {isAdmin ? 'Aktiivisia' : 'Tällä viikolla'}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 md:w-12 md:h-12 text-white/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#dddddd] rounded-lg shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Viestit</p>
                <p className="text-2xl md:text-3xl font-bold mt-1 text-[#003d82]">
                  {isAdmin ? '12' : '3'}
                </p>
                <p className="text-gray-600 text-xs md:text-sm mt-1">
                  {isAdmin ? 'Uutta' : 'Lukematonta'}
                </p>
              </div>
              <Mail className="w-8 h-8 md:w-12 md:h-12 text-[#003d82]/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#dddddd] rounded-lg shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">
                  {isAdmin ? 'Opettajat' : isStudent ? 'Keskiarvo' : 'Kurssit'}
                </p>
                <p className="text-2xl md:text-3xl font-bold mt-1 text-[#003d82]">
                  {isAdmin ? teachersCount : isStudent ? '8.5' : '12'}
                </p>
                <p className="text-gray-600 text-xs md:text-sm mt-1">
                  {isAdmin ? 'Aktiivisia' : isStudent ? 'Tällä jaksolla' : 'Aktiivisia'}
                </p>
              </div>
              <Award className="w-8 h-8 md:w-12 md:h-12 text-[#003d82]/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Today's Schedule */}
          <Card className="border border-[#dddddd] rounded-lg shadow-sm">
            <CardHeader className="bg-white border-b border-[#dddddd] p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg text-gray-900">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-[#003d82]" />
                Tänään lukujärjestys
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6">
              <div className="space-y-2 md:space-y-3">
                {[
                  { time: '08:00 - 09:30', subject: 'Matematiikka', room: 'A201', teacher: 'M. Virtanen' },
                  { time: '09:45 - 11:15', subject: 'Englanti', room: 'B105', teacher: 'A. Korhonen' },
                  { time: '11:30 - 13:00', subject: 'Lounastauko', room: '-', teacher: '-' },
                  { time: '13:15 - 14:45', subject: 'Fysiikka', room: 'C301', teacher: 'P. Nieminen' },
                  { time: '15:00 - 16:30', subject: 'Historia', room: 'A105', teacher: 'L. Mäkinen' },
                ].map((lesson, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                      <div className="text-xs md:text-sm font-medium text-gray-600 w-20 md:w-32 flex-shrink-0">
                        <Clock className="w-3 h-3 md:w-4 md:h-4 inline mr-1" />
                        {lesson.time}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm md:text-base text-gray-900 truncate">{lesson.subject}</p>
                        <p className="text-xs md:text-sm text-gray-600 truncate">{lesson.room} • {lesson.teacher}</p>
                      </div>
                    </div>
                    {lesson.subject !== 'Lounastauko' && (
                      <Button size="sm" variant="outline" className="ml-2 flex-shrink-0 text-xs md:text-sm">Näytä</Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Grades - Only for Students */}
          {isStudent && (
            <Card className="border-2 border-green-200">
              <CardHeader className="bg-green-50 p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Award className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                  Viimeisimmät arvosanat
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                <div className="space-y-2 md:space-y-3">
                  {[
                    { subject: 'Matematiikka', grade: '9', date: '15.04.2026', type: 'Koe' },
                    { subject: 'Englanti', grade: '8', date: '14.04.2026', type: 'Essee' },
                    { subject: 'Fysiikka', grade: '10', date: '12.04.2026', type: 'Laboratoriotyö' },
                    { subject: 'Historia', grade: '7', date: '10.04.2026', type: 'Tentti' },
                  ].map((grade, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm md:text-base text-gray-900 truncate">{grade.subject}</p>
                        <p className="text-xs md:text-sm text-gray-600">{grade.type} • {grade.date}</p>
                      </div>
                      <div className="text-xl md:text-2xl font-bold text-green-600 ml-2">{grade.grade}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin/Teacher Overview */}
          {(isAdmin || isTeacher) && (
            <Card className="border-2 border-green-200">
              <CardHeader className="bg-green-50 p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                  {isAdmin ? 'Järjestelmän tilastot' : 'Omat kurssit'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-6">
                <div className="space-y-2 md:space-y-3">
                  {isAdmin ? (
                    <>
                      <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base text-gray-900">Opiskelijat</p>
                          <p className="text-xs md:text-sm text-gray-600">Aktiiviset käyttäjät</p>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-green-600 ml-2">{studentsCount}</div>
                      </div>
                      <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base text-gray-900">Opettajat</p>
                          <p className="text-xs md:text-sm text-gray-600">Henkilökunta</p>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-green-600 ml-2">{teachersCount}</div>
                      </div>
                      <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base text-gray-900">Käyttäjät</p>
                          <p className="text-xs md:text-sm text-gray-600">Yhteensä</p>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-green-600 ml-2">{totalUsersCount}</div>
                      </div>
                      <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base text-gray-900">Läsnäolo</p>
                          <p className="text-xs md:text-sm text-gray-600">Keskimääräinen</p>
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-green-600 ml-2">92%</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base text-gray-900">Matematiikka 1</p>
                          <p className="text-xs md:text-sm text-gray-600">45 opiskelijaa</p>
                        </div>
                        <Button size="sm" variant="outline">Näytä</Button>
                      </div>
                      <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base text-gray-900">Fysiikka 2</p>
                          <p className="text-xs md:text-sm text-gray-600">38 opiskelijaa</p>
                        </div>
                        <Button size="sm" variant="outline">Näytä</Button>
                      </div>
                      <div className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base text-gray-900">Kemia 1</p>
                          <p className="text-xs md:text-sm text-gray-600">32 opiskelijaa</p>
                        </div>
                        <Button size="sm" variant="outline">Näytä</Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4 md:space-y-6">
          {/* Quick Actions */}
          <Card className="border-2 border-purple-200">
            <CardHeader className="bg-purple-50 p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                Pika-toiminnot
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4">
              <div className="space-y-2">
                <Button className="w-full justify-start text-sm md:text-base" variant="outline" size="sm">
                  <Mail className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                  Viestit
                </Button>
                <Button className="w-full justify-start text-sm md:text-base" variant="outline" size="sm">
                  <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                  Lukujärjestys
                </Button>
                <Button className="w-full justify-start text-sm md:text-base" variant="outline" size="sm">
                  <BookOpen className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                  Kurssit
                </Button>
                {isStudent && (
                  <>
                    <Button className="w-full justify-start text-sm md:text-base" variant="outline" size="sm">
                      <Award className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                      Arvosanat
                    </Button>
                    <Button className="w-full justify-start text-sm md:text-base" variant="outline" size="sm">
                      <FileText className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                      Tuntimerkinnät
                    </Button>
                  </>
                )}
                {(isAdmin || isTeacher) && (
                  <>
                    <Button className="w-full justify-start text-sm md:text-base" variant="outline" size="sm">
                      <FileText className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                      Raportit
                    </Button>
                    <Button className="w-full justify-start text-sm md:text-base" variant="outline" size="sm">
                      <Award className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                      {isAdmin ? 'Hallinta' : 'Arviointi'}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className="border-2 border-orange-200">
            <CardHeader className="bg-orange-50 p-4 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                Ilmoitukset
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4">
              <div className="space-y-2 md:space-y-3">
                {[
                  { title: 'Koulun sulkeminen', date: '2 tuntia sitten', priority: 'high' },
                  { title: 'Vanhempainilta', date: '1 päivä sitten', priority: 'medium' },
                  { title: 'Urheilupäivä', date: '3 päivää sitten', priority: 'low' },
                ].map((announcement, idx) => (
                  <div key={idx} className="flex items-start gap-2 md:gap-3 p-2 md:p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-1.5 md:mt-2 flex-shrink-0 ${
                      announcement.priority === 'high' ? 'bg-red-500' :
                      announcement.priority === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs md:text-sm text-gray-900 truncate">{announcement.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{announcement.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Chart - Only for Students */}
          {isStudent && (
            <Card className="border-2 border-cyan-200">
              <CardHeader className="bg-cyan-50 p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-cyan-600" />
                  Suorituskyky
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4">
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <div className="flex justify-between text-xs md:text-sm mb-1">
                      <span>Läsnäolo</span>
                      <span className="font-semibold">95%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs md:text-sm mb-1">
                      <span>Tehtävät</span>
                      <span className="font-semibold">88%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '88%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs md:text-sm mb-1">
                      <span>Keskiarvo</span>
                      <span className="font-semibold">8.5/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '85%' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin/Teacher Stats */}
          {(isAdmin || isTeacher) && (
            <Card className="border-2 border-cyan-200">
              <CardHeader className="bg-cyan-50 p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-cyan-600" />
                  {isAdmin ? 'Järjestelmän tila' : 'Kurssien tilastot'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4">
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <div className="flex justify-between text-xs md:text-sm mb-1">
                      <span>{isAdmin ? 'Aktiiviset käyttäjät' : 'Opiskelijoiden läsnäolo'}</span>
                      <span className="font-semibold">{isAdmin ? `${totalUsersCount}/${totalUsersCount + 3}` : '92%'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: isAdmin ? `${(totalUsersCount / (totalUsersCount + 3)) * 100}%` : '92%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs md:text-sm mb-1">
                      <span>{isAdmin ? 'Järjestelmän käyttö' : 'Tehtävien palautus'}</span>
                      <span className="font-semibold">{isAdmin ? '85%' : '78%'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: isAdmin ? '85%' : '78%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs md:text-sm mb-1">
                      <span>{isAdmin ? 'Tyytyväisyys' : 'Keskiarvo'}</span>
                      <span className="font-semibold">{isAdmin ? '4.2/5' : '7.8/10'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: isAdmin ? '84%' : '78%' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
