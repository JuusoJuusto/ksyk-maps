import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';

if (getApps().length === 0) {
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function seedPythonCourse() {
  console.log('🚀 Starting Python Adventures seed...\n');

  try {
    // Clear existing data
    console.log('🧹 Clearing old data...');
    const collections = ['codingCourses', 'codingModules', 'codingLessons', 'codingExercises'];
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      if (snapshot.docs.length > 0) {
        await batch.commit();
        console.log(`  ✓ Cleared ${snapshot.docs.length} documents from ${collectionName}`);
      }
    }

    // Create Python Adventures Course
    const courseId = 'python-basics-2026';
    console.log('\n📚 Creating Python Adventures course...');
    
    await db.collection('codingCourses').doc(courseId).set({
      id: courseId,
      title: {
        fi: '🐍 Python Seikkailut',
        en: '🐍 Python Adventures'
      },
      description: {
        fi: 'Lähde mukaan jännittävälle Python-matkalle! Opi koodaamaan hauskalla tavalla pelien, arvoitusten ja haasteiden kautta. Tämä kurssi on täydellinen aloittelijoille!',
        en: 'Embark on an exciting Python journey! Learn to code the fun way through games, puzzles, and challenges. Perfect for beginners!'
      },
      difficulty: 'beginner',
      estimatedHours: 25,
      isFree: true,
      language: 'python',
      imageUrl: '/python-logo.png',
      tags: ['python', 'programming', 'basics', 'beginner', 'fun', 'games'],
      prerequisites: [],
      learningObjectives: {
        fi: [
          '🎮 Luo omia pelejä ja ohjelmia',
          '🧩 Ratkaise koodausarvoituksia',
          '🤖 Ymmärrä miten ohjelmat toimivat',
          '⚡ Kirjoita tehokasta koodia',
          '🏆 Ansaitse saavutuksia ja XP:tä'
        ],
        en: [
          '🎮 Create your own games and programs',
          '🧩 Solve coding puzzles',
          '🤖 Understand how programs work',
          '⚡ Write efficient code',
          '🏆 Earn achievements and XP'
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('  ✓ Course created');

    // Module 1: Welcome to Python
    const module1Id = 'module-1-welcome';
    console.log('\n📖 Creating Module 1: Welcome to Python...');
    
    await db.collection('codingModules').doc(module1Id).set({
      id: module1Id,
      courseId: courseId,
      title: {
        fi: '🌟 Tervetuloa Python-maailmaan',
        en: '🌟 Welcome to Python World'
      },
      description: {
        fi: 'Aloita seikkailusi! Opi Python-ohjelmoinnin perusteet ja luo ensimmäinen ohjelmasi.',
        en: 'Start your adventure! Learn Python basics and create your first program.'
      },
      orderIndex: 1,
      estimatedMinutes: 90,
      createdAt: new Date()
    });
    console.log('  ✓ Module 1 created');

    // Lesson 1.1: First Magic Spell
    const lesson1_1Id = 'lesson-1-1-magic-spell';
    console.log('\n📝 Creating Lesson 1.1: First Magic Spell...');
    
    await db.collection('codingLessons').doc(lesson1_1Id).set({
      id: lesson1_1Id,
      moduleId: module1Id,
      courseId: courseId,
      title: {
        fi: '✨ Ensimmäinen taikaloitsusi',
        en: '✨ Your First Magic Spell'
      },
      content: {
        fi: `# Tervetuloa Python-magiaan! 🎩✨

Olet juuri aloittanut matkasi Python-maailmaan! Python on kuin taikasauva - sillä voit luoda mitä vain!

## Ensimmäinen loitsusi: print()

\`print()\` on taikaloitsu, joka näyttää viestejä näytöllä. Kokeillaan!

\`\`\`python
print("Abrakadabra! 🎩")
print("Olen Python-velho!")
\`\`\`

Kun suoritat tämän koodin, näet:
\`\`\`
Abrakadabra! 🎩
Olen Python-velho!
\`\`\`

## Miksi Python on mahtavaa? 🌟

- **Helppo oppia** - Kuin puhuisit tietokoneelle suomeksi!
- **Voimakas** - Voit tehdä pelejä, nettisivuja, robotteja...
- **Hauska** - Näet tulokset heti!
- **Suosittu** - Miljoonia koodaajia ympäri maailmaa!

## Haaste sinulle! 🎯

Luo oma taikaloitsusi! Tulosta jotain hauskaa näytölle.

**Vinkki:** Voit käyttää emojeja! 🚀🎮🎨🦄🌈`,
        en: `# Welcome to Python Magic! 🎩✨

You've just started your journey into the Python world! Python is like a magic wand - you can create anything!

## Your First Spell: print()

\`print()\` is a magic spell that shows messages on screen. Let's try!

\`\`\`python
print("Abracadabra! 🎩")
print("I am a Python wizard!")
\`\`\`

When you run this code, you'll see:
\`\`\`
Abracadabra! 🎩
I am a Python wizard!
\`\`\`

## Why Python is Awesome! 🌟

- **Easy to learn** - Like talking to a computer in English!
- **Powerful** - You can make games, websites, robots...
- **Fun** - See results instantly!
- **Popular** - Millions of coders worldwide!

## Challenge for you! 🎯

Create your own magic spell! Print something fun on screen.

**Hint:** You can use emojis! 🚀🎮🎨🦄🌈`
      },
      orderIndex: 1,
      estimatedMinutes: 20,
      videoUrl: null,
      createdAt: new Date()
    });
    console.log('  ✓ Lesson 1.1 created');

    // Exercise 1.1.1: Cast Your First Spell
    console.log('\n✏️ Creating exercises...');
    
    await db.collection('codingExercises').doc('ex-1-1-1').set({
      id: 'ex-1-1-1',
      lessonId: lesson1_1Id,
      moduleId: module1Id,
      courseId: courseId,
      title: {
        fi: '🎩 Loihdi ensimmäinen viestisi',
        en: '🎩 Cast Your First Message'
      },
      description: {
        fi: 'Käytä print-loitsua näyttääksesi "Hei Python-maailma! 🌍" näytöllä.',
        en: 'Use the print spell to show "Hello Python World! 🌍" on screen.'
      },
      instructions: {
        fi: 'Kirjoita koodi, joka tulostaa: Hei Python-maailma! 🌍',
        en: 'Write code that prints: Hello Python World! 🌍'
      },
      starterCode: '# Loihdi viestisi tähän! ✨\n',
      solution: 'print("Hei Python-maailma! 🌍")',
      difficulty: 'easy',
      xpReward: 50,
      orderIndex: 1,
      hints: {
        fi: [
          '💡 Käytä print() -funktiota',
          '💡 Laita teksti "lainausmerkkien" sisään',
          '💡 Muista sulkea sulut!'
        ],
        en: [
          '💡 Use the print() function',
          '💡 Put text inside "quotation marks"',
          '💡 Remember to close the parentheses!'
        ]
      },
      testCases: [
        {
          input: '',
          expectedOutput: 'Hei Python-maailma! 🌍',
          hidden: false
        }
      ],
      createdAt: new Date()
    });
    console.log('  ✓ Exercise 1.1.1 created (50 XP)');

    await db.collection('codingExercises').doc('ex-1-1-2').set({
      id: 'ex-1-1-2',
      lessonId: lesson1_1Id,
      moduleId: module1Id,
      courseId: courseId,
      title: {
        fi: '🦸 Luo supersankarisi nimi',
        en: '🦸 Create Your Superhero Name'
      },
      description: {
        fi: 'Tulosta supersankarisi nimi ja voimasi!',
        en: 'Print your superhero name and power!'
      },
      instructions: {
        fi: 'Tulosta kaksi riviä:\n1. "Olen [nimesi] - Koodisankari!"\n2. "Minun supervoimani on: Python-ohjelmointi! 💪"',
        en: 'Print two lines:\n1. "I am [your name] - Code Hero!"\n2. "My superpower is: Python programming! 💪"'
      },
      starterCode: '# Luo supersankarisi! 🦸\n',
      solution: 'print("Olen Matti - Koodisankari!")\nprint("Minun supervoimani on: Python-ohjelmointi! 💪")',
      difficulty: 'easy',
      xpReward: 50,
      orderIndex: 2,
      hints: {
        fi: [
          '💡 Käytä print() kahdesti',
          '💡 Jokainen print tulostaa yhden rivin',
          '💡 Korvaa [nimesi] omalla nimelläsi'
        ],
        en: [
          '💡 Use print() twice',
          '💡 Each print creates one line',
          '💡 Replace [your name] with your actual name'
        ]
      },
      testCases: [
        {
          input: '',
          expectedOutput: 'Koodisankari',
          hidden: false,
          partialMatch: true
        }
      ],
      createdAt: new Date()
    });
    console.log('  ✓ Exercise 1.1.2 created (50 XP)');

    await db.collection('codingExercises').doc('ex-1-1-3').set({
      id: 'ex-1-1-3',
      lessonId: lesson1_1Id,
      moduleId: module1Id,
      courseId: courseId,
      title: {
        fi: '🎨 ASCII-taide haaste',
        en: '🎨 ASCII Art Challenge'
      },
      description: {
        fi: 'Luo hauska ASCII-taide käyttäen print-komentoja!',
        en: 'Create fun ASCII art using print commands!'
      },
      instructions: {
        fi: 'Tulosta yksinkertainen hymiö:\n  ^_^\n <( )>\n  / \\',
        en: 'Print a simple smiley:\n  ^_^\n <( )>\n  / \\'
      },
      starterCode: '# Piirrä hymiö! 😊\n',
      solution: 'print("  ^_^")\nprint(" <( )>")\nprint("  / \\\\")',
      difficulty: 'easy',
      xpReward: 75,
      orderIndex: 3,
      hints: {
        fi: [
          '💡 Käytä kolmea print-komentoa',
          '💡 Välilyönnit ovat tärkeitä!',
          '💡 Käytä \\\\ saadaksesi \\-merkin'
        ],
        en: [
          '💡 Use three print commands',
          '💡 Spaces matter!',
          '💡 Use \\\\ to get a \\ character'
        ]
      },
      testCases: [
        {
          input: '',
          expectedOutput: '  ^_^\n <( )>\n  / \\',
          hidden: false
        }
      ],
      createdAt: new Date()
    });
    console.log('  ✓ Exercise 1.1.3 created (75 XP)');

    console.log('\n✅ Python Adventures course seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('  - 1 Course: Python Adventures');
    console.log('  - 1 Module: Welcome to Python World');
    console.log('  - 1 Lesson: First Magic Spell');
    console.log('  - 3 Exercises: 175 XP total');
    console.log('\n🎉 Students can now start their Python adventure!');

  } catch (error) {
    console.error('\n❌ Error seeding:', error);
    throw error;
  }
}

seedPythonCourse()
  .then(() => {
    console.log('\n✅ Seed complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  });
