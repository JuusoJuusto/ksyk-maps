import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, Settings, Plus, Edit, Trash2, Check, X, 
  Clock, Calendar, MapPin, User, FileText, Send, Bell
} from "lucide-react";

/**
 * Wilma Detention Manager
 * 
 * Features:
 * - View all detentions
 * - Create manual detentions
 * - Configure automatic detention rules
 * - Customize message templates
 * - Track detention status
 * - Notify students and parents
 */
export default function WilmaDetentionManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [editingDetention, setEditingDetention] = useState<any>(null);
  
  // Fetch detention settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['detention-settings'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/detention/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return await response.json();
    },
  });

  // Fetch all detentions
  const { data: detentions = [], isLoading: detentionsLoading } = useQuery({
    queryKey: ['detentions'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/detentions');
      if (!response.ok) throw new Error('Failed to fetch detentions');
      return await response.json();
    },
  });

  // Fetch students for dropdown
  const { data: students = [] } = useQuery({
    queryKey: ['wilma-students'],
    queryFn: async () => {
      const response = await fetch('/api/wilma/users?role=student');
      if (!response.ok) return [];
      return await response.json();
    },
  });

  // Create detention mutation
  const createDetention = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/wilma/detentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create detention');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detentions'] });
      setShowCreateDialog(false);
      toast({
        title: "✅ Jälki-istunto luotu",
        description: "Jälki-istunto on lisätty ja ilmoitus lähetetty",
      });
    },
  });

  // Update detention mutation
  const updateDetention = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/wilma/detentions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update detention');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detentions'] });
      toast({
        title: "✅ Päivitetty",
        description: "Jälki-istunto päivitetty",
      });
    },
  });

  // Delete detention mutation
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

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/wilma/detention/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detention-settings'] });
      setShowSettingsDialog(false);
      toast({
        title: "✅ Asetukset tallennettu",
        description: "Jälki-istunto-asetukset päivitetty",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Odottaa</Badge>,
      confirmed: <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Vahvistettu</Badge>,
      completed: <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Suoritettu</Badge>,
      cancelled: <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Peruttu</Badge>,
      no_show: <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Ei saapunut</Badge>,
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  const getReasonTypeBadge = (type: string) => {
    const badges = {
      late: <Badge className="bg-orange-100 text-orange-700">Myöhästyminen</Badge>,
      absent: <Badge className="bg-red-100 text-red-700">Poissaolo</Badge>,
      behavior: <Badge className="bg-purple-100 text-purple-700">Käytös</Badge>,
      homework: <Badge className="bg-blue-100 text-blue-700">Läksyt</Badge>,
      other: <Badge className="bg-gray-100 text-gray-700">Muu</Badge>,
    };
    return badges[type as keyof typeof badges] || badges.other;
  };

  // Group detentions by status
  const pendingDetentions = detentions.filter((d: any) => d.status === 'pending');
  const upcomingDetentions = detentions.filter((d: any) => 
    d.status === 'confirmed' && new Date(d.date) >= new Date()
  );
  const completedDetentions = detentions.filter((d: any) => d.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
              <div>
                <CardTitle className="text-2xl">Jälki-istunnot</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Hallinnoi jälki-istuntoja ja automaattisia sääntöjä
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowSettingsDialog(true)} variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Asetukset
              </Button>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-2" />
                Uusi jälki-istunto
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600">{pendingDetentions.length}</div>
            <div className="text-sm text-gray-600 mt-1">Odottaa</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{upcomingDetentions.length}</div>
            <div className="text-sm text-gray-600 mt-1">Tulevat</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{completedDetentions.length}</div>
            <div className="text-sm text-gray-600 mt-1">Suoritetut</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-gray-600">{detentions.length}</div>
            <div className="text-sm text-gray-600 mt-1">Yhteensä</div>
          </CardContent>
        </Card>
      </div>

      {/* Detentions List */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Odottaa ({pendingDetentions.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Tulevat ({upcomingDetentions.length})</TabsTrigger>
          <TabsTrigger value="completed">Suoritetut ({completedDetentions.length})</TabsTrigger>
          <TabsTrigger value="all">Kaikki ({detentions.length})</TabsTrigger>
        </TabsList>

        {['pending', 'upcoming', 'completed', 'all'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <Card>
              <CardContent className="p-6">
                {(tab === 'pending' ? pendingDetentions :
                  tab === 'upcoming' ? upcomingDetentions :
                  tab === 'completed' ? completedDetentions :
                  detentions).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Ei jälki-istuntoja</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(tab === 'pending' ? pendingDetentions :
                      tab === 'upcoming' ? upcomingDetentions :
                      tab === 'completed' ? completedDetentions :
                      detentions).map((detention: any) => (
                      <div key={detention.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-gray-600" />
                              <span className="font-semibold">{detention.studentName}</span>
                              <Badge variant="outline">{detention.studentClass}</Badge>
                              {getStatusBadge(detention.status)}
                              {getReasonTypeBadge(detention.reasonType)}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {detention.date}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {detention.time} ({detention.duration} min)
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {detention.room}
                              </div>
                            </div>

                            <div className="text-sm text-gray-700 mb-2">
                              <strong>Syy:</strong> {detention.reason}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Määrännyt: {detention.assignedBy}</span>
                              {detention.studentNotified && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <Check className="w-3 h-3" />
                                  Oppilas ilmoitettu
                                </span>
                              )}
                              {detention.parentNotified && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <Check className="w-3 h-3" />
                                  Huoltaja ilmoitettu
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {detention.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateDetention.mutate({ 
                                    id: detention.id, 
                                    data: { status: 'confirmed' } 
                                  })}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const reason = prompt('Syy peruutukselle:');
                                    if (reason) {
                                      updateDetention.mutate({ 
                                        id: detention.id, 
                                        data: { 
                                          status: 'cancelled',
                                          cancelReason: reason,
                                          cancelledBy: 'Admin'
                                        } 
                                      });
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {detention.status === 'confirmed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateDetention.mutate({ 
                                  id: detention.id, 
                                  data: { status: 'completed', completedAt: new Date().toISOString() } 
                                })}
                                className="text-green-600 hover:text-green-700"
                              >
                                Merkitse suoritetuksi
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm('Haluatko varmasti poistaa tämän jälki-istunnon?')) {
                                  deleteDetention.mutate(detention.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Detention Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Luo uusi jälki-istunto</DialogTitle>
          </DialogHeader>
          <DetentionForm
            students={students}
            settings={settings}
            onSubmit={(data) => createDetention.mutate(data)}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Jälki-istunto-asetukset</DialogTitle>
          </DialogHeader>
          <DetentionSettings
            settings={settings}
            onSave={(data) => updateSettings.mutate(data)}
            onCancel={() => setShowSettingsDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Detention Form Component
function DetentionForm({ students, settings, onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({
    studentId: '',
    reasonType: 'late',
    reason: '',
    date: new Date().toISOString().split('T')[0],
    time: settings?.detentionTime || '15:00',
    duration: settings?.detentionDuration || 60,
    room: settings?.detentionRoom || 'A101',
    notes: '',
  });

  const selectedStudent = students.find((s: any) => s.id === parseInt(formData.studentId));

  const handleSubmit = () => {
    if (!formData.studentId || !formData.reason) {
      alert('Täytä kaikki pakolliset kentät');
      return;
    }

    onSubmit({
      ...formData,
      studentId: parseInt(formData.studentId),
      studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
      studentClass: selectedStudent.studentClass,
      assignedBy: 'Admin', // TODO: Get from current user
      assignedById: 1, // TODO: Get from current user
    });
  };

  return (
    <div className="space-y-4 py-4">
      <div>
        <Label>Opiskelija *</Label>
        <Select value={formData.studentId} onValueChange={(value) => setFormData({ ...formData, studentId: value })}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Valitse opiskelija" />
          </SelectTrigger>
          <SelectContent>
            {students.map((student: any) => (
              <SelectItem key={student.id} value={student.id.toString()}>
                {student.firstName} {student.lastName} ({student.studentClass})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Syyn tyyppi *</Label>
        <Select value={formData.reasonType} onValueChange={(value) => setFormData({ ...formData, reasonType: value })}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="late">Myöhästyminen</SelectItem>
            <SelectItem value="absent">Poissaolo</SelectItem>
            <SelectItem value="behavior">Käytös</SelectItem>
            <SelectItem value="homework">Läksyt</SelectItem>
            <SelectItem value="other">Muu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Syy *</Label>
        <Textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="Kerro miksi jälki-istunto määrätään..."
          rows={3}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Päivämäärä *</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Aika *</Label>
          <Input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Kesto (min) *</Label>
          <Input
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Luokka *</Label>
          <Input
            value={formData.room}
            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
            placeholder="esim. A101"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label>Lisätiedot</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Vapaaehtoisia lisätietoja..."
          rows={2}
          className="mt-1"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Peruuta
        </Button>
        <Button onClick={handleSubmit} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" />
          Luo jälki-istunto
        </Button>
      </DialogFooter>
    </div>
  );
}

// Detention Settings Component
function DetentionSettings({ settings, onSave, onCancel }: any) {
  const [formData, setFormData] = useState({
    enabled: settings?.enabled ?? true,
    lateMarksThreshold: settings?.lateMarksThreshold ?? 3,
    absentMarksThreshold: settings?.absentMarksThreshold ?? 5,
    autoAssignDetention: settings?.autoAssignDetention ?? true,
    autoSendMessage: settings?.autoSendMessage ?? true,
    messageTemplate: settings?.messageTemplate || 'Hei {studentName},\n\nSinulle on määrätty jälki-istunto {date} klo {time} luokassa {room}.\n\nSyy: {reason}\n\nYstävällisin terveisin,\n{teacherName}',
    detentionDuration: settings?.detentionDuration ?? 60,
    detentionRoom: settings?.detentionRoom || 'A101',
    detentionTime: settings?.detentionTime || '15:00',
    notifyParents: settings?.notifyParents ?? true,
    requireConfirmation: settings?.requireConfirmation ?? false,
  });

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Yleiset asetukset</h3>
        
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium">Jälki-istunnot käytössä</p>
            <p className="text-sm text-gray-600">Ota jälki-istuntojärjestelmä käyttöön</p>
          </div>
          <Switch
            checked={formData.enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium">Automaattinen määrääminen</p>
            <p className="text-sm text-gray-600">Määrää jälki-istunto automaattisesti raja-arvojen ylittyessä</p>
          </div>
          <Switch
            checked={formData.autoAssignDetention}
            onCheckedChange={(checked) => setFormData({ ...formData, autoAssignDetention: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium">Automaattinen viesti</p>
            <p className="text-sm text-gray-600">Lähetä viesti automaattisesti oppilaalle</p>
          </div>
          <Switch
            checked={formData.autoSendMessage}
            onCheckedChange={(checked) => setFormData({ ...formData, autoSendMessage: checked })}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium">Ilmoita huoltajille</p>
            <p className="text-sm text-gray-600">Lähetä ilmoitus myös huoltajille</p>
          </div>
          <Switch
            checked={formData.notifyParents}
            onCheckedChange={(checked) => setFormData({ ...formData, notifyParents: checked })}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Raja-arvot</h3>
        
        <div>
          <Label>Myöhästymisten raja-arvo</Label>
          <Input
            type="number"
            value={formData.lateMarksThreshold}
            onChange={(e) => setFormData({ ...formData, lateMarksThreshold: parseInt(e.target.value) })}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Jälki-istunto määrätään automaattisesti tämän määrän myöhästymisiä jälkeen
          </p>
        </div>

        <div>
          <Label>Poissaolojen raja-arvo</Label>
          <Input
            type="number"
            value={formData.absentMarksThreshold}
            onChange={(e) => setFormData({ ...formData, absentMarksThreshold: parseInt(e.target.value) })}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Jälki-istunto määrätään automaattisesti tämän määrän poissaoloja jälkeen
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Oletusarvot</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Oletusaika</Label>
            <Input
              type="time"
              value={formData.detentionTime}
              onChange={(e) => setFormData({ ...formData, detentionTime: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Oletuskesto (min)</Label>
            <Input
              type="number"
              value={formData.detentionDuration}
              onChange={(e) => setFormData({ ...formData, detentionDuration: parseInt(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Oletusluokka</Label>
            <Input
              value={formData.detentionRoom}
              onChange={(e) => setFormData({ ...formData, detentionRoom: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Viestipohja</h3>
        <p className="text-sm text-gray-600">
          Käytä muuttujia: {'{studentName}'}, {'{date}'}, {'{time}'}, {'{room}'}, {'{reason}'}, {'{teacherName}'}
        </p>
        <Textarea
          value={formData.messageTemplate}
          onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
          rows={6}
          className="font-mono text-sm"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Peruuta
        </Button>
        <Button onClick={() => onSave(formData)} className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          Tallenna asetukset
        </Button>
      </DialogFooter>
    </div>
  );
}
