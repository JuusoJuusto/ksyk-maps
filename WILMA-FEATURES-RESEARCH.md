# Wilma Features Research - April 27, 2026

## 🔍 Real Wilma Features (Based on Finnish School System)

### Core Features Already Implemented:
1. ✅ **Lukujärjestys** (Schedule/Timetable)
2. ✅ **Arvosanat** (Grades)
3. ✅ **Poissaolot** (Absences/Attendance)
4. ✅ **Viestit** (Messages)
5. ✅ **Kotitehtävät** (Homework)
6. ✅ **Ilmoitukset** (Announcements)
7. ✅ **Opettajat** (Teachers Directory)
8. ✅ **Kurssit** (Courses)

### Additional Wilma Features to Implement:

#### 1. **Oppimissuunnitelma** (Learning Plan)
- Individual learning goals
- Progress tracking
- Teacher feedback
- Parent comments

#### 2. **Kokeet ja Tentit** (Exams and Tests)
- Upcoming exams calendar
- Exam results
- Study materials
- Exam schedules

#### 3. **Todistukset** (Certificates/Report Cards)
- Digital report cards
- Download as PDF
- Historical records
- Grade summaries

#### 4. **Ruokalista** (Lunch Menu)
- Weekly menu
- Dietary restrictions
- Allergen information
- Special diets

#### 5. **Tapahtumakalenteri** (Event Calendar)
- School events
- Holidays
- Parent-teacher meetings
- Extra-curricular activities

#### 6. **Keskustelut** (Discussions)
- Class discussions
- Subject-specific forums
- Q&A with teachers
- Study groups

#### 7. **Materiaalit** (Study Materials)
- Course materials
- Lecture notes
- Presentations
- Videos and links

#### 8. **Varaukset** (Reservations)
- Room bookings
- Equipment reservations
- Counselor appointments
- Library resources

#### 9. **Tukipalvelut** (Support Services)
- School nurse
- Counselor
- Special education
- Psychologist

#### 10. **Yhteystiedot** (Contact Information)
- Emergency contacts
- Parent information
- Student information
- Staff directory

---

## 🤖 AI Detection Features (NEW)

### Implementation Status: ✅ DONE (API exists)

### Features:
1. **Perplexity Analysis** - Measures text predictability
2. **Burstiness Detection** - Analyzes sentence variation
3. **Lexical Diversity** - Vocabulary richness
4. **Formal Language Detection** - Identifies AI-like patterns
5. **Sentence Length Consistency** - Detects uniform patterns

### API Endpoint:
```
POST /api/wilma/homework/check-ai
Body: { "content": "essay text..." }
Response: {
  "aiScore": 85,
  "confidence": 92,
  "flagged": true,
  "details": {
    "perplexity": 12.5,
    "burstiness": 0.3,
    "lexicalDiversity": 0.45,
    "patterns": ["low-lexical-diversity", "formal-language"]
  }
}
```

---

## ✍️ Writing Progress Tracker (TO IMPLEMENT)

### Features Needed:

#### Real-time Tracking:
1. **Word Counter** - Live word count
2. **Character Counter** - Total characters
3. **Time Tracker** - Time spent writing
4. **Writing Speed** - Words per minute
5. **Session History** - Multiple writing sessions

#### Advanced Features:
1. **Pause Detection** - Detect when user stops writing
2. **Copy-Paste Detection** - Flag large text insertions
3. **Revision Tracking** - Track edits and changes
4. **Progress Bar** - Visual progress to goal
5. **Writing Patterns** - Analyze writing habits

#### Data Structure:
```typescript
interface WritingProgress {
  homeworkId: string;
  studentId: string;
  sessions: WritingSession[];
  totalWords: number;
  totalCharacters: number;
  totalTimeMinutes: number;
  revisions: number;
  startedAt: Date;
  lastUpdatedAt: Date;
  targetWords?: number;
  copyPasteDetected: boolean;
  aiDetectionScore?: number;
}

interface WritingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  wordsAdded: number;
  wordsDeleted: number;
  charactersAdded: number;
  charactersDeleted: number;
  pauseDuration: number;
  copyPasteEvents: number;
  keystrokeCount: number;
}
```

#### UI Components:
1. **Live Counter Display** - Shows current stats
2. **Progress Bar** - Visual progress indicator
3. **Session Timer** - Active writing time
4. **Speed Meter** - Real-time WPM
5. **History Panel** - Past sessions
6. **Alerts** - Copy-paste warnings, AI detection

---

## 🎯 Priority Implementation Order

### Phase 1 (Immediate):
1. ✅ AI Detection API - DONE
2. ⏳ Writing Progress Tracker Component
3. ⏳ Writing Progress API Endpoints

### Phase 2 (Short-term):
1. Ruokalista (Lunch Menu) - Already exists
2. Tapahtumakalenteri (Event Calendar)
3. Todistukset (Report Cards)

### Phase 3 (Medium-term):
1. Oppimissuunnitelma (Learning Plan)
2. Keskustelut (Discussions)
3. Materiaalit (Study Materials)

### Phase 4 (Long-term):
1. Varaukset (Reservations)
2. Tukipalvelut (Support Services)
3. Advanced Analytics

---

## 📊 Wilma Color Scheme (Official)

```css
/* Primary Colors */
--wilma-blue: #003d82;
--wilma-dark-blue: #002855;
--wilma-light-blue: #e6f2ff;

/* Status Colors */
--wilma-success: #28a745;
--wilma-warning: #ffc107;
--wilma-danger: #dc3545;

/* Neutral Colors */
--wilma-gray-100: #f5f5f5;
--wilma-gray-200: #e9ecef;
--wilma-gray-300: #dee2e6;
--wilma-gray-600: #666666;
--wilma-gray-900: #333333;
```

---

## 🔐 Security Features

### Already Implemented:
1. ✅ Rate Limiting (100 req/min)
2. ✅ Input Sanitization
3. ✅ Security Headers
4. ✅ Password Hashing
5. ✅ Session Management

### To Add:
1. ⏳ Two-Factor Authentication (2FA)
2. ⏳ IP Whitelisting for Admin
3. ⏳ Audit Logging
4. ⏳ GDPR Compliance Tools

---

## 📱 Mobile Features

### Responsive Design:
1. ✅ Mobile-friendly navigation
2. ✅ Touch-optimized UI
3. ✅ Responsive tables
4. ⏳ PWA Support
5. ⏳ Offline Mode

---

## 🌐 Internationalization

### Languages:
1. ✅ Finnish (fi)
2. ✅ English (en)
3. ⏳ Swedish (sv) - Required in Finland
4. ⏳ Russian (ru) - Common in Finland

---

## 📈 Analytics Features

### Already Implemented:
1. ✅ Page View Tracking
2. ✅ User Session Tracking
3. ✅ Feature Usage Analytics
4. ✅ Search Analytics

### To Add:
1. ⏳ Real-time Active Users
2. ⏳ Performance Metrics
3. ⏳ Error Tracking
4. ⏳ User Behavior Heatmaps

---

**Status**: Research Complete
**Next Steps**: Implement Writing Progress Tracker
**Priority**: HIGH
