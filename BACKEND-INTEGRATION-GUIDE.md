# Backend Integration Guide for Wilma System

## Overview
This guide provides detailed instructions for integrating the frontend components with backend APIs, database, and file storage.

---

## 1. Enhanced Substitute Teacher System

### Database Schema

```sql
-- Substitute Requests Table
CREATE TABLE wilma_substitute_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES wilma_users(id),
  teacher_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, assigned, accepted, declined, completed
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, urgent
  classes TEXT[], -- Array of class names
  subjects TEXT[], -- Array of subject names
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Substitute Assignments Table
CREATE TABLE wilma_substitute_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES wilma_substitute_requests(id) ON DELETE CASCADE,
  substitute_teacher_id UUID REFERENCES wilma_users(id),
  substitute_teacher_name VARCHAR(255) NOT NULL,
  assigned_by UUID REFERENCES wilma_users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'assigned', -- assigned, accepted, declined, completed
  feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5)
);

-- Lesson Plans Table
CREATE TABLE wilma_lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES wilma_substitute_requests(id) ON DELETE CASCADE,
  lesson_id UUID,
  class VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  time VARCHAR(50) NOT NULL,
  room VARCHAR(50) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  objectives TEXT[],
  materials TEXT[],
  activities JSONB, -- Array of {duration, description, type}
  homework TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Student Roster for Lesson Plans
CREATE TABLE wilma_lesson_student_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID REFERENCES wilma_lesson_plans(id) ON DELETE CASCADE,
  student_id UUID REFERENCES wilma_users(id),
  student_name VARCHAR(255) NOT NULL,
  photo_url VARCHAR(500),
  allergies TEXT[],
  medications TEXT[],
  emergency_contact VARCHAR(255),
  notes TEXT
);

-- Special Needs for Lesson Plans
CREATE TABLE wilma_lesson_special_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id UUID REFERENCES wilma_lesson_plans(id) ON DELETE CASCADE,
  student_id UUID REFERENCES wilma_users(id),
  student_name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- learning, physical, behavioral, medical
  description TEXT NOT NULL,
  accommodations TEXT[],
  urgent BOOLEAN DEFAULT FALSE
);

-- Substitute Notifications
CREATE TABLE wilma_substitute_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES wilma_users(id),
  type VARCHAR(50) NOT NULL, -- new_request, assignment, acceptance, reminder, cancellation
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  request_id UUID REFERENCES wilma_substitute_requests(id),
  read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_substitute_requests_teacher ON wilma_substitute_requests(teacher_id);
CREATE INDEX idx_substitute_requests_date ON wilma_substitute_requests(date);
CREATE INDEX idx_substitute_requests_status ON wilma_substitute_requests(status);
CREATE INDEX idx_substitute_assignments_substitute ON wilma_substitute_assignments(substitute_teacher_id);
CREATE INDEX idx_lesson_plans_request ON wilma_lesson_plans(request_id);
```

### API Endpoints

```typescript
// server/routes.ts

// Get all substitute requests (with filters)
app.get('/api/wilma/substitutes/requests', async (req, res) => {
  const { status, date, priority } = req.query;
  // Query database with filters
  // Return paginated results
});

// Create new substitute request
app.post('/api/wilma/substitutes/requests', async (req, res) => {
  const { teacherId, date, startTime, endTime, reason, priority, classes, subjects, notes } = req.body;
  // Validate input
  // Create request in database
  // Send notifications to available substitutes
  // Return created request
});

// Get specific request with lesson plans
app.get('/api/wilma/substitutes/requests/:id', async (req, res) => {
  const { id } = req.params;
  // Get request from database
  // Include lesson plans, student rosters, special needs
  // Return complete data
});

// Accept substitute request
app.post('/api/wilma/substitutes/requests/:id/accept', async (req, res) => {
  const { id } = req.params;
  const { substituteTeacherId } = req.body;
  // Create assignment
  // Update request status
  // Send notification to original teacher
  // Return updated request
});

// Decline substitute request
app.post('/api/wilma/substitutes/requests/:id/decline', async (req, res) => {
  const { id } = req.params;
  const { substituteTeacherId, reason } = req.body;
  // Log decline
  // Notify admin
  // Return success
});

// Get substitute's active assignments
app.get('/api/wilma/substitutes/assignments/active', async (req, res) => {
  const { substituteTeacherId } = req.query;
  // Get active assignments
  // Include lesson plans
  // Return data
});

// Complete substitute assignment
app.post('/api/wilma/substitutes/assignments/:id/complete', async (req, res) => {
  const { id } = req.params;
  const { feedback, rating } = req.body;
  // Update assignment status
  // Save feedback
  // Return success
});
```

---

## 2. Enhanced Schedule Builder

### Database Schema

```sql
-- Schedule Slots Table
CREATE TABLE wilma_schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class VARCHAR(50) NOT NULL,
  day INTEGER NOT NULL CHECK (day >= 0 AND day <= 4), -- 0=Mon, 4=Fri
  period INTEGER NOT NULL CHECK (period >= 1 AND period <= 8),
  subject VARCHAR(100) NOT NULL,
  teacher_id UUID REFERENCES wilma_users(id),
  teacher_name VARCHAR(255) NOT NULL,
  room VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(class, day, period, academic_year)
);

-- Schedule Templates
CREATE TABLE wilma_schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  grade_level VARCHAR(50),
  created_by UUID REFERENCES wilma_users(id),
  slots JSONB NOT NULL, -- Array of schedule slots
  created_at TIMESTAMP DEFAULT NOW()
);

-- Schedule Conflicts Log
CREATE TABLE wilma_schedule_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_type VARCHAR(50) NOT NULL, -- teacher, room, class
  slot_ids UUID[],
  message TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  detected_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_schedule_slots_class ON wilma_schedule_slots(class);
CREATE INDEX idx_schedule_slots_teacher ON wilma_schedule_slots(teacher_id);
CREATE INDEX idx_schedule_slots_day_period ON wilma_schedule_slots(day, period);
CREATE INDEX idx_schedule_slots_room ON wilma_schedule_slots(room);
```

### API Endpoints

```typescript
// Get schedule for class
app.get('/api/wilma/schedules/:class', async (req, res) => {
  const { class: className } = req.params;
  const { academicYear } = req.query;
  // Get all slots for class
  // Return organized by day/period
});

// Create/Update schedule slot
app.post('/api/wilma/schedules/slots', async (req, res) => {
  const { class: className, day, period, subject, teacherId, room, startTime, endTime } = req.body;
  // Check for conflicts
  // Create or update slot
  // Return slot with conflict info
});

// Delete schedule slot
app.delete('/api/wilma/schedules/slots/:id', async (req, res) => {
  const { id } = req.params;
  // Delete slot
  // Return success
});

// Validate schedule (check conflicts)
app.post('/api/wilma/schedules/validate', async (req, res) => {
  const { slots } = req.body;
  // Check for teacher conflicts
  // Check for room conflicts
  // Check for class conflicts
  // Return array of conflicts
});

// Export schedule
app.get('/api/wilma/schedules/:class/export', async (req, res) => {
  const { class: className } = req.params;
  const { format } = req.query; // pdf, csv, excel
  // Get schedule
  // Generate file
  // Return file
});

// Import schedule
app.post('/api/wilma/schedules/import', async (req, res) => {
  const { file, class: className } = req.body;
  // Parse file
  // Validate data
  // Create slots
  // Return result
});

// Get schedule templates
app.get('/api/wilma/schedules/templates', async (req, res) => {
  // Get all templates
  // Return list
});

// Create schedule template
app.post('/api/wilma/schedules/templates', async (req, res) => {
  const { name, description, gradeLevel, slots } = req.body;
  // Create template
  // Return created template
});

// Apply template to class
app.post('/api/wilma/schedules/templates/:id/apply', async (req, res) => {
  const { id } = req.params;
  const { class: className } = req.body;
  // Get template
  // Create slots for class
  // Return result
});
```

---

## 3. File Upload System

### File Storage Setup

#### Option A: AWS S3
```typescript
// server/fileStorage.ts
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

export async function uploadFile(file: Express.Multer.File, folder: string) {
  const key = `${folder}/${Date.now()}-${file.originalname}`;
  
  const params = {
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'private'
  };

  const result = await s3.upload(params).promise();
  return {
    url: result.Location,
    key: result.Key
  };
}

export async function deleteFile(key: string) {
  await s3.deleteObject({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key
  }).promise();
}

export function getSignedUrl(key: string, expiresIn: number = 3600) {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Expires: expiresIn
  });
}
```

#### Option B: Local Storage
```typescript
// server/fileStorage.ts
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(__dirname, '../uploads');

export async function uploadFile(file: Express.Multer.File, folder: string) {
  const dir = path.join(UPLOAD_DIR, folder);
  await fs.mkdir(dir, { recursive: true });
  
  const filename = `${Date.now()}-${file.originalname}`;
  const filepath = path.join(dir, filename);
  
  await fs.writeFile(filepath, file.buffer);
  
  return {
    url: `/uploads/${folder}/${filename}`,
    path: filepath
  };
}

export async function deleteFile(filepath: string) {
  await fs.unlink(filepath);
}
```

### Database Schema

```sql
-- Files Table
CREATE TABLE wilma_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_key VARCHAR(500) NOT NULL, -- S3 key or local path
  storage_url VARCHAR(500) NOT NULL,
  uploaded_by UUID REFERENCES wilma_users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  folder VARCHAR(100) NOT NULL, -- homework, profile, documents, etc.
  related_id UUID, -- homework_id, user_id, etc.
  related_type VARCHAR(50), -- homework, profile, etc.
  virus_scanned BOOLEAN DEFAULT FALSE,
  virus_scan_result VARCHAR(50),
  deleted BOOLEAN DEFAULT FALSE
);

-- File Access Log
CREATE TABLE wilma_file_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES wilma_files(id),
  user_id UUID REFERENCES wilma_users(id),
  action VARCHAR(50) NOT NULL, -- upload, download, delete, view
  ip_address VARCHAR(50),
  accessed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_files_uploaded_by ON wilma_files(uploaded_by);
CREATE INDEX idx_files_folder ON wilma_files(folder);
CREATE INDEX idx_files_related ON wilma_files(related_id, related_type);
```

### API Endpoints

```typescript
import multer from 'multer';
import { uploadFile, deleteFile, getSignedUrl } from './fileStorage';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Upload file
app.post('/api/wilma/files/upload', upload.single('file'), async (req, res) => {
  const file = req.file;
  const { folder, relatedId, relatedType } = req.body;
  const userId = req.user.id;

  // Upload to storage
  const { url, key } = await uploadFile(file, folder);

  // Save to database
  const fileRecord = await db.query(`
    INSERT INTO wilma_files (
      filename, original_filename, file_size, mime_type,
      storage_key, storage_url, uploaded_by, folder,
      related_id, related_type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [key, file.originalname, file.size, file.mimetype, key, url, userId, folder, relatedId, relatedType]);

  // Log access
  await logFileAccess(fileRecord.id, userId, 'upload', req.ip);

  // Queue virus scan (async)
  queueVirusScan(fileRecord.id);

  res.json(fileRecord);
});

// Download file
app.get('/api/wilma/files/:id/download', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Get file from database
  const file = await db.query('SELECT * FROM wilma_files WHERE id = $1 AND deleted = FALSE', [id]);
  
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Check permissions
  if (!canAccessFile(userId, file)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Log access
  await logFileAccess(id, userId, 'download', req.ip);

  // Get signed URL (for S3) or serve file (for local)
  const downloadUrl = getSignedUrl(file.storage_key);
  
  res.json({ url: downloadUrl });
});

// Delete file
app.delete('/api/wilma/files/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Get file
  const file = await db.query('SELECT * FROM wilma_files WHERE id = $1', [id]);

  // Check permissions
  if (file.uploaded_by !== userId && !req.user.roles.includes('admin')) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Delete from storage
  await deleteFile(file.storage_key);

  // Mark as deleted in database
  await db.query('UPDATE wilma_files SET deleted = TRUE WHERE id = $1', [id]);

  // Log access
  await logFileAccess(id, userId, 'delete', req.ip);

  res.json({ success: true });
});

// Get files for homework
app.get('/api/wilma/files/homework/:homeworkId', async (req, res) => {
  const { homeworkId } = req.params;
  
  const files = await db.query(`
    SELECT * FROM wilma_files 
    WHERE related_id = $1 AND related_type = 'homework' AND deleted = FALSE
    ORDER BY uploaded_at DESC
  `, [homeworkId]);

  res.json(files);
});
```

---

## 4. Integration Checklist

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/wilma

# AWS S3 (if using)
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=wilma-files

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_password
SMTP_FROM_NAME=Wilma System
SMTP_FROM_EMAIL=noreply@wilma.fi

# Session
SESSION_SECRET=your_secret_key
SESSION_TIMEOUT=3600000

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif
```

### Testing Endpoints
```bash
# Test substitute request creation
curl -X POST http://localhost:3000/api/wilma/substitutes/requests \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": "uuid",
    "date": "2026-04-25",
    "startTime": "08:00",
    "endTime": "14:00",
    "reason": "Sairasloma",
    "priority": "high",
    "classes": ["7A", "8B"],
    "subjects": ["Matematiikka"]
  }'

# Test file upload
curl -X POST http://localhost:3000/api/wilma/files/upload \
  -F "file=@test.pdf" \
  -F "folder=homework" \
  -F "relatedId=homework-uuid" \
  -F "relatedType=homework"

# Test schedule creation
curl -X POST http://localhost:3000/api/wilma/schedules/slots \
  -H "Content-Type: application/json" \
  -d '{
    "class": "7A",
    "day": 0,
    "period": 1,
    "subject": "Matematiikka",
    "teacherId": "uuid",
    "room": "A301",
    "startTime": "08:00",
    "endTime": "08:45"
  }'
```

---

## 5. Security Considerations

### Authentication Middleware
```typescript
// server/middleware/auth.ts
export function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userRoles = req.session.user.roles || [req.session.user.role];
    const hasRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}
```

### Input Validation
```typescript
import { z } from 'zod';

const substituteRequestSchema = z.object({
  teacherId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  reason: z.string().min(1).max(255),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  classes: z.array(z.string()),
  subjects: z.array(z.string()),
  notes: z.string().optional()
});

app.post('/api/wilma/substitutes/requests', async (req, res) => {
  try {
    const data = substituteRequestSchema.parse(req.body);
    // Process request
  } catch (error) {
    return res.status(400).json({ error: error.errors });
  }
});
```

---

## 6. Performance Optimization

### Caching Strategy
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache schedule data
async function getSchedule(className: string) {
  const cacheKey = `schedule:${className}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Get from database
  const schedule = await db.query('SELECT * FROM wilma_schedule_slots WHERE class = $1', [className]);
  
  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(schedule));
  
  return schedule;
}
```

### Database Indexing
```sql
-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_schedule_slots_composite 
ON wilma_schedule_slots(class, day, period, academic_year);

CREATE INDEX CONCURRENTLY idx_files_composite 
ON wilma_files(related_id, related_type, deleted);

CREATE INDEX CONCURRENTLY idx_substitute_requests_composite 
ON wilma_substitute_requests(status, date, priority);
```

---

## 7. Monitoring & Logging

### Error Logging
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.session?.user?.id
  });
  
  res.status(500).json({ error: 'Internal server error' });
});
```

---

This guide provides a complete roadmap for backend integration. Follow the schemas, implement the endpoints, and test thoroughly before deploying to production.
