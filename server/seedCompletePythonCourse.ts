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

async function seedCompletePythonCourse() {
  console.log('🚀 Starting COMPLETE Python Adventures seed...\n');

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

    // ========== COURSE ==========
    const courseId = 'python-adventures-2026';
    console.log('\n📚 Creating Python Adventures course...');
    
    await db.collection('codingCourses').doc(courseId).set({
      id: courseId,
      title: {
        fi: '🐍 Python Seikkailut - Täydellinen Kurssi',
        en: '🐍 Python Adventures - Complete Course'
      },
      description: {
        fi: 'Lähde mukaan jännittävälle Python-matkalle! Opi koodaamaan hauskalla tavalla pelien, arvoitusten ja haasteiden kautta. Aloittelijasta ammattilaiseksi!',
        en: 'Embark on an exciting Python journey! Learn to code the fun way through games, puzzles, and challenges. From beginner to pro!'
      },
      difficulty: 'beginner',
      estimatedHours: 40,
      isFree: true,
      language: 'python',
      imageUrl: '/python-logo.png',
      tags: ['python', 'programming', 'basics', 'beginner', 'fun', 'games', 'complete'],
      prerequisites: [],
      learningObjectives: {
        fi: [
          '🎮 Luo omia pelejä ja ohjelmia',
          '🧩 Ratkaise koodausarvoituksia',
          '🤖 Ymmärrä miten ohjelmat toimivat',
          '⚡ Kirjoita tehokasta koodia',
          '🏆 Ansaitse saavutuksia ja XP:tä',
          '🎯 Hallitse Python-ohjelmoinnin perusteet'
        ],
        en: [
          '🎮 Create your own games and programs',
          '🧩 Solve coding puzzles',
          '🤖 Understand how programs work',
          '⚡ Write efficient code',
          '🏆 Earn achievements and XP',
          '🎯 Master Python programming basics'
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('  ✓ Course created');

    // ========== MODULE 1: WELCOME TO PYTHON ==========
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
      estimatedMinutes: 120,
      createdAt: new Date()
    });

    // Lesson 1.1: First Magic Spell
    const lesson1_1Id = 'lesson-1-1-magic-spell';
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

## Ensimmäinen loitsusi: print()

\`print()\` on taikaloitsu, joka näyttää viestejä näytöllä!

\`\`\`python
print("Abrakadabra! 🎩")
print("Olen Python-velho!")
\`\`\`

## Miksi Python on mahtavaa? 🌟

- **Helppo oppia** - Kuin puhuisit tietokoneelle!
- **Voimakas** - Voit tehdä pelejä, nettisivuja, robotteja...
- **Hauska** - Näet tulokset heti!
- **Suosittu** - Miljoonia koodaajia ympäri maailmaa!`,
        en: `# Welcome to Python Magic! 🎩✨

## Your First Spell: print()

\`print()\` is a magic spell that shows messages on screen!

\`\`\`python
print("Abracadabra! 🎩")
print("I am a Python wizard!")
\`\`\`

## Why Python is Awesome! 🌟

- **Easy to learn** - Like talking to a computer!
- **Powerful** - You can make games, websites, robots...
- **Fun** - See results instantly!
- **Popular** - Millions of coders worldwide!`
      },
      orderIndex: 1,
      estimatedMinutes: 30,
      videoUrl: null,
      createdAt: new Date()
    });

    // Exercises for Lesson 1.1
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
        fi: 'Käytä print-loitsua näyttääksesi "Hei Python! 🐍" näytöllä.',
        en: 'Use the print spell to show "Hello Python! 🐍" on screen.'
      },
      instructions: {
        fi: 'Kirjoita koodi, joka tulostaa: Hei Python! 🐍',
        en: 'Write code that prints: Hello Python! 🐍'
      },
      starterCode: '# Loihdi viestisi tähän! ✨\n',
      solution: 'print("Hei Python! 🐍")',
      difficulty: 'easy',
      xpReward: 50,
      orderIndex: 1,
      hints: {
        fi: [
          '💡 Käytä print() -funktiota',
          '💡 Laita teksti "lainausmerkkien" sisään'
        ],
        en: [
          '💡 Use the print() function',
          '💡 Put text inside "quotation marks"'
        ]
      },
      testCases: [
        {
          input: '',
          expectedOutput: 'Hei Python! 🐍',
          hidden: false
        }
      ],
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('ex-1-1-2').set({
      id: 'ex-1-1-2',
      lessonId: lesson1_1Id,
      moduleId: module1Id,
      courseId: courseId,
      title: {
        fi: '🦸 Luo supersankarisi',
        en: '🦸 Create Your Superhero'
      },
      description: {
        fi: 'Tulosta supersankarisi nimi ja voimasi!',
        en: 'Print your superhero name and power!'
      },
      instructions: {
        fi: 'Tulosta: "Olen Koodisankari! 💪"',
        en: 'Print: "I am Code Hero! 💪"'
      },
      starterCode: '# Luo supersankarisi! 🦸\n',
      solution: 'print("Olen Koodisankari! 💪")',
      difficulty: 'easy',
      xpReward: 50,
      orderIndex: 2,
      hints: {
        fi: ['💡 Käytä print()'],
        en: ['💡 Use print()']
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

    // ========== MODULE 2: VARIABLES & DATA ==========
    const module2Id = 'module-2-variables';
    console.log('\n📖 Creating Module 2: Variables & Data...');
    
    await db.collection('codingModules').doc(module2Id).set({
      id: module2Id,
      courseId: courseId,
      title: {
        fi: '📦 Muuttujat ja Tiedot',
        en: '📦 Variables and Data'
      },
      description: {
        fi: 'Opi tallentamaan tietoa muuttujiin ja käyttämään niitä ohjelmissasi!',
        en: 'Learn to store information in variables and use them in your programs!'
      },
      orderIndex: 2,
      estimatedMinutes: 150,
      createdAt: new Date()
    });

    const lesson2_1Id = 'lesson-2-1-variables';
    await db.collection('codingLessons').doc(lesson2_1Id).set({
      id: lesson2_1Id,
      moduleId: module2Id,
      courseId: courseId,
      title: {
        fi: '📦 Taikalaatikot (Muuttujat)',
        en: '📦 Magic Boxes (Variables)'
      },
      content: {
        fi: `# Taikalaatikot - Muuttujat! 📦✨

Muuttuja on kuin taikalaatikko, johon voit laittaa mitä tahansa!

\`\`\`python
nimi = "Matti"
ikä = 15
lempiväri = "sininen"

print("Hei, olen", nimi)
print("Olen", ikä, "vuotta vanha")
print("Lempiväri:", lempiväri)
\`\`\`

## Muuttujatyypit 🎨

- **Tekstit (str)**: "Hei", "Python", "🎮"
- **Numerot (int)**: 42, 100, -5
- **Desimaalit (float)**: 3.14, 2.5, 0.99
- **Totuusarvot (bool)**: True, False`,
        en: `# Magic Boxes - Variables! 📦✨

A variable is like a magic box where you can store anything!

\`\`\`python
name = "Matt"
age = 15
favorite_color = "blue"

print("Hi, I'm", name)
print("I am", age, "years old")
print("Favorite color:", favorite_color)
\`\`\`

## Variable Types 🎨

- **Text (str)**: "Hi", "Python", "🎮"
- **Numbers (int)**: 42, 100, -5
- **Decimals (float)**: 3.14, 2.5, 0.99
- **Booleans (bool)**: True, False`
      },
      orderIndex: 1,
      estimatedMinutes: 40,
      videoUrl: null,
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('ex-2-1-1').set({
      id: 'ex-2-1-1',
      lessonId: lesson2_1Id,
      moduleId: module2Id,
      courseId: courseId,
      title: {
        fi: '📦 Luo oma profiilisi',
        en: '📦 Create Your Profile'
      },
      description: {
        fi: 'Tallenna nimesi muuttujaan ja tulosta se!',
        en: 'Store your name in a variable and print it!'
      },
      instructions: {
        fi: 'Luo muuttuja "nimi" ja tulosta: "Minun nimeni on [nimi]"',
        en: 'Create variable "name" and print: "My name is [name]"'
      },
      starterCode: '# Luo profiilisi! 👤\nnimi = ""\n',
      solution: 'nimi = "Matti"\nprint("Minun nimeni on", nimi)',
      difficulty: 'easy',
      xpReward: 75,
      orderIndex: 1,
      hints: {
        fi: ['💡 Käytä muuttujaa: nimi = "..."', '💡 Tulosta print("Minun nimeni on", nimi)'],
        en: ['💡 Use variable: name = "..."', '💡 Print with print("My name is", name)']
      },
      testCases: [
        {
          input: '',
          expectedOutput: 'Minun nimeni on',
          hidden: false,
          partialMatch: true
        }
      ],
      createdAt: new Date()
    });

    // ========== MODULE 3: MATH & OPERATIONS ==========
    const module3Id = 'module-3-math';
    console.log('\n📖 Creating Module 3: Math & Operations...');
    
    await db.collection('codingModules').doc(module3Id).set({
      id: module3Id,
      courseId: courseId,
      title: {
        fi: '🔢 Matematiikka ja Laskutoimitukset',
        en: '🔢 Math and Operations'
      },
      description: {
        fi: 'Tee laskutoimituksia ja luo laskimia Pythonilla!',
        en: 'Do calculations and create calculators with Python!'
      },
      orderIndex: 3,
      estimatedMinutes: 120,
      createdAt: new Date()
    });

    const lesson3_1Id = 'lesson-3-1-math';
    await db.collection('codingLessons').doc(lesson3_1Id).set({
      id: lesson3_1Id,
      moduleId: module3Id,
      courseId: courseId,
      title: {
        fi: '🔢 Python-laskin',
        en: '🔢 Python Calculator'
      },
      content: {
        fi: `# Python-laskin! 🔢✨

Python osaa laskea kuin supersankari!

\`\`\`python
# Yhteenlasku
print(5 + 3)  # 8

# Vähennyslasku
print(10 - 4)  # 6

# Kertolasku
print(6 * 7)  # 42

# Jakolasku
print(20 / 4)  # 5.0

# Potenssi
print(2 ** 3)  # 8 (2 potenssiin 3)
\`\`\`

## Laskujärjestys 📐

Python noudattaa matematiikan sääntöjä:
1. Sulut ()
2. Potenssi **
3. Kerto ja jako *, /
4. Plus ja miinus +, -`,
        en: `# Python Calculator! 🔢✨

Python can calculate like a superhero!

\`\`\`python
# Addition
print(5 + 3)  # 8

# Subtraction
print(10 - 4)  # 6

# Multiplication
print(6 * 7)  # 42

# Division
print(20 / 4)  # 5.0

# Power
print(2 ** 3)  # 8 (2 to the power of 3)
\`\`\`

## Order of Operations 📐

Python follows math rules:
1. Parentheses ()
2. Power **
3. Multiply and divide *, /
4. Add and subtract +, -`
      },
      orderIndex: 1,
      estimatedMinutes: 35,
      videoUrl: null,
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('ex-3-1-1').set({
      id: 'ex-3-1-1',
      lessonId: lesson3_1Id,
      moduleId: module3Id,
      courseId: courseId,
      title: {
        fi: '🔢 Laske ikäsi koiravuosina',
        en: '🔢 Calculate Your Age in Dog Years'
      },
      description: {
        fi: 'Laske ikäsi koiravuosina (kerro 7:llä)!',
        en: 'Calculate your age in dog years (multiply by 7)!'
      },
      instructions: {
        fi: 'Tallenna ikäsi muuttujaan ja laske koiravuodet (ikä * 7)',
        en: 'Store your age in a variable and calculate dog years (age * 7)'
      },
      starterCode: '# Laske koiravuodet! 🐕\nikä = 15\n',
      solution: 'ikä = 15\nkoiravuodet = ikä * 7\nprint(koiravuodet)',
      difficulty: 'easy',
      xpReward: 100,
      orderIndex: 1,
      hints: {
        fi: ['💡 Kerro ikä 7:llä', '💡 koiravuodet = ikä * 7'],
        en: ['💡 Multiply age by 7', '💡 dog_years = age * 7']
      },
      testCases: [
        {
          input: '',
          expectedOutput: '105',
          hidden: false
        }
      ],
      createdAt: new Date()
    });

    // ========== MODULE 4: CONDITIONS ==========
    const module4Id = 'module-4-conditions';
    console.log('\n📖 Creating Module 4: Conditions...');
    
    await db.collection('codingModules').doc(module4Id).set({
      id: module4Id,
      courseId: courseId,
      title: {
        fi: '🤔 Ehdot ja Päätökset',
        en: '🤔 Conditions and Decisions'
      },
      description: {
        fi: 'Opeta ohjelma tekemään päätöksiä if-lauseilla!',
        en: 'Teach your program to make decisions with if statements!'
      },
      orderIndex: 4,
      estimatedMinutes: 180,
      createdAt: new Date()
    });

    const lesson4_1Id = 'lesson-4-1-if';
    await db.collection('codingLessons').doc(lesson4_1Id).set({
      id: lesson4_1Id,
      moduleId: module4Id,
      courseId: courseId,
      title: {
        fi: '🤔 If-taikaloitsu',
        en: '🤔 The If Magic Spell'
      },
      content: {
        fi: `# If-taikaloitsu! 🤔✨

\`if\` antaa ohjelmasi tehdä päätöksiä!

\`\`\`python
ikä = 15

if ikä >= 13:
    print("Olet teini! 🎉")

if ikä < 18:
    print("Olet nuori! 🌟")
\`\`\`

## Vertailuoperaattorit 🔍

- \`==\` yhtä suuri kuin
- \`!=\` eri suuri kuin
- \`>\` suurempi kuin
- \`<\` pienempi kuin
- \`>=\` suurempi tai yhtä suuri
- \`<=\` pienempi tai yhtä suuri`,
        en: `# The If Magic Spell! 🤔✨

\`if\` lets your program make decisions!

\`\`\`python
age = 15

if age >= 13:
    print("You're a teenager! 🎉")

if age < 18:
    print("You're young! 🌟")
\`\`\`

## Comparison Operators 🔍

- \`==\` equal to
- \`!=\` not equal to
- \`>\` greater than
- \`<\` less than
- \`>=\` greater than or equal
- \`<=\` less than or equal`
      },
      orderIndex: 1,
      estimatedMinutes: 45,
      videoUrl: null,
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('ex-4-1-1').set({
      id: 'ex-4-1-1',
      lessonId: lesson4_1Id,
      moduleId: module4Id,
      courseId: courseId,
      title: {
        fi: '🎮 Ikätarkistus peliin',
        en: '🎮 Age Check for Game'
      },
      description: {
        fi: 'Tarkista onko pelaaja tarpeeksi vanha pelaamaan!',
        en: 'Check if player is old enough to play!'
      },
      instructions: {
        fi: 'Jos ikä >= 13, tulosta "Voit pelata! 🎮"',
        en: 'If age >= 13, print "You can play! 🎮"'
      },
      starterCode: '# Tarkista ikä! 🎮\nikä = 15\n',
      solution: 'ikä = 15\nif ikä >= 13:\n    print("Voit pelata! 🎮")',
      difficulty: 'medium',
      xpReward: 125,
      orderIndex: 1,
      hints: {
        fi: ['💡 Käytä if ikä >= 13:', '💡 Muista sisennys!'],
        en: ['💡 Use if age >= 13:', '💡 Remember indentation!']
      },
      testCases: [
        {
          input: '',
          expectedOutput: 'Voit pelata! 🎮',
          hidden: false
        }
      ],
      createdAt: new Date()
    });

    // ========== MODULE 5: LOOPS ==========
    const module5Id = 'module-5-loops';
    console.log('\n📖 Creating Module 5: Loops...');
    
    await db.collection('codingModules').doc(module5Id).set({
      id: module5Id,
      courseId: courseId,
      title: {
        fi: '🔄 Silmukat ja Toisto',
        en: '🔄 Loops and Repetition'
      },
      description: {
        fi: 'Toista koodia automaattisesti silmukoilla!',
        en: 'Repeat code automatically with loops!'
      },
      orderIndex: 5,
      estimatedMinutes: 200,
      createdAt: new Date()
    });

    const lesson5_1Id = 'lesson-5-1-for';
    await db.collection('codingLessons').doc(lesson5_1Id).set({
      id: lesson5_1Id,
      moduleId: module5Id,
      courseId: courseId,
      title: {
        fi: '🔄 For-silmukka',
        en: '🔄 For Loop'
      },
      content: {
        fi: `# For-silmukka! 🔄✨

Toista koodia helposti!

\`\`\`python
# Tulosta numerot 1-5
for i in range(1, 6):
    print(i)

# Tulosta tähtiä
for i in range(5):
    print("⭐")
\`\`\`

## Range-funktio 📏

- \`range(5)\` → 0, 1, 2, 3, 4
- \`range(1, 6)\` → 1, 2, 3, 4, 5
- \`range(0, 10, 2)\` → 0, 2, 4, 6, 8`,
        en: `# For Loop! 🔄✨

Repeat code easily!

\`\`\`python
# Print numbers 1-5
for i in range(1, 6):
    print(i)

# Print stars
for i in range(5):
    print("⭐")
\`\`\`

## Range Function 📏

- \`range(5)\` → 0, 1, 2, 3, 4
- \`range(1, 6)\` → 1, 2, 3, 4, 5
- \`range(0, 10, 2)\` → 0, 2, 4, 6, 8`
      },
      orderIndex: 1,
      estimatedMinutes: 50,
      videoUrl: null,
      createdAt: new Date()
    });

    await db.collection('codingExercises').doc('ex-5-1-1').set({
      id: 'ex-5-1-1',
      lessonId: lesson5_1Id,
      moduleId: module5Id,
      courseId: courseId,
      title: {
        fi: '⭐ Tulosta 10 tähteä',
        en: '⭐ Print 10 Stars'
      },
      description: {
        fi: 'Käytä for-silmukkaa tulostaaksesi 10 tähteä!',
        en: 'Use a for loop to print 10 stars!'
      },
      instructions: {
        fi: 'Tulosta ⭐ kymmenen kertaa käyttäen for-silmukkaa',
        en: 'Print ⭐ ten times using a for loop'
      },
      starterCode: '# Tulosta tähdet! ⭐\n',
      solution: 'for i in range(10):\n    print("⭐")',
      difficulty: 'medium',
      xpReward: 150,
      orderIndex: 1,
      hints: {
        fi: ['💡 Käytä for i in range(10):', '💡 Sisennä print-komento'],
        en: ['💡 Use for i in range(10):', '💡 Indent the print command']
      },
      testCases: [
        {
          input: '',
          expectedOutput: '⭐\n⭐\n⭐\n⭐\n⭐\n⭐\n⭐\n⭐\n⭐\n⭐',
          hidden: false
        }
      ],
      createdAt: new Date()
    });

    console.log('\n✅ COMPLETE Python Adventures course seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('  - 1 Course: Python Adventures - Complete');
    console.log('  - 5 Modules: Welcome, Variables, Math, Conditions, Loops');
    console.log('  - 5 Lessons with rich content');
    console.log('  - 7 Exercises: 725 XP total');
    console.log('\n🎉 Students can now learn Python from basics to loops!');

  } catch (error) {
    console.error('\n❌ Error seeding:', error);
    throw error;
  }
}

seedCompletePythonCourse()
  .then(() => {
    console.log('\n✅ Seed complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  });
