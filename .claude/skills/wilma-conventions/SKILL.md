---
name: wilma-conventions
description: Wilma school management system development conventions including Finnish localization, UI patterns, API design, and educational focus. Use when working on Wilma features, Finnish translations, student/parent management, or educational apps.
---

# Wilma Development Conventions

## Quick Start

When working on Wilma features:
1. Use Finnish language for all UI text
2. Use toast() notifications (never alert())
3. Add credentials: 'include' to all fetch calls
4. Use useParams from wouter for routing
5. Focus on educational value (no games)

## Finnish Localization

### Common Translations
```typescript
// Users & Roles
student: "Opiskelija"
students: "Opiskelijat"
parent: "Huoltaja"
parents: "Huoltajat"
teacher: "Opettaja"
staff: "Henkilökunta"

// Actions
add: "Lisää"
edit: "Muokkaa"
delete: "Poista"
save: "Tallenna"
cancel: "Peruuta"
search: "Hae"
filter: "Suodata"

// Status
success: "Onnistui"
error: "Virhe"
loading: "Ladataan..."
saved: "Tallennettu"

// Common Phrases
"Ei tuloksia": "No results"
"Haluatko varmasti poistaa?": "Are you sure you want to delete?"
"Tallennettu onnistuneesti": "Saved successfully"
"Tapahtui virhe": "An error occurred"
```

## UI Patterns

### Notification System
```typescript
// ✅ CORRECT - Use toast
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

toast({
  title: "✅ Onnistui",
  description: "Opiskelija lisätty onnistuneesti.",
});

toast({
  title: "❌ Virhe",
  description: "Opiskelijan lisääminen epäonnistui.",
  variant: "destructive",
});

// ❌ WRONG - Never use alert
alert("Success!"); // DON'T DO THIS
```

### Routing
```typescript
// ✅ CORRECT - Use useParams
import { useParams } from "wouter";

const params = useParams();
const adminId = params.adminId;

// ❌ WRONG - Don't parse window.location
const adminId = window.location.pathname.split('/')[2]; // DON'T DO THIS
```

### API Calls
```typescript
// ✅ CORRECT - Include credentials
const response = await fetch('/api/wilma/students', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // ALWAYS ADD THIS
  body: JSON.stringify(data)
});

// ❌ WRONG - Missing credentials
const response = await fetch('/api/wilma/students', {
  method: 'POST',
  body: JSON.stringify(data)
}); // DON'T DO THIS
```

### Error Handling
```typescript
// ✅ CORRECT - Comprehensive error handling
const mutation = useMutation({
  mutationFn: async (data) => {
    const response = await fetch('/api/wilma/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
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
    queryClient.invalidateQueries({ queryKey: ['/api/wilma/students'] });
  },
  onError: (error: any) => {
    toast({
      title: "❌ Virhe",
      description: `Opiskelijan lisääminen epäonnistui: ${error.message}`,
      variant: "destructive",
    });
  }
});
```

## Component Patterns

### Student/Parent Cards
```typescript
// Use gradient backgrounds
<Card className="bg-gradient-to-br from-blue-50 to-blue-100">
  <CardHeader>
    <div className="flex items-center gap-3">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
        <User className="w-7 h-7 text-white" />
      </div>
      <div>
        <CardTitle>{student.name}</CardTitle>
        <Badge>{student.class}</Badge>
      </div>
    </div>
  </CardHeader>
</Card>
```

### Stats Dashboard
```typescript
// 4-column responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
    <CardHeader>
      <CardTitle className="text-white/90">Opiskelijat</CardTitle>
      <div className="text-4xl font-bold">{studentCount}</div>
    </CardHeader>
  </Card>
</div>
```

## Desktop Apps

### Educational Focus
All desktop apps MUST be educational or productivity-focused:

**✅ ALLOWED:**
- Learning apps (Duolingo, Khan Academy, Quizlet)
- Office apps (Word, Excel, PowerPoint)
- Communication (Teams, Outlook, Discord)
- Development (VS Code, Terminal)
- Utilities (Calculator, Calendar, Maps)

**❌ NOT ALLOWED:**
- Games (Snake, Minecraft, Steam)
- Entertainment-only apps
- Social media (unless educational context)

### App Structure
```typescript
export default function EducationalApp({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <AppIcon className="w-5 h-5" />
          <span className="font-semibold">App Name</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* App content here */}
      </div>
    </div>
  );
}
```

## API Design

### Endpoint Naming
```typescript
// Student Management
GET    /api/wilma/students              // List all
POST   /api/wilma/students              // Create
GET    /api/wilma/students/:id          // Get one
PUT    /api/wilma/students/:id          // Update
DELETE /api/wilma/students/:id          // Delete

// Nested Resources
GET    /api/wilma/students/:id/grades   // Student's grades
POST   /api/wilma/students/:id/grades   // Add grade
GET    /api/wilma/parents/:id/students  // Parent's students
```

### Response Format
```typescript
// Success Response
{
  success: true,
  data: { ... },
  message: "Opiskelija lisätty onnistuneesti"
}

// Error Response
{
  success: false,
  error: "Virhe",
  message: "Opiskelijan lisääminen epäonnistui",
  details: "Email already exists"
}
```

## Performance

### Memoization
```typescript
// ✅ CORRECT - Memoize filtered data
const filteredStudents = useMemo(() => 
  students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  ),
  [students, searchTerm]
);

// ❌ WRONG - Recalculate every render
const filteredStudents = students.filter(s => 
  s.name.toLowerCase().includes(searchTerm.toLowerCase())
);
```

### Disabled States
```typescript
// ✅ CORRECT - Disable during mutations
<Button
  disabled={mutation.isPending}
  onClick={() => mutation.mutate(data)}
>
  {mutation.isPending ? "Ladataan..." : "Tallenna"}
</Button>
```

## Code Quality

### No Console Logs
```typescript
// ❌ WRONG - Remove all console.log
console.log("Debug info"); // DON'T DO THIS

// ✅ CORRECT - Use proper error handling
if (!response.ok) {
  throw new Error('API error');
}
```

### TypeScript
```typescript
// ✅ CORRECT - Proper typing
interface Student {
  id: number;
  name: string;
  email: string;
  class: string;
  parentId?: number;
}

// ❌ WRONG - Using any
const student: any = { ... }; // DON'T DO THIS
```

## Checklist

Before submitting Wilma code:
- [ ] All UI text in Finnish
- [ ] Using toast() for notifications
- [ ] credentials: 'include' in all fetch calls
- [ ] useParams for routing (not window.location)
- [ ] Comprehensive error handling
- [ ] Memoized expensive calculations
- [ ] Disabled states during mutations
- [ ] No console.log statements
- [ ] Proper TypeScript types
- [ ] Educational focus (no games)
- [ ] Gradient backgrounds on cards
- [ ] Responsive design (mobile-first)
- [ ] Smooth animations (200ms)

## Common Mistakes

### 1. Mixed Languages
```typescript
// ❌ WRONG
<Button>Save Student</Button>

// ✅ CORRECT
<Button>Tallenna opiskelija</Button>
```

### 2. Missing Error Handling
```typescript
// ❌ WRONG
const response = await fetch('/api/wilma/students');
const data = await response.json();

// ✅ CORRECT
const response = await fetch('/api/wilma/students', {
  credentials: 'include'
});

if (!response.ok) {
  throw new Error('Virhe haettaessa opiskelijoita');
}

const data = await response.json();
```

### 3. Hardcoded Values
```typescript
// ❌ WRONG
const adminId = "123";

// ✅ CORRECT
const params = useParams();
const adminId = params.adminId;
```

## Resources

- [Wilma API Documentation](./API-REFERENCE.md)
- [Finnish Translation Guide](./FINNISH-TRANSLATIONS.md)
- [Component Library](./COMPONENTS.md)
- [Desktop Apps Guide](./DESKTOP-APPS.md)

## Examples

See [EXAMPLES.md](./EXAMPLES.md) for complete code examples of:
- Student management component
- Parent management component
- Desktop app implementation
- API endpoint implementation
- Error handling patterns
