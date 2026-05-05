# Wilma Code Examples

## Complete Student Management Component

```typescript
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Trash2, Plus, Search } from "lucide-react";

interface Student {
  id: number;
  name: string;
  email: string;
  class: string;
  parentId?: number;
  parentName?: string;
}

export default function StudentManager() {
  const params = useParams();
  const adminId = params.adminId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch students
  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ['/api/wilma/students', adminId],
    queryFn: async () => {
      const response = await fetch(`/api/wilma/students?adminId=${adminId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Virhe haettaessa opiskelijoita');
      }
      
      return response.json();
    }
  });

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      const response = await fetch(`/api/wilma/students/${studentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Virhe poistettaessa opiskelijaa');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Onnistui",
        description: "Opiskelija poistettu onnistuneesti.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wilma/students'] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Virhe",
        description: `Opiskelijan poistaminen epäonnistui: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Memoized filtered students
  const filteredStudents = useMemo(() => 
    students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [students, searchTerm]
  );

  // Stats
  const stats = useMemo(() => ({
    total: students.length,
    withParents: students.filter(s => s.parentId).length,
    classes: new Set(students.map(s => s.class)).size
  }), [students]);

  if (isLoading) {
    return <div className="p-8 text-center">Ladataan...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader>
            <CardTitle className="text-white/90 text-sm">Opiskelijat</CardTitle>
            <div className="text-4xl font-bold">{stats.total}</div>
          </CardHeader>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader>
            <CardTitle className="text-white/90 text-sm">Huoltajilla</CardTitle>
            <div className="text-4xl font-bold">{stats.withParents}</div>
          </CardHeader>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="text-white/90 text-sm">Luokat</CardTitle>
            <div className="text-4xl font-bold">{stats.classes}</div>
          </CardHeader>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Hae opiskelijoita..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
          <Plus className="w-4 h-4 mr-2" />
          Lisää opiskelija
        </Button>
      </div>

      {/* Student Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStudents.map((student) => (
          <Card 
            key={student.id}
            className="bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{student.name}</CardTitle>
                    <Badge className="mt-1 bg-blue-600">{student.class}</Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="truncate">{student.email}</span>
              </div>
              
              {student.parentName && (
                <div className="p-2 bg-white/50 rounded-lg">
                  <div className="text-xs text-gray-500">Huoltaja</div>
                  <div className="text-sm font-medium">{student.parentName}</div>
                </div>
              )}
              
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                disabled={deleteStudentMutation.isPending}
                onClick={() => {
                  if (confirm(`Haluatko varmasti poistaa opiskelijan ${student.name}?`)) {
                    deleteStudentMutation.mutate(student.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteStudentMutation.isPending ? "Poistetaan..." : "Poista"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Ei opiskelijoita
        </div>
      )}
    </div>
  );
}
```

## Desktop App Example

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, X, Trophy, Flame, Star } from "lucide-react";

interface DuolingoAppProps {
  onClose: () => void;
}

export default function DuolingoApp({ onClose }: DuolingoAppProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [streak, setStreak] = useState(7);
  const [xp, setXp] = useState(450);

  const languages = [
    { id: 'en', name: 'English', flag: '🇬🇧', progress: 45 },
    { id: 'sv', name: 'Swedish', flag: '🇸🇪', progress: 23 },
    { id: 'de', name: 'German', flag: '🇩🇪', progress: 12 },
    { id: 'es', name: 'Spanish', flag: '🇪🇸', progress: 8 },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-green-50 to-blue-50">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-green-600" />
          <span className="font-semibold">Duolingo</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-gray-600">Streak</span>
            </div>
            <div className="text-2xl font-bold">{streak} päivää</div>
          </Card>
          
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="text-sm text-gray-600">XP</span>
            </div>
            <div className="text-2xl font-bold">{xp}</div>
          </Card>
          
          <Card className="p-4 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-600">Taso</span>
            </div>
            <div className="text-2xl font-bold">5</div>
          </Card>
        </div>

        {/* Languages */}
        <h2 className="text-xl font-bold mb-4">Kielet</h2>
        <div className="space-y-3">
          {languages.map((lang) => (
            <Card
              key={lang.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
              onClick={() => setSelectedLanguage(lang.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{lang.flag}</span>
                  <div>
                    <div className="font-semibold">{lang.name}</div>
                    <Badge variant="secondary">{lang.progress}% valmis</Badge>
                  </div>
                </div>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  Harjoittele
                </Button>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${lang.progress}%` }}
                />
              </div>
            </Card>
          ))}
        </div>

        {/* Daily Goal */}
        <Card className="mt-6 p-4 bg-gradient-to-r from-green-500 to-blue-500 text-white">
          <h3 className="font-bold mb-2">Päivittäinen tavoite</h3>
          <p className="text-sm mb-3">Suorita 20 XP tänään!</p>
          <div className="w-full bg-white/30 rounded-full h-3">
            <div
              className="bg-white h-3 rounded-full transition-all"
              style={{ width: '65%' }}
            />
          </div>
          <p className="text-xs mt-2">13 / 20 XP</p>
        </Card>
      </div>
    </div>
  );
}
```

## API Endpoint Example

```typescript
// server/routes.ts
import type { Express } from "express";
import { db } from "../db";
import { students, parents } from "@db/schema";
import { eq, like, or } from "drizzle-orm";

export function registerWilmaRoutes(app: Express) {
  // Get all students
  app.get("/api/wilma/students", async (req, res) => {
    try {
      const { adminId, search } = req.query;
      
      if (!adminId) {
        return res.status(400).json({
          success: false,
          error: "Virhe",
          message: "Admin ID puuttuu"
        });
      }

      let query = db
        .select({
          id: students.id,
          name: students.name,
          email: students.email,
          class: students.class,
          parentId: students.parentId,
          parentName: parents.name,
        })
        .from(students)
        .leftJoin(parents, eq(students.parentId, parents.id))
        .where(eq(students.adminId, Number(adminId)));

      if (search) {
        query = query.where(
          or(
            like(students.name, `%${search}%`),
            like(students.email, `%${search}%`),
            like(students.class, `%${search}%`)
          )
        );
      }

      const result = await query;

      res.json({
        success: true,
        data: result,
        message: "Opiskelijat haettu onnistuneesti"
      });
    } catch (error: any) {
      console.error("Error fetching students:", error);
      res.status(500).json({
        success: false,
        error: "Virhe",
        message: "Opiskelijoiden haku epäonnistui",
        details: error.message
      });
    }
  });

  // Create student
  app.post("/api/wilma/students", async (req, res) => {
    try {
      const { name, email, class: studentClass, parentId, adminId } = req.body;

      // Validation
      if (!name || !email || !studentClass || !adminId) {
        return res.status(400).json({
          success: false,
          error: "Virhe",
          message: "Pakolliset kentät puuttuvat"
        });
      }

      // Check if email exists
      const existing = await db
        .select()
        .from(students)
        .where(eq(students.email, email))
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          error: "Virhe",
          message: "Sähköposti on jo käytössä"
        });
      }

      // Create student
      const [newStudent] = await db
        .insert(students)
        .values({
          name,
          email,
          class: studentClass,
          parentId: parentId || null,
          adminId: Number(adminId),
          createdAt: new Date(),
        })
        .returning();

      res.status(201).json({
        success: true,
        data: newStudent,
        message: "Opiskelija lisätty onnistuneesti"
      });
    } catch (error: any) {
      console.error("Error creating student:", error);
      res.status(500).json({
        success: false,
        error: "Virhe",
        message: "Opiskelijan lisääminen epäonnistui",
        details: error.message
      });
    }
  });

  // Delete student
  app.delete("/api/wilma/students/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const [deleted] = await db
        .delete(students)
        .where(eq(students.id, Number(id)))
        .returning();

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "Virhe",
          message: "Opiskelijaa ei löytynyt"
        });
      }

      res.json({
        success: true,
        data: deleted,
        message: "Opiskelija poistettu onnistuneesti"
      });
    } catch (error: any) {
      console.error("Error deleting student:", error);
      res.status(500).json({
        success: false,
        error: "Virhe",
        message: "Opiskelijan poistaminen epäonnistui",
        details: error.message
      });
    }
  });
}
```

## Form Validation Example

```typescript
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Schema with Finnish error messages
const studentSchema = z.object({
  name: z.string()
    .min(2, "Nimen tulee olla vähintään 2 merkkiä")
    .max(100, "Nimi on liian pitkä"),
  email: z.string()
    .email("Virheellinen sähköpostiosoite")
    .min(1, "Sähköposti vaaditaan"),
  class: z.string()
    .min(1, "Luokka vaaditaan")
    .max(10, "Luokka on liian pitkä"),
  parentId: z.number().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

export function StudentForm() {
  const { toast } = useToast();
  
  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      email: "",
      class: "",
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      const response = await fetch('/api/wilma/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Virhe');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Onnistui",
        description: "Opiskelija lisätty onnistuneesti.",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "❌ Virhe",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <form onSubmit={form.handleSubmit((data) => createStudentMutation.mutate(data))}>
      {/* Form fields */}
    </form>
  );
}
```

## Testing Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentManager from './StudentManager';

describe('StudentManager', () => {
  it('näyttää opiskelijat oikein', async () => {
    const mockStudents = [
      { id: 1, name: 'Matti Meikäläinen', email: 'matti@example.com', class: '9A' },
      { id: 2, name: 'Maija Virtanen', email: 'maija@example.com', class: '9B' },
    ];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockStudents),
      })
    ) as any;

    render(<StudentManager />);

    await waitFor(() => {
      expect(screen.getByText('Matti Meikäläinen')).toBeInTheDocument();
      expect(screen.getByText('Maija Virtanen')).toBeInTheDocument();
    });
  });

  it('suodattaa opiskelijat hakutermillä', async () => {
    // Test implementation
  });

  it('näyttää virheilmoituksen epäonnistuneessa poistossa', async () => {
    // Test implementation
  });
});
```
