import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Edit, Trash2, CheckCircle, Clock, User, Calendar, FileText, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Detention {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  reason: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: 'pending' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function DetentionManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role || '';
  
  const [showDialog, setShowDialog] = useState(false);
  const [editingDetention, setEditingDetention] = useState<Detention | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStudent, setFilterStudent] = useState<string>('');
  
  const [detentionForm, setDetentionForm] = useState({
    studentId: '',
    reason: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '15:00',
    endTime: '16:00',
    location: '',
    notes: '',
  });

  // Fetch detentions
  const { data: detentions = [], isLoading } = useQuery({
    queryKey: ['detentions', filterStatus, filterStudent],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterStudent) params.append('studentId', filterStudent);
      
      const response = await fetch(`/api/wilma/detentions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch detentions');
      return response.json();
    },
  });

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users?role=student');
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Fetch teachers
  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users?role=teacher');
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Create detention
  const createDetention = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/wilma/detentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          teacherId: user.id,
          teacherName: `${user.firstName} ${user.lastName}`,
          status: 'pending',
        }),
      });
      if (!response.ok) throw new Error('Failed to create detention');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detentions'] });
      toast({
        title: "✅ Jälki-istunto lisätty",
        description: "Jälki-istunto on lisätty onnistuneesti",
      });
      setShowDialog(false);
      resetForm();
    },
  });

  // Update detention
  const updateDetention = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/wilma/detentions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update detention');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detentions'] });
      toast({
        title: "✅ Päivitetty",
        description: "Jälki-istunto päivitetty",
      });
      setShowDialog(false);
      setEditingDetention(null);
    },
  });

  // Delete detention
  const deleteDetention = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/wilma/detentions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete detention');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detentions'] });
      toast({
        title: "🗑️ Poistettu",
        description: "Jälki-istunto poistettu",
      });
    },
  });

  const resetForm = () => {
    setDetentionForm({
      studentId: '',
      reason: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '15:00',
      endTime: '16:00',
      location: '',
      notes: '',
    });
    setEditingDetention(null);
  };

  const handleOpenDialog = (detention?: Detention) => {
    if (detention) {
      setEditingDetention(detention);
      setDetentionForm({
        studentId: detention.studentId,
        reason: detention.reason,
        date: detention.date,
        startTime: detention.startTime,
        endTime: detention.endTime,
        location: detention.location,
        notes: detention.notes || '',
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!detentionForm.studentId || !detentionForm.reason || !detentionForm.date) {
      toast({
        title: "❌ Virhe",
        description: "Täytä kaikki pakolliset kentät",
        variant: "destructive",
      });
      return;
    }

    const student = students.find((s: any) => s.id === detentionForm.studentId);
    const data = {
      ...detentionForm,
      studentName: student ? `${student.firstName} ${student.lastName}` : '',
    };

    if (editingDetention) {
      updateDetention.mutate({ id: editingDetention.id, data });
    } else {
      createDetention.mutate(data);
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    updateDetention.mutate({ id, data: { status } });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      'no-show': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    };
    
    const labels = {
      pending: 'Odottaa',
      completed: 'Suoritettu',
      cancelled: 'Peruttu',
      'no-show': 'Ei saapunut',
    };
    
    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const stats = {
    total: detentions.length,
    pending: detentions.filter((d: Detention) => d.status === 'pending').length,
    completed: detentions.filter((d: Detention) => d.status === 'completed').length,
    noShow: detentions.filter((d: Detention) => d.status === 'no-show').length,
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Jälki-istunnot
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Hallinnoi oppilaiden jälki-istuntoja
            </p>
          </div>
          {(userRole === 'admin' || userRole === 'teacher') && (
            <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Lisää jälki-istunto
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-gray-100 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Yhteensä</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.total}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-yellow-100 dark:border-yellow-900/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">Odottaa</p>
                <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300 mt-1">{stats.pending}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-green-100 dark:border-green-900/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">Suoritettu</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">{stats.completed}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-red-100 dark:border-red-900/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 dark:text-red-400">Ei saapunut</p>
                <p className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">{stats.noShow}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tila</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kaikki</SelectItem>
                <SelectItem value="pending">Odottaa</SelectItem>
                <SelectItem value="completed">Suoritettu</SelectItem>
                <SelectItem value="cancelled">Peruttu</SelectItem>
                <SelectItem value="no-show">Ei saapunut</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Oppilas</Label>
            <Select value={filterStudent} onValueChange={setFilterStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Kaikki oppilaat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Kaikki oppilaat</SelectItem>
                {students.map((student: any) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Detentions List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Ladataan jälki-istuntoja...</p>
          </div>
        ) : detentions.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">Ei jälki-istuntoja</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Lisää uusi jälki-istunto yllä olevasta napista
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Oppilas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Syy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Päivämäärä
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Aika
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Paikka
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Opettaja
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Tila
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Toiminnot
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {detentions.map((detention: Detention) => (
                  <tr key={detention.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {detention.studentName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                        {detention.reason}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {new Date(detention.date).toLocaleDateString('fi-FI')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {detention.startTime} - {detention.endTime}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {detention.location || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {detention.teacherName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(detention.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(userRole === 'admin' || userRole === 'teacher') && (
                          <>
                            {detention.status === 'pending' && (
                              <Select
                                value={detention.status}
                                onValueChange={(value) => handleStatusChange(detention.id, value)}
                              >
                                <SelectTrigger className="w-32 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Odottaa</SelectItem>
                                  <SelectItem value="completed">Suoritettu</SelectItem>
                                  <SelectItem value="no-show">Ei saapunut</SelectItem>
                                  <SelectItem value="cancelled">Peruttu</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDialog(detention)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm('Haluatko varmasti poistaa tämän jälki-istunnon?')) {
                                  deleteDetention.mutate(detention.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingDetention ? 'Muokkaa jälki-istuntoa' : 'Lisää jälki-istunto'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Oppilas *</Label>
              <Select
                value={detentionForm.studentId}
                onValueChange={(value) => setDetentionForm({ ...detentionForm, studentId: value })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Valitse oppilas" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student: any) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} - {student.class || 'Ei luokkaa'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Syy *</Label>
              <Textarea
                value={detentionForm.reason}
                onChange={(e) => setDetentionForm({ ...detentionForm, reason: e.target.value })}
                placeholder="Kerro miksi oppilas saa jälki-istunnon"
                className="mt-1.5"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Päivämäärä *</Label>
                <Input
                  type="date"
                  value={detentionForm.date}
                  onChange={(e) => setDetentionForm({ ...detentionForm, date: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Alkaa *</Label>
                <Input
                  type="time"
                  value={detentionForm.startTime}
                  onChange={(e) => setDetentionForm({ ...detentionForm, startTime: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Päättyy *</Label>
                <Input
                  type="time"
                  value={detentionForm.endTime}
                  onChange={(e) => setDetentionForm({ ...detentionForm, endTime: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Paikka</Label>
              <Input
                value={detentionForm.location}
                onChange={(e) => setDetentionForm({ ...detentionForm, location: e.target.value })}
                placeholder="esim. Luokka 101"
                className="mt-1.5"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lisätiedot</Label>
              <Textarea
                value={detentionForm.notes}
                onChange={(e) => setDetentionForm({ ...detentionForm, notes: e.target.value })}
                placeholder="Lisätietoja jälki-istunnosta"
                className="mt-1.5"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Peruuta
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              {editingDetention ? 'Tallenna muutokset' : 'Lisää jälki-istunto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
