import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Calendar, CheckCircle, Clock, AlertTriangle, Upload, Shield } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { analyzePlagiarism, getScoreColor, getScoreBgColor, getConfidenceColor } from "@/lib/plagiarismChecker";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded' | 'overdue'>('all');
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [plagiarismResultsOpen, setPlagiarismResultsOpen] = useState(false);
  const [plagiarismResults, setPlagiarismResults] = useState<any>(null);

  // Fetch homework from API
  const { data: homework = [], isLoading } = useQuery({
    queryKey: ['wilma-homework'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/wilma/homework');
        if (!response.ok) {
          // Return mock data if API fails
          return [
            { id: "1", title: "Matematiikan kotitehtävät s. 45-47", subject: "Matematiikka", description: "Ratkaise tehtävät 1-15", dueDate: "25.04.2026", status: "pending", teacher: "M. Virtanen", priority: "high" },
            { id: "2", title: "Englannin essee", subject: "Englanti", description: "Kirjoita 300 sanan essee aiheesta 'My Future'", dueDate: "28.04.2026", status: "pending", teacher: "A. Korhonen", priority: "medium" },
            { id: "3", title: "Fysiikan laboratorioraportti", subject: "Fysiikka", description: "Kirjoita raportti viime viikon kokeesta", dueDate: "23.04.2026", status: "overdue", teacher: "P. Nieminen", priority: "high" },
            { id: "4", title: "Historian tenttiin valmistautuminen", subject: "Historia", description: "Lue luvut 5-7 ja tee muistiinpanot", dueDate: "30.04.2026", status: "pending", teacher: "L. Mäkinen", priority: "medium" },
            { id: "5", title: "Kemian tehtävät", subject: "Kemia", description: "Tehtävät 20-25 työkirjasta", dueDate: "20.04.2026", status: "submitted", teacher: "S. Lahtinen", priority: "low" },
            { id: "6", title: "Ruotsin sanakoe", subject: "Ruotsi", description: "Opettele sanat kappaleesta 8", dueDate: "18.04.2026", status: "graded", grade: "9", teacher: "K. Andersson", priority: "low" },
          ];
        }
        return response.json();
      } catch (error) {
        // Return mock data on error
        return [
          { id: "1", title: "Matematiikan kotitehtävät s. 45-47", subject: "Matematiikka", description: "Ratkaise tehtävät 1-15", dueDate: "25.04.2026", status: "pending", teacher: "M. Virtanen", priority: "high" },
          { id: "2", title: "Englannin essee", subject: "Englanti", description: "Kirjoita 300 sanan essee aiheesta 'My Future'", dueDate: "28.04.2026", status: "pending", teacher: "A. Korhonen", priority: "medium" },
          { id: "3", title: "Fysiikan laboratorioraportti", subject: "Fysiikka", description: "Kirjoita raportti viime viikon kokeesta", dueDate: "23.04.2026", status: "overdue", teacher: "P. Nieminen", priority: "high" },
          { id: "4", title: "Historian tenttiin valmistautuminen", subject: "Historia", description: "Lue luvut 5-7 ja tee muistiinpanot", dueDate: "30.04.2026", status: "pending", teacher: "L. Mäkinen", priority: "medium" },
          { id: "5", title: "Kemian tehtävät", subject: "Kemia", description: "Tehtävät 20-25 työkirjasta", dueDate: "20.04.2026", status: "submitted", teacher: "S. Lahtinen", priority: "low" },
          { id: "6", title: "Ruotsin sanakoe", subject: "Ruotsi", description: "Opettele sanat kappaleesta 8", dueDate: "18.04.2026", status: "graded", grade: "9", teacher: "K. Andersson", priority: "low" },
        ];
      }
    },
    retry: false
  });

  // Submit homework mutation
  const submitHomework = useMutation({
    mutationFn: async ({ homeworkId, submission }: { homeworkId: string; submission: string }) => {
      const response = await fetch(`/api/wilma/homework/${homeworkId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission }),
      });
      if (!response.ok) throw new Error('Palautus epäonnistui');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wilma-homework'] });
      toast({
        title: "Palautettu!",
        description: "Tehtävä on palautettu onnistuneesti.",
      });
      setSubmitDialogOpen(false);
      setSubmissionText("");
      setSelectedHomework(null);
    },
    onError: () => {
      toast({
        title: "Virhe",
        description: "Tehtävän palautus epäonnistui. Yritä uudelleen.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedHomework || !submissionText.trim()) {
      toast({
        title: "Virhe",
        description: "Kirjoita vastaus ennen palautusta.",
        variant: "destructive",
      });
      return;
    }
    submitHomework.mutate({ homeworkId: selectedHomework.id, submission: submissionText });
  };

  const handleCheckPlagiarism = () => {
    if (!submissionText.trim()) {
      toast({
        title: "Virhe",
        description: "Kirjoita teksti ennen plagiointitarkistusta.",
        variant: "destructive",
      });
      return;
    }
    const results = analyzePlagiarism(submissionText);
    setPlagiarismResults(results);
    setPlagiarismResultsOpen(true);
  };

  const openSubmitDialog = (hw: Homework) => {
    setSelectedHomework(hw);
    setSubmitDialogOpen(true);
    setSubmissionText("");
  };

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
                        <Button 
                          size="sm" 
                          className="bg-[#003d82] hover:bg-[#002d5f]"
                          onClick={() => openSubmitDialog(hw)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
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

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Palauta tehtävä</DialogTitle>
            <DialogDescription>
              {selectedHomework?.title} - {selectedHomework?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Vastauksesi
              </label>
              <Textarea
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Kirjoita vastauksesi tähän..."
                className="min-h-[200px]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Merkkejä: {submissionText.length}
              </p>
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-blue-900">
                Voit tarkistaa tekstisi plagiointitarkistimella ennen palautusta
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCheckPlagiarism}
              disabled={!submissionText.trim()}
            >
              <Shield className="w-4 h-4 mr-2" />
              Tarkista plagiointi
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!submissionText.trim() || submitHomework.isPending}
              className="bg-[#003d82] hover:bg-[#002d5f]"
            >
              {submitHomework.isPending ? "Lähetetään..." : "Palauta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plagiarism Results Dialog */}
      <Dialog open={plagiarismResultsOpen} onOpenChange={setPlagiarismResultsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Plagiointitarkistuksen tulokset</DialogTitle>
            <DialogDescription>
              Analyysi perustuu tekstin rakenteeseen ja tyyliin
            </DialogDescription>
          </DialogHeader>
          {plagiarismResults && (
            <div className="space-y-4">
              {/* Score Display */}
              <div className="text-center p-6 bg-gray-50 rounded-lg">
                <div className={`text-6xl font-bold mb-2 ${getScoreColor(plagiarismResults.score)}`}>
                  {plagiarismResults.score}
                </div>
                <p className="text-sm text-gray-600">Pisteet (0-100)</p>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getScoreBgColor(plagiarismResults.score)}`}>
                  Luotettavuus: {plagiarismResults.confidence === 'high' ? 'Korkea' : plagiarismResults.confidence === 'medium' ? 'Keskitaso' : 'Matala'}
                </div>
              </div>

              {/* Flags */}
              {plagiarismResults.flags.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">Havaitut ongelmat:</h4>
                  <div className="space-y-2">
                    {plagiarismResults.flags.map((flag: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-yellow-900">{flag}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {plagiarismResults.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">Suositukset:</h4>
                  <div className="space-y-2">
                    {plagiarismResults.recommendations.map((rec: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-900">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600">
                  <strong>Huom:</strong> Tämä on automaattinen analyysi, joka perustuu tekstin rakenteeseen. 
                  Se ei korvaa opettajan arviointia. Käytä tuloksia ohjeena tekstisi parantamiseen.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPlagiarismResultsOpen(false)}>
              Sulje
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
