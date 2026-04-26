import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, TrendingDown, Users, Award, UserCheck, 
  FileText, Calendar, BarChart3, PieChart, Activity,
  Download, RefreshCw, Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AnalyticsDashboard() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/analytics/summary?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const stats = {
    totalStudents: 450,
    totalTeachers: 35,
    averageAttendance: 94.5,
    averageGrade: 8.2,
    homeworkCompletion: 87.3,
    activeClasses: 18,
  };

  const trends = {
    students: +2.5,
    attendance: -1.2,
    grades: +0.3,
    homework: +5.1,
  };

  const attendanceData = [
    { day: 'Ma', rate: 95 },
    { day: 'Ti', rate: 94 },
    { day: 'Ke', rate: 93 },
    { day: 'To', rate: 96 },
    { day: 'Pe', rate: 92 },
  ];

  const gradeDistribution = [
    { grade: '10', count: 45, percentage: 10 },
    { grade: '9', count: 98, percentage: 22 },
    { grade: '8', count: 156, percentage: 35 },
    { grade: '7', count: 112, percentage: 25 },
    { grade: '6', count: 34, percentage: 8 },
  ];

  const topPerformers = [
    { name: 'Matti Virtanen', class: '9A', average: 9.8 },
    { name: 'Liisa Korhonen', class: '9B', average: 9.7 },
    { name: 'Jukka Nieminen', class: '8A', average: 9.6 },
  ];

  const lowPerformers = [
    { name: 'Pekka Lahtinen', class: '7B', average: 6.2 },
    { name: 'Anna Mäkinen', class: '8C', average: 6.5 },
    { name: 'Ville Saarinen', class: '9A', average: 6.7 },
  ];

  const handleRefresh = async () => {
    await fetchAnalytics();
    toast({
      title: "Päivitetty",
      description: "Analytiikkatiedot on päivitetty",
    });
  };

  const handleExport = () => {
    // TODO: Export data as CSV/PDF
    alert('Vienti tulossa pian!');
  };

  const StatCard = ({ title, value, icon: Icon, trend, suffix = '' }: any) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {value}{suffix}
            </p>
            {trend !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                trend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            trend >= 0 ? 'bg-green-100' : trend < 0 ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            <Icon className={`w-6 h-6 ${
              trend >= 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-blue-600'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytiikka</h1>
          <p className="text-sm text-gray-600 mt-1">Koulun suorituskyvyn seuranta</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Päivitä
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Vie
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {['week', 'month', 'year'].map((range) => (
          <Button
            key={range}
            onClick={() => setTimeRange(range as any)}
            variant={timeRange === range ? 'default' : 'outline'}
            size="sm"
            className={timeRange === range ? 'bg-[#003d82]' : ''}
          >
            {range === 'week' ? 'Viikko' : range === 'month' ? 'Kuukausi' : 'Vuosi'}
          </Button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Oppilaita yhteensä"
          value={stats.totalStudents}
          icon={Users}
          trend={trends.students}
        />
        <StatCard
          title="Keskimääräinen läsnäolo"
          value={stats.averageAttendance}
          icon={UserCheck}
          trend={trends.attendance}
          suffix="%"
        />
        <StatCard
          title="Keskiarvo"
          value={stats.averageGrade}
          icon={Award}
          trend={trends.grades}
        />
        <StatCard
          title="Tehtävien suoritusaste"
          value={stats.homeworkCompletion}
          icon={FileText}
          trend={trends.homework}
          suffix="%"
        />
        <StatCard
          title="Opettajia"
          value={stats.totalTeachers}
          icon={Users}
        />
        <StatCard
          title="Aktiivisia luokkia"
          value={stats.activeClasses}
          icon={Calendar}
        />
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="attendance">Läsnäolo</TabsTrigger>
          <TabsTrigger value="grades">Arvosanat</TabsTrigger>
          <TabsTrigger value="performance">Suorituskyky</TabsTrigger>
          <TabsTrigger value="trends">Trendit</TabsTrigger>
        </TabsList>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Läsnäolo viikolla
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attendanceData.map((day) => (
                  <div key={day.day} className="flex items-center gap-4">
                    <span className="w-8 text-sm font-medium text-gray-600">{day.day}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                        style={{ width: `${day.rate}%` }}
                      >
                        <span className="text-white text-sm font-semibold">{day.rate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grades Tab */}
        <TabsContent value="grades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Arvosanajakauma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gradeDistribution.map((item) => (
                  <div key={item.grade} className="flex items-center gap-4">
                    <span className="w-12 text-sm font-bold text-gray-900">
                      Arvosana {item.grade}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full flex items-center justify-between px-3 transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      >
                        <span className="text-white text-sm font-semibold">{item.count} oppilasta</span>
                        <span className="text-white text-sm font-semibold">{item.percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Performers */}
            <Card>
              <CardHeader className="bg-green-50">
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <TrendingUp className="w-5 h-5" />
                  Parhaat suorittajat
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {topPerformers.map((student, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                      <div>
                        <p className="font-semibold text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.class}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{student.average}</p>
                        <p className="text-xs text-gray-500">Keskiarvo</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Low Performers */}
            <Card>
              <CardHeader className="bg-yellow-50">
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <TrendingDown className="w-5 h-5" />
                  Tukea tarvitsevat
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {lowPerformers.map((student, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200">
                      <div>
                        <p className="font-semibold text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.class}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-yellow-600">{student.average}</p>
                        <p className="text-xs text-gray-500">Keskiarvo</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Trendianalyysi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Trendikaaviot tulossa pian</p>
                <p className="text-sm text-gray-400 mt-2">
                  Tämä ominaisuus vaatii lisää dataa ja visualisointikirjastoja
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
