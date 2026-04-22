import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Calendar, Plus, Trash2, Save, Coffee, Bell } from "lucide-react";

interface Period {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  order: number;
}

interface Term {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  order: number;
}

interface Break {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  order: number;
}

interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'vacation' | 'holiday' | 'other';
  order: number;
}

interface SpecialSchedule {
  id: string;
  name: string;
  date: string;
  description: string;
  periods: Period[];
}

// Schedule Settings Manager Component
export default function ScheduleSettingsManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("periods");

  // Fetch schedule settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["schedule-settings"],
    queryFn: async () => {
      const response = await fetch("/api/schedule-settings");
      if (!response.ok) throw new Error("Failed to fetch schedule settings");
      return response.json();
    }
  });

  // Periods state
  const [periods, setPeriods] = useState<Period[]>([
    { id: "1", name: "1. tunti", startTime: "08:00", endTime: "08:45", order: 1 },
    { id: "2", name: "2. tunti", startTime: "08:50", endTime: "09:35", order: 2 },
    { id: "3", name: "3. tunti", startTime: "09:55", endTime: "10:40", order: 3 },
    { id: "4", name: "4. tunti", startTime: "10:45", endTime: "11:30", order: 4 },
    { id: "5", name: "5. tunti", startTime: "12:00", endTime: "12:45", order: 5 },
    { id: "6", name: "6. tunti", startTime: "12:50", endTime: "13:35", order: 6 },
    { id: "7", name: "7. tunti", startTime: "13:40", endTime: "14:25", order: 7 },
    { id: "8", name: "8. tunti", startTime: "14:30", endTime: "15:15", order: 8 },
  ]);

  // Terms state
  const [terms, setTerms] = useState<Term[]>([
    { id: "1", name: "Syyslukukausi 1. jakso", startDate: "2026-08-10", endDate: "2026-10-09", order: 1 },
    { id: "2", name: "Syyslukukausi 2. jakso", startDate: "2026-10-12", endDate: "2026-12-18", order: 2 },
    { id: "3", name: "Kevätlukukausi 3. jakso", startDate: "2027-01-07", endDate: "2027-02-26", order: 3 },
    { id: "4", name: "Kevätlukukausi 4. jakso", startDate: "2027-03-01", endDate: "2027-05-28", order: 4 },
  ]);

  // Breaks state
  const [breaks, setBreaks] = useState<Break[]>([
    { id: "1", name: "Välitunti 1", startTime: "09:35", endTime: "09:55", order: 1 },
    { id: "2", name: "Lounastauko", startTime: "11:30", endTime: "12:00", order: 2 },
  ]);

  // Special schedules state
  const [specialSchedules, setSpecialSchedules] = useState<SpecialSchedule[]>([]);

  // Holidays state
  const [holidays, setHolidays] = useState<Holiday[]>([
    { id: "1", name: "Syysloma", startDate: "2026-10-19", endDate: "2026-10-23", type: "vacation", order: 1 },
    { id: "2", name: "Joululoma", startDate: "2026-12-21", endDate: "2027-01-06", type: "vacation", order: 2 },
    { id: "3", name: "Talviloma", startDate: "2027-02-22", endDate: "2027-02-26", type: "vacation", order: 3 },
    { id: "4", name: "Pääsiäisloma", startDate: "2027-04-01", endDate: "2027-04-05", type: "vacation", order: 4 },
  ]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/schedule-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to save schedule settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-settings"] });
      alert("✅ Lukujärjestysasetukset tallennettu!");
    },
    onError: (error: any) => {
      alert(`❌ Virhe tallennuksessa: ${error.message}`);
    }
  });

  const handleSave = () => {
    saveMutation.mutate({
      periods,
      terms,
      breaks,
      holidays,
      specialSchedules
    });
  };

  // Period handlers
  const addPeriod = () => {
    const newOrder = periods.length + 1;
    setPeriods([...periods, {
      id: Date.now().toString(),
      name: `${newOrder}. tunti`,
      startTime: "08:00",
      endTime: "08:45",
      order: newOrder
    }]);
  };

  const updatePeriod = (id: string, field: keyof Period, value: string | number) => {
    setPeriods(periods.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const deletePeriod = (id: string) => {
    setPeriods(periods.filter(p => p.id !== id));
  };

  // Term handlers
  const addTerm = () => {
    const newOrder = terms.length + 1;
    setTerms([...terms, {
      id: Date.now().toString(),
      name: `Jakso ${newOrder}`,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      order: newOrder
    }]);
  };

  const updateTerm = (id: string, field: keyof Term, value: string | number) => {
    setTerms(terms.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const deleteTerm = (id: string) => {
    setTerms(terms.filter(t => t.id !== id));
  };

  // Break handlers
  const addBreak = () => {
    const newOrder = breaks.length + 1;
    setBreaks([...breaks, {
      id: Date.now().toString(),
      name: `Välitunti ${newOrder}`,
      startTime: "10:00",
      endTime: "10:15",
      order: newOrder
    }]);
  };

  const updateBreak = (id: string, field: keyof Break, value: string | number) => {
    setBreaks(breaks.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const deleteBreak = (id: string) => {
    setBreaks(breaks.filter(b => b.id !== id));
  };

  // Holiday handlers
  const addHoliday = () => {
    const newOrder = holidays.length + 1;
    setHolidays([...holidays, {
      id: Date.now().toString(),
      name: `Loma ${newOrder}`,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      type: "vacation",
      order: newOrder
    }]);
  };

  const updateHoliday = (id: string, field: keyof Holiday, value: string | number) => {
    setHolidays(holidays.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const deleteHoliday = (id: string) => {
    setHolidays(holidays.filter(h => h.id !== id));
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Ladataan asetuksia...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lukujärjestysasetukset</h2>
          <p className="text-gray-600 mt-1">Määritä tuntien ajat, jaksot ja tauot</p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Tallennetaan..." : "Tallenna asetukset"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="periods">
            <Clock className="w-4 h-4 mr-2" />
            Tunnit
          </TabsTrigger>
          <TabsTrigger value="terms">
            <Calendar className="w-4 h-4 mr-2" />
            Jaksot
          </TabsTrigger>
          <TabsTrigger value="breaks">
            <Coffee className="w-4 h-4 mr-2" />
            Tauot
          </TabsTrigger>
          <TabsTrigger value="holidays">
            <Calendar className="w-4 h-4 mr-2" />
            Lomat
          </TabsTrigger>
          <TabsTrigger value="special">
            <Bell className="w-4 h-4 mr-2" />
            Erikoisaikataulut
          </TabsTrigger>
        </TabsList>

        {/* Periods Tab */}
        <TabsContent value="periods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Oppitunnit</span>
                <Button onClick={addPeriod} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Lisää tunti
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {periods.sort((a, b) => a.order - b.order).map((period) => (
                <div key={period.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <Label>Nimi</Label>
                      <Input
                        value={period.name}
                        onChange={(e) => updatePeriod(period.id, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Alkaa</Label>
                      <Input
                        type="time"
                        value={period.startTime}
                        onChange={(e) => updatePeriod(period.id, "startTime", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Päättyy</Label>
                      <Input
                        type="time"
                        value={period.endTime}
                        onChange={(e) => updatePeriod(period.id, "endTime", e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => deletePeriod(period.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Terms Tab */}
        <TabsContent value="terms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Lukuvuoden jaksot</span>
                <Button onClick={addTerm} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Lisää jakso
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {terms.sort((a, b) => a.order - b.order).map((term) => (
                <div key={term.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <Label>Jakson nimi</Label>
                      <Input
                        value={term.name}
                        onChange={(e) => updateTerm(term.id, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Alkupäivä</Label>
                      <Input
                        type="date"
                        value={term.startDate}
                        onChange={(e) => updateTerm(term.id, "startDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Loppupäivä</Label>
                      <Input
                        type="date"
                        value={term.endDate}
                        onChange={(e) => updateTerm(term.id, "endDate", e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => deleteTerm(term.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breaks Tab */}
        <TabsContent value="breaks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Välitunnit</span>
                <Button onClick={addBreak} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Lisää tauko
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {breaks.sort((a, b) => a.order - b.order).map((breakItem) => (
                <div key={breakItem.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <Label>Nimi</Label>
                      <Input
                        value={breakItem.name}
                        onChange={(e) => updateBreak(breakItem.id, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Alkaa</Label>
                      <Input
                        type="time"
                        value={breakItem.startTime}
                        onChange={(e) => updateBreak(breakItem.id, "startTime", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Päättyy</Label>
                      <Input
                        type="time"
                        value={breakItem.endTime}
                        onChange={(e) => updateBreak(breakItem.id, "endTime", e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => deleteBreak(breakItem.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Lomat ja vapaapäivät</span>
                <Button onClick={addHoliday} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Lisää loma
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {holidays.sort((a, b) => a.order - b.order).map((holiday) => (
                <div key={holiday.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div>
                      <Label>Loman nimi</Label>
                      <Input
                        value={holiday.name}
                        onChange={(e) => updateHoliday(holiday.id, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Alkupäivä</Label>
                      <Input
                        type="date"
                        value={holiday.startDate}
                        onChange={(e) => updateHoliday(holiday.id, "startDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Loppupäivä</Label>
                      <Input
                        type="date"
                        value={holiday.endDate}
                        onChange={(e) => updateHoliday(holiday.id, "endDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Tyyppi</Label>
                      <select
                        value={holiday.type}
                        onChange={(e) => updateHoliday(holiday.id, "type", e.target.value)}
                        className="w-full border rounded-md px-3 py-2 h-10"
                      >
                        <option value="vacation">Loma</option>
                        <option value="holiday">Juhlapyhä</option>
                        <option value="other">Muu</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => deleteHoliday(holiday.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Special Schedules Tab */
        <TabsContent value="special" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Erikoisaikataulut</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-center py-8">
                Erikoisaikataulut tulossa pian! Tässä voit määrittää poikkeavat lukujärjestykset esim. juhlille tai tapahtumille.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
