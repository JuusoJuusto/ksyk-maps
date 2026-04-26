import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, BookOpen, Award, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Exam {
  id: string;
  subject: string;
  course: string;
  date: string;
  time: string;
  duration: number;
  room: string;
  teacher: string;
  topics: string[];
  status: 'upcoming' | 'completed' | 'graded';
  result?: {
    score: number;
    maxScore: number;
    grade: string;
    feedback: string;
  };
  materials: string[];
  instructions: string;
}

export default function WilmaExams() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'graded'>('all');

  // Fetch exams from API
  const { data: exams = [], isLoading } = useQuery<Exam[]>({
    queryKey: ['/api/wilma/exams'],
    queryFn: async () => {
      // Mock data for now - replace with real API call
      return [
        {
          id: "1",
          subject: "Matematiikka",
          course: "MAA7 - Derivaatta",
          date: "2026-05-05",
          time: "10:00",
          duration: 90,
          room: "Luokka 301",
          teacher: "M. Virtanen",
          topics: ["Derivaatan määritelmä", "Derivoimissäännöt", "Sovellukset"],
          status: "upcoming",
          materials: ["Laskin", "Kaavakokoelma"],
          instructions: "Tuo mukanasi laskin ja kaavakokoelma. Älä unohda henkilöllisyystodistusta."
        },
        {
          id: "2",
          subject: "Englanti",
          course: "ENA5 - Kielioppi ja kirjoittaminen",
          date: "2026-05-08",
          time: "12:00",
          duration: 120,
          room: "Luokka 205",
          teacher: "A. Korhonen",
          topics: ["Conditional sentences", "Passive voice", "Essay writing"],
          status: "upcoming",
          materials: ["Sanakirja"],
          instructions: "Voit käyttää englanti-suomi sanakirjaa. Kirjoita selkeästi."
        },
        {
          id: "3",
          subject: "Fysiikka",
          course: "FY2 - Lämpö",
          date: "2026-04-20",
          time: "09:00",
          duration: 75,
          room: "Luokka 402",
          teacher: "P. Nieminen",
          topics: ["Lämpötila ja lämpöenergia", "Olomuodon muutokset", "Lämpölaajeneminen"],
          status: "graded",
          materials: ["Laskin", "Kaavakokoelma"],
          instructions: "Muista laskimen paristot!",
          result: {
            score: 42,
            maxScore: 50,
            grade: "9",
            feedback: "Erinomainen suoritus! Erityisesti teoreettinen osaaminen oli vahvaa. Laske-tehtävissä pieni huolimattomuusvirhe."
          }
        },
        {
          id: "4",
          subject: "Historia",
          course: "HI3 - Kylmä sota",
          date: "2026-04-18",
          time: "13:00",
          duration: 90,
          room: "Luokka 103",
          teacher: "L. Mäkinen",
          topics: ["Kylmän sodan alkaminen", "Kuuba-kriisi", "Berliinin muuri"],
          status: "graded",
          materials: [],
          instructions: "Essee-tyyppinen koe. Vastaa kolmeen kysymykseen viidestä.",
          result: {
            score: 32,
            maxScore: 40,
            grade: "8",
            feedback: "Hyvä kokonaisuus. Esseet olivat hyvin jäsenneltyjä ja sisälsivät relevanttia tietoa. Lisää lähteiden käyttöä."
          }
        },
        {
          id: "5",
          subject: "Kemia",
          course: "KE2 - Reaktiot",
          date: "2026-04-15",
          time: "10:00",
          duration: 60,
          room: "Luokka 304",
          teacher: "S. Lahtinen",
          topics: ["Hapettuminen ja pelkistyminen", "Reaktioyhtälöt", "Stoikiometria"],
          status: "completed",
          materials: ["Laskin", "Jaksollinen järjestelmä"],
          instructions: "Koe sisältää sekä teoriaa että laskutehtäviä."
        }
      ];
    }
  });

  const stats = {
    upcoming: exams.filter(e => e.status === 'upcoming').length,
    completed: exams.filter(e => e.status === 'completed').length,
    graded: exams.filter(e => e.status === 'graded').length,
    avgGrade: exams.filter(e => e.result).length > 0
      ? (exams.filter(e => e.result).reduce((sum, e) => sum + parseInt(e.result!.grade), 0) / exams.filter(e => e.result).length).toFixed(1)
      : 'N/A'
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-yellow-600" />;
      case 'graded': return <Award className="w-5 h-5 text-green-600" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return 'Tulossa';
      case 'completed': return 'Suoritettu';
      case 'graded': return 'Arvioitu';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'graded': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getDaysUntil = (dateStr: string) => {
    const today = new Date();
    const examDate = new Date(dateStr);
    const diffTime = examDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredExams = filter === 'all' 
    ? exams 
    : exams.filter(e => e.status === filter);

  if (isLoading) {
    return <div className="text-center py-8">Ladataan kokeita...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Tulossa</p>
                <p className="text-xl font-bold text-blue-600">{stats.upcoming}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-xs text-gray-600">Suoritettu</p>
                <p className="text-xl font-bold text-yellow-600">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Arvioitu</p>
                <p className="text-xl font-bold text-green-600">{stats.graded}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#003d82]" />
              <div>
                <p className="text-xs text-gray-600">Keskiarvo</p>
                <p className="text-xl font-bold text-[#003d82]">{stats.avgGrade}</p>
              </div>
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
              onClick={() => setFilter('upcoming')}
              className={filter === 'upcoming' ? 'bg-blue-600 text-white' : ''}
            >
              Tulossa
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('completed')}
              className={filter === 'completed' ? 'bg-yellow-600 text-white' : ''}
            >
              Suoritettu
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('graded')}
              className={filter === 'graded' ? 'bg-green-600 text-white' : ''}
            >
              Arvioitu
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Exams List */}
      <div className="space-y-3">
        {filteredExams.map((exam) => {
          const daysUntil = getDaysUntil(exam.date);
          const isUrgent = exam.status === 'upcoming' && daysUntil <= 3;

          return (
            <Card key={exam.id} className={`border-[#dddddd] hover:shadow-md transition-shadow ${isUrgent ? 'border-l-4 border-l-red-500' : ''}`}>
              <CardHeader className="p-4 bg-gray-50 border-b border-[#dddddd]">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(exam.status)}
                    <div>
                      <CardTitle className="text-base font-semibold text-gray-900">
                        {exam.subject} - {exam.course}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(exam.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{exam.time} ({exam.duration} min)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{exam.room}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(exam.status)}`}>
                      {getStatusText(exam.status)}
                    </span>
                    {isUrgent && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {daysUntil} päivää
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    Aiheet:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {exam.topics.map((topic, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {exam.materials.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Sallitut materiaalit:</h4>
                    <p className="text-sm text-gray-600">{exam.materials.join(', ')}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Ohjeet:</h4>
                  <p className="text-sm text-gray-600">{exam.instructions}</p>
                </div>

                {exam.result && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-green-900">Tulos</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-2xl font-bold text-green-700">{exam.result.grade}</span>
                          <span className="text-sm text-gray-600">
                            {exam.result.score}/{exam.result.maxScore} pistettä ({Math.round((exam.result.score / exam.result.maxScore) * 100)}%)
                          </span>
                        </div>
                      </div>
                      <Award className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="mt-2">
                      <h5 className="text-xs font-semibold text-gray-700 mb-1">Palaute:</h5>
                      <p className="text-sm text-gray-600">{exam.result.feedback}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Opettaja: {exam.teacher}</span>
                  {exam.status === 'upcoming' && (
                    <Button size="sm" variant="outline">
                      Lisää kalenteriin
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredExams.length === 0 && (
        <Card className="border-[#dddddd]">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Ei kokeita näytettäväksi</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
