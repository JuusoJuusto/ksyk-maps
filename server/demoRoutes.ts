import type { Express } from "express";
import { storage } from "./storage";
import { rateLimiters } from "./rateLimiter";

/**
 * Demo routes for testing and development
 * These routes provide sample data and test endpoints
 */
export function registerDemoRoutes(app: Express) {
  
  // Demo data endpoint - returns sample campus data
  app.get('/api/demo/campus', rateLimiters.general, async (req, res) => {
    try {
      const demoData = {
        buildings: [
          {
            id: 'demo-1',
            name: 'Main Building',
            nameEn: 'Main Building',
            nameFi: 'Päärakennus',
            floors: 3,
            capacity: 500,
            color: '#3B82F6',
            description: 'Primary academic building'
          },
          {
            id: 'demo-2',
            name: 'Science Wing',
            nameEn: 'Science Wing',
            nameFi: 'Tiedesiipi',
            floors: 2,
            capacity: 200,
            color: '#10B981',
            description: 'Science laboratories and classrooms'
          }
        ],
        rooms: [
          {
            id: 'demo-room-1',
            buildingId: 'demo-1',
            floor: 1,
            roomNumber: '101',
            name: 'Classroom A',
            type: 'classroom',
            capacity: 30
          },
          {
            id: 'demo-room-2',
            buildingId: 'demo-1',
            floor: 1,
            roomNumber: '102',
            name: 'Computer Lab',
            type: 'lab',
            capacity: 25
          }
        ],
        staff: [
          {
            id: 'demo-staff-1',
            firstName: 'Demo',
            lastName: 'Teacher',
            email: 'demo.teacher@example.com',
            role: 'teacher',
            department: 'Mathematics'
          }
        ]
      };
      
      res.json(demoData);
    } catch (error) {
      console.error('Demo campus error:', error);
      res.status(500).json({ message: 'Failed to fetch demo data' });
    }
  });

  // Demo user endpoint - returns sample user data
  app.get('/api/demo/user', rateLimiters.general, (req, res) => {
    const demoUser = {
      id: 'demo-user-1',
      firstName: 'Demo',
      lastName: 'Student',
      email: 'demo.student@example.com',
      role: 'student',
      studentId: 'DEMO001',
      studentClass: '9A',
      isActive: true
    };
    
    res.json(demoUser);
  });

  // Demo schedule endpoint - returns sample schedule
  app.get('/api/demo/schedule', rateLimiters.general, (req, res) => {
    const today = new Date();
    const demoSchedule = {
      date: today.toISOString().split('T')[0],
      lessons: [
        {
          id: 'demo-lesson-1',
          subject: 'Mathematics',
          teacher: 'Demo Teacher',
          room: '101',
          startTime: '08:00',
          endTime: '09:30',
          description: 'Algebra and equations'
        },
        {
          id: 'demo-lesson-2',
          subject: 'English',
          teacher: 'Demo Teacher 2',
          room: '205',
          startTime: '09:45',
          endTime: '11:15',
          description: 'Literature analysis'
        },
        {
          id: 'demo-lesson-3',
          subject: 'Physics',
          teacher: 'Demo Teacher 3',
          room: 'Lab 1',
          startTime: '12:00',
          endTime: '13:30',
          description: 'Mechanics and motion'
        }
      ]
    };
    
    res.json(demoSchedule);
  });

  // Demo grades endpoint - returns sample grades
  app.get('/api/demo/grades', rateLimiters.general, (req, res) => {
    const demoGrades = {
      semester: 'Fall 2026',
      courses: [
        {
          id: 'demo-course-1',
          name: 'Mathematics',
          grade: 9,
          credits: 3,
          teacher: 'Demo Teacher',
          assignments: [
            { name: 'Homework 1', grade: 8, maxGrade: 10, date: '2026-03-15' },
            { name: 'Test 1', grade: 9, maxGrade: 10, date: '2026-03-22' },
            { name: 'Project', grade: 10, maxGrade: 10, date: '2026-04-05' }
          ]
        },
        {
          id: 'demo-course-2',
          name: 'English',
          grade: 8,
          credits: 2,
          teacher: 'Demo Teacher 2',
          assignments: [
            { name: 'Essay 1', grade: 8, maxGrade: 10, date: '2026-03-10' },
            { name: 'Presentation', grade: 9, maxGrade: 10, date: '2026-03-28' }
          ]
        }
      ],
      gpa: 8.5
    };
    
    res.json(demoGrades);
  });

  // Demo messages endpoint - returns sample messages
  app.get('/api/demo/messages', rateLimiters.general, (req, res) => {
    const demoMessages = [
      {
        id: 'demo-msg-1',
        from: 'Demo Teacher',
        subject: 'Homework Reminder',
        preview: 'Please remember to submit your homework by Friday...',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        read: false,
        important: true
      },
      {
        id: 'demo-msg-2',
        from: 'School Administration',
        subject: 'Parent-Teacher Meeting',
        preview: 'The next parent-teacher meeting will be held on...',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        important: false
      },
      {
        id: 'demo-msg-3',
        from: 'Demo Teacher 2',
        subject: 'Great work on your essay!',
        preview: 'I wanted to congratulate you on your excellent essay...',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        important: false
      }
    ];
    
    res.json(demoMessages);
  });

  // Health check endpoint
  app.get('/api/demo/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Rate limit test endpoint
  app.get('/api/demo/rate-limit-test', rateLimiters.externalService, (req, res) => {
    res.json({
      message: 'Rate limit test successful',
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
  });

  console.log('✅ Demo routes registered');
}
