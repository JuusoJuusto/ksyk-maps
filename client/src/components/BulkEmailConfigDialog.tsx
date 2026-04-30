import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Users, Filter, Send, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BulkEmailConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (config: BulkEmailConfig) => void;
  students: any[];
  isLoading?: boolean;
}

export interface BulkEmailConfig {
  gradeLevel?: string;
  newStudentsOnly: boolean;
  includeParents: boolean;
  studentClass?: string;
}

export default function BulkEmailConfigDialog({
  open,
  onOpenChange,
  onSend,
  students,
  isLoading = false
}: BulkEmailConfigDialogProps) {
  const [config, setConfig] = useState<BulkEmailConfig>({
    newStudentsOnly: false,
    includeParents: true,
  });

  // Extract unique grade levels and classes from students
  const gradeLevels = Array.from(new Set(
    students
      .map(s => s.studentClass?.match(/^\d+/)?.[0])
      .filter(Boolean)
  )).sort();

  const classes = Array.from(new Set(
    students.map(s => s.studentClass).filter(Boolean)
  )).sort();

  // Filter students based on config
  const filteredStudents = students.filter(student => {
    if (config.gradeLevel && !student.studentClass?.startsWith(config.gradeLevel)) {
      return false;
    }
    if (config.studentClass && student.studentClass !== config.studentClass) {
      return false;
    }
    if (config.newStudentsOnly && !student.isTemporaryPassword) {
      return false;
    }
    return true;
  });

  // Count recipients
  const studentCount = filteredStudents.length;
  const parentCount = config.includeParents 
    ? filteredStudents.filter(s => s.parent1Email || s.parent2Email).length 
    : 0;
  const totalEmails = studentCount + parentCount;

  const handleSend = () => {
    onSend(config);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="w-6 h-6 text-blue-600" />
            Lähetä tervetulosähköpostit
          </DialogTitle>
          <DialogDescription>
            Valitse keille haluat lähettää tervetulosähköpostit väliaikaisilla salasanoilla
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Filter className="w-4 h-4" />
              Suodattimet
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Grade Level Filter */}
              <div>
                <Label>Luokka-aste</Label>
                <Select 
                  value={config.gradeLevel || "all"} 
                  onValueChange={(value) => setConfig({ ...config, gradeLevel: value === "all" ? undefined : value, studentClass: undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kaikki luokka-asteet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Kaikki luokka-asteet</SelectItem>
                    {gradeLevels.map(level => (
                      <SelectItem key={level} value={level}>
                        {level}. luokka
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Class Filter */}
              <div>
                <Label>Luokka</Label>
                <Select 
                  value={config.studentClass || "all"} 
                  onValueChange={(value) => setConfig({ ...config, studentClass: value === "all" ? undefined : value })}
                  disabled={!!config.gradeLevel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Kaikki luokat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Kaikki luokat</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="newStudents" 
                  checked={config.newStudentsOnly}
                  onCheckedChange={(checked) => setConfig({ ...config, newStudentsOnly: checked as boolean })}
                />
                <Label htmlFor="newStudents" className="cursor-pointer">
                  Vain uudet opiskelijat (väliaikainen salasana)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeParents" 
                  checked={config.includeParents}
                  onCheckedChange={(checked) => setConfig({ ...config, includeParents: checked as boolean })}
                />
                <Label htmlFor="includeParents" className="cursor-pointer">
                  Lähetä myös huoltajille
                </Label>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-2">Vastaanottajat</p>
                <div className="space-y-1 text-sm text-gray-700">
                  <p>• {studentCount} opiskelijaa</p>
                  {config.includeParents && <p>• {parentCount} huoltajaa</p>}
                  <p className="font-semibold text-blue-600 mt-2">
                    Yhteensä {totalEmails} sähköpostia
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Warning if no recipients */}
          {totalEmails === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Valituilla suodattimilla ei löydy vastaanottajia. Tarkista asetukset.
              </AlertDescription>
            </Alert>
          )}

          {/* Info about temporary passwords */}
          {config.newStudentsOnly && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Sähköpostit lähetetään vain opiskelijoille, joilla on väliaikainen salasana. 
                Varmista että olet luonut opiskelijat "Uusi opiskelija" -lomakkeella.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Peruuta
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={totalEmails === 0 || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Lähetetään...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Lähetä {totalEmails} sähköpostia
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
