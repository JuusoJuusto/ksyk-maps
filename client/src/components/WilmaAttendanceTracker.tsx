import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertCircle, Calendar, TrendingUp, Download, Filter, Search, Sparkles, Users, BarChart } from "lucide-react";
import { generateStructuredOutput } from "@/lib/geminiAI";
import { useToast } from "@/hooks/use-toast";

interface AttendanceRecord {
  id: string;
  studentName: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  hours: number;
  reason?: string;
  subject?: string;
  class?: string;
}

export default function WilmaAttendanceTracker() {
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'late' | 'excused'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const { toast } = useToast();

  // Mock data with more realistic entries
  const attendance: AttendanceRecord[] = [
    { id: "1", studentName: "Matti Virtanen", studentId: "S001", date: "2026-04-28", status: "present", hours: 0, subject: "Kaikki tunnit", class: "9A" },
    { id: "2", studentName: "Emma Korhonen", studentId: "S002", date: "2026-04-28", status: "present", hours: 0, subject: "Kaikki tunnit", class: "9A" },
    { id: "3", studentName: "Ville Mäkinen", studentId: "S003", date: "2026-04-28", status: "late", hours: 1, reason: "Myöhästyi bussista", subject: "Matematiikka", class: "9A" },
    { id: "4", studentName: "Sofia Nieminen", studentId: "S004", date: "2026-04-28", status: "absent", hours: 6, reason: "Sairaana", subject: "Kaikki tunnit", class: "9B" },
    { id: "5", studentName: "Eetu Lahtinen", studentId: "S005", date: "2026-04-28", status: "excused", hours: 3, reason: "Lääkärikäynti", subject: "Iltapäivän tunnit", class: "9B" },
    { id: "6", studentName: "Aino Salminen", studentId: "S006", date: "2026-04-28", status: "present", hours: 0, subject: "Kaikki tunnit", class: "9A" },
    { id: "7", studentName: "Oskari Heikkinen", studentId: "S007", date: "2026-04-27", status: "late", hours: 1, reason: "Unohti herätyskellon", subject: "Englanti", class: "9A" },
    { id: "8", studentName: "Liisa Koskinen", studentId: "S008", date: "2026-04-27", status: "present", hours: 0, subject: "Kaikki tunnit", class: "9B" },
    { id: "9", studentName: "Mikko Järvinen", studentId: "S009", date: "2026-04-27", status: "absent", hours: 6, reason: "Flunssa", subject: "Kaikki tunnit", class: "9A" },
    { id: "10", studentName: "Ella Rantanen", studentId: "S010", date: "2026-04-26", status: "present", hours: 0, subject: "Kaikki tunnit", class: "9B" },
  ];

  const classes = ["all", "9A", "9B", "9C"];

  const stats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
    excused: attendance.filter(a => a.status === 'excused').length,
    totalHours: attendance.reduce((sum, a) => sum + a.hours, 0),
    percentage: ((attendance.filter(a => a.status === 'present').length / attendance.length) * 100).toFixed(1),
    totalStudents: new Set(attendance.map(a => a.studentId)).size,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'absent': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'late': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'excused': return <AlertCircle className="w-5 h-5 text-blue-600" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Läsnä';
      case 'absent': return 'Poissa';
      case 'late': return 'Myöhässä';
      case 'excused': return 'Hyväksytty poissaolo';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-50 text-green-700 border-green-200';
      case 'absent': return 'bg-red-50 text-red-700 border-red-200';
      case 'late': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'excused': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const filteredAttendance = attendance
    .filter(a => filter === 'all' || a.status === filter)
    .filter(a => selectedClass === 'all' || a.class === selectedClass)
    .filter(a => 
      searchQuery === '' || 
      a.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.studentId.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const analyzeWithAI = async () => {
    setAiAnalyzing(true);
    try {
      const prompt = `Analyze this school attendance data and provide insights:

Total Students: ${stats.totalStudents}
Present: ${stats.present}
Absent: ${stats.absent}
Late: ${stats.late}
Excused: ${stats.excused}
Attendance Rate: ${stats.percentage}%

Recent patterns:
${attendance.slice(0, 10).map(a => `${a.studentName} (${a.class}): ${a.status} on ${a.date}${a.reason ? ` - ${a.reason}` : ''}`).join('\n')}

Provide:
1. Overall attendance health assessment
2. Patterns or concerns
3. Recommendations for improvement
4. Students who may need attention
5. Positive observations

Return as JSON.`;

      const schema = {
        type: "object",
        properties: {
          healthScore: { type: "number" },
          healthStatus: { type: "string" },
          patterns: {
            type: "array",
            items: { type: "string" }
          },
          concerns: {
            type: "array",
            items: { type: "string" }
          },
          recommendations: {
            type: "array",
            items: { type: "string" }
          },
          studentsNeedingAttention: {
            type: "array",
            items: { type: "string" }
          },
          positives: {
            type: "array",
            items: { type: "string" }
          }
        }
      };

      const insights = await generateStructuredOutput(prompt, schema);
      setAiInsights(insights);
      toast({
        title: "AI-analyysi valmis!",
        description: "Tuntimerkintöjen analyysi on valmis.",
      });
    } catch (error) {
      console.error("AI analysis error:", error);
      toast({
        title: "Virhe",
        description: "AI-analyysi epäonnistui. Yritä uudelleen.",
        variant: "destructive",
      });
    } finally {
      setAiAnalyzing(false);
    }
  };

  const exportData = () => {
    const csv = [
      ['Päivämäärä', 'Oppilas', 'Oppilastunnus', 'Luokka', 'Tila', 'Tunnit', 'Syy', 'Aine'].join(','),
      ...filteredAttendance.map(a => 
        [a.date, a.studentName, a.studentId, a.class, getStatusText(a.status), a.hours, a.reason || '', a.subject].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tuntimerkinnät_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast({
      title: "Vienti onnistui!",
      description: "Tuntimerkinnät viety CSV-tiedostoon.",
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with AI Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-[#003d82]" />
            Tuntimerkinnät
          </h1>
          <p className="text-sm text-gray-600 mt-1">Seuraa ja hallinnoi oppilaiden läsnäoloa</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={analyzeWithAI}
            disabled={aiAnalyzing}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          >
            {aiAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Analysoidaan...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI-analyysi
              </>
            )}
          </Button>
          <Button onClick={exportData} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Vie CSV
          </Button>
        </div>
      </div>

      {/* AI Insights */}
      {aiInsights && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI-analyysin tulokset
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Health Score */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
                  {aiInsights.healthScore}
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{aiInsights.healthStatus}</p>
                <p className="text-sm text-gray-600">Läsnäolon terveysarvio</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Patterns */}
              {aiInsights.patterns && aiInsights.patterns.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Havaitut trendit
                  </h4>
                  <ul className="space-y-1">
                    {aiInsights.patterns.map((pattern: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{pattern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concerns */}
              {aiInsights.concerns && aiInsights.concerns.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Huomioitavaa
                  </h4>
                  <ul className="space-y-1">
                    {aiInsights.concerns.map((concern: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-red-600 mt-1">•</span>
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Suositukset
                  </h4>
                  <ul className="space-y-1">
                    {aiInsights.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-green-600 mt-1">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Positives */}
              {aiInsights.positives && aiInsights.positives.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-600" />
                    Positiiviset havainnot
                  </h4>
                  <ul className="space-y-1">
                    {aiInsights.positives.map((pos: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-yellow-600 mt-1">•</span>
                        <span>{pos}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Students Needing Attention */}
            {aiInsights.studentsNeedingAttention && aiInsights.studentsNeedingAttention.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-600" />
                  Oppilaat, jotka tarvitsevat huomiota
                </h4>
                <div className="flex flex-wrap gap-2">
                  {aiInsights.studentsNeedingAttention.map((student: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {student}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-[#dddddd] hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#003d82]" />
              <div>
                <p className="text-xs text-gray-600">Oppilaita</p>
                <p className="text-2xl font-bold text-[#003d82]">{stats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd] hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Läsnä</p>
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd] hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-xs text-gray-600">Poissa</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd] hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-xs text-gray-600">Myöhässä</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd] hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Hyväksytty</p>
                <p className="text-2xl font-bold text-blue-600">{stats.excused}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#dddddd] hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div>
              <p className="text-xs text-gray-600">Läsnäolo-%</p>
              <p className="text-2xl font-bold text-[#003d82]">{stats.percentage}%</p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalHours}h poissa</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-[#dddddd]">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Hae oppilaan nimellä tai tunnuksella..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Tila</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilter('all')}
                    className={filter === 'all' ? 'bg-[#003d82] text-white hover:bg-[#002d5f]' : ''}
                  >
                    Kaikki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilter('present')}
                    className={filter === 'present' ? 'bg-green-600 text-white hover:bg-green-700' : ''}
                  >
                    Läsnä
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilter('absent')}
                    className={filter === 'absent' ? 'bg-red-600 text-white hover:bg-red-700' : ''}
                  >
                    Poissa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilter('late')}
                    className={filter === 'late' ? 'bg-yellow-600 text-white hover:bg-yellow-700' : ''}
                  >
                    Myöhässä
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilter('excused')}
                    className={filter === 'excused' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                  >
                    Hyväksytty
                  </Button>
                </div>
              </div>

              <div className="w-full md:w-48">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Luokka</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#003d82]"
                >
                  {classes.map(cls => (
                    <option key={cls} value={cls}>
                      {cls === 'all' ? 'Kaikki luokat' : cls}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance List */}
      <Card className="border-[#dddddd]">
        <CardHeader className="p-4 bg-gradient-to-r from-[#003d82] to-[#0052a3] text-white">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Tuntimerkinnät ({filteredAttendance.length})</span>
            <Badge variant="secondary" className="bg-white/20 text-white">
              {new Date().toLocaleDateString('fi-FI')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAttendance.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <BarChart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Ei tuntimerkintöjä valituilla suodattimilla</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAttendance.map((record) => (
                <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getStatusIcon(record.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-bold text-gray-900">{record.studentName}</span>
                          <Badge variant="outline" className="text-xs">
                            {record.studentId}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {record.class}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm text-gray-600">{record.date}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                            {getStatusText(record.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{record.subject}</p>
                        {record.reason && (
                          <p className="text-sm text-gray-500 mt-1 italic">💬 {record.reason}</p>
                        )}
                        {record.hours > 0 && (
                          <p className="text-xs text-gray-500 mt-1 font-medium">⏱️ {record.hours} tuntia</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
