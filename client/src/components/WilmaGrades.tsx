import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Grade {
  id: string;
  subject: string;
  grade: string;
  teacher: string;
  date: string;
  term: string;
  trend: 'up' | 'down' | 'stable';
  comments?: string;
}

export default function WilmaGrades() {
  // Mock data - replace with real API
  const grades: Grade[] = [
    { id: "1", subject: "Matematiikka", grade: "9", teacher: "M. Virtanen", date: "15.04.2026", term: "Kevät 2026", trend: "up", comments: "Erinomaista työskentelyä!" },
    { id: "2", subject: "Englanti", grade: "8", teacher: "A. Korhonen", date: "14.04.2026", term: "Kevät 2026", trend: "stable", comments: "Hyvä suullinen taito" },
    { id: "3", subject: "Fysiikka", grade: "10", teacher: "P. Nieminen", date: "12.04.2026", term: "Kevät 2026", trend: "up", comments: "Loistava laboratoriotyö!" },
    { id: "4", subject: "Historia", grade: "7", teacher: "L. Mäkinen", date: "10.04.2026", term: "Kevät 2026", trend: "down", comments: "Tarvitsee lisää opiskelua" },
    { id: "5", subject: "Kemia", grade: "9", teacher: "S. Lahtinen", date: "08.04.2026", term: "Kevät 2026", trend: "up" },
    { id: "6", subject: "Ruotsi", grade: "8", teacher: "K. Andersson", date: "05.04.2026", term: "Kevät 2026", trend: "stable" },
    { id: "7", subject: "Liikunta", grade: "10", teacher: "J. Koskinen", date: "03.04.2026", term: "Kevät 2026", trend: "stable" },
    { id: "8", subject: "Biologia", grade: "9", teacher: "T. Heikkinen", date: "01.04.2026", term: "Kevät 2026", trend: "up" },
  ];

  const average = (grades.reduce((sum, g) => sum + parseInt(g.grade), 0) / grades.length).toFixed(1);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getGradeColor = (grade: string) => {
    const num = parseInt(grade);
    if (num >= 9) return "text-green-600 bg-green-50";
    if (num >= 7) return "text-blue-600 bg-blue-50";
    if (num >= 5) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Keskiarvo</p>
                <p className="text-2xl font-bold text-[#003d82]">{average}</p>
              </div>
              <Award className="w-8 h-8 text-[#003d82]/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Arvosanoja</p>
                <p className="text-2xl font-bold text-[#003d82]">{grades.length}</p>
              </div>
              <Award className="w-8 h-8 text-[#003d82]/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Paras arvosana</p>
                <p className="text-2xl font-bold text-green-600">10</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Kehitys</p>
                <p className="text-2xl font-bold text-green-600">+0.5</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grades Table */}
      <Card className="border-[#dddddd]">
        <CardHeader className="p-4 bg-[#003d82] text-white">
          <CardTitle className="text-base">Arvosanat - Kevät 2026</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-[#dddddd]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Aine</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Arvosana</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600">Kehitys</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Opettaja</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Päivämäärä</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Kommentit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grades.map((grade) => (
                  <tr key={grade.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{grade.subject}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold ${getGradeColor(grade.grade)}`}>
                        {grade.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getTrendIcon(grade.trend)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{grade.teacher}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{grade.date}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{grade.comments || '-'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
