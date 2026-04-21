import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'react-hot-toast';
import { Clock, Plus, Trash2, Save, Calendar } from 'lucide-react';

interface Period {
  name: string;
  startTime: string;
  endTime: string;
  type: 'class' | 'break' | 'lunch';
}

interface ScheduleConfig {
  id?: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  periods: Period[];
  schoolYear: string;
  effectiveFrom: string;
  effectiveTo: string;
  notes: string;
}

export default function ScheduleConfigManager() {
  const [configs, setConfigs] = useState<ScheduleConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<ScheduleConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/schedule-config');
      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error('Error fetching schedule configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewConfig = () => {
    setEditingConfig({
      name: 'New Schedule',
      isActive: false,
      isDefault: false,
      periods: [
        { name: 'Period 1', startTime: '08:00', endTime: '09:30', type: 'class' },
        { name: 'Break', startTime: '09:30', endTime: '09:45', type: 'break' },
        { name: 'Period 2', startTime: '09:45', endTime: '11:15', type: 'class' },
        { name: 'Lunch', startTime: '11:15', endTime: '12:00', type: 'lunch' },
        { name: 'Period 3', startTime: '12:00', endTime: '13:30', type: 'class' },
        { name: 'Break', startTime: '13:30', endTime: '13:45', type: 'break' },
        { name: 'Period 4', startTime: '13:45', endTime: '15:15', type: 'class' },
      ],
      schoolYear: '2025-2026',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
      notes: '',
    });
  };

  const addPeriod = () => {
    if (!editingConfig) return;
    const lastPeriod = editingConfig.periods[editingConfig.periods.length - 1];
    const newStartTime = lastPeriod ? lastPeriod.endTime : '08:00';
    
    setEditingConfig({
      ...editingConfig,
      periods: [
        ...editingConfig.periods,
        {
          name: `Period ${editingConfig.periods.length + 1}`,
          startTime: newStartTime,
          endTime: addMinutes(newStartTime, 90),
          type: 'class',
        },
      ],
    });
  };

  const removePeriod = (index: number) => {
    if (!editingConfig) return;
    setEditingConfig({
      ...editingConfig,
      periods: editingConfig.periods.filter((_, i) => i !== index),
    });
  };

  const updatePeriod = (index: number, field: keyof Period, value: string) => {
    if (!editingConfig) return;
    const newPeriods = [...editingConfig.periods];
    newPeriods[index] = { ...newPeriods[index], [field]: value };
    setEditingConfig({ ...editingConfig, periods: newPeriods });
  };

  const addMinutes = (time: string, minutes: number): string => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  };

  const saveConfig = async () => {
    if (!editingConfig) return;

    try {
      const method = editingConfig.id ? 'PUT' : 'POST';
      const url = editingConfig.id 
        ? `/api/schedule-config/${editingConfig.id}` 
        : '/api/schedule-config';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConfig),
      });

      if (response.ok) {
        toast.success('Schedule configuration saved!');
        setEditingConfig(null);
        fetchConfigs();
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    }
  };

  const deleteConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule configuration?')) return;

    try {
      const response = await fetch(`/api/schedule-config/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Configuration deleted');
        fetchConfigs();
      } else {
        toast.error('Failed to delete configuration');
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      toast.error('Failed to delete configuration');
    }
  };

  const getPeriodColor = (type: string) => {
    switch (type) {
      case 'class': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'break': return 'bg-green-100 border-green-300 text-green-800';
      case 'lunch': return 'bg-orange-100 border-orange-300 text-orange-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading schedule configurations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Schedule Configuration</h2>
          <p className="text-muted-foreground">Manage class times, breaks, and lunch periods</p>
        </div>
        <Button onClick={createNewConfig}>
          <Plus className="w-4 h-4 mr-2" />
          New Schedule
        </Button>
      </div>

      {editingConfig ? (
        <Card className="border-2 border-blue-500">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {editingConfig.id ? 'Edit Schedule' : 'Create New Schedule'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Schedule Name</Label>
                <Input
                  value={editingConfig.name}
                  onChange={(e) => setEditingConfig({ ...editingConfig, name: e.target.value })}
                  placeholder="e.g., Default Schedule"
                />
              </div>
              <div className="space-y-2">
                <Label>School Year</Label>
                <Input
                  value={editingConfig.schoolYear}
                  onChange={(e) => setEditingConfig({ ...editingConfig, schoolYear: e.target.value })}
                  placeholder="e.g., 2025-2026"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Effective From</Label>
                <Input
                  type="date"
                  value={editingConfig.effectiveFrom}
                  onChange={(e) => setEditingConfig({ ...editingConfig, effectiveFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Effective To (Optional)</Label>
                <Input
                  type="date"
                  value={editingConfig.effectiveTo}
                  onChange={(e) => setEditingConfig({ ...editingConfig, effectiveTo: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingConfig.isActive}
                  onCheckedChange={(checked) => setEditingConfig({ ...editingConfig, isActive: checked })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingConfig.isDefault}
                  onCheckedChange={(checked) => setEditingConfig({ ...editingConfig, isDefault: checked })}
                />
                <Label>Set as Default</Label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Periods</Label>
                <Button onClick={addPeriod} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Period
                </Button>
              </div>

              <div className="space-y-2">
                {editingConfig.periods.map((period, index) => (
                  <div key={index} className={`p-4 rounded-lg border-2 ${getPeriodColor(period.type)}`}>
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-3">
                        <Input
                          value={period.name}
                          onChange={(e) => updatePeriod(index, 'name', e.target.value)}
                          placeholder="Period name"
                          className="bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="time"
                          value={period.startTime}
                          onChange={(e) => updatePeriod(index, 'startTime', e.target.value)}
                          className="bg-white"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="time"
                          value={period.endTime}
                          onChange={(e) => updatePeriod(index, 'endTime', e.target.value)}
                          className="bg-white"
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          value={period.type}
                          onChange={(e) => updatePeriod(index, 'type', e.target.value)}
                          className="w-full p-2 border rounded-md bg-white"
                        >
                          <option value="class">Class</option>
                          <option value="break">Break</option>
                          <option value="lunch">Lunch</option>
                        </select>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button
                          onClick={() => removePeriod(index)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                value={editingConfig.notes}
                onChange={(e) => setEditingConfig({ ...editingConfig, notes: e.target.value })}
                className="w-full p-2 border rounded-md min-h-[80px]"
                placeholder="Additional notes about this schedule..."
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={saveConfig} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </Button>
              <Button onClick={() => setEditingConfig(null)} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {configs.map((config) => (
            <Card key={config.id} className={config.isActive ? 'border-2 border-green-500' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    {config.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    {config.isActive && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                        Active
                      </span>
                    )}
                    {config.isDefault && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                        Default
                      </span>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {config.schoolYear} • {config.periods.length} periods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {config.periods.slice(0, 3).map((period, idx) => (
                    <div key={idx} className={`p-2 rounded text-sm ${getPeriodColor(period.type)}`}>
                      <div className="flex justify-between">
                        <span className="font-semibold">{period.name}</span>
                        <span>{period.startTime} - {period.endTime}</span>
                      </div>
                    </div>
                  ))}
                  {config.periods.length > 3 && (
                    <p className="text-sm text-gray-500 text-center">
                      +{config.periods.length - 3} more periods
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditingConfig(config)}
                    variant="outline"
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => config.id && deleteConfig(config.id)}
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!editingConfig && configs.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Schedule Configurations</h3>
            <p className="text-gray-500 mb-4">Create your first schedule configuration to get started</p>
            <Button onClick={createNewConfig}>
              <Plus className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
