import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo users
  const hashedPassword = await bcrypt.hash('demo123', 10);

  const demoStudent = await prisma.user.upsert({
    where: { email: 'student@stemgenius.com' },
    update: {},
    create: {
      email: 'student@stemgenius.com',
      passwordHash: hashedPassword,
      name: 'Demo Student',
      role: 'STUDENT',
      subscriptionTier: 'FREE',
      emailVerified: true,
      profile: {
        create: {
          gradeLevel: 9,
          school: 'Demo High School',
          country: 'FI',
          language: 'fi',
          learningStyle: 'visual',
          studyGoals: ['improve_grades', 'exam_prep'],
          weakTopics: ['quadratic_equations', 'thermodynamics'],
          strongTopics: ['linear_equations', 'kinematics'],
          difficultyLevel: 5.0,
          learningSpeed: 1.0,
          confidenceLevel: 0.6,
        },
      },
      xp: {
        create: {
          totalXP: 250,
          level: 3,
          mathXP: 150,
          physicsXP: 100,
          chemistryXP: 0,
          astronomyXP: 0,
        },
      },
      streaks: {
        create: {
          currentStreak: 5,
          longestStreak: 12,
          lastActivityDate: new Date(),
        },
      },
    },
  });

  const premiumStudent = await prisma.user.upsert({
    where: { email: 'premium@stemgenius.com' },
    update: {},
    create: {
      email: 'premium@stemgenius.com',
      passwordHash: hashedPassword,
      name: 'Premium Student',
      role: 'STUDENT',
      subscriptionTier: 'PREMIUM',
      emailVerified: true,
      profile: {
        create: {
          gradeLevel: 11,
          school: 'Elite Academy',
          country: 'FI',
          language: 'fi',
          learningStyle: 'kinesthetic',
          studyGoals: ['matriculation_exams', 'university_prep'],
          weakTopics: ['organic_chemistry', 'calculus'],
          strongTopics: ['algebra', 'mechanics'],
          difficultyLevel: 7.5,
          learningSpeed: 1.3,
          confidenceLevel: 0.8,
        },
      },
      xp: {
        create: {
          totalXP: 1500,
          level: 8,
          mathXP: 600,
          physicsXP: 500,
          chemistryXP: 300,
          astronomyXP: 100,
        },
      },
      streaks: {
        create: {
          currentStreak: 25,
          longestStreak: 45,
          lastActivityDate: new Date(),
          freezesAvailable: 3,
        },
      },
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@stemgenius.com' },
    update: {},
    create: {
      email: 'teacher@stemgenius.com',
      passwordHash: hashedPassword,
      name: 'Demo Teacher',
      role: 'TEACHER',
      subscriptionTier: 'SCHOOL',
      emailVerified: true,
    },
  });

  console.log('✅ Created demo users:', {
    student: demoStudent.email,
    premium: premiumStudent.email,
    teacher: teacher.email,
  });

  // Create sample tasks
  const mathTask1 = await prisma.task.create({
    data: {
      subject: 'MATHEMATICS',
      topic: 'Quadratic Equations',
      subtopic: 'Solving by Factoring',
      difficulty: 5.0,
      type: 'MULTIPLE_CHOICE',
      level: 'INTERMEDIATE',
      question: {
        text: 'Solve the equation: x² - 5x + 6 = 0',
        options: ['x = 2 or x = 3', 'x = 1 or x = 6', 'x = -2 or x = -3', 'x = 0 or x = 5'],
      },
      answer: {
        correct: 'x = 2 or x = 3',
        explanation: 'Factor as (x-2)(x-3) = 0, so x = 2 or x = 3',
      },
      solution: {
        steps: [
          'Factor the quadratic: x² - 5x + 6 = (x-2)(x-3)',
          'Set each factor to zero: x-2 = 0 or x-3 = 0',
          'Solve: x = 2 or x = 3',
        ],
      },
      hints: {
        progressive: [
          'Try to factor the quadratic expression',
          'Look for two numbers that multiply to 6 and add to -5',
          'The factors are (x-2) and (x-3)',
        ],
      },
      estimatedTime: 180,
      xpReward: 15,
      tags: ['algebra', 'quadratic', 'factoring'],
      generatedBy: 'gpt-4',
    },
  });

  const physicsTask1 = await prisma.task.create({
    data: {
      subject: 'PHYSICS',
      topic: 'Kinematics',
      subtopic: 'Uniform Motion',
      difficulty: 4.0,
      type: 'CALCULATION',
      level: 'BEGINNER',
      question: {
        text: 'A car travels at 60 km/h for 2 hours. How far does it travel?',
        units: 'km',
      },
      answer: {
        value: 120,
        unit: 'km',
      },
      solution: {
        steps: [
          'Use the formula: distance = speed × time',
          'distance = 60 km/h × 2 h',
          'distance = 120 km',
        ],
      },
      estimatedTime: 120,
      xpReward: 10,
      tags: ['kinematics', 'motion', 'speed'],
      generatedBy: 'gpt-4',
    },
  });

  const chemistryTask1 = await prisma.task.create({
    data: {
      subject: 'CHEMISTRY',
      topic: 'Periodic Table',
      subtopic: 'Element Properties',
      difficulty: 3.0,
      type: 'MULTIPLE_CHOICE',
      level: 'BEGINNER',
      question: {
        text: 'Which element has the atomic number 6?',
        options: ['Oxygen', 'Carbon', 'Nitrogen', 'Hydrogen'],
      },
      answer: {
        correct: 'Carbon',
      },
      solution: {
        steps: [
          'Atomic number represents the number of protons',
          'Element with 6 protons is Carbon (C)',
        ],
      },
      estimatedTime: 60,
      xpReward: 8,
      tags: ['periodic-table', 'elements', 'atomic-number'],
      generatedBy: 'gpt-4',
    },
  });

  console.log('✅ Created sample tasks:', {
    math: mathTask1.id,
    physics: physicsTask1.id,
    chemistry: chemistryTask1.id,
  });

  // Create sample user task completions
  await prisma.userTask.create({
    data: {
      userId: demoStudent.id,
      taskId: mathTask1.id,
      answerSubmitted: { answer: 'x = 2 or x = 3' },
      isCorrect: true,
      timeSpent: 150,
      hintsUsed: 1,
      confidence: 0.7,
      difficulty: 5.0,
      xpEarned: 15,
    },
  });

  await prisma.userTask.create({
    data: {
      userId: demoStudent.id,
      taskId: physicsTask1.id,
      answerSubmitted: { answer: 120 },
      isCorrect: true,
      timeSpent: 90,
      hintsUsed: 0,
      confidence: 0.9,
      difficulty: 3.0,
      xpEarned: 10,
    },
  });

  console.log('✅ Created user task completions');

  // Create achievements
  const firstTaskAchievement = await prisma.achievement.create({
    data: {
      name: 'First Steps',
      description: 'Complete your first task',
      icon: '🎯',
      category: 'TASKS_COMPLETED',
      rarity: 'COMMON',
      criteria: {
        type: 'tasks_completed',
        count: 1,
      },
      xpReward: 50,
    },
  });

  const streakAchievement = await prisma.achievement.create({
    data: {
      name: 'On Fire!',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      category: 'STREAK',
      rarity: 'RARE',
      criteria: {
        type: 'streak',
        days: 7,
      },
      xpReward: 100,
    },
  });

  const masteryAchievement = await prisma.achievement.create({
    data: {
      name: 'Math Master',
      description: 'Reach level 10 in Mathematics',
      icon: '🧮',
      category: 'MASTERY',
      rarity: 'EPIC',
      criteria: {
        type: 'subject_level',
        subject: 'MATHEMATICS',
        level: 10,
      },
      xpReward: 500,
    },
  });

  console.log('✅ Created achievements');

  // Award first achievement to demo student
  await prisma.userAchievement.create({
    data: {
      userId: demoStudent.id,
      achievementId: firstTaskAchievement.id,
    },
  });

  console.log('✅ Awarded achievement to demo student');

  // Create a demo classroom
  const classroom = await prisma.classroom.create({
    data: {
      name: 'Physics 101',
      description: 'Introduction to Physics for Grade 9',
      code: 'PHYS101',
      schoolName: 'Demo High School',
      gradeLevel: 9,
      members: {
        create: [
          {
            userId: teacher.id,
            role: 'TEACHER',
          },
          {
            userId: demoStudent.id,
            role: 'STUDENT',
          },
        ],
      },
    },
  });

  console.log('✅ Created demo classroom:', classroom.code);

  // Create sample conversation
  const conversation = await prisma.conversation.create({
    data: {
      userId: demoStudent.id,
      title: 'Help with Quadratic Equations',
      subject: 'MATHEMATICS',
      topic: 'Quadratic Equations',
      messageCount: 4,
      messages: {
        create: [
          {
            role: 'USER',
            content: 'I need help understanding quadratic equations',
          },
          {
            role: 'ASSISTANT',
            content:
              'I\'d be happy to help! Quadratic equations are equations of the form ax² + bx + c = 0. What specifically would you like to understand?',
            model: 'gpt-4',
            tokens: 45,
          },
          {
            role: 'USER',
            content: 'How do I solve x² - 5x + 6 = 0?',
          },
          {
            role: 'ASSISTANT',
            content:
              'Great question! There are several methods. Let\'s use factoring:\n\n1. We need two numbers that multiply to 6 and add to -5\n2. Those numbers are -2 and -3\n3. So we can write: (x-2)(x-3) = 0\n4. Therefore: x = 2 or x = 3\n\nWould you like me to explain another method?',
            model: 'gpt-4',
            tokens: 89,
          },
        ],
      },
    },
  });

  console.log('✅ Created sample conversation');

  // Create study plan
  await prisma.studyPlan.create({
    data: {
      userId: premiumStudent.id,
      title: 'Matriculation Exam Preparation',
      description: 'Comprehensive study plan for mathematics matriculation exam',
      subject: 'MATHEMATICS',
      topics: [
        'Functions and Equations',
        'Trigonometry',
        'Vectors',
        'Probability',
        'Calculus',
      ],
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      progress: 0.15,
      isAIGenerated: true,
    },
  });

  console.log('✅ Created study plan');

  // Create some events
  await prisma.event.createMany({
    data: [
      {
        userId: demoStudent.id,
        eventType: 'USER_REGISTERED',
        eventData: { source: 'web' },
      },
      {
        userId: demoStudent.id,
        eventType: 'TASK_COMPLETED',
        eventData: { taskId: mathTask1.id, subject: 'MATHEMATICS' },
      },
      {
        userId: demoStudent.id,
        eventType: 'XP_EARNED',
        eventData: { amount: 15, source: 'task_completion' },
      },
      {
        userId: premiumStudent.id,
        eventType: 'SUBSCRIPTION_STARTED',
        eventData: { tier: 'PREMIUM', duration: 'monthly' },
      },
    ],
  });

  console.log('✅ Created sample events');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log('  - 3 users (student, premium, teacher)');
  console.log('  - 3 tasks (math, physics, chemistry)');
  console.log('  - 2 task completions');
  console.log('  - 3 achievements');
  console.log('  - 1 classroom');
  console.log('  - 1 conversation with 4 messages');
  console.log('  - 1 study plan');
  console.log('  - 4 events');
  console.log('\n🔑 Demo Credentials:');
  console.log('  Email: student@stemgenius.com');
  console.log('  Email: premium@stemgenius.com');
  console.log('  Email: teacher@stemgenius.com');
  console.log('  Password: demo123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
