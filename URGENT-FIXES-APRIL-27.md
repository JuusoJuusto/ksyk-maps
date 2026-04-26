# Urgent Fixes - April 27, 2026

## 🔥 CRITICAL FIXES NEEDED

### 1. Fix Logo ✅ PRIORITY
**Issue**: Logo looks bad
**Solution**: 
- Increase logo size
- Better positioning
- Add proper styling
- Make it more prominent

### 2. Improve Lukujärjestys Settings ✅ PRIORITY
**Issue**: Settings are not flexible enough
**Requirements**:
- Customize EVERY lesson individually
- Customize EVERY break (välitunti)
- Better YH (yhteinen hetki) support
- More granular control

**New Features Needed**:
```typescript
interface LessonSettings {
  lessonNumber: number;
  startTime: string;
  endTime: string;
  duration: number;
  customizable: boolean;
}

interface BreakSettings {
  breakNumber: number;
  afterLesson: number;
  duration: number;
  type: 'short' | 'lunch' | 'yh';
  customizable: boolean;
}
```

### 3. Fix Colors - Use Wilma Theme ✅ CRITICAL
**Issue**: Current colors are BS, need real Wilma colors
**Wilma Color Palette**:
```css
/* Primary Colors */
--wilma-blue: #003d82;
--wilma-dark-blue: #002855;
--wilma-light-blue: #e6f2ff;

/* Background Colors */
--wilma-bg-main: #f5f5f5;
--wilma-bg-card: #ffffff;
--wilma-bg-hover: #f0f0f0;

/* Text Colors */
--wilma-text-primary: #333333;
--wilma-text-secondary: #666666;
--wilma-text-muted: #999999;

/* Status Colors */
--wilma-success: #28a745;
--wilma-warning: #ffc107;
--wilma-danger: #dc3545;
--wilma-info: #17a2b8;

/* Border Colors */
--wilma-border: #dee2e6;
--wilma-border-light: #e9ecef;
```

**Files to Update**:
- All Wilma pages (wilma.tsx, wilma-teacher.tsx, wilma-admin.tsx, etc.)
- All Wilma components
- Schedule builder
- Attendance calendar
- Remove all purple, bright colors
- Use subtle grays and blues only

### 4. Make Analytics Data REAL ✅ CRITICAL
**Issue**: Analytics in Reports tab still shows FAKE data
**Solution**:
- Connect to real Firestore analytics
- Remove all Math.random() calls
- Use actual data from:
  - `pageViews` collection
  - `searchAnalytics` collection
  - `navigationAnalytics` collection
  - `userSessions` collection
  - `wilmaGrades` collection
  - `wilmaAttendance` collection
  - `wilmaCourses` collection

**Real Data Queries Needed**:
```typescript
// Get real student count
const studentCount = await db.collection('wilmaUsers')
  .doc('students')
  .collection('list')
  .where('isActive', '==', true)
  .get()
  .then(snap => snap.size);

// Get real average grade
const grades = await db.collection('wilmaGrades').get();
const avgGrade = grades.docs.reduce((sum, doc) => sum + doc.data().value, 0) / grades.size;

// Get real attendance rate
const attendance = await db.collection('wilmaAttendance').get();
const presentCount = attendance.docs.filter(doc => doc.data().markCode === 'H').length;
const attendanceRate = (presentCount / attendance.size) * 100;
```

### 5. Add AI Detection for Homework ✅ NEW FEATURE
**Requirements**:
- Detect if homework is written by AI
- Show AI detection score (0-100%)
- Flag suspicious submissions
- Use GPTZero API or similar

**Implementation**:
```typescript
interface HomeworkSubmission {
  id: string;
  studentId: string;
  homeworkId: string;
  content: string;
  submittedAt: Date;
  aiDetection?: {
    score: number; // 0-100, higher = more likely AI
    confidence: number; // 0-100
    flagged: boolean;
    checkedAt: Date;
  };
}

// API endpoint
POST /api/wilma/homework/check-ai
{
  "content": "essay text here..."
}

// Response
{
  "aiScore": 85,
  "confidence": 92,
  "flagged": true,
  "details": {
    "perplexity": 12.5,
    "burstiness": 0.3,
    "patterns": ["repetitive", "formal"]
  }
}
```

### 6. Add Writing Progress Tracker ✅ NEW FEATURE
**Requirements**:
- Track writing progress in real-time
- Show word count, character count
- Show time spent writing
- Show writing speed (words/minute)
- Show revision history
- Visual progress bar

**Implementation**:
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
}

interface WritingSession {
  id: string;
  startTime: Date;
  endTime: Date;
  wordsAdded: number;
  wordsDeleted: number;
  charactersAdded: number;
  charactersDeleted: number;
  pauseDuration: number; // seconds
}

// Real-time tracking component
<WritingProgressTracker
  homeworkId={homework.id}
  studentId={student.id}
  onUpdate={(progress) => saveProgress(progress)}
/>
```

**UI Features**:
- Live word counter
- Time tracker
- Writing speed meter
- Progress bar (% of target word count)
- Session history
- Pause detection
- Copy-paste detection
- AI writing detection integration

---

## 📋 Implementation Priority

### Phase 1 (Today - 2 hours):
1. ✅ Fix logo styling
2. ✅ Change all colors to Wilma theme
3. ✅ Remove fake analytics data

### Phase 2 (Tomorrow - 3 hours):
4. ✅ Improve lukujärjestys settings
5. ✅ Add individual lesson customization
6. ✅ Add individual break customization

### Phase 3 (This Week - 4 hours):
7. ✅ Implement AI detection API
8. ✅ Add AI detection to homework submissions
9. ✅ Create AI detection UI

### Phase 4 (This Week - 3 hours):
10. ✅ Implement writing progress tracker
11. ✅ Add real-time tracking
12. ✅ Create progress visualization

---

## 🎨 Wilma Theme Implementation

### Color Replacements:
```typescript
// REMOVE THESE COLORS:
- Purple (#9333ea, #a855f7, #c084fc)
- Bright blue (#3b82f6, #60a5fa)
- Bright green (#10b981, #34d399)
- Orange (#f97316, #fb923c)
- Pink (#ec4899, #f472b6)

// USE THESE INSTEAD:
- Wilma blue (#003d82)
- Dark blue (#002855)
- Light blue (#e6f2ff)
- Gray (#f5f5f5, #e9ecef, #dee2e6)
- Success green (#28a745)
- Warning yellow (#ffc107)
- Danger red (#dc3545)
```

### Component Updates:
1. **Navigation bars**: Wilma blue background
2. **Cards**: White with gray borders
3. **Buttons**: Wilma blue primary, gray secondary
4. **Hover states**: Light blue background
5. **Active states**: Dark blue background
6. **Text**: Dark gray, not black
7. **Borders**: Light gray, subtle
8. **Shadows**: Minimal, subtle

---

## 🔧 Technical Details

### AI Detection Integration:
```bash
# Install dependencies
npm install openai axios

# Environment variables
OPENAI_API_KEY=sk-...
AI_DETECTION_ENABLED=true
AI_DETECTION_THRESHOLD=70
```

### Writing Progress Tracking:
```bash
# Real-time updates using WebSocket or polling
# Store in Firestore: wilmaHomeworkProgress collection
# Update every 30 seconds
# Track: words, characters, time, revisions
```

### Analytics Real Data:
```bash
# Query Firestore collections
# Aggregate data server-side
# Cache results for 5 minutes
# Update dashboard in real-time
```

---

## 📊 Success Criteria

### Logo:
- [ ] Logo is 2x larger
- [ ] Logo is centered properly
- [ ] Logo has proper spacing
- [ ] Logo looks professional

### Colors:
- [ ] All purple removed
- [ ] All bright colors replaced
- [ ] Wilma blue used throughout
- [ ] Subtle grays for backgrounds
- [ ] Professional appearance

### Lukujärjestys:
- [ ] Can customize each lesson individually
- [ ] Can customize each break individually
- [ ] Can set YH (yhteinen hetki)
- [ ] Settings are intuitive
- [ ] Changes save properly

### Analytics:
- [ ] No fake data
- [ ] Real student count
- [ ] Real grade averages
- [ ] Real attendance rates
- [ ] Real course data

### AI Detection:
- [ ] API integration working
- [ ] Detection score shown
- [ ] Flagged submissions highlighted
- [ ] Teacher can review flagged work
- [ ] False positive handling

### Writing Progress:
- [ ] Real-time word count
- [ ] Time tracking working
- [ ] Progress bar accurate
- [ ] Session history saved
- [ ] Copy-paste detected
- [ ] AI writing detected

---

**Status**: 🔴 URGENT - START IMMEDIATELY
**Estimated Time**: 12-15 hours total
**Priority**: CRITICAL

---

*All fixes must be completed this week for production deployment.*
