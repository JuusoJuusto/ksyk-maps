import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface Homework {
  id: string;
  title: string;
  subject: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  grade?: string;
  teacher: string;
  priority: 'low' | 'medium' | 'high';
}

export default function WilmaHomework() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded' | 'overdue'>('all');

  // Mock data
  const homework: Homework[] = [
    { id: "1", title: "Matematiikan kotitehtävät s. 45-47", subject: "Matematiikka", description: "Ratkaise tehtävät 1-15", dueDate: "25.04.2026", status: "pending", teacher: "M. Virtanen", priority: "high" },
    { id: "2", title: "Englannin essee", subject: "Englanti", description: "Kirjoita 300 sanan essee aiheesta 'My Future'", dueDate: "28.04.2026", status: "pending", teacher: "A. Korhonen", priority: "medium" },
    { id: "3", title: "Fysiikan laboratorioraportti", subject: "Fysiikka", description: "Kirjoita raportti viime viikon kokeesta", dueDate: "23.04.2026", status: "overdue", teacher: "P. Nieminen", priority: "high" },
    { id: "4", title: "Historian tenttiin valmistautuminen", subject: "Historia", description: "Lue luvut 5-7 ja tee muistiinpanot", dueDate: "30.04.2026", status: "pending", teacher: "L. Mäkinen", priority: "medium" },
    { id: "5", title: "Kemian tehtävät", subject: "Kemia", description: "Tehtävät 20-25 työkirjasta", dueDate: "20.04.2026", status: "submitted", teacher: "S. Lahtinen", priority: "low" },
    { id: "6", title: "Ruotsin sanakoe", subject: "Ruotsi", description: "Opettele sanat kappaleesta 8", dueDate: "18.04.2026", status: "graded", grade: "9", teacher: "K. Andersson", priority: "low" },
  ];

  const stats = {
    pending: homework.filter(h => h.status === 'pending').length,
    submitted: homework.filter(h => h.status === 'submitted').length,
    graded: homework.filter(h => h.status === 'graded').length,
    overdue: homework.filter(h => h.status === 'overdue').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'submitted': return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'graded': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'overdue': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Odottaa';
      case 'submitted': return 'Palautettu';
      case 'graded': return 'Arvioitu';
      case 'overdue': return 'Myöhässä';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'submitted': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'graded': return 'bg-green-50 text-green-700 border-green-200';
      case 'overdue': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredHomework = filter === 'all' 
    ? homework 
    : homework.filter(h => h.status === filter);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
              <CheckCircle className="w-5 h-5 text-green-600" />
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
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-xs text-gray-600">Myöhässä</p>
                <p className="text-xl font-bold text-red-600">{stats.overdue}</p>
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
              onClick={() => setFilter('pending')}
              className={filter === 'pending' ? 'bg-yellow-600 text-white' : ''}
            >
              Odottaa
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('submitted')}
              className={filter === 'submitted' ? 'bg-blue-600 text-white' : ''}
            >
              Palautettu
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('graded')}
              className={filter === 'graded' ? 'bg-green-600 text-white' : ''}
            >
              Arvioitu
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter('overdue')}
              className={filter === 'overdue' ? 'bg-red-600 text-white' : ''}
            >
              Myöhässä
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Homework List */}
      <div className="space-y-3">
        {filteredHomework.map((hw) => (
          <Card key={hw.id} className="border-[#dddddd] hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(hw.status)}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900">{hw.title}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-600">{hw.subject}</span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-600">{hw.teacher}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(hw.status)}`}>
                          {getStatusText(hw.status)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(hw.priority)}`}>
                          {hw.priority === 'high' ? 'Kiireellinen' : hw.priority === 'medium' ? 'Normaali' : 'Ei kiire'}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{hw.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-600">Palautus: {hw.dueDate}</span>
                      {hw.grade && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs font-semibold text-green-600">Arvosana: {hw.grade}</span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      {hw.status === 'pending' && (
                        <Button size="sm" className="bg-[#003d82] hover:bg-[#002d5f]">
                          Palauta tehtävä
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        Näytä tiedot
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
