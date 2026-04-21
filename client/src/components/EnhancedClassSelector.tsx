import { useState, useMemo } from 'react';
import { Search, Users, GraduationCap, ChevronDown, User as UserIcon, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EnhancedClassSelectorProps {
  classes: any[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  showDetails?: boolean;
  viewMode?: 'dropdown' | 'cards';
  className?: string;
}

export default function EnhancedClassSelector({
  classes,
  value,
  onChange,
  label,
  placeholder = "Valitse luokka...",
  required = false,
  disabled = false,
  showDetails = true,
  viewMode = 'dropdown',
  className = ""
}: EnhancedClassSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Group classes by grade
  const groupedClasses = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    
    classes.forEach(cls => {
      const grade = cls.grade || 'Muut';
      if (!groups[grade]) {
        groups[grade] = [];
      }
      groups[grade].push(cls);
    });

    // Sort each group by class name
    Object.keys(groups).forEach(grade => {
      groups[grade].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });

    return groups;
  }, [classes]);

  // Get sorted grade keys
  const sortedGrades = useMemo(() => {
    return Object.keys(groupedClasses).sort((a, b) => {
      if (a === 'Muut') return 1;
      if (b === 'Muut') return -1;
      return parseInt(a) - parseInt(b);
    });
  }, [groupedClasses]);

  // Filter classes by search term
  const filteredClasses = useMemo(() => {
    if (!searchTerm) return classes;
    
    const search = searchTerm.toLowerCase();
    return classes.filter(cls => {
      const name = cls.name?.toLowerCase() || '';
      const grade = cls.grade?.toString().toLowerCase() || '';
      const teacher = cls.teacher?.toLowerCase() || '';
      const homeroom = cls.homeroom?.toLowerCase() || '';
      
      return name.includes(search) || 
             grade.includes(search) || 
             teacher.includes(search) ||
             homeroom.includes(search);
    });
  }, [classes, searchTerm]);

  // Get selected class
  const selectedClass = classes.find(c => c.id === value || c.name === value);

  // Get grade color
  const getGradeColor = (grade: string) => {
    const gradeNum = parseInt(grade);
    if (gradeNum === 7) return 'bg-blue-100 text-blue-700 border-blue-300';
    if (gradeNum === 8) return 'bg-green-100 text-green-700 border-green-300';
    if (gradeNum === 9) return 'bg-purple-100 text-purple-700 border-purple-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  // Cards View Mode
  if (viewMode === 'cards') {
    return (
      <div className={className}>
        {label && (
          <Label className="mb-3 block text-lg font-semibold">
            {label} {required && <span className="text-red-500">*</span>}
          </Label>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Hae luokkaa..."
            className="pl-10"
          />
        </div>

        {/* Class Cards Grouped by Grade */}
        <div className="space-y-6">
          {sortedGrades.map(grade => {
            const gradeClasses = groupedClasses[grade].filter(cls =>
              filteredClasses.includes(cls)
            );

            if (gradeClasses.length === 0) return null;

            return (
              <div key={grade}>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  {grade === 'Muut' ? 'Muut luokat' : `${grade}. luokka`}
                  <Badge variant="outline">{gradeClasses.length} luokkaa</Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {gradeClasses.map(cls => (
                    <Card
                      key={cls.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        (value === cls.id || value === cls.name)
                          ? 'ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                      onClick={() => !disabled && onChange(cls.name || cls.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getGradeColor(cls.grade)}`}>
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-lg">{cls.name}</p>
                              <p className="text-xs text-gray-600">{cls.grade}. luokka</p>
                            </div>
                          </div>
                          {(value === cls.id || value === cls.name) && (
                            <Badge className="bg-indigo-600">Valittu</Badge>
                          )}
                        </div>
                        {showDetails && (
                          <div className="space-y-1 text-sm">
                            {cls.teacher && (
                              <p className="flex items-center gap-2 text-gray-700">
                                <GraduationCap className="w-3 h-3" />
                                {cls.teacher}
                              </p>
                            )}
                            {cls.homeroom && (
                              <p className="flex items-center gap-2 text-gray-700">
                                <BookOpen className="w-3 h-3" />
                                {cls.homeroom}
                              </p>
                            )}
                            {cls.studentCount !== undefined && (
                              <p className="flex items-center gap-2 text-gray-700">
                                <UserIcon className="w-3 h-3" />
                                {cls.studentCount} opiskelijaa
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {filteredClasses.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Ei luokkia hakuehdoilla
          </div>
        )}
      </div>
    );
  }

  // Dropdown View Mode
  return (
    <div className={`relative ${className}`}>
      {label && (
        <Label className="mb-1 block">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      {/* Selected Class Display / Dropdown Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md text-left flex items-center justify-between ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400 cursor-pointer'
        } ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-300'}`}
      >
        {selectedClass ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getGradeColor(selectedClass.grade)}`}>
              <Users className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {selectedClass.name}
              </p>
              {showDetails && (
                <p className="text-xs text-gray-600 truncate">
                  {selectedClass.grade}. luokka
                  {selectedClass.teacher && ` • ${selectedClass.teacher}`}
                  {selectedClass.studentCount !== undefined && ` • ${selectedClass.studentCount} opiskelijaa`}
                </p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-96 overflow-hidden">
            {/* Search Box */}
            <div className="p-3 border-b bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Hae luokkaa..."
                  className="pl-10 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Class List Grouped by Grade */}
            <div className="overflow-y-auto max-h-80">
              {filteredClasses.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Ei tuloksia
                </div>
              ) : (
                sortedGrades.map(grade => {
                  const gradeClasses = groupedClasses[grade].filter(cls =>
                    filteredClasses.includes(cls)
                  );

                  if (gradeClasses.length === 0) return null;

                  return (
                    <div key={grade}>
                      <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 sticky top-0">
                        <p className="text-xs font-bold text-gray-700 uppercase">
                          {grade === 'Muut' ? 'Muut luokat' : `${grade}. luokka`}
                        </p>
                      </div>
                      {gradeClasses.map(cls => (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => {
                            onChange(cls.name || cls.id);
                            setIsOpen(false);
                            setSearchTerm('');
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 ${
                            (value === cls.id || value === cls.name) ? 'bg-indigo-100' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getGradeColor(cls.grade)}`}>
                              <Users className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {cls.name}
                              </p>
                              {showDetails && (
                                <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                                  {cls.teacher && (
                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                      {cls.teacher}
                                    </span>
                                  )}
                                  {cls.homeroom && (
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                      {cls.homeroom}
                                    </span>
                                  )}
                                  {cls.studentCount !== undefined && (
                                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                      {cls.studentCount} opiskelijaa
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
