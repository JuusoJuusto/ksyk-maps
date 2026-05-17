import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/server';
import { Subject } from '@/lib/prisma-types';

const KNOWLEDGE_GRAPHS: Record<string, Array<{ id: string; name: string; prerequisites: string[]; unlocks: string[] }>> = {
  MATHEMATICS: [
    { id: 'algebra-basics', name: 'Algebra Basics', prerequisites: [], unlocks: ['linear-equations', 'quadratic-equations'] },
    { id: 'linear-equations', name: 'Linear Equations', prerequisites: ['algebra-basics'], unlocks: ['systems-equations', 'inequalities'] },
    { id: 'quadratic-equations', name: 'Quadratic Equations', prerequisites: ['algebra-basics'], unlocks: ['polynomials', 'functions'] },
    { id: 'systems-equations', name: 'Systems of Equations', prerequisites: ['linear-equations'], unlocks: ['matrices'] },
    { id: 'functions', name: 'Functions', prerequisites: ['quadratic-equations'], unlocks: ['calculus-intro'] },
    { id: 'calculus-intro', name: 'Introduction to Calculus', prerequisites: ['functions'], unlocks: ['derivatives', 'integrals'] },
  ],
  PHYSICS: [
    { id: 'mechanics-basics', name: 'Mechanics Basics', prerequisites: [], unlocks: ['kinematics', 'dynamics'] },
    { id: 'kinematics', name: 'Kinematics', prerequisites: ['mechanics-basics'], unlocks: ['projectile-motion'] },
    { id: 'dynamics', name: 'Dynamics', prerequisites: ['mechanics-basics'], unlocks: ['energy-work', 'momentum'] },
    { id: 'energy-work', name: 'Energy & Work', prerequisites: ['dynamics'], unlocks: ['thermodynamics'] },
    { id: 'electromagnetism', name: 'Electromagnetism', prerequisites: ['mechanics-basics'], unlocks: ['circuits', 'waves'] },
  ],
  CHEMISTRY: [
    { id: 'atomic-structure', name: 'Atomic Structure', prerequisites: [], unlocks: ['periodic-table', 'chemical-bonding'] },
    { id: 'periodic-table', name: 'Periodic Table', prerequisites: ['atomic-structure'], unlocks: ['chemical-reactions'] },
    { id: 'chemical-bonding', name: 'Chemical Bonding', prerequisites: ['atomic-structure'], unlocks: ['molecular-geometry'] },
    { id: 'chemical-reactions', name: 'Chemical Reactions', prerequisites: ['periodic-table'], unlocks: ['stoichiometry', 'thermochemistry'] },
  ],
  ASTRONOMY: [
    { id: 'solar-system', name: 'Solar System', prerequisites: [], unlocks: ['planetary-motion', 'celestial-mechanics'] },
    { id: 'stars-galaxies', name: 'Stars & Galaxies', prerequisites: [], unlocks: ['stellar-evolution', 'cosmology'] },
  ],
};

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject') as Subject;

    if (!subject || !KNOWLEDGE_GRAPHS[subject]) {
      return NextResponse.json(
        { error: 'Valid subject parameter required' },
        { status: 400 }
      );
    }

    const userId = auth.user!.id;
    const userTasks = await prisma.userTask.findMany({
      where: { userId, task: { subject } },
      include: { task: true },
    });

    const topics = KNOWLEDGE_GRAPHS[subject];

    const topicsWithMastery = topics.map((topic) => {
      const topicTasks = userTasks.filter((ut) =>
        ut.task.topic.toLowerCase().includes(topic.name.toLowerCase().split(' ')[0])
      );

      let status: 'locked' | 'available' | 'in-progress' | 'mastered' = 'locked';
      let mastery = 0;

      if (topicTasks.length > 0) {
        const correctTasks = topicTasks.filter((t) => t.isCorrect).length;
        mastery = Math.round((correctTasks / topicTasks.length) * 100);
        status = mastery >= 80 ? 'mastered' : 'in-progress';
      } else {
        const prerequisitesMet = topic.prerequisites.every((prereqId) => {
          const prereqTopic = topics.find((t) => t.id === prereqId);
          if (!prereqTopic) return true;

          const prereqTasks = userTasks.filter((ut) =>
            ut.task.topic.toLowerCase().includes(prereqTopic.name.toLowerCase().split(' ')[0])
          );

          if (prereqTasks.length === 0) return false;

          const prereqCorrect = prereqTasks.filter((t) => t.isCorrect).length;
          const prereqMastery = (prereqCorrect / prereqTasks.length) * 100;
          return prereqMastery >= 60;
        });

        status = prerequisitesMet ? 'available' : 'locked';
      }

      return { ...topic, status, mastery };
    });

    return NextResponse.json({
      success: true,
      data: { subject, topics: topicsWithMastery },
    });
  } catch (error) {
    console.error('Knowledge graph error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge graph' },
      { status: 500 }
    );
  }
}
