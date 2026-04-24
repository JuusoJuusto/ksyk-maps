import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Search, Filter, Edit, Trash2, Eye, 
  CheckCircle, Clock, XCircle, Award, Calendar, User, Users
} from "lucide-react";

interface Homework {
  id: string;
  title: string;
  subject: string;
  teacher: string;
  class: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded' | 'late';
  submissions: number;
  totalStudents: number;
  grade?: string;
  description: string;
}

export default function AdminHomeworkManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'submitted' | 'graded' | 'late'>('all');
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [showGradeDialog, setShowGradeDialog] = useState(false);

  // Mock homework data
  const homeworkList: Homework[] = [
    {
      id: '1',
      title: 'Matematiikan kotitehtävät - Luku 5',
      subject: 'Matematiikka',
      teacher: 'Matti Virtanen',
      class: '9A',
      dueDate: '2026-04-25',
      status: 'submitted',
      submissions: 28,
      totalStudents: 30,
      description: 'Tee tehtävät 1-15 sivulta 87'
    },
    {
      id: '2',
      title: 'Englannin essee: My Summer Holiday',
      subject: 'Englanti',
      teacher: 'Anna Korhonen',
      class: '8B',
      dueDate: '2026-04-28',
      status: 'pending',
      submissions: 15,
      totalStudents: 25,
      description: 'Kirjoita 200-300 sanan essee kesälomastasi'
    },
    {
      id: '3',
      title: 'Fysiikan laboratoriotyö',
      subject: 'Fysiikka',
      teacher: 'Pekka Nieminen',
      class: '9B',
      dueDate: '2026-04-20',
      status: 'graded',
      submissions: 22,
      totalStudents: 22,
      grade: '8.5',
      description: 'Tee laboratoriotyö ja kirjoita raportti'
    },
    {
      id: '4',
      title: 'Historian tutkielma',
      subject: 'Historia',
      teacher: 'Laura Mäkinen',
      class: '9A',
      dueDate: '2026-04-22',
      status: 'late',
      submissions: 25,
      totalStudents: 30,
      description: 'Tutki toisen maailmansodan vaikutuksia Suomeen'
    },
    {
      id: '5',
      title: 'Kemian tehtävät',
      subject: 'Kemia',
      teacher: 'Kari Virtanen',
      class: '8A',
      dueDate: '2026-04-26',
      status: 'pending',
      submissions: 10,
      totalStudents: 28,
      description: 'Tee tehtävät 1-20 työkirjasta'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'submitted': return <CheckCircle className="w-4 h-4" />;
      case 'graded': return <Award className="w-4 h-4" />;
      case 'late': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'graded': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Odottaa';
      case 'submitted': return 'Palautettu';
      case 'graded': return 'Arvioitu';
      case 'late': return 'Myöhässä';
      default: return status;
    }
  };

  const filteredHomework = homeworkList.filter(hw => {
    const matchesSearch = hw.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hw.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hw.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hw.class.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || hw.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: homeworkList.length,
    pending: homeworkList.filter(hw => hw.status === 'pending').length,
    submitted: homeworkList.filter(hw => hw.status === 'submitted').length,
    graded: homeworkList.filter(hw => hw.status === 'graded').length,
    late: homeworkList.filter(hw => hw.status === 'late').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Tehtävien hallinta</h2>
        <p className="text-gray-600 mt-1">Hallitse, tarkastele ja arvioi kaikkien oppilaiden tehtäviä</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#003d82]" />
              <div>
                <p className="text-xs text-gray-600">Yhteensä</p>
                <p className="text-xl font-bold text-[#003d82]">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-xs text-gray-600">Odottaa</p>
                <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Palautettu</p>
                <p className="text-xl font-bold text-blue-600">{stats.submitted}</p>
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
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-xs text-gray-600">Myöhässä</p>
                <p className="text-xl font-bold text-red-600">{stats.late}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="border-[#dddddd]">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Hae tehtäviä (otsikko, aine, opettaja, luokka)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterStatus('all')}
                className={filterStatus === 'all' ? 'bg-[#003d82] text-white' : ''}
              >
                Kaikki
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterStatus('pending')}
                className={filterStatus === 'pending' ? 'bg-yellow-600 text-white' : ''}
              >
                Odottaa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterStatus('submitted')}
                className={filterStatus === 'submitted' ? 'bg-blue-600 text-white' : ''}
              >
                Palautettu
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterStatus('graded')}
                className={filterStatus === 'graded' ? 'bg-green-600 text-white' : ''}
              >
                Arvioitu
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterStatus('late')}
                className={filterStatus === 'late' ? 'bg-red-600 text-white' : ''}
              >
                Myöhässä
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Homework List */}
      <div className="space-y-3">
        {filteredHomework.length === 0 ? (
          <Card className="border-[#dddddd]">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Ei tehtäviä hakuehdoilla</p>
            </CardContent>
          </Card>
        ) : (
          filteredHomework.map((homework) => (
            <Card key={homework.id} className="border-[#dddddd] hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <FileText className="w-5 h-5 text-[#003d82] mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{homework.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {homework.subject}
                          </Badge>
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {homework.teacher}
                          </span>
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {homework.class}
                          </span>
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(homework.dueDate).toLocaleDateString('fi-FI')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{homework.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`${getStatusColor(homework.status)} flex items-center gap-1`}>
                      {getStatusIcon(homework.status)}
                      {getStatusText(homework.status)}
                    </Badge>
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">{homework.submissions}/{homework.totalStudents}</span> palautettu
                    </div>
                    {homework.grade && (
                      <div className="text-sm font-bold text-green-600">
                        Keskiarvo: {homework.grade}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Näytä
                      </Button>
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <Edit className="w-3 h-3" />
                        Muokkaa
                      </Button>
                      {homework.status === 'submitted' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Arvioi
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
